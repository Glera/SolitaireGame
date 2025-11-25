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
    
    // Debug info commented out for performance
    // Uncomment to debug animation speed issues
    /*
    import('../DebugPopup').then(({ showDebugInfo }) => {
      showDebugInfo(
        `Card Animation: ${card.suit}-${card.rank}`,
        startPosition,
        'Card Animation',
        {
          card: `${card.suit}-${card.rank}`,
          distance: {
            screen: `${Math.round(distance)}px`,
            game: `${Math.round(adjustedDistance)}px`,
          },
          duration: {
            calculated: `${Math.round(duration)}ms`,
            clamped: `${Math.round(clampedDuration)}ms`,
            wasClamped: duration < 80,
          },
          scale: scale.toFixed(3),
          speed: {
            screen: `${Math.round(actualScreenSpeed)} px/s`,
            game: `${Math.round(actualGameSpeed)} px/s`,
            target: '2000 px/s (game)',
          },
          positions: {
            from: `(${Math.round(startPosition.x)}, ${Math.round(startPosition.y)})`,
            to: `(${Math.round(endPosition.x)}, ${Math.round(endPosition.y)})`,
          }
        }
      );
    });
    */
    
    // Console logs disabled for mobile performance
    // Uncomment for debugging:
    /*
    console.log(`🎬 CardAnimation START: card=${card.suit}-${card.rank}`);
    console.log(`   📏 Distance: ${Math.round(distance)}px (screen) / ${Math.round(adjustedDistance)}px (game)`);
    console.log(`   ⏱️  Duration: ${Math.round(duration)}ms → clamped to ${Math.round(clampedDuration)}ms`);
    console.log(`   🎯 Scale: ${scale.toFixed(3)}x`);
    console.log(`   🚀 Speed: ${Math.round(actualScreenSpeed)} px/s (screen) / ${Math.round(actualGameSpeed)} px/s (game)`);
    console.log(`   📍 From: (${Math.round(startPosition.x)}, ${Math.round(startPosition.y)}) → To: (${Math.round(endPosition.x)}, ${Math.round(endPosition.y)})`);
    */
    
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
      if (elementRef.current) {
        elementRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scale})`;
      }
      
      // At 80%, mark animation as near complete so cards can start appearing
      // This gives 20% of animation time for smooth transition
      if (progress >= 0.80 && !nearCompleteCalledRef.current) {
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
        transform: `translate(${startPosition.x}px, ${startPosition.y}px) scale(${scale})`,
        transformOrigin: 'top left',
        willChange: 'transform'
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