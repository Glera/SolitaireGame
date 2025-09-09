import { useState, useRef } from 'react';

interface FloatingScoreData {
  id: number;
  score: number;
  x: number;
  y: number;
  breakdown?: {
    cardRank: string;
    points: number;
  };
}

export function useFloatingScores() {
  const [floatingScores, setFloatingScores] = useState<FloatingScoreData[]>([]);
  const floatingScoreId = useRef(0);

  const addFloatingScore = (score: number, x: number, y: number, cardRank?: string) => {
    console.log(`🎯 useFloatingScores: addFloatingScore called with ${score} points for ${cardRank} at (${x}, ${y})`);
    const newScore: FloatingScoreData = {
      id: ++floatingScoreId.current,
      score,
      x,
      y,
      breakdown: cardRank ? {
        cardRank,
        points: score
      } : undefined
    };

    console.log(`✅ useFloatingScores: Adding new floating score with id ${newScore.id}`);
    setFloatingScores(prev => {
      const newScores = [...prev, newScore];
      console.log(`📊 useFloatingScores: Total floating scores now: ${newScores.length}`);
      return newScores;
    });
  };

  const removeFloatingScore = (id: number) => {
    setFloatingScores(prev => prev.filter(score => score.id !== id));
  };

  return {
    floatingScores,
    addFloatingScore,
    removeFloatingScore
  };
}
