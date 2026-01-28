/**
 * Treasure Hunt - State Management Store
 * 
 * Zustand store for managing event state.
 * Provides a clean API for components to interact with the event.
 */

import { create } from 'zustand';
import { TreasureHuntEvent, ChestReward, TreasureHuntConfig } from './types';
import { loadEvent, saveEvent, clearEvent } from './storage';
import * as logic from './logic';
import * as keyManager from './keyManager';

interface TreasureHuntStore {
  // State
  event: TreasureHuntEvent;
  isLoading: boolean;
  
  // Key-related state
  keyUpdateCounter: number;
  flyingKeyDrops: Array<{ id: number; cardId: string; targetX: number; targetY: number }>;
  
  // Actions
  initialize: () => void;
  activate: (playerLevel: number) => TreasureHuntEvent | null;
  addKeys: (amount: number) => void;
  openChest: (roomId: number, chestId: string) => { reward: ChestReward | null; milestoneUnlocked?: number };
  claimMilestone: (roomIdx: number) => number;
  claimGrandPrize: () => { stars: number; packRarity: number };
  complete: () => void;
  reset: () => void;
  
  // Key actions
  distributeKeys: (faceDownCardIds: string[], faceUpCardIds: string[]) => void;
  addFlyingKeyDrop: (id: number, cardId: string, targetX: number, targetY: number) => void;
  removeFlyingKeyDrop: (id: number) => void;
  forceKeyUpdate: () => void;
  
  // Computed
  isActive: () => boolean;
  isAvailable: (playerLevel: number) => boolean;
  isComplete: () => boolean;
  getCurrentRoomProgress: () => { opened: number; total: number };
  getMilestoneToShow: () => number | null;
  getTimeRemaining: () => string;
}

export const useTreasureHuntStore = create<TreasureHuntStore>((set, get) => {
  // Setup key manager callbacks
  keyManager.setCallbacks({
    onKeysChanged: () => {
      set(state => ({ keyUpdateCounter: state.keyUpdateCounter + 1 }));
    },
    onKeyDrop: (cardId, targetX, targetY) => {
      const id = Date.now() + Math.random();
      get().addFlyingKeyDrop(id, cardId, targetX, targetY);
    }
  });

  return {
    // Initial state
    event: logic.createEvent(),
    isLoading: true,
    keyUpdateCounter: 0,
    flyingKeyDrops: [],

    // Initialize from storage
    initialize: () => {
      let event = loadEvent();
      
      if (event) {
        // Check if expired
        if (logic.isEventExpired(event)) {
          event = logic.createEvent();
          saveEvent(event);
        } else if (logic.needsMigration(event)) {
          event = logic.migrateEventRewards(event);
          saveEvent(event);
        }
      } else {
        event = logic.createEvent();
        saveEvent(event);
      }
      
      set({ event, isLoading: false });
    },

    // Activate event for player
    activate: (playerLevel: number) => {
      const { event } = get();
      
      if (!logic.isLevelSufficient(playerLevel)) {
        return null;
      }
      
      if (event.activated) {
        return event;
      }
      
      const activatedEvent = logic.activateEvent(event);
      saveEvent(activatedEvent);
      set({ event: activatedEvent });
      
      return activatedEvent;
    },

    // Add keys
    addKeys: (amount: number) => {
      const { event } = get();
      const updatedEvent = logic.addKeys(event, amount);
      saveEvent(updatedEvent);
      set({ event: updatedEvent });
    },

    // Open chest
    openChest: (roomId: number, chestId: string) => {
      const { event } = get();
      const result = logic.openChest(event, roomId, chestId);
      saveEvent(result.event);
      set({ event: result.event });
      return { reward: result.reward, milestoneUnlocked: result.milestoneUnlocked };
    },

    // Claim milestone
    claimMilestone: (roomIdx: number) => {
      const { event } = get();
      const result = logic.claimMilestone(event, roomIdx);
      saveEvent(result.event);
      set({ event: result.event });
      return result.stars;
    },

    // Claim grand prize
    claimGrandPrize: () => {
      const { event } = get();
      const result = logic.claimGrandPrize(event);
      saveEvent(result.event);
      set({ event: result.event });
      return { stars: result.stars, packRarity: result.packRarity };
    },

    // Complete event
    complete: () => {
      const { event } = get();
      const completedEvent = logic.completeEvent(event);
      saveEvent(completedEvent);
      set({ event: completedEvent });
    },

    // Reset event
    reset: () => {
      clearEvent();
      keyManager.clearAllKeys();
      const newEvent = logic.createEvent();
      saveEvent(newEvent);
      set({ event: newEvent, keyUpdateCounter: 0, flyingKeyDrops: [] });
    },

    // Distribute keys to cards
    distributeKeys: (faceDownCardIds: string[], faceUpCardIds: string[]) => {
      const { event } = get();
      keyManager.distributeKeys(faceDownCardIds, faceUpCardIds, event.active);
    },

    // Flying key drop management
    addFlyingKeyDrop: (id, cardId, targetX, targetY) => {
      set(state => ({
        flyingKeyDrops: [...state.flyingKeyDrops, { id, cardId, targetX, targetY }]
      }));
    },

    removeFlyingKeyDrop: (id) => {
      set(state => ({
        flyingKeyDrops: state.flyingKeyDrops.filter(drop => drop.id !== id)
      }));
    },

    forceKeyUpdate: () => {
      set(state => ({ keyUpdateCounter: state.keyUpdateCounter + 1 }));
    },

    // Computed values
    isActive: () => {
      const { event } = get();
      return event.active && !logic.isEventExpired(event);
    },

    isAvailable: (playerLevel: number) => {
      return logic.isLevelSufficient(playerLevel);
    },

    isComplete: () => {
      const { event } = get();
      return logic.isEventComplete(event);
    },

    getCurrentRoomProgress: () => {
      const { event } = get();
      return logic.getCurrentRoomProgress(event);
    },

    getMilestoneToShow: () => {
      const { event } = get();
      return logic.getMilestoneToShow(event);
    },

    getTimeRemaining: () => {
      const { event } = get();
      return event.endTime ? logic.formatTimeRemaining(event.endTime) : '';
    }
  };
});

// Re-export key manager functions for direct access
export { cardHasKey, collectKeyFromCard, addKeyToCard, clearAllKeys } from './keyManager';
