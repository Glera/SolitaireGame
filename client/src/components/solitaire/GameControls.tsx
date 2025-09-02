import React from 'react';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const GAME_VERSION = '1.1.0';

interface GameControlsProps {
  onDebugClick?: () => void;
}

export function GameControls({ onDebugClick }: GameControlsProps = {}) {
  const { newGame, moves, isWon, startTime } = useSolitaire();

  const formatTime = () => {
    if (!startTime) return '00:00';
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative mb-4 h-12 flex items-center">
      {/* Score on the left */}
      <div className="absolute left-0 text-white text-lg font-semibold">
        Score: {moves} <span className="text-xs text-white/70 font-normal">v{GAME_VERSION}</span>
      </div>
      
      {/* New Game and Debug buttons in center */}
      <div className="flex-1 flex justify-center gap-3">
        <Button 
          onClick={newGame} 
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
      
      {/* Time on the right */}
      <div className="absolute right-0 text-white text-lg font-semibold">
        Time: {formatTime()}
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
  );
}
