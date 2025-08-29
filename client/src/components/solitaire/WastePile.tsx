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
    autoMoveToFoundation 
  } = useSolitaire();

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

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

  return (
    <Pile
      isEmpty={cards.length === 0}
      className="bg-gray-50"
    >
      {topCard ? (
        <Card 
          card={topCard} 
          onClick={handleCardClick}
          onDoubleClick={handleCardClick}
          isPlayable={true}
        />
      ) : (
        <div className="w-full h-full" />
      )}
    </Pile>
  );
}
