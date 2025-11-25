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
  getSourceFoundation: () => Suit | undefined
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
    const touch = e.touches[0];
    if (!touch) return;

    const rect = e.currentTarget.getBoundingClientRect();
    
    touchState.current = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
      dragElement: e.currentTarget as HTMLElement
    };

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

    if (deltaX > 5 || deltaY > 5) {
      touchState.current.moved = true;
    }

    // Prevent scrolling during drag
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchState.current.isDragging) return;

    // Clear collision check interval
    if (collisionCheckInterval.current) {
      clearInterval(collisionCheckInterval.current);
      collisionCheckInterval.current = null;
    }

    touchState.current.isDragging = false;
    
    // Get the drop target
    const target = (window as any).__currentTouchDropTarget;
    
    if (target) {
      // Perform drop
      onDrop(target.type, target.index, target.suit);
    }

    // Clean up
    delete (window as any).__currentTouchDropTarget;
    
    // End drag
    onDragEnd();

    // Hide drag preview
    setShowDragPreview(false);
  }, [onDragEnd, onDrop, setShowDragPreview]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}

