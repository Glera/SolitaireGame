import React, { useState, useEffect, forwardRef, useRef } from 'react';
import ReactDOM from 'react-dom';
import { getTotalXP, calculateLevel, setOnXPChangeCallback } from '../../lib/solitaire/experienceManager';
import { OtherPlayerNotification } from './OtherPlayerNotification';

interface Particle {
  id: string;
  angle: number;
  distance: number;
  size: number;
  duration: number;
}

interface DonationProgressProps {
  currentStars: number;
  targetStars: number;
  petStory: string;
  donationAmount: string;
  endTime: Date;
  onDebugClick?: () => void;
  onTestWin?: () => void;
  onDropCollectionItem?: () => void;
  onTestLevelUp?: () => void;
  onNextDay?: () => void;
  onStartDungeonDig?: () => void;
  onShowOvertaken?: () => void;
  pulseKey?: number;
  onOtherPlayerStars?: (count: number) => void;
  disableOtherPlayerNotifications?: boolean;
}

// Circular progress component for player level
const LevelIndicator: React.FC<{ level: number; progress: number; isPulsing?: boolean; onClick?: () => void }> = ({ level, progress, isPulsing, onClick }) => {
  const size = 68; // 30% larger (was 52)
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div 
      className="relative flex-shrink-0 cursor-pointer"
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* Background circle */}
      <svg 
        width={size} 
        height={size} 
        className="absolute top-0 left-0 -rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0, 0, 0, 0.4)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#levelGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
        <defs>
          <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center circle with level number */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          margin: strokeWidth,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
        }}
      >
        <span 
          className={`text-white font-bold text-3xl transition-transform duration-150 ${isPulsing ? 'scale-125' : 'scale-100'}`}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
        >
          {level}
        </span>
      </div>
    </div>
  );
};

export const DonationProgress = forwardRef<HTMLDivElement, DonationProgressProps>(({
  currentStars,
  targetStars,
  petStory,
  donationAmount,
  endTime,
  onDebugClick,
  onTestWin,
  onDropCollectionItem,
  onTestLevelUp,
  onNextDay,
  onStartDungeonDig,
  onShowOvertaken,
  pulseKey = 0,
  onOtherPlayerStars,
  disableOtherPlayerNotifications = false
}, ref) => {
  const progressBarContainerRef = useRef<HTMLDivElement>(null);
  const progressBarInnerRef = useRef<HTMLDivElement>(null);
  const otherPlayerTriggerRef = useRef<(() => void) | null>(null);
  // Player XP state - updates when XP changes
  const [playerXP, setPlayerXP] = useState(() => getTotalXP());
  const [isLevelPulsing, setIsLevelPulsing] = useState(false);
  const prevXPRef = useRef(playerXP);
  
  // Subscribe to XP changes
  useEffect(() => {
    setOnXPChangeCallback((newXP) => {
      // Only pulse if XP actually increased
      if (newXP > prevXPRef.current) {
        setIsLevelPulsing(true);
        setTimeout(() => setIsLevelPulsing(false), 300);
      }
      prevXPRef.current = newXP;
      setPlayerXP(newXP);
    });
    // Initial load
    setPlayerXP(getTotalXP());
    prevXPRef.current = getTotalXP();
    
    return () => {
      setOnXPChangeCallback(() => {});
    };
  }, []);
  const [showInfo, setShowInfo] = useState(false);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const debugMenuRef = useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Close debug menu when clicking outside
  useEffect(() => {
    if (!showDebugMenu) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (debugMenuRef.current && !debugMenuRef.current.contains(e.target as Node)) {
        setShowDebugMenu(false);
      }
    };
    
    // Use setTimeout to avoid immediately closing when opening
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showDebugMenu]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [progressShake, setProgressShake] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const particleIdRef = useRef(0);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevPulseKeyRef = useRef(pulseKey);
  
  // Add new particles and shake effect when pulseKey changes (not on mount)
  useEffect(() => {
    // Skip if pulseKey is 0 or hasn't actually changed (prevents triggering on mount/remount)
    if (pulseKey === 0 || pulseKey === prevPulseKeyRef.current) {
      prevPulseKeyRef.current = pulseKey;
      return;
    }
    prevPulseKeyRef.current = pulseKey;
    
    // Start animation
    setIsAnimating(true);
    setAnimationKey(prev => prev + 1);
    
    // Stop animation after it completes
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 600); // Animation duration
    
    const count = 8 + Math.floor(Math.random() * 5); // 8-12 particles
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: `${pulseKey}-${particleIdRef.current++}`,
      angle: (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5,
      distance: 25 + Math.random() * 20, // 25-45px
      size: 3 + Math.random() * 3, // 3-6px
      duration: 0.3 + Math.random() * 0.2 // 0.3-0.5s
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Remove these particles after animation completes
    const maxDuration = Math.max(...newParticles.map(p => p.duration));
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, maxDuration * 1000 + 100);
    
    // Progress bar shake effect - add then remove extra width
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
    setProgressShake(1.5); // Add 1.5% extra
    shakeTimeoutRef.current = setTimeout(() => {
      setProgressShake(0);
    }, 150);
  }, [pulseKey]);
  
  const baseProgress = Math.min((currentStars / targetStars) * 100, 100);
  const progress = Math.min(baseProgress + progressShake, 100);
  const isComplete = currentStars >= targetStars;
  
  // Calculate player level from XP
  const levelInfo = calculateLevel(playerXP);
  
  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = endTime.getTime();
      const diff = Math.max(0, end - now);
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  
  const formatTime = (n: number) => n.toString().padStart(2, '0');
  
  return (
    <>
      <div className="w-full px-2 pt-2 pb-2 relative" ref={ref} style={{ pointerEvents: 'none' }}>
        {/* Inner wrapper for clickable elements */}
        <div style={{ pointerEvents: 'auto' }}>
        {/* Top row with icons aligned to progress bar center */}
        <div className="flex items-center gap-2" ref={progressBarContainerRef} style={{ paddingRight: '36px' }}>
          {/* Player level indicator - click opens info */}
          <LevelIndicator 
            level={levelInfo.level} 
            progress={levelInfo.progress} 
            isPulsing={isLevelPulsing} 
            onClick={() => setShowInfo(true)}
          />
          
          {/* Combined star circle + progress bar - click opens info */}
          <div className="flex-1 relative cursor-pointer" onClick={() => setShowInfo(true)}>
            {/* Progress bar background */}
            <div className="h-8 bg-black/30 border border-white/20 rounded-full relative" ref={progressBarInnerRef}>
              {/* Progress fill - sky blue, min width to show behind star icon */}
              <div 
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{ 
                  width: `calc(max(48px, ${baseProgress}%) + ${progressShake * 5}px)`,
                  background: isComplete 
                    ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' 
                    : 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 50%, #38bdf8 100%)',
                  boxShadow: isComplete 
                    ? '0 0 12px rgba(34, 197, 94, 0.6)' 
                    : '0 0 12px rgba(56, 189, 248, 0.5)'
                }}
              />
              
              {/* Progress text overlay - centered in the bar, offset for star */}
              <div className="absolute inset-0 flex items-center justify-center" style={{ paddingLeft: '24px' }}>
                <span 
                  key={`text-${animationKey}`}
                  className={`text-sm font-bold drop-shadow-lg ${isAnimating ? 'animate-text-pulse' : ''}`}
                  style={{ color: 'white' }}
                >
                  {currentStars.toLocaleString()} / {targetStars.toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* Star circle - positioned at left edge, vertically centered, sky blue background */}
            <div 
              data-star-icon
              className="absolute z-10 w-10 h-10 rounded-full border border-sky-300/50 flex items-center justify-center"
              style={{ 
                left: '0px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.5)',
              }}
            >
              {/* Particles */}
              {particles.map(particle => (
                <div
                  key={particle.id}
                  className="absolute rounded-full animate-particle"
                  style={{
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: '#fde047',
                    boxShadow: '0 0 4px #fde047',
                    '--particle-x': `${Math.cos(particle.angle) * particle.distance}px`,
                    '--particle-y': `${Math.sin(particle.angle) * particle.distance}px`,
                    '--particle-duration': `${particle.duration}s`,
                  } as React.CSSProperties}
                />
              ))}
              <span 
                key={animationKey}
                className={`text-2xl ${isAnimating ? 'animate-star-pulse' : ''}`} 
                style={{ filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))' }}
              >
                ⭐
              </span>
            </div>
            
            {/* Other player notification - slides out from under progress bar */}
            {onOtherPlayerStars && !disableOtherPlayerNotifications && (
              <OtherPlayerNotification 
                progressBarRef={progressBarInnerRef}
                onStarsEarned={onOtherPlayerStars}
                minInterval={20}
                maxInterval={45}
                triggerRef={otherPlayerTriggerRef}
              />
            )}
            
            {/* Timer - absolute positioned above progress bar, same width for perfect centering */}
            <div 
              className="absolute left-0 right-0 flex justify-center" 
              style={{ bottom: '100%', marginBottom: '2px', paddingLeft: '24px', zIndex: 1 }}
            >
              <span className="text-white/80 text-xs font-medium">
                Осталось: {timeLeft.days} дн. {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
              </span>
            </div>
          </div>
          
          {/* Dog icon */}
          <div className="flex-shrink-0" style={{ marginLeft: '-8px' }}>
            <div 
              className="w-9 h-8 flex items-center justify-center cursor-pointer"
              onClick={() => setShowInfo(true)}
            >
              <span 
                className={`text-3xl ${isComplete ? 'animate-bounce' : ''}`} 
                style={{ filter: 'drop-shadow(0 0 5px rgba(251, 191, 36, 0.7))' }}
              >
                🐕
              </span>
            </div>
          </div>
        </div>
        </div>
        
      </div>
      
      {/* Settings menu button - fixed in top right corner */}
      {ReactDOM.createPortal(
        <div 
          ref={debugMenuRef} 
          className="fixed z-50"
          style={{ top: '5px', right: '5px', pointerEvents: 'auto' }}
        >
          <button
            onClick={() => setShowDebugMenu(!showDebugMenu)}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-all border ${
              showDebugMenu 
                ? 'bg-white/30 border-white/50 rotate-90' 
                : 'bg-black/30 hover:bg-black/50 border-white/20'
            }`}
            aria-label="Настройки"
            style={{ transition: 'transform 0.2s ease-out, background 0.2s' }}
          >
            <span className="text-white text-sm">⚙️</span>
          </button>
          
          {/* Dropdown menu */}
          {showDebugMenu && (
            <div 
              className="absolute top-full right-0 mt-1 flex flex-col gap-1.5"
              style={{ 
                zIndex: 100,
                maxHeight: 'calc(100vh - 60px)',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
            >
              {/* Info button - closes menu because it opens a modal */}
              <button
                onClick={() => { setShowInfo(true); setShowDebugMenu(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/60 transition-colors border border-white/50 shadow-md backdrop-blur-sm"
                aria-label="Информация о пожертвовании"
                title="Информация"
              >
                <span className="text-white text-sm font-bold">?</span>
              </button>
              
              {/* Test win button - keep menu open for multi-clicks */}
              {onTestWin && (
                <button
                  onClick={() => onTestWin()}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-green-500/50 hover:bg-green-500/70 transition-colors border border-green-400/60 shadow-md backdrop-blur-sm"
                  aria-label="Тест победы"
                  title="Тест победы"
                >
                  <span className="text-white text-sm">✓</span>
                </button>
              )}
              
              {/* Drop collection item button - keep menu open for multi-clicks */}
              {onDropCollectionItem && (
                <button
                  onClick={() => onDropCollectionItem()}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/50 hover:bg-amber-500/70 transition-colors border border-amber-400/60 shadow-md backdrop-blur-sm"
                  aria-label="Дроп коллекции"
                  title="Дроп коллекции"
                >
                  <span className="text-white text-sm">🎁</span>
                </button>
              )}
              
              {/* Test level up button - keep menu open for multi-clicks */}
              {onTestLevelUp && (
                <button
                  onClick={() => onTestLevelUp()}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-purple-500/50 hover:bg-purple-500/70 transition-colors border border-purple-400/60 shadow-md backdrop-blur-sm"
                  aria-label="Тест левелапа"
                  title="Тест левелапа"
                >
                  <span className="text-white text-sm">⬆</span>
                </button>
              )}
              
              {/* Next day button - keep menu open for multi-clicks */}
              {onNextDay && (
                <button
                  onClick={() => onNextDay()}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-sky-500/50 hover:bg-sky-500/70 transition-colors border border-sky-400/60 shadow-md backdrop-blur-sm"
                  aria-label="Следующий день"
                  title="Следующий день"
                >
                  <span className="text-white text-sm">📅</span>
                </button>
              )}
              
              {/* Start Dungeon Dig event button */}
              {onStartDungeonDig && (
                <button
                  onClick={() => { onStartDungeonDig(); setShowDebugMenu(false); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-600/50 hover:bg-amber-600/70 transition-colors border border-amber-500/60 shadow-md backdrop-blur-sm"
                  aria-label="Запустить Подземелье"
                  title="Запустить Подземелье"
                >
                  <span className="text-white text-sm">🪏</span>
                </button>
              )}
              
              {/* Show overtaken notification button */}
              {onShowOvertaken && (
                <button
                  onClick={() => { onShowOvertaken(); setShowDebugMenu(false); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/50 hover:bg-red-500/70 transition-colors border border-red-400/60 shadow-md backdrop-blur-sm"
                  aria-label="Показать 'Вас обогнали'"
                  title="Показать 'Вас обогнали'"
                >
                  <span className="text-white text-sm">⬇️</span>
                </button>
              )}
              
              {/* Test other player notification button - keep menu open for multi-clicks */}
              {onOtherPlayerStars && (
                <button
                  onClick={() => otherPlayerTriggerRef.current?.()}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-500/50 hover:bg-indigo-500/70 transition-colors border border-indigo-400/60 shadow-md backdrop-blur-sm"
                  aria-label="Тест уведомления от другого игрока"
                  title="Тест уведомления"
                >
                  <span className="text-white text-sm">👤</span>
                </button>
              )}
              
              {/* Debug button - keep menu open for multi-clicks */}
              {onDebugClick && (
                <button
                  onClick={() => onDebugClick()}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-500/50 hover:bg-gray-500/70 transition-colors border border-gray-400/60 shadow-md backdrop-blur-sm"
                  aria-label="Debug info"
                  title="Debug info"
                >
                  <span className="text-white text-sm">🔧</span>
                </button>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
      
      {/* Info Modal - rendered via portal to escape transform stacking context */}
      {showInfo && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', touchAction: 'none' }}
          onClick={() => setShowInfo(false)}
          onTouchMove={e => {
            // Allow scroll inside modal content, block outside
            const target = e.target as HTMLElement;
            if (!target.closest('[data-scrollable]')) {
              e.preventDefault();
            }
          }}
        >
          <div 
            className="bg-gradient-to-b from-amber-900 to-amber-950 text-white p-5 rounded-2xl shadow-2xl max-w-sm w-full border border-amber-600/30"
            data-scrollable
            style={{ 
              margin: 'auto', 
              maxHeight: 'calc(100vh - 32px)', 
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
            }}
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative mb-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🐕</span>
                <h3 className="text-lg font-bold">Помогаем Бусинке</h3>
              </div>
              <button 
                onClick={() => setShowInfo(false)}
                className="absolute top-0 right-0 text-white/60 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            {/* Content */}
            <div className="space-y-3">
              {/* Progress bar with text inside */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div className="flex-1 h-7 bg-black/30 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                      style={{ width: `${baseProgress}%` }}
                    />
                    {/* Text overlay on progress bar */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-white drop-shadow-lg">
                        {currentStars.toLocaleString()} / {targetStars.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Timer below progress bar */}
                <div className="text-center mt-1">
                  <span className="text-white/70 text-xs">
                    Осталось: {timeLeft.days} дн. {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
                  </span>
                </div>
              </div>
              
              {/* Story */}
              <div className="bg-black/20 rounded-xl p-3">
                <p className="text-white/80 text-sm leading-relaxed">
                  {petStory}
                </p>
              </div>
              
              {/* Goal */}
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-amber-300 text-xs uppercase tracking-wide mb-1">Цель сбора</div>
                <div className="font-bold text-green-400 text-xl">{donationAmount}</div>
                <p className="text-white/70 text-sm mt-2 leading-relaxed">
                  Чтобы собрать эту сумму из рекламной выручки, нам нужно набрать <span className="text-amber-300 font-semibold">{targetStars.toLocaleString()} ⭐</span>
                </p>
                <p className="text-white/60 text-xs mt-2">
                  Звёзды начисляются за ежедневные задания
                </p>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowInfo(false)}
              className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors text-white/80"
            >
              Закрыть
            </button>
          </div>
        </div>,
        document.body
      )}
      
    </>
  );
});

DonationProgress.displayName = 'DonationProgress';

// Add CSS for star pulse animation
const pulseStyleSheet = document.createElement('style');
pulseStyleSheet.textContent = `
  @keyframes star-pulse {
    0% { transform: scale(1.5); }
    100% { transform: scale(1); }
  }
  
  .animate-star-pulse {
    animation: star-pulse 0.3s ease-out;
    transform-origin: center center;
    display: inline-block;
  }
  
  @keyframes particle-fly {
    0% { 
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    100% { 
      transform: translate(var(--particle-x), var(--particle-y)) scale(0);
      opacity: 0;
    }
  }
  
  .animate-particle {
    animation: particle-fly var(--particle-duration) ease-out forwards;
  }
  
  @keyframes text-pulse {
    0% { transform: scale(1.2); color: #fde047; }
    100% { transform: scale(1); color: #ffffff; }
  }
  
  .animate-text-pulse {
    animation: text-pulse 0.6s ease-out;
    transform-origin: center center;
    display: inline-block;
  }
`;

if (!document.head.contains(pulseStyleSheet)) {
  document.head.appendChild(pulseStyleSheet);
}

