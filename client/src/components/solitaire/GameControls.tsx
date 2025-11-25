import React, { useState } from 'react';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { GameModeSelector } from './GameModeSelector';

export const GAME_VERSION = '3.20.3';

interface GameControlsProps {
  onDebugClick?: () => void;
}

export function GameControls({ onDebugClick }: GameControlsProps = {}) {
  const { newGame, isWon } = useSolitaire();
  const [showModeSelector, setShowModeSelector] = useState(false);

  const handleNewGameClick = () => {
    setShowModeSelector(true);
  };

  const handleModeSelect = (mode: 'random' | 'solvable' | 'unsolvable') => {
    newGame(mode);
  };

  return (
    <>
      <div className="relative mb-4 h-12 flex items-center">
        {/* New Game and Debug buttons in center */}
        <div className="flex-1 flex justify-center gap-3">
          <Button 
            onClick={handleNewGameClick} 
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            New Game
          </Button>
          {onDebugClick && (
            <Button 
              onClick={onDebugClick} 
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Debug
            </Button>
          )}
        </div>
        
        {/* Win message overlay */}
        {isWon && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg">
              🎉 Congratulations! You won!
            </div>
          </div>
        )}
      </div>
      
      {/* Game Mode Selector Modal */}
      <GameModeSelector
        isOpen={showModeSelector}
        onSelectMode={handleModeSelect}
        onClose={() => setShowModeSelector(false)}
      />
    </>
  );
}
