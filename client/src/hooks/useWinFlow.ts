/**
 * useWinFlow Hook
 * 
 * Управляет потоком после победы в игре:
 * - Claim points event rewards
 * - Level up flow
 * - Daily quests
 * - Collections rewards
 * - Unlock popups
 * - Event promos
 * - Start new game
 */

import { useCallback } from 'react';
import { usePopupQueue, WinFlowPopup } from '../lib/stores/usePopupQueue';
import { 
  getPointsEventState, 
  hasPendingRewards, 
  claimPendingReward,
  generatePackItems,
  resetPointsEvent,
  PackRarity,
  PackItem
} from '../lib/liveops/pointsEvent';
import { 
  isEventAvailable, 
  activateTreasureHunt,
  TreasureHuntEvent
} from '../lib/liveops/treasureHunt';
import { 
  activateDungeonDig,
  DungeonDigEvent
} from '../lib/liveops/dungeonDig';
import { Collection } from '../components/solitaire/Collections';
import { STARS_PER_LEVELUP, COLLECTIONS_REQUIRED_LEVEL, LEADERBOARD_REQUIRED_LEVEL } from './useGameProgress';

// Type for skip checks in proceedToCollectionsOrNewGame
export type SkipChecks = {
  collections?: boolean;
  leaderboard?: boolean;
  promo?: boolean;
  treasureHunt?: boolean;
  dungeonDig?: boolean;
};

export interface WinFlowCallbacks {
  // Stars
  addStars: (amount: number) => void;
  setDisplayedStars: React.Dispatch<React.SetStateAction<number>>;
  launchTreasureStars: (count: number, startPos: { x: number; y: number }) => void;
  
  // Win screen
  setShowWinScreen: (show: boolean) => void;
  
  // Daily quests
  dailyQuests: any[];
  setDailyQuests: React.Dispatch<React.SetStateAction<any[]>>;
  acesCollected: number;
  setAcesCollected: React.Dispatch<React.SetStateAction<number>>;
  openDailyQuests: () => void;
  closeDailyQuests: () => void;
  dailyQuestsAfterWin: boolean;
  setDailyQuestsAfterWin: (afterWin: boolean) => void;
  
  // Points event
  setPointsEventState: React.Dispatch<React.SetStateAction<any>>;
  setPackRewardsQueue: React.Dispatch<React.SetStateAction<Array<{ rarity: PackRarity; items: PackItem[]; sourcePosition?: { x: number; y: number } }>>>;
  setShowPackPopup: React.Dispatch<React.SetStateAction<boolean>>;
  miniatureContainerRef: React.RefObject<HTMLDivElement>;
  setAutoClaimingRewards: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Level up
  pendingLevelUp: number | null;
  setPendingLevelUp: React.Dispatch<React.SetStateAction<number | null>>;
  setPlayerLevel: React.Dispatch<React.SetStateAction<number>>;
  playerLevel: number;
  
  // Collections
  collections: Collection[];
  rewardedCollections: Set<string>;
  collectionsUnlocked: boolean;
  collectionsUnlockShown: boolean;
  setCollectionsUnlockShown: React.Dispatch<React.SetStateAction<boolean>>;
  pendingCollectionsUnlock: boolean;
  setPendingCollectionsUnlock: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingCollectionRewards: React.Dispatch<React.SetStateAction<string[]>>;
  setCollectionsAfterWin: React.Dispatch<React.SetStateAction<boolean>>;
  openCollections: () => void;
  
  // Leaderboard
  leaderboardUnlockShown: boolean;
  setLeaderboardUnlockShown: React.Dispatch<React.SetStateAction<boolean>>;
  pendingLeaderboardUnlock: boolean;
  setPendingLeaderboardUnlock: React.Dispatch<React.SetStateAction<boolean>>;
  pendingLeaderboardShow: boolean;
  setPendingLeaderboardShow: React.Dispatch<React.SetStateAction<boolean>>;
  openLeaderboard: () => void;
  pendingAfterLeaderboardRef: React.MutableRefObject<(() => void) | null>;
  initializeLeaderboardData: (stars: number) => void;
  tryShowLeaderboard: (afterCallback?: () => void) => boolean;
  
  // Shop/Promo
  promoUnlocked: boolean;
  setPromoUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  pendingPromoUnlock: boolean;
  setPendingPromoUnlock: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Events
  treasureHuntEvent: TreasureHuntEvent;
  setTreasureHuntEvent: React.Dispatch<React.SetStateAction<TreasureHuntEvent>>;
  dungeonDigEvent: DungeonDigEvent;
  setDungeonDigEvent: React.Dispatch<React.SetStateAction<DungeonDigEvent>>;
  treasureHuntExpired: boolean;
  dungeonDigExpired: boolean;
  treasureHuntPromoShown: boolean;
  setTreasureHuntPromoShown: React.Dispatch<React.SetStateAction<boolean>>;
  pendingTreasureHuntPromo: boolean;
  setPendingTreasureHuntPromo: React.Dispatch<React.SetStateAction<boolean>>;
  pendingDungeonDigPromo: boolean;
  setPendingDungeonDigPromo: React.Dispatch<React.SetStateAction<boolean>>;
  nextEventType: 'treasure' | 'dungeon';
  keysDistributedRef: React.MutableRefObject<boolean>;
  shovelsDistributedRef: React.MutableRefObject<boolean>;
  resetTreasureHunt: () => void;
  resetDungeonDig: () => void;
  activateTreasureHuntEvent: (level: number) => void;
  activateDungeonDigEvent: (level: number) => void;
  
  // Daily rewards
  tryShowDailyReward: () => boolean;
  
  // Game
  newGame: (mode?: 'random' | 'solvable' | 'unsolvable') => void;
  clearNoMoves: () => void;
  setShowNewGameButton: React.Dispatch<React.SetStateAction<boolean>>;
  setNoMovesShownOnce: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Refs (shared with GameBoard)
  dailyQuestsShownThisWinRef: React.MutableRefObject<boolean>;
  autoClaimingRewardsRef: React.MutableRefObject<boolean>;
  isClaimingRewardRef: React.MutableRefObject<boolean>;
}

export interface WinFlowActions {
  handleWinComplete: () => void;
  handleLevelUpComplete: () => void;
  handleDailyQuestsClose: () => void;
  handleCollectionsUnlockClose: () => void;
  handleLeaderboardUnlockClose: () => void;
  handlePromoUnlockClose: () => void;
  handleTreasureHuntPromoClose: () => void;
  handleDungeonDigPromoClose: () => void;
  tryClaimPointsEventReward: () => boolean;
  proceedAfterPointsEventRewards: () => void;
  proceedToDailyQuests: (skipChecks?: SkipChecks) => void;
  proceedToCollectionsOrNewGame: (skipChecks?: SkipChecks) => void;
}

export function useWinFlow(callbacks: WinFlowCallbacks): WinFlowActions {
  const popupQueue = usePopupQueue();
  
  // Use refs from callbacks (shared with GameBoard)
  const { dailyQuestsShownThisWinRef, autoClaimingRewardsRef, isClaimingRewardRef } = callbacks;
  
  // Helper: show popup via queue
  const showPopupViaQueue = useCallback((popup: WinFlowPopup) => {
    const currentState = usePopupQueue.getState();
    if (currentState.current?.type !== popup.type && !currentState.queue.some(p => p.type === popup.type)) {
      currentState.enqueue(popup);
      const stateAfterEnqueue = usePopupQueue.getState();
      if (!stateAfterEnqueue.isProcessing) {
        stateAfterEnqueue.startProcessing();
      }
    }
  }, []);
  
  // Helper: show event promo
  const showEventPromoViaQueue = useCallback((type: 'treasureHuntPromo' | 'dungeonDigPromo') => {
    showPopupViaQueue({ type });
  }, [showPopupViaQueue]);
  
  // Update daily quest progress on win
  // Uses functional update to ensure we have the latest quest state (avoid stale closure)
  const updateDailyQuestsOnWin = useCallback(() => {
    const { setDailyQuests, setAcesCollected, addStars } = callbacks;
    
    const acesInGame = 4;
    
    // Use functional update for aces to get current value
    let newAcesTotal = 0;
    setAcesCollected(prev => {
      newAcesTotal = prev + acesInGame;
      return newAcesTotal;
    });
    
    // Use functional update for quests to avoid stale closure issue
    let starsToAdd = 0;
    setDailyQuests(prevQuests => {
      const updatedQuests = prevQuests.map(quest => {
        if ((quest.id === 'daily-games' || quest.id === 'daily-wins') && !quest.completed) {
          const newCurrent = quest.current + 1;
          const completed = newCurrent >= quest.target;
          if (completed) starsToAdd += quest.reward;
          return { ...quest, current: newCurrent, completed };
        }
        if (quest.id === 'daily-aces' && !quest.completed) {
          // Read aces from localStorage to get the latest value
          const currentAces = parseInt(localStorage.getItem('solitaire_aces_collected') || '0', 10) + acesInGame;
          const newCurrent = Math.min(currentAces, quest.target);
          const completed = newCurrent >= quest.target;
          if (completed) starsToAdd += quest.reward;
          return { ...quest, current: newCurrent, completed };
        }
        return quest;
      });
      
      // Award stars after updating quests
      if (starsToAdd > 0) {
        // Use setTimeout to ensure state is updated before adding stars
        setTimeout(() => addStars(starsToAdd), 0);
      }
      
      return updatedQuests;
    });
  }, [callbacks]);
  
  // Proceed to collections or new game
  const proceedToCollectionsOrNewGame = useCallback((skipChecks: SkipChecks = {}) => {
    const {
      collections, rewardedCollections, setDisplayedStars,
      setPendingCollectionRewards, setCollectionsAfterWin, openCollections,
      pendingCollectionsUnlock, pendingLeaderboardUnlock,
      tryShowDailyReward, pendingPromoUnlock,
      pendingTreasureHuntPromo, setPendingTreasureHuntPromo,
      pendingDungeonDigPromo, setPendingDungeonDigPromo,
      playerLevel, treasureHuntEvent, dungeonDigEvent,
      treasureHuntExpired, dungeonDigExpired, nextEventType,
      clearNoMoves, setShowNewGameButton, setNoMovesShownOnce, newGame
    } = callbacks;
    
    // Find unrewarded collections
    const unrewardedCollections = collections
      .filter(c => c.items.every(i => i.collected) && !rewardedCollections.has(c.id))
      .map(c => c.id);
    
    if (unrewardedCollections.length > 0) {
      const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
      setDisplayedStars(actualTotal);
      setPendingCollectionRewards(unrewardedCollections);
      setCollectionsAfterWin(true);
      openCollections();
      return;
    }
    
    if (!skipChecks.collections && pendingCollectionsUnlock) {
      showPopupViaQueue({ type: 'unlockCollections' });
      return;
    }
    
    if (!skipChecks.leaderboard && pendingLeaderboardUnlock) {
      showPopupViaQueue({ type: 'unlockTournament' });
      return;
    }
    
    if (tryShowDailyReward()) return;
    
    if (!skipChecks.promo && pendingPromoUnlock) {
      showPopupViaQueue({ type: 'unlockPromo' });
      return;
    }
    
    if (!skipChecks.treasureHunt && pendingTreasureHuntPromo) {
      setPendingTreasureHuntPromo(false);
      showEventPromoViaQueue('treasureHuntPromo');
      return;
    }
    if (!skipChecks.dungeonDig && pendingDungeonDigPromo) {
      setPendingDungeonDigPromo(false);
      showEventPromoViaQueue('dungeonDigPromo');
      return;
    }
    
    // Check event rotation
    const eventsUnlocked = isEventAvailable(playerLevel);
    const noActiveEvent = !treasureHuntEvent.active && !dungeonDigEvent.active;
    const treasureFullyEnded = treasureHuntExpired && treasureHuntEvent.keys === 0;
    const dungeonFullyEnded = dungeonDigExpired && dungeonDigEvent.shovels === 0;
    
    if (eventsUnlocked && noActiveEvent && (treasureFullyEnded || dungeonFullyEnded)) {
      if (nextEventType === 'dungeon') {
        showEventPromoViaQueue('dungeonDigPromo');
        return;
      } else if (nextEventType === 'treasure') {
        showEventPromoViaQueue('treasureHuntPromo');
        return;
      }
    }
    
    // Start new game
    clearNoMoves();
    setShowNewGameButton(false);
    setNoMovesShownOnce(false);
    newGame('solvable');
  }, [callbacks, showPopupViaQueue, showEventPromoViaQueue]);
  
  // Proceed to daily quests
  const proceedToDailyQuests = useCallback((skipChecks?: SkipChecks) => {
    const { dailyQuests, setDisplayedStars, setDailyQuestsAfterWin, openDailyQuests, tryShowLeaderboard } = callbacks;
    
    const allCompleted = dailyQuests.every((quest: any) => quest.completed);
    
    if (allCompleted) {
      if (tryShowLeaderboard(() => proceedToCollectionsOrNewGame(skipChecks))) {
        return;
      }
      proceedToCollectionsOrNewGame(skipChecks);
      return;
    }
    
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setDisplayedStars(actualTotal);
    
    dailyQuestsShownThisWinRef.current = true;
    setDailyQuestsAfterWin(true);
    openDailyQuests();
  }, [callbacks, proceedToCollectionsOrNewGame]);
  
  // Proceed after points event rewards
  const proceedAfterPointsEventRewards = useCallback(() => {
    const { pendingLevelUp } = callbacks;
    
    if (pendingLevelUp !== null) {
      showPopupViaQueue({ type: 'levelUp', level: pendingLevelUp, stars: STARS_PER_LEVELUP });
      return;
    }
    
    proceedToDailyQuests();
  }, [callbacks, showPopupViaQueue, proceedToDailyQuests]);
  
  // Try to claim points event reward
  const tryClaimPointsEventReward = useCallback((): boolean => {
    const {
      setPointsEventState, addStars, launchTreasureStars,
      setPackRewardsQueue, setShowPackPopup, miniatureContainerRef,
      collections, setAutoClaimingRewards
    } = callbacks;
    
    if (isClaimingRewardRef.current) return false;
    
    const currentState = getPointsEventState();
    if (!hasPendingRewards(currentState)) return false;
    
    isClaimingRewardRef.current = true;
    const pendingCount = currentState.pendingRewards.length;
    
    const claimResult = claimPendingReward();
    if (!claimResult) {
      isClaimingRewardRef.current = false;
      return false;
    }
    
    setPointsEventState({ ...claimResult.state });
    const reward = claimResult.reward;
    
    // Calculate position
    const containerRect = miniatureContainerRef.current?.getBoundingClientRect();
    const miniatureWidth = 36;
    const miniatureHeight = 48;
    const gap = 4;
    const lastIndex = Math.min(pendingCount - 1, 3);
    const col = lastIndex;
    
    const startX = containerRect 
      ? containerRect.left + (col * (miniatureWidth + gap)) + miniatureWidth / 2
      : window.innerWidth - 100;
    const startY = containerRect 
      ? containerRect.top + miniatureHeight / 2 
      : 150;
    
    if (reward.type === 'stars' && reward.stars) {
      addStars(reward.stars);
      launchTreasureStars(reward.stars, { x: startX, y: startY });
      
      setTimeout(() => {
        isClaimingRewardRef.current = false;
        if (autoClaimingRewardsRef.current) {
          const hasMore = tryClaimPointsEventReward();
          if (!hasMore) {
            autoClaimingRewardsRef.current = false;
            setAutoClaimingRewards(false);
            proceedAfterPointsEventRewards();
          }
        }
      }, 1650);
    } else if (reward.type === 'pack' && reward.packRarity) {
      const items = generatePackItems(reward.packRarity, collections);
      setPackRewardsQueue(prev => [...prev, { rarity: reward.packRarity!, items, sourcePosition: { x: startX, y: startY } }]);
      setTimeout(() => {
        isClaimingRewardRef.current = false;
        setShowPackPopup(true);
      }, 100);
    }
    
    return true;
  }, [callbacks, proceedAfterPointsEventRewards]);
  
  // Handle win complete
  const handleWinComplete = useCallback(() => {
    const {
      setShowWinScreen, setDisplayedStars, collectionsUnlocked,
      promoUnlocked, setPendingPromoUnlock, setAutoClaimingRewards
    } = callbacks;
    
    setShowWinScreen(false);
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setDisplayedStars(actualTotal);
    
    updateDailyQuestsOnWin();
    
    if (collectionsUnlocked && !promoUnlocked) {
      setPendingPromoUnlock(true);
    }
    
    autoClaimingRewardsRef.current = true;
    setAutoClaimingRewards(true);
    const hasReward = tryClaimPointsEventReward();
    
    if (!hasReward) {
      autoClaimingRewardsRef.current = false;
      setAutoClaimingRewards(false);
      proceedAfterPointsEventRewards();
    }
  }, [callbacks, updateDailyQuestsOnWin, tryClaimPointsEventReward, proceedAfterPointsEventRewards]);
  
  // Handle level up complete
  const handleLevelUpComplete = useCallback(() => {
    const {
      pendingLevelUp, setPendingLevelUp, setPlayerLevel, setDisplayedStars,
      collectionsUnlockShown, setPendingCollectionsUnlock, setPointsEventState,
      leaderboardUnlockShown, setPendingLeaderboardUnlock, initializeLeaderboardData,
      treasureHuntEvent, dungeonDigEvent, nextEventType,
      setTreasureHuntEvent, setDungeonDigEvent,
      keysDistributedRef, shovelsDistributedRef,
      treasureHuntPromoShown, setPendingTreasureHuntPromo, setPendingDungeonDigPromo,
      tryShowDailyReward
    } = callbacks;
    
    const levelFromQueue = popupQueue.current?.type === 'levelUp' ? popupQueue.current.level : null;
    const newLevel = levelFromQueue ?? pendingLevelUp;
    
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setDisplayedStars(actualTotal);
    
    popupQueue.dismiss();
    
    let shouldShowCollectionsUnlock = false;
    let shouldShowLeaderboardUnlock = false;
    
    if (newLevel !== null) {
      setPlayerLevel(newLevel);
      localStorage.setItem('solitaire_player_level', newLevel.toString());
      
      if (newLevel >= COLLECTIONS_REQUIRED_LEVEL && !collectionsUnlockShown) {
        setPendingCollectionsUnlock(true);
        shouldShowCollectionsUnlock = true;
        const freshPointsState = resetPointsEvent();
        setPointsEventState(freshPointsState);
      }
      
      if (newLevel >= LEADERBOARD_REQUIRED_LEVEL && !leaderboardUnlockShown) {
        setPendingLeaderboardUnlock(true);
        shouldShowLeaderboardUnlock = true;
        initializeLeaderboardData(0);
      }
      
      const noActiveEvent = !treasureHuntEvent.active && !dungeonDigEvent.active;
      const eventsUnlocked = isEventAvailable(newLevel);
      
      if (eventsUnlocked && noActiveEvent) {
        if (nextEventType === 'treasure') {
          const updatedEvent = activateTreasureHunt(newLevel);
          if (updatedEvent?.activated) {
            setTreasureHuntEvent(updatedEvent);
            keysDistributedRef.current = false;
            if (!treasureHuntPromoShown) {
              setPendingTreasureHuntPromo(true);
            }
          }
        } else {
          const updatedEvent = activateDungeonDig(newLevel);
          if (updatedEvent?.activated) {
            setDungeonDigEvent(updatedEvent);
            shovelsDistributedRef.current = false;
            setPendingDungeonDigPromo(true);
          }
        }
      }
    }
    setPendingLevelUp(null);
    
    if (shouldShowCollectionsUnlock) {
      showPopupViaQueue({ type: 'unlockCollections' });
      return;
    }
    
    if (shouldShowLeaderboardUnlock) {
      showPopupViaQueue({ type: 'unlockTournament' });
      return;
    }
    
    if (tryShowDailyReward()) return;
    
    const { pendingTreasureHuntPromo, pendingDungeonDigPromo } = callbacks;
    if (pendingTreasureHuntPromo) {
      setPendingTreasureHuntPromo(false);
      showEventPromoViaQueue('treasureHuntPromo');
      return;
    }
    if (pendingDungeonDigPromo) {
      setPendingDungeonDigPromo(false);
      showEventPromoViaQueue('dungeonDigPromo');
      return;
    }
    
    proceedToDailyQuests();
  }, [callbacks, popupQueue, showPopupViaQueue, showEventPromoViaQueue, proceedToDailyQuests]);
  
  // Handle daily quests close
  const handleDailyQuestsClose = useCallback(() => {
    const { setDisplayedStars, closeDailyQuests, dailyQuestsAfterWin, setDailyQuestsAfterWin, tryShowLeaderboard } = callbacks;
    
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setDisplayedStars(actualTotal);
    closeDailyQuests();
    
    if (dailyQuestsAfterWin) {
      setDailyQuestsAfterWin(false);
      if (tryShowLeaderboard(() => proceedToCollectionsOrNewGame())) {
        return;
      }
      proceedToCollectionsOrNewGame({ collections: true, leaderboard: true });
    } else {
      tryShowLeaderboard();
    }
  }, [callbacks, proceedToCollectionsOrNewGame]);
  
  // Handle collections unlock close
  const handleCollectionsUnlockClose = useCallback(() => {
    const {
      setCollectionsUnlockShown, setPendingCollectionsUnlock,
      pendingLeaderboardUnlock, tryShowDailyReward,
      pendingTreasureHuntPromo, setPendingTreasureHuntPromo,
      pendingDungeonDigPromo, setPendingDungeonDigPromo
    } = callbacks;
    
    popupQueue.dismiss();
    setCollectionsUnlockShown(true);
    localStorage.setItem('solitaire_collections_unlock_shown', 'true');
    setPendingCollectionsUnlock(false);
    
    if (pendingLeaderboardUnlock) {
      showPopupViaQueue({ type: 'unlockTournament' });
      return;
    }
    
    if (tryShowDailyReward()) return;
    
    if (pendingTreasureHuntPromo) {
      setPendingTreasureHuntPromo(false);
      showEventPromoViaQueue('treasureHuntPromo');
      return;
    }
    if (pendingDungeonDigPromo) {
      setPendingDungeonDigPromo(false);
      showEventPromoViaQueue('dungeonDigPromo');
      return;
    }
    
    if (dailyQuestsShownThisWinRef.current) {
      proceedToCollectionsOrNewGame({ collections: true });
    } else {
      proceedToDailyQuests();
    }
  }, [callbacks, popupQueue, showPopupViaQueue, showEventPromoViaQueue, proceedToCollectionsOrNewGame, proceedToDailyQuests]);
  
  // Handle leaderboard unlock close
  const handleLeaderboardUnlockClose = useCallback(() => {
    const {
      setLeaderboardUnlockShown, setPendingLeaderboardUnlock,
      pendingLeaderboardShow, setPendingLeaderboardShow, openLeaderboard,
      pendingAfterLeaderboardRef, tryShowDailyReward,
      pendingPromoUnlock, pendingTreasureHuntPromo, setPendingTreasureHuntPromo,
      pendingDungeonDigPromo, setPendingDungeonDigPromo
    } = callbacks;
    
    popupQueue.dismiss();
    setLeaderboardUnlockShown(true);
    localStorage.setItem('solitaire_leaderboard_unlock_shown', 'true');
    setPendingLeaderboardUnlock(false);
    
    if (pendingLeaderboardShow) {
      setPendingLeaderboardShow(false);
      openLeaderboard();
      pendingAfterLeaderboardRef.current = () => {
        if (tryShowDailyReward()) return;
        if (pendingPromoUnlock) { showPopupViaQueue({ type: 'unlockPromo' }); return; }
        if (pendingTreasureHuntPromo) { setPendingTreasureHuntPromo(false); showEventPromoViaQueue('treasureHuntPromo'); return; }
        if (pendingDungeonDigPromo) { setPendingDungeonDigPromo(false); showEventPromoViaQueue('dungeonDigPromo'); return; }
        if (dailyQuestsShownThisWinRef.current) {
          proceedToCollectionsOrNewGame({ leaderboard: true });
        } else {
          proceedToDailyQuests();
        }
      };
      return;
    }
    
    if (tryShowDailyReward()) return;
    
    if (pendingPromoUnlock) {
      showPopupViaQueue({ type: 'unlockPromo' });
      return;
    }
    
    if (pendingTreasureHuntPromo) {
      setPendingTreasureHuntPromo(false);
      showEventPromoViaQueue('treasureHuntPromo');
      return;
    }
    if (pendingDungeonDigPromo) {
      setPendingDungeonDigPromo(false);
      showEventPromoViaQueue('dungeonDigPromo');
      return;
    }
    
    if (dailyQuestsShownThisWinRef.current) {
      proceedToCollectionsOrNewGame({ leaderboard: true });
    } else {
      proceedToDailyQuests();
    }
  }, [callbacks, popupQueue, showPopupViaQueue, showEventPromoViaQueue, proceedToCollectionsOrNewGame, proceedToDailyQuests]);
  
  // Handle promo unlock close
  const handlePromoUnlockClose = useCallback(() => {
    const {
      setPromoUnlocked, setPendingPromoUnlock,
      pendingTreasureHuntPromo, setPendingTreasureHuntPromo,
      pendingDungeonDigPromo, setPendingDungeonDigPromo
    } = callbacks;
    
    popupQueue.dismiss();
    setPromoUnlocked(true);
    localStorage.setItem('solitaire_promo_unlocked', 'true');
    setPendingPromoUnlock(false);
    
    if (pendingTreasureHuntPromo) {
      setPendingTreasureHuntPromo(false);
      showEventPromoViaQueue('treasureHuntPromo');
      return;
    }
    if (pendingDungeonDigPromo) {
      setPendingDungeonDigPromo(false);
      showEventPromoViaQueue('dungeonDigPromo');
      return;
    }
    
    if (dailyQuestsShownThisWinRef.current) {
      proceedToCollectionsOrNewGame({ promo: true });
    } else {
      proceedToDailyQuests();
    }
  }, [callbacks, popupQueue, showEventPromoViaQueue, proceedToCollectionsOrNewGame, proceedToDailyQuests]);
  
  // Handle treasure hunt promo close
  const handleTreasureHuntPromoClose = useCallback(() => {
    const {
      setTreasureHuntPromoShown, treasureHuntEvent,
      resetTreasureHunt, activateTreasureHuntEvent, playerLevel,
      clearNoMoves, setShowNewGameButton, setNoMovesShownOnce, newGame
    } = callbacks;
    
    setTreasureHuntPromoShown(true);
    localStorage.setItem('solitaire_treasure_hunt_promo_shown', 'true');
    
    if (!treasureHuntEvent.active) {
      resetTreasureHunt();
      activateTreasureHuntEvent(playerLevel);
    }
    
    const hasMorePopups = popupQueue.queue.length > 0;
    popupQueue.dismiss();
    
    if (!hasMorePopups) {
      clearNoMoves();
      setShowNewGameButton(false);
      setNoMovesShownOnce(false);
      newGame('solvable');
    }
  }, [callbacks, popupQueue]);
  
  // Handle dungeon dig promo close
  const handleDungeonDigPromoClose = useCallback(() => {
    const {
      resetDungeonDig, activateDungeonDigEvent, playerLevel,
      clearNoMoves, setShowNewGameButton, setNoMovesShownOnce, newGame
    } = callbacks;
    
    resetDungeonDig();
    activateDungeonDigEvent(playerLevel);
    
    const hasMorePopups = popupQueue.queue.length > 0;
    popupQueue.dismiss();
    
    if (!hasMorePopups) {
      clearNoMoves();
      setShowNewGameButton(false);
      setNoMovesShownOnce(false);
      newGame('solvable');
    }
  }, [callbacks, popupQueue]);
  
  return {
    handleWinComplete,
    handleLevelUpComplete,
    handleDailyQuestsClose,
    handleCollectionsUnlockClose,
    handleLeaderboardUnlockClose,
    handlePromoUnlockClose,
    handleTreasureHuntPromoClose,
    handleDungeonDigPromoClose,
    tryClaimPointsEventReward,
    proceedAfterPointsEventRewards,
    proceedToDailyQuests,
    proceedToCollectionsOrNewGame,
  };
}
