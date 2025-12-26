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
import { FlyingCollectionIcon, setFlyingIconCallback, setCollectionsButtonPosition, getCollectionsButtonPosition, tryCollectionDrop, setOnCardToFoundationCallback } from './FlyingCollectionIcon';
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
  LeaderboardTrophy
} from '../../lib/leaderboard';

// Stars reward for level up (same as most expensive collection)
const STARS_PER_LEVELUP = 50;

// Daily quest interface
interface Quest {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: number;
  completed: boolean;
}

// Stars earned per win
const STARS_PER_WIN = 3;

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
    collectAllAvailable
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
  
  // Default daily quests
  const defaultDailyQuests: Quest[] = [
    {
      id: 'daily-games',
      title: 'Разложи пасьянсы',
      description: 'Успешно разложи 3 пасьянса',
      current: 0,
      target: 3,
      reward: 10,
      completed: false
    },
    {
      id: 'daily-aces',
      title: 'Собери тузы',
      description: 'Собери 24 туза в основание',
      current: 0,
      target: 24,
      reward: 15,
      completed: false
    },
    {
      id: 'daily-minimal',
      title: 'Минималист',
      description: 'Разложи пасьянс, перелистнув колоду не более 3 раз',
      current: 0,
      target: 1,
      reward: 5,
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
  const MONTHLY_REWARD = 50;
  
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
  
  // State for "overtaken" notification
  const [showOvertakenNotification, setShowOvertakenNotification] = useState(false);
  
  // Simulate other players gaining stars periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const result = simulateOtherPlayers();
      if (result.players.length > 0) {
        setLeaderboardPlayers(result.players);
        
        // Update current position on the button
        const currentUserIndex = result.players.findIndex(p => p.isCurrentUser);
        if (currentUserIndex !== -1) {
          setLeaderboardNewPosition(currentUserIndex + 1);
        }
        
        // Show notification if someone overtook us
        if (result.overtaken) {
          setShowOvertakenNotification(true);
          // Hide after 3 seconds
          setTimeout(() => setShowOvertakenNotification(false), 3000);
        }
      }
    }, 20000); // Every 20 seconds (more frequent for more action)
    
    return () => clearInterval(interval);
  }, []);
  
  // Check for position improvement when season stars change
  useEffect(() => {
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
  }, [seasonStars]);
  
  // Helper to add stars (updates both total and season)
  const addStars = (amount: number) => {
    setTotalStars(prev => prev + amount);
    const newSeasonStars = addSeasonStars(amount);
    setSeasonStars(newSeasonStars);
  };
  
  // Check for daily reward on mount
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
    
    // Show streak popup first if streak >= 2, otherwise show reward directly
    if (newStreak >= 2) {
      setShowStreakPopup(true);
    } else {
      setShowDailyReward(true);
    }
  }, []); // Only on mount
  
  // Claim daily reward
  const claimDailyReward = () => {
    if (pendingDailyReward > 0) {
      addStars(pendingDailyReward);
      setDailyStreak(pendingStreak); // Save actual streak (not limited to 10)
      setLastLoginDate(new Date().toDateString());
      setShowDailyReward(false);
      setPendingDailyReward(0);
      setPendingStreak(0);
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
  }
  const [flyingIcons, setFlyingIcons] = useState<FlyingIcon[]>([]);
  const [hasNewCollectionItem, setHasNewCollectionItem] = useState(false);
  const [newItemsInCollections, setNewItemsInCollections] = useState<Set<string>>(new Set());
  const [collectionsResetKey, setCollectionsResetKey] = useState(0);
  const [collectionButtonPulse, setCollectionButtonPulse] = useState(false);
  const collectionsButtonRef = useRef<HTMLButtonElement>(null);
  
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
  
  // Register callback for card to foundation events
  useEffect(() => {
    setOnCardToFoundationCallback((cardX: number, cardY: number) => {
      // Try to drop a collection item
      tryCollectionDrop(cardX, cardY, collections);
    });
    return () => setOnCardToFoundationCallback(() => {});
  }, [collections]);
  
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
  
  // Handle win condition - wait for flying icons to finish
  useEffect(() => {
    if (isWon && !winHandled) {
      playSuccess();
      setWinHandled(true);
      // Add stars for winning immediately (persisted via localStorage effect)
      addStars(STARS_PER_WIN);
      
      // Check if there are flying icons
      if (flyingIcons.length > 0) {
        // Wait for icons to finish
        setPendingWinScreen(true);
      } else {
        // No flying icons, show win screen immediately
        setShowWinScreen(true);
      }
    }
  }, [isWon, winHandled, playSuccess, flyingIcons.length]);
  
  // Show win screen when all flying icons have landed (if pending)
  useEffect(() => {
    if (pendingWinScreen && flyingIcons.length === 0) {
      setPendingWinScreen(false);
      // Add 0.5s delay before showing win screen
      setTimeout(() => {
        setShowWinScreen(true);
      }, 500);
    }
  }, [pendingWinScreen, flyingIcons.length]);
  
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
      
      checkForAvailableMoves();
    }, 300); // Reduced delay
    
    return () => clearTimeout(timer);
  }, [tableau, waste, stock, foundations, isWon, animatingCard, hasNoMoves, checkForAvailableMoves, isDealing, isAutoCollecting]);
  
  
  // Handle win screen complete - check for level up first, then daily quests
  const handleWinComplete = () => {
    setShowWinScreen(false);
    // Sync displayed stars with actual total from localStorage (to avoid stale closure)
    const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
    setDisplayedStars(actualTotal);
    
    // Check for pending level up first
    if (pendingLevelUp !== null) {
      setShowLevelUp(true);
      return;
    }
    
    // No level up - proceed to daily quests
    proceedToDailyQuests();
  };
  
  // Proceed to daily quests after level up (or directly if no level up)
  const proceedToDailyQuests = () => {
    // Check if all quests were already completed BEFORE this win
    const allAlreadyCompleted = dailyQuests.every(quest => quest.completed);
    
    // If all quests were already done, skip the daily quests screen
    if (allAlreadyCompleted) {
      // Check for unrewarded collections before starting new game
      proceedToCollectionsOrNewGame();
      return;
    }
    
    // Count aces in foundations (4 aces per completed game)
    const acesInGame = 4;
    const newAcesTotal = acesCollected + acesInGame;
    setAcesCollected(newAcesTotal);
    
    // Check if this game qualifies for minimal quest (3 or fewer stock passes)
    // NOTE: stockPasses not tracked in this version, defaulting to 0
    const qualifiesForMinimal = true;
    
    // Calculate updated quests and track newly completed quests for immediate reward
    let starsToAdd = 0;
    let questsJustCompleted = 0;
    const updatedQuests = dailyQuests.map(quest => {
      if (quest.id === 'daily-games' && !quest.completed) {
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
      if (quest.id === 'daily-minimal' && !quest.completed && qualifiesForMinimal) {
        // Quest just completed, add reward immediately
        starsToAdd += quest.reward;
        questsJustCompleted++;
        return { ...quest, current: 1, completed: true };
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
  const tryShowLeaderboard = (onAfterLeaderboard?: () => void): boolean => {
    if (pendingLeaderboardShow) {
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
    setPendingLevelUp(null);
    
    // Continue to daily quests
    proceedToDailyQuests();
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
    
    // No unrewarded collections - start new game
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
      completed: false
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
          icon: item.icon
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
      startY
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
        overflow: 'hidden'
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
            height: '75px',
            marginBottom: '12px'
          }} />
          
          {/* Game field and promo widget container */}
          <div className="flex items-start gap-3">
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
                <div className="flex gap-1">
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
            
            {/* Promo Widget - right side, offset down by ~half card height */}
            <div style={{ 
              visibility: (showDailyQuests || showCollections) ? 'hidden' : 'visible',
              marginTop: '50px'
            }}>
              <PromoWidget 
                onStarArrived={(count) => {
                  // Increment stars by the value each icon carries
                  const safeCount = typeof count === 'number' && !isNaN(count) ? count : 0;
                  if (safeCount <= 0) return;
                  addStars(safeCount);
                  setDisplayedStars(prev => prev + safeCount);
                  // Trigger pulse animation
                  setStarPulseKey(prev => prev + 1);
                }}
                onCollectionCardArrived={() => {
                  // Pulse the collections button when card arrives
                  setCollectionButtonPulse(true);
                  setTimeout(() => setCollectionButtonPulse(false), 150);
                }}
                onPurchase={(packId, stars, cards) => {
                  console.log(`Pack purchased: ${packId}, stars: ${stars}, cards: ${cards}`);
                  // Note: Stars are already added via onStarArrived
                  // Here we could add collection items logic
                }}
              />
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
      
      {/* Bottom Buttons - Daily Quests and Collections */}
      {!showDailyQuests && !showWinScreen && !showCollections && !showShop && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
          {/* New Game Button - shown when no moves available */}
          {showNewGameButton && (
            <button
              onClick={() => {
                clearNoMoves();
                setShowNewGameButton(false);
                setNoMovesShownOnce(false);
                newGame('solvable');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 rounded-full shadow-lg border border-white/20 transition-all hover:scale-105 animate-pulse"
              title="Новая раскладка"
            >
              <span className="text-lg">🔄</span>
              <span className="text-white font-semibold text-sm">Новая</span>
            </button>
          )}
          
          {/* Hint Button */}
          <button
            onClick={() => {
              getHint();
              // Clear hint after animation completes
              setTimeout(() => clearHint(), 350);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 rounded-full shadow-lg border border-white/20 transition-all hover:scale-105"
            title="Подсказка"
          >
            <span className="text-lg">💡</span>
            <span className="text-white font-semibold text-sm">Подсказка</span>
          </button>
          
          {/* Daily Quests Button */}
          <button
            onClick={() => {
              // Sync displayed stars before showing
              const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
              setDisplayedStars(actualTotal);
              setShowDailyQuests(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-full shadow-lg border border-white/20 transition-all hover:scale-105"
          >
            <span className="text-lg">📋</span>
            <span className="text-white font-semibold text-sm">Задания</span>
            {(() => {
              const completed = dailyQuests.filter(q => q.completed).length;
              const total = dailyQuests.length;
              return (
                <span className={`text-xs px-2 py-0.5 rounded-full ${completed === total ? 'bg-green-500' : 'bg-white/20'}`}>
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
            className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-full shadow-lg border border-white/20 transition-all hover:scale-105"
          >
            <span className="text-lg">🛒</span>
            <span className="text-white font-semibold text-sm">Магазин</span>
            {isSubscribed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500">👑</span>
            )}
          </button>
          
          {/* Leaderboard Button */}
          <button
            onClick={() => {
              // Update leaderboard with current season stars before showing
              const currentSeasonStars = getSeasonStars();
              const result = updateCurrentUserStars(currentSeasonStars);
              setLeaderboardPlayers(result.players);
              // Use oldPosition from last time we viewed leaderboard for animation
              setLeaderboardOldPosition(result.oldPosition);
              setLeaderboardNewPosition(result.newPosition);
              setShowLeaderboard(true);
              setShowOvertakenNotification(false); // Clear notification
            }}
            className={`relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-full shadow-lg border border-white/20 transition-all hover:scale-105 ${showOvertakenNotification ? 'animate-pulse ring-2 ring-red-500' : ''}`}
          >
            <span className="text-white font-semibold text-sm whitespace-nowrap min-w-[105px]">
              Рейтинг {leaderboardNewPosition}/20
            </span>
            {leaderboardNewPosition <= 3 && (
              <span className="text-sm">
                {leaderboardNewPosition === 1 ? '🥇' : leaderboardNewPosition === 2 ? '🥈' : '🥉'}
              </span>
            )}
            {/* Overtaken indicator */}
            {showOvertakenNotification && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] items-center justify-center">⬇️</span>
              </span>
            )}
          </button>
          
          {/* Overtaken notification toast */}
          {showOvertakenNotification && (
            <div 
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500/90 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg"
              style={{ animation: 'slideUp 0.3s ease-out' }}
            >
              😱 Вас обогнали в рейтинге!
            </div>
          )}
          
          {/* Collections Button */}
          <button
            ref={collectionsButtonRef}
            data-collections-button
            onClick={() => {
              // Sync displayed stars before showing
              const actualTotal = parseInt(localStorage.getItem('solitaire_total_stars') || '0', 10);
              setDisplayedStars(actualTotal);
              
              // Check for unrewarded collections when manually opening
              const unrewardedCollections = collections
                .filter(c => c.items.every(i => i.collected) && !rewardedCollections.has(c.id))
                .map(c => c.id);
              
              if (unrewardedCollections.length > 0) {
                // Queue unrewarded collections for rewards
                setPendingCollectionRewards(unrewardedCollections);
              }
              
              // Mark as manually opened (not after win)
              setCollectionsAfterWin(false);
              setShowCollections(true);
            }}
            className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-full shadow-lg border border-white/20 transition-all hover:scale-105"
            style={collectionButtonPulse ? { 
              animation: 'collection-pop 0.15s ease-out',
            } : undefined}
          >
            <span className="text-lg">🏆</span>
            <span className="text-white font-semibold text-sm">Коллекции</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${completedCollectionsCount === collections.length ? 'bg-green-500' : 'bg-white/20'}`}>
              {completedCollectionsCount}/{collections.length}
            </span>
            {/* New item notification - hide when all collections are rewarded */}
            {hasNewCollectionItem && !allCollectionsRewarded && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                !
              </span>
            )}
          </button>
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
