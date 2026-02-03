import { useState, useEffect, useCallback, SetStateAction, Dispatch } from 'react';

// Level required to unlock collections and points event
export const COLLECTIONS_REQUIRED_LEVEL = 2;

// Level required to unlock leaderboard
export const LEADERBOARD_REQUIRED_LEVEL = 4;

// Stars earned per level up
export const STARS_PER_LEVELUP = 50;

// Stars per win
export const STARS_PER_WIN = 5;

export interface GameProgressState {
  // Stars
  totalStars: number;
  displayedStars: number;
  starPulseKey: number;
  
  // Unlocks
  collectionsUnlocked: boolean;
  leaderboardUnlocked: boolean;
  
  // Actions
  addStars: (amount: number) => void;
  setDisplayedStars: Dispatch<SetStateAction<number>>;
  triggerStarPulse: () => void;
  resetProgress: () => void;
}

export function useGameProgress(): GameProgressState {
  // Real stars count - saved to localStorage immediately when earned
  const [totalStars, setTotalStars] = useState(() => {
    const saved = localStorage.getItem('solitaire_total_stars');
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });
  
  // Displayed stars count - updated visually when stars arrive or window closes
  const [displayedStars, setDisplayedStars] = useState(() => {
    const saved = localStorage.getItem('solitaire_total_stars');
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });
  
  // Pulse animation key
  const [starPulseKey, setStarPulseKey] = useState(0);
  
  // Player level (loaded from experienceManager)
  const [playerLevel, setPlayerLevel] = useState(() => {
    const saved = localStorage.getItem('solitaire_player_level');
    return saved ? parseInt(saved, 10) : 1;
  });
  
  // Save totalStars to localStorage when it changes
  useEffect(() => {
    if (typeof totalStars === 'number' && !isNaN(totalStars)) {
      localStorage.setItem('solitaire_total_stars', totalStars.toString());
    }
  }, [totalStars]);
  
  // Listen for level changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'solitaire_player_level' && e.newValue) {
        setPlayerLevel(parseInt(e.newValue, 10));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  // Also check periodically for level changes (same tab)
  useEffect(() => {
    const interval = setInterval(() => {
      const saved = localStorage.getItem('solitaire_player_level');
      const level = saved ? parseInt(saved, 10) : 1;
      if (level !== playerLevel) {
        setPlayerLevel(level);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerLevel]);
  
  // Actions
  const addStars = useCallback((amount: number) => {
    if (amount <= 0) return;
    setTotalStars(prev => prev + amount);
  }, []);
  
  const triggerStarPulse = useCallback(() => {
    setStarPulseKey(prev => prev + 1);
  }, []);
  
  const resetProgress = useCallback(() => {
    setTotalStars(0);
    setDisplayedStars(0);
    localStorage.removeItem('solitaire_total_stars');
  }, []);
  
  // Computed unlocks
  const collectionsUnlocked = playerLevel >= COLLECTIONS_REQUIRED_LEVEL;
  const leaderboardUnlocked = playerLevel >= LEADERBOARD_REQUIRED_LEVEL;
  
  return {
    totalStars,
    displayedStars,
    starPulseKey,
    collectionsUnlocked,
    leaderboardUnlocked,
    addStars,
    setDisplayedStars,
    triggerStarPulse,
    resetProgress,
  };
}
