import React, { useEffect } from 'react';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { useAudio } from '../../lib/stores/useAudio';
import { TableauColumn } from './TableauColumn';
import { FoundationPile } from './FoundationPile';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { GameControls } from './GameControls';

export function GameBoard() {
  const { 
    tableau, 
    foundations, 
    stock, 
    waste, 
    isWon,
    endDrag 
  } = useSolitaire();
  
  const { playSuccess } = useAudio();

  // Play success sound when game is won
  useEffect(() => {
    if (isWon) {
      playSuccess();
    }
  }, [isWon, playSuccess]);

  // Handle global drag end
  useEffect(() => {
    const handleMouseUp = () => {
      endDrag();
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [endDrag]);

  return (
    <div className="min-h-screen bg-green-800 p-4">
      <div className="max-w-6xl mx-auto">
        <GameControls />
        
        <div className="space-y-8">
          {/* Top row: Stock, Waste, and Foundation piles */}
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <StockPile cards={stock} />
              <WastePile cards={waste} />
            </div>
            
            <div className="flex gap-4">
              <FoundationPile cards={foundations.hearts} suit="hearts" />
              <FoundationPile cards={foundations.diamonds} suit="diamonds" />
              <FoundationPile cards={foundations.clubs} suit="clubs" />
              <FoundationPile cards={foundations.spades} suit="spades" />
            </div>
          </div>
          
          {/* Bottom row: Tableau columns */}
          <div className="flex gap-4 justify-center">
            {tableau.map((column, index) => (
              <div key={index} className="min-h-32">
                <TableauColumn cards={column} columnIndex={index} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
