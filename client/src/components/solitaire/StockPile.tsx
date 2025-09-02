import React from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';

interface StockPileProps {
  cards: CardType[];
}

export function StockPile({ cards }: StockPileProps) {
  const { drawCard, waste } = useSolitaire();

  // Show card back only if there are cards in stock OR waste has cards to recycle
  const hasCardsToFlip = cards.length > 0 || waste.length > 0;
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  
  const handleClick = () => {
    drawCard();
  };

  return (
    <Pile
      onClick={handleClick}
      isEmpty={!hasCardsToFlip}
      className="cursor-pointer hover:bg-teal-600/10"
      data-stock-pile
    >
      {hasCardsToFlip ? (
        topCard ? (
          <div onClick={handleClick} className="w-full h-full">
            <Card card={topCard} />
          </div>
        ) : (
          // Show a face-down card placeholder when stock is empty but waste has cards
          <div onClick={handleClick} className="w-full h-full">
            <Card card={{ id: 'placeholder', suit: 'hearts', rank: 'A', color: 'red', faceUp: false }} />
          </div>
        )
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">🔄</div>
        </div>
      )}
    </Pile>
  );
}
