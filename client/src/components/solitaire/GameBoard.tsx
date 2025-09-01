import React, { useEffect, useState } from 'react';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { useAudio } from '../../lib/stores/useAudio';
import { TableauColumn } from './TableauColumn';
import { FoundationPile } from './FoundationPile';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { GameControls } from './GameControls';
import { CardAnimation } from './CardAnimation';
import { DragPreview } from './DragPreview';
import { DebugPopup, setDebugCallback, type DebugInfo } from '../DebugPopup';

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
    dragPreviewPosition,
    dragOffset
  } = useSolitaire();
  
  const { playSuccess } = useAudio();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // Set up debug callback
  useEffect(() => {
    setDebugCallback((info: DebugInfo) => {
      setDebugInfo(info);
    });
  }, []);

  // Play success sound when game is won
  useEffect(() => {
    if (isWon) {
      playSuccess();
    }
  }, [isWon, playSuccess]);

  // Note: Drag end is now handled by individual drag components via onDragEnd

  return (
    <div className="min-h-screen bg-green-800 p-3" data-game-board>
      <div className="max-w-fit mx-auto">
        <GameControls />
        
        <div className="inline-block space-y-3">
          {/* Top row: Stock, Waste, and Foundation piles - aligned with 7 columns */}
          <div className="flex gap-2 items-start">
            <StockPile cards={stock} />
            <WastePile cards={waste} />
            <div className="w-16" /> {/* Empty space equivalent to 1 card */}
            <FoundationPile cards={foundations.hearts} suit="hearts" id="foundation-hearts" />
            <FoundationPile cards={foundations.diamonds} suit="diamonds" id="foundation-diamonds" />
            <FoundationPile cards={foundations.clubs} suit="clubs" id="foundation-clubs" />
            <FoundationPile cards={foundations.spades} suit="spades" id="foundation-spades" />
          </div>
          
          {/* Bottom row: Tableau columns */}
          <div className="flex gap-2">
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
      
      {/* Render drag preview for dragged cards */}
      {showDragPreview && draggedCards.length > 0 && dragPreviewPosition && (
        <DragPreview
          cards={draggedCards}
          startPosition={dragPreviewPosition}
          offset={dragOffset || { x: 32, y: 48 }}
        />
      )}
      
      {/* Debug popup */}
      <DebugPopup 
        info={debugInfo}
        onClose={() => setDebugInfo(null)}
      />
    </div>
  );
}
