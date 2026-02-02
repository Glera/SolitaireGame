/**
 * useDebugActions Hook
 * 
 * Содержит все дебаг-функции для тестирования игры:
 * - Test Win
 * - Test Level Up
 * - Next Day (simulate day change)
 * - Start Dungeon Dig
 * - Reset All Progress
 */

import { useCallback } from 'react';
import { forceNextLevel, resetAllXP } from '../lib/solitaire/experienceManager';
import { getRewardStars } from './useDailyRewards';
import { 
  getTreasureHuntEvent, 
  saveTreasureHuntEvent,
  resetTreasureHuntEvent,
  TreasureHuntEvent
} from '../lib/liveops/treasureHunt';
import { 
  getDungeonDigEvent, 
  resetDungeonDigEvent,
  DungeonDigEvent
} from '../lib/liveops/dungeonDig';
import { resetPointsEvent } from '../lib/liveops/pointsEvent';
import { clearAllKeys } from '../lib/liveops/keyManager';
import { defaultCollections, Collection } from '../components/solitaire/Collections';
import { FlyingIcon } from './useCollections';

// All localStorage keys used in the game
const STORAGE_KEYS = [
  'solitaire_total_stars',
  'solitaire_daily_quests',
  'solitaire_daily_quests_date',
  'solitaire_aces_collected',
  'solitaire_monthly_progress',
  'solitaire_monthly_reward_claimed',
  'solitaire_daily_streak',
  'solitaire_last_login_date',
  'solitaire_collections',
  'solitaire_rewarded_collections',
  'solitaire_all_collections_rewarded',
  'solitaire_trophies',
  'solitaire_player_xp',
  'solitaire_leaderboard',
  'solitaire_leaderboard_position',
  'solitaire_season_info',
  'solitaire_season_stars',
  'solitaire_leaderboard_trophies',
  'solitaire_player_level',
  'solitaire_treasure_hunt_promo_shown',
  'solitaire_dungeon_dig_promo_shown',
  'solitaire_collections_unlock_shown',
  'solitaire_leaderboard_unlock_shown',
  'solitaire_promo_unlocked',
  'solitaire_first_win',
  'solitaire_next_event_type',
] as const;

export interface DebugActionsCallbacks {
  // Audio
  playSuccess: () => void;
  
  // Stars
  addStars: (amount: number) => void;
  resetStarsProgress: () => void;
  
  // Win screen
  setShowWinScreen: (show: boolean) => void;
  setPendingWinScreen: (pending: boolean) => void;
  flyingIconsLength: number;
  
  // Level up
  setPendingLevelUp: (level: number | null) => void;
  showPopupViaQueue: (popup: any) => void;
  starsPerLevelUp: number;
  
  // Daily quests
  setDailyQuests: React.Dispatch<React.SetStateAction<any[]>>;
  setAcesCollected: React.Dispatch<React.SetStateAction<number>>;
  resetDailyQuests: () => void;
  
  // Daily rewards
  dailyStreak: number;
  setDailyStreak: React.Dispatch<React.SetStateAction<number>>;
  setLastLoginDate: React.Dispatch<React.SetStateAction<string>>;
  setPendingStreak: React.Dispatch<React.SetStateAction<number>>;
  setPendingDailyReward: React.Dispatch<React.SetStateAction<number>>;
  
  // Collections
  collections: Collection[];
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  setRewardedCollections: React.Dispatch<React.SetStateAction<Set<string>>>;
  setAllCollectionsRewarded: React.Dispatch<React.SetStateAction<boolean>>;
  setNewItemsInCollections: React.Dispatch<React.SetStateAction<Set<string>>>;
  setNewItemIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setHasNewCollectionItem: React.Dispatch<React.SetStateAction<boolean>>;
  setCollectionsUnlockShown: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingCollectionsUnlock: React.Dispatch<React.SetStateAction<boolean>>;
  setCollectionsResetKey: React.Dispatch<React.SetStateAction<number>>;
  setFlyingIcons: React.Dispatch<React.SetStateAction<FlyingIcon[]>>;
  collectionsButtonRef: React.RefObject<HTMLButtonElement>;
  
  // Monthly
  setMonthlyProgress: React.Dispatch<React.SetStateAction<number>>;
  setMonthlyRewardClaimed: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Treasure Hunt
  treasureHuntEvent: TreasureHuntEvent;
  setTreasureHuntEvent: React.Dispatch<React.SetStateAction<TreasureHuntEvent>>;
  setTreasureHuntPromoShown: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingTreasureHuntPromo: React.Dispatch<React.SetStateAction<boolean>>;
  setTreasureHuntExpired: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Dungeon Dig
  dungeonDigEvent: DungeonDigEvent;
  setDungeonDigEvent: React.Dispatch<React.SetStateAction<DungeonDigEvent>>;
  setDungeonDigExpired: React.Dispatch<React.SetStateAction<boolean>>;
  resetDungeonDig: () => void;
  activateDungeonDigEvent: (level: number) => void;
  
  // Leaderboard
  setLeaderboardUnlockShown: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingLeaderboardUnlock: React.Dispatch<React.SetStateAction<boolean>>;
  resetLeaderboardData: () => void;
  
  // Shop
  setPromoUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingPromoUnlock: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Points Event
  setPointsEventState: React.Dispatch<React.SetStateAction<any>>;
  setPackRewardsQueue: React.Dispatch<React.SetStateAction<any[]>>;
  setShowPackPopup: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Events
  setNextEventType: React.Dispatch<React.SetStateAction<'treasure' | 'dungeon'>>;
  
  // Player
  playerLevel: number;
  setPlayerLevel: React.Dispatch<React.SetStateAction<number>>;
  
  // Game
  newGame: (mode?: any) => void;
}

export interface DebugActions {
  handleTestWin: () => void;
  handleTestLevelUp: () => void;
  handleNextDay: () => void;
  handleStartDungeonDig: () => void;
  handleResetAll: () => void;
  handleDropCollectionItem: () => void;
}

export function useDebugActions(callbacks: DebugActionsCallbacks): DebugActions {
  const {
    playSuccess,
    addStars,
    resetStarsProgress,
    setShowWinScreen,
    setPendingWinScreen,
    flyingIconsLength,
    setPendingLevelUp,
    showPopupViaQueue,
    starsPerLevelUp,
    setDailyQuests,
    setAcesCollected,
    resetDailyQuests,
    dailyStreak,
    setDailyStreak,
    setLastLoginDate,
    setPendingStreak,
    setPendingDailyReward,
    collections,
    setCollections,
    setRewardedCollections,
    setAllCollectionsRewarded,
    setNewItemsInCollections,
    setNewItemIds,
    setHasNewCollectionItem,
    setCollectionsUnlockShown,
    setPendingCollectionsUnlock,
    setCollectionsResetKey,
    setFlyingIcons,
    collectionsButtonRef,
    setMonthlyProgress,
    setMonthlyRewardClaimed,
    treasureHuntEvent,
    setTreasureHuntEvent,
    setTreasureHuntPromoShown,
    setPendingTreasureHuntPromo,
    setTreasureHuntExpired,
    dungeonDigEvent,
    setDungeonDigEvent,
    setDungeonDigExpired,
    resetDungeonDig,
    activateDungeonDigEvent,
    setLeaderboardUnlockShown,
    setPendingLeaderboardUnlock,
    resetLeaderboardData,
    setPromoUnlocked,
    setPendingPromoUnlock,
    setPointsEventState,
    setPackRewardsQueue,
    setShowPackPopup,
    setNextEventType,
    playerLevel,
    setPlayerLevel,
    newGame,
  } = callbacks;
  
  // Test win function
  const handleTestWin = useCallback(() => {
    playSuccess();
    addStars(50); // STARS_PER_WIN
    
    if (flyingIconsLength > 0) {
      setPendingWinScreen(true);
    } else {
      setShowWinScreen(true);
    }
  }, [playSuccess, addStars, flyingIconsLength, setPendingWinScreen, setShowWinScreen]);
  
  // Test level up function
  const handleTestLevelUp = useCallback(() => {
    const newLevel = forceNextLevel();
    setPendingLevelUp(newLevel);
    showPopupViaQueue({ type: 'levelUp', level: newLevel, stars: starsPerLevelUp });
  }, [setPendingLevelUp, showPopupViaQueue, starsPerLevelUp]);
  
  // Handle next day (simulate day change)
  const handleNextDay = useCallback(() => {
    // Reset daily quests progress (but keep monthly progress)
    setDailyQuests(prev => prev.map(quest => ({
      ...quest,
      current: 0,
      completed: false
    })));
    setAcesCollected(0);
    
    // Calculate next streak
    const newStreak = dailyStreak + 1;
    
    // Set pending streak and reward
    setPendingStreak(newStreak);
    setPendingDailyReward(getRewardStars(newStreak));
    
    // Show popup
    if (newStreak >= 2) {
      showPopupViaQueue({ type: 'streak', count: newStreak, stars: 0 });
    } else {
      showPopupViaQueue({ type: 'dailyReward', day: newStreak, stars: getRewardStars(newStreak) });
    }
    
    // Simulate yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setLastLoginDate(yesterday.toDateString());
    setDailyStreak(newStreak - 1);
    
    newGame('solvable');
  }, [
    setDailyQuests, setAcesCollected, dailyStreak, setPendingStreak,
    setPendingDailyReward, showPopupViaQueue, setLastLoginDate, setDailyStreak, newGame
  ]);
  
  // Start Dungeon Dig event
  const handleStartDungeonDig = useCallback(() => {
    // If Treasure Hunt is active, deactivate it
    if (treasureHuntEvent.active) {
      const updatedTreasureHunt = { 
        ...treasureHuntEvent, 
        active: false,
        keys: 0
      };
      saveTreasureHuntEvent(updatedTreasureHunt);
      setTreasureHuntEvent(updatedTreasureHunt);
      clearAllKeys();
      setTreasureHuntExpired(false);
    }
    
    // Reset and activate Dungeon Dig
    resetDungeonDig();
    activateDungeonDigEvent(playerLevel);
    
    // Set next event
    setNextEventType('treasure');
    localStorage.setItem('solitaire_next_event_type', 'treasure');
    
    newGame('solvable');
  }, [
    treasureHuntEvent, setTreasureHuntEvent, setTreasureHuntExpired,
    resetDungeonDig, activateDungeonDigEvent, playerLevel, setNextEventType, newGame
  ]);
  
  // Reset ALL player progress
  const handleResetAll = useCallback(() => {
    // Reset stars
    resetStarsProgress();
    
    // Reset daily quests
    resetDailyQuests();
    
    // Reset collections
    setCollections(defaultCollections);
    setRewardedCollections(new Set());
    setAllCollectionsRewarded(false);
    setNewItemsInCollections(new Set());
    setNewItemIds(new Set());
    setHasNewCollectionItem(false);
    
    // Reset player XP/level
    resetAllXP();
    
    // Reset monthly
    setMonthlyProgress(0);
    setMonthlyRewardClaimed(false);
    
    // Reset daily streak
    setDailyStreak(0);
    setLastLoginDate('');
    setPendingDailyReward(0);
    setPendingStreak(0);
    
    // Clear all localStorage
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    
    // Reset Treasure Hunt
    resetTreasureHuntEvent();
    setTreasureHuntEvent(getTreasureHuntEvent());
    setTreasureHuntPromoShown(false);
    setPendingTreasureHuntPromo(false);
    
    // Reset Dungeon Dig
    resetDungeonDigEvent();
    setDungeonDigEvent(getDungeonDigEvent());
    setDungeonDigExpired(false);
    
    // Reset unlocks
    setCollectionsUnlockShown(false);
    setPendingCollectionsUnlock(false);
    setLeaderboardUnlockShown(false);
    setPendingLeaderboardUnlock(false);
    setPromoUnlocked(false);
    setPendingPromoUnlock(false);
    
    setPlayerLevel(1);
    
    // Reset Points Event
    const newPointsState = resetPointsEvent();
    setPointsEventState(newPointsState);
    setPackRewardsQueue([]);
    setShowPackPopup(false);
    
    // Reset event rotation
    setNextEventType('treasure');
    
    // Reset leaderboard
    resetLeaderboardData();
    
    // Trigger collections reset
    setCollectionsResetKey(prev => prev + 1);
  }, [
    resetStarsProgress, resetDailyQuests,
    setCollections, setRewardedCollections, setAllCollectionsRewarded,
    setNewItemsInCollections, setNewItemIds, setHasNewCollectionItem,
    setMonthlyProgress, setMonthlyRewardClaimed,
    setDailyStreak, setLastLoginDate, setPendingDailyReward, setPendingStreak,
    setTreasureHuntEvent, setTreasureHuntPromoShown, setPendingTreasureHuntPromo,
    setDungeonDigEvent, setDungeonDigExpired,
    setCollectionsUnlockShown, setPendingCollectionsUnlock,
    setLeaderboardUnlockShown, setPendingLeaderboardUnlock,
    setPromoUnlocked, setPendingPromoUnlock,
    setPlayerLevel, setPointsEventState, setPackRewardsQueue, setShowPackPopup,
    setNextEventType, resetLeaderboardData, setCollectionsResetKey
  ]);
  
  // Drop a unique collection item (debug)
  const handleDropCollectionItem = useCallback(() => {
    // Find first incomplete collection
    let targetCollection = null;
    const uncollectedItems: Array<{
      collectionId: string;
      itemId: string;
      icon: string;
      rarity: number;
    }> = [];
    
    for (const collection of collections) {
      const hasUncollected = collection.items.some(item => !item.collected);
      if (hasUncollected) {
        targetCollection = collection;
        break;
      }
    }
    
    if (!targetCollection) {
      console.log('All collection items already collected!');
      return;
    }
    
    // Get uncollected items from target collection
    for (const item of targetCollection.items) {
      if (!item.collected) {
        uncollectedItems.push({
          collectionId: targetCollection.id,
          itemId: item.id,
          icon: item.icon,
          rarity: item.rarity || 1
        });
      }
    }
    
    // Pick random uncollected item
    const randomItem = uncollectedItems[Math.floor(Math.random() * uncollectedItems.length)];
    
    // Mark as collected immediately
    setCollections(prev => prev.map(collection => {
      if (collection.id === randomItem.collectionId) {
        return {
          ...collection,
          items: collection.items.map(item => 
            item.id === randomItem.itemId ? { ...item, collected: true } : item
          )
        };
      }
      return collection;
    }));
    
    // Get button position
    const buttonRect = collectionsButtonRef.current?.getBoundingClientRect();
    if (!buttonRect) return;
    
    // Start from center of screen
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;
    
    // Create flying icon
    const drop: FlyingIcon = {
      id: `debug-drop-${Date.now()}-${Math.random()}`,
      icon: randomItem.icon,
      itemId: randomItem.itemId,
      collectionId: randomItem.collectionId,
      isDuplicate: false,
      startX,
      startY,
      rarity: randomItem.rarity
    };
    
    setFlyingIcons(prev => [...prev, drop]);
  }, [collections, setCollections, collectionsButtonRef, setFlyingIcons]);
  
  return {
    handleTestWin,
    handleTestLevelUp,
    handleNextDay,
    handleStartDungeonDig,
    handleResetAll,
    handleDropCollectionItem,
  };
}
