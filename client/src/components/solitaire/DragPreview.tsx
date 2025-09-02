import React, { useEffect, useState, useRef } from 'react';
import { Card as CardType } from '../../lib/solitaire/types';
import { Card } from './Card';
import { createPortal } from 'react-dom';
import { findBestDropTarget, DropTarget, setCurrentBestTarget } from '../../lib/solitaire/dropTargets';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { applyDropTargetHighlight, clearAllDropTargetHighlights } from '../../lib/solitaire/styleManager';

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
  const lastHighlightedElement = useRef<HTMLElement | null>(null);
  const { sourceType, sourceIndex, sourceFoundation, draggedCards } = useSolitaire();
  
  useEffect(() => {
    let animationFrameId: number;
    let lastCursorPos = { x: startPosition.x + offset.x, y: startPosition.y + offset.y };
    
    // During drag operations, use dragover event instead of mousemove
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault(); // Important for drag operations
      
      const newPos = {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y
      };
      
      setPosition(newPos);
      setCursorPos({ x: e.clientX, y: e.clientY });
      lastCursorPos = { x: e.clientX, y: e.clientY };
    };
    
    // Continuously check collisions using requestAnimationFrame
    const checkCollisions = () => {
      if (previewRef.current) {
        const bounds = previewRef.current.getBoundingClientRect();
        const gameState = useSolitaire.getState();
        
        const target = findBestDropTarget(
          bounds,
          lastCursorPos,
          draggedCards,
          gameState,
          sourceType,
          sourceIndex,
          sourceFoundation
        );
        
        setHighlightedTarget(target);
        setCurrentBestTarget(target); // Store globally for drop handling
        
        // Only update highlights if the target changed
        const currentElement = target?.element || null;
        if (currentElement !== lastHighlightedElement.current) {
          console.log('DragPreview: Target changed from', 
            lastHighlightedElement.current?.getAttribute('data-drop-target'), 
            'to', 
            currentElement?.getAttribute('data-drop-target'));
          
          // Clear all highlights first
          clearAllDropTargetHighlights();
          
          // Apply new highlight if there's a target
          if (currentElement) {
            applyDropTargetHighlight(currentElement);
          }
          
          lastHighlightedElement.current = currentElement;
        }
      }
      
      animationFrameId = requestAnimationFrame(checkCollisions);
    };
    
    // Start continuous collision checking
    checkCollisions();
    
    // Listen to dragover which fires during drag operations
    window.addEventListener('dragover', handleDragOver as any);
    
    return () => {
      console.log('DragPreview: Cleaning up');
      window.removeEventListener('dragover', handleDragOver as any);
      cancelAnimationFrame(animationFrameId);
      // Clean up visual feedback and target
      setCurrentBestTarget(null);
      
      // Clear all highlights
      clearAllDropTargetHighlights();
      lastHighlightedElement.current = null;
    };
  }, [offset, draggedCards, sourceType, sourceIndex, sourceFoundation, startPosition]);
  
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