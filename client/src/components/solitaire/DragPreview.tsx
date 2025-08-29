import React, { useEffect, useState, useRef } from 'react';
import { Card as CardType } from '../../lib/solitaire/types';
import { Card } from './Card';
import { createPortal } from 'react-dom';

interface DragPreviewProps {
  cards: CardType[];
  startPosition: { x: number; y: number };
}

export function DragPreview({ cards, startPosition }: DragPreviewProps) {
  const [position, setPosition] = useState(startPosition);
  const isDragging = useRef(false);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Only update position after initial drag movement
      if (!isDragging.current && (Math.abs(e.clientX - startPosition.x) > 5 || Math.abs(e.clientY - startPosition.y) > 5)) {
        isDragging.current = true;
      }
      
      if (isDragging.current) {
        setPosition({
          x: e.clientX - 32, // Half card width
          y: e.clientY - 48  // Half card height  
        });
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [startPosition]);
  
  if (cards.length === 0) return null;
  
  return createPortal(
    <div 
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: 0.8
      }}
    >
      <div className="relative">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="absolute"
            style={{ top: `${index * 18}px` }}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}