import React, { useRef, useState, useEffect } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { clearAllDropTargetHighlights } from '../../lib/solitaire/styleManager';
import { useTouchDrag } from '../../hooks/useTouchDrag';

interface WastePileProps {
  cards: CardType[];
}

export function WastePile({ cards }: WastePileProps) {
  const { 
    startDrag, 
    dropCards,
    canAutoMoveToFoundation, 
    autoMoveToFoundation,
    findTableauPlacementForCard,
    autoMoveToTableau,
    isDragging,
    draggedCards,
    sourceType,
    endDrag,
    animatingCard,
    setShowDragPreview,
    isStockAnimating
  } = useSolitaire();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [isShaking, setIsShaking] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const secondCard = cards.length > 1 ? cards[cards.length - 2] : null;

  // Track if we're in actual drag mode (not just click)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  
  // Touch drag handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchDrag(
    startDrag,
    endDrag,
    dropCards,
    setShowDragPreview,
    () => useSolitaire.getState(),
    () => useSolitaire.getState().draggedCards,
    () => useSolitaire.getState().sourceType,
    () => useSolitaire.getState().sourceIndex,
    () => useSolitaire.getState().sourceFoundation
  );
  
  // Track if a new card just appeared (for animation)
  // Removed - no longer using scale animation
  
  // Track card count changes
  const previousCardCountRef = useRef<number>(cards.length);
  const wasJustRecycledRef = useRef<boolean>(false);
  
  // Detect when a NEW card appears from stock pile (count increases)
  useEffect(() => {
    const currentCount = cards.length;
    const previousCount = previousCardCountRef.current;
    
    console.log('WastePile: Card count changed', {
      previousCount,
      currentCount,
      topCardId: topCard?.id,
      secondCardId: secondCard?.id,
      timestamp: Date.now()
    });
    
    // Track if this is a NEW card from stock pile (count increased)
    if (topCard && currentCount > previousCount) {
      console.log('WastePile: New card appeared instantly');
      previousCardCountRef.current = currentCount;
      wasJustRecycledRef.current = false;
      return;
    } else {
      // Update refs without animation for other cases
      previousCardCountRef.current = currentCount;
      
      // If card was removed
      if (currentCount < previousCount) {
        console.log('WastePile: Card removed');
        
        // If waste pile is now empty, it means cards were recycled back to stock
        if (currentCount === 0) {
          console.log('WastePile: Cards recycled back to stock');
          wasJustRecycledRef.current = true;
        }
      }
    }
  }, [topCard, secondCard, cards.length]);
  
  // Check if the top card is being dragged (only for real drag, not click)
  const isTopCardBeingDragged = () => {
    if (!topCard) return false;
    
    // Check if dragging
    if (!isDragging || sourceType !== 'waste') {
      return false;
    }
    
    const isInDraggedCards = draggedCards.some(draggedCard => draggedCard.id === topCard.id);
    
    // Only hide card if we're actually dragging (not just clicked)
    return isInDraggedCards && isActuallyDragging;
  };
  
  // Check if we should show the second card (card underneath)
  const shouldShowSecondCard = () => {
    if (!secondCard) return false;
    if (!topCard) return false;
    
    // Show second card when stock is animating
    if (isStockAnimating) return true;
    
    // Show second card when top card is being dragged
    if (isTopCardBeingDragged()) return true;
    
    // Show second card when top card is animating
    if (animatingCard && animatingCard.card.id === topCard.id) {
      // For return animations, show second card until animation is near complete (80%)
      if (animatingCard.isReturnAnimation) {
        return !animatingCard.isNearComplete;
      }
      // For normal moves, show second card until animation FULLY completes
      return true;
    }
    
    return false;
  };
  
  // Check if the top card should be hidden (for rendering purposes)
  const isTopCardAnimating = () => {
    if (!topCard) return false;
    if (!animatingCard || animatingCard.card.id !== topCard.id) return false;
    
    // For return animations, show card when near complete (80%+) to avoid flicker
    if (animatingCard.isReturnAnimation && animatingCard.isNearComplete) {
      return false;
    }
    
    // For normal moves, keep card hidden until animation FULLY completes
    // (card will appear in the NEW location, not the old one)
    return true;
  };

  const handleCardClick = () => {
    if (!topCard) return;
    
    // Don't allow clicks during animation
    // Temporarily disabled to debug
    // if (animatingCard) {
    //   console.log('⏸️ WastePile: Animation in progress, ignoring click');
    //   return;
    // }

    console.log('🎯 WastePile: Card clicked', topCard);

    // Special case: Aces always go to foundation immediately
    if (topCard.rank === 'A') {
      const foundationSuit = canAutoMoveToFoundation(topCard);
      if (foundationSuit) {
        console.log('✅ WastePile: Ace moving to foundation', foundationSuit);
        const startElement = cardRef.current;
        const endElement = document.querySelector(`[data-foundation-pile="${foundationSuit}"]`) as HTMLElement;
        autoMoveToFoundation(topCard, foundationSuit, startElement || undefined, endElement || undefined);
        return;
      }
    }

    // Priority 1: Try to find a place in tableau FIRST
    const tableauColumnIndex = findTableauPlacementForCard(topCard);
    
    console.log('🔍 WastePile: Tableau placement search result:', tableauColumnIndex);
    
    if (tableauColumnIndex !== null) {
      console.log('✅ WastePile: Moving to tableau column', tableauColumnIndex);
      const startElement = cardRef.current;
      autoMoveToTableau(topCard, tableauColumnIndex, startElement || undefined);
      return;
    }

    // Priority 2: If no tableau placement, try foundation
    const foundationSuit = canAutoMoveToFoundation(topCard);
    
    if (foundationSuit) {
      console.log('✅ WastePile: Moving to foundation', foundationSuit);
      const startElement = cardRef.current;
      const endElement = document.querySelector(`[data-foundation-pile="${foundationSuit}"]`) as HTMLElement;
      autoMoveToFoundation(topCard, foundationSuit, startElement || undefined, endElement || undefined);
      return;
    }

    // No valid moves found - shake the card
    console.log(`⚠️ No valid moves for ${topCard.suit}-${topCard.rank}`);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!topCard) return;
    
    // Clear any click timeout since we're actually dragging
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // Mark that we're actually dragging (not just clicking)
    setIsActuallyDragging(true);
    
    // Calculate offset from the click position to the card position
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Use custom drag preview for waste pile cards
    setShowDragPreview(true, 
      { x: rect.left, y: rect.top },
      { x: offsetX, y: offsetY }
    );
    
    // Hide the default drag image
    const img = new Image();
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    e.dataTransfer.setDragImage(img, 0, 0);
    
    // For waste pile, use standard browser drag behavior
    startDrag([topCard], 'waste');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset drag state
    setIsActuallyDragging(false);
    
    // Clear all visual feedback immediately
    clearAllDropTargetHighlights();
    
    // Delay endDrag to allow drop events to process first
    setTimeout(() => {
      useSolitaire.getState().endDrag();
      // Clear again after ending drag
      clearAllDropTargetHighlights();
    }, 0);
  };

  return (
    <Pile
      isEmpty={cards.length === 0}
      className="bg-teal-600/10"
      data-waste-pile
    >
      {/* Show second card when top card is being moved to a NEW location */}
      {shouldShowSecondCard() ? (
        <div style={{ position: 'absolute', top: 0, left: 0 }}>
          <Card 
            card={secondCard} 
            isPlayable={false}
            isDragging={false}
            isAnimating={false}
          />
        </div>
      ) : null}
      
      {/* Show top card - hidden during stock animation so flying card can land on top */}
      {topCard && !isStockAnimating ? (
        <div 
          key={topCard.id}
          ref={cardRef}
          style={{ 
            position: 'relative', 
            zIndex: 1
          }}
          className={isShaking ? 'animate-shake' : ''}
          data-card-is-top="true"
        >
          <Card 
            card={topCard} 
            onClick={handleCardClick}
            onDoubleClick={handleCardClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => {
              if (topCard) {
                handleTouchStart(e, [topCard], 'waste');
                setIsActuallyDragging(true);
              }
            }}
            onTouchMove={handleTouchMove}
            onTouchEnd={(e) => {
              handleTouchEnd(e);
              setIsActuallyDragging(false);
            }}
            isPlayable={true}
            isDragging={isTopCardBeingDragged()}
            isAnimating={isTopCardAnimating()}
          />
        </div>
      ) : !topCard ? (
        <div className="w-full h-full" />
      ) : null}
    </Pile>
  );
}
