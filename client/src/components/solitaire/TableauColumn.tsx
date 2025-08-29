import React from 'react';
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
    autoMoveToFoundation
  } = useSolitaire();

  const handleCardClick = (cardIndex: number) => {
    const card = cards[cardIndex];
    if (!card.faceUp) return;

    // Check if this is the top card and can be auto-moved to foundation
    if (cardIndex === cards.length - 1) {
      const foundationSuit = canAutoMoveToFoundation(card);
      if (foundationSuit) {
        autoMoveToFoundation(card, foundationSuit);
        return;
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, cardIndex: number) => {
    const movableCards = getMovableCardsFromTableau(columnIndex);
    const cardPosition = cards.length - movableCards.length;
    
    if (cardIndex >= cardPosition) {
      const cardsToMove = movableCards.slice(cardIndex - cardPosition);
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
            />
          </div>
        ))}
      </div>
    </div>
  );
}
