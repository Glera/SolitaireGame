import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

interface FlyingKeyDropProps {
  id: number;
  cardId: string;
  targetX: number;
  targetY: number;
  onComplete: () => void;
}

// Function to trigger pulse/scale effect on a card when key lands
function triggerCardPulse(cardId: string) {
  const cardEl = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
  if (cardEl) {
    cardEl.classList.add('key-impact-effect');
    setTimeout(() => {
      cardEl.classList.remove('key-impact-effect');
    }, 300);
  }
}

// Get animation parameters - key always renders to body with high z-index
function getAnimationSetup(cardId: string): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isFaceDown: boolean;
} | null {
  const cardEl = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
  if (!cardEl) return null;
  
  // data-face-up is on the inner Card component, not the wrapper
  const innerCard = cardEl.querySelector('[data-face-up]') as HTMLElement;
  const isFaceDown = innerCard ? innerCard.getAttribute('data-face-up') === 'false' : false;
  
  // Use inner card rect if available for precise positioning
  const cardRect = innerCard ? innerCard.getBoundingClientRect() : cardEl.getBoundingClientRect();
  
  // Key on card is positioned at left: 2px, bottom: 2px with fontSize 0.8rem (~13px)
  // FlyingKeyDrop uses translate(-50%, -50%) so we need center position
  // Key center: left edge (2px) + half key width (~6px) = ~8px from card left
  // Key center: bottom - 2px - half key height (~6px) = ~8px from card bottom
  // Adjusted to match exactly where static key appears
  const keyOffsetX = 6;
  const keyOffsetY = 6;
  
  // For face-up cards: end at exact key position on card
  // For face-down cards: end at top edge of card (key "enters" the card)
  let endX: number;
  let endY: number;
  
  if (isFaceDown) {
    // End when bottom of key touches top edge of card
    // Key is ~13px tall, centered with translate(-50%, -50%)
    // So center should stop ~6px above card top
    endX = cardRect.left + keyOffsetX;
    endY = cardRect.top - 6;
  } else {
    // End at exact key icon position on card (left: 2px, bottom: 2px)
    endX = cardRect.left + keyOffsetX;
    endY = cardRect.bottom - keyOffsetY;
  }
  
  // Start position: 120px above end point
  const startX = endX;
  const startY = endY - 120;
  
  return { startX, startY, endX, endY, isFaceDown };
}

export function FlyingKeyDrop({ id, cardId, targetX, targetY, onComplete }: FlyingKeyDropProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [setup, setSetup] = useState<ReturnType<typeof getAnimationSetup>>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<'flight' | 'bounce'>('flight');
  
  const FLIGHT_DURATION = 500; // ms - flight phase
  const BOUNCE_DURATION = 200; // ms - bounce phase
  
  // Initialize setup on mount
  useEffect(() => {
    const animSetup = getAnimationSetup(cardId);
    if (!animSetup) {
      onComplete();
      return;
    }
    setSetup(animSetup);
  }, [cardId]);
  
  // Run animation when setup is ready
  useEffect(() => {
    if (!setup) return;
    
    const { startX, startY, endX, endY, isFaceDown } = setup;
    
    const animate = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      
      if (phase === 'flight') {
        const progress = Math.min(elapsed / FLIGHT_DURATION, 1);
        
        // Ease-in for acceleration feel (like falling)
        const easedProgress = progress * progress;
        
        // Slight horizontal wobble
        const wobble = Math.sin(progress * Math.PI * 2) * 2 * (1 - progress);
        const x = startX + wobble + (endX - startX) * easedProgress;
        const y = startY + (endY - startY) * easedProgress;
        
        // Use transform for GPU acceleration instead of left/top
        elementRef.current.style.transform = `translate3d(${x - startX}px, ${y - startY}px, 0) translate(-50%, -50%)`;
        
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          // Flight complete - trigger pulse on "impact"
          triggerCardPulse(cardId);
          
          // Start bounce phase (only for face-up cards)
          if (!isFaceDown) {
            startTimeRef.current = null;
            setPhase('bounce');
          } else {
            // For face-down, just complete
            setIsVisible(false);
            onComplete();
          }
        }
      } else if (phase === 'bounce') {
        const progress = Math.min(elapsed / BOUNCE_DURATION, 1);
        
        // Bounce: go up 4px then back down
        // Use sine wave for smooth bounce
        const bounceY = Math.sin(progress * Math.PI) * 4;
        
        // Use transform for GPU acceleration
        const totalX = endX - startX;
        const totalY = endY - startY - bounceY;
        elementRef.current.style.transform = `translate3d(${totalX}px, ${totalY}px, 0) translate(-50%, -50%)`;
        
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          // Bounce complete - finish (glow already triggered on impact)
          setIsVisible(false);
          onComplete();
        }
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [setup, onComplete, cardId, phase]);
  
  if (!isVisible || !setup) return null;
  
  // Render to document.body with very high z-index (always above everything)
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed pointer-events-none"
      style={{
        left: setup.startX,
        top: setup.startY,
        zIndex: 10001,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      <span style={{ 
        fontSize: '0.8rem',
        textShadow: '0 1px 1px rgba(0,0,0,0.5)',
      }}>🔑</span>
    </div>,
    document.body
  );
}
