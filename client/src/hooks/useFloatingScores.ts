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

    setFloatingScores(prev => [...prev, newScore]);
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
