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
    endDrag,
    animatingCard
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
        const state = useSolitaire.getState();
        if (state.isDragging && state.sourceType === 'tableau' && state.sourceIndex === columnIndex) {
          state.endDrag();
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
      
      // Calculate offset from the click position to the card position
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      // Always use custom drag preview for tableau cards
      setShowDragPreview(true, 
        { x: rect.left, y: rect.top },
        { x: offsetX, y: offsetY }
      );
      
      // Hide the default drag image
      const img = new Image();
      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      e.dataTransfer.setDragImage(img, 0, 0);
      
      // Start drag with standard browser behavior
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

  const handleDrop = (e: React.DragEvent) => {
    // DEBUG: Show popup with drop info
    import('../DebugPopup').then(({ showDebugInfo }) => {
      showDebugInfo(
        'Drop on Tableau',
        { x: e.clientX, y: e.clientY },
        `Column ${columnIndex}`,
        { 
          cardsInColumn: cards.length,
          targetCard: cards.length > 0 ? `${cards[cards.length-1].rank}${cards[cards.length-1].suit}` : 'empty'
        }
      );
    });
    dropCards('tableau', columnIndex);
  };

  const movableCards = getMovableCardsFromTableau(columnIndex);
  const movableStartIndex = cards.length - movableCards.length;

  // Check if this card is being dragged from this column or animating
  const isCardBeingDragged = (cardIndex: number) => {
    const card = cards[cardIndex];
    
    // Check if dragging
    if (!isDragging || sourceType !== 'tableau' || sourceIndex !== columnIndex) {
      return false;
    }
    
    // Check if this card is in the dragged cards list
    const isBeingDragged = draggedCards.some(draggedCard => draggedCard.id === card.id);
    
    // Hide dragged cards when using custom drag preview
    return isBeingDragged;
  };
  
  // Check if card is animating to foundation
  const isCardAnimating = (cardIndex: number) => {
    const card = cards[cardIndex];
    return !!(animatingCard && animatingCard.card.id === card.id);
  };

  return (
    <div className="relative" data-tableau-column={columnIndex}>
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
            onDragOver={(e) => { 
              e.preventDefault();
              // Simplified drop zone logic - accept drops on any tableau card area
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => { 
              e.preventDefault(); 
              // Use simplified coordinate-free drop handling
              handleDrop(e); 
            }}
          >
            <Card
              card={card}
              onClick={() => handleCardClick(index)}
              onDoubleClick={() => handleCardClick(index)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              isPlayable={card.faceUp && index >= movableStartIndex}
              isDragging={isCardBeingDragged(index)}
              isAnimating={isCardAnimating(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
