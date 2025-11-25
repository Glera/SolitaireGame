import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card as CardType } from '../../lib/solitaire/types';
import { Card as PlayingCard } from '../solitaire/Card';
import { useGameScaleContext } from '../../contexts/GameScaleContext';

interface TouchDragPreviewProps {
  cards: CardType[];
  isActive: boolean;
  onPositionUpdate?: (x: number, y: number) => void;
}

export function TouchDragPreview({ cards, isActive, onPositionUpdate }: TouchDragPreviewProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { scale } = useGameScaleContext();
  const rafRef = useRef<number | null>(null);

  // Update position smoothly with RAF
  const updatePosition = (x: number, y: number) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      setPosition({ x, y });
      if (onPositionUpdate) {
        onPositionUpdate(x, y);
      }
      rafRef.current = null;
    });
  };

  // Expose update function
  useEffect(() => {
    (window as any).__touchDragUpdatePosition = updatePosition;
    return () => {
      delete (window as any).__touchDragUpdatePosition;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (!isActive || cards.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
        pointerEvents: 'none',
        transform: `scale(${scale}) translate3d(0, 0, 0)`,
        transformOrigin: 'top left',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        opacity: 0.95
      }}
    >
      <div className="relative" style={{
        width: '64px',
        height: `${96 + (cards.length - 1) * 52}px`, // Updated to 52px for mobile spacing
        minHeight: '96px'
      }}>
        {cards.map((card, index) => (
          <div
            key={card.id}
            style={{
              position: 'absolute',
              top: `${index * 52}px`, // 52px vertical offset matches mobile face-up cards
              left: 0,
              filter: 'brightness(1.1)',
              transform: 'scale(1.05)',
            }}
          >
            <PlayingCard
              card={card}
              isClickable={false}
              isDragging={false}
              style={{
                cursor: 'grabbing',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)'
              }}
            />
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}





