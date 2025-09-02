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
  const [isAnimating, setIsAnimating] = useState(false);

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  
  const handleClick = () => {
    console.log('StockPile: Click, drawing card', { 
      stockCount: cards.length,
      timestamp: Date.now()
    });
    
    // Start shrink animation if there's a card to flip
    if (topCard) {
      setIsAnimating(true);
      // Reset animation after 50ms, then draw card
      setTimeout(() => {
        setIsAnimating(false);
        drawCard();
      }, 50);
    } else {
      // No animation for recycle action
      drawCard();
    }
  };

  return (
    <Pile
      onClick={handleClick}
      isEmpty={cards.length === 0}
      className="cursor-pointer hover:bg-teal-600/10"
      data-stock-pile
    >
      {topCard ? (
        <div 
          className="w-full h-full transition-transform ease-out"
          style={{
            transitionDuration: '50ms',
            transform: isAnimating ? 'scale(0.95)' : 'scale(1.0)'
          }}
        >
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
