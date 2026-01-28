/**
 * Dungeon Dig - State Management Store
 * 
 * Zustand store for managing event state.
 */

import { create } from 'zustand';
import { DungeonDigEvent, TileReward, DungeonDigConfig, DungeonTile, DungeonFloor } from './types';
import { loadEvent, saveEvent, clearEvent } from './storage';
import * as logic from './logic';
import * as shovelManager from './shovelManager';

interface DungeonDigStore {
  // State
  event: DungeonDigEvent;
  isLoading: boolean;
  
  // Shovel-related state
  shovelUpdateCounter: number;
  flyingShovelDrops: Array<{ id: number; cardId: string; targetX: number; targetY: number }>;
  
  // Actions
  initialize: () => void;
  activate: (playerLevel: number) => DungeonDigEvent | null;
  addShovels: (amount: number) => void;
  digTile: (floorId: number, tileId: string) => { reward: TileReward | null; floorCompleted: boolean; milestoneUnlocked?: number };
  claimMilestone: (floorIdx: number) => number;
  complete: () => void;
  reset: () => void;
  
  // Shovel actions
  distributeShovels: (faceDownCardIds: string[], faceUpCardIds: string[]) => void;
  addFlyingShovelDrop: (id: number, cardId: string, targetX: number, targetY: number) => void;
  removeFlyingShovelDrop: (id: number) => void;
  forceShovelUpdate: () => void;
  
  // Computed
  isActive: () => boolean;
  isAvailable: (playerLevel: number) => boolean;
  isComplete: () => boolean;
  getCurrentFloorProgress: () => { dug: number; total: number };
  getMilestoneToShow: () => number | null;
  getTimeRemaining: () => string;
  getDiggableTiles: () => DungeonTile[];
  getCurrentFloor: () => DungeonFloor | null;
  canDigTile: (tile: DungeonTile) => boolean;
}

export const useDungeonDigStore = create<DungeonDigStore>((set, get) => {
  // Setup shovel manager callbacks
  shovelManager.setCallbacks({
    onShovelsChanged: () => {
      set(state => ({ shovelUpdateCounter: state.shovelUpdateCounter + 1 }));
    },
    onShovelDrop: (cardId, targetX, targetY) => {
      const id = Date.now() + Math.random();
      get().addFlyingShovelDrop(id, cardId, targetX, targetY);
    }
  });

  return {
    // Initial state
    event: logic.createEvent(),
    isLoading: true,
    shovelUpdateCounter: 0,
    flyingShovelDrops: [],

    // Initialize from storage
    initialize: () => {
      let event = loadEvent();
      
      if (event) {
        // Check if expired
        if (logic.isEventExpired(event)) {
          event = logic.createEvent();
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

    // Add shovels
    addShovels: (amount: number) => {
      const { event } = get();
      const updatedEvent = logic.addShovels(event, amount);
      saveEvent(updatedEvent);
      set({ event: updatedEvent });
    },

    // Dig tile
    digTile: (floorId: number, tileId: string) => {
      const { event } = get();
      const result = logic.digTile(event, floorId, tileId);
      saveEvent(result.event);
      set({ event: result.event });
      return { 
        reward: result.reward, 
        floorCompleted: result.floorCompleted,
        milestoneUnlocked: result.milestoneUnlocked 
      };
    },

    // Claim milestone
    claimMilestone: (floorIdx: number) => {
      const { event } = get();
      const result = logic.claimMilestone(event, floorIdx);
      saveEvent(result.event);
      set({ event: result.event });
      return result.stars;
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
      shovelManager.clearAllShovels();
      const newEvent = logic.createEvent();
      saveEvent(newEvent);
      set({ event: newEvent, shovelUpdateCounter: 0, flyingShovelDrops: [] });
    },

    // Distribute shovels to cards
    distributeShovels: (faceDownCardIds: string[], faceUpCardIds: string[]) => {
      const { event } = get();
      shovelManager.distributeShovels(faceDownCardIds, faceUpCardIds, event.active);
    },

    // Flying shovel drop management
    addFlyingShovelDrop: (id, cardId, targetX, targetY) => {
      set(state => ({
        flyingShovelDrops: [...state.flyingShovelDrops, { id, cardId, targetX, targetY }]
      }));
    },

    removeFlyingShovelDrop: (id) => {
      set(state => ({
        flyingShovelDrops: state.flyingShovelDrops.filter(drop => drop.id !== id)
      }));
    },

    forceShovelUpdate: () => {
      set(state => ({ shovelUpdateCounter: state.shovelUpdateCounter + 1 }));
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

    getCurrentFloorProgress: () => {
      const { event } = get();
      return logic.getCurrentFloorProgress(event);
    },

    getMilestoneToShow: () => {
      const { event } = get();
      return logic.getMilestoneToShow(event);
    },

    getTimeRemaining: () => {
      const { event } = get();
      return event.endTime ? logic.formatTimeRemaining(event.endTime) : '';
    },
    
    getDiggableTiles: () => {
      const { event } = get();
      const floor = event.floors[event.currentFloor];
      if (!floor) return [];
      return logic.getDiggableTiles(floor);
    },
    
    getCurrentFloor: () => {
      const { event } = get();
      return event.floors[event.currentFloor] || null;
    },
    
    canDigTile: (tile: DungeonTile) => {
      const { event } = get();
      const floor = event.floors[event.currentFloor];
      if (!floor) return false;
      return logic.canDigTile(floor, tile);
    }
  };
});

// Re-export shovel manager functions for direct access
export { 
  cardHasShovel, 
  collectShovelFromCard, 
  addShovelToCard, 
  clearAllShovels 
} from './shovelManager';
