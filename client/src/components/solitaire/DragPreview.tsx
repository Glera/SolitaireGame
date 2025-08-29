import React, { useEffect, useState } from 'react';
import { Card as CardType } from '../../lib/solitaire/types';
import { Card } from './Card';
import { createPortal } from 'react-dom';

interface DragPreviewProps {
  cards: CardType[];
  startPosition: { x: number; y: number };
}

export function DragPreview({ cards, startPosition }: DragPreviewProps) {
  const [position, setPosition] = useState({
    x: startPosition.x,
    y: startPosition.y
  });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        setPosition({
          x: e.clientX - 32, // Half card width
          y: e.clientY - 48  // Half card height  
        });
      });
    };
    
    // Start tracking mouse immediately
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Set initial position to mouse position immediately
    handleMouseMove(new MouseEvent('mousemove', {
      clientX: startPosition.x + 32,
      clientY: startPosition.y + 48
    }));
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [startPosition]);
  
  if (cards.length === 0) return null;
  
  // Only show preview for multiple cards
  if (cards.length === 1) return null;
  
  return createPortal(
    <div 
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
        pointerEvents: 'none'
      }}
    >
      <div className="relative" style={{ width: '64px', height: `${24 + (cards.length - 1) * 18}px` }}>
        {cards.map((card, index) => (
          <div
            key={card.id}
            style={{ 
              position: 'absolute',
              top: `${index * 18}px`,
              left: 0,
              opacity: 0.9
            }}
          >
            {/* Render card inline to avoid any prop issues */}
            <div className="w-16 h-24 bg-amber-50 border border-amber-700 rounded-lg shadow-lg p-1" style={{ borderRadius: '0.5rem' }}>
              <div className="w-full h-full flex flex-col justify-between">
                <div className={`text-xs font-bold leading-none ${card.color === 'red' ? 'text-red-600' : 'text-black'}`}>
                  <div>{card.rank}</div>
                  <div>{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                </div>
                <div className={`text-2xl self-center ${card.color === 'red' ? 'text-red-600' : 'text-black'}`}>
                  {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                </div>
                <div className={`text-xs font-bold leading-none self-end transform rotate-180 ${card.color === 'red' ? 'text-red-600' : 'text-black'}`}>
                  <div>{card.rank}</div>
                  <div>{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}