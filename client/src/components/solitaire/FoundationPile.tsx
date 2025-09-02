import React, { useRef, useState } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType, Suit } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { getSuitSymbol } from '../../lib/solitaire/cardUtils';

interface FoundationPileProps {
  cards: CardType[];
  suit: Suit;
  id?: string;
}

export function FoundationPile({ cards, suit, id }: FoundationPileProps) {
  const { 
    dropCards, 
    startDrag, 
    canAutoMoveToFoundation, 
    autoMoveToFoundation,
    isDragging,
    draggedCards,
    sourceType,
    sourceFoundation,
    endDrag,
    animatingCard
  } = useSolitaire();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if we're in actual drag mode (not just click)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    // DEBUG: Show popup with foundation drop info
    import('../DebugPopup').then(({ showDebugInfo }) => {
      showDebugInfo(
        'Drop on Foundation',
        { x: e.clientX, y: e.clientY },
        `${suit.toUpperCase()} foundation`,
        { 
          cardsInFoundation: cards.length,
          topCard: cards.length > 0 ? `${cards[cards.length-1].rank}${cards[cards.length-1].suit}` : 'empty'
        }
      );
    });
    dropCards('foundation', undefined, suit);
  };

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const secondCard = cards.length > 1 ? cards[cards.length - 2] : null;
  const suitSymbol = getSuitSymbol(suit);
  const isRed = suit === 'hearts' || suit === 'diamonds';
  
  // Check if the top card is being dragged (only for real drag, not click)
  const isTopCardBeingDragged = () => {
    if (!topCard) return false;
    
    // Check if dragging from this foundation
    if (!isDragging || sourceType !== 'foundation' || sourceFoundation !== suit) {
      return false;
    }
    
    const isInDraggedCards = draggedCards.some(draggedCard => draggedCard.id === topCard.id);
    
    // Only hide card if we're actually dragging (not just clicked)
    return isInDraggedCards && isActuallyDragging;
  };
  
  // Check if the top card is animating to another location
  const isTopCardAnimating = () => {
    if (!topCard) return false;
    return !!(animatingCard && animatingCard.card.id === topCard.id);
  };
  
  const handleCardClick = () => {
    if (!topCard) return;
    
    // Foundation cards usually don't auto-move, but we can try
    // For clicks without drag, don't start drag state
  };
  
  const handleDragStart = (e: React.DragEvent) => {
    if (!topCard) return;
    
    // Clear any click timeout since we're actually dragging
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // Mark that we're actually dragging (not just clicking)
    setIsActuallyDragging(true);
    
    // Start drag from foundation
    startDrag([topCard], 'foundation', undefined, suit);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Reset drag state
    setIsActuallyDragging(false);
    
    // Delay endDrag to allow drop events to process first
    setTimeout(() => {
      useSolitaire.getState().endDrag();
    }, 0);
  };

  return (
    <div id={id}>
      <Pile
        onDrop={handleDrop}
        isEmpty={cards.length === 0}
        className="bg-teal-600/20 border-teal-400/50"
      >
      {/* Show second card if top card is being dragged and second card exists */}
      {secondCard && isTopCardBeingDragged() && (
        <div style={{ position: 'absolute', top: 0, left: 0 }}>
          <Card 
            card={secondCard} 
            isPlayable={false}
            isDragging={false}
            isAnimating={false}
          />
        </div>
      )}
      
      {/* Show top card */}
      {topCard ? (
        <div ref={cardRef} style={{ position: 'relative', zIndex: 1 }}>
          <Card 
            card={topCard} 
            onClick={handleCardClick}
            onDoubleClick={handleCardClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isPlayable={true}
            isDragging={isTopCardBeingDragged()}
            isAnimating={isTopCardAnimating()}
          />
        </div>
      ) : (
        <div className="w-full h-full p-1 flex flex-col justify-between">
          {/* Top rank and suit - like real card */}
          <div className="text-xs font-bold leading-none text-amber-50 opacity-30">
            <div>A</div>
            <div className="text-xs">{suitSymbol}</div>
          </div>
          
          {/* Bottom rank and suit (rotated) */}
          <div className="text-xs font-bold leading-none text-amber-50 opacity-30 self-end">
            <div className="transform rotate-180">A</div>
            <div className="text-xs transform rotate-180">{suitSymbol}</div>
          </div>
        </div>
      )}
      </Pile>
    </div>
  );
}
