import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface FlyingStar {
  id: number;
  startX: number;
  startY: number;
  scatterX: number;
  scatterY: number;
  targetX: number;
  targetY: number;
  controlX: number;
  controlY: number;
  scatterDuration: number;
  flyDelay: number;
  flyDuration: number;
  value: number;
}

interface DailyRewardPopupProps {
  isVisible: boolean;
  currentDay: number; // 1-10
  previousStreak: number; // 0-10, streak before today
  onClaim: () => void;
  progressBarRef?: React.RefObject<HTMLDivElement>;
  onStarArrived?: (count: number) => void;
}

const MAX_FLYING_STARS = 10;

export function DailyRewardPopup({ 
  isVisible, 
  currentDay, 
  previousStreak, 
  onClaim,
  progressBarRef,
  onStarArrived
}: DailyRewardPopupProps) {
  const [flyingStars, setFlyingStars] = useState<FlyingStar[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hideContent, setHideContent] = useState(false);
  const rewardIconRef = useRef<HTMLDivElement>(null);
  const starsArrivedRef = useRef(0);
  const expectedStarsRef = useRef(0);
  
  // Reset state when popup becomes visible
  useEffect(() => {
    if (isVisible) {
      setFlyingStars([]);
      setIsAnimating(false);
      setHideContent(false);
      starsArrivedRef.current = 0;
      expectedStarsRef.current = 0;
    }
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  const wasReset = previousStreak === 0 || currentDay === 1;
  
  // Calculate visible days range - show 5 days total (+-2 from current)
  let startDay: number, endDay: number;
  if (currentDay <= 3) {
    startDay = 1;
    endDay = 5;
  } else if (currentDay >= 9) {
    startDay = 6;
    endDay = 10;
  } else {
    startDay = currentDay - 2;
    endDay = currentDay + 2;
  }
  
  const visibleDays = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);
  
  const handleClaim = () => {
    if (isAnimating) return;
    
    // Get start position (center of reward icon or screen center)
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;
    
    if (rewardIconRef.current) {
      const rect = rewardIconRef.current.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }
    
    // Get target position (progress bar star icon)
    let targetX = window.innerWidth / 2;
    let targetY = 50;
    
    if (progressBarRef?.current) {
      const starIcon = progressBarRef.current.querySelector('[data-star-icon]');
      if (starIcon) {
        const rect = starIcon.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }
    }
    
    // Create flying stars
    const totalStars = currentDay;
    const iconCount = Math.min(totalStars, MAX_FLYING_STARS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    expectedStarsRef.current = iconCount;
    starsArrivedRef.current = 0;
    
    const stars: FlyingStar[] = [];
    const minRadius = 20;
    const maxRadius = 60;
    const scatterDuration = 400;
    
    for (let i = 0; i < iconCount; i++) {
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = startX + Math.cos(angle) * radius;
      const scatterY = startY + Math.sin(angle) * radius;
      
      // Bezier control point
      const midX = (scatterX + targetX) / 2;
      const midY = (scatterY + targetY) / 2;
      const dx = targetX - scatterX;
      const dy = targetY - scatterY;
      const perpX = -dy;
      const perpY = dx;
      const len = Math.sqrt(perpX * perpX + perpY * perpY);
      const curvature = (Math.random() - 0.5) * 150;
      const controlX = midX + (perpX / len) * curvature;
      const controlY = midY + (perpY / len) * curvature;
      
      const flyDuration = 400 + Math.random() * 150;
      const flyDelay = i * 50;
      
      stars.push({
        id: Date.now() + i,
        startX,
        startY,
        scatterX,
        scatterY,
        targetX,
        targetY,
        controlX,
        controlY,
        scatterDuration,
        flyDelay,
        flyDuration,
        value
      });
    }
    
    setIsAnimating(true);
    setHideContent(true);
    setFlyingStars(stars);
  };
  
  const handleStarArrived = (star: FlyingStar) => {
    onStarArrived?.(star.value);
    starsArrivedRef.current++;
    
    if (starsArrivedRef.current >= expectedStarsRef.current) {
      // All stars arrived - close popup
      setTimeout(() => {
        onClaim();
      }, 100);
    }
  };
  
  return (
    <>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
      >
        {!hideContent && (
          <div className="bg-gradient-to-b from-indigo-900 to-slate-900 rounded-2xl p-6 mx-4 max-w-md w-full shadow-2xl border border-indigo-500/50 animate-bounce-in">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">🌅</div>
              <h2 className="text-2xl font-bold text-white">Ежедневная награда</h2>
              {wasReset && (
                <p className="text-indigo-300 text-sm mt-1">
                  Начинаем новую серию!
                </p>
              )}
            </div>
            
            {/* Days chain - single row with larger cards (5 days) */}
            <div className="mb-5">
              <div className="flex justify-center items-end gap-2">
                {visibleDays.map((day) => {
                  const isPast = day < currentDay;
                  const isCurrent = day === currentDay;
                  // After day 10, reward stays at 10 stars
                  const rewardStars = Math.min(day, 10);
                  
                  if (isCurrent) {
                    // Current day - larger with prominent reward
                    return (
                      <div
                        key={day}
                        ref={rewardIconRef}
                        className="relative w-20 h-28 rounded-xl flex flex-col items-center justify-center bg-gradient-to-b from-yellow-400 to-amber-500 shadow-xl shadow-yellow-500/50"
                      >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <span className="text-3xl">🎁</span>
                        </div>
                        <span className="text-xs font-semibold text-amber-900 mt-2">День</span>
                        <span className="text-2xl font-bold text-amber-900">{day}</span>
                        <div className="flex items-center gap-1 mt-1 bg-amber-600/40 px-2 py-1 rounded-lg">
                          <span className="text-2xl">⭐</span>
                          <span className="text-xl font-bold text-white">+{rewardStars}</span>
                        </div>
                        {rewardStars === 10 && (
                          <span className="text-[10px] text-amber-900 font-semibold mt-0.5">МАКС!</span>
                        )}
                      </div>
                    );
                  }
                  
                  // Past and future days - same gray style
                  return (
                    <div
                      key={day}
                      className="relative w-14 h-20 rounded-xl flex flex-col items-center justify-center bg-slate-700/60 border border-slate-600/50"
                    >
                      <span className="text-xs font-semibold text-slate-400">День</span>
                      <span className="text-xl font-bold text-slate-300">{day}</span>
                      <div className="flex items-center">
                        <span className="text-sm text-slate-500" style={{ filter: 'grayscale(1) opacity(0.6)' }}>⭐</span>
                        <span className="text-sm text-slate-500">{rewardStars}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Warning about missing days */}
            <div className="text-center mb-4 px-4">
              <p className="text-slate-400 text-xs">
                💡 Заходи каждый день, чтобы получать больше звёзд!
                <br />
                <span className="text-red-400/70">Пропуск дня сбрасывает прогресс</span>
              </p>
            </div>
            
            {/* Claim button */}
            <button
              onClick={handleClaim}
              disabled={isAnimating}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              Забрать награду!
            </button>
          </div>
        )}
      </div>
      
      {/* Flying stars */}
      {flyingStars.map(star => (
        <DailyRewardFlyingStar
          key={star.id}
          star={star}
          onArrived={() => handleStarArrived(star)}
        />
      ))}
    </>
  );
}

// Quadratic bezier interpolation
function quadraticBezier(t: number, p0: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInQuad(t: number): number {
  return t * t;
}

// Flying star component
function DailyRewardFlyingStar({ star, onArrived }: { star: FlyingStar; onArrived: () => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const arrivedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const flyDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onArrivedRef = useRef(onArrived);
  
  onArrivedRef.current = onArrived;
  
  useEffect(() => {
    setIsVisible(true);
    
    const animateScatter = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animateScatter);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / star.scatterDuration, 1);
      const easedProgress = easeOutCubic(progress);
      
      const x = star.startX + (star.scatterX - star.startX) * easedProgress;
      const y = star.startY + (star.scatterY - star.startY) * easedProgress;
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateScatter);
      } else {
        flyDelayTimerRef.current = setTimeout(() => {
          startTimeRef.current = null;
          rafRef.current = requestAnimationFrame(animateFly);
        }, star.flyDelay);
      }
    };
    
    const animateFly = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animateFly);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / star.flyDuration, 1);
      const easedProgress = easeInQuad(progress);
      
      const x = quadraticBezier(easedProgress, star.scatterX, star.controlX, star.targetX);
      const y = quadraticBezier(easedProgress, star.scatterY, star.controlY, star.targetY);
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateFly);
      } else {
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          elementRef.current.style.display = 'none';
          onArrivedRef.current();
          setIsVisible(false);
        }
      }
    };
    
    rafRef.current = requestAnimationFrame(animateScatter);
    
    return () => {
      if (flyDelayTimerRef.current) {
        clearTimeout(flyDelayTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [star]);
  
  if (!isVisible) return null;
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed text-3xl pointer-events-none z-[10001]"
      style={{
        left: star.startX,
        top: star.startY,
        transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.9))'
      }}
    >
      ⭐
    </div>,
    document.body
  );
}

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes bounce-in {
    0% { 
      opacity: 0; 
      transform: scale(0.3) translateY(50px); 
    }
    50% { 
      transform: scale(1.05) translateY(-10px); 
    }
    70% { 
      transform: scale(0.95) translateY(5px); 
    }
    100% { 
      opacity: 1; 
      transform: scale(1) translateY(0); 
    }
  }
  
  .animate-bounce-in {
    animation: bounce-in 0.5s ease-out;
  }
`;

if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}
