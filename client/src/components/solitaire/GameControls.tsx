import React from 'react';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export function GameControls() {
  const { newGame, moves, isWon, startTime } = useSolitaire();

  const formatTime = () => {
    if (!startTime) return '00:00';
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={newGame} variant="outline">
            New Game
          </Button>
          <div className="text-sm text-gray-600">
            Moves: <span className="font-medium">{moves}</span>
          </div>
          <div className="text-sm text-gray-600">
            Time: <span className="font-medium">{formatTime()}</span>
          </div>
        </div>
        
        {isWon && (
          <div className="text-lg font-bold text-green-600">
            🎉 Congratulations! You won!
          </div>
        )}
      </div>
    </Card>
  );
}
