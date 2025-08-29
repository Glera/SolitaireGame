import React, { useEffect } from 'react';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { useAudio } from '../../lib/stores/useAudio';
import { TableauColumn } from './TableauColumn';
import { FoundationPile } from './FoundationPile';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { GameControls } from './GameControls';
import { CardAnimation } from './CardAnimation';
import { DragPreview } from './DragPreview';

export function GameBoard() {
  const { 
    tableau, 
    foundations, 
    stock, 
    waste, 
    isWon,
    endDrag,
    animatingCard,
    completeCardAnimation,
    showDragPreview,
    draggedCards,
    dragPreviewPosition
  } = useSolitaire();
  
  const { playSuccess } = useAudio();

  // Play success sound when game is won
  useEffect(() => {
    if (isWon) {
      playSuccess();
    }
  }, [isWon, playSuccess]);

  // Note: Drag end is now handled by individual drag components via onDragEnd

  return (
    <div className="min-h-screen bg-green-800 p-3">
      <div className="max-w-3xl mx-auto">
        <GameControls />
        
        <div className="space-y-3">
          {/* Top row: Stock, Waste, and Foundation piles */}
          <div className="flex justify-between items-start">
            <div className="flex gap-2">
              <StockPile cards={stock} />
              <WastePile cards={waste} />
            </div>
            
            <div className="flex gap-2">
              <FoundationPile cards={foundations.hearts} suit="hearts" id="foundation-hearts" />
              <FoundationPile cards={foundations.diamonds} suit="diamonds" id="foundation-diamonds" />
              <FoundationPile cards={foundations.clubs} suit="clubs" id="foundation-clubs" />
              <FoundationPile cards={foundations.spades} suit="spades" id="foundation-spades" />
            </div>
          </div>
          
          {/* Bottom row: Tableau columns */}
          <div className="flex gap-2 justify-center">
            {tableau.map((column, index) => (
              <div key={index} className="min-h-32">
                <TableauColumn cards={column} columnIndex={index} />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Render animating card */}
      {animatingCard && (
        <CardAnimation
          card={animatingCard.card}
          startPosition={animatingCard.startPosition}
          endPosition={animatingCard.endPosition}
          onComplete={() => completeCardAnimation(animatingCard.card, animatingCard.targetSuit)}
        />
      )}
      
      {/* Render drag preview for multiple cards */}
      {showDragPreview && draggedCards.length > 0 && (
        <DragPreview
          cards={draggedCards}
          startPosition={dragPreviewPosition || { x: 0, y: 0 }}
        />
      )}
    </div>
  );
}
