import React, { useEffect, useState, useRef } from 'react';
import { Card as CardType } from '../../lib/solitaire/types';
import { Card } from './Card';
import { createPortal } from 'react-dom';
import { useGameScaleContext } from '../../contexts/GameScaleContext';

interface CardAnimationProps {
  card: CardType;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  onComplete: () => void;
  speed?: number; // pixels per second
}

export function CardAnimation({ 
  card, 
  startPosition, 
  endPosition, 
  onComplete,
  speed = 1500 // Default speed: 1500 pixels per second (increased by 1.5x)
}: CardAnimationProps) {
  const [position, setPosition] = useState(startPosition);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const { scale } = useGameScaleContext();
  
  useEffect(() => {
    // Calculate distance and duration
    const dx = endPosition.x - startPosition.x;
    const dy = endPosition.y - startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = (distance / speed) * 1000; // Convert to milliseconds
    
    // Start animation
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easeInOut for smoother animation
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const newX = startPosition.x + (dx * easeProgress);
      const newY = startPosition.y + (dy * easeProgress);
      
      setPosition({ x: newX, y: newY });
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [startPosition, endPosition, onComplete, speed]);
  
  return createPortal(
    <div 
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        pointerEvents: 'none',
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }}
    >
      <Card card={card} />
    </div>,
    document.body
  );
}