import React, { useState, useEffect, useRef } from 'react';

interface FlyingStar {
  id: number;
  value: number; // How many stars this icon represents
  // Starting position (center)
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
  scatterDuration: number; // Duration of scatter phase (ms)
  flyDelay: number; // Delay before fly phase starts (after scatter)
  flyDuration: number; // Duration of fly phase (ms)
}

// Max flying star icons
const MAX_FLYING_ICONS = 10;

interface WinScreenProps {
  isVisible: boolean;
  starsEarned: number;
  onComplete: () => void;
  progressBarRef?: React.RefObject<HTMLDivElement>;
  onStarArrived?: (count?: number) => void; // count defaults to 1
}

export function WinScreen({ isVisible, starsEarned, onComplete, progressBarRef, onStarArrived }: WinScreenProps) {
  const [phase, setPhase] = useState<'message' | 'stars' | 'continue'>('message');
  const [flyingStars, setFlyingStars] = useState<FlyingStar[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset state when becoming visible
  useEffect(() => {
    if (isVisible) {
      setPhase('message');
      setFlyingStars([]);
      
      // Auto-advance after 3 seconds if no tap
      messageTimerRef.current = setTimeout(() => {
        startStarsPhase();
      }, 3000);
      
      return () => {
        if (messageTimerRef.current) {
          clearTimeout(messageTimerRef.current);
        }
      };
    }
  }, [isVisible]);
  
  const startStarsPhase = () => {
    if (phase !== 'message') return;
    
    // Clear auto-advance timer
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }
    
    setPhase('stars');
    createFlyingStars();
  };
  
  const createFlyingStars = () => {
    // Get target position - find the star icon in progress bar
    let targetX = window.innerWidth / 2;
    let targetY = 50;
    
    if (progressBarRef?.current) {
      // Find the star icon element inside the progress bar
      const starIcon = progressBarRef.current.querySelector('[data-star-icon]');
      if (starIcon) {
        const rect = starIcon.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      } else {
        // Fallback to progress bar position
        const rect = progressBarRef.current.getBoundingClientRect();
        targetX = rect.left + 20;
        targetY = rect.top + 16;
      }
    }
    
    // Center of screen - starting point for all stars
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    const stars: FlyingStar[] = [];
    const totalStars = starsEarned;
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    // Scatter radius range (how far stars spread from center)
    const minRadius = 20; // minimum distance
    const maxRadius = 60; // maximum distance
    
    // Scatter duration
    const scatterDuration = 500; // 0.5 seconds
    
    for (let i = 0; i < iconCount; i++) {
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      // Evenly distribute stars around a circle with random radius
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3; // slight angle variation
      // Random radius from min to max
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
      
      // Curvature based on position (creates varied arcs)
      const curvature = (Math.random() - 0.5) * 200;
      const controlX = midX + (perpX / len) * curvature;
      const controlY = midY + (perpY / len) * curvature;
      
      // Flight duration - slight variation
      const flyDuration = 400 + Math.random() * 200;
      
      // Delay before flying (after scatter) - sequential
      const flyDelay = i * 80;
      
      stars.push({
        id: i,
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
    
    setFlyingStars(stars);
    
    // After all stars arrive, show continue message
    // scatter (500ms) + max fly delay + max fly duration + buffer
    const maxFlyDelay = iconCount * 80;
    const totalDuration = scatterDuration + maxFlyDelay + 600 + 300;
    setTimeout(() => {
      setPhase('continue');
    }, totalDuration);
  };
  
  const handleStarArrived = (star: FlyingStar) => {
    onStarArrived?.(star.value);
  };
  
  const handleClick = () => {
    if (phase === 'message') {
      // Tap to skip to stars immediately
      startStarsPhase();
    } else if (phase === 'continue') {
      onComplete();
    }
    // During 'stars' phase, do nothing - let stars fly
  };
  
  if (!isVisible) return null;
  
  // Determine background based on phase
  const getBackground = () => {
    if (phase === 'message') {
      return 'rgba(0, 0, 0, 0.85)';
    }
    // Transparent for stars and continue phases (but still captures clicks)
    return 'transparent';
  };
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ backgroundColor: getBackground() }}
      onClick={handleClick}
    >
      {/* Message phase */}
      {phase === 'message' && (
        <div className="text-center px-8 animate-fade-in">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ура!
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-4">
            Мы всё ближе к цели!
          </p>
          <div className="text-3xl font-bold text-yellow-300" style={{ textShadow: '0 0 15px rgba(250, 204, 21, 0.6)' }}>
            +{starsEarned} ⭐
          </div>
        </div>
      )}
      
      {/* Stars flying phase - no text, just flying stars */}
      {phase === 'stars' && (
        <div className="pointer-events-none" />
      )}
      
      {/* Flying stars */}
      {flyingStars.map(star => (
        <FlyingStarComponent
          key={star.id}
          star={star}
          onArrived={handleStarArrived}
        />
      ))}
      
      {/* Continue phase */}
      {phase === 'continue' && (
        <div className="text-center animate-fade-in">
          <p className="text-xl font-bold text-white animate-pulse" style={{ textShadow: '0 0 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)' }}>
            Нажми, чтобы продолжить
          </p>
        </div>
      )}
    </div>
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

// Flying star component - two-phase animation
// Phase 1: Scatter from center outward (with deceleration)
// Phase 2: Fly to target (with acceleration)
function FlyingStarComponent({ star, onArrived }: { star: FlyingStar; onArrived: (star: FlyingStar) => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const arrivedRef = useRef(false);
  const phaseRef = useRef<'scatter' | 'waiting' | 'fly'>('scatter');
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
        phaseRef.current = 'waiting';
        
        flyDelayTimerRef.current = setTimeout(() => {
          phaseRef.current = 'fly';
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
      className="fixed text-2xl pointer-events-none z-[9999]"
      style={{
        left: star.startX,
        top: star.startY,
        transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))'
      }}
    >
      ⭐
    </div>
  );
}

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
`;

if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}

