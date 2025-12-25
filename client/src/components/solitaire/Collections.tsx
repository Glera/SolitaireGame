import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

// Collection item type
export interface CollectionItem {
  id: string;
  name: string;
  icon: string;
  collected: boolean;
}

// Collection type
export interface Collection {
  id: string;
  name: string;
  icon: string;
  reward: number; // Stars reward
  items: CollectionItem[];
}

// Trophy type - earned when completing all collections in a season
export interface Trophy {
  id: string;
  seasonName: string;
  petName: string;
  petIcon: string;
  description: string;
  earnedAt: string; // ISO date string
}

// Load trophies from localStorage
export function loadTrophies(): Trophy[] {
  const saved = localStorage.getItem('solitaire_trophies');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

// Save trophy to localStorage
export function saveTrophy(trophy: Trophy): void {
  const trophies = loadTrophies();
  // Don't add duplicate trophies
  if (!trophies.some(t => t.id === trophy.id)) {
    trophies.push(trophy);
    localStorage.setItem('solitaire_trophies', JSON.stringify(trophies));
  }
}

// Default collections data - sorted by reward ascending (cheapest top-left, most expensive bottom-right)
export const defaultCollections: Collection[] = [
  // Row 1: 5, 8, 10
  {
    id: 'nature',
    name: 'Природа',
    icon: '🌸',
    reward: 5,
    items: [
      { id: 'nat-1', name: 'Солнце', icon: '☀️', collected: false },
      { id: 'nat-2', name: 'Облако', icon: '☁️', collected: false },
      { id: 'nat-3', name: 'Радуга', icon: '🌈', collected: false },
      { id: 'nat-4', name: 'Звезда', icon: '⭐', collected: false },
      { id: 'nat-5', name: 'Луна', icon: '🌙', collected: false },
      { id: 'nat-6', name: 'Снежинка', icon: '❄️', collected: false },
      { id: 'nat-7', name: 'Листик', icon: '🍃', collected: false },
      { id: 'nat-8', name: 'Цветок', icon: '🌸', collected: false },
      { id: 'nat-9', name: 'Капля', icon: '💧', collected: false },
    ]
  },
  {
    id: 'fruits',
    name: 'Фрукты',
    icon: '🍎',
    reward: 8,
    items: [
      { id: 'fruit-1', name: 'Яблоко', icon: '🍎', collected: false },
      { id: 'fruit-2', name: 'Банан', icon: '🍌', collected: false },
      { id: 'fruit-3', name: 'Арбуз', icon: '🍉', collected: false },
      { id: 'fruit-4', name: 'Клубника', icon: '🍓', collected: false },
      { id: 'fruit-5', name: 'Виноград', icon: '🍇', collected: false },
      { id: 'fruit-6', name: 'Груша', icon: '🍐', collected: false },
      { id: 'fruit-7', name: 'Апельсин', icon: '🍊', collected: false },
      { id: 'fruit-8', name: 'Вишня', icon: '🍒', collected: false },
      { id: 'fruit-9', name: 'Персик', icon: '🍑', collected: false },
    ]
  },
  {
    id: 'toys',
    name: 'Игрушки',
    icon: '🎾',
    reward: 10,
    items: [
      { id: 'toys-1', name: 'Мячик', icon: '🎾', collected: false },
      { id: 'toys-2', name: 'Косточка', icon: '🦴', collected: false },
      { id: 'toys-3', name: 'Канат', icon: '🪢', collected: false },
      { id: 'toys-4', name: 'Фрисби', icon: '🥏', collected: false },
      { id: 'toys-5', name: 'Пищалка', icon: '🔔', collected: false },
      { id: 'toys-6', name: 'Плюшевый мишка', icon: '🧸', collected: false },
      { id: 'toys-7', name: 'Палка', icon: '🪵', collected: false },
      { id: 'toys-8', name: 'Мяч-ёжик', icon: '🔵', collected: false },
      { id: 'toys-9', name: 'Кольцо', icon: '⭕', collected: false },
    ]
  },
  // Row 2: 15, 20, 25
  {
    id: 'treats',
    name: 'Вкусняшки',
    icon: '🍖',
    reward: 15,
    items: [
      { id: 'treats-1', name: 'Печенье', icon: '🍪', collected: false },
      { id: 'treats-2', name: 'Косточка из жил', icon: '🦴', collected: false },
      { id: 'treats-3', name: 'Мясо', icon: '🥩', collected: false },
      { id: 'treats-4', name: 'Сыр', icon: '🧀', collected: false },
      { id: 'treats-5', name: 'Морковка', icon: '🥕', collected: false },
      { id: 'treats-6', name: 'Яблоко', icon: '🍎', collected: false },
      { id: 'treats-7', name: 'Арахисовая паста', icon: '🥜', collected: false },
      { id: 'treats-8', name: 'Лакомство', icon: '🍬', collected: false },
      { id: 'treats-9', name: 'Сухарик', icon: '🥨', collected: false },
    ]
  },
  {
    id: 'accessories',
    name: 'Аксессуары',
    icon: '🎀',
    reward: 20,
    items: [
      { id: 'acc-1', name: 'Ошейник', icon: '⭕', collected: false },
      { id: 'acc-2', name: 'Поводок', icon: '🔗', collected: false },
      { id: 'acc-3', name: 'Бантик', icon: '🎀', collected: false },
      { id: 'acc-4', name: 'Шарфик', icon: '🧣', collected: false },
      { id: 'acc-5', name: 'Жилетка', icon: '🦺', collected: false },
      { id: 'acc-6', name: 'Ботиночки', icon: '👟', collected: false },
      { id: 'acc-7', name: 'Бирка', icon: '🏷️', collected: false },
      { id: 'acc-8', name: 'Медаль', icon: '🏅', collected: false },
      { id: 'acc-9', name: 'Косынка', icon: '👘', collected: false },
    ]
  },
  {
    id: 'home',
    name: 'Домашний уют',
    icon: '🏠',
    reward: 25,
    items: [
      { id: 'home-1', name: 'Лежанка', icon: '🛏️', collected: false },
      { id: 'home-2', name: 'Миска', icon: '🥣', collected: false },
      { id: 'home-3', name: 'Домик', icon: '🏠', collected: false },
      { id: 'home-4', name: 'Одеяло', icon: '🛋️', collected: false },
      { id: 'home-5', name: 'Подушка', icon: '🛏️', collected: false },
      { id: 'home-6', name: 'Коврик', icon: '🟫', collected: false },
      { id: 'home-7', name: 'Корзинка', icon: '🧺', collected: false },
      { id: 'home-8', name: 'Когтеточка', icon: '🪵', collected: false },
      { id: 'home-9', name: 'Фонтанчик', icon: '⛲', collected: false },
    ]
  },
  // Row 3: 30, 40, 50
  {
    id: 'seasons',
    name: 'Времена года',
    icon: '🍂',
    reward: 30,
    items: [
      { id: 'sea-1', name: 'Подснежник', icon: '🌷', collected: false },
      { id: 'sea-2', name: 'Тюльпан', icon: '🌷', collected: false },
      { id: 'sea-3', name: 'Ромашка', icon: '🌼', collected: false },
      { id: 'sea-4', name: 'Подсолнух', icon: '🌻', collected: false },
      { id: 'sea-5', name: 'Кленовый лист', icon: '🍁', collected: false },
      { id: 'sea-6', name: 'Жёлудь', icon: '🌰', collected: false },
      { id: 'sea-7', name: 'Снеговик', icon: '⛄', collected: false },
      { id: 'sea-8', name: 'Ёлка', icon: '🎄', collected: false },
      { id: 'sea-9', name: 'Подарок', icon: '🎁', collected: false },
    ]
  },
  {
    id: 'friends',
    name: 'Друзья',
    icon: '🐕',
    reward: 40,
    items: [
      { id: 'fr-1', name: 'Собака', icon: '🐕', collected: false },
      { id: 'fr-2', name: 'Кошка', icon: '🐈', collected: false },
      { id: 'fr-3', name: 'Хомяк', icon: '🐹', collected: false },
      { id: 'fr-4', name: 'Попугай', icon: '🦜', collected: false },
      { id: 'fr-5', name: 'Рыбка', icon: '🐠', collected: false },
      { id: 'fr-6', name: 'Кролик', icon: '🐰', collected: false },
      { id: 'fr-7', name: 'Черепаха', icon: '🐢', collected: false },
      { id: 'fr-8', name: 'Морская свинка', icon: '🐹', collected: false },
      { id: 'fr-9', name: 'Ёжик', icon: '🦔', collected: false },
    ]
  },
  {
    id: 'hearts',
    name: 'Сердечки',
    icon: '❤️',
    reward: 50,
    items: [
      { id: 'heart-1', name: 'Красное', icon: '❤️', collected: false },
      { id: 'heart-2', name: 'Розовое', icon: '💗', collected: false },
      { id: 'heart-3', name: 'Оранжевое', icon: '🧡', collected: false },
      { id: 'heart-4', name: 'Жёлтое', icon: '💛', collected: false },
      { id: 'heart-5', name: 'Зелёное', icon: '💚', collected: false },
      { id: 'heart-6', name: 'Голубое', icon: '💙', collected: false },
      { id: 'heart-7', name: 'Синее', icon: '💜', collected: false },
      { id: 'heart-8', name: 'Фиолетовое', icon: '💜', collected: false },
      { id: 'heart-9', name: 'Радужное', icon: '🩷', collected: false },
    ]
  },
];

interface FlyingStar {
  id: number;
  value: number; // How many stars this icon represents
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

interface CollectionFlyingChip {
  id: number;
  collectionId: string;
  startX: number;
  startY: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
}

// Max flying star icons
const MAX_FLYING_ICONS = 10;

interface CollectionsProps {
  isVisible: boolean;
  collections: Collection[];
  onClose: () => void;
  petIcon?: string;
  petName?: string; // Current pet name for trophy
  seasonName?: string; // Current season name for trophy
  newItemsInCollections?: Set<string>; // Collection IDs with new items since last view
  newItemIds?: Set<string>; // Specific item IDs that are new
  onCollectionViewed?: (collectionId: string) => void; // Called when a specific collection is opened
  progressBarRef?: React.RefObject<HTMLDivElement>;
  onStarArrived?: (count?: number) => void; // count defaults to 1
  pendingRewardCollectionId?: string | null; // Collection to show and reward
  rewardedCollections?: Set<string>; // Already rewarded collections
  onCollectionRewarded?: (collectionId: string, reward: number) => void;
  onRewardAnimationComplete?: (collectionId: string) => void; // Called when all reward animations are done
  allCollectionsRewarded?: boolean; // Whether grand prize has been claimed
  onAllCollectionsRewarded?: (reward: number) => void; // Called when grand prize is claimed
  onDebugCompleteAll?: () => void; // Debug: complete all collections
  resetKey?: number; // Increment to reset internal state (like hasNewTrophy)
}

export function Collections({ 
  isVisible, 
  collections, 
  onClose, 
  petIcon = '🐕',
  petName = 'Бусинка',
  seasonName = 'Сезон 1', 
  newItemsInCollections, 
  newItemIds, 
  onCollectionViewed,
  progressBarRef,
  onStarArrived,
  pendingRewardCollectionId,
  rewardedCollections,
  onCollectionRewarded,
  onRewardAnimationComplete,
  allCollectionsRewarded,
  onAllCollectionsRewarded,
  onDebugCompleteAll,
  resetKey
}: CollectionsProps) {
  const [activeTab, setActiveTab] = useState<'collections' | 'trophies'>('collections');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedTrophy, setSelectedTrophy] = useState<Trophy | null>(null);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [animatedProgress, setAnimatedProgress] = useState<Record<string, number>>({});
  const [rewardProgressAnimation, setRewardProgressAnimation] = useState<Record<string, number>>({}); // 0-100 for reward animation
  const [pulsingItems, setPulsingItems] = useState<Set<string>>(new Set());
  const [collectingItemIndex, setCollectingItemIndex] = useState<number | null>(null); // For collection completion effect
  const [justRewardedCollectionId, setJustRewardedCollectionId] = useState<string | null>(null); // For return-to-main animation
  const [mainProgressOvershoot, setMainProgressOvershoot] = useState<Record<string, number>>({}); // Overshoot % per collection
  const [mainProgressPulse, setMainProgressPulse] = useState<Record<string, boolean>>({}); // Pulse state per collection
  const [collectingCollectionIndex, setCollectingCollectionIndex] = useState<number | null>(null); // For grand prize effect
  const [animatingIconIndices, setAnimatingIconIndices] = useState<Set<number>>(new Set()); // Icons currently animating (persists longer than collectingItemIndex)
  const [visibleIconIndices, setVisibleIconIndices] = useState<Set<number>>(new Set()); // Icons that have been revealed (starts empty, fills as animation plays)
  const [animatingCollectionIndices, setAnimatingCollectionIndices] = useState<Set<number>>(new Set()); // Collections currently animating
  const [visibleCollectionIndices, setVisibleCollectionIndices] = useState<Set<number>>(new Set()); // Collections that have been revealed
  const [grandPrizeProgress, setGrandPrizeProgress] = useState(0); // 0-100 for grand prize progress bar
  const [isGrandPrizeProgressAnimating, setIsGrandPrizeProgressAnimating] = useState(false); // Flag to show grandPrizeProgress instead of totalProgress
  const [totalProgressOvershoot, setTotalProgressOvershoot] = useState(0); // Overshoot % for total progress bar
  const [totalProgressPulse, setTotalProgressPulse] = useState(false); // Pulse state for total progress bar
  const [displayedCompletedCount, setDisplayedCompletedCount] = useState<number | null>(null); // Delayed display count for animation
  const [flyingChips, setFlyingChips] = useState<CollectionFlyingChip[]>([]); // Flying chips to total progress
  const [chipAnimationQueue, setChipAnimationQueue] = useState<string[]>([]); // Queue of collection IDs for chip animations
  const chipAnimationQueueRef = useRef<string[]>([]); // Ref to track queue for closure
  const [pendingChipAnimationsTrigger, setPendingChipAnimationsTrigger] = useState(0); // Trigger to start animations
  const pendingChipAnimationsRef = useRef<string[]>([]); // Accumulate rewarded collections across window reopens
  const [grandPrizePulsePhase, setGrandPrizePulsePhase] = useState<'none' | 'trophy' | 'stars'>('none'); // Grand prize pulse animation
  const [pendingCompleteAnimation, setPendingCompleteAnimation] = useState<Set<string>>(new Set()); // Collections waiting to show "complete" state
  const [showCompleteLabel, setShowCompleteLabel] = useState<Set<string>>(new Set()); // Collections showing "Выполнено" label
  const [pulsingIcons, setPulsingIcons] = useState<Set<string>>(new Set()); // Collections with pulsing icons
  const isAnimatingChipsRef = useRef(false); // Flag to prevent multiple animation loops
  const totalProgressBarRef = useRef<HTMLDivElement>(null);
  const collectionCardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const prevVisibleRef = useRef(false);
  const hasAnimatedRef = useRef(false);
  
  // Load trophies on mount
  useEffect(() => {
    setTrophies(loadTrophies());
  }, [isVisible]);
  
  // Flying stars state for collection reward
  const [flyingStars, setFlyingStars] = useState<FlyingStar[]>([]);
  const [rewardIconHidden, setRewardIconHidden] = useState(false);
  const [showRewardClaimed, setShowRewardClaimed] = useState(false);
  const [rewardProgress, setRewardProgress] = useState(0); // 0-100 for progress bar animation
  const rewardIconRef = useRef<HTMLDivElement>(null);
  const starsArrivedCountRef = useRef(0);
  const expectedStarsRef = useRef(0);
  const rewardGivenRef = useRef(false);
  const rewardAnimationStartedRef = useRef(false); // Track if animation has started (to prevent double start)
  const currentAnimatingCollectionRef = useRef<string | null>(null); // Track which collection is being animated
  
  // Grand prize animation state
  const [grandPrizeAnimating, setGrandPrizeAnimating] = useState(false);
  const [grandPrizeIconHidden, setGrandPrizeIconHidden] = useState(false);
  const [showGrandPrizeClaimed, setShowGrandPrizeClaimed] = useState(false);
  const [showTrophyScreen, setShowTrophyScreen] = useState(false); // Show trophy celebration screen
  const grandPrizeIconRef = useRef<HTMLDivElement>(null);
  const grandPrizeGivenRef = useRef(false);
  const trophyFlightDataRef = useRef<{
    icon: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
  } | null>(null);
  const grandPrizePendingFromRewardRef = useRef(false); // Prevent useEffect from triggering when we're about to trigger from reward
  
  // Flying trophy animation state
  const [flyingTrophy, setFlyingTrophy] = useState<{
    icon: string;
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
  } | null>(null);
  const [hasNewTrophy, setHasNewTrophy] = useState(false);
  const [trophyAnimationShown, setTrophyAnimationShown] = useState(false); // Track if trophy animation was already shown
  const [petIconHidden, setPetIconHidden] = useState(false);
  const trophiesTabRef = useRef<HTMLButtonElement>(null);
  const petIconRef = useRef<HTMLDivElement>(null);
  
  // Pending grand prize stars data (to launch after trophy arrives)
  const pendingGrandPrizeStarsRef = useRef<FlyingStar[] | null>(null);
  // Pending grand prize reward (to notify parent after all stars arrive)
  const pendingGrandPrizeRewardRef = useRef<number | null>(null);
  
  // Reset internal state when resetKey changes (for "Reset All" functionality)
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setHasNewTrophy(false);
      setTrophyAnimationShown(false);
      setTrophies([]);
      setSelectedTrophy(null);
      setFlyingTrophy(null);
      setPetIconHidden(false);
      setGrandPrizeIconHidden(false);
      setShowGrandPrizeClaimed(false);
      setShowTrophyScreen(false);
      setGrandPrizeAnimating(false);
      setIsGrandPrizeProgressAnimating(false);
      grandPrizeGivenRef.current = false;
      grandPrizePendingFromRewardRef.current = false;
      pendingGrandPrizeStarsRef.current = null;
      pendingGrandPrizeRewardRef.current = null;
      currentAnimatingCollectionRef.current = null;
      rewardAnimationStartedRef.current = false;
      trophyFlightDataRef.current = null;
    }
  }, [resetKey]);
  
  // Auto-show pending reward collection
  useEffect(() => {
    if (!isVisible) return;
    if (!pendingRewardCollectionId) return;
    
    // Prevent duplicate animation for the same collection
    if (currentAnimatingCollectionRef.current === pendingRewardCollectionId) {
      return;
    }
    
    // Check if this collection was already rewarded
    if (rewardedCollections?.has(pendingRewardCollectionId)) {
      return;
    }
    
    const collection = collections.find(c => c.id === pendingRewardCollectionId);
    if (collection) {
      // Mark this collection as being animated
      currentAnimatingCollectionRef.current = pendingRewardCollectionId;
      
// Reset reward animation state
        setFlyingStars([]);
        setRewardIconHidden(false);
        setShowRewardClaimed(false);
        setRewardProgress(0);
        starsArrivedCountRef.current = 0;
        expectedStarsRef.current = 0;
        rewardGivenRef.current = false;
        rewardAnimationStartedRef.current = false;
        // Reset animation sets to prevent carryover from previous collection
        // IMPORTANT: Reset visible indices BEFORE selecting collection to prevent flash
        setCollectingItemIndex(null);
        setAnimatingIconIndices(new Set());
        setVisibleIconIndices(new Set());
        
        // Auto-select the collection
        setSelectedCollection(collection);
      
      // Start animation immediately
      setTimeout(() => {
        startRewardAnimation(collection);
      }, 100);
    }
  }, [isVisible, pendingRewardCollectionId]);
  
  // Auto-trigger grand prize when all conditions are met
  useEffect(() => {
    if (!isVisible) return;
    if (allCollectionsRewarded) return; // Already claimed
    if (grandPrizeGivenRef.current) return; // Already animating
    if (grandPrizePendingFromRewardRef.current) return; // Being triggered from reward completion
    if (pendingRewardCollectionId) return; // Still showing individual reward
    if (selectedCollection) return; // Viewing a collection
    
    // Check if all collections are complete and rewarded
    const allComplete = collections.every(c => c.items.every(i => i.collected));
    const allRewarded = rewardedCollections && collections.every(c => rewardedCollections.has(c.id));
    
    if (allComplete && allRewarded) {
      // Hide all collections immediately before starting animation
      setVisibleCollectionIndices(new Set());
      // Delay to let UI render first
      const timer = setTimeout(() => {
        startGrandPrizeAnimation();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible, collections, rewardedCollections, allCollectionsRewarded, pendingRewardCollectionId, selectedCollection]);
  
  // Start grand prize animation: collection effect first, then progress bar, then stars
  const startGrandPrizeAnimation = () => {
    if (grandPrizeGivenRef.current) return;
    
    // Phase 1: Highlight each collection from bottom to top
    const collectionCount = collections.length;
    const delayPerCollection = 100; // 0.1s between each collection
    const totalAnimationTime = collectionCount * delayPerCollection + 50;
    
    // Clear previous animation state - hide all collections initially
    setAnimatingCollectionIndices(new Set());
    setVisibleCollectionIndices(new Set());
    
    // Sequentially highlight each collection from last to first (bottom to top in grid)
    collections.forEach((_, index) => {
      const reverseIndex = collectionCount - 1 - index;
      setTimeout(() => {
        setCollectingCollectionIndex(reverseIndex);
        // Add to animating set - will persist for full animation duration
        setAnimatingCollectionIndices(prev => new Set(Array.from(prev).concat(reverseIndex)));
        // Make collection visible (and keep it visible)
        setVisibleCollectionIndices(prev => new Set(Array.from(prev).concat(reverseIndex)));
        // Remove from animating set after icon animation completes (1s, no delay)
        setTimeout(() => {
          setAnimatingCollectionIndices(prev => {
            const next = new Set(prev);
            next.delete(reverseIndex);
            return next;
          });
        }, 1000);
      }, index * delayPerCollection);
    });
    
    // After last collection animation starts, immediately launch stars (no progress bar animation)
    setTimeout(() => {
      setCollectingCollectionIndex(null);
      launchGrandPrizeStars();
    }, totalAnimationTime);
  };
  
  // Start reward animation: collection effect first, then progress bar, then stars
  const startRewardAnimation = (collection: Collection) => {
    if (rewardGivenRef.current) return;
    if (rewardAnimationStartedRef.current) return; // Prevent double start
    rewardAnimationStartedRef.current = true;
    
    // Phase 1: Collection completion effect - sequentially highlight each item from bottom to top
    const itemCount = collection.items.length;
    const delayPerItem = 100; // 0.1s between each item
    const totalAnimationTime = itemCount * delayPerItem + 50; // Minimal extra time
    
    // Clear previous animation state - hide all icons initially
    setAnimatingIconIndices(new Set());
    setVisibleIconIndices(new Set());
    
    // Sequentially highlight each item from last to first (bottom to top in grid)
    collection.items.forEach((_, index) => {
      const reverseIndex = itemCount - 1 - index; // Reverse order
      setTimeout(() => {
        setCollectingItemIndex(reverseIndex);
        // Add to animating set - will persist for full animation duration
        setAnimatingIconIndices(prev => new Set(Array.from(prev).concat(reverseIndex)));
        // Make icon visible (and keep it visible)
        setVisibleIconIndices(prev => new Set(Array.from(prev).concat(reverseIndex)));
        // Remove from animating set after icon animation completes (1s, no delay)
        setTimeout(() => {
          setAnimatingIconIndices(prev => {
            const next = new Set(prev);
            next.delete(reverseIndex);
            return next;
          });
        }, 1000);
      }, index * delayPerItem);
    });
    
    // Clear collecting effect and start phase 2 after all items highlighted
    setTimeout(() => {
      setCollectingItemIndex(null);
      
      // Phase 2: Progress bar animation from 0 to 100
      setRewardProgress(0);
      setTimeout(() => setRewardProgress(100), 20);
      
      // Phase 3: After progress bar fills (700ms transition), launch stars immediately
      setTimeout(() => {
        launchRewardStars(collection);
      }, 700);
    }, totalAnimationTime);
  };
  
  // Launch reward stars animation
  const launchRewardStars = (collection: Collection) => {
    if (!rewardIconRef.current || rewardGivenRef.current) return;
    
    rewardGivenRef.current = true;
    setRewardIconHidden(true);
    
    // Notify parent to add stars
    if (onCollectionRewarded) {
      onCollectionRewarded(collection.id, collection.reward);
    }
    
    // Get target position (progress bar star icon)
    let targetX = window.innerWidth / 2;
    let targetY = 50;
    
    if (progressBarRef?.current) {
      const starIcon = progressBarRef.current.querySelector('[data-star-icon]');
      if (starIcon) {
        const rect = starIcon.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }
    }
    
    // Get start position (center of reward icon)
    const iconRect = rewardIconRef.current.getBoundingClientRect();
    const centerX = iconRect.left + iconRect.width / 2;
    const centerY = iconRect.top + iconRect.height / 2;
    
    // Create stars with two-phase animation (with limit)
    const stars: FlyingStar[] = [];
    const totalStars = collection.reward;
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    expectedStarsRef.current = iconCount; // Track icon count, not star count
    starsArrivedCountRef.current = 0;
    
    // Scatter radius range
    const minRadius = 15;
    const maxRadius = 45;
    const scatterDuration = 500;
    
    for (let i = 0; i < iconCount; i++) {
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = centerX + Math.cos(angle) * radius;
      const scatterY = centerY + Math.sin(angle) * radius;
      
      // Calculate bezier control point
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
      
      stars.push({
        id: Date.now() + i,
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
        flyDelay: scatterDuration + i * 30,
        flyDuration,
      });
    }
    
    setFlyingStars(stars);
  };
  
  // Handle star arrival
  const handleStarArrival = (star: FlyingStar) => {
    setFlyingStars(prev => prev.filter(s => s.id !== star.id));
    starsArrivedCountRef.current++;
    
    if (onStarArrived) {
      onStarArrived(star.value);
    }
    
    // Check if all stars arrived
    if (starsArrivedCountRef.current >= expectedStarsRef.current) {
      // Check if this was grand prize animation
      if (grandPrizeAnimating) {
        setGrandPrizeAnimating(false);
        // Show trophy celebration screen instead of immediately completing
        setShowTrophyScreen(true);
        // Don't notify parent yet - will do after trophy flies
      } else {
        setShowRewardClaimed(true);
        // Clear the animating refs so next collection can animate
        currentAnimatingCollectionRef.current = null;
        rewardAnimationStartedRef.current = false;
        
        // Notify parent that reward animation is complete
        if (onRewardAnimationComplete && pendingRewardCollectionId) {
          onRewardAnimationComplete(pendingRewardCollectionId);
        }
        
        // Check if all collections are now complete and rewarded - trigger grand prize
        // Note: rewardedCollections may not include current collection yet (parent updates async)
        // So we check if all OTHER collections are rewarded, and current one just got rewarded
        const currentCollectionId = pendingRewardCollectionId || selectedCollection?.id;
        const allComplete = collections.every(c => c.items.every(i => i.collected));
        const allRewarded = collections.every(c => 
          c.id === currentCollectionId || (rewardedCollections && rewardedCollections.has(c.id))
        );
        
        if (allComplete && allRewarded && !allCollectionsRewarded && !grandPrizeGivenRef.current) {
          // Mark as pending to prevent useEffect from also triggering
          grandPrizePendingFromRewardRef.current = true;
          
          // Go back to main screen and trigger grand prize after a delay
          setTimeout(() => {
            setSelectedCollection(null);
            // Reset individual collection reward state
            setRewardIconHidden(false);
            setShowRewardClaimed(false);
            starsArrivedCountRef.current = 0;
            expectedStarsRef.current = 0;
            rewardGivenRef.current = false;
            
            // Hide all collections before starting grand prize animation
            setVisibleCollectionIndices(new Set());
            
            // Trigger grand prize animation with collection highlight effect
            setTimeout(() => {
              grandPrizePendingFromRewardRef.current = false;
              startGrandPrizeAnimation();
            }, 500);
          }, 1000);
        }
      }
    }
  };
  
  // Launch grand prize stars animation (100 stars) - STARS FIRST, then trophy screen
  const launchGrandPrizeStars = () => {
    if (!grandPrizeIconRef.current || grandPrizeGivenRef.current || allCollectionsRewarded) return;
    if (!petIconRef.current || !trophiesTabRef.current) return; // Need these for trophy flight
    
    grandPrizeGivenRef.current = true;
    setGrandPrizeAnimating(true);
    
    // IMPORTANT: Capture trophy flight coordinates BEFORE any state changes that might remove elements
    const petRect = petIconRef.current.getBoundingClientRect();
    const trophyTabRect = trophiesTabRef.current.getBoundingClientRect();
    trophyFlightDataRef.current = {
      icon: petIcon,
      startX: window.innerWidth / 2, // Will fly from center of trophy screen
      startY: window.innerHeight / 2,
      targetX: trophyTabRect.left + trophyTabRect.width / 2,
      targetY: trophyTabRect.top + trophyTabRect.height / 2,
    };
    
    // Hide pet icon immediately (stars flying away)
    setPetIconHidden(true);
    setGrandPrizeIconHidden(true);
    
    // Create and save trophy for this season (but don't fly it yet)
    const newTrophy: Trophy = {
      id: `trophy-${Date.now()}`,
      seasonName,
      petName,
      petIcon,
      description: `Собраны все коллекции в помощь ${petName}. Спасибо за участие в благотворительном сборе!`,
      earnedAt: new Date().toISOString()
    };
    saveTrophy(newTrophy);
    setTrophies(prev => [...prev, newTrophy]);
    
    const GRAND_PRIZE_REWARD = 100;
    
    // DON'T notify parent yet - will do it after all stars arrive
    // This prevents allCollectionsRewarded from hiding icons prematurely
    pendingGrandPrizeRewardRef.current = GRAND_PRIZE_REWARD;
    
    // Get target position (progress bar star icon)
    let targetX = window.innerWidth / 2;
    let targetY = 50;
    
    if (progressBarRef?.current) {
      const starIcon = progressBarRef.current.querySelector('[data-star-icon]');
      if (starIcon) {
        const rect = starIcon.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }
    }
    
    // Get start position (center of grand prize icon)
    const iconRect = grandPrizeIconRef.current.getBoundingClientRect();
    const centerX = iconRect.left + iconRect.width / 2;
    const centerY = iconRect.top + iconRect.height / 2;
    
    // Create stars with two-phase animation (with limit)
    const stars: FlyingStar[] = [];
    const totalStars = GRAND_PRIZE_REWARD;
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    expectedStarsRef.current = iconCount; // Track icon count, not star count
    starsArrivedCountRef.current = 0;
    
    // Scatter radius range - bigger for grand prize
    const minRadius = 20;
    const maxRadius = 60;
    const scatterDuration = 500;
    
    for (let i = 0; i < iconCount; i++) {
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = centerX + Math.cos(angle) * radius;
      const scatterY = centerY + Math.sin(angle) * radius;
      
      // Calculate bezier control point
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
      
      const flyDuration = 300 + Math.random() * 100;
      
      stars.push({
        id: Date.now() + i,
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
        flyDelay: scatterDuration + i * 30, // Slightly slower for better visibility
        flyDuration,
      });
    }
    
    // Launch stars immediately (trophy will fly after all stars arrive)
    setFlyingStars(stars);
  };
  
  // Handle trophy screen click - launch trophy to trophies tab
  const handleTrophyScreenClick = () => {
    if (!trophyFlightDataRef.current) {
      console.warn('Trophy flight data not available');
      setShowTrophyScreen(false);
      return;
    }
    
    setShowTrophyScreen(false);
    
    // Use saved target position (captured before overlay appeared)
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2 - 50; // Slightly above center where trophy is shown
    const targetX = trophyFlightDataRef.current.targetX;
    const targetY = trophyFlightDataRef.current.targetY;
    
    // Calculate scatter position (upward)
    const scatterAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const scatterRadius = 60 + Math.random() * 30;
    const scatterX = startX + Math.cos(scatterAngle) * scatterRadius;
    const scatterY = startY + Math.sin(scatterAngle) * scatterRadius;
    
    // Calculate bezier control point
    const midX = (scatterX + targetX) / 2;
    const midY = (scatterY + targetY) / 2;
    const dx = targetX - scatterX;
    const dy = targetY - scatterY;
    const perpX = -dy;
    const perpY = dx;
    const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
    const curvature = 30 + Math.random() * 20;
    const controlX = midX + (perpX / len) * curvature;
    const controlY = midY + (perpY / len) * curvature;
    
    setFlyingTrophy({
      icon: petIcon,
      startX,
      startY,
      targetX,
      targetY,
      scatterX,
      scatterY,
      controlX,
      controlY,
      scatterDuration: 400,
      flyDelay: 500,
      flyDuration: 400,
    });
  };
  
  // Handle flying trophy arrival - complete grand prize
  const handleTrophyArrival = () => {
    setFlyingTrophy(null);
    setHasNewTrophy(true);
    setTrophyAnimationShown(false); // Reset so animation plays for new trophy
    setShowGrandPrizeClaimed(true);
    
    // NOW notify parent that grand prize is complete
    if (pendingGrandPrizeRewardRef.current !== null && onAllCollectionsRewarded) {
      onAllCollectionsRewarded(pendingGrandPrizeRewardRef.current);
      pendingGrandPrizeRewardRef.current = null;
      pendingGrandPrizeStarsRef.current = null;
    }
  };
  
  // Handle closing detail view - always go back to main collections screen
  const handleCloseDetailView = () => {
    const rewardedCollectionId = selectedCollection?.id;
    const wasRewarded = showRewardClaimed && rewardedCollectionId;
    
    setSelectedCollection(null);
    // Reset visible indices to prevent flash when next reward collection opens
    setVisibleIconIndices(new Set());
    
    // If reward was claimed, accumulate for later animation
    // Skip only if ALL collections are complete AND ALL are rewarded (grand prize next)
    if (wasRewarded && rewardedCollectionId) {
      const allComplete = collections.every(c => c.items.every(i => i.collected));
      // Check if all collections will be rewarded after this one
      // (current one is being rewarded + all others already rewarded)
      const allWillBeRewarded = allComplete && collections.every(c => 
        c.id === rewardedCollectionId || (rewardedCollections && rewardedCollections.has(c.id))
      );
      
      // Add to animation queue unless grand prize is next
      if (!allWillBeRewarded) {
        // Accumulate rewarded collection for animation (persists across window reopens)
        if (!pendingChipAnimationsRef.current.includes(rewardedCollectionId)) {
          pendingChipAnimationsRef.current.push(rewardedCollectionId);
          // Trigger useEffect to start animations
          setPendingChipAnimationsTrigger(prev => prev + 1);
        }
      }
    }
  };
  
  // Handle selecting a collection - also marks it as viewed and triggers item pulse
  const handleSelectCollection = (collection: Collection) => {
    // Find new items in this collection to pulse them
    const newItemsInThisCollection = collection.items
      .filter(item => newItemIds?.has(item.id))
      .map(item => item.id);
    
    if (newItemsInThisCollection.length > 0) {
      setPulsingItems(new Set(newItemsInThisCollection));
      // Stop pulsing after animation (2 pulses * 0.5s = 1s)
      setTimeout(() => setPulsingItems(new Set()), 1000);
    }
    
    setSelectedCollection(collection);
    // Mark this collection as viewed (removes the ! indicator)
    if (onCollectionViewed && newItemsInCollections?.has(collection.id)) {
      onCollectionViewed(collection.id);
    }
  };
  
  // Reset state when closing
  useEffect(() => {
    if (!isVisible) {
      setSelectedCollection(null);
      setSelectedTrophy(null);
      setActiveTab('collections');
      // Reset visible indices to prevent flash on next open
      setVisibleIconIndices(new Set());
      setVisibleCollectionIndices(new Set());
      setFlyingStars([]);
      setRewardIconHidden(false);
      setShowRewardClaimed(false);
      setShowTrophyScreen(false); // Reset trophy screen
      starsArrivedCountRef.current = 0;
      expectedStarsRef.current = 0;
      rewardGivenRef.current = false;
      rewardAnimationStartedRef.current = false;
      currentAnimatingCollectionRef.current = null;
      // Reset collecting animation state
      setCollectingItemIndex(null);
      setCollectingCollectionIndex(null);
      setAnimatingIconIndices(new Set());
      setAnimatingCollectionIndices(new Set());
      setVisibleIconIndices(new Set());
      setVisibleCollectionIndices(new Set());
      // Reset grand prize state
      setGrandPrizeAnimating(false);
      setGrandPrizeIconHidden(false);
      setShowGrandPrizeClaimed(false);
      setIsGrandPrizeProgressAnimating(false);
      grandPrizeGivenRef.current = false;
      grandPrizePendingFromRewardRef.current = false;
      // Reset flying trophy
      setFlyingTrophy(null);
      setPetIconHidden(false);
      // Reset chip animation state
      setFlyingChips([]);
      setChipAnimationQueue([]);
      chipAnimationQueueRef.current = [];
      pendingChipAnimationsRef.current = [];
      isAnimatingChipsRef.current = false;
      setTotalProgressOvershoot(0);
      setTotalProgressPulse(false);
      setGrandPrizePulsePhase('none');
      setPendingCompleteAnimation(new Set());
      setShowCompleteLabel(new Set());
      setPulsingIcons(new Set());
      // Note: don't reset hasNewTrophy - keep it until user views trophies tab
    }
  }, [isVisible]);
  
  // Initialize animated progress - only animate collections with new items
  useEffect(() => {
    // Only trigger animation when transitioning from hidden to visible
    if (isVisible && !prevVisibleRef.current) {
      hasAnimatedRef.current = false;
      
      // Calculate actual progress for all collections
      const actualProgress: Record<string, number> = {};
      collections.forEach(c => {
        const collected = c.items.filter(i => i.collected).length;
        actualProgress[c.id] = (collected / c.items.length) * 100;
      });
      
      // Check which collections have new items
      const collectionsWithNewItems = newItemsInCollections && newItemsInCollections.size > 0 
        ? newItemsInCollections 
        : new Set<string>();
      
      if (collectionsWithNewItems.size > 0) {
        // Start collections WITH new items at 0, others at actual progress
        const initialProgress: Record<string, number> = {};
        collections.forEach(c => {
          if (collectionsWithNewItems.has(c.id)) {
            initialProgress[c.id] = 0; // Will animate
          } else {
            initialProgress[c.id] = actualProgress[c.id]; // Show immediately
          }
        });
        setAnimatedProgress(initialProgress);
        
        // After a brief delay, animate to actual progress
        const timer = setTimeout(() => {
          if (hasAnimatedRef.current) return;
          hasAnimatedRef.current = true;
          setAnimatedProgress(actualProgress);
        }, 100);
        
        prevVisibleRef.current = true;
        return () => clearTimeout(timer);
      } else {
        // No new items - show actual progress immediately without animation
        setAnimatedProgress(actualProgress);
        prevVisibleRef.current = true;
      }
    }
    
    if (!isVisible) {
      prevVisibleRef.current = false;
    }
  }, [isVisible, collections, newItemsInCollections]);
  
  // Keep ref in sync with state
  useEffect(() => {
    chipAnimationQueueRef.current = chipAnimationQueue;
  }, [chipAnimationQueue]);
  
  // When all rewards are claimed (pendingRewardCollectionId becomes null), start animations
  useEffect(() => {
    if (!isVisible || activeTab !== 'collections') return;
    if (pendingRewardCollectionId) return; // Still showing reward screens
    if (pendingChipAnimationsRef.current.length === 0) return; // No animations pending
    if (isAnimatingChipsRef.current) return; // Already animating
    
    // IMMEDIATELY set displayed count to prevent visual glitch
    const actualCompleted = collections.filter(c => c.items.every(i => i.collected)).length;
    const pendingCount = pendingChipAnimationsRef.current.length;
    setDisplayedCompletedCount(Math.max(0, actualCompleted - pendingCount));
    
    // Small delay to ensure we're on main screen
    const timer = setTimeout(() => {
      if (pendingChipAnimationsRef.current.length === 0) return;
      
      // Move pending animations to queue and start
      const animationsToRun = [...pendingChipAnimationsRef.current];
      pendingChipAnimationsRef.current = [];
      
      // Mark all as pending complete animation
      animationsToRun.forEach(id => {
        setPendingCompleteAnimation(prev => new Set(prev).add(id));
      });
      
      // Start animation queue
      setChipAnimationQueue(animationsToRun);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isVisible, activeTab, pendingRewardCollectionId, pendingChipAnimationsTrigger, collections]);
  
  // Process chip animation queue - launch chips one by one with delay
  useEffect(() => {
    if (chipAnimationQueue.length === 0 || isAnimatingChipsRef.current) return;
    if (activeTab !== 'collections') return;
    
    isAnimatingChipsRef.current = true;
    
    const processQueue = (index: number) => {
      // Use ref to get current queue (handles items added during animation)
      const currentQueue = chipAnimationQueueRef.current;
      
      if (index >= currentQueue.length) {
        isAnimatingChipsRef.current = false;
        setChipAnimationQueue([]);
        // Reset displayed count to show real value
        setDisplayedCompletedCount(null);
        
        // After all chips animated, pulse grand prize (trophy then stars) - quick "pum-pum"
        // Wait 500ms to let progress bar animation settle
        setTimeout(() => {
          setGrandPrizePulsePhase('trophy');
          setTimeout(() => {
            setGrandPrizePulsePhase('none');
            setTimeout(() => {
              setGrandPrizePulsePhase('stars');
              setTimeout(() => {
                setGrandPrizePulsePhase('none');
              }, 150);
            }, 50);
          }, 150);
        }, 500);
        return;
      }
      
      const collectionId = currentQueue[index];
      
      // Step 1: Animate progress bar from current to 100% (no text shown during animation)
      setRewardProgressAnimation(prev => ({ ...prev, [collectionId]: 0 }));
      
      // Animate progress bar over 400ms
      const progressDuration = 400;
      const progressSteps = 20;
      const stepDuration = progressDuration / progressSteps;
      let currentStep = 0;
      
      const progressInterval = setInterval(() => {
        currentStep++;
        const progress = Math.min((currentStep / progressSteps) * 100, 100);
        setRewardProgressAnimation(prev => ({ ...prev, [collectionId]: progress }));
        
        if (currentStep >= progressSteps) {
          clearInterval(progressInterval);
          
          // Step 2: When progress bar reaches 100% - simultaneously:
          // - Change background color
          // - Show "Собрано" label
          // - Launch chip
          setPendingCompleteAnimation(prev => {
            const newSet = new Set(prev);
            newSet.delete(collectionId);
            return newSet;
          });
          setShowCompleteLabel(prev => new Set(prev).add(collectionId));
          
          // Clear progress animation to show label
          setRewardProgressAnimation(prev => {
            const newState = { ...prev };
            delete newState[collectionId];
            return newState;
          });
          
          // Launch chip immediately
          launchChipToTotalProgress(collectionId);
          
          // Process next item after chip animation completes (~1 second)
          setTimeout(() => {
            processQueue(index + 1);
          }, 1000);
        }
      }, stepDuration);
    };
    
    // Start processing after a small delay to ensure DOM is ready
    setTimeout(() => processQueue(0), 200);
  }, [chipAnimationQueue, activeTab]);
  
  // Launch chip from collection to total progress bar
  const launchChipToTotalProgress = (collectionId: string) => {
    if (!totalProgressBarRef.current) return;
    
    const totalBarRect = totalProgressBarRef.current.getBoundingClientRect();
    const targetY = totalBarRect.top + totalBarRect.height / 2;
    
    // Get start position from collection card icon (center-top area where icon is)
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;
    
    const collectionCard = collectionCardRefs.current[collectionId];
    if (collectionCard) {
      const rect = collectionCard.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      // Start from icon position (upper part of card, roughly 30% from top)
      startY = rect.top + rect.height * 0.3;
    }
    
    const chip: CollectionFlyingChip = {
      id: Date.now(),
      collectionId,
      startX,
      startY,
      targetY,
      velocityX: -1 + Math.random() * 2,
      velocityY: -5 - Math.random() * 2
    };
    
    setFlyingChips(prev => [...prev, chip]);
  };
  
  // Handle chip arrival at total progress bar
  const handleChipArrived = (chip: CollectionFlyingChip) => {
    setFlyingChips(prev => prev.filter(c => c.id !== chip.id));
    
    // Increment displayed completed count
    setDisplayedCompletedCount(prev => prev !== null ? prev + 1 : null);
    
    // Trigger overshoot and pulse on total progress bar
    setTotalProgressOvershoot(8);
    setTotalProgressPulse(true);
    
    setTimeout(() => setTotalProgressOvershoot(0), 300);
    setTimeout(() => setTotalProgressPulse(false), 400);
  };
  
  if (!isVisible) return null;
  
  // Count completed collections
  const completedCollections = collections.filter(c => c.items.every(i => i.collected)).length;
  const allCollectionsComplete = completedCollections === collections.length;
  
  // Calculate total progress based on completed collections (not items)
  const totalProgress = collections.length > 0 ? (completedCollections / collections.length) * 100 : 0;
  
  // Calculate collection progress
  const getCollectionProgress = (collection: Collection) => {
    const collected = collection.items.filter(i => i.collected).length;
    return { collected, total: collection.items.length, percent: (collected / collection.items.length) * 100 };
  };
  
  const isCollectionComplete = (collection: Collection) => collection.items.every(i => i.collected);
  
  // Check if collection has new items
  const hasNewItems = (collectionId: string) => newItemsInCollections?.has(collectionId) ?? false;
  
  // Render collection detail view
  if (selectedCollection) {
    const progress = getCollectionProgress(selectedCollection);
    const isComplete = isCollectionComplete(selectedCollection);
    
    return ReactDOM.createPortal(
      <div 
        className="fixed inset-0 z-[9997] flex items-center justify-center"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          paddingTop: '50px',
          paddingBottom: '55px',
          paddingLeft: '16px',
          paddingRight: '16px'
        }}
        onClick={handleCloseDetailView}
      >
        <div 
          className="bg-gradient-to-b from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-2xl max-w-md w-full border border-indigo-500/30"
          onClick={e => e.stopPropagation()}
        >
          {/* Header with title */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={handleCloseDetailView}
              className="text-white/60 hover:text-white text-base"
            >
              ← Назад
            </button>
            <div 
              key={selectedCollection.id}
              className="flex items-center gap-2"
              style={{
                animation: 'collection-header-appear 0.3s ease-out forwards'
              }}
            >
              <span className="text-3xl">{selectedCollection.icon}</span>
              <h3 className="text-lg font-bold">{selectedCollection.name}</h3>
            </div>
            <button 
              onClick={handleCloseDetailView}
              className="text-white/60 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          
          {/* Progress + Reward */}
          <div className={`flex items-center justify-between rounded-xl px-3 py-2 mb-3 ${isComplete ? 'bg-green-900/30 border border-green-500/30' : 'bg-black/30'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">{progress.collected}/{progress.total}</span>
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    width: pendingRewardCollectionId === selectedCollection.id 
                      ? `${rewardProgress}%` 
                      : `${progress.percent}%`,
                    background: isComplete 
                      ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
                      : 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)'
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/50">Награда:</span>
              {/* Show reward if not yet claimed, hide during animation or after claimed */}
              {!(rewardedCollections?.has(selectedCollection.id) || showRewardClaimed) ? (
                <div 
                  ref={rewardIconRef}
                  className="text-base font-bold text-yellow-400"
                  style={{ visibility: rewardIconHidden && pendingRewardCollectionId === selectedCollection.id ? 'hidden' : 'visible' }}
                >
                  +{selectedCollection.reward} ⭐
                </div>
              ) : (
                <span className="text-green-400 text-xs font-semibold">✓ Получено</span>
              )}
            </div>
          </div>
          
          {/* Items Grid */}
          <div className="grid grid-cols-3 gap-3">
            {selectedCollection.items.map((item, index) => {
              const isPulsing = pulsingItems.has(item.id);
              const isCollecting = collectingItemIndex === index;
              // Hide icons if this collection is pending reward and icon not yet revealed by animation
              const isPendingReward = pendingRewardCollectionId === selectedCollection.id;
              const isIconVisible = isPendingReward ? visibleIconIndices.has(index) : true;
              return (
                <div 
                  key={item.id}
                  className={`rounded-xl p-3 text-center ${
                    item.collected 
                      ? 'bg-indigo-600/30 border border-indigo-400/40' 
                      : 'bg-slate-700/30 border border-slate-600/30'
                  } ${isPulsing ? 'animate-new-item-pulse' : ''}`}
                  style={{
                    // Hidden until animation starts, animation handles opacity
                    ...(!isIconVisible && !isCollecting ? { opacity: 0 } : {}),
                    ...(isPulsing ? { 
                      animation: 'new-item-pulse 0.5s ease-in-out 1 forwards'
                    } : {}),
                    ...(isCollecting ? {
                      animation: 'collection-item-pop 0.5s ease-out forwards',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.8)',
                      borderColor: 'rgba(139, 92, 246, 0.8)',
                      zIndex: 10
                    } : {})
                  }}
                >
                  <div 
                    className={`text-3xl mb-1 ${!item.collected && 'opacity-40'}`}
                    style={animatingIconIndices.has(index) ? {
                      animation: 'collection-icon-pop 1s ease-out 0s forwards'
                    } : undefined}
                  >
                    {item.collected ? item.icon : '❓'}
                  </div>
                  <div className={`text-xs leading-tight ${item.collected ? 'text-white/80' : 'text-white/40'}`}>
                    {item.name}
                  </div>
                  {item.collected && (
                    <div className="text-green-400 text-xs mt-1">✓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Flying stars for collection detail view */}
        {flyingStars.map(star => (
          <CollectionFlyingStar
            key={star.id}
            star={star}
            onArrived={() => handleStarArrival(star)}
          />
        ))}
      </div>,
      document.body
    );
  }
  
  // Render trophy detail view
  if (selectedTrophy) {
    return ReactDOM.createPortal(
      <div 
        className="fixed inset-0 z-[9997] flex items-center justify-center"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          paddingTop: '50px',
          paddingBottom: '55px',
          paddingLeft: '16px',
          paddingRight: '16px'
        }}
        onClick={() => setSelectedTrophy(null)}
      >
        <div 
          className="bg-gradient-to-b from-amber-900 to-slate-900 text-white p-5 rounded-2xl shadow-2xl max-w-sm w-full border border-amber-500/30"
          style={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setSelectedTrophy(null)}
              className="text-white/60 hover:text-white text-xl"
            >
              ← Назад
            </button>
            <button 
              onClick={() => setSelectedTrophy(null)}
              className="text-white/60 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          
          {/* Trophy Display */}
          <div className="text-center">
            <div className="relative inline-block mb-4">
              {/* Trophy shelf */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border-4 border-amber-300">
                <span className="text-6xl">{selectedTrophy.petIcon}</span>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl -z-10" />
            </div>
            
            <h3 className="text-xl font-bold text-amber-300 mb-1">{selectedTrophy.seasonName}</h3>
            <div className="text-lg text-white mb-4">{selectedTrophy.petName}</div>
            
            <div className="bg-black/30 rounded-xl p-4 text-left">
              <p className="text-white/80 text-sm leading-relaxed">
                {selectedTrophy.description}
              </p>
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50">
                Получено: {new Date(selectedTrophy.earnedAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setSelectedTrophy(null)}
            className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-semibold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>,
      document.body
    );
  }
  
  // Render main view with tabs
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[9997] flex items-center justify-center"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingTop: '50px',
        paddingBottom: '55px',
        paddingLeft: '16px',
        paddingRight: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-b from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-2xl max-w-md w-full border border-indigo-500/30"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Tabs */}
        <div className="flex items-center gap-2 mb-3">
          {/* Debug button */}
          {onDebugCompleteAll && (
            <button 
              onClick={onDebugCompleteAll}
              className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-purple-500/30 hover:bg-purple-500/50 transition-colors border border-purple-400/50"
              title="Debug: собрать все коллекции"
            >
              <span className="text-xs">⚡</span>
            </button>
          )}
          {!onDebugCompleteAll && <div className="w-6" />}
          
          {/* Tabs */}
          <div className="flex gap-1.5 flex-1">
            <button
              onClick={() => setActiveTab('collections')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'collections'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700/50 text-white/60 hover:text-white hover:bg-slate-700'
              }`}
            >
              📦 Коллекции
            </button>
            <button
              ref={trophiesTabRef}
              onClick={() => {
                setActiveTab('trophies');
                setHasNewTrophy(false);
                // Mark animation as shown after a delay (to let it play first time)
                setTimeout(() => setTrophyAnimationShown(true), 600);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold transition-all relative ${
                activeTab === 'trophies'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700/50 text-white/60 hover:text-white hover:bg-slate-700'
              }`}
            >
              🏆 Трофеи
              {hasNewTrophy && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pulse">
                  !
                </span>
              )}
            </button>
          </div>
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="w-6 h-6 flex-shrink-0 text-white/60 hover:text-white text-xl leading-none flex items-center justify-center"
          >
            ×
          </button>
        </div>
        
        {/* Tab Content Container - Fixed height for both tabs */}
        <div style={{ height: '420px' }}>
          {/* Collections Tab Content */}
          {activeTab === 'collections' && (
            <div className="h-full flex flex-col">
            {/* Total Progress - Static */}
            {(() => {
              // Use delayed count during chip animation, otherwise use actual count
              const displayCount = displayedCompletedCount !== null ? displayedCompletedCount : completedCollections;
              const displayProgress = collections.length > 0 ? (displayCount / collections.length) * 100 : 0;
              const isFullyComplete = displayCount === collections.length;
              
              return (
            <div className={`bg-black/30 rounded-xl p-3 mb-3 flex-shrink-0 transition-all duration-300 ${totalProgressPulse ? 'scale-[1.02]' : ''}`}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/70">Общий прогресс</span>
                <span className={`font-semibold transition-all duration-200 ${totalProgressPulse ? 'scale-110 text-amber-300' : 'text-white'}`}>
                  {displayCount} / {collections.length} коллекций
                </span>
              </div>
              <div ref={totalProgressBarRef} className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{ 
                    width: isGrandPrizeProgressAnimating 
                      ? `${grandPrizeProgress}%` 
                      : `${Math.min(displayProgress + totalProgressOvershoot, 100)}%`,
                    background: isFullyComplete 
                      ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
                      : 'linear-gradient(90deg, #f59e0b 0%, #eab308 100%)'
                  }}
                />
              </div>
              
              {/* Grand Prize */}
              <div className={`rounded-xl p-2 text-center ${isFullyComplete ? 'bg-green-900/30 border border-green-500/30' : 'bg-slate-800/50'}`} style={{ minHeight: '55px' }}>
                <div className="text-xs text-white/70 mb-1">Приз за все коллекции</div>
                {!(allCollectionsRewarded || (showGrandPrizeClaimed && petIconHidden)) ? (
                  <div className="flex items-center justify-center gap-3">
                    <div 
                      className={`text-center transition-all duration-150 ${grandPrizePulsePhase === 'trophy' ? 'scale-125' : ''}`}
                      style={{ 
                        visibility: petIconHidden ? 'hidden' : 'visible',
                        filter: grandPrizePulsePhase === 'trophy' ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))' : 'none'
                      }}
                    >
                      <div ref={petIconRef} className="text-2xl">{petIcon}</div>
                    </div>
                    <div className="text-base text-white/30" style={{ visibility: grandPrizeIconHidden ? 'hidden' : 'visible' }}>+</div>
                    <div 
                      ref={grandPrizeIconRef}
                      className={`text-center transition-all duration-150 ${grandPrizePulsePhase === 'stars' ? 'scale-125' : ''}`}
                      style={{ 
                        visibility: grandPrizeIconHidden ? 'hidden' : 'visible',
                        filter: grandPrizePulsePhase === 'stars' ? 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.8))' : 'none'
                      }}
                    >
                      <div className="text-base font-bold text-yellow-400">100 ⭐</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-green-400 text-sm font-semibold flex items-center justify-center" style={{ height: '32px' }}>✓ Награда получена!</div>
                )}
              </div>
            </div>
              );
            })()}
            
            {/* Collections Grid */}
            {(() => {
              // Pre-compute these ONCE outside the map for performance
              const allCollsComplete = collections.every(c => c.items.every(i => i.collected));
              const allCollsRewarded = rewardedCollections && collections.every(c => rewardedCollections.has(c.id));
              const isPendingGrandPrize = allCollsComplete && allCollsRewarded && !allCollectionsRewarded;
              const isGrandPrizeMode = grandPrizeAnimating || (collectingCollectionIndex !== null) || isPendingGrandPrize;
              
              return (
            <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1">
              {collections.map((collection, index) => {
                const progress = getCollectionProgress(collection);
                const isComplete = isCollectionComplete(collection);
                const displayProgress = animatedProgress[collection.id] ?? 0;
                const hasNew = hasNewItems(collection.id);
                const isCollecting = collectingCollectionIndex === index;
                const isCollectionVisible = !isGrandPrizeMode || visibleCollectionIndices.has(index);
                const overshoot = mainProgressOvershoot[collection.id] ?? 0;
                
                // Check if reward progress animation is active
                const rewardProgress = rewardProgressAnimation[collection.id];
                const isRewardAnimating = rewardProgress !== undefined;
                
                // Hide "complete" state if animation is pending
                const showAsComplete = isComplete && !pendingCompleteAnimation.has(collection.id);
                const showLabel = showAsComplete && (showCompleteLabel.has(collection.id) || !chipAnimationQueue.includes(collection.id));
                
                // Show progress bar during reward animation even if complete
                const showProgressBar = !showAsComplete || isRewardAnimating;
                
                return (
                  <button
                    key={collection.id}
                    ref={el => collectionCardRefs.current[collection.id] = el}
                    onClick={() => handleSelectCollection(collection)}
                    className={`relative rounded-xl p-2 text-center hover:brightness-110 transition-all duration-300 ${
                      showAsComplete 
                        ? 'bg-green-900/30 border border-green-500/40' 
                        : 'bg-slate-700/50 border border-slate-600/30 hover:border-indigo-400/50'
                    }`}
                    style={{
                      // Hidden until animation starts, animation handles opacity
                      ...(!isCollectionVisible && !isCollecting ? { opacity: 0 } : {}),
                      ...(isCollecting ? {
                        animation: 'collection-item-pop 0.5s ease-out forwards',
                        boxShadow: '0 0 20px rgba(250, 204, 21, 0.8)',
                        borderColor: 'rgba(250, 204, 21, 0.8)',
                        zIndex: 10
                      } : {})
                    }}
                  >
                    {/* New items indicator */}
                    {hasNew && !isComplete && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pulse">
                        !
                      </span>
                    )}
                    
                    <div 
                      className="text-2xl mb-1"
                      style={animatingCollectionIndices.has(index) ? {
                        animation: 'collection-icon-pop 1s ease-out 0s forwards'
                      } : undefined}
                    >
                      {collection.icon}
                    </div>
                    <div className="text-[10px] text-white/80 truncate">{collection.name}</div>
                    
                    {/* Fixed height container for progress/complete label to prevent layout shift */}
                    <div className="h-[24px] flex flex-col justify-center">
                      {showAsComplete && showLabel && !isRewardAnimating ? (
                        <div 
                          className="text-green-400 text-[10px] font-semibold"
                        >
                          ✓ Собрано
                        </div>
                      ) : showProgressBar ? (
                        <>
                          <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full rounded-full bg-gradient-to-r ${isRewardAnimating ? 'from-green-500 to-emerald-500' : 'from-indigo-500 to-purple-500'} transition-all duration-100 ease-out`}
                              style={{ width: `${isRewardAnimating ? rewardProgress : Math.min(displayProgress + overshoot, 100)}%` }}
                            />
                          </div>
                          {/* Hide text during reward animation */}
                          {!isRewardAnimating && (
                            <div className="text-[10px] mt-0.5 text-white/50">
                              {progress.collected}/{progress.total}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="h-full" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
              );
            })()}
            </div>
        )}
        
        {/* Trophies Tab Content */}
        {activeTab === 'trophies' && (
          <div className="h-full flex flex-col">
            {/* Trophy Info - Static */}
            <div className="bg-black/30 rounded-xl p-3 mb-3 flex-shrink-0">
              <div className="text-center text-xs text-white/70">
                🏆 Собирай все коллекции сезона, чтобы получить трофей!
                <br />
                <span className="text-white/50 text-[10px]">Каждый сезон — новый питомец и новый трофей</span>
              </div>
            </div>
            
            {/* Trophy Grid - 9 slots */}
            <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1">
              {Array.from({ length: 9 }).map((_, index) => {
                const trophy = trophies[index];
                
                if (trophy) {
                  // Filled trophy slot
                  return (
                    <button
                      key={trophy.id}
                      onClick={() => setSelectedTrophy(trophy)}
                      className="relative rounded-lg p-2 text-center transition-all hover:brightness-110 bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-500/40"
                      style={!trophyAnimationShown ? { animation: `trophy-appear 0.5s ease-out ${index * 0.05}s both` } : undefined}
                    >
                      {/* Trophy circle */}
                      <div className="w-10 h-10 mx-auto mb-1 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border-2 border-amber-300">
                        <span className="text-xl drop-shadow-lg">{trophy.petIcon}</span>
                      </div>
                      <div className="text-[10px] text-amber-300 mb-0.5 truncate">{trophy.seasonName}</div>
                      <div className="text-amber-400 text-[10px] font-semibold">✓ Получено</div>
                    </button>
                  );
                } else {
                  // Empty trophy slot placeholder
                  return (
                    <div
                      key={`empty-${index}`}
                      className="relative rounded-lg p-2 text-center bg-slate-800/30 border border-slate-700/30 border-dashed"
                    >
                      {/* Empty circle placeholder */}
                      <div className="w-10 h-10 mx-auto mb-1 rounded-full bg-slate-700/30 flex items-center justify-center border-2 border-slate-600/30 border-dashed">
                        <span className="text-xl opacity-20">🏆</span>
                      </div>
                      <div className="text-[10px] text-white/30 mb-0.5">Сезон {index + 1}</div>
                      <div className="text-white/20 text-[10px]">Скоро...</div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Flying stars for rewards */}
      {flyingStars.map(star => (
        <CollectionFlyingStar
          key={star.id}
          star={star}
          onArrived={() => handleStarArrival(star)}
        />
      ))}
      
      {/* Flying chips for collection completion */}
      {flyingChips.map(chip => (
        <CollectionChip
          key={chip.id}
          chip={chip}
          onArrived={() => handleChipArrived(chip)}
        />
      ))}
      
      {/* Trophy celebration screen - shows after stars, before trophy flies */}
      {showTrophyScreen && (
        <div 
          className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[10000] cursor-pointer"
          onClick={(e) => {
            e.stopPropagation(); // Prevent closing the modal
            handleTrophyScreenClick();
          }}
        >
          <div 
            className="text-9xl mb-6 animate-bounce"
            style={{ 
              filter: 'drop-shadow(0 0 30px rgba(250, 204, 21, 0.8))',
              animation: 'trophy-glow 2s ease-in-out infinite'
            }}
          >
            {petIcon}
          </div>
          <h2 className="text-3xl font-bold text-yellow-400 mb-4 text-center px-8">
            🎉 Ура! 🎉
          </h2>
          <p className="text-xl text-white text-center px-8 mb-8 max-w-md">
            Ты собрал все коллекции и внёс большой вклад в помощь {petName}!
          </p>
          <p className="text-white/60 text-sm animate-pulse">
            Нажми, чтобы продолжить
          </p>
        </div>
      )}
      
      {/* Flying trophy animation */}
      {flyingTrophy && (
        <FlyingTrophy
          icon={flyingTrophy.icon}
          startX={flyingTrophy.startX}
          startY={flyingTrophy.startY}
          scatterX={flyingTrophy.scatterX}
          scatterY={flyingTrophy.scatterY}
          targetX={flyingTrophy.targetX}
          targetY={flyingTrophy.targetY}
          controlX={flyingTrophy.controlX}
          controlY={flyingTrophy.controlY}
          scatterDuration={flyingTrophy.scatterDuration}
          flyDelay={flyingTrophy.flyDelay}
          flyDuration={flyingTrophy.flyDuration}
          onArrived={handleTrophyArrival}
        />
      )}
    </div>,
    document.body
  );
}

// Quadratic bezier interpolation
function quadraticBezier(t: number, p0: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

// Easing function for scatter phase - fast start, slow end (deceleration)
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Easing function for fly phase - slow start, fast end (acceleration)
function easeInQuad(t: number): number {
  return t * t;
}

// Flying star component for collection rewards - two-phase animation
function CollectionFlyingStar({ star, onArrived }: { star: FlyingStar; onArrived: () => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const arrivedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const flyDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onArrivedRef = useRef(onArrived);
  
  // Keep callback ref updated
  onArrivedRef.current = onArrived;
  
  useEffect(() => {
    // Start immediately - show and begin scatter phase
    setIsVisible(true);
    
    const animateScatter = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animateScatter);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / star.scatterDuration, 1);
      const easedProgress = easeOutCubic(progress); // Deceleration
      
      // Linear interpolation from start to scatter position
      const x = star.startX + (star.scatterX - star.startX) * easedProgress;
      const y = star.startY + (star.scatterY - star.startY) * easedProgress;
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateScatter);
      } else {
        // Scatter complete - wait for fly delay
        flyDelayTimerRef.current = setTimeout(() => {
          startTimeRef.current = null;
          rafRef.current = requestAnimationFrame(animateFly);
        }, star.flyDelay - star.scatterDuration);
      }
    };
    
    const animateFly = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animateFly);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / star.flyDuration, 1);
      const easedProgress = easeInQuad(progress); // Acceleration
      
      // Bezier curve from scatter position to target
      const x = quadraticBezier(easedProgress, star.scatterX, star.controlX, star.targetX);
      const y = quadraticBezier(easedProgress, star.scatterY, star.controlY, star.targetY);
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateFly);
      } else {
        // Fly complete - hide instantly and notify
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          elementRef.current.style.display = 'none';
          onArrivedRef.current();
          setIsVisible(false);
        }
      }
    };
    
    // Start scatter animation
    rafRef.current = requestAnimationFrame(animateScatter);
    
    return () => {
      if (flyDelayTimerRef.current) {
        clearTimeout(flyDelayTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [star]);
  
  if (!isVisible) return null;
  
  return (
    <div
      ref={elementRef}
      className="fixed text-2xl pointer-events-none z-[10000]"
      style={{
        left: star.startX,
        top: star.startY,
        transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))'
      }}
    >
      ⭐
    </div>
  );
}

// Flying trophy component - animates trophy from pet icon to trophies tab
interface FlyingTrophyProps {
  icon: string;
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
  onArrived: () => void;
}

// Two-phase trophy animation (same as stars)
function FlyingTrophy({ 
  icon, startX, startY, scatterX, scatterY, 
  targetX, targetY, controlX, controlY,
  scatterDuration, flyDelay, flyDuration, onArrived 
}: FlyingTrophyProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const startTimeRef = useRef<number | null>(null);
  const arrivedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const flyDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onArrivedRef = useRef(onArrived);
  
  onArrivedRef.current = onArrived;
  
  useEffect(() => {
    // Start immediately - show and begin scatter phase
    setIsVisible(true);
    
    const animateScatter = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animateScatter);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / scatterDuration, 1);
      const easedProgress = easeOutCubic(progress); // Deceleration
      
      // Linear interpolation from start to scatter position
      const x = startX + (scatterX - startX) * easedProgress;
      const y = startY + (scatterY - startY) * easedProgress;
      
      // Scale up during scatter
      const scale = 1 + easedProgress * 0.3; // 1x to 1.3x
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      elementRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateScatter);
      } else {
        // Scatter complete - wait for fly delay
        flyDelayTimerRef.current = setTimeout(() => {
          startTimeRef.current = null;
          rafRef.current = requestAnimationFrame(animateFly);
        }, flyDelay - scatterDuration);
      }
    };
    
    const animateFly = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animateFly);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / flyDuration, 1);
      const easedProgress = easeInQuad(progress); // Acceleration
      
      // Bezier curve from scatter position to target
      const x = quadraticBezier(easedProgress, scatterX, controlX, targetX);
      const y = quadraticBezier(easedProgress, scatterY, controlY, targetY);
      
      // Scale down during fly (1.3x to 1x)
      const scale = 1.3 - easedProgress * 0.3;
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      elementRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateFly);
      } else {
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          setIsVisible(false);
          onArrivedRef.current();
        }
      }
    };
    
    rafRef.current = requestAnimationFrame(animateScatter);
    
    return () => {
      if (flyDelayTimerRef.current) {
        clearTimeout(flyDelayTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [startX, startY, scatterX, scatterY, targetX, targetY, controlX, controlY, scatterDuration, flyDelay, flyDuration]);
  
  if (!isVisible) return null;
  
  return (
    <div
      ref={elementRef}
      className="fixed text-4xl pointer-events-none z-[10001]"
      style={{
        left: startX,
        top: startY,
        transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.9))'
      }}
    >
      {icon}
    </div>
  );
}

// Flying chip component for collection completion - bezier curve animation (flying UP)
function CollectionChip({ chip, onArrived }: { chip: CollectionFlyingChip; onArrived: () => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const arrivedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const onArrivedRef = useRef(onArrived);
  
  onArrivedRef.current = onArrived;
  
  useEffect(() => {
    setIsVisible(true);
    
    const duration = 800; // ms
    const startX = chip.startX;
    const startY = chip.startY;
    const targetX = chip.startX + (Math.random() - 0.5) * 40; // Slight horizontal drift
    const targetY = chip.targetY;
    
    // Control point for bezier - arc to the side
    const controlX = startX + (Math.random() - 0.5) * 100;
    const controlY = (startY + targetY) / 2 - 30;
    
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
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      
      // Quadratic bezier
      const t = easedProgress;
      const mt = 1 - t;
      const x = mt * mt * startX + 2 * mt * t * controlX + t * t * targetX;
      const y = mt * mt * startY + 2 * mt * t * controlY + t * t * targetY;
      
      const rotation = progress * 360;
      const scale = 1 + Math.sin(progress * Math.PI) * 0.3; // Pulse during flight
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      elementRef.current.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          elementRef.current.style.display = 'none';
          onArrivedRef.current();
          setIsVisible(false);
        }
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [chip]);
  
  if (!isVisible) return null;
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: chip.startX,
        top: chip.startY,
        transform: 'translate(-50%, -50%)',
        width: '10px',
        height: '10px',
        borderRadius: '3px',
        backgroundColor: '#f59e0b',
        boxShadow: '0 0 6px #f59e0b, 0 0 12px #d97706',
      }}
    />,
    document.body
  );
}
