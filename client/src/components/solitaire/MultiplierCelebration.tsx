/**
 * MultiplierCelebration Component
 * 
 * Shows animated multiplier text (x2, x3, etc.) with confetti
 * when stars are awarded during win streak
 */

import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';

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
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
];

interface MultiplierCelebrationProps {
  multiplier: number;        // Current multiplier being shown (2, 3, 4, 5)
  isVisible: boolean;
  onComplete: () => void;    // Called when animation finishes
}

export function MultiplierCelebration({ multiplier, isVisible, onComplete }: MultiplierCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [textScale, setTextScale] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const animationRef = useRef<number>();
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isVisible) {
      setConfetti([]);
      setTextScale(0);
      setTextOpacity(0);
      completedRef.current = false;
      return;
    }

    completedRef.current = false;

    // Generate confetti particles
    const particles: ConfettiParticle[] = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + Math.random() * 0.5;
      const speed = 8 + Math.random() * 12;
      particles.push({
        id: i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5, // Initial upward bias
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
        size: 8 + Math.random() * 8,
      });
    }
    setConfetti(particles);

    // Animate text scale
    setTextScale(0);
    setTextOpacity(1);
    
    // Pop in animation
    setTimeout(() => setTextScale(1.3), 50);
    setTimeout(() => setTextScale(1), 200);
    
    // Fade out and complete
    setTimeout(() => {
      setTextOpacity(0);
      setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }, 300);
    }, 800);

    // Animate confetti
    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 1500) {
        setConfetti([]);
        return;
      }

      setConfetti(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.5, // Gravity
        vx: p.vx * 0.98, // Air resistance
        rotation: p.rotation + p.rotationSpeed,
      })).filter(p => p.y < window.innerHeight + 50));

      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, multiplier, onComplete]);

  if (!isVisible) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Confetti particles */}
      {confetti.map(p => (
        <div
          key={p.id}
          className="absolute"
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
      
      {/* Multiplier text */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: textOpacity,
          transition: 'opacity 0.3s ease-out',
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
          x{multiplier}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Hook to manage sequential multiplier celebrations
 */
export interface MultiplierCelebrationState {
  currentMultiplier: number | null;
  isShowing: boolean;
  startCelebration: (multiplier: number, onAllComplete: () => void) => void;
  handleComplete: () => void;  // Call when single celebration animation ends
}

export function useMultiplierCelebration(): MultiplierCelebrationState {
  const [queue, setQueue] = useState<number[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const processNext = () => {
    setQueue(prev => {
      if (prev.length === 0) {
        setCurrentMultiplier(null);
        if (onCompleteRef.current) {
          onCompleteRef.current();
          onCompleteRef.current = null;
        }
        return prev;
      }
      
      const [next, ...rest] = prev;
      setCurrentMultiplier(next);
      return rest;
    });
  };

  const startCelebration = (multiplier: number, onAllComplete: () => void) => {
    if (multiplier <= 1) {
      // No celebration for x1
      onAllComplete();
      return;
    }

    // Build queue: x2, x3, x4, x5 up to multiplier
    const celebrations: number[] = [];
    for (let i = 2; i <= multiplier; i++) {
      celebrations.push(i);
    }

    onCompleteRef.current = onAllComplete;
    setQueue(celebrations.slice(1)); // Rest of queue
    setCurrentMultiplier(celebrations[0]); // Start with first
  };

  const handleComplete = () => {
    // Small delay between celebrations
    setTimeout(processNext, 200);
  };

  return {
    currentMultiplier,
    isShowing: currentMultiplier !== null,
    startCelebration,
    handleComplete,
  };
}
