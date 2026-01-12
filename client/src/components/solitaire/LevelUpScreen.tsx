import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';

interface FlyingStar {
  id: number;
  value: number; // How many stars this icon represents
  // Starting position (center of reward badge)
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

interface LevelUpScreenProps {
  isVisible: boolean;
  newLevel: number;
  starsReward: number;
  onComplete: () => void;
  progressBarRef: React.RefObject<HTMLDivElement>;
  onStarArrived?: (count?: number) => void; // count defaults to 1
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

export const LevelUpScreen: React.FC<LevelUpScreenProps> = ({
  isVisible,
  newLevel,
  starsReward,
  onComplete,
  progressBarRef,
  onStarArrived
}) => {
  const [flyingStars, setFlyingStars] = useState<FlyingStar[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [starsLaunched, setStarsLaunched] = useState(false);
  const [rewardHidden, setRewardHidden] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const rewardBadgeRef = useRef<HTMLDivElement>(null);
  const starsArrivedRef = useRef(0);
  const expectedStarsRef = useRef(0);

  // Show content with delay for entrance animation
  useEffect(() => {
    if (isVisible) {
      setShowContent(false);
      setStarsLaunched(false);
      setRewardHidden(false);
      setCanClose(false);
      starsArrivedRef.current = 0;
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
      setStarsLaunched(false);
      setRewardHidden(false);
      setCanClose(false);
      setFlyingStars([]);
    }
  }, [isVisible]);

  // Launch stars after content is shown
  useEffect(() => {
    if (showContent && !starsLaunched && rewardBadgeRef.current && progressBarRef.current) {
      const timer = setTimeout(() => {
        launchStars();
        setStarsLaunched(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [showContent, starsLaunched]);

  const launchStars = () => {
    if (!rewardBadgeRef.current || !progressBarRef.current) return;

    // Hide reward badge when stars launch
    setRewardHidden(true);

    // Start from the reward badge center
    const rewardRect = rewardBadgeRef.current.getBoundingClientRect();
    const startX = rewardRect.left + rewardRect.width / 2;
    const startY = rewardRect.top + rewardRect.height / 2;

    // Find the star icon in the progress bar
    const starIcon = progressBarRef.current.querySelector('[data-star-icon]');
    let targetX: number, targetY: number;
    
    if (starIcon) {
      const starRect = starIcon.getBoundingClientRect();
      targetX = starRect.left + starRect.width / 2;
      targetY = starRect.top + starRect.height / 2;
    } else {
      const barRect = progressBarRef.current.getBoundingClientRect();
      targetX = barRect.left + 20;
      targetY = barRect.top + barRect.height / 2;
    }

    // Create flying stars with two-phase animation (with limit)
    const totalStars = starsReward;
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    expectedStarsRef.current = iconCount;
    
    const scatterDuration = 400; // 0.4 seconds scatter
    const minRadius = 30;
    const maxRadius = 70;
    
    const stars: FlyingStar[] = [];
    
    for (let i = 0; i < iconCount; i++) {
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      // Evenly distribute stars around a circle with random radius
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = startX + Math.cos(angle) * radius;
      const scatterY = startY + Math.sin(angle) * radius;
      
      // Calculate bezier control point for flight phase
      const midX = (scatterX + targetX) / 2;
      const midY = (scatterY + targetY) / 2;
      
      const dx = targetX - scatterX;
      const dy = targetY - scatterY;
      const perpX = -dy;
      const perpY = dx;
      const len = Math.sqrt(perpX * perpX + perpY * perpY);
      
      // Curvature based on position (creates varied arcs)
      const curvature = (Math.random() - 0.5) * 150;
      const controlX = midX + (perpX / len) * curvature;
      const controlY = midY + (perpY / len) * curvature;
      
      // Flight duration - slight variation
      const flyDuration = 400 + Math.random() * 200;
      
      // Delay before flying (after scatter) - sequential
      const flyDelay = i * 80;
      
      stars.push({
        id: i,
        value,
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
        flyDuration
      });
    }

    setFlyingStars(stars);
  };

  const handleStarArrival = (star: FlyingStar) => {
    starsArrivedRef.current++;
    onStarArrived?.(star.value);
    
    // When all stars have arrived, allow closing
    if (starsArrivedRef.current >= expectedStarsRef.current) {
      setCanClose(true);
      // Auto-close after a brief delay
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };

  if (!isVisible) return null;

  return ReactDOM.createPortal(
      <div 
        className="fixed inset-0 z-[10000] flex items-center justify-center"
        onClick={canClose ? onComplete : undefined}
      >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 transition-opacity duration-300"
        style={{ opacity: showContent ? 1 : 0 }}
      />
      
      {/* Content */}
      <div 
        className="relative z-10 flex flex-col items-center transition-all duration-500"
        style={{
          opacity: showContent ? 1 : 0,
          transform: showContent ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)'
        }}
      >
        {/* Level badge with glow */}
        <div className="relative mb-6">
          {/* Glow effect */}
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%)',
              transform: 'scale(2)',
              filter: 'blur(20px)'
            }}
          />
          
          {/* Level circle */}
          <div 
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
              boxShadow: '0 0 40px rgba(168, 85, 247, 0.8), 0 0 80px rgba(236, 72, 153, 0.4)'
            }}
          >
            <span 
              className="text-white font-bold text-5xl"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
            >
              {newLevel}
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 
          className="text-4xl font-bold text-white mb-2"
          style={{ textShadow: '0 2px 20px rgba(168, 85, 247, 0.8)' }}
        >
          Новый уровень!
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl text-purple-200 mb-4">
          Уровень {newLevel} достигнут
        </p>
        
        {/* Reward */}
        <div 
          ref={rewardBadgeRef}
          className="flex items-center gap-2 px-6 py-3 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.2) 0%, rgba(251, 191, 36, 0.3) 100%)',
            border: '2px solid rgba(250, 204, 21, 0.5)',
            visibility: rewardHidden ? 'hidden' : 'visible'
          }}
        >
          <span className="text-2xl">⭐</span>
          <span className="text-yellow-300 font-bold text-2xl">+{starsReward}</span>
        </div>
      </div>

      {/* Flying stars */}
      {flyingStars.map(star => (
        <FlyingStarComponent
          key={star.id}
          star={star}
          onArrived={handleStarArrival}
        />
      ))}
    </div>,
    document.body
  );
};

// Flying star component - two-phase animation
function FlyingStarComponent({ star, onArrived }: { star: FlyingStar; onArrived: (star: FlyingStar) => void }) {
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
          onArrivedRef.current(star);
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
  
  return (
    <div
      ref={elementRef}
      className="fixed text-2xl pointer-events-none z-[10001]"
      style={{
        left: star.startX,
        top: star.startY,
        transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.8))'
      }}
    >
      ⭐
    </div>
  );
}
