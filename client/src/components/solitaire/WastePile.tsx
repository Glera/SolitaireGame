import React, { useRef, useState, useEffect } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { clearAllDropTargetHighlights } from '../../lib/solitaire/styleManager';

interface WastePileProps {
  cards: CardType[];
}

export function WastePile({ cards }: WastePileProps) {
  const { 
    startDrag, 
    canAutoMoveToFoundation, 
    autoMoveToFoundation,
    isDragging,
    draggedCards,
    sourceType,
    endDrag,
    animatingCard,
    setShowDragPreview
  } = useSolitaire();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const secondCard = cards.length > 1 ? cards[cards.length - 2] : null;

  // Track if we're in actual drag mode (not just click)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  
  // Track if a new card just appeared (for animation)
  const [isNewCard, setIsNewCard] = useState(false);
  
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
      
      // Trigger animation
      setIsNewCard(true);
      setTimeout(() => setIsNewCard(false), 50);
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
  
  // Check if the top card is animating to foundation
  const isTopCardAnimating = () => {
    if (!topCard) return false;
    return !!(animatingCard && animatingCard.card.id === topCard.id);
  };

  const handleCardClick = () => {
    if (!topCard) return;

    // Try auto-move to foundation first
    const foundationSuit = canAutoMoveToFoundation(topCard);
    
    if (foundationSuit) {
      const startElement = cardRef.current;
      const endElement = document.getElementById(`foundation-${foundationSuit}`);
      autoMoveToFoundation(topCard, foundationSuit, startElement || undefined, endElement || undefined);
      return;
    }

    // For clicks without drag, don't start drag state
    // Just provide visual feedback without affecting card visibility
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
      {/* Show second card if top card is being dragged OR animating to foundation */}
      {secondCard && (isTopCardBeingDragged() || isTopCardAnimating()) && (
        <div style={{ position: 'absolute', top: 0, left: 0 }}>
          <Card 
            card={secondCard} 
            isPlayable={false}
            isDragging={false}
            isAnimating={false}
          />
        </div>
      )}
      
      {/* Show top card */}
      {topCard ? (
        <div 
          key={topCard.id}
          ref={cardRef}
          style={{ 
            position: 'relative', 
            zIndex: 1,
            transform: isNewCard ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 50ms ease-out'
          }}
        >
          <Card 
            card={topCard} 
            onClick={handleCardClick}
            onDoubleClick={handleCardClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isPlayable={true}
            isDragging={isTopCardBeingDragged()}
            isAnimating={isTopCardAnimating()}
          />
        </div>
      ) : (
        <div className="w-full h-full" />
      )}
    </Pile>
  );
}
