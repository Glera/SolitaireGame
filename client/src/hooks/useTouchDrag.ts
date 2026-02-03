import { useRef, useCallback, useEffect } from 'react';
import { Card, Suit } from '../lib/solitaire/types';
import { findBestDropTarget, getCurrentBestTarget, updateDropTargetBounds } from '../lib/solitaire/dropTargets';

export function useTouchDrag(
  onDragStart: (cards: Card[], sourceType: 'tableau' | 'waste' | 'foundation', sourceIndex?: number, sourceFoundation?: Suit) => void,
  onDragEnd: () => void,
  onDrop: (targetType: 'tableau' | 'foundation', targetIndex?: number, targetFoundation?: Suit) => void,
  setShowDragPreview: (show: boolean, position?: { x: number; y: number }, offset?: { x: number; y: number }) => void,
  getGameState: () => any,
  getDraggedCards: () => Card[],
  getSourceType: () => 'tableau' | 'waste' | 'foundation',
  getSourceIndex: () => number | undefined,
  getSourceFoundation: () => Suit | undefined,
  onTap?: () => void // Optional callback for tap (non-drag touch)
) {
  const touchState = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    moved: boolean;
    dragElement: HTMLElement | null;
    initialOffset: { x: number; y: number };
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    moved: false,
    dragElement: null,
    initialOffset: { x: 0, y: 0 }
  });

  const collisionCheckInterval = useRef<number | null>(null);
  
  // Global touchmove handler - needed because touch events stop firing on element when finger moves off
  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!touchState.current.isDragging) return;
      
      const touch = e.touches[0];
      if (!touch) return;
      
      const deltaX = Math.abs(touch.clientX - touchState.current.startX);
      const deltaY = Math.abs(touch.clientY - touchState.current.startY);
      
      // Threshold for distinguishing tap from drag
      if (deltaX > 15 || deltaY > 15) {
        touchState.current.moved = true;
      }
      
      // Update drag preview position via global callback
      const updatePosition = (window as any).__touchDragUpdatePosition;
      if (updatePosition && touchState.current.moved) {
        const { x: offsetX, y: offsetY } = touchState.current.initialOffset;
        updatePosition(touch.clientX - offsetX, touch.clientY - offsetY);
      }
      
      // Prevent scrolling during drag
      if (touchState.current.moved) {
        e.preventDefault();
      }
    };
    
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!touchState.current.isDragging) return;
      
      // Clear collision check interval
      if (collisionCheckInterval.current) {
        clearInterval(collisionCheckInterval.current);
        collisionCheckInterval.current = null;
      }
      
      const wasMoved = touchState.current.moved;
      touchState.current.isDragging = false;
      
      // Get the drop target
      const target = (window as any).__currentTouchDropTarget;
      
      if (target && wasMoved) {
        onDrop(target.type, target.index, target.suit);
      }
      
      // Clean up
      delete (window as any).__currentTouchDropTarget;
      
      // Hide drag preview
      setShowDragPreview(false);
      
      // If it was just a tap (no movement), call onTap callback
      // DON'T call onDragEnd for tap - it creates return animation which blocks the card
      if (!wasMoved) {
        // For tap: set a flag to skip return animation in onDragEnd
        (window as any).__isTapNotDrag = true;
        onDragEnd();
        delete (window as any).__isTapNotDrag;
        
        (window as any).__preventNextClick = true;
        setTimeout(() => {
          delete (window as any).__preventNextClick;
        }, 400);
        
        if (onTap) {
          setTimeout(() => {
            onTap();
          }, 10);
        }
      } else {
        // For actual drag: call full onDragEnd which may create return animation
        onDragEnd();
      }
    };
    
    // Use passive: false to allow preventDefault
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);
    
    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [onDragEnd, onDrop, setShowDragPreview, onTap]);

  const handleTouchStart = useCallback((
    e: React.TouchEvent,
    cards: Card[],
    sourceType: 'tableau' | 'waste' | 'foundation',
    sourceIndex?: number,
    sourceFoundation?: Suit
  ) => {
    const touch = e.touches[0];
    if (!touch) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    
    touchState.current = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
      dragElement: e.currentTarget as HTMLElement,
      initialOffset: { x: offsetX, y: offsetY }
    };

    // Start drag
    onDragStart(cards, sourceType, sourceIndex, sourceFoundation);
    
    // Show drag preview
    setShowDragPreview(
      true,
      { x: rect.left, y: rect.top },
      { x: offsetX, y: offsetY }
    );

    // Update drop target bounds
    updateDropTargetBounds(true);

    // Start checking collisions periodically
    collisionCheckInterval.current = window.setInterval(() => {
      checkCollision();
    }, 100);

    // Prevent scrolling
    e.preventDefault();
  }, [onDragStart, setShowDragPreview]);

  const checkCollision = useCallback(() => {
    const draggedCards = getDraggedCards();
    const sourceType = getSourceType();
    const sourceIndex = getSourceIndex();
    const sourceFoundation = getSourceFoundation();
    const gameState = getGameState();

    if (!draggedCards.length) return;

    // Get drag preview element to use its bounds
    const dragPreview = document.querySelector('[data-drag-preview="true"]') as HTMLElement;
    if (!dragPreview) return;

    const rect = dragPreview.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const target = findBestDropTarget(
      rect,
      { x: centerX, y: centerY },
      draggedCards,
      gameState,
      sourceType,
      sourceIndex,
      sourceFoundation
    );

    // Store target for drop
    (window as any).__currentTouchDropTarget = target;
  }, [getGameState, getDraggedCards, getSourceType, getSourceIndex, getSourceFoundation]);

  // These are kept for backward compatibility but the real work is done by global handlers
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Global handler does the work - just prevent default here
    if (touchState.current.isDragging && touchState.current.moved) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Global handler does the work - this is just for backward compatibility
    // The global touchend handler will handle cleanup
  }, []);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}

