import { create } from 'zustand';
import { CollectionPack } from '../liveops/collectionPacks';

/**
 * ============================================================================
 * POPUP QUEUE SYSTEM
 * ============================================================================
 * 
 * Centralized popup management for the Solitaire game.
 * All popups are managed through this single store to prevent:
 * - Multiple popups opening simultaneously
 * - Race conditions in popup chains
 * - Scattered state across components
 * 
 * TWO TYPES OF POPUPS:
 * 
 * 1. WinFlowPopup (Queue-based)
 *    - Shown sequentially after winning a game
 *    - Examples: LevelUp, DailyReward, Streak, Unlocks, Promos
 *    - Use: enqueue() -> startProcessing() -> dismiss()
 * 
 * 2. OnDemandPopup (Immediate)
 *    - Shown immediately when user clicks a button
 *    - Examples: Collections, Shop, Events, Locked features
 *    - Use: showOnDemand() -> closeOnDemand()
 *    - Only ONE on-demand popup can be open at a time
 * 
 * USAGE IN COMPONENTS:
 * 
 *   // Check if popup is visible
 *   const showCollections = popupQueue.onDemandPopup?.type === 'collections';
 *   
 *   // Open popup
 *   const openCollections = () => popupQueue.showOnDemand({ type: 'collections' });
 *   
 *   // Close popup
 *   const closeCollections = () => popupQueue.closeOnDemand();
 * 
 * ============================================================================
 */

/**
 * Types of popups that can appear in the win flow queue.
 * These are shown sequentially after a game win.
 */
export type WinFlowPopup =
  | { type: 'levelUp'; level: number; stars: number }
  | { type: 'dailyReward'; day: number; stars: number }
  | { type: 'streak'; count: number; stars: number }
  | { type: 'unlockCollections' }
  | { type: 'unlockTournament' }
  | { type: 'unlockDailyQuests' }
  | { type: 'unlockPromo' }
  | { type: 'treasureHuntPromo' }
  | { type: 'dungeonDigPromo' }
  | { type: 'dailyQuests' }
  | { type: 'leaderboard' }
  | { type: 'collectionPack'; pack: CollectionPack };

/**
 * Popups shown on user action (not in queue).
 * These are managed separately and can interrupt the queue.
 */
export type OnDemandPopup =
  | { type: 'treasureHunt' }
  | { type: 'dungeonDig' }
  | { type: 'pointsEvent' }
  | { type: 'collections' }
  | { type: 'shop' }
  | { type: 'leaderboardView' }
  | { type: 'dailyQuests' }
  | { type: 'lockedCollections' }
  | { type: 'lockedLeaderboard' }
  | { type: 'lockedDungeon' }
  | { type: 'lockedPointsEvent' }
  | { type: 'eventEnded' }
  | { type: 'dungeonEnded' }
  | { type: 'noMoves' }
  | { type: 'debug' };

interface PopupQueueState {
  // Queue of popups to show (FIFO)
  queue: WinFlowPopup[];
  
  // Currently displayed popup from queue (null if queue empty or paused)
  current: WinFlowPopup | null;
  
  // Is the queue actively processing?
  isProcessing: boolean;
  
  // On-demand popup (shown immediately, pauses queue)
  onDemandPopup: OnDemandPopup | null;
  
  // Actions
  
  /**
   * Add a single popup to the end of the queue.
   * Does not automatically start processing.
   */
  enqueue: (popup: WinFlowPopup) => void;
  
  /**
   * Add multiple popups to the queue at once.
   * Does not automatically start processing.
   */
  enqueueMany: (popups: WinFlowPopup[]) => void;
  
  /**
   * Start processing the queue - shows the first popup.
   * Call this after enqueueing all win flow popups.
   */
  startProcessing: () => void;
  
  /**
   * Dismiss the current popup and show the next one.
   * If queue is empty, stops processing.
   */
  dismiss: () => void;
  
  /**
   * Clear the entire queue and stop processing.
   */
  clear: () => void;
  
  /**
   * Show an on-demand popup (pauses queue processing).
   */
  showOnDemand: (popup: OnDemandPopup) => void;
  
  /**
   * Close the on-demand popup (resumes queue if it was processing).
   */
  closeOnDemand: () => void;
  
  /**
   * Check if a specific popup type is currently shown.
   */
  isShowing: (type: WinFlowPopup['type'] | OnDemandPopup['type']) => boolean;
  
  /**
   * Check if any popup is currently visible.
   */
  hasActivePopup: () => boolean;
}

export const usePopupQueue = create<PopupQueueState>((set, get) => ({
  queue: [],
  current: null,
  isProcessing: false,
  onDemandPopup: null,
  
  enqueue: (popup) => {
    set((state) => ({
      queue: [...state.queue, popup]
    }));
  },
  
  enqueueMany: (popups) => {
    set((state) => ({
      queue: [...state.queue, ...popups]
    }));
  },
  
  startProcessing: () => {
    const state = get();
    if (state.queue.length === 0) {
      set({ isProcessing: false, current: null });
      return;
    }
    
    const [first, ...rest] = state.queue;
    set({
      isProcessing: true,
      current: first,
      queue: rest
    });
  },
  
  dismiss: () => {
    const state = get();
    
    // If there's more in queue, show next
    if (state.queue.length > 0) {
      const [next, ...rest] = state.queue;
      set({
        current: next,
        queue: rest
      });
    } else {
      // Queue exhausted
      set({
        isProcessing: false,
        current: null
      });
    }
  },
  
  clear: () => {
    set({
      queue: [],
      current: null,
      isProcessing: false
    });
  },
  
  showOnDemand: (popup) => {
    set({ onDemandPopup: popup });
  },
  
  closeOnDemand: () => {
    set({ onDemandPopup: null });
  },
  
  isShowing: (type) => {
    const state = get();
    if (state.onDemandPopup?.type === type) return true;
    if (state.current?.type === type) return true;
    return false;
  },
  
  hasActivePopup: () => {
    const state = get();
    return state.current !== null || state.onDemandPopup !== null;
  }
}));

// Helper to get readable popup name for debugging
export function getPopupName(popup: WinFlowPopup | OnDemandPopup): string {
  switch (popup.type) {
    case 'levelUp': return `Level Up (${(popup as any).level})`;
    case 'dailyReward': return `Daily Reward (Day ${(popup as any).day})`;
    case 'streak': return `Streak (${(popup as any).count})`;
    case 'unlockCollections': return 'Unlock Collections';
    case 'unlockTournament': return 'Unlock Tournament';
    case 'unlockDailyQuests': return 'Unlock Daily Quests';
    case 'unlockPromo': return 'Unlock Promo';
    case 'treasureHuntPromo': return 'Treasure Hunt Promo';
    case 'dungeonDigPromo': return 'Dungeon Dig Promo';
    case 'dailyQuests': return 'Daily Quests';
    case 'leaderboard': return 'Leaderboard';
    case 'collectionPack': return 'Collection Pack';
    case 'treasureHunt': return 'Treasure Hunt';
    case 'dungeonDig': return 'Dungeon Dig';
    case 'pointsEvent': return 'Points Event';
    case 'collections': return 'Collections';
    case 'shop': return 'Shop';
    case 'leaderboardView': return 'Leaderboard View';
    case 'lockedCollections': return 'Locked Collections';
    case 'lockedLeaderboard': return 'Locked Leaderboard';
    case 'lockedDungeon': return 'Locked Dungeon';
    case 'lockedPointsEvent': return 'Locked Points Event';
    case 'eventEnded': return 'Event Ended';
    case 'dungeonEnded': return 'Dungeon Ended';
    case 'noMoves': return 'No Moves';
    case 'debug': return 'Debug';
    default: return 'Unknown';
  }
}
