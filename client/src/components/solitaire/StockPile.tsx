import React, { useState } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';

interface StockPileProps {
  cards: CardType[];
}

export function StockPile({ cards }: StockPileProps) {
  const { drawCard } = useSolitaire();
  const [isClicked, setIsClicked] = useState(false);

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  
  const handleClick = () => {
    setIsClicked(true);
    drawCard();
    
    // Reset animation after 100ms
    setTimeout(() => {
      setIsClicked(false);
    }, 100);
  };

  return (
    <Pile
      onClick={handleClick}
      isEmpty={cards.length === 0}
      className="cursor-pointer hover:bg-teal-600/10"
      data-stock-pile
    >
      {topCard ? (
        <div className={isClicked ? 'animate-click' : ''} style={{ transition: 'transform 100ms ease-out' }}>
          <Card card={topCard} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">🔄</div>
        </div>
      )}
    </Pile>
  );
}
