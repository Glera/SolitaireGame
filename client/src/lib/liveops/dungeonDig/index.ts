/**
 * Dungeon Dig LiveOps Event
 * 
 * A self-contained event module where players collect shovels and dig through dungeon tiles.
 * 
 * Usage:
 * 1. Import the store: import { useDungeonDigStore } from './dungeonDig'
 * 2. Initialize on app start: useDungeonDigStore.getState().initialize()
 * 3. Use the store in components: const { event, digTile } = useDungeonDigStore()
 * 
 * Features:
 * - Shovels drop onto cards at game start
 * - Players collect shovels by moving cards to foundation
 * - Shovels dig tiles revealing rewards
 * - Find exit to proceed to the next floor
 * - Progressive grid sizes: 4x4 (floors 1-3), 5x5 (floors 4-7), 6x6 (floors 8-10)
 * - Milestone rewards at floors 3, 7 and 10
 */

// Store (main API)
export { useDungeonDigStore } from './store';

// Shovel manager functions (for game integration)
export { 
  cardHasShovel, 
  collectShovelFromCard, 
  addShovelToCard, 
  clearAllShovels,
  distributeShovels,
  getCardsWithShovels,
  getShovelCount,
  setCallbacks as setShovelCallbacks
} from './shovelManager';

// Types
export type {
  DungeonDigEvent,
  DungeonTile,
  DungeonFloor,
  TileReward,
  DungeonDigConfig,
  DungeonDigCallbacks,
  DigTileResult
} from './types';

// Logic functions (for advanced use cases)
export {
  DEFAULT_CONFIG,
  getFloorGridSize,
  formatTimeRemaining,
  getRemainingTime,
  isTimeCritical,
  isEventComplete,
  isEventExpired,
  isLevelSufficient,
  getCurrentFloorProgress,
  getMilestoneToShow,
  canDigTile,
  getDiggableTiles
} from './logic';

// Storage (for direct access if needed)
export { loadEvent, saveEvent, clearEvent } from './storage';

// Legacy compatibility functions
import { useDungeonDigStore } from './store';
import * as logic from './logic';
import { loadEvent, saveEvent, clearEvent } from './storage';
import { clearAllShovels as clearShovels } from './shovelManager';

/** Get current event state - from localStorage for consistency */
export function getDungeonDigEvent(): import('./types').DungeonDigEvent {
  const stored = loadEvent();
  if (stored) {
    return stored;
  }
  return useDungeonDigStore.getState().event;
}

/** Save event state - to both localStorage and store */
export function saveDungeonDigEvent(event: import('./types').DungeonDigEvent) {
  saveEvent(event);
  // Also update the store to keep them in sync
  useDungeonDigStore.setState({ event });
}

/** Activate event for player */
export function activateDungeonDig(playerLevel: number): import('./types').DungeonDigEvent | null {
  if (!logic.isLevelSufficient(playerLevel)) {
    return null;
  }
  
  const currentEvent = getDungeonDigEvent();
  if (currentEvent.activated) {
    return currentEvent;
  }
  
  const activatedEvent = logic.activateEvent(currentEvent);
  saveDungeonDigEvent(activatedEvent);
  return activatedEvent;
}

/** Check if event is available for player level */
export function isEventAvailable(playerLevel: number) {
  return logic.isLevelSufficient(playerLevel);
}

/** Get required level */
export function getRequiredLevel() {
  return logic.DEFAULT_CONFIG.requiredLevel;
}

/** Add shovels to event - works directly with localStorage for consistency */
export function addShovels(amount: number): import('./types').DungeonDigEvent {
  // Get current event from localStorage (source of truth)
  const currentEvent = getDungeonDigEvent();
  // Add shovels
  const updatedEvent = logic.addShovels(currentEvent, amount);
  // Save to both localStorage and store
  saveDungeonDigEvent(updatedEvent);
  return updatedEvent;
}

/** Milestone rewards config */
export const MILESTONE_REWARDS = logic.DEFAULT_CONFIG.milestoneRewards;

/** Reset event */
export function resetDungeonDigEvent() {
  // Clear shovels from cards
  clearShovels();
  // Clear storage and create new event
  clearEvent();
  const newEvent = logic.createEvent();
  saveEvent(newEvent);
  useDungeonDigStore.setState({ event: newEvent, shovelUpdateCounter: 0, flyingShovelDrops: [] });
}
