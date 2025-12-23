import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Card as CardType } from '../../lib/solitaire/types';
import { Card } from './Card';

interface FlyingCardData {
  id: string;
  card: CardType;
  startRect: DOMRect;
  endRect: DOMRect;
  duration: number;
  onComplete: () => void;
  startTime: number;
}

// Global state for flying cards
let flyingCards: FlyingCardData[] = [];
let updateCallback: (() => void) | null = null;

export function launchFlyingCard(
  card: CardType,
  startRect: DOMRect,
  endRect: DOMRect,
  duration: number,
  onComplete: () => void
) {
  const flyingCard: FlyingCardData = {
    id: `flying-${card.id}-${Date.now()}`,
    card,
    startRect,
    endRect,
    duration,
    onComplete,
    startTime: Date.now()
  };
  
  flyingCards.push(flyingCard);
  updateCallback?.();
  
  // Remove after animation completes
  setTimeout(() => {
    flyingCards = flyingCards.filter(c => c.id !== flyingCard.id);
    updateCallback?.();
    onComplete();
  }, duration);
}

// Component to render a single flying card
function FlyingCardItem({ data }: { data: FlyingCardData }) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - data.startTime;
      const newProgress = Math.min(elapsed / data.duration, 1);
      setProgress(newProgress);
      
      if (newProgress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [data.startTime, data.duration]);
  
  // Easing function for smooth animation
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easedProgress = easeOutCubic(progress);
  
  // Interpolate position
  const x = data.startRect.left + (data.endRect.left - data.startRect.left) * easedProgress;
  const y = data.startRect.top + (data.endRect.top - data.startRect.top) * easedProgress;
  
  // Scale down slightly as card flies
  const scale = 1 - (0.1 * easedProgress);
  
  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: `scale(${scale})`,
        zIndex: 10000,
        pointerEvents: 'none',
        opacity: progress < 1 ? 1 : 0,
        transition: 'opacity 0.05s'
      }}
    >
      <Card card={data.card} isClickable={false} />
    </div>
  );
}

// Container component that renders all flying cards
export function FlyingCardsContainer() {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    updateCallback = () => forceUpdate({});
    return () => {
      updateCallback = null;
    };
  }, []);
  
  if (flyingCards.length === 0) return null;
  
  return ReactDOM.createPortal(
    <>
      {flyingCards.map(card => (
        <FlyingCardItem key={card.id} data={card} />
      ))}
    </>,
    document.body
  );
}

