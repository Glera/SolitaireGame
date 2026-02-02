/**
 * Hook for bottom button bar state and handlers
 * Manages: Undo, Hint, Daily Quests, Shop, Collections, Leaderboard buttons
 */

import { useCallback } from 'react';

export interface BottomButtonsConfig {
  // Undo
  canUndo: boolean;
  undo: () => void;
  
  // Hint
  getHint: () => void;
  clearHint: () => void;
  
  // Daily Quests
  dailyQuestsCompleted: number;
  dailyQuestsTotal: number;
  
  // Shop
  isSubscribed: boolean;
  
  // Collections
  collectionsUnlocked: boolean;
  collectionsCompleted: number;
  collectionsTotal: number;
  hasNewCollectionItem: boolean;
  allCollectionsRewarded: boolean;
  collectionButtonPulse: boolean;
  
  // Leaderboard
  leaderboardUnlocked: boolean;
  leaderboardPosition: number;
  showOvertakenNotification: boolean;
  
  // Required levels for locked features
  collectionsRequiredLevel: number;
  leaderboardRequiredLevel: number;
}

export interface BottomButtonsHandlers {
  onUndoClick: () => void;
  onHintClick: () => void;
  onDailyQuestsClick: () => void;
  onShopClick: () => void;
  onCollectionsClick: () => void;
  onLeaderboardClick: () => void;
  onNewGameClick: () => void;
}

export function useBottomButtons(
  config: BottomButtonsConfig,
  setters: {
    setShowDailyQuests: (show: boolean) => void;
    setShowShop: (show: boolean) => void;
    setShowCollections: (show: boolean) => void;
    setShowLeaderboard: (show: boolean) => void;
    setShowLockedCollectionsPopup: (show: boolean) => void;
    setShowLockedLeaderboardPopup: (show: boolean) => void;
    setDisplayedStars: (stars: number) => void;
    clearNoMoves: () => void;
    setShowNewGameButton: (show: boolean) => void;
    setNoMovesShownOnce: (shown: boolean) => void;
    newGame: (mode: 'solvable' | 'random') => void;
  }
): BottomButtonsHandlers {
  const syncStars = useCallback(() => {
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setters.setDisplayedStars(actualTotal);
  }, [setters]);

  const onUndoClick = useCallback(() => {
    if (config.canUndo) {
      config.undo();
    }
  }, [config]);

  const onHintClick = useCallback(() => {
    config.getHint();
    setTimeout(() => config.clearHint(), 350);
  }, [config]);

  const onDailyQuestsClick = useCallback(() => {
    syncStars();
    setters.setShowDailyQuests(true);
  }, [syncStars, setters]);

  const onShopClick = useCallback(() => {
    syncStars();
    setters.setShowShop(true);
  }, [syncStars, setters]);

  const onCollectionsClick = useCallback(() => {
    if (!config.collectionsUnlocked) {
      setters.setShowLockedCollectionsPopup(true);
      return;
    }
    syncStars();
    setters.setShowCollections(true);
  }, [config.collectionsUnlocked, syncStars, setters]);

  const onLeaderboardClick = useCallback(() => {
    if (!config.leaderboardUnlocked) {
      setters.setShowLockedLeaderboardPopup(true);
      return;
    }
    setters.setShowLeaderboard(true);
  }, [config.leaderboardUnlocked, setters]);

  const onNewGameClick = useCallback(() => {
    setters.clearNoMoves();
    setters.setShowNewGameButton(false);
    setters.setNoMovesShownOnce(false);
    setters.newGame('solvable');
  }, [setters]);

  return {
    onUndoClick,
    onHintClick,
    onDailyQuestsClick,
    onShopClick,
    onCollectionsClick,
    onLeaderboardClick,
    onNewGameClick,
  };
}
