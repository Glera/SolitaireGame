/**
 * useBoosters Hook
 * 
 * Manages consumable boosters: Undo, Hint, and Joker
 * - Persisted to localStorage
 * - Can be earned, purchased, or added via debug
 * 
 * Hint booster special logic:
 * - First hint click costs 1 booster and activates "unlimited hints" mode
 * - While active, player can get more hints for free (shows ∞ on button)
 * - Mode deactivates when any card leaves the playing field (to foundation)
 * 
 * Joker booster:
 * - Places a wild card that accepts any card on top
 * - Used when no moves available
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_UNDO = 'solitaire_booster_undo';
const STORAGE_KEY_HINT = 'solitaire_booster_hint';
const STORAGE_KEY_JOKER = 'solitaire_booster_joker';

// Starting boosters for new players
const INITIAL_UNDO_COUNT = 3;
const INITIAL_HINT_COUNT = 5;
const INITIAL_JOKER_COUNT = 1;

export interface BoostersState {
  undoCount: number;
  hintCount: number;
  jokerCount: number;
  hintActive: boolean; // true = unlimited hints mode active (shows ∞)
  
  // Use boosters (returns false if none available)
  useUndo: () => boolean;
  useHint: () => boolean; // First call costs 1, subsequent are free until deactivateHint
  useJoker: () => boolean;
  
  // Deactivate hint mode (call when card leaves the field)
  deactivateHint: () => void;
  
  // Add boosters
  addUndo: (count?: number) => void;
  addHint: (count?: number) => void;
  addJoker: (count?: number) => void;
  
  // Check availability
  canUseUndo: boolean;
  canUseHint: boolean;
  canUseJoker: boolean;
  
  // Reset (for debug)
  resetBoosters: () => void;
}

export function useBoosters(): BoostersState {
  // Initialize from localStorage or defaults
  const [undoCount, setUndoCount] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_UNDO);
    if (saved !== null) {
      return parseInt(saved, 10);
    }
    // First time - give starting boosters
    localStorage.setItem(STORAGE_KEY_UNDO, INITIAL_UNDO_COUNT.toString());
    return INITIAL_UNDO_COUNT;
  });
  
  const [hintCount, setHintCount] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HINT);
    if (saved !== null) {
      return parseInt(saved, 10);
    }
    // First time - give starting boosters
    localStorage.setItem(STORAGE_KEY_HINT, INITIAL_HINT_COUNT.toString());
    return INITIAL_HINT_COUNT;
  });
  
  const [jokerCount, setJokerCount] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_JOKER);
    if (saved !== null) {
      return parseInt(saved, 10);
    }
    // First time - give starting boosters
    localStorage.setItem(STORAGE_KEY_JOKER, INITIAL_JOKER_COUNT.toString());
    return INITIAL_JOKER_COUNT;
  });
  
  // Hint active state - when true, hints are free and show ∞
  const [hintActive, setHintActive] = useState(false);
  
  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_UNDO, undoCount.toString());
  }, [undoCount]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HINT, hintCount.toString());
  }, [hintCount]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_JOKER, jokerCount.toString());
  }, [jokerCount]);
  
  // Use undo booster
  const useUndo = useCallback((): boolean => {
    if (undoCount <= 0) return false;
    setUndoCount(prev => prev - 1);
    return true;
  }, [undoCount]);
  
  // Use hint booster
  // First use costs 1 booster and activates unlimited mode
  // Subsequent uses are free until deactivateHint is called
  const useHint = useCallback((): boolean => {
    // If hint is already active, it's free
    if (hintActive) return true;
    
    // Otherwise, need to spend a booster
    if (hintCount <= 0) return false;
    setHintCount(prev => prev - 1);
    setHintActive(true);
    return true;
  }, [hintCount, hintActive]);
  
  // Use joker booster
  const useJoker = useCallback((): boolean => {
    if (jokerCount <= 0) return false;
    setJokerCount(prev => prev - 1);
    return true;
  }, [jokerCount]);
  
  // Deactivate hint mode (call when card leaves the field)
  const deactivateHint = useCallback(() => {
    setHintActive(false);
  }, []);
  
  // Add undo boosters
  const addUndo = useCallback((count: number = 1) => {
    setUndoCount(prev => prev + count);
  }, []);
  
  // Add hint boosters
  const addHint = useCallback((count: number = 1) => {
    setHintCount(prev => prev + count);
  }, []);
  
  // Add joker boosters
  const addJoker = useCallback((count: number = 1) => {
    setJokerCount(prev => prev + count);
  }, []);
  
  // Reset boosters to initial values
  const resetBoosters = useCallback(() => {
    setUndoCount(INITIAL_UNDO_COUNT);
    setHintCount(INITIAL_HINT_COUNT);
    setJokerCount(INITIAL_JOKER_COUNT);
    setHintActive(false);
  }, []);
  
  return {
    undoCount,
    hintCount,
    jokerCount,
    hintActive,
    useUndo,
    useHint,
    useJoker,
    deactivateHint,
    addUndo,
    addHint,
    addJoker,
    canUseUndo: undoCount > 0,
    canUseHint: hintActive || hintCount > 0, // Can use if active OR have boosters
    canUseJoker: jokerCount > 0,
    resetBoosters,
  };
}

// Export storage keys for reset functionality
export const BOOSTER_STORAGE_KEYS = [STORAGE_KEY_UNDO, STORAGE_KEY_HINT, STORAGE_KEY_JOKER];
