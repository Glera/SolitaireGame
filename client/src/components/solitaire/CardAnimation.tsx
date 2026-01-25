import React, { useEffect, useState, useRef } from 'react';
import { Card as CardType } from '../../lib/solitaire/types';
import { Card } from './Card';
import { createPortal } from 'react-dom';
import { useGameScaleContext } from '../../contexts/GameScaleContext';
import { useSolitaire } from '../../lib/stores/useSolitaire';

interface CardAnimationProps {
  card: CardType;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  onComplete: () => void;
  speed?: number; // Fixed duration in milliseconds (not actual speed)
  stackCards?: CardType[]; // Optional: all cards in the stack for multi-card animation
}

export function CardAnimation({ 
  card, 
  startPosition, 
  endPosition, 
  onComplete,
  speed = 200, // Fixed duration in milliseconds (not speed anymore)
  stackCards // If provided, render the whole stack
}: CardAnimationProps) {
  const [position, setPosition] = useState(startPosition);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const nearCompleteCalledRef = useRef<boolean>(false);
  const elementRef = useRef<HTMLDivElement>(null); // Reference to DOM element for direct transform updates
  const { scale } = useGameScaleContext();
  const { setAnimationNearComplete } = useSolitaire();
  
  // Determine if we're on mobile for card spacing
  const isMobile = window.innerWidth <= 768;
  
  useEffect(() => {
    // Calculate delta for animation
    const dx = endPosition.x - startPosition.x;
    const dy = endPosition.y - startPosition.y;
    
    // Fixed duration for all card movements (regardless of distance)
    const FIXED_DURATION = 150; // 150ms for all moves
    
    // Use custom speed if provided, otherwise use fixed duration
    const clampedDuration = speed !== 200 ? speed : FIXED_DURATION;
    
    // Start animation
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / clampedDuration, 1);
      
      // Use linear animation for constant speed
      const newX = startPosition.x + (dx * progress);
      const newY = startPosition.y + (dy * progress);
      
      // OPTIMIZATION: Update position directly via transform instead of state
      // This avoids React re-renders on every frame, massively improving mobile performance
      // Using translate3d for GPU acceleration in WebView
      if (elementRef.current) {
        elementRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0) scale(${scale})`;
      }
      
      // At 95%, mark animation as near complete so cards can start appearing
      // This minimizes position difference between flying and static card
      if (progress >= 0.95 && !nearCompleteCalledRef.current) {
        // console.log(`🎬 Animation at ${Math.round(progress * 100)}% - marking near complete`);
        nearCompleteCalledRef.current = true;
        setAnimationNearComplete();
      }
      
      // Complete at 100%
      if (progress >= 1) {
        // console.log(`🎬 Animation completing at ${Math.round(progress * 100)}%`);
        onComplete();
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [startPosition, endPosition, onComplete, scale]);
  
  return createPortal(
    <div 
      ref={elementRef}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        transform: `translate3d(${startPosition.x}px, ${startPosition.y}px, 0) scale(${scale})`,
        transformOrigin: 'top left',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {stackCards && stackCards.length > 1 ? (
        // Render stack of cards
        <div style={{ position: 'relative' }}>
          {stackCards.map((stackCard, index) => {
            // Calculate vertical offset for each card in the stack
            // Use smart spacing: less for face-down, more for face-up
            let cumulativeOffset = 0;
            for (let i = 0; i < index; i++) {
              const prevCard = stackCards[i];
              if (isMobile) {
                cumulativeOffset += prevCard.faceUp ? 52 : 12; // Mobile spacing (updated to 52px)
              } else {
                cumulativeOffset += prevCard.faceUp ? 48 : 8; // Desktop spacing (updated to 48px)
              }
            }
            
            return (
              <div
                key={stackCard.id}
                style={{
                  position: 'absolute',
                  top: `${cumulativeOffset}px`,
                  left: 0
                }}
              >
                <Card card={stackCard} />
              </div>
            );
          })}
        </div>
      ) : (
        // Single card
        <Card card={card} />
      )}
    </div>,
    document.body
  );
}