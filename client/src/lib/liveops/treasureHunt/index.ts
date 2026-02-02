/**
 * Treasure Hunt LiveOps Event
 * 
 * A self-contained event module that can be reused in other card games.
 * 
 * Usage:
 * 1. Import the store: import { useTreasureHuntStore } from './treasureHunt'
 * 2. Initialize on app start: useTreasureHuntStore.getState().initialize()
 * 3. Use the store in components: const { event, openChest } = useTreasureHuntStore()
 * 
 * Features:
 * - Keys drop onto cards at game start
 * - Players collect keys by moving cards to foundation
 * - Keys unlock chests containing rewards
 * - Milestone rewards at rooms 5 and 10
 * - Grand prize for completing all rooms
 * - 48-hour duration with timer
 */

// Store (main API)
export { useTreasureHuntStore } from './store';

// Key manager functions (for game integration)
export { 
  cardHasKey, 
  collectKeyFromCard, 
  addKeyToCard, 
  clearAllKeys,
  distributeKeys,
  getCardsWithKeys,
  getKeyCount,
  setCallbacks as setKeyCallbacks
} from './keyManager';

// Types
export type {
  TreasureHuntEvent,
  TreasureChest,
  TreasureRoom,
  ChestReward,
  TreasureHuntConfig,
  TreasureHuntCallbacks,
  OpenChestResult,
  GrandPrizeResult
} from './types';

// Logic functions (for advanced use cases)
export {
  DEFAULT_CONFIG,
  formatTimeRemaining,
  getRemainingTime,
  isTimeCritical,
  isEventComplete,
  isEventExpired,
  isLevelSufficient,
  getCurrentRoomProgress,
  getMilestoneToShow
} from './logic';

// Storage (for direct access if needed)
export { loadEvent, saveEvent, clearEvent } from './storage';

// Legacy compatibility - export functions that match old API
// This allows gradual migration from the old treasureHunt.ts

import { useTreasureHuntStore } from './store';
import * as logic from './logic';
import { loadEvent, saveEvent, clearEvent } from './storage';

/** @deprecated Use useTreasureHuntStore instead */
export function getTreasureHuntEvent() {
  // Load directly from localStorage to ensure we get persisted state
  const stored = loadEvent();
  if (stored) {
    return stored;
  }
  // Fallback to store (which may have default empty event)
  return useTreasureHuntStore.getState().event;
}

/** @deprecated Use useTreasureHuntStore instead */
export function saveTreasureHuntEvent(event: import('./types').TreasureHuntEvent) {
  saveEvent(event);
  // Note: This won't update the store - use store actions instead
}

/** @deprecated Use useTreasureHuntStore.getState().activate() instead */
export function activateTreasureHunt(playerLevel: number) {
  if (!logic.isLevelSufficient(playerLevel)) {
    return null;
  }
  
  // Load from localStorage to ensure we have current state
  let currentEvent = loadEvent();
  if (!currentEvent) {
    currentEvent = logic.createEvent();
  }
  
  if (currentEvent.activated) {
    return currentEvent;
  }
  
  const activatedEvent = logic.activateEvent(currentEvent);
  saveEvent(activatedEvent);
  // Also update store to keep in sync
  useTreasureHuntStore.setState({ event: activatedEvent });
  return activatedEvent;
}

/** @deprecated Use logic.isLevelSufficient() instead */
export function isEventAvailable(playerLevel: number) {
  return logic.isLevelSufficient(playerLevel);
}

/** @deprecated Use logic.DEFAULT_CONFIG.requiredLevel instead */
export function getRequiredLevel() {
  return logic.DEFAULT_CONFIG.requiredLevel;
}

/** @deprecated Use useTreasureHuntStore.getState().addKeys() instead */
export function addKeys(amount: number) {
  // Load from localStorage to ensure we have current state
  const currentEvent = loadEvent() || logic.createEvent();
  const updatedEvent = logic.addKeys(currentEvent, amount);
  saveEvent(updatedEvent);
  // Also update store to keep in sync
  useTreasureHuntStore.setState({ event: updatedEvent });
  return updatedEvent;
}

/** @deprecated Use logic.DEFAULT_CONFIG.milestoneRewards instead */
export const MILESTONE_REWARDS = logic.DEFAULT_CONFIG.milestoneRewards;

/** @deprecated Use useTreasureHuntStore.getState().getMilestoneToShow() instead */
export function getMilestoneToShowLegacy(event: import('./types').TreasureHuntEvent) {
  return logic.getMilestoneToShow(event);
}

/** @deprecated Use useTreasureHuntStore.getState().claimMilestone() instead */
export function claimMilestone(roomIdx: number) {
  const currentEvent = loadEvent() || logic.createEvent();
  const result = logic.claimMilestone(currentEvent, roomIdx);
  saveEvent(result.event);
  useTreasureHuntStore.setState({ event: result.event });
  return { event: result.event, stars: result.stars };
}

/** @deprecated Use useTreasureHuntStore.getState().openChest() instead */
export function openChest(roomId: number, chestId: string) {
  const currentEvent = loadEvent() || logic.createEvent();
  const result = logic.openChest(currentEvent, roomId, chestId);
  saveEvent(result.event);
  useTreasureHuntStore.setState({ event: result.event });
  return { 
    event: result.event, 
    reward: result.reward,
    milestoneUnlocked: result.milestoneUnlocked 
  };
}

/** @deprecated Use logic.getCurrentRoomProgress() instead */
export function getCurrentRoomProgressLegacy(event: import('./types').TreasureHuntEvent) {
  return logic.getCurrentRoomProgress(event);
}

/** @deprecated Use logic.isEventComplete() instead */
export function isEventCompleteLegacy(event: import('./types').TreasureHuntEvent) {
  return logic.isEventComplete(event);
}

/** @deprecated Use useTreasureHuntStore.getState().claimGrandPrize() instead */
export function claimGrandPrize() {
  const currentEvent = loadEvent() || logic.createEvent();
  const result = logic.claimGrandPrize(currentEvent);
  saveEvent(result.event);
  useTreasureHuntStore.setState({ event: result.event });
  return { event: result.event, stars: result.stars, packRarity: result.packRarity };
}

/** @deprecated Use logic.formatTimeRemaining() instead */
export function formatEventTimeRemaining(endTime: number) {
  return logic.formatTimeRemaining(endTime);
}

/** @deprecated Use useTreasureHuntStore.getState().complete() instead */
export function completeEvent() {
  useTreasureHuntStore.getState().complete();
  return useTreasureHuntStore.getState().event;
}

/** @deprecated Use useTreasureHuntStore.getState().reset() instead */
export function resetTreasureHuntEvent() {
  useTreasureHuntStore.getState().reset();
}
