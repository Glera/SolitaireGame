/**
 * Treasure Hunt LiveOps Event - Type Definitions
 * 
 * This event allows players to collect keys from cards and use them to open chests.
 * Can be reused in other card games by importing this module.
 */

import { PackRarity } from '../pointsEvent';

// Reward that can be found in a chest
export interface ChestReward {
  type: 'stars' | 'pack' | 'big_win' | 'empty';
  stars?: number;
  packRarity?: PackRarity;
  isBigWin?: boolean;
}

// Individual chest in a room
export interface TreasureChest {
  id: string;
  opened: boolean;
  reward: ChestReward | null;
}

// Room containing multiple chests
export interface TreasureRoom {
  id: number;
  chests: TreasureChest[];
  completed: boolean;
}

// Main event state
export interface TreasureHuntEvent {
  id: string;
  active: boolean;
  activated: boolean;
  activatedAt: number | null;
  endTime: number | null;
  keys: number;
  currentRoom: number;
  rooms: TreasureRoom[];
  grandPrizeClaimed: boolean;
  milestoneClaimed: number[];
}

// Result of opening a chest
export interface OpenChestResult {
  event: TreasureHuntEvent;
  reward: ChestReward | null;
  milestoneUnlocked?: number;
}

// Result of claiming grand prize
export interface GrandPrizeResult {
  event: TreasureHuntEvent;
  stars: number;
  packRarity: PackRarity;
}

// Configuration for the event
export interface TreasureHuntConfig {
  eventDurationMinutes: number;  // Duration in minutes (short for testing)
  totalRooms: number;
  minChests: number;
  maxChests: number;
  requiredLevel: number;
  milestoneRewards: Record<number, number>;
}

// Callbacks for event communication with the game
export interface TreasureHuntCallbacks {
  onKeyCollected?: (cardId: string, startX: number, startY: number) => void;
  onKeysChanged?: () => void;
  onKeyDrop?: (cardId: string, targetX: number, targetY: number) => void;
  onEventStateChanged?: (event: TreasureHuntEvent) => void;
}
