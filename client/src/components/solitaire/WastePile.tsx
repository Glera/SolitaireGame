import React, { useRef } from 'react';
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
    sourceType
  } = useSolitaire();
  
  const cardRef = useRef<HTMLDivElement>(null);

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  // Check if the top card is being dragged
  const isTopCardBeingDragged = () => {
    if (!isDragging || sourceType !== 'waste' || !topCard) {
      return false;
    }
    return draggedCards.some(draggedCard => draggedCard.id === topCard.id);
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

    // Otherwise start drag
    startDrag([topCard], 'waste');
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!topCard) return;
    startDrag([topCard], 'waste');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Delay endDrag to allow drop events to process first
    setTimeout(() => {
      useSolitaire.getState().endDrag();
    }, 0);
  };

  return (
    <Pile
      isEmpty={cards.length === 0}
      className="bg-teal-600/10"
    >
      {topCard ? (
        <div ref={cardRef}>
          <Card 
            card={topCard} 
            onClick={handleCardClick}
            onDoubleClick={handleCardClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isPlayable={true}
            isDragging={isTopCardBeingDragged()}
          />
        </div>
      ) : (
        <div className="w-full h-full" />
      )}
    </Pile>
  );
}
