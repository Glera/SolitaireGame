import { useRef, useCallback } from 'react';
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
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    moved: false,
    dragElement: null
  });

  const collisionCheckInterval = useRef<number | null>(null);

  const handleTouchStart = useCallback((
    e: React.TouchEvent,
    cards: Card[],
    sourceType: 'tableau' | 'waste' | 'foundation',
    sourceIndex?: number,
    sourceFoundation?: Suit
  ) => {
    console.log('📱 handleTouchStart called, cards:', cards.length, 'source:', sourceType);
    const touch = e.touches[0];
    if (!touch) {
      console.log('📱 handleTouchStart: no touch found');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    
    touchState.current = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
      dragElement: e.currentTarget as HTMLElement
    };
    console.log('📱 handleTouchStart: isDragging set to true, startX:', touch.clientX, 'startY:', touch.clientY);

    // Start drag
    onDragStart(cards, sourceType, sourceIndex, sourceFoundation);
    
    // Show drag preview
    setShowDragPreview(
      true,
      { x: rect.left, y: rect.top },
      { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
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

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.current.isDragging) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = Math.abs(touch.clientX - touchState.current.startX);
    const deltaY = Math.abs(touch.clientY - touchState.current.startY);

    // Increased threshold for mobile devices - 5px was too sensitive
    // causing taps to be detected as drags on high-DPI screens
    if (deltaX > 15 || deltaY > 15) {
      touchState.current.moved = true;
    }

    // Prevent scrolling during drag
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    console.log('📱 handleTouchEnd called, isDragging:', touchState.current.isDragging, 'moved:', touchState.current.moved);
    if (!touchState.current.isDragging) {
      console.log('📱 handleTouchEnd: not dragging, returning early');
      return;
    }

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
      // Only drop if it was actually a drag (moved)
      onDrop(target.type, target.index, target.suit);
    }

    // Clean up
    delete (window as any).__currentTouchDropTarget;
    
    // End drag
    onDragEnd();

    // Hide drag preview
    setShowDragPreview(false);
    
    // If it was just a tap (no movement), call onTap callback and prevent synthetic click
    if (!wasMoved) {
      console.log('📱 Touch tap detected (no movement)');
      // Prevent the synthetic click event from firing
      (window as any).__preventNextClick = true;
      setTimeout(() => {
        delete (window as any).__preventNextClick;
      }, 400);
      
      // Call tap handler after drag state is cleaned up
      if (onTap) {
        console.log('📱 Calling onTap callback');
        // Small delay to ensure drag state is fully cleared
        setTimeout(() => {
          onTap();
        }, 10);
      }
    } else {
      console.log('📱 Touch drag detected (moved)');
    }
  }, [onDragEnd, onDrop, setShowDragPreview, onTap]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}

