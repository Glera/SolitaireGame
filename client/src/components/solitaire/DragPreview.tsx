import React, { useEffect, useState, useRef } from 'react';
import { Card as CardType } from '../../lib/solitaire/types';
import { Card } from './Card';
import { createPortal } from 'react-dom';
import { findBestDropTarget, DropTarget, setCurrentBestTarget } from '../../lib/solitaire/dropTargets';
import { useSolitaire } from '../../lib/stores/useSolitaire';

interface DragPreviewProps {
  cards: CardType[];
  startPosition: { x: number; y: number };
  offset?: { x: number; y: number };
}

export function DragPreview({ cards, startPosition, offset = { x: 32, y: 48 } }: DragPreviewProps) {
  const [position, setPosition] = useState({
    x: startPosition.x,
    y: startPosition.y
  });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [highlightedTarget, setHighlightedTarget] = useState<DropTarget | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { sourceType, sourceIndex, sourceFoundation, draggedCards } = useSolitaire();
  
  useEffect(() => {
    // During drag operations, use dragover event instead of mousemove
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault(); // Important for drag operations
      
      const newPos = {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y
      };
      
      setPosition(newPos);
      setCursorPos({ x: e.clientX, y: e.clientY });
      
      // Check for drop targets based on collision
      if (previewRef.current) {
        const bounds = previewRef.current.getBoundingClientRect();
        const gameState = useSolitaire.getState();
        
        const target = findBestDropTarget(
          bounds,
          { x: e.clientX, y: e.clientY },
          draggedCards,
          gameState,
          sourceType,
          sourceIndex,
          sourceFoundation
        );
        
        setHighlightedTarget(target);
        setCurrentBestTarget(target); // Store globally for drop handling
        
        // Update visual feedback on all targets
        document.querySelectorAll('[data-drop-target]').forEach(el => {
          (el as HTMLElement).style.backgroundColor = '';
          (el as HTMLElement).style.borderColor = '';
        });
        
        if (target?.element) {
          target.element.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
          target.element.style.borderColor = 'rgb(34, 197, 94)';
        }
      }
    };
    
    // Listen to dragover which fires during drag operations
    window.addEventListener('dragover', handleDragOver as any);
    
    return () => {
      window.removeEventListener('dragover', handleDragOver as any);
      // Clean up visual feedback and target
      setCurrentBestTarget(null);
      document.querySelectorAll('[data-drop-target]').forEach(el => {
        (el as HTMLElement).style.backgroundColor = '';
        (el as HTMLElement).style.borderColor = '';
      });
    };
  }, [offset, draggedCards, sourceType, sourceIndex, sourceFoundation]);
  
  if (cards.length === 0) return null;
  
  return createPortal(
    <div 
      ref={previewRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
        pointerEvents: 'none',
        transition: highlightedTarget ? 'all 100ms ease-out' : 'none'
      }}
    >
      <div className="relative" style={{ 
        width: '64px', 
        height: `${96 + (cards.length - 1) * 18}px`, // 96px base card height + 18px per additional card
        minHeight: '96px' // Ensure at least one card height
      }}>
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