/**
 * WinCelebration Component
 * 
 * Shows sequential celebration waves for win streak:
 * - Wave 1: x1 + confetti + stars flying
 * - Wave 2: x2 + confetti + stars flying
 * - Wave N: xN + confetti + stars flying
 * 
 * Number of waves = multiplier (streak + 1, max 5)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

// ============ CONFETTI ============
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  size: number;
}

const CONFETTI_COLORS = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
];

// ============ FLYING STAR ============
interface FlyingStar {
  id: number;
  value: number;
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
}

const MAX_FLYING_ICONS = 8;
const STARS_PER_WAVE = 10; // Base stars per wave

// ============ MAIN COMPONENT ============
interface WinCelebrationProps {
  isVisible: boolean;
  multiplier: number; // 1-5, determines number of waves
  baseStars: number; // Stars per wave
  progressBarRef?: React.RefObject<HTMLDivElement>;
  onStarArrived?: (count?: number) => void;
  onComplete: () => void;
}

type Phase = 'idle' | 'showing-multiplier' | 'stars-flying' | 'waiting' | 'complete';

export function WinCelebration({
  isVisible,
  multiplier,
  baseStars,
  progressBarRef,
  onStarArrived,
  onComplete,
}: WinCelebrationProps) {
  const [currentWave, setCurrentWave] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [flyingStars, setFlyingStars] = useState<FlyingStar[]>([]);
  const [textScale, setTextScale] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const [backdropHidden, setBackdropHidden] = useState(false);
  
  const confettiAnimRef = useRef<number>();
  const arrivedCountRef = useRef(0);
  const totalStarsInWaveRef = useRef(0);
  
  // Track how many stars have been awarded so far
  const awardedStarsRef = useRef(0);
  
  // Track if we're in skip mode (let current animations finish)
  const skippingRef = useRef(false);
  // Stars already flying when skip was pressed
  const starsInFlightRef = useRef(0);
  
  // Get target position for stars
  const getTargetPosition = useCallback(() => {
    let targetX = window.innerWidth / 2;
    let targetY = 50;
    
    if (progressBarRef?.current) {
      const starIcon = progressBarRef.current.querySelector('[data-star-icon]');
      if (starIcon) {
        const rect = starIcon.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      } else {
        const rect = progressBarRef.current.getBoundingClientRect();
        targetX = rect.left + 20;
        targetY = rect.top + 16;
      }
    }
    return { targetX, targetY };
  }, [progressBarRef]);
  
  // Ref to track if global confetti animation is running
  const confettiRunningRef = useRef(false);
  const confettiIdCounterRef = useRef(0);
  
  // Global confetti animation - runs continuously while there are particles
  const runConfettiAnimation = useCallback(() => {
    if (confettiRunningRef.current) return; // Already running
    confettiRunningRef.current = true;
    
    const animate = () => {
      setConfetti(prev => {
        if (prev.length === 0) {
          confettiRunningRef.current = false;
          return prev;
        }
        
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.25, // Lower gravity for floatier feel
          vx: p.vx * 0.99, // Less air resistance
          rotation: p.rotation + p.rotationSpeed,
        })).filter(p => p.y < window.innerHeight + 50);
        
        if (updated.length === 0) {
          confettiRunningRef.current = false;
        }
        
        return updated;
      });
      
      if (confettiRunningRef.current) {
        confettiAnimRef.current = requestAnimationFrame(animate);
      }
    };
    
    confettiAnimRef.current = requestAnimationFrame(animate);
  }, []);
  
  // Create confetti explosion - adds particles to existing ones
  const createConfetti = useCallback(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const baseId = confettiIdCounterRef.current;
    confettiIdCounterRef.current += 50;
    
    const newParticles: ConfettiParticle[] = [];
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + Math.random() * 0.5;
      const speed = 4 + Math.random() * 6; // Slower initial speed for smoother feel
      newParticles.push({
        id: baseId + i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3, // Less upward bias
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10, // Slower rotation
        size: 6 + Math.random() * 6,
      });
    }
    
    // Add new particles to existing ones
    setConfetti(prev => [...prev, ...newParticles]);
    
    // Make sure animation is running
    runConfettiAnimation();
  }, [runConfettiAnimation]);
  
  // Star ID counter for unique IDs across waves
  const starIdCounterRef = useRef(0);
  
  // Create flying stars for current wave
  const createFlyingStars = useCallback(() => {
    const { targetX, targetY } = getTargetPosition();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    const stars: FlyingStar[] = [];
    const totalStars = baseStars;
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    const minRadius = 30;
    const maxRadius = 80;
    const scatterDuration = 400;
    
    const baseId = starIdCounterRef.current;
    starIdCounterRef.current += iconCount;
    
    for (let i = 0; i < iconCount; i++) {
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = centerX + Math.cos(angle) * radius;
      const scatterY = centerY + Math.sin(angle) * radius;
      
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
      
      const flyDuration = 350 + Math.random() * 150;
      const flyDelay = i * 60;
      
      stars.push({
        id: baseId + i,
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
        flyDuration,
      });
    }
    
    arrivedCountRef.current = 0;
    totalStarsInWaveRef.current = iconCount;
    // Add new stars to existing ones (don't replace!)
    setFlyingStars(prev => [...prev, ...stars]);
  }, [baseStars, getTargetPosition]);
  
  // Track total arrived stars across all waves for completion
  const totalArrivedRef = useRef(0);
  const totalExpectedRef = useRef(0);
  
  // Start a wave
  const startWave = useCallback((waveNumber: number) => {
    // Don't start new waves if skipping
    if (skippingRef.current) return;
    
    setCurrentWave(waveNumber);
    setPhase('stars-flying');
    
    // Show multiplier text with animation
    setTextScale(0);
    setTextOpacity(1);
    
    // All at once: confetti + stars + xN animation
    createConfetti();
    createFlyingStars();
    
    setTimeout(() => setTextScale(1.3), 50);
    setTimeout(() => setTextScale(1), 150);
    
    // Fade out xN text after a moment
    setTimeout(() => {
      if (skippingRef.current) return;
      setTextOpacity(0);
    }, 500);
    
    // Start next wave (with delay for stars to fly)
    if (waveNumber < multiplier) {
      setTimeout(() => {
        if (!skippingRef.current) {
          startWave(waveNumber + 1);
        }
      }, 1000); // Start next wave 1000ms after this wave starts
    }
  }, [createConfetti, createFlyingStars, multiplier]);
  
  // Handle star arrival
  const handleStarArrived = useCallback((star: FlyingStar) => {
    onStarArrived?.(star.value);
    awardedStarsRef.current += star.value;
    totalArrivedRef.current++;
    
    // If skipping, check if all in-flight stars arrived
    if (skippingRef.current) {
      starsInFlightRef.current--;
      if (starsInFlightRef.current <= 0) {
        // All current stars arrived, close
        onComplete();
      }
      return;
    }
    
    // Check if ALL stars from ALL waves arrived
    if (totalArrivedRef.current >= totalExpectedRef.current && currentWave === multiplier) {
      // All waves complete, all stars arrived - auto close
      setTimeout(() => {
        onComplete();
      }, 200);
    }
  }, [currentWave, multiplier, onStarArrived, onComplete]);
  
  // Skip animation - hide backdrop, let current stars fly, award remaining instantly
  const skipAnimation = useCallback(() => {
    if (skippingRef.current) return; // Already skipping
    skippingRef.current = true;
    
    // Hide backdrop immediately
    setBackdropHidden(true);
    setTextOpacity(0);
    
    // Count stars currently in flight
    starsInFlightRef.current = flyingStars.length;
    
    // Calculate total stars for all waves
    const totalStarsToAward = baseStars * multiplier;
    
    // Stars that will be awarded by flying stars when they arrive
    let starsFromFlyingIcons = 0;
    flyingStars.forEach(s => {
      starsFromFlyingIcons += s.value;
    });
    
    // Calculate remaining stars (excluding those that will arrive from flying icons)
    const remainingStars = totalStarsToAward - awardedStarsRef.current - starsFromFlyingIcons;
    
    if (remainingStars > 0) {
      // Award remaining stars instantly (from future waves that won't start)
      onStarArrived?.(remainingStars);
      awardedStarsRef.current += remainingStars;
    }
    
    // If no stars in flight, close immediately
    if (starsInFlightRef.current <= 0) {
      onComplete();
    }
    // Otherwise, handleStarArrived will close when all arrive
  }, [baseStars, multiplier, onStarArrived, onComplete, flyingStars]);
  
  // Initialize when becoming visible
  useEffect(() => {
    if (isVisible && phase === 'idle') {
      awardedStarsRef.current = 0; // Reset awarded stars counter
      totalArrivedRef.current = 0; // Reset total arrived counter
      // Calculate total expected stars (icons per wave * number of waves)
      const iconsPerWave = Math.min(baseStars, MAX_FLYING_ICONS);
      totalExpectedRef.current = iconsPerWave * multiplier;
      startWave(1);
    }
    
    if (!isVisible) {
      setPhase('idle');
      setCurrentWave(1);
      setConfetti([]);
      setFlyingStars([]);
      setTextScale(0);
      setTextOpacity(0);
      setBackdropHidden(false);
      arrivedCountRef.current = 0;
      awardedStarsRef.current = 0;
      totalArrivedRef.current = 0;
      totalExpectedRef.current = 0;
      confettiRunningRef.current = false;
      confettiIdCounterRef.current = 0;
      skippingRef.current = false;
      starsInFlightRef.current = 0;
      starIdCounterRef.current = 0;
      
      if (confettiAnimRef.current) {
        cancelAnimationFrame(confettiAnimRef.current);
      }
    }
  }, [isVisible, phase, startWave, baseStars, multiplier]);
  
  // Handle click - skip animation
  const handleClick = useCallback(() => {
    if (phase === 'showing-multiplier' || phase === 'stars-flying') {
      // Skip animation and award remaining stars
      skipAnimation();
    }
  }, [phase, skipAnimation]);
  
  if (!isVisible) return null;
  
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ 
        backgroundColor: backdropHidden ? 'transparent' : 'rgba(0,0,0,0.7)',
        pointerEvents: backdropHidden ? 'none' : 'auto',
        transition: 'background-color 0.2s ease-out',
      }}
      onClick={handleClick}
    >
      {/* Confetti particles */}
      {confetti.map(p => (
        <div
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: '2px',
          }}
        />
      ))}
      
      {/* Multiplier text - z-index above stars */}
      {(phase === 'showing-multiplier' || phase === 'stars-flying') && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: textOpacity,
            transition: 'opacity 0.2s ease-out',
            zIndex: 10000, // Above flying stars
          }}
        >
          <div
            className="text-8xl font-black"
            style={{
              transform: `scale(${textScale})`,
              transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
              textShadow: '0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,215,0,0.5), 0 4px 8px rgba(0,0,0,0.5)',
              background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            x{currentWave}
          </div>
        </div>
      )}
      
      {/* Skip hint */}
      {phase !== 'complete' && !backdropHidden && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center">
          <div className="text-white/80 text-sm animate-pulse">
            Нажми чтобы ускорить
          </div>
        </div>
      )}
      
      {/* Flying stars */}
      {flyingStars.map(star => (
        <FlyingStarComponent
          key={star.id}
          star={star}
          onArrived={handleStarArrived}
        />
      ))}
      
    </div>,
    document.body
  );
}

// ============ FLYING STAR COMPONENT ============
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

function FlyingStarComponent({ star, onArrived }: { star: FlyingStar; onArrived: (star: FlyingStar) => void }) {
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
          onArrivedRef.current(star);
          setIsVisible(false);
        }
      }
    };
    
    rafRef.current = requestAnimationFrame(animateScatter);
    
    return () => {
      if (flyDelayTimerRef.current) clearTimeout(flyDelayTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
