import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
// Import debugLogger early to capture all logs
import '../../lib/debugLogger';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { useAudio } from '../../lib/stores/useAudio';
import { useProgressGift } from '../../hooks/useProgressGift';
import { useFloatingScores } from '../../hooks/useFloatingScores';
import { useGameScaleContext } from '../../contexts/GameScaleContext';
import { TableauColumn } from './TableauColumn';
import { FoundationPile } from './FoundationPile';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { DonationProgress } from './DonationProgress';
import { WinScreen } from './WinScreen';
import { DailyQuests } from './DailyQuests';
import { Collections, defaultCollections, type Collection } from './Collections';
import { NoMovesModal } from './NoMovesModal';
import { FlyingCollectionIcon, setFlyingIconCallback, setCollectionsButtonPosition, getCollectionsButtonPosition, setOnCardToFoundationCallback } from './FlyingCollectionIcon';
import { FlyingCardsContainer } from './FlyingCard';
import { CardAnimation } from './CardAnimation';
import { DragPreview } from './DragPreview';
import { DebugPopup, setDebugCallback, type DebugInfo } from '../DebugPopup';
import { FloatingScore } from '../FloatingScore';
import { clearAllDropTargetHighlights } from '../../lib/solitaire/styleManager';
import { setAddPointsFunction } from '../../lib/solitaire/progressManager';
import { setAddFloatingScoreFunction } from '../../lib/solitaire/floatingScoreManager';
import { resetAllXP, setOnLevelUpCallback } from '../../lib/solitaire/experienceManager';
import { LevelUpScreen } from './LevelUpScreen';
import { PromoWidget } from './PromoWidget';
import { Shop, type ShopItem } from './Shop';
import { DailyRewardPopup, getRewardStars } from './DailyRewardPopup';
import { StreakPopup } from './StreakPopup';
import { LeaderboardPopup } from './LeaderboardPopup';
import { GAME_VERSION } from '../../version';
import { Suit } from '../../lib/solitaire/types';
import { 
  LeaderboardPlayer, 
  SeasonInfo,
  LeaderboardTrophy,
  getPreviousPosition,
} from '../../lib/leaderboard';
import {
  TreasureHuntEvent,
  ChestReward,
  saveTreasureHuntEvent,
  activateTreasureHunt,
  isEventAvailable,
  getRequiredLevel,
  addKeys,
  formatTimeRemaining,
  isTimeCritical as checkIsTimeCritical,
  isEventExpired
} from '../../lib/liveops/treasureHunt';
import { 
  distributeKeys, 
  cardHasKey, 
  collectKeyFromCard, 
  setOnKeyCollectedCallback,
  setOnKeysChangedCallback,
  setOnKeyDropCallback,
  clearAllKeys 
} from '../../lib/liveops/keyManager';
import { FlyingKeyDrop } from './FlyingKeyDrop';
import { TreasureHuntIcon, FlyingKeysContainer, launchFlyingKey, setOnFlyingKeyCompleteCallback } from './TreasureHuntIcon';
import { TreasureHuntPromo } from './TreasureHuntPromo';
import { TreasureHuntPopup } from './TreasureHuntPopup';
import { EventEndedPopup, DungeonEndedPopup } from './EventEndedPopups';
import { LockedFeaturePopups } from './LockedFeaturePopups';
import { UnlockPopups } from './UnlockPopups';
import { useCollections } from '../../hooks/useCollections';
import { useShop } from '../../hooks/useShop';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useDailyRewards } from '../../hooks/useDailyRewards';
import { usePointsEvent } from '../../hooks/usePointsEvent';
import { useTreasureFlyingStars, TreasureFlyingStar } from '../../hooks/useTreasureFlyingStars';
import { useCollisionParticles } from '../../hooks/useCollisionParticles';
import { CollisionParticles } from './CollisionParticle';
import { useDebugActions } from '../../hooks/useDebugActions';
import { DungeonDigPromo } from './DungeonDigPromo';
// Dungeon Dig Event
import {
  DungeonDigEvent,
  TileReward,
  saveDungeonDigEvent,
  activateDungeonDig,
  isEventAvailable as isDungeonAvailable,
  getRequiredLevel as getDungeonRequiredLevel,
  addShovels,
  formatTimeRemaining as formatDungeonTime,
  isTimeCritical as checkDungeonTimeCritical,
  isEventExpired as isDungeonExpired
} from '../../lib/liveops/dungeonDig';
import { digTile as dungeonDigTile } from '../../lib/liveops/dungeonDig/logic';
import {
  distributeShovels,
  cardHasShovel,
  collectShovelFromCard,
  clearAllShovels,
  setCallbacks as setShovelCallbacks
} from '../../lib/liveops/dungeonDig/shovelManager';
import { FlyingShovelDrop } from './FlyingShovelDrop';
import { DungeonDigIcon, FlyingShovelsContainer, launchFlyingShovel, setOnFlyingShovelCompleteCallback } from './DungeonDigIcon';
import { DungeonDigPopup } from './DungeonDigPopup';
import { 
  PointsEventState,
  PendingReward,
  getPointsEventState,
  addEventPoints,
  earnReward,
  getEarnableReward,
  claimPendingReward,
  hasPendingRewards,
  resetPointsEvent,
  generatePackItems,
  getProgressToNextReward,
  getRewardAtIndex,
  PackItem,
  PackRarity,
  COLLECTION_PACKS,
} from '../../lib/liveops/pointsEvent';
import { PointsEventIcon } from './PointsEventIcon';
import { PointsEventPopup } from './PointsEventPopup';
import { CollectionPackPopup } from './CollectionPackPopup';
import { StarsReward } from './StarsReward';
import { TopEventBar } from './TopEventBar';
import { BottomButtonRow } from './BottomButtonRow';
// MiniCardPack now imported by FlyingRewardToMiniature
import { useDailyQuests, Quest, MONTHLY_TARGET, MONTHLY_REWARD } from '../../hooks/useDailyQuests';
import { useLiveOpsEvents } from '../../hooks/useLiveOpsEvents';
import { FlyingRewardToMiniature } from './FlyingRewardToMiniature';
import { useWinFlow } from '../../hooks/useWinFlow';
import { useGameProgress, COLLECTIONS_REQUIRED_LEVEL, LEADERBOARD_REQUIRED_LEVEL, STARS_PER_WIN, STARS_PER_LEVELUP } from '../../hooks/useGameProgress';
import { usePopupQueue, WinFlowPopup } from '../../lib/stores/usePopupQueue';

// Constants imported from useGameProgress hook:
// STARS_PER_LEVELUP, COLLECTIONS_REQUIRED_LEVEL, LEADERBOARD_REQUIRED_LEVEL, STARS_PER_WIN

export function GameBoard() {
  const { 
    tableau, 
    foundations, 
    stock, 
    waste, 
    isWon,
    animatingCard,
    completeCardAnimation,
    showDragPreview,
    draggedCards,
    dragPreviewPosition,
    dragOffset,
    isDragging,
    gameMode,
    foundationSlotOrder,
    newGame,
    addPointsToProgress: addPoints,
    hasNoMoves,
    checkForAvailableMoves,
    clearNoMoves,
    hint,
    getHint,
    clearHint,
    isDealing,
    isAutoCollecting,
    collectAllAvailable,
    canUndo,
    undo
  } = useSolitaire();
  
  const { playSuccess } = useAudio();
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  
  // Win screen state
  const [showWinScreen, setShowWinScreen] = useState(false);
  
  // Level up state
  // NOTE: showLevelUp removed - now rendered via popupQueue
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  
  // Stars management - using hook (handles localStorage persistence)
  const {
    totalStars,
    displayedStars,
    setDisplayedStars,
    starPulseKey,
    triggerStarPulse,
    addStars: addStarsBase,
    resetProgress: resetStarsProgress,
  } = useGameProgress();
  
  const [winHandled, setWinHandled] = useState(false);
  const dailyQuestsShownThisWinRef = useRef(false); // Track if daily quests shown in current win flow
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Flying stars from treasure hunt chests - managed via hook
  const {
    treasureFlyingStars,
    launchTreasureStars,
    handleTreasureStarArrived,
  } = useTreasureFlyingStars({
    progressBarRef,
    onStarArrived: (value) => setDisplayedStars(prev => prev + value),
    onPulse: triggerStarPulse,
  });
  
  // Daily quests - using hook (handles localStorage persistence)
  const {
    quests: dailyQuests,
    setQuests: setDailyQuests,
    acesCollected,
    setAcesCollected,
    monthlyProgress,
    setMonthlyProgress,
    monthlyRewardClaimed,
    setMonthlyRewardClaimed,
    showDailyQuests,
    openDailyQuests,
    closeDailyQuests,
    dailyQuestsAfterWin,
    setDailyQuestsAfterWin,
    resetQuests: resetDailyQuests,
  } = useDailyQuests();
  
  // Collections hook - manages all collections state
  const collectionsHook = useCollections();
  const {
    collections, setCollections,
    completedCollectionsCount,
    rewardedCollections, setRewardedCollections,
    allCollectionsRewarded, setAllCollectionsRewarded,
    pendingCollectionRewards, setPendingCollectionRewards,
    showCollections, openCollections, closeCollections,
    collectionsAfterWin, setCollectionsAfterWin,
    flyingIcons, setFlyingIcons,
    hasNewCollectionItem, setHasNewCollectionItem,
    newItemsInCollections, setNewItemsInCollections,
    collectionsResetKey, setCollectionsResetKey,
    collectionButtonPulse, setCollectionButtonPulse,
    collectionsButtonRef,
    collectionsUnlockShown, setCollectionsUnlockShown,
    pendingCollectionsUnlock, setPendingCollectionsUnlock,
  } = collectionsHook;
  
  // Popup queue for win flow - replaces complex proceedToX chains
  const popupQueue = usePopupQueue();
  
  // Universal helper to show any popup via queue (prevents double-click issues)
  const showPopupViaQueue = (popup: WinFlowPopup) => {
    // Get FRESH state from store (not stale closure value)
    const currentState = usePopupQueue.getState();
    
    // Only add if not already in queue or showing
    if (currentState.current?.type !== popup.type && !currentState.queue.some(p => p.type === popup.type)) {
      currentState.enqueue(popup);
      
      // Check fresh state AFTER enqueue
      const stateAfterEnqueue = usePopupQueue.getState();
      if (!stateAfterEnqueue.isProcessing) {
        stateAfterEnqueue.startProcessing();
      }
    }
  };
  
  // Shorthand for event promos (backward compatibility)
  const showEventPromoViaQueue = (type: 'treasureHuntPromo' | 'dungeonDigPromo') => {
    showPopupViaQueue({ type });
  };
  
  // Computed: popup visibility from queue
  const isLevelUpShowing = popupQueue.current?.type === 'levelUp';
  const isStreakShowing = popupQueue.current?.type === 'streak';
  const isDailyRewardShowing = popupQueue.current?.type === 'dailyReward';
  
  // Shop hook - manages shop popup and subscription state
  const {
    showShop, openShop, closeShop,
    isSubscribed, setIsSubscribed,
    promoUnlocked, setPromoUnlocked,
    pendingPromoUnlock, setPendingPromoUnlock,
    handleSubscribe,
  } = useShop();
  
  // No moves state - show popup first, then button if closed
  const [showNewGameButton, setShowNewGameButton] = useState(false);
  const [noMovesShownOnce, setNoMovesShownOnce] = useState(false);
  
  // Daily rewards hook - manages daily streak, login rewards, mount/visibility checks
  const {
    dailyStreak, setDailyStreak,
    lastLoginDate, setLastLoginDate,
    pendingDailyReward, setPendingDailyReward,
    pendingStreak, setPendingStreak,
    pendingDailyRewardCheck, setPendingDailyRewardCheck,
    tryGetDailyRewardPopup,
    claimDailyReward: claimDailyRewardFromHook,
  } = useDailyRewards({ onNewDay: resetDailyQuests });
  
  // Player level state
  const [playerLevel, setPlayerLevel] = useState(() => {
    const saved = localStorage.getItem('solitaire_player_level');
    return saved ? parseInt(saved, 10) : 1;
  });
  
  // Popup states for event ended - managed via onDemand popup queue
  const showEventEndedPopup = popupQueue.onDemandPopup?.type === 'eventEnded';
  const showDungeonEndedPopup = popupQueue.onDemandPopup?.type === 'dungeonEnded';
  const openEventEndedPopup = () => popupQueue.showOnDemand({ type: 'eventEnded' });
  const openDungeonEndedPopup = () => popupQueue.showOnDemand({ type: 'dungeonEnded' });
  
  // LiveOps Events Hook - manages TreasureHunt and DungeonDig state, timers, and rotation
  const {
    treasureHuntEvent,
    setTreasureHuntEvent,
    treasureHuntExpired,
    setTreasureHuntExpired,
    treasureHuntTimeRemaining,
    treasureHuntTimeCritical,
    treasureHuntPulse,
    setTreasureHuntPulse,
    triggerTreasureHuntPulse,
    dungeonDigEvent,
    setDungeonDigEvent,
    dungeonDigExpired,
    setDungeonDigExpired,
    dungeonDigTimeRemaining,
    dungeonDigTimeCritical,
    dungeonDigPulse,
    setDungeonDigPulse,
    triggerDungeonDigPulse,
    nextEventType,
    setNextEventType,
    keysDistributedRef,
    shovelsDistributedRef,
    resetTreasureHunt,
    resetDungeonDig,
    activateTreasureHuntEvent,
    activateDungeonDigEvent,
    resetAllEvents,
  } = useLiveOpsEvents(playerLevel, {
    onTreasureHuntExpired: () => {
      clearAllKeys();
      openEventEndedPopup();
    },
    onDungeonDigExpired: () => {
      clearAllShovels();
      openDungeonEndedPopup();
    },
  });
  
  // Treasure Hunt UI state - managed via onDemand popup queue
  const showTreasureHunt = popupQueue.onDemandPopup?.type === 'treasureHunt';
  const openTreasureHunt = () => popupQueue.showOnDemand({ type: 'treasureHunt' });
  const closeTreasureHunt = () => popupQueue.closeOnDemand();
  const treasureHuntIconRef = useRef<HTMLDivElement>(null);
  // NOTE: pointsEventIconRef moved to usePointsEvent hook
  const lastTapTimeRef = useRef<number>(0);
  // NOTE: showTreasureHuntPromo removed - now rendered via popupQueue
  const [treasureHuntPromoShown, setTreasureHuntPromoShown] = useState(() => {
    return localStorage.getItem('solitaire_treasure_hunt_promo_shown') === 'true';
  });
  const [pendingTreasureHuntPromo, setPendingTreasureHuntPromo] = useState(false);
  
  // DungeonDig UI state (popup visibility, promos)
  // NOTE: showDungeonDigPromo removed - now rendered via popupQueue
  const [pendingDungeonDigPromo, setPendingDungeonDigPromo] = useState(false);
  // Dungeon Dig UI state - managed via onDemand popup queue
  const showDungeonDig = popupQueue.onDemandPopup?.type === 'dungeonDig';
  const openDungeonDig = () => popupQueue.showOnDemand({ type: 'dungeonDig' });
  const closeDungeonDig = () => popupQueue.closeOnDemand();
  const [dungeonEventCompleteOverlay, setDungeonEventCompleteOverlay] = useState(false);
  const [pendingDungeonEventComplete, setPendingDungeonEventComplete] = useState(false);
  const dungeonDigIconRef = useRef<HTMLDivElement>(null);
  
  // Flying shovel drops for animation
  const [flyingShovelDrops, setFlyingShovelDrops] = useState<Array<{
    id: number;
    cardId: string;
    targetX: number;
    targetY: number;
  }>>([]);
  
  // NOTE: Collections unlock state moved to useCollections hook
  // NOTE: Promo/Shop unlock state moved to useShop hook
  
  // Check if collections are unlocked
  const collectionsUnlocked = playerLevel >= COLLECTIONS_REQUIRED_LEVEL;
  const leaderboardUnlocked = playerLevel >= LEADERBOARD_REQUIRED_LEVEL;
  
  // Leaderboard hook - manages leaderboard state, season stars, simulation, etc.
  const {
    showLeaderboard, openLeaderboard, closeLeaderboard,
    leaderboardPlayers, setLeaderboardPlayers,
    leaderboardOldPosition, setLeaderboardOldPosition,
    leaderboardNewPosition, setLeaderboardNewPosition,
    seasonInfo, setSeasonInfo,
    seasonStars, setSeasonStars,
    pendingLeaderboardShow, setPendingLeaderboardShow,
    leaderboardTrophies, setLeaderboardTrophies,
    leaderboardUnlockShown, setLeaderboardUnlockShown,
    pendingLeaderboardUnlock, setPendingLeaderboardUnlock,
    showOvertakenNotification, setShowOvertakenNotification,
    addSeasonStarsAndUpdate,
    handleLeaderboardClose: handleLeaderboardCloseFromHook,
    tryShowLeaderboard,
    pendingAfterLeaderboardRef,
    initializeLeaderboardData,
    resetLeaderboardData,
  } = useLeaderboard({ leaderboardUnlocked });
  
  // Points Event hook - manages points event state and UI
  const {
    pointsEventState, setPointsEventState,
    pointsEventPulse, setPointsEventPulse,
    rewardIconAnimating, setRewardIconAnimating,
    nextRewardDropping, setNextRewardDropping,
    animatingRewardIndex, setAnimatingRewardIndex,
    pointsEventIconRef,
    showPointsEventPopup, openPointsEventPopup, closePointsEventPopup,
    triggerPointsEventPulse,
  } = usePointsEvent();
  
  // Queue for pack rewards - allows multiple packs to be queued from rapid chest clicks
  const [packRewardsQueue, setPackRewardsQueue] = useState<Array<{ rarity: PackRarity; items: PackItem[]; sourcePosition?: { x: number; y: number }; skipBounce?: boolean }>>([]);
  const [showPackPopup, setShowPackPopup] = useState(false);
  const [packBlocksTiles, setPackBlocksTiles] = useState(false); // Blocks tile digging until cards start flying
  // Current pack being shown (first item from queue)
  const currentPackReward = packRewardsQueue[0] || null;
  const [autoClaimingRewards, setAutoClaimingRewards] = useState(false); // Track if we're auto-claiming after win
  const autoClaimingRewardsRef = useRef(false); // Ref to avoid stale closure
  const isClaimingRewardRef = useRef(false); // Prevent double claiming
  // NOTE: Points Event UI state moved to usePointsEvent hook
  
  // Flying reward animation (from button to miniature row)
  const [flyingRewardToMiniature, setFlyingRewardToMiniature] = useState<{
    id: number;
    type: 'stars' | 'pack';
    stars?: number;
    packRarity?: PackRarity;
    startX: number;
    startY: number;
    pendingIndex: number;
  } | null>(null);
  const miniatureContainerRef = useRef<HTMLDivElement>(null);
  const isEarningRewardRef = useRef(false); // Prevent multiple earning at once
  
  // Setup flying key complete callback for pulse and key counter update
  useEffect(() => {
    setOnFlyingKeyCompleteCallback(() => {
      // Update key counter exactly when flying key disappears
      const updatedEvent = addKeys(1);
      setTreasureHuntEvent(updatedEvent);
      
      // Pulse animation
      setTreasureHuntPulse(true);
      setTimeout(() => setTreasureHuntPulse(false), 150);
    });
    return () => setOnFlyingKeyCompleteCallback(() => {});
  }, []);
  
  // NOTE: Leaderboard simulation and position improvement moved to useLeaderboard hook
  
  // Helper to add stars (updates both total and season)
  const addStars = (amount: number) => {
    addStarsBase(amount);
    // Season stars and leaderboard update handled by hook
    addSeasonStarsAndUpdate(amount);
  };
  
  // Force re-render counter for key distribution updates
  const [keyUpdateCounter, forceKeyUpdate] = useState(0);
  
  // Flying key drops for animation
  const [flyingKeyDrops, setFlyingKeyDrops] = useState<Array<{ id: number; cardId: string; targetX: number; targetY: number }>>([]);
  
  // Register callback for key distribution updates
  useEffect(() => {
    setOnKeysChangedCallback(() => {
      forceKeyUpdate(n => n + 1);
    });
    return () => setOnKeysChangedCallback(() => {});
  }, []);
  
  // Register callback for key drop animations
  useEffect(() => {
    setOnKeyDropCallback((cardId, targetX, targetY) => {
      const dropId = Date.now() + Math.random();
      setFlyingKeyDrops(prev => [...prev, { id: dropId, cardId, targetX, targetY }]);
    });
    return () => setOnKeyDropCallback(() => {});
  }, []);
  
  // Reset distribution flags when new game starts
  const prevIsDealingRef = useRef<boolean>(true);
  useEffect(() => {
    if (isDealing && !prevIsDealingRef.current) {
      keysDistributedRef.current = false;
      shovelsDistributedRef.current = false;
    }
    prevIsDealingRef.current = isDealing;
  }, [isDealing, keysDistributedRef, shovelsDistributedRef]);
  
  // Check if next event should start when previous one fully ends
  // Instead of auto-starting, set pending promo to show before game starts
  useEffect(() => {
    const eventsUnlocked = isEventAvailable(playerLevel);
    const noActiveEvent = !treasureHuntEvent.active && !dungeonDigEvent.active;
    const treasureFullyEnded = treasureHuntExpired && treasureHuntEvent.keys === 0;
    const dungeonFullyEnded = dungeonDigExpired && dungeonDigEvent.shovels === 0;
    
    // When an event fully ends, set pending promo for next event
    if (eventsUnlocked && noActiveEvent && (treasureFullyEnded || dungeonFullyEnded)) {
      if (nextEventType === 'treasure') {
        // TreasureHunt is next - set pending promo
        setPendingTreasureHuntPromo(true);
      } else {
        // DungeonDig is next - set pending promo  
        setPendingDungeonDigPromo(true);
      }
    }
  }, [playerLevel, treasureHuntEvent.active, dungeonDigEvent.active, treasureHuntExpired, dungeonDigExpired, treasureHuntEvent.keys, dungeonDigEvent.shovels, nextEventType]);
  
  // Distribute keys ONCE when dealing completes (isDealing becomes false)
  // Keys are only placed on tableau cards, not on stock/waste pile
  // NOTE: tableau is intentionally NOT in deps - we read it once when isDealing becomes false
  useEffect(() => {
    // Don't distribute if event is not active or already expired
    if (!treasureHuntEvent.active || treasureHuntExpired) return;
    if (isDealing) return; // Wait for dealing to complete
    if (keysDistributedRef.current) return; // Already distributed for this game
    
    // Mark as distributed BEFORE calling distributeKeys
    keysDistributedRef.current = true;
    
    // Get face-down cards from tableau only (preferred for keys)
    const faceDownCards = tableau
      .flat()
      .filter(c => !c.faceUp)
      .map(c => c.id);
    
    // Get face-up cards from tableau only
    const faceUpCards = tableau
      .flat()
      .filter(c => c.faceUp)
      .map(c => c.id);
    
    distributeKeys(faceDownCards, faceUpCards, treasureHuntEvent.active && !treasureHuntExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treasureHuntEvent.active, treasureHuntExpired, isDealing]);
  
  // Distribute shovels ONCE when dealing completes (for DungeonDig)
  // NOTE: tableau is intentionally NOT in deps - we read it once when isDealing becomes false
  useEffect(() => {
    // Don't distribute if event is not active or already expired
    if (!dungeonDigEvent.active || dungeonDigExpired) return;
    if (isDealing) return;
    if (shovelsDistributedRef.current) return;
    
    shovelsDistributedRef.current = true;
    
    const faceDownCards = tableau
      .flat()
      .filter(c => !c.faceUp)
      .map(c => c.id);
    
    const faceUpCards = tableau
      .flat()
      .filter(c => c.faceUp)
      .map(c => c.id);
    
    distributeShovels(faceDownCards, faceUpCards, dungeonDigEvent.active && !dungeonDigExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dungeonDigEvent.active, dungeonDigExpired, isDealing]);
  
  // End initial dealing animation after cards have animated in
  useEffect(() => {
    if (isDealing) {
      const timer = setTimeout(() => {
        useSolitaire.setState({ isDealing: false, dealingCardIds: new Set() });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Setup key collection callback
  useEffect(() => {
    setOnKeyCollectedCallback((cardId, startX, startY) => {
      const iconElement = treasureHuntIconRef.current;
      
      if (iconElement) {
        const iconRect = iconElement.getBoundingClientRect();
        
        // Launch flying key animation from card's START position to treasure hunt icon
        launchFlyingKey(
          startX,
          startY,
          iconRect.left + iconRect.width / 2,
          iconRect.top + iconRect.height / 2
        );
      }
      
      // Key counter update happens via onFlyingKeyCompleteCallback (synced with animation end)
    });
    
    return () => setOnKeyCollectedCallback(() => {});
  }, []);
  
  // Setup shovel collection callback for DungeonDig
  useEffect(() => {
    setShovelCallbacks({
      onShovelCollected: (cardId, startX, startY) => {
        const iconElement = dungeonDigIconRef.current;
        
        if (iconElement) {
          const iconRect = iconElement.getBoundingClientRect();
          launchFlyingShovel(
            startX,
            startY,
            iconRect.left + iconRect.width / 2,
            iconRect.top + iconRect.height / 2
          );
        }
      },
      onShovelsChanged: () => {
        // Force re-render for shovel count update
        setDungeonDigEvent(prev => ({ ...prev }));
      },
      onShovelDrop: (cardId, targetX, targetY) => {
        const id = Date.now() + Math.random();
        setFlyingShovelDrops(prev => [...prev, { id, cardId, targetX, targetY }]);
      }
    });
  }, []);
  
  // When flying shovel completes, add to inventory
  useEffect(() => {
    setOnFlyingShovelCompleteCallback(() => {
      setDungeonDigEvent(prev => {
        const updated = addShovels(1);
        setDungeonDigPulse(true);
        setTimeout(() => setDungeonDigPulse(false), 150);
        return updated;
      });
    });
    return () => setOnFlyingShovelCompleteCallback(() => {});
  }, []);
  
  // NOTE: Daily reward mount check and visibilitychange moved to useDailyRewards hook
  
  // Function to show daily reward if pending (wrapper around hook's tryGetDailyRewardPopup)
  const tryShowDailyReward = (): boolean => {
    const popupData = tryGetDailyRewardPopup();
    if (!popupData) return false;
    
    if (popupData.type === 'streak') {
      showPopupViaQueue({ type: 'streak', count: popupData.streak, stars: 0 });
    } else {
      showPopupViaQueue({ type: 'dailyReward', day: popupData.streak, stars: popupData.stars });
    }
    return true;
  };
  
  // Claim daily reward and continue to next step in chain
  const claimDailyReward = () => {
    // Use hook to claim reward - it updates streak and returns stars
    const starsToAdd = claimDailyRewardFromHook();
    if (starsToAdd > 0) {
      addStars(starsToAdd);
    }
    
    popupQueue.dismiss(); // Close daily reward popup
    
    // Continue chain - check for unlock popups first, then event promos
    if (pendingCollectionsUnlock) {
      showPopupViaQueue({ type: 'unlockCollections' });
      return;
    }
    if (pendingLeaderboardUnlock) {
      showPopupViaQueue({ type: 'unlockTournament' });
      return;
    }
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
    
    // If daily quests already shown in this win session, go to collections/new game
    // Otherwise proceed to daily quests first
    if (dailyQuestsShownThisWinRef.current) {
      proceedToCollectionsOrNewGame();
    } else {
      proceedToDailyQuests();
    }
  };
  
  // NOTE: Collections state moved to useCollections hook
  // NOTE: TreasureFlyingStars state moved to useTreasureFlyingStars hook
  
  // Collision particles hook - manages burst particles on icon arrival
  const { particles: collisionParticles, createBurst: createCollisionParticles } = useCollisionParticles();
  
  // Update collections button position for flying icons
  useEffect(() => {
    const updateButtonPosition = () => {
      if (collectionsButtonRef.current) {
        const rect = collectionsButtonRef.current.getBoundingClientRect();
        setCollectionsButtonPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    };
    updateButtonPosition();
    window.addEventListener('resize', updateButtonPosition);
    return () => window.removeEventListener('resize', updateButtonPosition);
  }, [showDailyQuests, showWinScreen, showCollections]);
  
  // Setup flying icon callback
  useEffect(() => {
    setFlyingIconCallback((drop) => {
      setFlyingIcons(prev => [...prev, drop]);
    });
    return () => setFlyingIconCallback(() => {});
  }, []);
  
  // Track new item IDs for pulsing animation
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  
  // Handle flying icon completion
  const handleFlyingIconComplete = (iconId: string, collectionId: string, itemId: string, isDuplicate?: boolean) => {
    // Remove the flying icon
    setFlyingIcons(prev => prev.filter(i => i.id !== iconId));
    
    // Create collision particles at button's top edge (where icon disappears)
    if (collectionsButtonRef.current) {
      const rect = collectionsButtonRef.current.getBoundingClientRect();
      createCollisionParticles(rect.left + rect.width / 2, rect.top);
    }
    
    // If it's a duplicate, just pulse the button but don't add to collection
    if (isDuplicate) {
      setCollectionButtonPulse(true);
      setTimeout(() => setCollectionButtonPulse(false), 150);
      return;
    }
    
    // Mark item as collected in the collection
    setCollections(prev => prev.map(coll => {
      if (coll.id === collectionId) {
        return {
          ...coll,
          items: coll.items.map(item => 
            item.id === itemId ? { ...item, collected: true } : item
          )
        };
      }
      return coll;
    }));
    
    // Track which collection has new items and which specific items are new
    // But only if collection is not already rewarded (no need to view rewarded collections)
    if (!rewardedCollections.has(collectionId)) {
      setNewItemsInCollections(prev => new Set(Array.from(prev).concat(collectionId)));
      setNewItemIds(prev => new Set(Array.from(prev).concat(itemId)));
    
    // Show notification on button
    setHasNewCollectionItem(true);
    }
    setCollectionButtonPulse(true);
    setTimeout(() => setCollectionButtonPulse(false), 150);
  };
  
  // Handle when a specific collection is viewed - remove its notification
  const handleCollectionViewed = (collectionId: string) => {
    setNewItemsInCollections(prev => {
      const newSet = new Set(prev);
      newSet.delete(collectionId);
      // If all collections have been viewed, hide the button notification
      if (newSet.size === 0) {
        setHasNewCollectionItem(false);
      }
      return newSet;
    });
    
    // Remove item IDs for this collection from newItemIds
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
      setNewItemIds(prev => {
        const newSet = new Set(prev);
        collection.items.forEach(item => newSet.delete(item.id));
        return newSet;
      });
    }
  };
  
  // Register callback for card to foundation events - add points for points event
  useEffect(() => {
    setOnCardToFoundationCallback((cardX: number, cardY: number, points: number) => {
      // Only add points if collections are unlocked (level >= 2)
      const currentLevel = parseInt(localStorage.getItem('solitaire_player_level') || '1', 10);
      if (currentLevel < COLLECTIONS_REQUIRED_LEVEL) {
        return; // Don't accumulate points before unlock
      }
      
      // Add points equal to the card's score value (same as floating score)
      if (points > 0) {
        const updatedState = addEventPoints(points);
        setPointsEventState({ ...updatedState });
        
        // Check if a reward is now earnable (only if not already earning one)
        // IMPORTANT: Check ref FIRST, then read FRESH state to avoid race conditions
        if (!isEarningRewardRef.current) {
          // Mark as earning IMMEDIATELY to block other callbacks
          isEarningRewardRef.current = true;
          
          // Read fresh state from localStorage (not the possibly stale updatedState)
          const freshState = getPointsEventState();
          const earnable = getEarnableReward(freshState);
          
          if (earnable) {
            // Earn the reward and trigger flying animation
            const iconRect = pointsEventIconRef.current?.getBoundingClientRect();
            if (iconRect) {
              const earnResult = earnReward();
              if (earnResult) {
                // Store the reward index we're animating away BEFORE updating state
                setAnimatingRewardIndex(earnResult.reward.rewardIndex);
                
                // Start reward icon flying animation
                setRewardIconAnimating(true);
                
                // Update state with new pending reward
                setPointsEventState({ ...earnResult.state });
                
                // The new reward is at the END of pendingRewards array
                const newIndex = earnResult.state.pendingRewards.length - 1;
                
                // Start flying animation from button to miniature row
                setFlyingRewardToMiniature({
                  id: earnResult.reward.id,
                  type: earnResult.reward.type,
                  stars: earnResult.reward.stars,
                  packRarity: earnResult.reward.packRarity,
                  startX: iconRect.left + iconRect.width / 2,
                  startY: iconRect.top + iconRect.height / 2,
                  pendingIndex: newIndex,
                });
                
                // After icon flies away, drop the next reward
                setTimeout(() => {
                  setRewardIconAnimating(false);
                  setAnimatingRewardIndex(null);
                  setNextRewardDropping(true);
                  setTimeout(() => setNextRewardDropping(false), 300);
                }, 400);
              } else {
                // earnReward failed, reset the flag
                isEarningRewardRef.current = false;
              }
            } else {
              // No icon ref, reset the flag
              isEarningRewardRef.current = false;
            }
          } else {
            // No earnable reward, reset the flag
            isEarningRewardRef.current = false;
          }
        }
        
        // Pulse the points event icon
        triggerPointsEventPulse();
      }
      
      // Note: We no longer drop collection items directly
      // Collection items are now obtained only through packs
    });
    return () => setOnCardToFoundationCallback(() => {});
  }, []);
  
  // Game scale for responsive layout
  const { scale, containerHeight, availableHeight, containerWidth } = useGameScaleContext();
  
  // Floating scores integration
  const { floatingScores, addFloatingScore, removeFloatingScore } = useFloatingScores();
  
  // Build foundation render order: reserved slots first (left to right), then remaining suits
  const foundationRenderOrder = useMemo(() => {
    const allSuits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const remaining = allSuits.filter(suit => !foundationSlotOrder.includes(suit));
    const result = [...foundationSlotOrder, ...remaining];
    console.log(`🎨 Foundation render order: ${result.join(', ')}`);
    return result;
  }, [foundationSlotOrder]);
  
  // Register addPoints function with progress manager
  useEffect(() => {
    setAddPointsFunction(addPoints);
    return () => {
      setAddPointsFunction(() => {});
    };
  }, [addPoints]);
  
  // Register addFloatingScore function with floating score manager
  useEffect(() => {
    setAddFloatingScoreFunction(addFloatingScore);
    return () => {
      setAddFloatingScoreFunction(() => {});
    };
  }, [addFloatingScore]);
  
  // Subscribe to level up callback
  useEffect(() => {
    setOnLevelUpCallback((newLevel) => {
      console.log(`🎉 Level up detected: ${newLevel}`);
      setPendingLevelUp(newLevel);
    });
    return () => {
      setOnLevelUpCallback(() => {});
    };
  }, []);
  
  // Track if level up stars were already awarded
  const levelUpStarsAwardedRef = useRef<number | null>(null);
  
  // Add stars when level up screen is shown (only once per level up)
  useEffect(() => {
    if (isLevelUpShowing && pendingLevelUp !== null && levelUpStarsAwardedRef.current !== pendingLevelUp) {
      // Add stars for level up immediately (persisted via localStorage effect)
      levelUpStarsAwardedRef.current = pendingLevelUp;
      addStars(STARS_PER_LEVELUP);
      console.log(`⭐ Awarded ${STARS_PER_LEVELUP} stars for level ${pendingLevelUp}`);
    }
  }, [isLevelUpShowing, pendingLevelUp]);
  
  // Reset level up stars tracker when level up is complete
  useEffect(() => {
    if (!isLevelUpShowing && pendingLevelUp === null) {
      levelUpStarsAwardedRef.current = null;
    }
  }, [isLevelUpShowing, pendingLevelUp]);

  // Calculate cards in foundations
  const foundationCards = Object.values(foundations).reduce((sum, f) => sum + f.length, 0);
  
  // Handle debug panel open
  const handleDebugClick = () => {
    const BASE_WIDTH = 640;
    const BASE_HEIGHT = 692;
    const scaleX = containerWidth / BASE_WIDTH;
    const scaleY = availableHeight / BASE_HEIGHT;
    
    setDebugInfo({
      title: 'Game Debug Info',
      position: { x: 10, y: 10 },
      section: 'Debug',
      data: {
        'Version': GAME_VERSION, // v3.55.0 - adjusted levelup thresholds
        'Game Mode': gameMode || 'random',
        'Foundation Cards': `${foundationCards}/52`,
        'Win': isWon ? 'Yes' : 'No',
        'Container': `${containerWidth}x${containerHeight}`,
        'Available Height': `${availableHeight}px`,
        'Scale': scale.toFixed(3),
        'Scale X': scaleX.toFixed(3),
        'Scale Y': scaleY.toFixed(3),
      }
    });
    setShowDebugPanel(true);
  };

  // Track if we're waiting for flying icons before showing win screen
  const [pendingWinScreen, setPendingWinScreen] = useState(false);
  
  // Handle win condition - wait for flying icons AND card animations to finish
  useEffect(() => {
    if (isWon && !winHandled) {
      playSuccess();
      setWinHandled(true);
      // Add stars for winning immediately (persisted via localStorage effect)
      addStars(STARS_PER_WIN);
      
      // Check if there are flying icons or card animations
      if (flyingIcons.length > 0 || animatingCard) {
        // Wait for animations to finish
        setPendingWinScreen(true);
      } else {
        // No animations, show win screen with small delay for visual polish
        setTimeout(() => {
          setShowWinScreen(true);
        }, 300);
      }
    }
  }, [isWon, winHandled, playSuccess, flyingIcons.length, animatingCard]);
  
  // Show win screen when all flying icons have landed AND card animations finished (if pending)
  useEffect(() => {
    if (pendingWinScreen && flyingIcons.length === 0 && !animatingCard) {
      setPendingWinScreen(false);
      // Add 0.5s delay before showing win screen
      setTimeout(() => {
        setShowWinScreen(true);
      }, 500);
    }
  }, [pendingWinScreen, flyingIcons.length, animatingCard]);
  
  // Reset win handled when starting new game
  useEffect(() => {
    if (!isWon) {
      setWinHandled(false);
      dailyQuestsShownThisWinRef.current = false; // Reset daily quests tracker
    }
  }, [isWon]);
  
  // Check for available moves after each game state change
  useEffect(() => {
    // Don't check if already won or showing no moves
    if (isWon || hasNoMoves) return;
    
    // Don't check during dealing or auto-collecting
    if (isDealing || isAutoCollecting) return;
    
    // Delay the check to let animations complete and state settle
    const timer = setTimeout(() => {
      const currentState = useSolitaire.getState();
      // Skip if animations are running - will be triggered again when they complete
      if (currentState.animatingCard || currentState.isStockAnimating || currentState.isAutoCollecting || currentState.isDealing) return;
      if (currentState.isWon || currentState.hasNoMoves) return;
      
      // Check if game is won (all 52 cards in foundations) - don't show "no moves" in this case
      const totalInFoundations = Object.values(currentState.foundations).reduce((sum, f) => sum + f.length, 0);
      if (totalInFoundations === 52) return;
      
      checkForAvailableMoves();
    }, 300); // Reduced delay
    
    return () => clearTimeout(timer);
  }, [tableau, waste, stock, foundations, isWon, animatingCard, hasNoMoves, checkForAvailableMoves, isDealing, isAutoCollecting]);
  
  // Win Flow Hook - handles all popup chains after winning
  const {
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
  } = useWinFlow({
    addStars,
    setDisplayedStars,
    launchTreasureStars,
    setShowWinScreen,
    dailyQuests,
    setDailyQuests,
    acesCollected,
    setAcesCollected,
    openDailyQuests,
    closeDailyQuests,
    dailyQuestsAfterWin,
    setDailyQuestsAfterWin,
    setPointsEventState,
    setPackRewardsQueue,
    setShowPackPopup,
    miniatureContainerRef,
    setAutoClaimingRewards,
    pendingLevelUp,
    setPendingLevelUp,
    setPlayerLevel,
    playerLevel,
    collections,
    rewardedCollections,
    collectionsUnlocked,
    collectionsUnlockShown,
    setCollectionsUnlockShown,
    pendingCollectionsUnlock,
    setPendingCollectionsUnlock,
    setPendingCollectionRewards,
    setCollectionsAfterWin,
    openCollections,
    leaderboardUnlockShown,
    setLeaderboardUnlockShown,
    pendingLeaderboardUnlock,
    setPendingLeaderboardUnlock,
    pendingLeaderboardShow,
    setPendingLeaderboardShow,
    openLeaderboard,
    pendingAfterLeaderboardRef,
    initializeLeaderboardData,
    tryShowLeaderboard,
    promoUnlocked,
    setPromoUnlocked,
    pendingPromoUnlock,
    setPendingPromoUnlock,
    treasureHuntEvent,
    setTreasureHuntEvent,
    dungeonDigEvent,
    setDungeonDigEvent,
    treasureHuntExpired,
    dungeonDigExpired,
    treasureHuntPromoShown,
    setTreasureHuntPromoShown,
    pendingTreasureHuntPromo,
    setPendingTreasureHuntPromo,
    pendingDungeonDigPromo,
    setPendingDungeonDigPromo,
    nextEventType,
    keysDistributedRef,
    shovelsDistributedRef,
    resetTreasureHunt,
    resetDungeonDig,
    activateTreasureHuntEvent,
    activateDungeonDigEvent,
    tryShowDailyReward,
    newGame,
    clearNoMoves,
    setShowNewGameButton,
    setNoMovesShownOnce,
    dailyQuestsShownThisWinRef,
    autoClaimingRewardsRef,
    isClaimingRewardRef,
  });
  
  // Handle leaderboard close - wrapper to pass through to hook
  const handleLeaderboardClose = () => handleLeaderboardCloseFromHook();
  
  // Reset daily quests progress
  const handleResetDailyQuests = () => {
    setDailyQuests(prev => prev.map(quest => ({
      ...quest,
      current: 0,
      completed: false,
      rewardClaimed: false
    })));
    setAcesCollected(0);
  };
  
  // Reset stars progress
  const handleResetStars = () => {
    resetStarsProgress();
  };
  
  // Reset collections progress
  const handleResetCollections = () => {
    setCollections(defaultCollections);
    setRewardedCollections(new Set());
    setAllCollectionsRewarded(false);
    setNewItemsInCollections(new Set());
    setNewItemIds(new Set());
    setHasNewCollectionItem(false);
  };
  
  // Debug actions hook - test win, level up, next day, start dungeon, reset all, drop collection item
  const {
    handleTestWin,
    handleTestLevelUp,
    handleNextDay,
    handleStartDungeonDig,
    handleResetAll,
    handleDropCollectionItem,
  } = useDebugActions({
    playSuccess,
    addStars,
    resetStarsProgress,
    setShowWinScreen,
    setPendingWinScreen,
    flyingIconsLength: flyingIcons.length,
    setPendingLevelUp,
    showPopupViaQueue,
    starsPerLevelUp: STARS_PER_LEVELUP,
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
  });
  
  // Handle shop purchase
  const handleShopPurchase = (item: ShopItem) => {
    // Add stars
    addStars(item.stars);
    
    // If there's a pack, show pack popup
    if (item.packRarity && item.packRarity > 0) {
      const packItems = generatePackItems(item.packRarity as PackRarity, collections);
      setPackRewardsQueue(prev => [...prev, { rarity: item.packRarity as PackRarity, items: packItems }]);
      setShowPackPopup(true);
    }
  };
  // NOTE: handleSubscribe moved to useShop hook
  // NOTE: handleDropCollectionItem moved to useDebugActions hook
  
  // Handle star arriving at progress bar - update displayed stars and trigger pulse
  // Real stars are already saved to localStorage, this updates the visual display
  const handleStarArrived = (count: number = 1) => {
    // Increment displayed stars by count (visual update)
    setDisplayedStars(prev => prev + count);
    // Trigger pulse animation
    triggerStarPulse();
  };
  
  // Handle stars from other players - update displayed and total stars
  // BUT NOT season stars (leaderboard) - these are not earned by the player
  const handleOtherPlayerStars = (count: number) => {
    // Guard against NaN
    const safeCount = typeof count === 'number' && !isNaN(count) ? count : 0;
    if (safeCount <= 0) return;
    
    // Increment displayed and total stars only (NOT seasonStars for leaderboard)
    // Use addStarsBase to avoid season stars update
    setDisplayedStars(prev => prev + safeCount);
    addStarsBase(safeCount); // Only totalStars, not addStars() which adds to season
    // Trigger pulse animation
    triggerStarPulse();
  };
  
  // Clean up any visual feedback when drag ends
  useEffect(() => {
    if (!isDragging) {
      // Clear all visual feedback when not dragging
      clearAllDropTargetHighlights();
    }
  }, [isDragging]);

  // Note: Drag end is now handled by individual drag components via onDragEnd

  // Generate CSS for hint highlight - single pulse, no glow
  const hintStyle = hint ? `
    ${hint.cardId ? `
      [data-card-id="${hint.cardId}"] {
        animation: hint-pulse 0.3s ease-in-out forwards !important;
      }
    ` : ''}
    ${hint.type === 'stock' ? `
      [data-stock-pile] {
        animation: hint-pulse 0.3s ease-in-out forwards !important;
      }
    ` : ''}
    @keyframes hint-pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.08); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
  ` : '';

  return (
    <div 
      className="min-h-screen bg-green-800 flex flex-col items-center justify-start" 
      data-game-board
      style={{ 
        paddingTop: '5px',
        paddingBottom: '5px',
        paddingLeft: '3px',
        paddingRight: '3px',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
      onDoubleClick={(e) => {
        // Double-click on empty area (anywhere on the board) collects all available cards
        const target = e.target as HTMLElement;
        // Ignore clicks on interactive elements
        const isOnCard = target.closest('[data-card-id]');
        const isOnPile = target.closest('[data-pile]');
        const isOnStock = target.closest('[data-stock-pile]');
        const isOnButton = target.closest('button');
        const isOnPopup = target.closest('[data-popup]');
        if (!isOnCard && !isOnPile && !isOnStock && !isOnButton && !isOnPopup && !isAutoCollecting) {
          collectAllAvailable();
        }
      }}
      onTouchEnd={(e) => {
        // Double-tap detection for mobile (anywhere on the board)
        const target = e.target as HTMLElement;
        // Ignore taps on interactive elements
        const isOnCard = target.closest('[data-card-id]');
        const isOnPile = target.closest('[data-pile]');
        const isOnStock = target.closest('[data-stock-pile]');
        const isOnButton = target.closest('button');
        const isOnPopup = target.closest('[data-popup]');
        
        if (isOnCard || isOnPile || isOnStock || isOnButton || isOnPopup) {
          return; // Let the element handle its own tap
        }
        
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300; // ms
        
        if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
          // Double tap detected on empty area
          if (!isAutoCollecting) {
            e.preventDefault();
            collectAllAvailable();
          }
          lastTapTimeRef.current = 0; // Reset to prevent triple tap triggering
        } else {
          lastTapTimeRef.current = now;
        }
      }}
    >
      {/* Hint highlight style */}
      {hint && <style>{hintStyle}</style>}
      <div 
        className="w-full" 
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div style={{ 
          display: 'inline-block',
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          {/* Placeholder for Donation Progress Bar - maintains layout spacing */}
          {/* Actual DonationProgress is rendered via portal at the end of the component */}
          <div style={{ 
            width: '584px', 
            height: '65px',
            marginBottom: '0px'
          }} />
          
          {/* Top Event Bar - Points Event, Treasure Hunt, Dungeon Dig icons */}
          <TopEventBar
            pointsEventIconRef={pointsEventIconRef}
            treasureHuntIconRef={treasureHuntIconRef}
            dungeonDigIconRef={dungeonDigIconRef}
            miniatureContainerRef={miniatureContainerRef}
            showDailyQuests={showDailyQuests}
            showCollections={showCollections}
            collectionsUnlocked={collectionsUnlocked}
            promoUnlocked={promoUnlocked}
            playerLevel={playerLevel}
            pointsEventState={pointsEventState}
            pointsEventPulse={pointsEventPulse}
            animatingRewardIndex={animatingRewardIndex}
            nextRewardDropping={nextRewardDropping}
            rewardIconAnimating={rewardIconAnimating}
            flyingRewardToMiniature={flyingRewardToMiniature}
            treasureHuntEvent={treasureHuntEvent}
            treasureHuntExpired={treasureHuntExpired}
            treasureHuntTimeRemaining={treasureHuntTimeRemaining}
            treasureHuntTimeCritical={treasureHuntTimeCritical}
            treasureHuntPulse={treasureHuntPulse}
            dungeonDigEvent={dungeonDigEvent}
            dungeonDigExpired={dungeonDigExpired}
            dungeonDigTimeRemaining={dungeonDigTimeRemaining}
            dungeonDigTimeCritical={dungeonDigTimeCritical}
            dungeonDigPulse={dungeonDigPulse}
            nextEventType={nextEventType}
            onShowLockedPointsEvent={() => popupQueue.showOnDemand({ type: 'lockedPointsEvent' })}
            onShowPointsEvent={openPointsEventPopup}
            onShowTreasureHunt={openTreasureHunt}
            onShowDungeonDig={openDungeonDig}
            onShowLockedDungeon={() => popupQueue.showOnDemand({ type: 'lockedDungeon' })}
            onPromoStarArrived={(count) => {
              const safeCount = typeof count === 'number' && !isNaN(count) ? count : 0;
              if (safeCount <= 0) return;
              addStars(safeCount);
              setDisplayedStars(prev => prev + safeCount);
              triggerStarPulse();
            }}
            onPromoCollectionCardArrived={() => {
              setCollectionButtonPulse(true);
              setTimeout(() => setCollectionButtonPulse(false), 150);
            }}
            onPromoPurchase={(packId, stars, cards) => {
              console.log(`Pack purchased: ${packId}, stars: ${stars}, cards: ${cards}`);
            }}
          />
          
          {/* Game field container - no side panels */}
          {/* Note: onDoubleClick and onTouchEnd handlers moved to parent data-game-board to cover entire screen */}
          <div 
            className="inline-block space-y-3" 
            data-game-field 
            style={{ 
              position: 'relative', 
              zIndex: 2,
                visibility: (showDailyQuests || showCollections) ? 'hidden' : 'visible',
                pointerEvents: 'auto',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
            {/* Background layer for double-click detection */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: -1
              }}
            />
            {/* Top row: Foundation piles on LEFT, Stock and Waste on RIGHT - optimized for right-handed mobile users */}
            <div className="flex gap-1 items-start justify-between" style={{ width: '584px' }}>
              <div className="flex gap-1">
                {foundationRenderOrder.map((suit) => (
                  <FoundationPile 
                    key={suit}
                    cards={foundations[suit]} 
                    suit={suit} 
                    id={`foundation-${suit}`} 
                  />
                ))}
              </div>
                <div className="flex gap-1" style={{ marginRight: '8px' }}>
                <WastePile cards={waste} />
                <StockPile cards={stock} />
              </div>
            </div>
            
            {/* Bottom row: Tableau columns */}
            {/* keyUpdateCounter triggers re-render when keys change, without remounting */}
            <div className="flex gap-1" style={{ minHeight: '400px', paddingBottom: '20px' }} data-key-update={keyUpdateCounter}>
              {tableau.map((column, index) => (
                <div key={index} className="min-h-32">
                  <TableauColumn cards={column} columnIndex={index} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Render animating card */}
      {animatingCard && (
        <div style={{ position: 'fixed', zIndex: 1000, pointerEvents: 'none' }}>
          <CardAnimation
            card={animatingCard.card}
            startPosition={animatingCard.startPosition}
            endPosition={animatingCard.endPosition}
            onComplete={() => completeCardAnimation(animatingCard.card, animatingCard.targetSuit, animatingCard.cardStartPosition)}
            stackCards={animatingCard.stackCards} // Pass stack cards for multi-card animation
          />
        </div>
      )}
      
      {/* Render drag preview for dragged cards */}
      {showDragPreview && draggedCards.length > 0 && dragPreviewPosition && (
        <div style={{ position: 'fixed', zIndex: 1000, pointerEvents: 'none' }}>
          <DragPreview
            cards={draggedCards}
            startPosition={dragPreviewPosition}
            offset={dragOffset || { x: 32, y: 48 }}
          />
        </div>
      )}
      
      
      {/* Floating scores */}
      {floatingScores.map(score => (
        <FloatingScore
          key={score.id}
          score={score.score}
          x={score.x}
          y={score.y}
          breakdown={score.breakdown}
          onComplete={() => removeFloatingScore(score.id)}
        />
      ))}
      
      {/* Debug Panel */}
      {showDebugPanel && (
        <div style={{ position: 'fixed', zIndex: 1001 }}>
        <DebugPopup 
          info={debugInfo} 
          onClose={() => setShowDebugPanel(false)}
          onResetDailyQuests={handleResetDailyQuests}
          onResetStars={handleResetStars}
          onResetCollections={handleResetCollections}
          onResetXP={resetAllXP}
          onResetAll={handleResetAll}
          onNewGame={newGame}
        />
        </div>
      )}
      
      {/* Win Screen */}
      <WinScreen
        isVisible={showWinScreen}
        starsEarned={STARS_PER_WIN}
        onComplete={handleWinComplete}
        progressBarRef={progressBarRef}
        onStarArrived={handleStarArrived}
      />
      
      
      {/* No Moves Modal - show once, then button appears */}
      <NoMovesModal
        isVisible={hasNoMoves && !noMovesShownOnce}
        onNewGame={() => {
          clearNoMoves();
          setShowNewGameButton(false);
          setNoMovesShownOnce(false);
          newGame('solvable');
        }}
        onClose={() => {
          clearNoMoves();
          setNoMovesShownOnce(true);
          setShowNewGameButton(true);
        }}
      />
      
      {/* Level Up Screen - rendered via queue */}
      <LevelUpScreen
        isVisible={popupQueue.current?.type === 'levelUp'}
        newLevel={popupQueue.current?.type === 'levelUp' ? popupQueue.current.level : (pendingLevelUp || 1)}
        starsReward={STARS_PER_LEVELUP}
        onComplete={handleLevelUpComplete}
        progressBarRef={progressBarRef}
        onStarArrived={handleStarArrived}
      />
      
      {/* Daily Quests */}
      <DailyQuests
        isVisible={showDailyQuests}
        quests={dailyQuests}
        onClose={handleDailyQuestsClose}
        onReset={handleResetDailyQuests}
        progressBarRef={progressBarRef}
        onStarArrived={handleStarArrived}
        onQuestRewardClaimed={(questId) => {
          setDailyQuests(prev => prev.map(q => 
            q.id === questId ? { ...q, rewardClaimed: true } : q
          ));
        }}
        monthlyProgress={monthlyProgress}
        monthlyTarget={MONTHLY_TARGET}
        monthlyReward={MONTHLY_REWARD}
        monthlyRewardClaimed={monthlyRewardClaimed}
        onMonthlyRewardClaim={() => {
          if (monthlyProgress >= MONTHLY_TARGET && !monthlyRewardClaimed) {
            addStars(MONTHLY_REWARD);
            setMonthlyRewardClaimed(true);
          }
        }}
        onMonthlyProgressIncrement={() => {
          setMonthlyProgress(prev => prev + 1);
        }}
      />
      
      {/* Shop */}
      <Shop
        isVisible={showShop}
        onClose={() => {
          closeShop();
          tryShowLeaderboard();
        }}
        onPurchase={handleShopPurchase}
        onSubscribe={handleSubscribe}
        isSubscribed={isSubscribed}
        onStarArrived={(count) => {
          // Animate star counter
          setDisplayedStars(prev => prev + count);
        }}
        onCollectionItemArrived={(x, y) => {
          // Create collision particles at arrival point
          createCollisionParticles(x, y);
          // Pulse the collections button
          setCollectionButtonPulse(true);
          setTimeout(() => setCollectionButtonPulse(false), 150);
        }}
      />
      
      {/* Streak Popup - shown before daily reward if streak >= 2 - rendered via queue */}
      <StreakPopup
        isVisible={isStreakShowing}
        streakDay={isStreakShowing && popupQueue.current?.type === 'streak' ? popupQueue.current.count : pendingStreak}
        onContinue={() => {
          popupQueue.dismiss();
          showPopupViaQueue({ type: 'dailyReward', day: pendingStreak, stars: pendingDailyReward });
        }}
      />
      
      {/* Daily Reward Popup - rendered via queue */}
      <DailyRewardPopup
        isVisible={isDailyRewardShowing}
        currentDay={isDailyRewardShowing && popupQueue.current?.type === 'dailyReward' ? popupQueue.current.day : pendingStreak}
        previousStreak={dailyStreak}
        onClaim={claimDailyReward}
        progressBarRef={progressBarRef}
        onStarArrived={handleStarArrived}
      />
      
      {/* Leaderboard Popup */}
      <LeaderboardPopup
        isVisible={showLeaderboard}
        onClose={handleLeaderboardClose}
        players={leaderboardPlayers}
        oldPosition={leaderboardOldPosition}
        newPosition={leaderboardNewPosition}
        seasonInfo={seasonInfo}
      />
      
      {/* Locked Feature Popups */}
      <LockedFeaturePopups />
      
      {/* Unlock Popups (Collections, Leaderboard, Promo) - rendered via queue */}
      <UnlockPopups
        onCollectionsUnlockClose={handleCollectionsUnlockClose}
        onLeaderboardUnlockClose={handleLeaderboardUnlockClose}
        onPromoUnlockClose={handlePromoUnlockClose}
      />
      
      {/* Treasure Hunt Promo (shown when event unlocks) - rendered via queue */}
      {popupQueue.current?.type === 'treasureHuntPromo' && (
        <TreasureHuntPromo onClose={handleTreasureHuntPromoClose} />
      )}
      
      {/* Dungeon Dig Promo (shown when event starts in rotation) - rendered via queue */}
      {popupQueue.current?.type === 'dungeonDigPromo' && (
        <DungeonDigPromo onClose={handleDungeonDigPromoClose} />
      )}
      
      {/* Event Ended Popup */}
      <EventEndedPopup
        isVisible={showEventEndedPopup}
        event={treasureHuntEvent}
        onClose={() => popupQueue.closeOnDemand()}
        onSpendKeys={() => {
          popupQueue.closeOnDemand();
          openTreasureHunt();
        }}
      />
      
      {/* Treasure Hunt Popup */}
      <TreasureHuntPopup
        isVisible={showTreasureHunt}
        onClose={closeTreasureHunt}
        event={treasureHuntEvent}
        onEventUpdate={setTreasureHuntEvent}
        onRewardClaimed={(reward, chestPosition) => {
          console.log('🎁 Treasure Hunt reward claimed:', reward);
          
          // Use chest position or screen center for animations
          const startX = chestPosition?.x || window.innerWidth / 2;
          const startY = chestPosition?.y || window.innerHeight / 2;
          
          // Handle empty chest - show "Пусто" floating text
          if (reward.type === 'empty') {
            addFloatingScore(0, startX, startY, 'empty');
            return;
          }
          
          // Handle stars reward from chest
          if (reward.stars) {
            addStars(reward.stars);
            // Launch flying stars animation from chest to progress bar
            launchTreasureStars(reward.stars, { x: startX, y: startY });
          }
          
          // Handle pack rewards (new system) - add to queue for sequential display
          if ((reward.type === 'pack' || reward.type === 'big_win') && reward.packRarity) {
            console.log('📦 Pack reward detected, rarity:', reward.packRarity);
            // Generate pack items and add to queue
            const packItems = generatePackItems(reward.packRarity, collections);
            console.log('📦 Generated pack items:', packItems);
            
            const newPackReward = { 
              rarity: reward.packRarity, 
              items: packItems,
              sourcePosition: { x: startX, y: startY }
            };
            
            // Add to queue
            setPackRewardsQueue(prev => [...prev, newPackReward]);
            
            // If popup not showing yet, show it after delay
            if (!showPackPopup) {
              setTimeout(() => {
                console.log('📦 Showing pack popup');
                setShowPackPopup(true);
              }, reward.stars ? 800 : 300);
            }
          }
        }}
        isLocked={!isEventAvailable(playerLevel)}
        requiredLevel={getRequiredLevel()}
      />
      
      {/* Dungeon Dig Popup */}
      <DungeonDigPopup
        isVisible={showDungeonDig}
        onClose={() => {
          closeDungeonDig();
          setDungeonEventCompleteOverlay(false);
        }}
        onEventComplete={() => {
          // Event is complete (all 10 floors done) - deactivate and hide icon
          const deactivatedEvent = {
            ...dungeonDigEvent,
            active: false,
            shovels: 0 // Clear shovels - can't be used after completion
          };
          saveDungeonDigEvent(deactivatedEvent);
          setDungeonDigEvent(deactivatedEvent);
        }}
        event={dungeonDigEvent}
        onEventUpdate={setDungeonDigEvent}
        onRewardClaimed={(reward, tilePosition) => {
          console.log('⛏️ Dungeon tile reward:', reward);
          
          const startX = tilePosition?.x || window.innerWidth / 2;
          const startY = tilePosition?.y || window.innerHeight / 2;
          
          if (reward.type === 'empty') {
            addFloatingScore(0, startX, startY, 'empty');
            return;
          }
          
          if (reward.type === 'exit') {
            addFloatingScore(0, startX, startY, 'exit');
            return;
          }
          
          if (reward.stars) {
            addStars(reward.stars);
            launchTreasureStars(reward.stars, { x: startX, y: startY });
          }
          
          if (reward.type === 'pack' && reward.packRarity) {
            const packItems = generatePackItems(reward.packRarity, collections);
            const newPackReward = { 
              rarity: reward.packRarity, 
              items: packItems,
              sourcePosition: { x: startX, y: startY }
            };
            setPackRewardsQueue(prev => [...prev, newPackReward]);
            setPackBlocksTiles(true); // Block tiles until cards start flying
            setShowPackPopup(true);
          }
        }}
        onDigTile={(floorId, tileId) => {
          const result = dungeonDigTile(dungeonDigEvent, floorId, tileId);
          saveDungeonDigEvent(result.event);
          setDungeonDigEvent(result.event);
          return { reward: result.reward, floorCompleted: result.floorCompleted, milestoneUnlocked: result.milestoneUnlocked };
        }}
        onStarsEarned={(stars, position) => {
          // Stars earned - add and launch with classic effect
          addStars(stars);
          launchTreasureStars(stars, position);
        }}
        onMilestoneReward={(floorIdx, reward) => {
          console.log('🏆 Milestone reward claimed:', floorIdx, reward);
          
          // Update milestoneClaimed in event
          const updatedEvent = {
            ...dungeonDigEvent,
            milestoneClaimed: [...(dungeonDigEvent.milestoneClaimed || []), floorIdx]
          };
          saveDungeonDigEvent(updatedEvent);
          setDungeonDigEvent(updatedEvent);
          
          // Note: Stars are handled separately via onStarsEarned
          
          // Track if floor 10 (index 9) was completed - show event complete after pack claimed
          if (floorIdx === 9 && reward.packRarity) {
            setPendingDungeonEventComplete(true);
          }
          
          // Award pack - use source position from reward if provided
          if (reward.packRarity) {
            const packItems = generatePackItems(reward.packRarity, collections);
            const rewardWithPos = reward as typeof reward & { sourcePosition?: { x: number; y: number } };
            const newPackReward = { 
              rarity: reward.packRarity, 
              items: packItems,
              sourcePosition: rewardWithPos.sourcePosition || { x: window.innerWidth / 2, y: window.innerHeight / 2 },
              skipBounce: true // No bounce animation for milestone rewards - pack flies directly from reward row
            };
            setPackRewardsQueue(prev => [...prev, newPackReward]);
            // Show pack popup immediately - animation handled by CollectionPackPopup
            setShowPackPopup(true);
          }
        }}
        showEventCompleteOverlay={dungeonEventCompleteOverlay}
        isPackPopupOpen={packBlocksTiles}
      />
      
      {/* Dungeon Event Ended Popup */}
      <DungeonEndedPopup
        isVisible={showDungeonEndedPopup}
        event={dungeonDigEvent}
        onClose={() => popupQueue.closeOnDemand()}
        onSpendShovels={() => {
          popupQueue.closeOnDemand();
          openDungeonDig();
        }}
      />
      
      {/* Points Event Popup */}
      <PointsEventPopup
        isVisible={showPointsEventPopup}
        eventState={pointsEventState}
        onClose={closePointsEventPopup}
      />
      
      {/* Collection Pack Popup */}
      <CollectionPackPopup
        isVisible={showPackPopup}
        packRarity={currentPackReward?.rarity || 1}
        items={currentPackReward?.items || []}
        sourcePosition={currentPackReward?.sourcePosition}
        skipBounce={currentPackReward?.skipBounce}
        onCardsStartFlying={() => {
          // Cards are flying - unblock tiles early
          setPackBlocksTiles(false);
        }}
        onClose={() => {
          // Remove current pack from queue
          setPackRewardsQueue(prev => {
            const newQueue = prev.slice(1);
            console.log(`📦 Pack closed, ${newQueue.length} packs remaining in queue`);
            
            // If more packs in queue, keep popup open (will show next pack)
            if (newQueue.length > 0) {
              // Small delay before showing next pack
              setTimeout(() => {
                console.log('📦 Showing next pack from queue');
              }, 300);
            } else {
              // No more packs - close popup
              setShowPackPopup(false);
              
              // Check if dungeon event was just completed (floor 10 pack claimed)
              if (pendingDungeonEventComplete) {
                setPendingDungeonEventComplete(false);
                // Small delay before showing event complete overlay
                setTimeout(() => {
                  setDungeonEventCompleteOverlay(true);
                }, 300);
              }
              
              // If we're in auto-claiming mode, try to claim next reward
              if (autoClaimingRewardsRef.current) {
                setTimeout(() => {
                  const hasMore = tryClaimPointsEventReward();
                  if (!hasMore) {
                    autoClaimingRewardsRef.current = false;
                    setAutoClaimingRewards(false);
                    proceedAfterPointsEventRewards();
                  }
                }, 300);
              }
            }
            
            return newQueue;
          });
        }}
        onItemsCollected={(items) => {
          // Update collections with new items
          setCollections(prev => {
            const updated = [...prev];
            items.forEach(item => {
              const collectionIndex = updated.findIndex(c => c.id === item.collectionId);
              if (collectionIndex !== -1) {
                const itemIndex = updated[collectionIndex].items.findIndex(i => i.id === item.itemId);
                if (itemIndex !== -1 && !updated[collectionIndex].items[itemIndex].collected) {
                  updated[collectionIndex] = {
                    ...updated[collectionIndex],
                    items: updated[collectionIndex].items.map((i, idx) =>
                      idx === itemIndex ? { ...i, collected: true } : i
                    )
                  };
                  // Track new items
                  setNewItemsInCollections(prev => new Set([...prev, item.collectionId]));
                  setNewItemIds(prev => new Set([...prev, item.itemId]));
                }
              }
            });
            return updated;
          });
          setHasNewCollectionItem(true);
        }}
        onItemArrived={(x, y) => {
          // Create particle effect at arrival point
          createCollisionParticles(x, y);
          // Pulse the collections button
          setCollectionButtonPulse(true);
          setTimeout(() => setCollectionButtonPulse(false), 150);
        }}
        collectionsButtonRef={collectionsButtonRef}
        sourceRef={miniatureContainerRef}
      />
      
      {/* Flying Keys Container */}
      <FlyingKeysContainer />
      
      {/* Flying Key Drops (keys falling onto cards) */}
      {flyingKeyDrops.map(drop => (
        <FlyingKeyDrop
          key={drop.id}
          id={drop.id}
          cardId={drop.cardId}
          targetX={drop.targetX}
          targetY={drop.targetY}
          onComplete={() => setFlyingKeyDrops(prev => prev.filter(d => d.id !== drop.id))}
        />
      ))}
      
      {/* Flying Shovels Container */}
      <FlyingShovelsContainer />
      
      {/* Flying Shovel Drops (shovels falling onto cards) */}
      {flyingShovelDrops.map(drop => (
        <FlyingShovelDrop
          key={drop.id}
          cardId={drop.cardId}
          targetX={drop.targetX}
          targetY={drop.targetY}
          onComplete={() => setFlyingShovelDrops(prev => prev.filter(d => d.id !== drop.id))}
        />
      ))}
      
      {/* Flying Stars from Treasure Hunt */}
      {treasureFlyingStars.map(star => (
        <TreasureFlyingStarComponent
          key={star.id}
          star={star}
          onArrived={() => handleTreasureStarArrived(star)}
        />
      ))}
      
      {/* Flying reward to miniature row */}
      {flyingRewardToMiniature && (
        <FlyingRewardToMiniature
          reward={flyingRewardToMiniature}
          targetRef={miniatureContainerRef}
          pendingIndex={flyingRewardToMiniature.pendingIndex}
          onComplete={() => {
            setFlyingRewardToMiniature(null);
            // Reset earning flag to allow next reward (will be triggered by next card callback)
            isEarningRewardRef.current = false;
          }}
        />
      )}
      
      {/* Collections */}
      <Collections
        isVisible={showCollections}
        collections={collections}
        onClose={() => {
          closeCollections();
          // If there were pending collection rewards, check if more in queue
          if (pendingCollectionRewards.length > 0) {
            // Remove the first (just shown) collection from queue
            const remaining = pendingCollectionRewards.slice(1);
            setPendingCollectionRewards(remaining);
            
            // Sync displayed stars
            const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
            setDisplayedStars(actualTotal);
            
            if (remaining.length > 0) {
              // Show next collection reward
              setTimeout(() => openCollections(), 300);
            } else if (collectionsAfterWin) {
              // No more rewards and was opened after win - check leaderboard then start new game
              setCollectionsAfterWin(false);
              const startNewGameFn = () => {
                clearNoMoves();
                setShowNewGameButton(false);
                setNoMovesShownOnce(false);
              newGame('solvable');
              };
              if (!tryShowLeaderboard(startNewGameFn)) {
                startNewGameFn();
              }
            } else {
              // Manual close - check leaderboard
              tryShowLeaderboard();
            }
          } else if (collectionsAfterWin) {
            // Collections was opened after win but no pending rewards - check leaderboard then start new game
            setCollectionsAfterWin(false);
            const startNewGameFn = () => {
              clearNoMoves();
              setShowNewGameButton(false);
              setNoMovesShownOnce(false);
              newGame('solvable');
            };
            if (!tryShowLeaderboard(startNewGameFn)) {
              startNewGameFn();
            }
          } else {
            // Manual close - check leaderboard
            tryShowLeaderboard();
          }
        }}
        petIcon="🐕"
        petName="Бусинка"
        seasonName="Сезон 1"
        newItemsInCollections={newItemsInCollections}
        newItemIds={newItemIds}
        onCollectionViewed={handleCollectionViewed}
        progressBarRef={progressBarRef}
        onStarArrived={handleStarArrived}
        pendingRewardCollectionId={pendingCollectionRewards.length > 0 ? pendingCollectionRewards[0] : null}
        rewardedCollections={rewardedCollections}
        onCollectionRewarded={(collectionId, reward) => {
          // Mark collection as rewarded
          setRewardedCollections(prev => new Set(Array.from(prev).concat(collectionId)));
          // Add stars
          addStars(reward);
          // Remove from new items - rewarded collections don't need viewing
          setNewItemsInCollections(prev => {
            const newSet = new Set(prev);
            newSet.delete(collectionId);
            if (newSet.size === 0) {
              setHasNewCollectionItem(false);
            }
            return newSet;
          });
          // Remove item IDs for this collection
          const collection = collections.find(c => c.id === collectionId);
          if (collection) {
            setNewItemIds(prev => {
              const newSet = new Set(prev);
              collection.items.forEach(item => newSet.delete(item.id));
              return newSet;
            });
          }
        }}
        onRewardAnimationComplete={(collectionId) => {
          // Remove this collection from pending rewards queue
          setPendingCollectionRewards(prev => prev.filter(id => id !== collectionId));
          // Note: displayedStars is already updated by handleStarArrived for each star
          // No need to sync with localStorage here
        }}
        allCollectionsRewarded={allCollectionsRewarded}
        onAllCollectionsRewarded={(reward) => {
          // Mark all collections as rewarded
          setAllCollectionsRewarded(true);
          // Add stars
          addStars(reward);
          // Clear all new item notifications - everything is rewarded
          setNewItemsInCollections(new Set());
          setNewItemIds(new Set());
          setHasNewCollectionItem(false);
        }}
        onDebugCompleteAll={() => {
          // Debug: Mark all items as collected
          setCollections(prev => prev.map(collection => ({
            ...collection,
            items: collection.items.map(item => ({ ...item, collected: true }))
          })));
          
          // Mark all collections as rewarded and add their rewards
          const allCollectionIds = new Set(collections.map(c => c.id));
          setRewardedCollections(allCollectionIds);
          
          // Calculate total reward from all collections
          const totalCollectionReward = collections.reduce((sum, c) => sum + c.reward, 0);
          addStars(totalCollectionReward);
          
          // Mark grand prize as not yet claimed so the animation can play
          setAllCollectionsRewarded(false);
          
          // Close and reopen to trigger grand prize flow
          closeCollections();
          setTimeout(() => {
            openCollections();
          }, 100);
        }}
        resetKey={collectionsResetKey}
      />
      
      {/* Single Donation Progress Bar - ALWAYS rendered via portal */}
      {ReactDOM.createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: `${5 * scale}px`,
            left: '50%',
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: 'top center',
            width: '584px',
            zIndex: (showWinScreen || isLevelUpShowing || showDailyQuests || showCollections) ? 10002 : 10
          }}
        >
          <DonationProgress
            ref={progressBarRef}
            currentStars={displayedStars}
            targetStars={3500}
            petStory="Бусинка была найдена на улице с травмой лапки. Ей нужна операция и курс реабилитации, чтобы снова бегать и радоваться жизни. После лечения она отправится в приют, где будет ждать свою семью. Собирая звёзды в игре, ты помогаешь оплатить её лечение!"
            donationAmount="50 000 ₽"
            endTime={new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000 + 24 * 60 * 1000 + 13 * 1000)}
            onTestWin={handleTestWin}
            onDropCollectionItem={handleDropCollectionItem}
            onTestLevelUp={handleTestLevelUp}
            onNextDay={handleNextDay}
            onStartDungeonDig={handleStartDungeonDig}
            onShowOvertaken={() => {
              setShowOvertakenNotification(true);
              setTimeout(() => setShowOvertakenNotification(false), 3000);
            }}
            onDebugClick={handleDebugClick}
            pulseKey={starPulseKey}
            onOtherPlayerStars={handleOtherPlayerStars}
            disableOtherPlayerNotifications={showDailyQuests || showCollections || showWinScreen || isLevelUpShowing || showShop}
          />
        </div>,
        document.body
      )}
      
      {/* Bottom Buttons Row */}
      <BottomButtonRow
        isVisible={!showWinScreen && !popupQueue.onDemandPopup && !popupQueue.current}
        showSecondaryCollectionsButton={showTreasureHunt || showDungeonDig}
        showNewGameButton={showNewGameButton}
        canUndo={canUndo}
        dailyQuests={dailyQuests}
        collectionsUnlocked={collectionsUnlocked}
        leaderboardUnlocked={leaderboardUnlocked}
        isSubscribed={isSubscribed}
        collections={collections}
        completedCollectionsCount={completedCollectionsCount}
        hasNewCollectionItem={hasNewCollectionItem}
        allCollectionsRewarded={allCollectionsRewarded}
        rewardedCollections={rewardedCollections}
        collectionButtonPulse={collectionButtonPulse}
        leaderboardNewPosition={leaderboardNewPosition}
        showOvertakenNotification={showOvertakenNotification}
        collectionsButtonRef={collectionsButtonRef}
        onNewGame={() => {
          clearNoMoves();
          setShowNewGameButton(false);
          setNoMovesShownOnce(false);
          newGame('solvable');
        }}
        onUndo={() => { if (canUndo) undo(); }}
        onHint={() => {
          getHint();
          setTimeout(() => clearHint(), 350);
        }}
        onShowDailyQuests={() => {
          const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
          setDisplayedStars(actualTotal);
          openDailyQuests();
        }}
        onShowShop={() => {
          const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
          setDisplayedStars(actualTotal);
          openShop();
        }}
        onShowCollections={() => {
          const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
          setDisplayedStars(actualTotal);
          const unrewardedCollections = collections
            .filter(c => c.items.every(i => i.collected) && !rewardedCollections.has(c.id))
            .map(c => c.id);
          if (unrewardedCollections.length > 0) {
            setPendingCollectionRewards(unrewardedCollections);
          }
          setCollectionsAfterWin(false);
          openCollections();
        }}
        onShowLeaderboard={() => {
          // Leaderboard data is already managed by useLeaderboard hook
          openLeaderboard();
          setShowOvertakenNotification(false);
        }}
        onShowLockedCollections={() => popupQueue.showOnDemand({ type: 'lockedCollections' })}
        onShowLockedLeaderboard={() => popupQueue.showOnDemand({ type: 'lockedLeaderboard' })}
      />
      
      {/* Flying Collection Icons */}
      {flyingIcons.map(icon => {
        const rect = collectionsButtonRef.current?.getBoundingClientRect();
        return (
          <FlyingCollectionIcon
            key={icon.id}
            icon={icon.icon}
            startX={icon.startX}
            startY={icon.startY}
            endX={rect ? rect.left + rect.width / 2 : window.innerWidth / 2 + 100}
            endY={rect ? rect.top : window.innerHeight - 50}
            onComplete={() => handleFlyingIconComplete(icon.id, icon.collectionId, icon.itemId, icon.isDuplicate)}
            isUnique={!icon.isDuplicate}
            rarity={icon.rarity}
          />
        );
      })}
      
      {/* Collision Particles */}
      <CollisionParticles particles={collisionParticles} />
      
      {/* Flying Cards for parallel auto-collect animation */}
      <FlyingCardsContainer />
    </div>
  );
}

// Flying star component for treasure hunt rewards (two-phase: scatter then fly)
interface TreasureFlyingStarProps {
  star: TreasureFlyingStar;
  onArrived: () => void;
}

function TreasureFlyingStarComponent({ star, onArrived }: TreasureFlyingStarProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const phaseRef = useRef<'scatter' | 'fly' | 'done'>('scatter');
  const scatterStartTimeRef = useRef<number | null>(null);
  const flyStartTimeRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const hasArrivedRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    const animate = (timestamp: number) => {
      if (!isMountedRef.current || hasArrivedRef.current) return;
      
      const currentPhase = phaseRef.current;
      
      if (currentPhase === 'scatter') {
        if (scatterStartTimeRef.current === null) {
          scatterStartTimeRef.current = timestamp;
        }
        
        const elapsed = timestamp - scatterStartTimeRef.current;
        const progress = Math.min(elapsed / star.scatterDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const x = star.startX + (star.scatterX - star.startX) * eased;
        const y = star.startY + (star.scatterY - star.startY) * eased;
        
        if (elementRef.current) {
          elementRef.current.style.left = `${x}px`;
          elementRef.current.style.top = `${y}px`;
          elementRef.current.style.transform = `translate(-50%, -50%) scale(${0.5 + eased * 0.5})`;
        }
        
        if (progress >= 1) {
          // Scatter complete - wait for flyDelay then start flying
          // Use timestamp-based delay instead of setTimeout
          phaseRef.current = 'fly';
          flyStartTimeRef.current = timestamp + star.flyDelay;
        }
      } else if (currentPhase === 'fly') {
        // Wait for flyDelay
        if (flyStartTimeRef.current === null) {
          flyStartTimeRef.current = timestamp + star.flyDelay;
        }
        
        if (timestamp < flyStartTimeRef.current) {
          // Still waiting for delay
          rafIdRef.current = requestAnimationFrame(animate);
          return;
        }
        
        const elapsed = timestamp - flyStartTimeRef.current;
        const progress = Math.min(elapsed / star.flyDuration, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const t = eased;
        const x = (1 - t) * (1 - t) * star.scatterX + 2 * (1 - t) * t * star.controlX + t * t * star.targetX;
        const y = (1 - t) * (1 - t) * star.scatterY + 2 * (1 - t) * t * star.controlY + t * t * star.targetY;
        
        if (elementRef.current) {
          elementRef.current.style.left = `${x}px`;
          elementRef.current.style.top = `${y}px`;
          elementRef.current.style.transform = `translate(-50%, -50%) scale(${1 - progress * 0.3})`;
          elementRef.current.style.opacity = String(1 - progress * 0.3);
        }
        
        if (progress >= 1) {
          if (!hasArrivedRef.current) {
            hasArrivedRef.current = true;
            phaseRef.current = 'done';
            setIsVisible(false);
            onArrived();
          }
          return;
        }
      }
      
      if (phaseRef.current !== 'done' && !hasArrivedRef.current) {
        rafIdRef.current = requestAnimationFrame(animate);
      }
    };
    
    rafIdRef.current = requestAnimationFrame(animate);
    
    return () => {
      isMountedRef.current = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [star, onArrived]); // Removed 'phase' from dependencies - use refs only
  
  if (!isVisible) return null;
  
  // Determine star color based on value
  const getStarStyle = (value: number) => {
    if (value >= 100) {
      // Purple star for x100
      return 'hue-rotate(260deg) brightness(1.2) saturate(1.5) drop-shadow(0 0 8px rgba(147, 51, 234, 0.9))';
    } else if (value >= 10) {
      // Blue star for x10
      return 'hue-rotate(180deg) brightness(1.2) drop-shadow(0 0 8px rgba(59, 130, 246, 0.9))';
    } else {
      // Gold star (default)
      return 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
    }
  };
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: star.startX,
        top: star.startY,
        transform: 'translate(-50%, -50%)',
        fontSize: '24px',
        filter: getStarStyle(star.value)
      }}
    >
      ⭐
    </div>,
    document.body
  );
}
