import React, { useRef, useState, useEffect } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';

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
    animatingCard
  } = useSolitaire();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const secondCard = cards.length > 1 ? cards[cards.length - 2] : null;

  // Track if we're in actual drag mode (not just click)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  
  // Track card animation state for flip effect
  const [animateCard, setAnimateCard] = useState(false);
  const [showPreviousCard, setShowPreviousCard] = useState(false);
  const previousCardCountRef = useRef<number>(cards.length);
  const [newCardId, setNewCardId] = useState<string | null>(null);
  
  // Detect when a NEW card appears from stock pile (count increases)
  useEffect(() => {
    const currentCount = cards.length;
    const previousCount = previousCardCountRef.current;
    
    // Only animate if this is a NEW card from stock pile (count increased)
    if (topCard && currentCount > previousCount) {
      // Show previous card during animation
      if (secondCard) {
        setShowPreviousCard(true);
      }
      
      // Track the new card and start animation
      setNewCardId(topCard.id);
      setAnimateCard(true);
      
      // End animation after transition completes
      const timer = setTimeout(() => {
        setAnimateCard(false);
        setShowPreviousCard(false);
        setNewCardId(null);
      }, 200);
      
      previousCardCountRef.current = currentCount;
      
      return () => clearTimeout(timer);
    } else {
      // Update refs without animation for other cases
      previousCardCountRef.current = currentCount;
      
      // If card was removed, ensure animation is off
      if (currentCount < previousCount) {
        setAnimateCard(false);
        setNewCardId(null);
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
    
    // For waste pile, use standard browser drag behavior
    startDrag([topCard], 'waste');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset drag state
    setIsActuallyDragging(false);
    
    // Delay endDrag to allow drop events to process first
    setTimeout(() => {
      useSolitaire.getState().endDrag();
    }, 0);
  };

  return (
    <Pile
      isEmpty={cards.length === 0}
      className="bg-teal-600/10"
      data-waste-pile
    >
      {/* Show second card if top card is being dragged OR during animation */}
      {secondCard && (isTopCardBeingDragged() || showPreviousCard) && (
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
          className={animateCard && newCardId === topCard.id ? 'card-slide-in' : ''}
          style={{ 
            position: 'relative', 
            zIndex: 1,
            // Ensure initial state is correct when animating
            ...(animateCard && newCardId === topCard.id ? {
              transform: 'translateX(-35px)',
              opacity: 0.5
            } : {})
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
