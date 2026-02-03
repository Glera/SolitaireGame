/**
 * useWinStreak Hook
 * 
 * Manages win streak (серия побед) for star multiplier:
 * - 1 win = x1
 * - 2 wins = x2
 * - 3 wins = x3
 * - 4 wins = x4
 * - 5+ wins = x5 (max)
 * - Loss resets to x1
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'solitaire_win_streak';
const MAX_MULTIPLIER = 5;

export interface WinStreakState {
  streak: number;           // Current win streak count
  multiplier: number;       // Star multiplier (1-5)
  
  // Actions
  incrementStreak: () => number;  // Call on win, returns new multiplier
  resetStreak: () => void;        // Call on loss
  getMultipliedStars: (baseStars: number) => number;
}

export function useWinStreak(): WinStreakState {
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, streak.toString());
  }, [streak]);

  // Calculate multiplier from streak (1-5)
  const multiplier = Math.min(streak + 1, MAX_MULTIPLIER);

  // Increment streak on win, return new multiplier
  const incrementStreak = useCallback((): number => {
    let newMultiplier = 1;
    setStreak(prev => {
      const newStreak = prev + 1;
      newMultiplier = Math.min(newStreak + 1, MAX_MULTIPLIER);
      return newStreak;
    });
    return newMultiplier;
  }, []);

  // Reset streak on loss
  const resetStreak = useCallback(() => {
    setStreak(0);
    // Immediately update localStorage to ensure sync
    localStorage.setItem(STORAGE_KEY, '0');
  }, []);

  // Calculate stars with multiplier
  const getMultipliedStars = useCallback((baseStars: number): number => {
    return baseStars * multiplier;
  }, [multiplier]);

  return {
    streak,
    multiplier,
    incrementStreak,
    resetStreak,
    getMultipliedStars,
  };
}

export const WIN_STREAK_STORAGE_KEY = STORAGE_KEY;
