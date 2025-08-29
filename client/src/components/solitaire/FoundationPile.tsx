import React from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType, Suit } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { getSuitSymbol } from '../../lib/solitaire/cardUtils';

interface FoundationPileProps {
  cards: CardType[];
  suit: Suit;
}

export function FoundationPile({ cards, suit }: FoundationPileProps) {
  const { dropCards } = useSolitaire();

  const handleDrop = () => {
    dropCards('foundation', undefined, suit);
  };

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const suitSymbol = getSuitSymbol(suit);
  const isRed = suit === 'hearts' || suit === 'diamonds';

  return (
    <Pile
      onDrop={handleDrop}
      isEmpty={cards.length === 0}
      className="bg-green-50"
    >
      {topCard ? (
        <Card card={topCard} />
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <div className={`text-2xl ${isRed ? 'text-red-300' : 'text-gray-400'}`}>
            {suitSymbol}
          </div>
          <div className="text-xs text-gray-400 font-medium">A</div>
        </div>
      )}
    </Pile>
  );
}
