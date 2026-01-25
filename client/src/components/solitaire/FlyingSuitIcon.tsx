import React, { useEffect, useRef } from 'react';
import { Suit } from '../../lib/solitaire/types';

interface FlyingSuitIconProps {
  suit: Suit;
  startPosition: { x: number; y: number };
  direction: 'left' | 'right';
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

export function FlyingSuitIcon({ suit, startPosition, direction, onComplete }: FlyingSuitIconProps) {
  console.log(`🚀 FlyingSuitIcon mounted: ${suit} at (${Math.round(startPosition.x)}, ${Math.round(startPosition.y)}) dir=${direction}`);
  
  const elementRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Random trajectory parameters (computed once on mount) - PHYSICS-BASED falling
  // Direction determines which way the icon flies horizontally
  const baseHorizontalSpeed = 60 + Math.random() * 80; // 60-140 px/s
  const trajectoryRef = useRef({
    // Horizontal velocity based on direction (left = negative, right = positive)
    horizontalVelocity: direction === 'left' ? -baseHorizontalSpeed : baseHorizontalSpeed,
    // Initial upward velocity (small jump before falling) - 30 to 80 px
    initialUpwardVelocity: -(30 + Math.random() * 50),
    // Gravity (pixels per second²)
    gravity: 400 + Math.random() * 200,
    // Random rotation speed (-360 to +360 degrees per second)
    rotationSpeed: (Math.random() - 0.5) * 720,
    // Random scale variation (0.8 to 1.2)
    startScale: 0.8 + Math.random() * 0.4,
    // Animation duration (800-1200ms)
    duration: 800 + Math.random() * 400,
  });
  
  useEffect(() => {
    const trajectory = trajectoryRef.current;
    let frameCount = 0;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        console.log(`🎬 FlyingSuitIcon animation started for ${suit}`);
      }
      
      frameCount++;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / trajectory.duration, 1);
      const timeSeconds = elapsed / 1000;
      
      // Log first few frames
      if (frameCount <= 3) {
        console.log(`🎬 Frame ${frameCount}: progress=${progress.toFixed(2)}, time=${timeSeconds.toFixed(3)}s`);
      }
      
      // Physics-based parabolic motion (like falling shards)
      // x = x0 + vx * t
      const x = startPosition.x + trajectory.horizontalVelocity * timeSeconds;
      // y = y0 + vy * t + 0.5 * g * t² (parabola - small jump then fall)
      const y = startPosition.y + 
        trajectory.initialUpwardVelocity * timeSeconds + 
        0.5 * trajectory.gravity * timeSeconds * timeSeconds;
      
      // Scale: start at random, shrink to 0 (keep this effect!)
      const scale = trajectory.startScale * (1 - progress);
      
      // Rotation accelerates as it falls
      const rotation = trajectory.rotationSpeed * timeSeconds;
      
      // Opacity: full at start, fade out in last 30%
      const opacity = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
      
      if (elementRef.current) {
        // Log first frame position
        if (frameCount === 1) {
          console.log(`📍 First frame position: x=${Math.round(x)}, y=${Math.round(y)}, scale=${scale.toFixed(2)}`);
        }
        // Using translate3d for GPU acceleration in WebView
        elementRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotation}deg)`;
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
        top: 0,
        left: 0,
        transform: `translate3d(${startPosition.x}px, ${startPosition.y}px, 0)`,
        color: SUIT_COLORS[suit],
        fontSize: '24px',
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      {SUIT_SYMBOLS[suit]}
    </div>
  );
}
