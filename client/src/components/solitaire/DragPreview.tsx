import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../../lib/types/solitaire';
import { Card as PlayingCard } from './Card';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { findBestDropTarget, DropTarget, setCurrentBestTarget, getCurrentBestTarget } from '../../lib/solitaire/dropTargets';
import { clearAllDropTargetHighlights, applyDropTargetHighlight } from '../../lib/solitaire/styleManager';
import type { Suit } from '../../lib/types/solitaire';

interface DragPreviewProps {
  cards: Card[];
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
  const lastCursorPosRef = useRef({ x: startPosition.x + offset.x, y: startPosition.y + offset.y });
  const { sourceType, sourceIndex, sourceFoundation, draggedCards, collisionHighlightEnabled } = useSolitaire();
  
  useEffect(() => {
    let collisionCheckTimer: number;
    
    // During drag operations, use dragover event instead of mousemove
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault(); // Important for drag operations
      
      // Update position immediately for smooth movement
      const newPos = {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y
      };
      
      setPosition(newPos);
      setCursorPos({ x: e.clientX, y: e.clientY });
      lastCursorPosRef.current = { x: e.clientX, y: e.clientY };
    };
    
    // Global drop handler to catch missed drops
    const handleGlobalDrop = (e: DragEvent) => {
      const target = getCurrentBestTarget();
      if (target && !e.defaultPrevented) {
        console.log('🌍 Global drop caught, best target:', target.type, target.index || target.suit);
        e.preventDefault();
        
        // Trigger drop on the best target
        if (target.type === 'tableau' && target.index !== undefined) {
          useSolitaire.getState().dropCards('tableau', target.index);
        } else if (target.type === 'foundation' && target.suit) {
          useSolitaire.getState().dropCards('foundation', undefined, target.suit);
        }
        
        // Clear highlights
        setCurrentBestTarget(null);
        clearAllDropTargetHighlights();
      }
    };
    
    // Separate collision checking from position updates
    const checkCollisions = () => {
      if (!previewRef.current) return;
      
      const bounds = previewRef.current.getBoundingClientRect();
      const gameState = useSolitaire.getState();
      
      const target = findBestDropTarget(
        bounds,
        lastCursorPosRef.current,
        draggedCards,
        gameState,
        sourceType,
        sourceIndex,
        sourceFoundation
      );
      
      setHighlightedTarget(target);
      setCurrentBestTarget(target); // Store globally for drop handling
      
      // Only apply visual highlights if enabled
      if (collisionHighlightEnabled) {
        // Only update highlights if the target changed
        const currentElement = target?.element || null;
        if (currentElement !== lastHighlightedElement.current) {
          // Clear all highlights first
          clearAllDropTargetHighlights();
          
          // Apply new highlight if there's a target
          if (currentElement) {
            applyDropTargetHighlight(currentElement);
          }
          
          lastHighlightedElement.current = currentElement;
        }
      }
    };
    
    // Check collisions every 50ms (20 times per second)
    // This is separate from position updates to keep movement smooth
    collisionCheckTimer = window.setInterval(checkCollisions, 50);
    
    // Listen to dragover which fires during drag operations
    window.addEventListener('dragover', handleDragOver as any);
    // Add global drop listener with capture to catch drops before they bubble
    window.addEventListener('drop', handleGlobalDrop as any, true);
    
    return () => {
      console.log('DragPreview: Cleaning up');
      window.removeEventListener('dragover', handleDragOver as any);
      window.removeEventListener('drop', handleGlobalDrop as any, true);
      window.clearInterval(collisionCheckTimer);
      clearAllDropTargetHighlights();
      setCurrentBestTarget(null);
      lastHighlightedElement.current = null;
    };
  }, [offset, draggedCards, sourceType, sourceIndex, sourceFoundation, collisionHighlightEnabled]);
  
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
              opacity: 0.95,
              filter: highlightedTarget ? 'brightness(1.1)' : 'none',
              transform: highlightedTarget ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 100ms ease-out'
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