import React, { useRef } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';

interface TableauColumnProps {
  cards: CardType[];
  columnIndex: number;
}

export function TableauColumn({ cards, columnIndex }: TableauColumnProps) {
  const { 
    startDrag, 
    dropCards, 
    getMovableCardsFromTableau,
    canAutoMoveToFoundation,
    autoMoveToFoundation,
    isDragging,
    draggedCards,
    sourceType,
    sourceIndex,
    showDragPreview,
    setShowDragPreview,
    endDrag
  } = useSolitaire();
  
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCardClick = (cardIndex: number) => {
    const card = cards[cardIndex];
    if (!card.faceUp) return;

    // Check if this is the top card and can be auto-moved to foundation
    if (cardIndex === cards.length - 1) {
      const foundationSuit = canAutoMoveToFoundation(card);
      if (foundationSuit) {
        const startElement = cardRefs.current[cardIndex];
        const endElement = document.getElementById(`foundation-${foundationSuit}`);
        autoMoveToFoundation(card, foundationSuit, startElement || undefined, endElement || undefined);
        return;
      }
    }
    
    // Get movable cards for visual feedback
    const movableCards = getMovableCardsFromTableau(columnIndex);
    const cardPosition = cards.length - movableCards.length;
    
    if (cardIndex >= cardPosition) {
      const cardsToMove = movableCards.slice(cardIndex - cardPosition);
      startDrag(cardsToMove, 'tableau', columnIndex);
      
      // Clear drag state after a short delay if no actual drag happens
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        if (isDragging && sourceType === 'tableau' && sourceIndex === columnIndex) {
          endDrag();
        }
      }, 150);
    }
  };

  const handleDragStart = (e: React.DragEvent, cardIndex: number) => {
    // Clear the click timeout since we're actually dragging
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    const movableCards = getMovableCardsFromTableau(columnIndex);
    const cardPosition = cards.length - movableCards.length;
    
    if (cardIndex >= cardPosition) {
      const cardsToMove = movableCards.slice(cardIndex - cardPosition);
      
      // Set initial position for drag preview
      if (cardsToMove.length > 1) {
        const rect = e.currentTarget.getBoundingClientRect();
        setShowDragPreview(true, { x: rect.left, y: rect.top });
        
        // Create a transparent image for the default drag image
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
        e.dataTransfer.setDragImage(img, 0, 0);
      }
      
      startDrag(cardsToMove, 'tableau', columnIndex);
      e.dataTransfer.effectAllowed = 'move';
    } else {
      e.preventDefault();
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Delay endDrag to allow drop events to process first
    setTimeout(() => {
      useSolitaire.getState().endDrag();
    }, 0);
  };

  const handleDrop = () => {
    dropCards('tableau', columnIndex);
  };

  const movableCards = getMovableCardsFromTableau(columnIndex);
  const movableStartIndex = cards.length - movableCards.length;

  // Check if this card is being dragged from this column
  const isCardBeingDragged = (cardIndex: number) => {
    if (!isDragging || sourceType !== 'tableau' || sourceIndex !== columnIndex) {
      return false;
    }
    
    // Check if this card is in the dragged cards list
    const card = cards[cardIndex];
    const isBeingDragged = draggedCards.some(draggedCard => draggedCard.id === card.id);
    
    // Hide the card if it's being dragged and we're showing a preview
    return isBeingDragged && (showDragPreview || draggedCards.length === 1);
  };

  return (
    <div className="relative">
      <Pile
        onDrop={handleDrop}
        isEmpty={cards.length === 0}
        label="K"
        className="mb-2"
      >
        {cards.length === 0 && (
          <div className="w-full h-full" />
        )}
      </Pile>
      
      <div className="absolute top-0 left-0">
        {cards.map((card, index) => (
          <div
            key={card.id}
            ref={el => cardRefs.current[index] = el}
            className="absolute"
            style={{ top: `${index * 18}px` }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); handleDrop(); }}
          >
            <Card
              card={card}
              onClick={() => handleCardClick(index)}
              onDoubleClick={() => handleCardClick(index)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              isPlayable={card.faceUp && index >= movableStartIndex}
              isDragging={isCardBeingDragged(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
