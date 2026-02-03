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
  // 0 wins = x1 (minimum), 1 win = x1, 2 wins = x2, etc.
  const multiplier = Math.max(1, Math.min(streak, MAX_MULTIPLIER));

  // Increment streak on win, return new multiplier
  // multiplier = streak (1 win = x1, 2 wins = x2, etc.)
  const incrementStreak = useCallback((): number => {
    // Read current streak from localStorage for accurate value
    const currentStreak = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    const newStreak = currentStreak + 1;
    const newMultiplier = Math.min(newStreak, MAX_MULTIPLIER); // multiplier equals streak count
    
    // Update state and localStorage
    setStreak(newStreak);
    localStorage.setItem(STORAGE_KEY, newStreak.toString());
    
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
