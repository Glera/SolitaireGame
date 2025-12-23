import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';

interface Quest {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: number;
  completed: boolean;
}

interface FlyingStar {
  id: number;
  questId: string;
  value: number; // How many stars this icon represents
  // Starting position (center of reward icon)
  startX: number;
  startY: number;
  // Position after scatter phase
  scatterX: number;
  scatterY: number;
  // Final target position
  targetX: number;
  targetY: number;
  // Control point for bezier curve in flight phase
  controlX: number;
  controlY: number;
  // Timing
  scatterDuration: number;
  flyDelay: number;
  flyDuration: number;
}

// Max flying star icons
const MAX_FLYING_ICONS = 10;

interface DailyQuestsProps {
  isVisible: boolean;
  quests: Quest[];
  onClose: () => void;
  onReset?: () => void;
  progressBarRef?: React.RefObject<HTMLDivElement>;
  onStarArrived?: (count?: number) => void; // count defaults to 1
}

export function DailyQuests({ isVisible, quests, onClose, onReset, progressBarRef, onStarArrived }: DailyQuestsProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState<Record<string, number>>({});
  const [displayedCount, setDisplayedCount] = useState<Record<string, number>>({});
  const [textPulseKey, setTextPulseKey] = useState<Record<string, number>>({});
  const [flyingStars, setFlyingStars] = useState<FlyingStar[]>([]);
  const [hiddenRewardIcons, setHiddenRewardIcons] = useState<Record<string, boolean>>({});
  const [isReady, setIsReady] = useState(false);
  const [showCompletedLabel, setShowCompletedLabel] = useState<Record<string, boolean>>({});
  const rewardIconRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const starsArrivedCount = useRef<Record<string, number>>({});
  const expectedStarsCount = useRef<Record<string, number>>({});
  
  // Store previous values to detect changes
  const prevValuesRef = useRef<Record<string, number>>({});
  
  // Queue for sequential quest animations
  const questQueueRef = useRef<Quest[]>([]);
  const isAnimatingQuestRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  
  // Function to animate the next quest in queue
  const animateNextQuest = () => {
    if (questQueueRef.current.length === 0) {
      isAnimatingQuestRef.current = false;
      return;
    }
    
    isAnimatingQuestRef.current = true;
    const quest = questQueueRef.current.shift()!;
    
    // Animate progress bar for this quest
    setAnimatedProgress(prev => ({
      ...prev,
      [quest.id]: quest.current
    }));
    
    // Update displayed number after progress bar animation (700ms)
    const numberTimer = setTimeout(() => {
      setDisplayedCount(prev => ({
        ...prev,
        [quest.id]: quest.current
      }));
      setTextPulseKey(prev => ({
        ...prev,
        [quest.id]: Date.now()
      }));
      
      // Check if quest just completed - launch stars
      if (quest.current >= quest.target && quest.completed) {
        // expectedStarsCount will be set in launchStarsForQuest with proper icon count
        starsArrivedCount.current[quest.id] = 0;
        // Show completed label immediately when stars start flying
        setShowCompletedLabel(prev => ({ ...prev, [quest.id]: true }));
        launchStarsForQuest(quest);
        // Next quest will be animated after all stars arrive (handled in handleStarArrived)
      } else {
        // No stars to wait for - animate next quest after small delay
        const nextTimer = setTimeout(() => {
          animateNextQuest();
        }, 200);
        timersRef.current.push(nextTimer);
      }
    }, 700);
    timersRef.current.push(numberTimer);
  };
  
  // Reset state synchronously when becoming visible
  useEffect(() => {
    if (isVisible) {
      // Reset everything first
      setIsReady(false);
      setFlyingStars([]);
      setHiddenRewardIcons({});
      setTextPulseKey({});
      starsArrivedCount.current = {};
      expectedStarsCount.current = {};
      questQueueRef.current = [];
      isAnimatingQuestRef.current = false;
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
      
      // Determine which quests had progress (comparing to stored previous values)
      const questsWithProgress: Quest[] = [];
      quests.forEach(q => {
        const prevValue = prevValuesRef.current[q.id] ?? 0;
        if (q.current > prevValue) {
          questsWithProgress.push(q);
        }
      });
      
      // Set initial values and completed labels
      const initialProgress: Record<string, number> = {};
      const initialDisplay: Record<string, number> = {};
      const initialCompletedLabels: Record<string, boolean> = {};
      
      quests.forEach(q => {
        const prevValue = prevValuesRef.current[q.id] ?? 0;
        const hadProgress = questsWithProgress.some(qp => qp.id === q.id);
        
        if (hadProgress) {
          // Quest has new progress - start from previous value for animation
          initialProgress[q.id] = prevValue;
          initialDisplay[q.id] = prevValue;
        } else {
          // Quest has no new progress - show current state immediately
          initialProgress[q.id] = q.current;
          initialDisplay[q.id] = q.current;
          // Show completed label immediately for already completed quests
          if (q.completed) {
            initialCompletedLabels[q.id] = true;
          }
        }
      });
      
      setAnimatedProgress(initialProgress);
      setDisplayedCount(initialDisplay);
      setShowCompletedLabel(initialCompletedLabels);
      
      // Update stored previous values for next time
      quests.forEach(q => {
        prevValuesRef.current[q.id] = q.current;
      });
      
      // Show the modal after state is set
      requestAnimationFrame(() => {
        setIsReady(true);
        setIsAnimating(true);
      });
      
      // Build queue of quests that need animation
      questQueueRef.current = questsWithProgress.slice();
      
      // Start animating after initial delay
      const startTimer = setTimeout(() => {
        animateNextQuest();
      }, 400);
      timersRef.current.push(startTimer);
      
      return () => {
        timersRef.current.forEach(t => clearTimeout(t));
        timersRef.current = [];
      };
    }
  }, [isVisible, quests]);
  
  const launchStarsForQuest = (quest: Quest) => {
    const rewardIconEl = rewardIconRefs.current[quest.id];
    if (!rewardIconEl) return;
    
    // Hide the reward icon
    setHiddenRewardIcons(prev => ({ ...prev, [quest.id]: true }));
    
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
    
    // Get start position (center of reward icon)
    const iconRect = rewardIconEl.getBoundingClientRect();
    const centerX = iconRect.left + iconRect.width / 2;
    const centerY = iconRect.top + iconRect.height / 2;
    
    // Create stars with two-phase animation (with limit)
    const stars: FlyingStar[] = [];
    const totalStars = quest.reward;
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    // Set expected icon count for tracking
    expectedStarsCount.current[quest.id] = iconCount;
    
    // Scatter radius range (smaller for quest rewards)
    const minRadius = 12;
    const maxRadius = 35;
    const scatterDuration = 500; // 0.5 seconds
    
    for (let i = 0; i < iconCount; i++) {
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      // Evenly distribute stars around a circle with random radius
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3; // slight angle variation
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = centerX + Math.cos(angle) * radius;
      const scatterY = centerY + Math.sin(angle) * radius;
      
      // Calculate bezier control point for flight phase
      const midX = (scatterX + targetX) / 2;
      const midY = (scatterY + targetY) / 2;
      
      const dx = targetX - scatterX;
      const dy = targetY - scatterY;
      const perpX = -dy;
      const perpY = dx;
      const len = Math.sqrt(perpX * perpX + perpY * perpY);
      
      // Curvature
      const curvature = (Math.random() - 0.5) * 150;
      const controlX = midX + (perpX / len) * curvature;
      const controlY = midY + (perpY / len) * curvature;
      
      // Flight duration
      const flyDuration = 350 + Math.random() * 150;
      
      // Delay before flying (after scatter) - sequential
      const flyDelay = i * 60;
      
      stars.push({
        id: Date.now() + i,
        questId: quest.id,
        value,
        startX: centerX,
        startY: centerY,
        scatterX,
        scatterY,
        targetX,
        targetY,
        controlX,
        controlY,
        scatterDuration,
        flyDelay,
        flyDuration
      });
    }
    
    setFlyingStars(prev => [...prev, ...stars]);
  };
  
  const handleStarArrived = (star: FlyingStar) => {
    onStarArrived?.(star.value);
    
    // Track arrived icons
    starsArrivedCount.current[star.questId] = (starsArrivedCount.current[star.questId] || 0) + 1;
    
    // Check if all icons for this quest have arrived
    const expectedCount = expectedStarsCount.current[star.questId] || 0;
    const arrivedCount = starsArrivedCount.current[star.questId] || 0;
    
    if (arrivedCount >= expectedCount) {
      // All icons arrived - animate next quest after small delay
      const nextTimer = setTimeout(() => {
        animateNextQuest();
      }, 200);
      timersRef.current.push(nextTimer);
    }
  };
  
  if (!isVisible || !isReady) return null;
  
  const handleClick = () => {
    onClose();
  };
  
  return (
    <>
      <div 
        className="fixed inset-0 z-[9997] flex items-center justify-center"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          paddingTop: '65px',
          paddingBottom: '70px'
        }}
        onClick={handleClick}
      >
        <div 
          className={`bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-5 mx-4 max-w-sm w-full shadow-2xl border border-slate-600/50 ${isAnimating ? 'animate-quest-appear' : ''}`}
          style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-center mb-3">
            <h2 className="text-lg font-bold text-white">Ежедневные задания</h2>
          </div>
          
          {/* Quests list */}
          <div className="space-y-2">
            {quests.map((quest, index) => (
              <div 
                key={quest.id}
                className={`relative rounded-xl p-3 transition-all border ${
                  showCompletedLabel[quest.id] 
                    ? 'bg-lime-900/30 border-lime-600/40' 
                    : 'bg-slate-700/50 border-slate-600/50'
                }`}
              >
                {/* Quest content */}
                <div className="flex items-start gap-2">
                  <div className="text-xl">
                    {showCompletedLabel[quest.id] ? '✅' : '🎯'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white text-sm">
                        {quest.title}
                      </h3>
                      {!showCompletedLabel[quest.id] && (
                        <div 
                          ref={el => rewardIconRefs.current[quest.id] = el}
                          className={`flex items-center gap-1 text-yellow-400 text-sm ${hiddenRewardIcons[quest.id] ? 'invisible' : ''}`}
                        >
                          <span>+{quest.reward}</span>
                          <span>⭐</span>
                        </div>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{quest.description}</p>
                    
                    {/* Progress bar - hidden for completed quests */}
                    {!showCompletedLabel[quest.id] && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">
                            Прогресс
                          </span>
                          <span 
                            key={textPulseKey[quest.id] || 0}
                            className={textPulseKey[quest.id] ? 'animate-quest-text-pulse' : 'text-white'}
                          >
                            {displayedCount[quest.id] ?? 0} / {quest.target}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-sky-500 to-sky-400"
                            style={{ width: `${Math.min(((animatedProgress[quest.id] ?? 0) / quest.target) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Completed label - shown only after stars arrive */}
                {showCompletedLabel[quest.id] && (
                  <div className="absolute top-2 right-2">
                    <span className="text-lime-400 text-xs font-bold animate-fade-in">ВЫПОЛНЕНО</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 3 - quests.length) }).map((_, index) => (
              <div 
                key={`empty-${index}`}
                className="rounded-xl p-3 bg-slate-800/30 border border-slate-700/30 border-dashed"
              >
                <div className="flex items-center justify-center gap-2 text-slate-600">
                  <span className="text-lg">🔒</span>
                  <span className="text-xs">Скоро</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="mt-3 text-center">
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg transition-colors"
            >
              Продолжить
            </button>
          </div>
        </div>
      </div>
      
      {/* Flying stars - rendered via portal to be above everything */}
      {flyingStars.map(star => (
        <QuestFlyingStar
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

// Easing function for scatter phase - fast start, slow end (deceleration)
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Easing function for fly phase - slow start, fast end (acceleration)
function easeInQuad(t: number): number {
  return t * t;
}

// Flying star component for quest rewards - two-phase animation
function QuestFlyingStar({ star, onArrived }: { star: FlyingStar; onArrived: () => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const arrivedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const flyDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onArrivedRef = useRef(onArrived);
  
  // Keep callback ref updated
  onArrivedRef.current = onArrived;
  
  useEffect(() => {
    // Start immediately - show and begin scatter phase
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
      const easedProgress = easeOutCubic(progress); // Deceleration
      
      // Linear interpolation from start to scatter position
      const x = star.startX + (star.scatterX - star.startX) * easedProgress;
      const y = star.startY + (star.scatterY - star.startY) * easedProgress;
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateScatter);
      } else {
        // Scatter complete - wait for fly delay
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
      const easedProgress = easeInQuad(progress); // Acceleration
      
      // Bezier curve from scatter position to target
      const x = quadraticBezier(easedProgress, star.scatterX, star.controlX, star.targetX);
      const y = quadraticBezier(easedProgress, star.scatterY, star.controlY, star.targetY);
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateFly);
      } else {
        // Fly complete - hide instantly and notify
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          elementRef.current.style.display = 'none';
          onArrivedRef.current();
          setIsVisible(false);
        }
      }
    };
    
    // Start scatter animation
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
  
  // Render via portal to ensure it's above everything
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed text-2xl pointer-events-none z-[10000]"
      style={{
        left: star.startX,
        top: star.startY,
        transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))'
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
  @keyframes quest-appear {
    from { 
      opacity: 0; 
      transform: scale(0.9) translateY(20px); 
    }
    to { 
      opacity: 1; 
      transform: scale(1) translateY(0); 
    }
  }
  
  .animate-quest-appear {
    animation: quest-appear 0.3s ease-out;
  }
  
  @keyframes quest-text-pulse {
    0% { 
      transform: scale(1.3); 
      color: #fde047; 
    }
    100% { 
      transform: scale(1); 
      color: #ffffff; 
    }
  }
  
  .animate-quest-text-pulse {
    animation: quest-text-pulse 0.5s ease-out forwards;
    display: inline-block;
    color: #ffffff;
  }
`;

if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}
