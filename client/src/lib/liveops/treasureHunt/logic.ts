/**
 * Treasure Hunt - Business Logic
 * 
 * Pure functions for event logic. No side effects, no storage operations.
 * Easy to test and reuse.
 */

import { PackRarity } from '../pointsEvent';
import {
  TreasureHuntEvent,
  TreasureRoom,
  TreasureChest,
  ChestReward,
  TreasureHuntConfig,
  OpenChestResult,
  GrandPrizeResult
} from './types';

// Default configuration
export const DEFAULT_CONFIG: TreasureHuntConfig = {
  eventDurationMinutes: 5,    // 5 minutes for testing
  totalRooms: 10,
  minChests: 5,
  maxChests: 10,
  requiredLevel: 3,
  milestoneRewards: {
    4: 50,   // Room 5 (index 4) - 50 stars
    9: 100   // Room 10 (index 9) - 100 stars
  }
};

/**
 * Generate a random pack rarity based on room number
 * Higher rooms = better chance for rare packs
 */
export function generatePackRarity(roomNumber: number): PackRarity {
  const roll = Math.random();
  
  const purpleChance = 0.02 + roomNumber * 0.02; // 2-20%
  const blueChance = 0.08 + roomNumber * 0.02;   // 8-26%
  const greenChance = 0.25 + roomNumber * 0.02;  // 25-43%
  
  if (roll < purpleChance * 0.3) {
    return 5; // Legendary (red)
  } else if (roll < purpleChance) {
    return 4; // Epic (purple)
  } else if (roll < purpleChance + blueChance) {
    return 3; // Rare (blue)
  } else if (roll < purpleChance + blueChance + greenChance) {
    return 2; // Uncommon (green)
  }
  return 1; // Common (gray)
}

/**
 * Generate rewards for a room
 */
export function generateRoomRewards(roomNumber: number, chestCount: number): ChestReward[] {
  const rewards: ChestReward[] = [];
  
  const bigWinChance = 0.05 + (roomNumber * 0.01);
  const packChance = 0.20 + (roomNumber * 0.01);
  const starsChance = 0.25;
  
  for (let i = 0; i < chestCount; i++) {
    const roll = Math.random();
    
    if (roll < bigWinChance) {
      const minRarity = Math.min(5, 3 + Math.floor(roomNumber / 3)) as PackRarity;
      rewards.push({
        type: 'big_win',
        stars: 15 + roomNumber * 3,
        packRarity: minRarity,
        isBigWin: true
      });
    } else if (roll < bigWinChance + packChance) {
      rewards.push({
        type: 'pack',
        packRarity: generatePackRarity(roomNumber)
      });
    } else if (roll < bigWinChance + packChance + starsChance) {
      const starAmount = Math.random() < 0.7 
        ? 3 + Math.floor(Math.random() * 5)
        : 10 + Math.floor(Math.random() * 10) + roomNumber;
      rewards.push({
        type: 'stars',
        stars: starAmount
      });
    } else {
      rewards.push({ type: 'empty' });
    }
  }
  
  // Shuffle rewards
  for (let i = rewards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rewards[i], rewards[j]] = [rewards[j], rewards[i]];
  }
  
  return rewards;
}

/**
 * Generate all rooms for the event
 */
export function generateRooms(config: TreasureHuntConfig = DEFAULT_CONFIG): TreasureRoom[] {
  const rooms: TreasureRoom[] = [];
  
  for (let i = 0; i < config.totalRooms; i++) {
    const chestCount = Math.min(
      config.maxChests, 
      config.minChests + Math.floor((i / (config.totalRooms - 1)) * (config.maxChests - config.minChests))
    );
    
    const rewards = generateRoomRewards(i, chestCount);
    
    const chests: TreasureChest[] = rewards.map((reward, idx) => ({
      id: `room_${i}_chest_${idx}`,
      opened: false,
      reward
    }));
    
    rooms.push({
      id: i,
      chests,
      completed: false
    });
  }
  
  return rooms;
}

/**
 * Create a new event
 */
export function createEvent(config: TreasureHuntConfig = DEFAULT_CONFIG): TreasureHuntEvent {
  return {
    id: `treasure_hunt_${Date.now()}`,
    active: false,
    activated: false,
    activatedAt: null,
    endTime: null,
    keys: 0,
    currentRoom: 0,
    rooms: generateRooms(config),
    grandPrizeClaimed: false,
    milestoneClaimed: []
  };
}

/**
 * Activate the event
 */
export function activateEvent(
  event: TreasureHuntEvent, 
  config: TreasureHuntConfig = DEFAULT_CONFIG
): TreasureHuntEvent {
  if (event.activated) {
    return event;
  }
  
  return {
    ...event,
    activated: true,
    active: true,
    activatedAt: Date.now(),
    endTime: Date.now() + (config.eventDurationMinutes * 60 * 1000)
  };
}

/**
 * Check if event is expired
 */
export function isEventExpired(event: TreasureHuntEvent): boolean {
  return event.endTime !== null && Date.now() > event.endTime;
}

/**
 * Check if player level meets requirement
 */
export function isLevelSufficient(playerLevel: number, config: TreasureHuntConfig = DEFAULT_CONFIG): boolean {
  return playerLevel >= config.requiredLevel;
}

/**
 * Add keys to event
 */
export function addKeys(event: TreasureHuntEvent, amount: number): TreasureHuntEvent {
  return {
    ...event,
    keys: event.keys + amount
  };
}

/**
 * Open a chest
 */
export function openChest(
  event: TreasureHuntEvent, 
  roomId: number, 
  chestId: string,
  config: TreasureHuntConfig = DEFAULT_CONFIG
): OpenChestResult {
  if (event.keys <= 0) {
    return { event, reward: null };
  }
  
  const room = event.rooms[roomId];
  if (!room) {
    return { event, reward: null };
  }
  
  const chestIndex = room.chests.findIndex(c => c.id === chestId);
  if (chestIndex === -1 || room.chests[chestIndex].opened) {
    return { event, reward: null };
  }
  
  // Create updated rooms array
  const updatedChests = [...room.chests];
  updatedChests[chestIndex] = { ...updatedChests[chestIndex], opened: true };
  
  const allOpened = updatedChests.every(c => c.opened);
  const updatedRoom: TreasureRoom = {
    ...room,
    chests: updatedChests,
    completed: allOpened
  };
  
  const updatedRooms = [...event.rooms];
  updatedRooms[roomId] = updatedRoom;
  
  let milestoneUnlocked: number | undefined;
  let newCurrentRoom = event.currentRoom;
  
  if (allOpened) {
    // Check for milestone
    if (config.milestoneRewards[roomId] !== undefined && 
        !event.milestoneClaimed?.includes(roomId)) {
      milestoneUnlocked = roomId;
    }
    
    // Move to next room
    if (event.currentRoom < config.totalRooms - 1) {
      newCurrentRoom = event.currentRoom + 1;
    }
  }
  
  const updatedEvent: TreasureHuntEvent = {
    ...event,
    rooms: updatedRooms,
    keys: event.keys - 1,
    currentRoom: newCurrentRoom
  };
  
  return {
    event: updatedEvent,
    reward: room.chests[chestIndex].reward,
    milestoneUnlocked
  };
}

/**
 * Claim milestone reward
 */
export function claimMilestone(
  event: TreasureHuntEvent, 
  roomIdx: number,
  config: TreasureHuntConfig = DEFAULT_CONFIG
): { event: TreasureHuntEvent; stars: number } {
  const stars = config.milestoneRewards[roomIdx] || 0;
  
  const milestoneClaimed = event.milestoneClaimed || [];
  if (milestoneClaimed.includes(roomIdx)) {
    return { event, stars: 0 };
  }
  
  return {
    event: {
      ...event,
      milestoneClaimed: [...milestoneClaimed, roomIdx]
    },
    stars
  };
}

/**
 * Get milestone to show (if any)
 */
export function getMilestoneToShow(
  event: TreasureHuntEvent,
  config: TreasureHuntConfig = DEFAULT_CONFIG
): number | null {
  for (const roomIdx of Object.keys(config.milestoneRewards).map(Number)) {
    if (event.rooms[roomIdx]?.completed && !event.milestoneClaimed?.includes(roomIdx)) {
      return roomIdx;
    }
  }
  return null;
}

/**
 * Check if all rooms are completed
 */
export function isEventComplete(event: TreasureHuntEvent): boolean {
  return event.rooms.every(r => r.completed);
}

/**
 * Claim grand prize
 */
export function claimGrandPrize(event: TreasureHuntEvent): GrandPrizeResult {
  if (!isEventComplete(event) || event.grandPrizeClaimed) {
    return { event, stars: 0, packRarity: 1 };
  }
  
  return {
    event: {
      ...event,
      grandPrizeClaimed: true
    },
    stars: 200,
    packRarity: 5
  };
}

/**
 * Complete and deactivate the event
 */
export function completeEvent(event: TreasureHuntEvent): TreasureHuntEvent {
  return {
    ...event,
    active: false
  };
}

/**
 * Get current room progress
 */
export function getCurrentRoomProgress(event: TreasureHuntEvent): { opened: number; total: number } {
  const room = event.rooms[event.currentRoom];
  if (!room) return { opened: 0, total: 0 };
  
  const opened = room.chests.filter(c => c.opened).length;
  return { opened, total: room.chests.length };
}

/**
 * Format remaining time (supports short durations with seconds)
 */
export function formatTimeRemaining(endTime: number): string {
  const now = Date.now();
  const remaining = endTime - now;
  
  if (remaining <= 0) return 'Завершено';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  
  // For short events (< 1 hour), show minutes:seconds
  if (hours === 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}д ${remainingHours}ч`;
  }
  
  return `${hours}ч ${minutes}м`;
}

/**
 * Get remaining time in milliseconds
 */
export function getRemainingTime(endTime: number): number {
  return Math.max(0, endTime - Date.now());
}

/**
 * Check if time is critically low (< 1 minute)
 */
export function isTimeCritical(endTime: number): boolean {
  const remaining = endTime - Date.now();
  return remaining > 0 && remaining < 60 * 1000;
}

/**
 * Check if event needs migration to new format
 */
export function needsMigration(event: TreasureHuntEvent): boolean {
  for (const room of event.rooms) {
    for (const chest of room.chests) {
      if (!chest.opened) {
        if ((chest.reward?.type === 'pack' || chest.reward?.type === 'big_win') && !chest.reward.packRarity) {
          return true;
        }
      }
    }
  }
  
  let hasPackReward = false;
  for (const room of event.rooms) {
    for (const chest of room.chests) {
      if (chest.reward?.type === 'pack' || chest.reward?.type === 'big_win') {
        hasPackReward = true;
        break;
      }
    }
    if (hasPackReward) break;
  }
  return !hasPackReward;
}

/**
 * Migrate event to new reward format
 */
export function migrateEventRewards(event: TreasureHuntEvent): TreasureHuntEvent {
  console.log('🔄 Migrating Treasure Hunt rewards to new format...');
  
  const updatedRooms = event.rooms.map((room, roomIdx) => {
    const newRewards = generateRoomRewards(roomIdx, room.chests.length);
    
    const updatedChests = room.chests.map((chest, chestIdx) => {
      if (!chest.opened) {
        return { ...chest, reward: newRewards[chestIdx] };
      }
      return chest;
    });
    
    return { ...room, chests: updatedChests };
  });
  
  console.log('✅ Treasure Hunt rewards migrated!');
  return { ...event, rooms: updatedRooms };
}
