import React from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';

interface StockPileProps {
  cards: CardType[];
}

export function StockPile({ cards }: StockPileProps) {
  const { drawCard } = useSolitaire();

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  return (
    <Pile
      onClick={drawCard}
      isEmpty={cards.length === 0}
      className="cursor-pointer hover:bg-blue-50"
    >
      {topCard ? (
        <Card card={topCard} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">🔄</div>
        </div>
      )}
    </Pile>
  );
}
