import React, { useEffect, useState, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';

// Hook to detect if we need compact mode
function useCompactMode() {
  const [isCompact, setIsCompact] = useState(false);
  
  useEffect(() => {
    const checkHeight = () => {
      // If screen height is less than 580px, use compact mode
      // This ensures everything fits without scrolling on very small screens
      setIsCompact(window.innerHeight < 580);
    };
    
    checkHeight();
    window.addEventListener('resize', checkHeight);
    return () => window.removeEventListener('resize', checkHeight);
  }, []);
  
  return isCompact;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: number;
  completed: boolean;
  rewardClaimed?: boolean; // True if reward animation has already played
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

interface FlyingChip {
  id: number;
  questId: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
}

// Max flying star icons
const MAX_FLYING_ICONS = 30;

// Calculate how many star icons to show based on reward value
// Up to 10: show as-is (1 star = 1 icon)
// After 10: each additional icon represents 10 stars
// Example: 19 = 10 + 1 = 11 icons, 25 = 10 + 2 = 12 icons, 150 = 10 + 14 = 24 icons
function calculateIconCount(totalStars: number): number {
  if (totalStars <= 10) {
    return totalStars;
  }
  // First 10 stars = 10 icons, then every 10 additional stars = 1 more icon
  const additionalIcons = Math.ceil((totalStars - 10) / 10);
  return Math.min(10 + additionalIcons, MAX_FLYING_ICONS);
}

interface DailyQuestsProps {
  isVisible: boolean;
  quests: Quest[];
  onClose: () => void;
  onReset?: () => void;
  progressBarRef?: React.RefObject<HTMLDivElement>;
  onStarArrived?: (count?: number) => void; // count defaults to 1
  onQuestRewardClaimed?: (questId: string) => void; // Called when quest reward animation completes
  // Monthly progress
  monthlyProgress?: number;
  monthlyTarget?: number;
  monthlyReward?: number;
  onMonthlyRewardClaim?: () => void;
  monthlyRewardClaimed?: boolean;
  onMonthlyProgressIncrement?: () => void; // Called when monthly progress should increase
}

export function DailyQuests({ 
  isVisible, 
  quests, 
  onClose, 
  onReset, 
  progressBarRef, 
  onStarArrived,
  onQuestRewardClaimed,
  monthlyProgress = 0,
  monthlyTarget = 50,
  monthlyReward = 500,
  onMonthlyRewardClaim,
  monthlyRewardClaimed = false,
  onMonthlyProgressIncrement
}: DailyQuestsProps) {
  const isCompact = useCompactMode();
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState<Record<string, number>>({});
  const [displayedCount, setDisplayedCount] = useState<Record<string, number>>({});
  const [textPulseKey, setTextPulseKey] = useState<Record<string, number>>({});
  const [flyingStars, setFlyingStars] = useState<FlyingStar[]>([]);
  const [flyingChips, setFlyingChips] = useState<FlyingChip[]>([]);
  const [hiddenRewardIcons, setHiddenRewardIcons] = useState<Record<string, boolean>>({});
  const [isReady, setIsReady] = useState(false);
  const [showCompletedLabel, setShowCompletedLabel] = useState<Record<string, boolean>>({});
  const [monthlyBarPulse, setMonthlyBarPulse] = useState(false);
  const [monthlyTextPulse, setMonthlyTextPulse] = useState(false);
  const [monthlyOvershoot, setMonthlyOvershoot] = useState(0); // Extra % to show temporarily
  const rewardIconRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const questCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const questProgressBarRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const monthlyBarRef = useRef<HTMLDivElement>(null);
  const starsArrivedCount = useRef<Record<string, number>>({});
  const expectedStarsCount = useRef<Record<string, number>>({});
  
  // Store previous values to detect changes
  const prevValuesRef = useRef<Record<string, number>>({});
  // Track if prevValuesRef has been initialized (happens once on mount)
  const initializedRef = useRef(false);
  // Track previous visibility to detect open/close transitions
  const wasVisibleRef = useRef(false);
  // Store quests snapshot when window opens (for consistent animation)
  const questsSnapshotRef = useRef<Quest[]>([]);
  
  // Initialize prevValuesRef on mount with current quest values
  // This prevents false "new progress" detection after page reload
  useEffect(() => {
    if (!initializedRef.current && quests.length > 0) {
      initializedRef.current = true;
      quests.forEach(q => {
        prevValuesRef.current[q.id] = q.current;
      });
    }
  }, [quests]);
  
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
      
      // Check if quest just completed - launch stars AND chip simultaneously
      if (quest.current >= quest.target && quest.completed) {
        // expectedStarsCount will be set in launchStarsForQuest with proper icon count
        starsArrivedCount.current[quest.id] = 0;
        // Show completed label immediately when stars start flying
        setShowCompletedLabel(prev => ({ ...prev, [quest.id]: true }));
        launchStarsForQuest(quest);
        // Launch chip at the same moment progress bar reaches 100%
        // This creates effect of progress bar "pushing out" the chip
        launchChipToMonthlyBar(quest.id);
        // Next quest will be animated after chip arrives (handled in handleChipArrived)
      } else {
        // No completion - animate next quest after progress bar settles
        const nextTimer = setTimeout(() => {
          animateNextQuest();
        }, 400);
        timersRef.current.push(nextTimer);
      }
    }, 700);
    timersRef.current.push(numberTimer);
  };
  
  // Reset state and start animations only when window OPENS (not on every quest change)
  useEffect(() => {
    // Only run when transitioning from invisible to visible
    const justOpened = isVisible && !wasVisibleRef.current;
    wasVisibleRef.current = isVisible;
    
    if (!justOpened) {
      return;
    }
    
    // Capture quests snapshot at window open time
    questsSnapshotRef.current = [...quests];
    const currentQuests = questsSnapshotRef.current;
    
    // Reset everything first
    setIsReady(false);
    setFlyingStars([]);
    setFlyingChips([]);
    setHiddenRewardIcons({});
    setTextPulseKey({});
    setMonthlyBarPulse(false);
    setMonthlyTextPulse(false);
    setMonthlyOvershoot(0);
    starsArrivedCount.current = {};
    expectedStarsCount.current = {};
    questQueueRef.current = [];
    isAnimatingQuestRef.current = false;
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    
    // Determine which quests had progress (comparing to stored previous values)
    // Skip quests that already had their reward claimed
    const questsWithProgress: Quest[] = [];
    currentQuests.forEach(q => {
      // Skip if reward was already claimed (prevents re-animation after page reload)
      if (q.rewardClaimed) return;
      
      const prevValue = prevValuesRef.current[q.id] ?? q.current;
      if (q.current > prevValue) {
        questsWithProgress.push(q);
      }
    });
    
    // Set initial values and completed labels
    const initialProgress: Record<string, number> = {};
    const initialDisplay: Record<string, number> = {};
    const initialCompletedLabels: Record<string, boolean> = {};
    
    currentQuests.forEach(q => {
      const prevValue = prevValuesRef.current[q.id] ?? q.current;
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
    currentQuests.forEach(q => {
      prevValuesRef.current[q.id] = q.current;
    });
    
    // Show the modal after state is set
    requestAnimationFrame(() => {
      setIsReady(true);
      setIsAnimating(true);
    });
    
    // Build queue of quests that need animation
    questQueueRef.current = questsWithProgress.slice();
    
    // Start animating after initial delay (only if there are quests to animate)
    if (questsWithProgress.length > 0) {
      const startTimer = setTimeout(() => {
        animateNextQuest();
      }, 400);
      timersRef.current.push(startTimer);
    }
    
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]); // Only depend on visibility, not quests - quests changes during animation shouldn't restart
  
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
    
    // Create stars with two-phase animation (with smart scaling)
    const stars: FlyingStar[] = [];
    const totalStars = quest.reward;
    const iconCount = calculateIconCount(totalStars);
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
  
  const launchChipToMonthlyBar = (questId: string) => {
    if (!monthlyBarRef.current) return;
    
    // Get target position (monthly progress bar center)
    const monthlyRect = monthlyBarRef.current.getBoundingClientRect();
    const targetX = monthlyRect.left + monthlyRect.width / 2;
    const targetY = monthlyRect.top + monthlyRect.height / 2;
    
    // Get start position from the right edge of quest progress bar
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;
    
    const questProgressBarEl = questProgressBarRefs.current[questId];
    if (questProgressBarEl) {
      const rect = questProgressBarEl.getBoundingClientRect();
      startX = rect.right; // Right edge of progress bar
      startY = rect.top + rect.height / 2;
    }
    
    // Create one chip that bounces off and falls down
    // Fast upward impulse for quick parabolic arc
    const chip: FlyingChip = {
      id: Date.now(),
      questId,
      startX,
      startY,
      targetX,
      targetY,
      velocityX: -2.5 + Math.random() * 1.5, // Faster left drift  
      velocityY: -9 - Math.random() * 3  // Faster upward arc
    };
    
    setFlyingChips(prev => [...prev, chip]);
  };
  
  const handleChipArrived = (chip: FlyingChip) => {
    // Mark quest reward as claimed (prevents re-animation after page reload)
    onQuestRewardClaimed?.(chip.questId);
    
    // Update monthly progress with pulse effect
    onMonthlyProgressIncrement?.();
    
    // Trigger text pulse animation
    setMonthlyTextPulse(true);
    setTimeout(() => setMonthlyTextPulse(false), 400);
    
    // Trigger overshoot animation (show 5% extra then return)
    setMonthlyOvershoot(5);
    setTimeout(() => setMonthlyOvershoot(0), 300);
    
    // Pulse the bar
    setMonthlyBarPulse(true);
    setTimeout(() => setMonthlyBarPulse(false), 400);
    
    // Animate next quest after effects complete (wait for pulse to finish)
    // This ensures player sees the monthly bar update before next quest starts
    const nextTimer = setTimeout(() => {
      animateNextQuest();
    }, 600);
    timersRef.current.push(nextTimer);
  };
  
  const handleStarArrived = (star: FlyingStar) => {
    onStarArrived?.(star.value);
    // Stars fly independently, chip is launched with progress bar completion
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
          paddingTop: isCompact ? '50px' : '65px',
          paddingBottom: isCompact ? '50px' : '70px'
        }}
        onClick={handleClick}
      >
        <div 
          className={`bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl mx-4 max-w-sm w-full shadow-2xl border border-slate-600/50 ${isAnimating ? 'animate-quest-appear' : ''} ${isCompact ? 'p-3' : 'p-5'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`text-center ${isCompact ? 'mb-2' : 'mb-3'}`}>
            <h2 className={`font-bold text-white ${isCompact ? 'text-base' : 'text-lg'}`}>Ежедневные задания</h2>
          </div>
          
          {/* Quests list */}
          <div className={isCompact ? 'space-y-1.5' : 'space-y-2'}>
            {quests.map((quest, index) => (
              <div 
                key={quest.id}
                ref={el => questCardRefs.current[quest.id] = el}
                className={`relative rounded-xl transition-all border ${isCompact ? 'p-2' : 'p-3'} ${
                  showCompletedLabel[quest.id] 
                    ? 'bg-lime-900/30 border-lime-600/40' 
                    : 'bg-slate-700/50 border-slate-600/50'
                }`}
              >
                {/* Quest content */}
                <div className={`flex items-start ${isCompact ? 'gap-1.5' : 'gap-2'}`}>
                  <div className={isCompact ? 'text-base' : 'text-xl'}>
                    {showCompletedLabel[quest.id] ? '✅' : '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold text-white ${isCompact ? 'text-xs' : 'text-sm'} truncate`}>
                        {quest.title}
                      </h3>
                      {!showCompletedLabel[quest.id] && (
                        <div 
                          ref={el => rewardIconRefs.current[quest.id] = el}
                          className={`flex items-center gap-0.5 text-yellow-400 flex-shrink-0 ${isCompact ? 'text-xs' : 'text-sm'} ${hiddenRewardIcons[quest.id] ? 'invisible' : ''}`}
                        >
                          <span>+{quest.reward}</span>
                          <span>⭐</span>
                        </div>
                      )}
                    </div>
                    {!isCompact && (
                      <p className="text-slate-400 text-xs mt-0.5">{quest.description}</p>
                    )}
                    
                    {/* Progress bar - invisible but keeps space when completed */}
                    <div className={`${isCompact ? 'mt-1' : 'mt-2'} ${showCompletedLabel[quest.id] ? 'invisible' : ''}`}>
                      <div className={`flex justify-between mb-0.5 ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
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
                      <div 
                        ref={el => questProgressBarRefs.current[quest.id] = el}
                        className={`bg-slate-600 rounded-full overflow-hidden ${isCompact ? 'h-1.5' : 'h-2'}`}
                      >
                        <div 
                          className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-sky-500 to-sky-400"
                          style={{ width: `${Math.min(((animatedProgress[quest.id] ?? 0) / quest.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Completed label - shown only after stars arrive */}
                {showCompletedLabel[quest.id] && (
                  <div className={`absolute ${isCompact ? 'top-1 right-1' : 'top-2 right-2'}`}>
                    <span className={`text-lime-400 font-bold animate-fade-in ${isCompact ? 'text-[10px]' : 'text-xs'}`}>ВЫПОЛНЕНО</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Empty slots - hide in compact mode */}
            {!isCompact && Array.from({ length: Math.max(0, 3 - quests.length) }).map((_, index) => (
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
          
          {/* Monthly Progress - at the bottom */}
          <div 
            ref={monthlyBarRef}
            className={`bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl border transition-all duration-300 ${isCompact ? 'mt-2 p-2' : 'mt-4 p-3'} ${monthlyBarPulse ? 'scale-[1.02] border-amber-400/60' : 'border-amber-600/30'}`}
          >
            <div className={`flex items-center justify-between ${isCompact ? 'mb-1' : 'mb-2'}`}>
              <div className="flex items-center gap-1.5">
                <span className={isCompact ? 'text-base' : 'text-lg'}>🏆</span>
                <span className={`font-semibold text-amber-200 ${isCompact ? 'text-xs' : 'text-sm'}`}>Месячный бонус</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className={`text-yellow-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>⭐</span>
                <span className={`font-bold text-yellow-300 ${isCompact ? 'text-xs' : 'text-sm'}`}>{monthlyReward}</span>
              </div>
            </div>
            
            {/* Progress bar with overshoot animation */}
            <div className={`relative bg-slate-800/60 rounded-full overflow-hidden border border-amber-700/30 ${isCompact ? 'h-3' : 'h-4'}`}>
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((monthlyProgress / monthlyTarget) * 100 + monthlyOvershoot, 100)}%` 
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span 
                  className={`font-bold text-white drop-shadow-lg transition-all duration-200 ${isCompact ? 'text-[10px]' : 'text-xs'} ${monthlyTextPulse ? 'scale-125 text-amber-300' : ''}`}
                >
                  {monthlyProgress} / {monthlyTarget}
                </span>
              </div>
            </div>
            
            {/* Claim button or status */}
            {monthlyProgress >= monthlyTarget && !monthlyRewardClaimed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMonthlyRewardClaim?.();
                }}
                className={`w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-lg shadow-lg animate-pulse transition-all ${isCompact ? 'mt-1.5 py-1.5 text-xs' : 'mt-2 py-2 text-sm'}`}
              >
                🎁 Забрать награду!
              </button>
            )}
            {monthlyRewardClaimed && (
              <div className={`text-center text-amber-400 font-semibold ${isCompact ? 'mt-1 text-xs' : 'mt-2 text-sm'}`}>
                ✓ Награда получена!
              </div>
            )}
            {monthlyProgress < monthlyTarget && !isCompact && (
              <div className="mt-1 text-center text-xs text-amber-300/70">
                Выполняй задания каждый день
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className={`text-center ${isCompact ? 'mt-2' : 'mt-3'}`}>
            <button
              onClick={onClose}
              className={`bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition-colors ${isCompact ? 'px-4 py-1 text-xs' : 'px-5 py-1.5 text-sm'}`}
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
      
      {/* Flying chip to monthly bar */}
      {flyingChips.map(chip => (
        <QuestFlyingChip
          key={chip.id}
          chip={chip}
          onArrived={() => handleChipArrived(chip)}
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
  
  // All stars are gold colored (no recoloring based on value)
  const starStyle = 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))';
  
  // Render via portal to ensure it's above everything
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      data-flying-element
      className="fixed text-2xl pointer-events-none z-[10000]"
      style={{
        left: star.startX,
        top: star.startY,
        transform: 'translate(-50%, -50%) translateZ(0)',
        filter: starStyle,
        willChange: 'transform, left, top'
      }}
    >
      ⭐
    </div>,
    document.body
  );
}

// Flying chip component for monthly progress - physics-based bounce and fall
function QuestFlyingChip({ chip, onArrived }: { chip: FlyingChip; onArrived: () => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const arrivedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const onArrivedRef = useRef(onArrived);
  const lastTimeRef = useRef<number | null>(null);
  
  // Physics state - now time-based (pixels per second)
  const posRef = useRef({ x: chip.startX, y: chip.startY });
  const velRef = useRef({ x: chip.velocityX * 60, y: chip.velocityY * 60 }); // Convert to per-second
  const rotationRef = useRef(0);
  
  onArrivedRef.current = onArrived;
  
  useEffect(() => {
    setIsVisible(true);
    
    // Physics constants - now per second (not per frame)
    const gravity = 800; // pixels per second squared - fast falling
    const rotationSpeed = 360; // degrees per second - faster rotation
    
    const animate = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Calculate delta time in seconds
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05); // Cap at 50ms to prevent jumps
      lastTimeRef.current = timestamp;
      
      // Apply gravity - time-based
      velRef.current.y += gravity * deltaTime;
      
      // Update position - time-based
      posRef.current.x += velRef.current.x * deltaTime;
      posRef.current.y += velRef.current.y * deltaTime;
      
      // Update rotation - time-based
      rotationRef.current += rotationSpeed * deltaTime;
      
      // Update element position
      elementRef.current.style.left = `${posRef.current.x}px`;
      elementRef.current.style.top = `${posRef.current.y}px`;
      elementRef.current.style.transform = `translate(-50%, -50%) rotate(${rotationRef.current}deg)`;
      
      // Check if reached target Y (monthly bar)
      if (posRef.current.y >= chip.targetY) {
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          elementRef.current.style.display = 'none';
          onArrivedRef.current();
          setIsVisible(false);
        }
        return;
      }
      
      rafRef.current = requestAnimationFrame(animate);
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [chip]);
  
  if (!isVisible) return null;
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      data-flying-element
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: chip.startX,
        top: chip.startY,
        transform: 'translate(-50%, -50%) translateZ(0)',
        width: '10px',
        height: '10px',
        borderRadius: '3px',
        backgroundColor: '#f97316',
        boxShadow: '0 0 6px #f97316, 0 0 12px #ea580c',
        willChange: 'transform, left, top'
      }}
    />,
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
