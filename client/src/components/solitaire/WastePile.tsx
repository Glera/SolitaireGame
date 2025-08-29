import React from 'react';
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
      autoMoveToFoundation(topCard, foundationSuit);
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
        <Card 
          card={topCard} 
          onClick={handleCardClick}
          onDoubleClick={handleCardClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isPlayable={true}
          isDragging={isTopCardBeingDragged()}
        />
      ) : (
        <div className="w-full h-full" />
      )}
    </Pile>
  );
}
