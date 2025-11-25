import React, { useEffect, useRef } from 'react';
import { Suit } from '../../lib/solitaire/types';

interface FlyingSuitIconProps {
  suit: Suit;
  startPosition: { x: number; y: number };
  onComplete: () => void;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#ef4444',
  diamonds: '#ef4444',
  clubs: '#1f2937',
  spades: '#1f2937',
};

export function FlyingSuitIcon({ suit, startPosition, onComplete }: FlyingSuitIconProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Random trajectory parameters (computed once on mount)
  const trajectoryRef = useRef({
    // Random horizontal drift (-60 to +60 pixels)
    horizontalDrift: (Math.random() - 0.5) * 120,
    // Random vertical travel (150-250 pixels up)
    verticalTravel: 150 + Math.random() * 100,
    // Random rotation (-180 to +180 degrees)
    rotation: (Math.random() - 0.5) * 360,
    // Random scale variation (0.8 to 1.2)
    startScale: 0.8 + Math.random() * 0.4,
    // Animation duration (600-900ms)
    duration: 600 + Math.random() * 300,
  });
  
  useEffect(() => {
    const trajectory = trajectoryRef.current;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / trajectory.duration, 1);
      
      // Easing: start fast, slow down at the end
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // Calculate current position
      const x = startPosition.x + trajectory.horizontalDrift * easeOut;
      const y = startPosition.y - trajectory.verticalTravel * easeOut;
      
      // Scale: start at random, shrink to 0
      const scale = trajectory.startScale * (1 - progress);
      
      // Rotation
      const rotation = trajectory.rotation * progress;
      
      // Opacity: full at start, fade out in last 30%
      const opacity = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
      
      if (elementRef.current) {
        elementRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
        elementRef.current.style.opacity = String(opacity);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    
    const animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [startPosition, onComplete]);
  
  return (
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[9999]"
      style={{
        transform: `translate(${startPosition.x}px, ${startPosition.y}px)`,
        color: SUIT_COLORS[suit],
        fontSize: '24px',
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        willChange: 'transform, opacity',
      }}
    >
      {SUIT_SYMBOLS[suit]}
    </div>
  );
}
