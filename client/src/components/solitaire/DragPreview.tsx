import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../../lib/types/solitaire';
import { Card as PlayingCard } from './Card';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { useGameScaleContext } from '../../contexts/GameScaleContext';
import { findBestDropTarget, DropTarget, setCurrentBestTarget, getCurrentBestTarget } from '../../lib/solitaire/dropTargets';
import { clearAllDropTargetHighlights, applyDropTargetHighlight } from '../../lib/solitaire/styleManager';
import { perfMonitor } from '../../lib/solitaire/performanceMonitor';
import { getFaceUpOffset, isMobileDevice } from '../../lib/solitaire/cardConstants';
import { cardHasKey } from '../../lib/liveops/keyManager';
import { cardHasShovel } from '../../lib/liveops/dungeonDig/shovelManager';
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
  const rafIdRef = useRef<number | null>(null);
const { sourceType, sourceIndex, sourceFoundation, draggedCards, collisionHighlightEnabled } = useSolitaire();
  const { scale } = useGameScaleContext();
  
  // Calculate card offset to match tableau column spacing - use central constants
  const isMobile = isMobileDevice();
  const cardOffset = getFaceUpOffset(isMobile);
  
  useEffect(() => {
    let collisionCheckTimer: number;
    
    // Check if collision highlighting should be disabled (mobile)
    const disableCollisionHighlight = localStorage.getItem('disableCollisionHighlight') === 'true';
    
    // During drag operations, use both dragover and touchmove events
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault(); // Important for drag operations
      
      // Update position using RAF for smooth movement
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      rafIdRef.current = requestAnimationFrame(() => {
        const newPos = {
          x: e.clientX - offset.x,
          y: e.clientY - offset.y
        };
        
        setPosition(newPos);
        setCursorPos({ x: e.clientX, y: e.clientY });
        lastCursorPosRef.current = { x: e.clientX, y: e.clientY };
        rafIdRef.current = null;
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      e.preventDefault();

      // Update position using RAF for smooth movement
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        const newPos = {
          x: touch.clientX - offset.x,
          y: touch.clientY - offset.y
        };

        setPosition(newPos);
        setCursorPos({ x: touch.clientX, y: touch.clientY });
        lastCursorPosRef.current = { x: touch.clientX, y: touch.clientY };
        rafIdRef.current = null;
      });
    };
    
    // Global drop handler to catch missed drops
    const handleGlobalDrop = (e: DragEvent) => {
      // If highlights are disabled, we need to check collision once on drop
      if (!collisionHighlightEnabled && previewRef.current) {
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
        
        setCurrentBestTarget(target);
      }
      
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
      
      perfMonitor.start('checkCollisions');
      
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
      
      // Only update highlights if the target changed
      const currentElement = target?.element || null;
      if (currentElement !== lastHighlightedElement.current) {
        // Clear all highlights first
        clearAllDropTargetHighlights();
        
        // Apply new highlight if there's a target and highlights are enabled
        if (currentElement && collisionHighlightEnabled) {
          applyDropTargetHighlight(currentElement);
        }
        
        lastHighlightedElement.current = currentElement;
      }
      
      perfMonitor.end('checkCollisions');
    };
    
    // Only check collisions continuously if highlights are enabled AND not disabled globally (mobile)
    // Use longer interval on mobile for better performance
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (collisionHighlightEnabled && !disableCollisionHighlight) {
      const collisionCheckInterval = isMobile ? 200 : 50; // 200ms on mobile (was 150ms), 50ms on desktop
      collisionCheckTimer = window.setInterval(checkCollisions, collisionCheckInterval);
    }
    
    // Listen to both dragover and touchmove for cross-platform support
    window.addEventListener('dragover', handleDragOver as any);
    window.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    // Add global drop listener with capture to catch drops before they bubble
    window.addEventListener('drop', handleGlobalDrop as any, true);
    
    return () => {
      console.log('DragPreview: Cleaning up');
      
      // Cancel any pending RAF
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      window.removeEventListener('dragover', handleDragOver as any);
      window.removeEventListener('touchmove', handleTouchMove as any);
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
      data-drag-preview="true"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
        pointerEvents: 'none',
        transition: highlightedTarget ? 'all 100ms ease-out' : 'none',
        transform: `scale(${scale}) translate3d(0, 0, 0)`,
        transformOrigin: 'top left',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      <div className="relative" style={{ 
        width: '64px', 
        height: `${96 + (cards.length - 1) * cardOffset}px`, // 96px base card height + offset per additional card
        minHeight: '96px' // Ensure at least one card height
      }}>
        {cards.map((card, index) => (
          <div
            key={card.id}
            style={{ 
              position: 'absolute',
              top: `${index * cardOffset}px`, // Matches face-up cards spacing in tableau
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
              hasKey={cardHasKey(card.id)}
              hasShovel={cardHasShovel(card.id)}
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