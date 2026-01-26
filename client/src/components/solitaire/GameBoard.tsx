import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
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
  initializeLeaderboard, 
  updateCurrentUserStars, 
  simulateOtherPlayers,
  saveCurrentPosition,
  getPreviousPosition,
  getSeasonInfo,
  getSeasonStars,
  addSeasonStars,
  checkSeasonEnd,
  getLeaderboardTrophies,
  LeaderboardTrophy,
  resetLeaderboard,
  resetSeasonStars
} from '../../lib/leaderboard';
import {
  TreasureHuntEvent,
  ChestReward,
  getTreasureHuntEvent,
  saveTreasureHuntEvent,
  activateTreasureHunt,
  isEventAvailable,
  getRequiredLevel,
  addKeys,
  resetTreasureHuntEvent
} from '../../lib/liveops/treasureHunt';
import { 
  distributeKeys, 
  cardHasKey, 
  collectKeyFromCard, 
  setOnKeyCollectedCallback,
  setOnKeysChangedCallback,
  clearAllKeys 
} from '../../lib/liveops/keyManager';
import { TreasureHuntIcon, FlyingKeysContainer, launchFlyingKey, setOnFlyingKeyCompleteCallback } from './TreasureHuntIcon';
import { TreasureHuntPromo } from './TreasureHuntPromo';
import { TreasureHuntPopup } from './TreasureHuntPopup';
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

// Stars reward for level up (same as most expensive collection)
const STARS_PER_LEVELUP = 50;

// Level required to unlock collections and points event
const COLLECTIONS_REQUIRED_LEVEL = 2;

// Level required to unlock leaderboard
const LEADERBOARD_REQUIRED_LEVEL = 4;

// Daily quest interface
interface Quest {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: number;
  completed: boolean;
  rewardClaimed?: boolean; // True if reward animation has already played
}

// Stars earned per win
const STARS_PER_WIN = 3;

// Mini single card SVG for flying and miniatures
function MiniCardPack({ color, stars, size = 48 }: { color: string; stars: number; size?: number }) {
  const topRow = stars > 3 ? Math.ceil(stars / 2) : stars;
  const bottomRow = stars > 3 ? stars - topRow : 0;
  const scale = size / 48;
  const cardHeight = size * 1.33; // Card aspect ratio ~3:4
  
  return (
    <div 
      className="relative flex items-center justify-center" 
      style={{ width: size, height: cardHeight }}
    >
      <svg 
        width={size} 
        height={cardHeight} 
        viewBox="0 0 36 48" 
        fill="none"
        style={{
          filter: `drop-shadow(0 2px 4px ${color}60)`,
        }}
      >
        {/* Single card */}
        <rect x="0" y="0" width="36" height="48" rx="4" fill={color} />
        {/* Shine effect */}
        <rect x="0" y="0" width="36" height="48" rx="4" fill="url(#packShineMini)" />
        <defs>
          <linearGradient id="packShineMini" x1="0" y1="0" x2="36" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
          </linearGradient>
        </defs>
      </svg>
      {/* Rarity stars centered on the card */}
      {stars > 0 && (
        <div 
          className="absolute flex flex-col items-center justify-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex justify-center gap-0">
            {Array.from({ length: topRow }).map((_, i) => (
              <span 
                key={i} 
                style={{ 
                  fontSize: `${10 * scale}px`,
                  color: '#fbbf24',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                  textShadow: '0 0 4px rgba(251, 191, 36, 0.8)',
                }}
              >
                ★
              </span>
            ))}
          </div>
          {bottomRow > 0 && (
            <div className="flex justify-center gap-0" style={{ marginTop: -2 * scale }}>
              {Array.from({ length: bottomRow }).map((_, i) => (
                <span 
                  key={i} 
                  style={{ 
                    fontSize: `${10 * scale}px`,
                    color: '#fbbf24',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                    textShadow: '0 0 4px rgba(251, 191, 36, 0.8)',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Flying reward animation component (from button to miniature row)
function FlyingRewardToMiniature({ 
  reward, 
  targetRef,
  pendingIndex,
  onComplete 
}: { 
  reward: { id: number; type: 'stars' | 'pack'; stars?: number; packRarity?: PackRarity; startX: number; startY: number };
  targetRef: React.RefObject<HTMLDivElement>;
  pendingIndex: number; // Index where this miniature will appear
  onComplete: () => void;
}) {
  const [position, setPosition] = useState({ x: reward.startX, y: reward.startY });
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const animationRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  
  useEffect(() => {
    // Only run animation once per component mount
    if (hasCompletedRef.current) return;
    
    const targetRect = targetRef.current?.getBoundingClientRect();
    // Calculate target position based on container and miniature index
    // Each miniature is 36x48 + 4px gap (same size as on event button)
    const miniatureWidth = 36;
    const miniatureHeight = 48;
    const gap = 4;
    
    // Miniatures are displayed in a single row (max 4 visible)
    const col = Math.min(pendingIndex, 3); // Max index 3 (4 items)
    
    let targetX: number;
    let targetY: number;
    
    if (targetRect) {
      // Calculate position within the container for this miniature
      targetX = targetRect.left + (col * (miniatureWidth + gap)) + miniatureWidth / 2;
      targetY = targetRect.top + miniatureHeight / 2;
    } else {
      // Fallback - below the start position
      targetX = reward.startX;
      targetY = reward.startY + 80;
    }
    
    const startX = reward.startX;
    const startY = reward.startY;
    
    // Animate over 400ms
    const duration = 400;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (hasCompletedRef.current) return;
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate position
      const x = startX + (targetX - startX) * eased;
      const y = startY + (targetY - startY) * eased;
      
      // Scale down to miniature size (0.4 = 40% of original)
      const newScale = 1 - eased * 0.6;
      
      setPosition({ x, y });
      setScale(newScale);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Fade out quickly
        hasCompletedRef.current = true;
        setOpacity(0);
        setTimeout(() => onCompleteRef.current(), 100);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [reward.id]); // Only depend on reward.id - run once per unique reward
  
  const packColor = reward.type === 'pack' && reward.packRarity 
    ? COLLECTION_PACKS[reward.packRarity].color 
    : '#fbbf24';
  
  return (
    <div
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        transition: 'opacity 0.1s',
      }}
    >
      {reward.type === 'pack' && reward.packRarity ? (
        <MiniCardPack color={packColor} stars={reward.packRarity} size={48} />
      ) : (
        <span 
          className="text-3xl"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(251, 191, 36, 0.8))' }}
        >
          ⭐
        </span>
      )}
    </div>
  );
}

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
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  
  // Real stars count - saved to localStorage immediately when earned
  const [totalStars, setTotalStars] = useState(() => {
    // Load from localStorage on init
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
  const [winHandled, setWinHandled] = useState(false);
  const [starPulseKey, setStarPulseKey] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Save totalStars to localStorage when it changes
  useEffect(() => {
    // Guard against saving NaN
    if (typeof totalStars === 'number' && !isNaN(totalStars)) {
    localStorage.setItem('solitaire_total_stars', totalStars.toString());
    }
  }, [totalStars]);
  
  // Default daily quests - designed for 1, 3, 5 games completion
  const defaultDailyQuests: Quest[] = [
    {
      id: 'daily-games',
      title: 'Первая победа',
      description: 'Успешно разложи 1 пасьянс',
      current: 0,
      target: 1,
      reward: 15,
      completed: false
    },
    {
      id: 'daily-aces',
      title: 'Собери тузы',
      description: 'Собери 12 тузов в основание',
      current: 0,
      target: 12,
      reward: 30,
      completed: false
    },
    {
      id: 'daily-wins',
      title: 'Мастер пасьянса',
      description: 'Успешно разложи 5 пасьянсов',
      current: 0,
      target: 5,
      reward: 45,
      completed: false
    }
  ];
  
  // Daily quests state - load from localStorage
  const [showDailyQuests, setShowDailyQuests] = useState(false);
  // Track if daily quests were opened automatically after winning (vs manually via button)
  const [dailyQuestsAfterWin, setDailyQuestsAfterWin] = useState(false);
  // Track if collections were opened automatically after winning (vs manually via button)
  const [collectionsAfterWin, setCollectionsAfterWin] = useState(false);
  
  // Shop state
  const [showShop, setShowShop] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(() => {
    return localStorage.getItem('solitaire_premium_subscription') === 'true';
  });
  
  // No moves state - show popup first, then button if closed
  const [showNewGameButton, setShowNewGameButton] = useState(false);
  const [noMovesShownOnce, setNoMovesShownOnce] = useState(false);
  
  const [dailyQuests, setDailyQuests] = useState<Quest[]>(() => {
    const saved = localStorage.getItem('solitaire_daily_quests');
    const savedDate = localStorage.getItem('solitaire_daily_quests_date');
    const today = new Date().toDateString();
    
    // Check if it's a new day - reset quests
    if (savedDate !== today) {
      localStorage.setItem('solitaire_daily_quests_date', today);
      localStorage.removeItem('solitaire_aces_collected'); // Reset aces too
      return defaultDailyQuests;
    }
    
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultDailyQuests;
      }
    }
    return defaultDailyQuests;
  });
  
  // Track aces collected (reset on new day) - load from localStorage
  const [acesCollected, setAcesCollected] = useState(() => {
    const saved = localStorage.getItem('solitaire_aces_collected');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // Save daily quests to localStorage when they change
  useEffect(() => {
    localStorage.setItem('solitaire_daily_quests', JSON.stringify(dailyQuests));
    localStorage.setItem('solitaire_daily_quests_date', new Date().toDateString());
  }, [dailyQuests]);
  
  // Save aces collected to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('solitaire_aces_collected', acesCollected.toString());
  }, [acesCollected]);
  
  // Monthly progress state - track completed daily quests across the month
  const [monthlyProgress, setMonthlyProgress] = useState(() => {
    const saved = localStorage.getItem('solitaire_monthly_progress');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [monthlyRewardClaimed, setMonthlyRewardClaimed] = useState(() => {
    return localStorage.getItem('solitaire_monthly_reward_claimed') === 'true';
  });
  const MONTHLY_TARGET = 50;
  const MONTHLY_REWARD = 500;
  
  // Save monthly progress to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_monthly_progress', monthlyProgress.toString());
  }, [monthlyProgress]);
  
  useEffect(() => {
    localStorage.setItem('solitaire_monthly_reward_claimed', monthlyRewardClaimed.toString());
  }, [monthlyRewardClaimed]);
  
  // Daily login streak state
  const [dailyStreak, setDailyStreak] = useState(() => {
    const saved = localStorage.getItem('solitaire_daily_streak');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lastLoginDate, setLastLoginDate] = useState(() => {
    return localStorage.getItem('solitaire_last_login_date') || '';
  });
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [pendingDailyReward, setPendingDailyReward] = useState(0); // Stars to award (max 10)
  const [pendingStreak, setPendingStreak] = useState(0); // Actual streak day (no limit)
  
  // Save daily streak to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_daily_streak', dailyStreak.toString());
  }, [dailyStreak]);
  
  useEffect(() => {
    localStorage.setItem('solitaire_last_login_date', lastLoginDate);
  }, [lastLoginDate]);
  
  // Leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayer[]>([]);
  const [leaderboardOldPosition, setLeaderboardOldPosition] = useState(20);
  const [leaderboardNewPosition, setLeaderboardNewPosition] = useState(20);
  const [pendingLeaderboardShow, setPendingLeaderboardShow] = useState(false);
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo>(() => getSeasonInfo());
  const [seasonStars, setSeasonStars] = useState(() => getSeasonStars());
  const [leaderboardTrophies, setLeaderboardTrophies] = useState<LeaderboardTrophy[]>(() => getLeaderboardTrophies());
  const lastCheckedSeasonStarsRef = useRef(seasonStars);
  const showLeaderboardRef = useRef(showLeaderboard);
  const leaderboardPositionRef = useRef(leaderboardNewPosition);
  const pendingDowngradeRef = useRef<{ players: LeaderboardPlayer[]; position: number; overtaken: boolean; } | null>(null);
  
  // Check for season end on mount and periodically
  useEffect(() => {
    const checkSeason = () => {
      const result = checkSeasonEnd();
      if (result.seasonEnded) {
        // Season ended - refresh state
        setSeasonInfo(getSeasonInfo());
        setSeasonStars(getSeasonStars());
        setLeaderboardTrophies(getLeaderboardTrophies());
        const players = initializeLeaderboard(0);
        setLeaderboardPlayers(players);
        
        // If trophy was awarded, show it
        if (result.trophy) {
          // Trophy will be shown in Collections trophies tab
          console.log('🏆 Trophy awarded:', result.trophy);
        }
      }
    };
    
    checkSeason();
    const interval = setInterval(checkSeason, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);
  
  // Initialize leaderboard on mount
  useEffect(() => {
    const players = initializeLeaderboard(seasonStars);
    setLeaderboardPlayers(players);
    const position = players.findIndex(p => p.isCurrentUser) + 1;
    setLeaderboardOldPosition(position);
    setLeaderboardNewPosition(position);
    saveCurrentPosition(position);
    lastCheckedSeasonStarsRef.current = seasonStars;
  }, []);
  
  // Keep refs in sync for interval logic
  useEffect(() => {
    showLeaderboardRef.current = showLeaderboard;
    // If leaderboard закрыт и есть отложенное ухудшение — применяем
    if (!showLeaderboard && pendingDowngradeRef.current) {
      const pending = pendingDowngradeRef.current;
      setLeaderboardPlayers(pending.players);
      setLeaderboardNewPosition(pending.position);
      if (pending.overtaken) {
        setShowOvertakenNotification(true);
        setTimeout(() => setShowOvertakenNotification(false), 3000);
      }
      pendingDowngradeRef.current = null;
    }
  }, [showLeaderboard]);
  
  useEffect(() => {
    leaderboardPositionRef.current = leaderboardNewPosition;
  }, [leaderboardNewPosition]);
  
  // State for "overtaken" notification
  const [showOvertakenNotification, setShowOvertakenNotification] = useState(false);
  
  // Treasure Hunt LiveOps event state
  const [treasureHuntEvent, setTreasureHuntEvent] = useState<TreasureHuntEvent>(() => getTreasureHuntEvent());
  const [showTreasureHunt, setShowTreasureHunt] = useState(false);
  const [playerLevel, setPlayerLevel] = useState(() => {
    const saved = localStorage.getItem('solitaire_player_level');
    return saved ? parseInt(saved, 10) : 1;
  });
  const treasureHuntIconRef = useRef<HTMLDivElement>(null);
  const pointsEventIconRef = useRef<HTMLDivElement>(null);
  const lastTapTimeRef = useRef<number>(0);
  const [treasureHuntPulse, setTreasureHuntPulse] = useState(false);
  const [showTreasureHuntPromo, setShowTreasureHuntPromo] = useState(false);
  const [treasureHuntPromoShown, setTreasureHuntPromoShown] = useState(() => {
    return localStorage.getItem('solitaire_treasure_hunt_promo_shown') === 'true';
  });
  const [pendingTreasureHuntPromo, setPendingTreasureHuntPromo] = useState(false);
  
  // Collections unlock state
  const [showCollectionsUnlock, setShowCollectionsUnlock] = useState(false);
  const [collectionsUnlockShown, setCollectionsUnlockShown] = useState(() => {
    return localStorage.getItem('solitaire_collections_unlock_shown') === 'true';
  });
  const [pendingCollectionsUnlock, setPendingCollectionsUnlock] = useState(false);
  const [showLockedCollectionsPopup, setShowLockedCollectionsPopup] = useState(false);
  const [showLockedPointsEventPopup, setShowLockedPointsEventPopup] = useState(false);
  const [showLockedLeaderboardPopup, setShowLockedLeaderboardPopup] = useState(false);
  
  // Leaderboard unlock state
  const [showLeaderboardUnlock, setShowLeaderboardUnlock] = useState(false);
  const [leaderboardUnlockShown, setLeaderboardUnlockShown] = useState(() => {
    return localStorage.getItem('solitaire_leaderboard_unlock_shown') === 'true';
  });
  const [pendingLeaderboardUnlock, setPendingLeaderboardUnlock] = useState(false);
  
  // Promo/Shop offers unlock state (unlocks on first win after collections are unlocked)
  const [showPromoUnlock, setShowPromoUnlock] = useState(false);
  const [promoUnlocked, setPromoUnlocked] = useState(() => {
    return localStorage.getItem('solitaire_promo_unlocked') === 'true';
  });
  const [pendingPromoUnlock, setPendingPromoUnlock] = useState(false);
  
  // Check if collections are unlocked
  const collectionsUnlocked = playerLevel >= COLLECTIONS_REQUIRED_LEVEL;
  const leaderboardUnlocked = playerLevel >= LEADERBOARD_REQUIRED_LEVEL;
  
  // Points Event LiveOps state
  const [pointsEventState, setPointsEventState] = useState<PointsEventState>(() => getPointsEventState());
  const [pointsEventPulse, setPointsEventPulse] = useState(false);
  const [rewardIconAnimating, setRewardIconAnimating] = useState(false); // Track when reward icon is flying away
  const [nextRewardDropping, setNextRewardDropping] = useState(false); // Track when next reward is dropping in
  const [animatingRewardIndex, setAnimatingRewardIndex] = useState<number | null>(null); // Index of reward being animated away
  // Queue for pack rewards - allows multiple packs to be queued from rapid chest clicks
  const [packRewardsQueue, setPackRewardsQueue] = useState<Array<{ rarity: PackRarity; items: PackItem[]; sourcePosition?: { x: number; y: number } }>>([]);
  const [showPackPopup, setShowPackPopup] = useState(false);
  // Current pack being shown (first item from queue)
  const currentPackReward = packRewardsQueue[0] || null;
  const [autoClaimingRewards, setAutoClaimingRewards] = useState(false); // Track if we're auto-claiming after win
  const autoClaimingRewardsRef = useRef(false); // Ref to avoid stale closure
  const isClaimingRewardRef = useRef(false); // Prevent double claiming
  const [showPointsEventPopup, setShowPointsEventPopup] = useState(false);
  
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
  
  // Simulate other players gaining stars periodically (only when leaderboard is unlocked)
  useEffect(() => {
    // Don't simulate if leaderboard is not unlocked yet
    if (!leaderboardUnlocked) return;
    
    const interval = setInterval(() => {
      const result = simulateOtherPlayers();
      if (result.players.length > 0) {
        const currentUserIndex = result.players.findIndex(p => p.isCurrentUser);
        if (currentUserIndex !== -1) {
          const newPos = currentUserIndex + 1;
          const currentPos = leaderboardPositionRef.current;
          const isDowngrade = newPos > currentPos;
          
          // Если окно рейтинга открыто и позиция ухудшается — откладываем обновление
          if (showLeaderboardRef.current && isDowngrade) {
            pendingDowngradeRef.current = { players: result.players, position: newPos, overtaken: result.overtaken };
            return;
          }
          
          // Применяем сразу, если окно закрыто или позиция не ухудшилась
          setLeaderboardPlayers(result.players);
          setLeaderboardNewPosition(newPos);
        }
        
        // Show notification if someone overtook us (только если не скрыли из‑за открытого окна)
        if (result.overtaken && !(showLeaderboardRef.current && pendingDowngradeRef.current)) {
          setShowOvertakenNotification(true);
          setTimeout(() => setShowOvertakenNotification(false), 3000);
        }
      }
    }, 20000); // Every 20 seconds (more frequent for more action)
    
    return () => clearInterval(interval);
  }, [leaderboardUnlocked]);
  
  // Check for position improvement when season stars change (only when leaderboard is unlocked)
  useEffect(() => {
    // Don't update leaderboard if it's not unlocked yet
    if (!leaderboardUnlocked) return;
    
    if (seasonStars === lastCheckedSeasonStarsRef.current) return;
    if (seasonStars <= lastCheckedSeasonStarsRef.current) {
      lastCheckedSeasonStarsRef.current = seasonStars;
      return;
    }
    
    lastCheckedSeasonStarsRef.current = seasonStars;
    
    const result = updateCurrentUserStars(seasonStars);
    setLeaderboardPlayers(result.players);
    
    if (result.positionImproved) {
      setLeaderboardOldPosition(result.oldPosition);
      setLeaderboardNewPosition(result.newPosition);
      setPendingLeaderboardShow(true);
    }
  }, [seasonStars, leaderboardUnlocked]);
  
  // Helper to add stars (updates both total and season)
  const addStars = (amount: number) => {
    setTotalStars(prev => prev + amount);
    // Only add to season stars if leaderboard is unlocked
    if (leaderboardUnlocked) {
      const newSeasonStars = addSeasonStars(amount);
      setSeasonStars(newSeasonStars);
    }
  };
  
  // Force re-render counter for key distribution updates
  const [, forceKeyUpdate] = useState(0);
  
  // Register callback for key distribution updates
  useEffect(() => {
    setOnKeysChangedCallback(() => {
      forceKeyUpdate(n => n + 1);
    });
    return () => setOnKeysChangedCallback(() => {});
  }, []);
  
  // Distribute keys when game starts (after dealing animation completes)
  // Keys are only placed on tableau cards, not on stock/waste pile
  useEffect(() => {
    if (!treasureHuntEvent.active) return;
    if (isDealing) return; // Wait for dealing to complete
    
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
    
    distributeKeys(faceDownCards, faceUpCards, treasureHuntEvent.active);
  }, [treasureHuntEvent.active, isDealing]);
  
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
  
  // Track if daily reward needs to be shown (checked on mount, shown before new game)
  const [pendingDailyRewardCheck, setPendingDailyRewardCheck] = useState(false);
  
  // Check for daily reward on mount - but don't show yet, just mark as pending
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastLoginDate === today) {
      // Already claimed today
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    let newStreak: number;
    if (lastLoginDate === yesterdayStr) {
      // Consecutive day - increase streak (no limit)
      newStreak = dailyStreak + 1;
    } else {
      // Missed a day or first login - reset to 1
      newStreak = 1;
    }
    
    // Set pending streak (actual day number) and reward based on day
    setPendingStreak(newStreak);
    setPendingDailyReward(getRewardStars(newStreak));
    // Mark that we need to show daily reward before next new game
    setPendingDailyRewardCheck(true);
  }, []); // Only on mount
  
  // Handle tab visibility change - check for new day when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem('solitaire_daily_quests_date');
      const currentLastLogin = localStorage.getItem('solitaire_last_login_date') || '';
      
      // Check if it's a new day since quests were last saved
      if (savedDate !== today) {
        // Reset daily quests
        setDailyQuests(defaultDailyQuests);
        setAcesCollected(0);
        localStorage.setItem('solitaire_daily_quests_date', today);
        localStorage.removeItem('solitaire_aces_collected');
      }
      
      // Check if daily reward should be given (new day since last login)
      if (currentLastLogin !== today && pendingDailyReward <= 0) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        const currentStreak = parseInt(localStorage.getItem('solitaire_daily_streak') || '0', 10);
        
        let newStreak: number;
        if (currentLastLogin === yesterdayStr) {
          // Consecutive day - increase streak
          newStreak = currentStreak + 1;
        } else {
          // Missed a day or first login - reset to 1
          newStreak = 1;
        }
        
        // Set pending daily reward
        setPendingStreak(newStreak);
        setPendingDailyReward(getRewardStars(newStreak));
        setPendingDailyRewardCheck(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pendingDailyReward]);
  
  // Function to show daily reward if pending
  const tryShowDailyReward = (): boolean => {
    if (!pendingDailyRewardCheck || pendingDailyReward <= 0) {
      return false;
    }
    
    // Show streak popup first if streak >= 2, otherwise show reward directly
    if (pendingStreak >= 2) {
      setShowStreakPopup(true);
    } else {
      setShowDailyReward(true);
    }
    setPendingDailyRewardCheck(false);
    return true;
  };
  
  // Claim daily reward and continue to next step in chain
  const claimDailyReward = () => {
    if (pendingDailyReward > 0) {
      addStars(pendingDailyReward);
      setDailyStreak(pendingStreak); // Save actual streak (not limited to 10)
      setLastLoginDate(new Date().toDateString());
      setShowDailyReward(false);
      setPendingDailyReward(0);
      setPendingStreak(0);
      
      // Continue chain - check for treasure hunt promo, then start new game
      if (pendingTreasureHuntPromo) {
        setShowTreasureHuntPromo(true);
      } else {
        clearNoMoves();
        setShowNewGameButton(false);
        setNoMovesShownOnce(false);
        newGame('solvable');
      }
    }
  };
  
  // Collections state - load progress from localStorage, but use default structure/rewards
  const [showCollections, setShowCollections] = useState(false);
  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('solitaire_collections');
    if (saved) {
      try {
        const savedCollections = JSON.parse(saved) as Collection[];
        // Merge saved progress with default structure (to get updated rewards/names)
        return defaultCollections.map(defaultColl => {
          const savedColl = savedCollections.find(sc => sc.id === defaultColl.id);
          if (savedColl) {
            // Keep the default structure but restore collected status from saved data
            return {
              ...defaultColl,
              items: defaultColl.items.map(defaultItem => {
                const savedItem = savedColl.items.find(si => si.id === defaultItem.id);
                return {
                  ...defaultItem,
                  collected: savedItem?.collected || false
                };
              })
            };
          }
          return defaultColl;
        });
      } catch {
        return defaultCollections;
      }
    }
    return defaultCollections;
  });
  
  // Save collections to localStorage when they change
  useEffect(() => {
    localStorage.setItem('solitaire_collections', JSON.stringify(collections));
  }, [collections]);
  
  // Calculate collections progress for button display
  const completedCollectionsCount = collections.filter(c => c.items.every(i => i.collected)).length;
  
  // Track which collections have been rewarded (to avoid double rewards)
  const [rewardedCollections, setRewardedCollections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('solitaire_rewarded_collections');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  
  // Save rewarded collections to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_rewarded_collections', JSON.stringify(Array.from(rewardedCollections)));
  }, [rewardedCollections]);
  
  // Track if grand prize (all collections) has been rewarded
  const [allCollectionsRewarded, setAllCollectionsRewarded] = useState(() => {
    const saved = localStorage.getItem('solitaire_all_collections_rewarded');
    return saved === 'true';
  });
  
  // Save all collections rewarded status to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_all_collections_rewarded', allCollectionsRewarded.toString());
  }, [allCollectionsRewarded]);
  
  
  // Queue of pending collection rewards (for when player completes multiple collections in one game)
  const [pendingCollectionRewards, setPendingCollectionRewards] = useState<string[]>([]);
  
  // Flying collection icons state
  interface FlyingIcon {
    id: string;
    icon: string;
    itemId: string;
    collectionId: string;
    startX: number;
    startY: number;
    isDuplicate?: boolean; // True if item was already collected
    rarity?: number; // 1-5 for glow color
  }
  const [flyingIcons, setFlyingIcons] = useState<FlyingIcon[]>([]);
  const [hasNewCollectionItem, setHasNewCollectionItem] = useState(false);
  const [newItemsInCollections, setNewItemsInCollections] = useState<Set<string>>(new Set());
  const [collectionsResetKey, setCollectionsResetKey] = useState(0);
  const [collectionButtonPulse, setCollectionButtonPulse] = useState(false);
  const collectionsButtonRef = useRef<HTMLButtonElement>(null);
  
  // Flying stars from treasure hunt chests
  interface TreasureFlyingStar {
    id: number;
    value: number;
    startX: number;
    startY: number;
    scatterX: number;
    scatterY: number;
    targetX: number;
    targetY: number;
    controlX: number;
    controlY: number;
    scatterDuration: number;
    flyDelay: number;
    flyDuration: number;
  }
  const [treasureFlyingStars, setTreasureFlyingStars] = useState<TreasureFlyingStar[]>([]);
  
  // Launch flying stars from chest position to progress bar
  const launchTreasureStars = (totalStars: number, startPos: { x: number; y: number }) => {
    // Clear any existing flying stars first to prevent duplicates
    setTreasureFlyingStars([]);
    
    // Get target position - find the star icon in progress bar
    let targetX = window.innerWidth / 2;
    let targetY = 50;
    
    if (progressBarRef?.current) {
      const starIcon = progressBarRef.current.querySelector('[data-star-icon]');
      if (starIcon) {
        const rect = starIcon.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      } else {
        const rect = progressBarRef.current.getBoundingClientRect();
        targetX = rect.left + 20;
        targetY = rect.top + 16;
      }
    }
    
    const centerX = startPos.x;
    const centerY = startPos.y;
    
    const stars: TreasureFlyingStar[] = [];
    const MAX_FLYING_ICONS = 8;
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    const minRadius = 15;
    const maxRadius = 40;
    const scatterDuration = 400;
    
    for (let i = 0; i < iconCount; i++) {
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = centerX + Math.cos(angle) * radius;
      const scatterY = centerY + Math.sin(angle) * radius;
      
      const midX = (scatterX + targetX) / 2;
      const midY = (scatterY + targetY) / 2;
      
      const dx = targetX - scatterX;
      const dy = targetY - scatterY;
      const perpX = -dy;
      const perpY = dx;
      const len = Math.sqrt(perpX * perpX + perpY * perpY);
      
      const curvature = (Math.random() - 0.5) * 150;
      const controlX = midX + (perpX / len) * curvature;
      const controlY = midY + (perpY / len) * curvature;
      
      const flyDuration = 350 + Math.random() * 150;
      const flyDelay = i * 60;
      
      stars.push({
        id: Date.now() * 1000 + Math.random() * 1000 + i, // Ensure unique IDs
        value,
        startX: centerX,
        startY: centerY,
        scatterX,
        scatterY,
        targetX,
        targetY,
        controlX,
        controlY,
        scatterDuration,
        flyDelay,
        flyDuration
      });
    }
    
    setTreasureFlyingStars(stars);
  };
  
  const handleTreasureStarArrived = (star: TreasureFlyingStar) => {
    setTreasureFlyingStars(prev => prev.filter(s => s.id !== star.id));
    // Update displayed stars by the value of this flying star
    setDisplayedStars(prev => prev + star.value);
    // Pulse the progress bar
    setStarPulseKey(k => k + 1);
  };
  
  // Collision particles state
  interface CollisionParticle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
  }
  const [collisionParticles, setCollisionParticles] = useState<CollisionParticle[]>([]);
  const PARTICLE_COLORS = ['#f59e0b', '#fb923c', '#fbbf24', '#fcd34d', '#ffffff'];
  
  // Create burst particles at collision point
  const createCollisionParticles = (x: number, y: number) => {
    const newParticles: CollisionParticle[] = [];
    const particleCount = 5 + Math.floor(Math.random() * 3); // 5-7 particles
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // slight upward bias
        size: 3 + Math.random() * 4,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      });
    }
    
    setCollisionParticles(prev => [...prev, ...newParticles]);
    
    // Clean up particles after animation
    setTimeout(() => {
      setCollisionParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 600);
  };
  
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
        setPointsEventPulse(true);
        setTimeout(() => setPointsEventPulse(false), 150);
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
    if (showLevelUp && pendingLevelUp !== null && levelUpStarsAwardedRef.current !== pendingLevelUp) {
      // Add stars for level up immediately (persisted via localStorage effect)
      levelUpStarsAwardedRef.current = pendingLevelUp;
      addStars(STARS_PER_LEVELUP);
      console.log(`⭐ Awarded ${STARS_PER_LEVELUP} stars for level ${pendingLevelUp}`);
    }
  }, [showLevelUp, pendingLevelUp]);
  
  // Reset level up stars tracker when level up is complete
  useEffect(() => {
    if (!showLevelUp && pendingLevelUp === null) {
      levelUpStarsAwardedRef.current = null;
    }
  }, [showLevelUp, pendingLevelUp]);

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
  
  
  // Try to claim and animate a points event reward from pending rewards
  // Returns true if a reward was claimed and animation started
  const tryClaimPointsEventReward = (): boolean => {
    // Prevent double claiming
    if (isClaimingRewardRef.current) {
      console.log('Already claiming a reward, skipping');
      return false;
    }
    
    // Check for pending rewards
    const currentState = getPointsEventState();
    if (!hasPendingRewards(currentState)) {
      return false;
    }
    
    // Mark as claiming
    isClaimingRewardRef.current = true;
    
    // Get count before claiming to calculate position of last miniature
    const pendingCount = currentState.pendingRewards.length;
    
    // Claim the last pending reward (LIFO order)
    const claimResult = claimPendingReward();
    if (!claimResult) {
      isClaimingRewardRef.current = false;
      return false;
    }
    
    // Update state immediately to refresh the miniatures
    setPointsEventState({ ...claimResult.state });
    const reward = claimResult.reward;
    
    // Get position from the last miniature (which was just claimed)
    // Each miniature is 36x48 + 4px gap (same size as on event button)
    const containerRect = miniatureContainerRef.current?.getBoundingClientRect();
    const miniatureWidth = 36;
    const miniatureHeight = 48;
    const gap = 4;
    const lastIndex = Math.min(pendingCount - 1, 3); // Max 4 visible
    
    // Miniatures are in a single row
    const col = lastIndex;
    
    const startX = containerRect 
      ? containerRect.left + (col * (miniatureWidth + gap)) + miniatureWidth / 2
      : window.innerWidth - 100;
    const startY = containerRect 
      ? containerRect.top + miniatureHeight / 2 
      : 150;
    
    if (reward.type === 'stars' && reward.stars) {
      // Add stars 
      addStars(reward.stars);
      
      // Launch flying animation from miniature position
      launchTreasureStars(reward.stars, { x: startX, y: startY });
      
      // For stars, continue checking for more rewards after a delay
      setTimeout(() => {
        // Reset claiming flag
        isClaimingRewardRef.current = false;
        // Use ref to avoid stale closure
        if (autoClaimingRewardsRef.current) {
          const hasMore = tryClaimPointsEventReward();
          if (!hasMore) {
            autoClaimingRewardsRef.current = false;
            setAutoClaimingRewards(false);
            proceedAfterPointsEventRewards();
          }
        }
      }, 1650); // Wait for star animation to fully complete
    } else if (reward.type === 'pack' && reward.packRarity) {
      // Generate pack items and add to queue
      const items = generatePackItems(reward.packRarity, collections);
      // Pass source position so pack icon flies from miniature to center
      setPackRewardsQueue(prev => [...prev, { rarity: reward.packRarity!, items, sourcePosition: { x: startX, y: startY } }]);
      setTimeout(() => {
        isClaimingRewardRef.current = false; // Reset flag before showing popup
        setShowPackPopup(true);
      }, 100);
      // Pack popup will call proceedAfterPointsEventRewards when closed
    }
    
    return true;
  };
  
  // Continue the flow after points event rewards are done
  const proceedAfterPointsEventRewards = () => {
    // Check for pending level up first
    if (pendingLevelUp !== null) {
      setShowLevelUp(true);
      return;
    }
    
    // No level up - proceed to daily quests
    proceedToDailyQuests();
  };
  
  // Handle win screen complete - first try to claim points event rewards
  const handleWinComplete = () => {
    setShowWinScreen(false);
    // Sync displayed stars with actual total from localStorage (to avoid stale closure)
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setDisplayedStars(actualTotal);
    
    // Check if promo should be unlocked (first win after collections are already unlocked)
    if (collectionsUnlocked && !promoUnlocked) {
      setPendingPromoUnlock(true);
    }
    
    // Start auto-claiming points event rewards
    autoClaimingRewardsRef.current = true;
    setAutoClaimingRewards(true);
    const hasReward = tryClaimPointsEventReward();
    
    if (!hasReward) {
      // No rewards to claim, proceed normally
      autoClaimingRewardsRef.current = false;
      setAutoClaimingRewards(false);
      proceedAfterPointsEventRewards();
    }
  };
  
  // Proceed to daily quests after level up (or directly if no level up)
  const proceedToDailyQuests = () => {
    // Check if all quests were already completed BEFORE this win
    const allAlreadyCompleted = dailyQuests.every(quest => quest.completed);
    
    // If all quests were already done, skip the daily quests screen
    if (allAlreadyCompleted) {
      // Check if leaderboard should be shown first, then proceed to collections
      if (tryShowLeaderboard(proceedToCollectionsOrNewGame)) {
        return; // Leaderboard will call proceedToCollectionsOrNewGame when closed
      }
      // Check for unrewarded collections before starting new game
      proceedToCollectionsOrNewGame();
      return;
    }
    
    // Count aces in foundations (4 aces per completed game)
    const acesInGame = 4;
    const newAcesTotal = acesCollected + acesInGame;
    setAcesCollected(newAcesTotal);
    
    // Calculate updated quests and track newly completed quests for immediate reward
    let starsToAdd = 0;
    let questsJustCompleted = 0;
    const updatedQuests = dailyQuests.map(quest => {
      // Both 'daily-games' (1 win) and 'daily-wins' (5 wins) track completed games
      if ((quest.id === 'daily-games' || quest.id === 'daily-wins') && !quest.completed) {
        const newCurrent = quest.current + 1;
        const completed = newCurrent >= quest.target;
        // If quest just completed, add reward immediately
        if (completed) {
          starsToAdd += quest.reward;
          questsJustCompleted++;
        }
        return { ...quest, current: newCurrent, completed };
      }
      if (quest.id === 'daily-aces' && !quest.completed) {
        const newCurrent = Math.min(newAcesTotal, quest.target);
        const completed = newCurrent >= quest.target;
        // If quest just completed, add reward immediately
        if (completed) {
          starsToAdd += quest.reward;
          questsJustCompleted++;
        }
        return { ...quest, current: newCurrent, completed };
      }
      return quest;
    });
    
    // Update daily quest progress
    setDailyQuests(updatedQuests);
    
    // NOTE: Monthly progress is updated via animation callback in DailyQuests component
    // when particles fly to the monthly progress bar
    
    // Add stars immediately for completed quests (persisted via localStorage effect)
    if (starsToAdd > 0) {
      addStars(starsToAdd);
    }
    
    // Sync displayed stars before showing daily quests
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setDisplayedStars(actualTotal);
    
    // Always show daily quests screen if there was any progress to show
    setDailyQuestsAfterWin(true); // Mark that this was opened after winning
    setShowDailyQuests(true);
  };
  
  // Try to show leaderboard if position improved, returns true if shown
  // IMPORTANT: Only show leaderboard if unlock popup was already shown (user knows about the feature)
  const tryShowLeaderboard = (onAfterLeaderboard?: () => void): boolean => {
    if (pendingLeaderboardShow) {
      // Don't show leaderboard popup before the unlock/promo popup was shown
      // User should first learn about the feature, then see tournament results
      if (!leaderboardUnlockShown) {
        console.log('📊 Leaderboard popup pending, but unlock popup not yet shown - waiting');
        // Keep pendingLeaderboardShow true, it will be shown after unlock popup
        return false;
      }
      
      setPendingLeaderboardShow(false);
      setShowLeaderboard(true);
      // Store callback for after leaderboard closes
      pendingAfterLeaderboardRef.current = onAfterLeaderboard || null;
      return true;
    }
    return false;
  };
  
  // Ref to store callback after leaderboard closes
  const pendingAfterLeaderboardRef = useRef<(() => void) | null>(null);
  
  // Handle leaderboard close
  const handleLeaderboardClose = () => {
    // Save current position as "last viewed" for next animation
    saveCurrentPosition(leaderboardNewPosition);
    setShowLeaderboard(false);
    // Execute pending callback if any
    if (pendingAfterLeaderboardRef.current) {
      const callback = pendingAfterLeaderboardRef.current;
      pendingAfterLeaderboardRef.current = null;
      callback();
    }
  };
  
  // Handle daily quests close - check for collections, then start new game
  const handleDailyQuestsClose = () => {
    // Sync displayed stars with actual total from localStorage (to avoid stale closure)
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setDisplayedStars(actualTotal);
    setShowDailyQuests(false);
    
    // Only proceed if daily quests were opened automatically after winning
    if (dailyQuestsAfterWin) {
      setDailyQuestsAfterWin(false);
      
      // Check if leaderboard should be shown first
      if (tryShowLeaderboard(proceedToCollectionsOrNewGame)) {
        return; // Leaderboard will call proceedToCollectionsOrNewGame when closed
      }
      
      // Proceed to check collections
      proceedToCollectionsOrNewGame();
    } else {
      // Manual close - still check for leaderboard
      tryShowLeaderboard();
    }
  };
  
  // Handle level up screen complete - proceed to daily quests
  const handleLevelUpComplete = () => {
    // Stars were already added when level up was detected
    // Just sync displayedStars with actual total from localStorage
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setDisplayedStars(actualTotal);
    
    setShowLevelUp(false);
    
    // Update player level and check for feature unlocks
    if (pendingLevelUp !== null) {
      setPlayerLevel(pendingLevelUp);
      localStorage.setItem('solitaire_player_level', pendingLevelUp.toString());
      
      // Check for collections unlock at level 2
      if (pendingLevelUp >= COLLECTIONS_REQUIRED_LEVEL && !collectionsUnlockShown) {
        setPendingCollectionsUnlock(true);
        // Reset points event to start fresh at 0%
        const freshPointsState = resetPointsEvent();
        setPointsEventState(freshPointsState);
      }
      
      // Check for leaderboard unlock at level 4
      if (pendingLevelUp >= LEADERBOARD_REQUIRED_LEVEL && !leaderboardUnlockShown) {
        setPendingLeaderboardUnlock(true);
        // Reset leaderboard so everyone starts at 0 when tournament unlocks
        resetLeaderboard();
        resetSeasonStars();
        setSeasonStars(0);
        // Initialize fresh leaderboard with 0 stars
        const freshPlayers = initializeLeaderboard(0);
        setLeaderboardPlayers(freshPlayers);
        setLeaderboardNewPosition(20); // Start at bottom
        setLeaderboardOldPosition(20);
      }
      
      // Try to activate treasure hunt if player reached required level
      const updatedEvent = activateTreasureHunt(pendingLevelUp);
      if (updatedEvent) {
        setTreasureHuntEvent(updatedEvent);
        // Mark that promo should be shown at the end of popup chain
        if (!treasureHuntPromoShown) {
          setPendingTreasureHuntPromo(true);
        }
      }
    }
    setPendingLevelUp(null);
    
    // Continue to daily quests
    proceedToDailyQuests();
  };
  
  // Handle collections unlock popup close - continue flow
  const handleCollectionsUnlockClose = () => {
    setShowCollectionsUnlock(false);
    setCollectionsUnlockShown(true);
    localStorage.setItem('solitaire_collections_unlock_shown', 'true');
    setPendingCollectionsUnlock(false);
    
    // Check for leaderboard unlock
    if (pendingLeaderboardUnlock) {
      setShowLeaderboardUnlock(true);
      return;
    }
    
    // Continue the flow - check daily reward
    if (tryShowDailyReward()) {
      return;
    }
    
    // Check for treasure hunt promo
    if (pendingTreasureHuntPromo) {
      setShowTreasureHuntPromo(true);
      return;
    }
    
    // Start new game
    clearNoMoves();
    setShowNewGameButton(false);
    setNoMovesShownOnce(false);
    newGame('solvable');
  };
  
  // Handle leaderboard unlock popup close - continue flow
  const handleLeaderboardUnlockClose = () => {
    setShowLeaderboardUnlock(false);
    setLeaderboardUnlockShown(true);
    localStorage.setItem('solitaire_leaderboard_unlock_shown', 'true');
    setPendingLeaderboardUnlock(false);
    
    // Now that unlock popup is shown, check if leaderboard popup is pending
    // (user improved position and should see the tournament results)
    if (pendingLeaderboardShow) {
      setPendingLeaderboardShow(false);
      setShowLeaderboard(true);
      // After leaderboard closes, continue the flow
      pendingAfterLeaderboardRef.current = () => {
        // Continue with the rest of the flow
        if (tryShowDailyReward()) return;
        if (pendingPromoUnlock) { setShowPromoUnlock(true); return; }
        if (pendingTreasureHuntPromo) { setShowTreasureHuntPromo(true); return; }
        clearNoMoves();
        setShowNewGameButton(false);
        setNoMovesShownOnce(false);
        newGame('solvable');
      };
      return;
    }
    
    // Continue the flow - check daily reward
    if (tryShowDailyReward()) {
      return;
    }
    
    // Check for promo/shop unlock
    if (pendingPromoUnlock) {
      setShowPromoUnlock(true);
      return;
    }
    
    // Check for treasure hunt promo
    if (pendingTreasureHuntPromo) {
      setShowTreasureHuntPromo(true);
      return;
    }
    
    // Start new game
    clearNoMoves();
    setShowNewGameButton(false);
    setNoMovesShownOnce(false);
    newGame('solvable');
  };
  
  // Handle promo/shop unlock popup close - continue flow
  const handlePromoUnlockClose = () => {
    setShowPromoUnlock(false);
    setPromoUnlocked(true);
    localStorage.setItem('solitaire_promo_unlocked', 'true');
    setPendingPromoUnlock(false);
    
    // Check for treasure hunt promo
    if (pendingTreasureHuntPromo) {
      setShowTreasureHuntPromo(true);
      return;
    }
    
    // Start new game
    clearNoMoves();
    setShowNewGameButton(false);
    setNoMovesShownOnce(false);
    newGame('solvable');
  };
  
  // Handle treasure hunt promo close - start new game
  const handleTreasureHuntPromoClose = () => {
    setShowTreasureHuntPromo(false);
    setTreasureHuntPromoShown(true);
    localStorage.setItem('solitaire_treasure_hunt_promo_shown', 'true');
    setPendingTreasureHuntPromo(false);
    
    // Now start new game
    clearNoMoves();
    setShowNewGameButton(false);
    setNoMovesShownOnce(false);
    newGame('solvable');
  };
  
  // Proceed to collection rewards or start new game
  const proceedToCollectionsOrNewGame = () => {
    // Find ALL completed but unrewarded collections
    const unrewardedCollections = collections
      .filter(c => c.items.every(i => i.collected) && !rewardedCollections.has(c.id))
      .map(c => c.id);
    
    if (unrewardedCollections.length > 0) {
      // Sync displayed stars before showing collections
      const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
      setDisplayedStars(actualTotal);
      
      // Queue all unrewarded collections for rewards
      setPendingCollectionRewards(unrewardedCollections);
      setCollectionsAfterWin(true);
      setShowCollections(true);
      return; // Don't start new game yet
    }
    
    // Check for collections unlock popup
    if (pendingCollectionsUnlock) {
      setShowCollectionsUnlock(true);
      return; // Unlock popup will continue chain when closed
    }
    
    // Check for leaderboard unlock popup
    if (pendingLeaderboardUnlock) {
      setShowLeaderboardUnlock(true);
      return; // Unlock popup will continue chain when closed
    }
    
    // No unrewarded collections - check for daily reward (new day)
    if (tryShowDailyReward()) {
      return; // Daily reward will continue chain when closed
    }
    
    // Check for promo/shop unlock (first win after collections unlock)
    if (pendingPromoUnlock) {
      setShowPromoUnlock(true);
      return; // Promo unlock popup will continue chain when closed
    }
    
    // Check for treasure hunt promo before starting new game
    if (pendingTreasureHuntPromo) {
      setShowTreasureHuntPromo(true);
      return; // Promo will start new game when closed
    }
    
    // Start new game
    clearNoMoves();
    setShowNewGameButton(false);
    setNoMovesShownOnce(false);
    newGame('solvable');
  };
  
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
    setTotalStars(0);
    setDisplayedStars(0);
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
  
  // Reset ALL player progress
  const handleResetAll = () => {
    // Reset stars
    setTotalStars(0);
    setDisplayedStars(0);
    
    // Reset daily quests
    setDailyQuests(defaultDailyQuests);
    setAcesCollected(0);
    
    // Reset collections
    setCollections(defaultCollections);
    setRewardedCollections(new Set());
    setAllCollectionsRewarded(false);
    setNewItemsInCollections(new Set());
    setNewItemIds(new Set());
    setHasNewCollectionItem(false);
    
    // Reset player XP/level
    resetAllXP();
    
    // Reset monthly progress
    setMonthlyProgress(0);
    setMonthlyRewardClaimed(false);
    
    // Reset daily streak
    setDailyStreak(0);
    setLastLoginDate('');
    setShowDailyReward(false);
    setShowStreakPopup(false);
    setPendingDailyReward(0);
    setPendingStreak(0);
    
    // Clear all localStorage
    localStorage.removeItem('solitaire_total_stars');
    localStorage.removeItem('solitaire_daily_quests');
    localStorage.removeItem('solitaire_daily_quests_date');
    localStorage.removeItem('solitaire_aces_collected');
    localStorage.removeItem('solitaire_monthly_progress');
    localStorage.removeItem('solitaire_monthly_reward_claimed');
    localStorage.removeItem('solitaire_daily_streak');
    localStorage.removeItem('solitaire_last_login_date');
    localStorage.removeItem('solitaire_collections');
    localStorage.removeItem('solitaire_rewarded_collections');
    localStorage.removeItem('solitaire_all_collections_rewarded');
    localStorage.removeItem('solitaire_trophies');
    localStorage.removeItem('solitaire_player_xp');
    localStorage.removeItem('solitaire_leaderboard');
    localStorage.removeItem('solitaire_leaderboard_position');
    localStorage.removeItem('solitaire_season_info');
    localStorage.removeItem('solitaire_season_stars');
    localStorage.removeItem('solitaire_leaderboard_trophies');
    localStorage.removeItem('solitaire_player_level');
    
    // Reset Treasure Hunt event
    resetTreasureHuntEvent();
    localStorage.removeItem('solitaire_treasure_hunt_promo_shown');
    setTreasureHuntEvent(getTreasureHuntEvent());
    setTreasureHuntPromoShown(false);
    setPendingTreasureHuntPromo(false);
    
    // Reset Collections unlock
    localStorage.removeItem('solitaire_collections_unlock_shown');
    setCollectionsUnlockShown(false);
    setPendingCollectionsUnlock(false);
    
    // Reset Leaderboard unlock
    localStorage.removeItem('solitaire_leaderboard_unlock_shown');
    setLeaderboardUnlockShown(false);
    setPendingLeaderboardUnlock(false);
    
    // Reset Promo/Shop unlock
    localStorage.removeItem('solitaire_promo_unlocked');
    setPromoUnlocked(false);
    setShowPromoUnlock(false);
    setPendingPromoUnlock(false);
    
    // Reset first win flag so next game is extra easy
    localStorage.removeItem('solitaire_first_win');
    
    setPlayerLevel(1);
    
    // Reset Points Event
    const newPointsState = resetPointsEvent();
    setPointsEventState(newPointsState);
    setPackRewardsQueue([]);
    setShowPackPopup(false);
    
    // Reset leaderboard state - create fresh leaderboard with low-star players
    const newSeasonInfo = getSeasonInfo();
    setSeasonInfo(newSeasonInfo);
    setSeasonStars(0);
    // Initialize leaderboard with 0 stars - this will create players with low stars
    const freshPlayers = initializeLeaderboard(0);
    setLeaderboardPlayers(freshPlayers);
    const position = freshPlayers.findIndex(p => p.isCurrentUser) + 1;
    setLeaderboardOldPosition(position);
    setLeaderboardNewPosition(position);
    saveCurrentPosition(position);
    setPendingLeaderboardShow(false);
    setLeaderboardTrophies([]);
    
    // Trigger reset of internal Collections state (like hasNewTrophy)
    setCollectionsResetKey(prev => prev + 1);
  };
  
  // Test win function (temporary)
  const handleTestWin = () => {
    playSuccess();
    // Add stars for winning immediately (persisted via localStorage effect)
    addStars(STARS_PER_WIN);
    
    // Check if there are flying icons
    if (flyingIcons.length > 0) {
      setPendingWinScreen(true);
    } else {
      setShowWinScreen(true);
    }
  };
  
  // Test level up function (debug)
  const handleTestLevelUp = () => {
    // Get current level and simulate next level
    const currentXP = parseInt(localStorage.getItem('solitaire_player_xp') || '0', 10);
    const currentLevel = Math.floor(currentXP / 100) + 1; // Simplified calculation
    const nextLevel = currentLevel + 1;
    
    // Set pending level up and show screen
    setPendingLevelUp(nextLevel);
    setShowLevelUp(true);
  };
  
  // Handle next day (debug) - reset daily quests and give daily reward
  const handleNextDay = () => {
    // Reset daily quests progress (but keep monthly progress)
    setDailyQuests(prev => prev.map(quest => ({
      ...quest,
      current: 0,
      completed: false
    })));
    setAcesCollected(0);
    
    // Calculate next streak (simulate consecutive day, no limit)
    const newStreak = dailyStreak + 1;
    
    // Set pending streak and reward based on day
    setPendingStreak(newStreak);
    setPendingDailyReward(getRewardStars(newStreak));
    
    // Show streak popup first if streak >= 2, otherwise show reward directly
    if (newStreak >= 2) {
      setShowStreakPopup(true);
    } else {
      setShowDailyReward(true);
    }
    
    // Update streak and "last login" to simulate yesterday
    // (so next "next day" click also works)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setLastLoginDate(yesterday.toDateString());
    setDailyStreak(newStreak - 1); // Will be set to newStreak when claimed
    
    // Start new game
    newGame('solvable');
  };
  
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
  
  // Legacy shop purchase handler (for reference - removed old item collection logic)
  const _legacyShopPurchaseHandler = (item: { items: number; guaranteed: number }) => {
    // Collect items from collections
    let itemsToCollect = item.items;
    let guaranteedUnique = item.guaranteed;
    
    // First, collect guaranteed unique items
    if (guaranteedUnique > 0) {
      const uncollectedItems: Array<{ collectionId: string; itemId: string }> = [];
      collections.forEach(collection => {
        collection.items.forEach(collItem => {
          if (!collItem.collected) {
            uncollectedItems.push({ collectionId: collection.id, itemId: collItem.id });
          }
        });
      });
      
      // Shuffle and take guaranteed unique items
      const shuffled = [...uncollectedItems].sort(() => Math.random() - 0.5);
      const uniqueToCollect = shuffled.slice(0, Math.min(guaranteedUnique, shuffled.length));
      
      uniqueToCollect.forEach(({ collectionId, itemId }) => {
        setCollections(prev => prev.map(coll => {
          if (coll.id === collectionId) {
            return {
              ...coll,
              items: coll.items.map(i => i.id === itemId ? { ...i, collected: true } : i)
            };
          }
          return coll;
        }));
        
        // Mark as new item
        setNewItemIds(prev => new Set(Array.from(prev).concat(itemId)));
        setNewItemsInCollections(prev => {
          const newSet = new Set(prev);
          newSet.add(collectionId);
          return newSet;
        });
        setHasNewCollectionItem(true);
        
        itemsToCollect--;
      });
    }
    
    // Then collect remaining items (can be duplicates)
    for (let i = 0; i < itemsToCollect; i++) {
      // Get all items (for duplicates probability)
      const allItems: Array<{ collectionId: string; itemId: string; collected: boolean }> = [];
      collections.forEach(collection => {
        collection.items.forEach(collItem => {
          allItems.push({ collectionId: collection.id, itemId: collItem.id, collected: collItem.collected });
        });
      });
      
      if (allItems.length === 0) break;
      
      const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
      
      if (!randomItem.collected) {
        setCollections(prev => prev.map(coll => {
          if (coll.id === randomItem.collectionId) {
            return {
              ...coll,
              items: coll.items.map(item => item.id === randomItem.itemId ? { ...item, collected: true } : item)
            };
          }
          return coll;
        }));
        
        // Mark as new item
        setNewItemIds(prev => new Set(Array.from(prev).concat(randomItem.itemId)));
        setNewItemsInCollections(prev => {
          const newSet = new Set(prev);
          newSet.add(randomItem.collectionId);
          return newSet;
        });
        setHasNewCollectionItem(true);
      }
      // If already collected, it's a duplicate - no action needed
    }
    
    // Close shop
    setShowShop(false);
    
    // Check if any collections were completed by this purchase
    // Use setTimeout to ensure state is updated
    setTimeout(() => {
      setCollections(currentCollections => {
        // Find completed but unrewarded collections
        const unrewardedCollections = currentCollections
          .filter(c => c.items.every(i => i.collected) && !rewardedCollections.has(c.id))
          .map(c => c.id);
        
        if (unrewardedCollections.length > 0) {
          // Sync displayed stars before showing collections
          const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
          setDisplayedStars(actualTotal);
          
          // Queue unrewarded collections for rewards
          setPendingCollectionRewards(unrewardedCollections);
          
          // Open collections to show rewards
          setShowCollections(true);
        }
        
        return currentCollections; // Don't change state
      });
    }, 100);
  };
  
  // Handle subscription
  const handleSubscribe = () => {
    setIsSubscribed(true);
    localStorage.setItem('solitaire_premium_subscription', 'true');
    setShowShop(false);
  };
  
  // Drop a unique collection item (one that player doesn't have yet)
  const handleDropCollectionItem = () => {
    // Find first incomplete collection and get uncollected items from it
    let targetCollection = null;
    const uncollectedItems: Array<{
      collectionId: string;
      itemId: string;
      icon: string;
      rarity: number;
    }> = [];
    
    // Find first collection that is not complete
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
    
    // Get uncollected items only from target collection
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
    
    // Pick a random uncollected item from the target collection
    const randomItem = uncollectedItems[Math.floor(Math.random() * uncollectedItems.length)];
    
    // Mark item as collected IMMEDIATELY to prevent duplicates on rapid clicks
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
    
    // Get button position for animation target
    const buttonRect = collectionsButtonRef.current?.getBoundingClientRect();
    if (!buttonRect) return;
    
    // Start from center of screen (or any visible area)
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;
    
    // Create flying icon (isDuplicate = false since we're debug dropping unique items)
    const drop = {
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
  };
  
  // Handle star arriving at progress bar - update displayed stars and trigger pulse
  // Real stars are already saved to localStorage, this updates the visual display
  const handleStarArrived = (count: number = 1) => {
    // Increment displayed stars by count (visual update)
    setDisplayedStars(prev => prev + count);
    // Trigger pulse animation by incrementing key
    setStarPulseKey(prev => prev + 1);
  };
  
  // Handle stars from other players - update displayed and total stars
  // BUT NOT season stars (leaderboard) - these are not earned by the player
  const handleOtherPlayerStars = (count: number) => {
    // Guard against NaN
    const safeCount = typeof count === 'number' && !isNaN(count) ? count : 0;
    if (safeCount <= 0) return;
    
    // Increment displayed and total stars only (NOT seasonStars for leaderboard)
    setDisplayedStars(prev => prev + safeCount);
    setTotalStars(prev => prev + safeCount); // Only totalStars, not addStars()
    // Trigger pulse animation
    setStarPulseKey(prev => prev + 1);
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
          
          {/* Compact Event Icons Row - between progress bar and cards */}
          <div 
            className="flex items-center gap-3 mb-2"
            style={{ 
              visibility: (showDailyQuests || showCollections) ? 'hidden' : 'visible',
              width: '584px',
              paddingLeft: '120px',
              position: 'relative',
              zIndex: 10,
              pointerEvents: 'auto',
              boxSizing: 'border-box'
            }}
          >
            {/* Points Event - compact circle with progress ring */}
            <div 
              ref={pointsEventIconRef} 
              className="transition-transform duration-150 hover:scale-110 cursor-pointer"
              style={{ zIndex: 20, position: 'relative' }}
              onClick={() => {
                if (!collectionsUnlocked) {
                  setShowLockedPointsEventPopup(true);
                  return;
                }
                setShowPointsEventPopup(true);
              }}
            >
              {/* Progress ring SVG - same thickness as level indicator */}
              {collectionsUnlocked && (
                <svg 
                  className="absolute pointer-events-none"
                  style={{ width: '74px', height: '74px', transform: 'rotate(-90deg)', left: '-6px', top: '-6px' }}
                >
                  {/* Background circle */}
                  <circle
                    cx="37"
                    cy="37"
                    r="33"
                    fill="none"
                    stroke="rgba(0,0,0,0.4)"
                    strokeWidth="5"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="37"
                    cy="37"
                    r="33"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 33}`}
                    strokeDashoffset={`${2 * Math.PI * 33 * (1 - getProgressToNextReward(pointsEventState) / 100)}`}
                    style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f472b6" />
                      <stop offset="100%" stopColor="#c026d3" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
              <div
                className="relative flex items-center justify-center rounded-full overflow-visible"
                style={{
                  width: '62px',
                  height: '62px',
                  background: collectionsUnlocked 
                    ? 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)'
                    : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                  border: '2px solid rgba(255,255,255,0.25)',
                  pointerEvents: 'auto',
                }}
              >
                {/* Dynamic reward icon based on next reward */}
                {(() => {
                  // Use animating index during animation, otherwise current index
                  const displayIndex = animatingRewardIndex ?? pointsEventState.currentRewardIndex;
                  const currentReward = getRewardAtIndex(displayIndex);
                  const isStars = currentReward.type === 'stars';
                  const packRarity = currentReward.packRarity || 1;
                  const packColors: Record<number, string> = {
                    1: '#9ca3af', // gray
                    2: '#22c55e', // green
                    3: '#3b82f6', // blue
                    4: '#a855f7', // purple
                    5: '#ef4444', // red/gold
                  };
                  
                  // Get next reward for drop animation
                  const nextReward = getRewardAtIndex(pointsEventState.currentRewardIndex);
                  const nextIsStars = nextReward.type === 'stars';
                  const nextPackRarity = nextReward.packRarity || 1;
                  
                  return (
                    <div className="relative" style={{ width: '40px', height: '40px' }}>
                      {/* Current reward icon - hidden when flying copy is animating to miniature */}
                      {!nextRewardDropping && !rewardIconAnimating && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ 
                            filter: collectionsUnlocked ? 'none' : 'grayscale(0.5) brightness(0.7)',
                          }}
                        >
                          {isStars ? (
                            <div className="relative">
                              <span 
                                className={`text-2xl transition-transform duration-150 inline-block ${pointsEventPulse ? 'scale-125' : 'scale-100'}`}
                              >
                                ⭐
                              </span>
                              <span 
                                className="absolute text-sm font-bold text-yellow-400"
                                style={{ right: '-7px', bottom: '-7px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                              >
                                {currentReward.stars}
                              </span>
                            </div>
                          ) : (
                            <span className={`transition-transform duration-150 inline-block ${pointsEventPulse ? 'scale-110' : 'scale-100'}`}>
                              <MiniCardPack 
                                color={COLLECTION_PACKS[packRarity as 1|2|3|4|5]?.color || '#9ca3af'} 
                                stars={packRarity} 
                                size={32} 
                              />
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Next reward dropping from above into button */}
                      {nextRewardDropping && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            animation: 'rewardDrop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                          }}
                        >
                          {nextIsStars ? (
                            <div className="relative">
                              <span className="text-2xl">⭐</span>
                              <span 
                                className="absolute text-sm font-bold text-yellow-400"
                                style={{ right: '-7px', bottom: '-7px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                              >
                                {nextReward.stars}
                              </span>
                            </div>
                          ) : (
                            <MiniCardPack 
                              color={COLLECTION_PACKS[nextPackRarity as 1|2|3|4|5]?.color || '#9ca3af'} 
                              stars={nextPackRarity} 
                              size={32} 
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                {!collectionsUnlocked && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">🔒 {COLLECTIONS_REQUIRED_LEVEL}</span>
                )}
              </div>
          </div>
          
            {/* Treasure Hunt - compact circle */}
            {(treasureHuntEvent.active || !isEventAvailable(playerLevel)) && (
              <div ref={treasureHuntIconRef} style={{ zIndex: 20 }}>
                <button
                  onClick={() => setShowTreasureHunt(true)}
                  className="relative flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer hover:scale-110"
                  style={{
                    width: '62px',
                    height: '62px',
                    background: isEventAvailable(playerLevel)
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                    boxShadow: treasureHuntPulse 
                      ? '0 0 14px rgba(251, 191, 36, 0.6), 0 3px 10px rgba(0,0,0,0.3)'
                      : '0 3px 10px rgba(0,0,0,0.3)',
                    border: '2px solid rgba(255,255,255,0.25)',
                    transform: treasureHuntPulse ? 'scale(1.1)' : undefined,
                    pointerEvents: 'auto',
                  }}
                >
                  <span className="text-3xl" style={{ 
                    filter: isEventAvailable(playerLevel) ? 'none' : 'grayscale(0.5) brightness(0.7)',
                  }}>🎁</span>
                  {isEventAvailable(playerLevel) && treasureHuntEvent.keys > 0 && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-yellow-900 rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                      <span className="text-xs font-bold">{treasureHuntEvent.keys}</span>
                    </div>
                  )}
                  {!isEventAvailable(playerLevel) && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">🔒 {getRequiredLevel()}</span>
                  )}
                </button>
              </div>
            )}
            
            {/* Promo Widget - compact mode (only when promo unlocked) */}
            {promoUnlocked && (
              <div style={{ zIndex: 20 }}>
                <PromoWidget 
                  compact={true}
                  onStarArrived={(count) => {
                    const safeCount = typeof count === 'number' && !isNaN(count) ? count : 0;
                    if (safeCount <= 0) return;
                    addStars(safeCount);
                    setDisplayedStars(prev => prev + safeCount);
                    setStarPulseKey(prev => prev + 1);
                  }}
                  onCollectionCardArrived={() => {
                    setCollectionButtonPulse(true);
                    setTimeout(() => setCollectionButtonPulse(false), 150);
                  }}
                  onPurchase={(packId, stars, cards) => {
                    console.log(`Pack purchased: ${packId}, stars: ${stars}, cards: ${cards}`);
                  }}
                />
              </div>
            )}
            
            {/* Pending rewards miniatures - positioned after all event icons */}
            {playerLevel >= COLLECTIONS_REQUIRED_LEVEL && pointsEventState.pendingRewards.length > 0 && (
              <div 
                ref={miniatureContainerRef}
                className="flex items-center gap-1 ml-1"
                style={{ zIndex: 20 }}
              >
                {pointsEventState.pendingRewards.slice(0, 4).map((reward) => {
                  const isFlying = flyingRewardToMiniature?.id === reward.id;
                  return (
                    <div
                      key={reward.id}
                      className="flex items-center justify-center"
                      style={{ 
                        width: '36px', 
                        height: '48px',
                        opacity: isFlying ? 0 : 1,
                      }}
                    >
                      {reward.type === 'pack' && reward.packRarity ? (
                        <MiniCardPack 
                          color={COLLECTION_PACKS[reward.packRarity].color} 
                          stars={reward.packRarity} 
                          size={29} 
                        />
                      ) : (
                        <span className="text-2xl">⭐</span>
                      )}
                    </div>
                  );
                })}
                {pointsEventState.pendingRewards.length > 4 && (
                  <span className="text-xs text-white/70 font-bold">+{pointsEventState.pendingRewards.length - 4}</span>
                )}
              </div>
            )}
          </div>
          
          {/* Game field container - no side panels */}
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
              onDoubleClick={(e) => {
                // Double-click on empty area collects all available cards
                // Check if click was on a card or pile (cards have data-card-id, piles have data-pile)
                const target = e.target as HTMLElement;
                const isOnCard = target.closest('[data-card-id]');
                const isOnPile = target.closest('[data-pile]');
                const isOnStock = target.closest('[data-stock-pile]');
                if (!isOnCard && !isOnPile && !isOnStock && !isAutoCollecting) {
                  collectAllAvailable();
                }
              }}
              onTouchEnd={(e) => {
                // Double-tap detection for mobile (Telegram WebApp)
                const now = Date.now();
                const DOUBLE_TAP_DELAY = 300; // ms
                
                if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
                  // Double tap detected - check if on empty area
                  const target = e.target as HTMLElement;
                  const isOnCard = target.closest('[data-card-id]');
                  const isOnPile = target.closest('[data-pile]');
                  const isOnStock = target.closest('[data-stock-pile]');
                  if (!isOnCard && !isOnPile && !isOnStock && !isAutoCollecting) {
                    e.preventDefault();
                    collectAllAvailable();
                  }
                  lastTapTimeRef.current = 0; // Reset to prevent triple tap triggering
                } else {
                  lastTapTimeRef.current = now;
                }
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
            <div className="flex gap-1" style={{ minHeight: '400px', paddingBottom: '20px' }}>
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
      
      {/* Level Up Screen */}
      <LevelUpScreen
        isVisible={showLevelUp}
        newLevel={pendingLevelUp || 1}
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
          setShowShop(false);
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
      
      {/* Streak Popup - shown before daily reward if streak >= 2 */}
      <StreakPopup
        isVisible={showStreakPopup && pendingStreak >= 2}
        streakDay={pendingStreak}
        onContinue={() => {
          setShowStreakPopup(false);
          setShowDailyReward(true);
        }}
      />
      
      {/* Daily Reward Popup */}
      <DailyRewardPopup
        isVisible={showDailyReward}
        currentDay={pendingStreak}
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
      
      {/* Locked Points Event Popup (shown when clicking locked button) */}
      {showLockedPointsEventPopup && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center"
          onClick={() => setShowLockedPointsEventPopup(false)}
        >
          {/* Backdrop - appears instantly */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div 
            className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 border-2 border-gray-600/50 shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🔒</div>
              <h2 className="text-xl font-bold text-gray-200 mb-1">Функция заблокирована</h2>
            </div>
            
            {/* Info */}
            <div className="bg-black/30 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">📦</span>
                <div>
                  <h3 className="text-lg font-bold text-blue-400">Ивент: Паки</h3>
                  <p className="text-white/70 text-sm">Зарабатывайте награды за игру</p>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-3">
                Убирайте карты с поля, заполняйте прогресс бар и получайте паки с предметами коллекций и звёзды!
              </p>
              <div className="flex items-center gap-2 bg-blue-500/20 rounded-lg px-3 py-2">
                <span className="text-xl">⭐</span>
                <span className="text-blue-300 text-sm font-medium">
                  Разблокируется на {COLLECTIONS_REQUIRED_LEVEL} уровне
                </span>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowLockedPointsEventPopup(false)}
              className="w-full py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Понятно
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {/* Locked Collections Popup (shown when clicking locked button) */}
      {showLockedCollectionsPopup && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center"
          onClick={() => setShowLockedCollectionsPopup(false)}
        >
          {/* Backdrop - appears instantly */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div 
            className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 border-2 border-gray-600/50 shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🔒</div>
              <h2 className="text-xl font-bold text-gray-200 mb-1">Функция заблокирована</h2>
            </div>
            
            {/* Info */}
            <div className="bg-black/30 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <h3 className="text-lg font-bold text-amber-400">Коллекции</h3>
                  <p className="text-white/70 text-sm">Собирайте уникальные предметы</p>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-3">
                Открывайте паки с предметами и собирайте полные коллекции для получения наград в звёздах!
              </p>
              <div className="flex items-center gap-2 bg-amber-500/20 rounded-lg px-3 py-2">
                <span className="text-xl">⭐</span>
                <span className="text-amber-300 text-sm font-medium">
                  Разблокируется на 2 уровне
                </span>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowLockedCollectionsPopup(false)}
              className="w-full py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Понятно
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {/* Locked Leaderboard Popup (shown when clicking locked button) */}
      {showLockedLeaderboardPopup && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center"
          onClick={() => setShowLockedLeaderboardPopup(false)}
        >
          {/* Backdrop - appears instantly */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div 
            className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 border-2 border-gray-600/50 shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🔒</div>
              <h2 className="text-xl font-bold text-gray-200 mb-1">Функция заблокирована</h2>
            </div>
            
            {/* Info */}
            <div className="bg-black/30 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <h3 className="text-lg font-bold text-cyan-400">Турнир</h3>
                  <p className="text-white/70 text-sm">Соревнуйтесь с другими игроками</p>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-3">
                Соревнуйтесь с 20 игроками в группе, набирайте звёзды и поднимайтесь в турнире. Лучшие игроки получают призы!
              </p>
              <div className="flex items-center gap-2 bg-cyan-500/20 rounded-lg px-3 py-2">
                <span className="text-xl">⭐</span>
                <span className="text-cyan-300 text-sm font-medium">
                  Разблокируется на {LEADERBOARD_REQUIRED_LEVEL} уровне
                </span>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowLockedLeaderboardPopup(false)}
              className="w-full py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Понятно
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {/* Collections Unlock Popup (shown when reaching level 2) */}
      {showCollectionsUnlock && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center"
          onClick={handleCollectionsUnlockClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" style={{ animation: 'fadeIn 0.15s ease-out' }} />
          <div 
            className="relative bg-gradient-to-br from-amber-900 via-orange-900 to-amber-900 rounded-2xl p-6 max-w-md w-full mx-4 border-2 border-amber-500/50 shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-amber-300 mb-1">Новая функция!</h2>
              <p className="text-white/80">Достигнут 2 уровень</p>
            </div>
            
            {/* Collections explanation */}
            <div className="bg-black/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">🏆</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Коллекции</h3>
                  <p className="text-white/70 text-sm">Собирайте уникальные предметы</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Открывайте паки с предметами и собирайте полные коллекции. 
                За каждую собранную коллекцию вы получите награду в звёздах!
              </p>
            </div>
            
            {/* Points Event explanation */}
            <div className="bg-black/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">📦</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Ивент: Паки</h3>
                  <p className="text-white/70 text-sm">Зарабатывайте награды за игру</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Убирайте карты с поля, заполняйте прогресс бар и получайте паки с предметами 
                коллекций и звёзды. Чем выше редкость пака - тем ценнее предметы!
              </p>
            </div>
            
            {/* Continue button */}
            <button
              onClick={handleCollectionsUnlockClose}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
            >
              Понятно! 🎮
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {/* Leaderboard Unlock Popup (shown when reaching level 4) */}
      {showLeaderboardUnlock && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center"
          onClick={handleLeaderboardUnlockClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" style={{ animation: 'fadeIn 0.15s ease-out' }} />
          <div 
            className="relative bg-gradient-to-br from-cyan-900 via-blue-900 to-cyan-900 rounded-2xl p-6 max-w-md w-full mx-4 border-2 border-cyan-500/50 shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-cyan-300 mb-1">Новая функция!</h2>
              <p className="text-white/80">Достигнут {LEADERBOARD_REQUIRED_LEVEL} уровень</p>
            </div>
            
            {/* Tournament explanation */}
            <div className="bg-black/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">🏆</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Турнир</h3>
                  <p className="text-white/70 text-sm">Соревнуйтесь с другими игроками</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Вы находитесь в группе из 20 игроков. Набирайте звёзды за победы и поднимайтесь в турнире. 
                В конце сезона лучшие игроки получат награды!
              </p>
            </div>
            
            {/* Continue button */}
            <button
              onClick={handleLeaderboardUnlockClose}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
            >
              Понятно! 🎮
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {/* Promo/Shop Unlock Popup (shown on first win after collections unlock) */}
      {showPromoUnlock && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center"
          onClick={handlePromoUnlockClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" style={{ animation: 'fadeIn 0.15s ease-out' }} />
          <div 
            className="relative bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 rounded-2xl p-6 max-w-md w-full mx-4 border-2 border-pink-500/50 shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">🎁</div>
              <h2 className="text-2xl font-bold text-pink-300 mb-1">Специальные предложения!</h2>
              <p className="text-white/80">Открыт доступ к акциям</p>
            </div>
            
            {/* Promo explanation */}
            <div className="bg-black/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">🛍️</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Магазин акций</h3>
                  <p className="text-white/70 text-sm">Выгодные наборы с ограниченным временем</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Теперь вам доступны специальные предложения! Следите за таймером — 
                акции обновляются регулярно. Покупайте наборы звёзд и паки коллекций 
                по выгодным ценам!
              </p>
            </div>
            
            {/* Features list */}
            <div className="flex justify-around mb-6 text-center">
              <div>
                <div className="text-2xl mb-1">⭐</div>
                <div className="text-xs text-white/70">Звёзды</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🎴</div>
                <div className="text-xs text-white/70">Паки</div>
              </div>
              <div>
                <div className="text-2xl mb-1">⏰</div>
                <div className="text-xs text-white/70">Таймер</div>
              </div>
            </div>
            
            {/* Continue button */}
            <button
              onClick={handlePromoUnlockClose}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
            >
              Отлично! 🛒
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {/* Treasure Hunt Promo (shown when event unlocks) */}
      <TreasureHuntPromo
        isVisible={showTreasureHuntPromo}
        onClose={handleTreasureHuntPromoClose}
      />
      
      {/* Treasure Hunt Popup */}
      <TreasureHuntPopup
        isVisible={showTreasureHunt}
        onClose={() => setShowTreasureHunt(false)}
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
      
      {/* Points Event Popup */}
      <PointsEventPopup
        isVisible={showPointsEventPopup}
        eventState={pointsEventState}
        onClose={() => setShowPointsEventPopup(false)}
      />
      
      {/* Collection Pack Popup */}
      <CollectionPackPopup
        isVisible={showPackPopup}
        packRarity={currentPackReward?.rarity || 1}
        items={currentPackReward?.items || []}
        sourcePosition={currentPackReward?.sourcePosition}
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
          setShowCollections(false);
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
              setTimeout(() => setShowCollections(true), 300);
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
          setShowCollections(false);
          setTimeout(() => {
            setShowCollections(true);
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
            zIndex: (showWinScreen || showLevelUp || showDailyQuests || showCollections) ? 10002 : 10
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
            onDebugClick={handleDebugClick}
            pulseKey={starPulseKey}
            onOtherPlayerStars={handleOtherPlayerStars}
            disableOtherPlayerNotifications={showDailyQuests || showCollections || showWinScreen || showLevelUp || showShop}
          />
        </div>,
        document.body
      )}
      
      {/* Bottom Buttons - Icons on Cushions Design */}
      {/* Hide when any popup is open (except pack popup - need collections button for flying items) */}
      {!showDailyQuests && !showWinScreen && !showCollections && !showShop && 
       !showLeaderboard && !showTreasureHunt && !showTreasureHuntPromo && !showCollectionsUnlock && !showLockedCollectionsPopup &&
       !showLockedPointsEventPopup && !showLockedLeaderboardPopup && !showLeaderboardUnlock && !showPromoUnlock &&
       !showLevelUp && !showStreakPopup && !showDailyReward && (
        <div className="fixed bottom-[49px] left-1/2 -translate-x-1/2 z-40 flex items-end gap-2 pb-0 pointer-events-none" style={{ paddingTop: '40px' }}>
          {/* New Game Button - shown when no moves available */}
          {showNewGameButton && (
            <button
              onClick={() => {
                clearNoMoves();
                setShowNewGameButton(false);
                setNoMovesShownOnce(false);
                newGame('solvable');
              }}
              className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 rounded-xl shadow-lg border-b-4 border-red-700 transition-all hover:scale-105 animate-pulse pointer-events-auto"
              title="Новая раскладка"
            >
              <span className="absolute -top-9 text-[2.75rem]" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>🔄</span>
            </button>
          )}
          
          {/* Undo Button */}
          <button
            onClick={() => {
              if (canUndo) undo();
            }}
            disabled={!canUndo}
            className={`relative w-14 h-8 flex items-center justify-center rounded-xl shadow-lg border-b-4 transition-all pointer-events-auto ${
              canUndo
                ? 'bg-gradient-to-b from-slate-400 to-slate-500 hover:from-slate-300 hover:to-slate-400 border-slate-600 hover:scale-105'
                : 'bg-gradient-to-b from-gray-400 to-gray-500 border-gray-600 opacity-40 cursor-not-allowed'
            }`}
            title="Отменить ход"
          >
            <span className={`absolute -top-9 text-[2.75rem] ${!canUndo ? 'opacity-40' : ''}`} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>↩️</span>
          </button>
          
          {/* Hint Button */}
          <button
            onClick={() => {
              getHint();
              setTimeout(() => clearHint(), 350);
            }}
            className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 rounded-xl shadow-lg border-b-4 border-amber-600 transition-all hover:scale-105 pointer-events-auto"
            title="Подсказка"
          >
            <span className="absolute -top-9 text-[2.75rem]" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>💡</span>
          </button>
          
          {/* Daily Quests Button */}
          <button
            onClick={() => {
              const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
              setDisplayedStars(actualTotal);
              setShowDailyQuests(true);
            }}
            className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 rounded-xl shadow-lg border-b-4 border-purple-700 transition-all hover:scale-105 pointer-events-auto"
            title="Задания"
          >
            <span className="absolute -top-9 text-[2.75rem]" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>📋</span>
            {(() => {
              const completed = dailyQuests.filter(q => q.completed).length;
              const total = dailyQuests.length;
              return (
                <span className={`absolute top-1 -right-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold shadow-md ${completed === total ? 'bg-green-500 text-white' : 'bg-white text-gray-800'}`}>
                  {completed}/{total}
                </span>
              );
            })()}
          </button>
          
          {/* Shop Button */}
          <button
            onClick={() => {
              const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
              setDisplayedStars(actualTotal);
              setShowShop(true);
            }}
            className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-xl shadow-lg border-b-4 border-teal-700 transition-all hover:scale-105 pointer-events-auto"
            title="Магазин"
          >
            <span className="absolute -top-9 text-[2.75rem]" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>🛒</span>
            {isSubscribed && (
              <span className="absolute -top-3 -right-1 text-lg drop-shadow-md">👑</span>
            )}
          </button>
          
          {/* Collections Button */}
          <button
            ref={collectionsUnlocked ? collectionsButtonRef : undefined}
            data-collections-button
            onClick={() => {
              if (!collectionsUnlocked) {
                setShowLockedCollectionsPopup(true);
                return;
              }
              const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
              setDisplayedStars(actualTotal);
              const unrewardedCollections = collections
                .filter(c => c.items.every(i => i.collected) && !rewardedCollections.has(c.id))
                .map(c => c.id);
              if (unrewardedCollections.length > 0) {
                setPendingCollectionRewards(unrewardedCollections);
              }
              setCollectionsAfterWin(false);
              setShowCollections(true);
            }}
            className={`relative w-14 h-8 flex items-center justify-center rounded-xl shadow-lg border-b-4 transition-all pointer-events-auto ${
              collectionsUnlocked 
                ? 'bg-gradient-to-b from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-orange-700 hover:scale-105' 
                : 'bg-gradient-to-b from-gray-500 to-gray-600 border-gray-700 opacity-70'
            }`}
            style={collectionButtonPulse ? { animation: 'collection-pop 0.15s ease-out' } : undefined}
            title={collectionsUnlocked ? 'Коллекции' : `Коллекции (LVL ${COLLECTIONS_REQUIRED_LEVEL})`}
          >
            {collectionsUnlocked ? (
              <svg className="absolute -top-7" width="34" height="46" viewBox="0 0 36 48" fill="none" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
                {/* Pack background - purple/gold gradient for legendary feel */}
                <rect x="0" y="0" width="36" height="48" rx="5" fill="url(#packGradient5)" />
                <rect x="0" y="0" width="36" height="48" rx="5" fill="url(#packShine5)" />
                {/* 5 stars in arc pattern */}
                <text x="18" y="20" textAnchor="middle" fontSize="8" fill="#fbbf24" style={{ textShadow: '0 0 6px rgba(251, 191, 36, 1)' }}>★ ★ ★</text>
                <text x="18" y="32" textAnchor="middle" fontSize="10" fill="#fbbf24" style={{ textShadow: '0 0 6px rgba(251, 191, 36, 1)' }}>★ ★</text>
                {/* Border glow */}
                <rect x="1" y="1" width="34" height="46" rx="4" fill="none" stroke="rgba(251, 191, 36, 0.5)" strokeWidth="1" />
                <defs>
                  <linearGradient id="packGradient5" x1="0" y1="0" x2="36" y2="48">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="50%" stopColor="#6d28d9" />
                    <stop offset="100%" stopColor="#4c1d95" />
                  </linearGradient>
                  <linearGradient id="packShine5" x1="0" y1="0" x2="36" y2="48">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              <svg className="absolute -top-6" width="28" height="38" viewBox="0 0 36 48" fill="none" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))', opacity: 0.5 }}>
                <rect x="0" y="0" width="36" height="48" rx="5" fill="#6b7280" />
                <text x="18" y="20" textAnchor="middle" fontSize="8" fill="#9ca3af">★ ★ ★</text>
                <text x="18" y="32" textAnchor="middle" fontSize="10" fill="#9ca3af">★ ★</text>
              </svg>
            )}
            {collectionsUnlocked ? (
              <span className={`absolute top-1 -right-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold shadow-md ${completedCollectionsCount === collections.length ? 'bg-green-500 text-white' : 'bg-white text-gray-800'}`}>
              {completedCollectionsCount}/{collections.length}
            </span>
            ) : (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">🔒 {COLLECTIONS_REQUIRED_LEVEL}</span>
            )}
            {collectionsUnlocked && hasNewCollectionItem && !allCollectionsRewarded && (
              <span className="absolute -top-2 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md animate-bounce">!</span>
            )}
          </button>
          
          {/* Leaderboard Button */}
          <button
            onClick={() => {
              if (!leaderboardUnlocked) {
                setShowLockedLeaderboardPopup(true);
                return;
              }
              const currentSeasonStars = getSeasonStars();
              const result = updateCurrentUserStars(currentSeasonStars);
              setLeaderboardPlayers(result.players);
              setLeaderboardOldPosition(result.oldPosition);
              setLeaderboardNewPosition(result.newPosition);
              setShowLeaderboard(true);
              setShowOvertakenNotification(false);
            }}
            className={`relative w-14 h-8 flex items-center justify-center rounded-xl shadow-lg border-b-4 transition-all pointer-events-auto ${
              leaderboardUnlocked 
                ? `bg-gradient-to-b from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-blue-700 hover:scale-105 ${showOvertakenNotification ? 'animate-pulse ring-2 ring-red-500' : ''}`
                : 'bg-gradient-to-b from-gray-500 to-gray-600 border-gray-700 opacity-70'
            }`}
            title={leaderboardUnlocked ? `Турнир ${leaderboardNewPosition}/20` : `Турнир (LVL ${LEADERBOARD_REQUIRED_LEVEL})`}
          >
            <span className={`absolute -top-9 text-[2.75rem] ${leaderboardUnlocked ? '' : 'opacity-50'}`} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>🏆</span>
            {leaderboardUnlocked ? (
              <>
                <span className="absolute top-1 -right-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold bg-white text-gray-800 shadow-md">
                  {leaderboardNewPosition}
                </span>
                {showOvertakenNotification && (
                  <span className="absolute -top-2 -left-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] items-center justify-center shadow-md">⬇️</span>
              </span>
                )}
              </>
            ) : (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">🔒 {LEADERBOARD_REQUIRED_LEVEL}</span>
            )}
          </button>
          
          {/* Overtaken notification toast - positioned above the trophy icon */}
          {leaderboardUnlocked && showOvertakenNotification && (
            <div 
              className="absolute -top-[4.5rem] left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500/90 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg"
              style={{ animation: 'slideUp 0.3s ease-out' }}
            >
              😱 Вас обогнали!
            </div>
          )}
        </div>
      )}
      
      {/* Collections Button - visible during Treasure Hunt popup for flying icons */}
      {/* Not clickable, just a target for flying collection items */}
      {showTreasureHunt && (
        <div className="fixed bottom-[49px] left-1/2 -translate-x-1/2 z-[60] flex items-end gap-2 pb-0 pointer-events-none" style={{ paddingTop: '40px' }}>
          {/* Invisible spacers to match cushion button row layout (undo, hint, quests, shop, collections) */}
          <div className="w-14 h-8 opacity-0"></div>
          <div className="w-14 h-8 opacity-0"></div>
          <div className="w-14 h-8 opacity-0"></div>
          <div className="w-14 h-8 opacity-0"></div>
          <div className="w-14 h-8 opacity-0"></div>
          {/* Actual visible Collections button */}
          <div
            ref={collectionsButtonRef}
            data-collections-button
            className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-amber-500 to-orange-600 rounded-xl shadow-lg border-b-4 border-orange-700"
            style={collectionButtonPulse ? { animation: 'collection-pop 0.15s ease-out' } : undefined}
          >
            <svg className="absolute -top-8" width="34" height="46" viewBox="0 0 36 48" fill="none" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
              <rect x="0" y="0" width="36" height="48" rx="5" fill="url(#packGradient5b)" />
              <rect x="0" y="0" width="36" height="48" rx="5" fill="url(#packShine5b)" />
              <text x="18" y="20" textAnchor="middle" fontSize="8" fill="#fbbf24" style={{ textShadow: '0 0 6px rgba(251, 191, 36, 1)' }}>★ ★ ★</text>
              <text x="18" y="32" textAnchor="middle" fontSize="10" fill="#fbbf24" style={{ textShadow: '0 0 6px rgba(251, 191, 36, 1)' }}>★ ★</text>
              <rect x="1" y="1" width="34" height="46" rx="4" fill="none" stroke="rgba(251, 191, 36, 0.5)" strokeWidth="1" />
              <defs>
                <linearGradient id="packGradient5b" x1="0" y1="0" x2="36" y2="48">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="50%" stopColor="#6d28d9" />
                  <stop offset="100%" stopColor="#4c1d95" />
                </linearGradient>
                <linearGradient id="packShine5b" x1="0" y1="0" x2="36" y2="48">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
                </linearGradient>
              </defs>
            </svg>
            <span className={`absolute top-1 -right-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold shadow-md ${completedCollectionsCount === collections.length ? 'bg-green-500 text-white' : 'bg-white text-gray-800'}`}>
              {completedCollectionsCount}/{collections.length}
            </span>
            {hasNewCollectionItem && !allCollectionsRewarded && (
              <span className="absolute -top-2 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">!</span>
            )}
          </div>
          <div className="w-14 h-8 opacity-0"></div>
        </div>
      )}
      
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
      {collisionParticles.map(particle => (
        <CollisionParticleComponent key={particle.id} particle={particle} />
      ))}
      
      {/* Flying Cards for parallel auto-collect animation */}
      <FlyingCardsContainer />
    </div>
  );
}

// Collision particle component
function CollisionParticleComponent({ particle }: { particle: { id: number; x: number; y: number; vx: number; vy: number; size: number; color: string } }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const duration = 500;
    let x = particle.x;
    let y = particle.y;
    let vx = particle.vx;
    let vy = particle.vy;
    
    const animate = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      x += vx;
      y += vy;
      vy += 0.15; // gravity
      vx *= 0.98; // friction
      
      const opacity = 1 - progress;
      const scale = 1 - progress * 0.5;
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      elementRef.current.style.opacity = `${opacity}`;
      elementRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsVisible(false);
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [particle]);
  
  if (!isVisible) return null;
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[10001] rounded-full"
      style={{
        left: particle.x,
        top: particle.y,
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        transform: 'translate(-50%, -50%)',
        boxShadow: `0 0 ${particle.size}px ${particle.color}`
      }}
    />,
    document.body
  );
}

// Flying star component for treasure hunt rewards (two-phase: scatter then fly)
interface TreasureFlyingStarProps {
  star: {
    id: number;
    value: number;
    startX: number;
    startY: number;
    scatterX: number;
    scatterY: number;
    targetX: number;
    targetY: number;
    controlX: number;
    controlY: number;
    scatterDuration: number;
    flyDelay: number;
    flyDuration: number;
  };
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
