/**
 * Dungeon Dig - Business Logic
 * 
 * Top-down dungeon view. Start from entry, find exit to go to next floor.
 * Tiles become accessible when adjacent to already-dug tiles or entry.
 * Progressive grid sizes: 4x4 (floors 1-3), 5x5 (floors 4-7), 6x6 (floors 8-10).
 */

import { PackRarity } from '../pointsEvent';
import {
  DungeonDigEvent,
  DungeonFloor,
  DungeonTile,
  TileReward,
  DungeonDigConfig,
  DigTileResult
} from './types';

// Default configuration
export const DEFAULT_CONFIG: DungeonDigConfig = {
  eventDurationMinutes: 5,    // 5 minutes for testing
  totalFloors: 10,
  rowsPerFloor: 6,            // Default 6 rows (overridden by getFloorGridSize)
  tilesPerRow: 6,             // Default 6 columns (overridden by getFloorGridSize)
  requiredLevel: 3,
  milestoneRewards: {
    3: { stars: 30, packRarity: 1 },   // Floor 4 (index 3) - 30 stars + common pack
    6: { stars: 50, packRarity: 3 },   // Floor 7 (index 6) - 50 stars + rare pack
    9: { stars: 100, packRarity: 4 }   // Floor 10 (index 9) - 100 stars + epic pack
  }
};

/**
 * Get grid size for a specific floor
 * Floors 1-3 (indices 0-2): 4x4
 * Floors 4-7 (indices 3-6): 5x5
 * Floors 8-10 (indices 7-9): 6x6
 */
export function getFloorGridSize(floorIndex: number): { rows: number; cols: number } {
  if (floorIndex <= 2) {
    return { rows: 4, cols: 4 };   // Floors 1-3: 4x4 = 16 tiles
  } else if (floorIndex <= 6) {
    return { rows: 5, cols: 5 };   // Floors 4-7: 5x5 = 25 tiles
  } else {
    return { rows: 6, cols: 6 };   // Floors 8-10: 6x6 = 36 tiles
  }
}

/**
 * Generate a random pack rarity based on floor number
 */
export function generatePackRarity(floorNumber: number): PackRarity {
  const roll = Math.random();
  
  const purpleChance = 0.02 + floorNumber * 0.02;
  const blueChance = 0.08 + floorNumber * 0.02;
  const greenChance = 0.25 + floorNumber * 0.02;
  
  if (roll < purpleChance * 0.3) {
    return 5; // Legendary
  } else if (roll < purpleChance) {
    return 4; // Epic
  } else if (roll < purpleChance + blueChance) {
    return 3; // Rare
  } else if (roll < purpleChance + blueChance + greenChance) {
    return 2; // Uncommon
  }
  return 1; // Common
}

/**
 * Get adjacent tile positions (up, down, left, right - no diagonals)
 */
export function getAdjacentPositions(row: number, col: number, gridSize: { rows: number; cols: number }): { row: number; col: number }[] {
  const positions: { row: number; col: number }[] = [];
  
  // Up
  if (row > 0) positions.push({ row: row - 1, col });
  // Down
  if (row < gridSize.rows - 1) positions.push({ row: row + 1, col });
  // Left
  if (col > 0) positions.push({ row, col: col - 1 });
  // Right
  if (col < gridSize.cols - 1) positions.push({ row, col: col + 1 });
  
  return positions;
}

/**
 * Generate a floor with tiles
 */
export function generateFloor(
  floorNumber: number,
  config: DungeonDigConfig = DEFAULT_CONFIG
): DungeonFloor {
  // Get grid size for this specific floor
  const gridSize = getFloorGridSize(floorNumber);
  const tileCount = gridSize.rows * gridSize.cols;
  const tiles: DungeonTile[] = [];
  
  // Pick random entry position (prefer edges for interesting layouts)
  const entryRow = Math.random() < 0.5 ? 0 : Math.floor(Math.random() * gridSize.rows);
  const entryCol = entryRow === 0 
    ? Math.floor(Math.random() * gridSize.cols)
    : (Math.random() < 0.5 ? 0 : gridSize.cols - 1);
  
  // Pick random exit position (should be far from entry)
  // Minimum distance depends on grid size
  const minDistance = Math.max(2, Math.floor(Math.min(gridSize.rows, gridSize.cols) * 0.6));
  let exitRow: number, exitCol: number;
  do {
    exitRow = Math.floor(Math.random() * gridSize.rows);
    exitCol = Math.floor(Math.random() * gridSize.cols);
    // Ensure exit is at least minDistance tiles away from entry (manhattan distance)
  } while (Math.abs(exitRow - entryRow) + Math.abs(exitCol - entryCol) < minDistance);
  
  const entryTileId = `floor_${floorNumber}_tile_${entryRow}_${entryCol}`;
  const exitTileId = `floor_${floorNumber}_tile_${exitRow}_${exitCol}`;
  
  // Generate rewards (excluding entry and exit positions)
  const rewardPositions: { row: number; col: number }[] = [];
  for (let row = 0; row < gridSize.rows; row++) {
    for (let col = 0; col < gridSize.cols; col++) {
      if ((row !== entryRow || col !== entryCol) && (row !== exitRow || col !== exitCol)) {
        rewardPositions.push({ row, col });
      }
    }
  }
  
  // Reward chances
  const packChance = 0.08 + (floorNumber * 0.01);
  const starsChance = 0.15 + (floorNumber * 0.01);
  
  // Create all tiles
  for (let row = 0; row < gridSize.rows; row++) {
    for (let col = 0; col < gridSize.cols; col++) {
      const isEntry = row === entryRow && col === entryCol;
      const isExit = row === exitRow && col === exitCol;
      const tileId = `floor_${floorNumber}_tile_${row}_${col}`;
      
      let reward: TileReward;
      
      if (isEntry) {
        reward = { type: 'empty' }; // Entry is always empty
      } else if (isExit) {
        reward = { type: 'exit' }; // Exit leads to next floor
      } else {
        // Random reward
        const roll = Math.random();
        if (roll < packChance) {
          reward = { type: 'pack', packRarity: generatePackRarity(floorNumber) };
        } else if (roll < packChance + starsChance) {
          const starAmount = Math.random() < 0.7 
            ? 2 + Math.floor(Math.random() * 4)
            : 8 + Math.floor(Math.random() * 8) + floorNumber;
          reward = { type: 'stars', stars: starAmount };
        } else {
          reward = { type: 'empty' };
        }
      }
      
      tiles.push({
        id: tileId,
        row,
        col,
        dug: isEntry, // Entry starts as dug (revealed)
        reward,
        isEntry
      });
    }
  }
  
  return {
    id: floorNumber,
    tiles,
    entryTileId,
    exitTileId,
    completed: false
  };
}

/**
 * Generate all floors for the event
 */
export function generateFloors(config: DungeonDigConfig = DEFAULT_CONFIG): DungeonFloor[] {
  const floors: DungeonFloor[] = [];
  
  for (let i = 0; i < config.totalFloors; i++) {
    floors.push(generateFloor(i, config));
  }
  
  return floors;
}

/**
 * Create a new event
 */
export function createEvent(config: DungeonDigConfig = DEFAULT_CONFIG): DungeonDigEvent {
  return {
    id: `dungeon_dig_${Date.now()}`,
    active: false,
    activated: false,
    activatedAt: null,
    endTime: null,
    shovels: 0,
    currentFloor: 0,
    floors: generateFloors(config),
    totalFloorsCompleted: 0,
    milestoneClaimed: []
  };
}

/**
 * Activate the event
 */
export function activateEvent(
  event: DungeonDigEvent, 
  config: DungeonDigConfig = DEFAULT_CONFIG
): DungeonDigEvent {
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
export function isEventExpired(event: DungeonDigEvent): boolean {
  return event.endTime !== null && Date.now() > event.endTime;
}

/**
 * Check if player level meets requirement
 */
export function isLevelSufficient(
  playerLevel: number, 
  config: DungeonDigConfig = DEFAULT_CONFIG
): boolean {
  return playerLevel >= config.requiredLevel;
}

/**
 * Add shovels to event
 */
export function addShovels(event: DungeonDigEvent, amount: number): DungeonDigEvent {
  return {
    ...event,
    shovels: event.shovels + amount
  };
}

/**
 * Check if a tile can be dug (must be adjacent to a dug tile)
 */
export function canDigTile(
  floor: DungeonFloor, 
  tile: DungeonTile
): boolean {
  if (tile.dug) return false;
  if (tile.isEntry) return false; // Entry is already dug
  
  // Get grid size for this floor
  const gridSize = getFloorGridSize(floor.id);
  
  // Get adjacent positions
  const adjacentPositions = getAdjacentPositions(tile.row, tile.col, gridSize);
  
  // Check if any adjacent tile is dug
  for (const pos of adjacentPositions) {
    const adjacentTile = floor.tiles.find(t => t.row === pos.row && t.col === pos.col);
    if (adjacentTile && adjacentTile.dug) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get all diggable tiles on current floor
 */
export function getDiggableTiles(
  floor: DungeonFloor
): DungeonTile[] {
  return floor.tiles.filter(tile => canDigTile(floor, tile));
}

/**
 * Dig a tile
 */
export function digTile(
  event: DungeonDigEvent, 
  floorId: number, 
  tileId: string,
  config: DungeonDigConfig = DEFAULT_CONFIG
): DigTileResult {
  if (event.shovels <= 0) {
    return { event, reward: null, floorCompleted: false };
  }
  
  const floor = event.floors[floorId];
  if (!floor) {
    return { event, reward: null, floorCompleted: false };
  }
  
  const tileIndex = floor.tiles.findIndex(t => t.id === tileId);
  if (tileIndex === -1) {
    return { event, reward: null, floorCompleted: false };
  }
  
  const tile = floor.tiles[tileIndex];
  if (tile.dug || !canDigTile(floor, tile)) {
    return { event, reward: null, floorCompleted: false };
  }
  
  // Dig the tile
  const updatedTiles = [...floor.tiles];
  updatedTiles[tileIndex] = { ...tile, dug: true };
  
  const updatedFloor: DungeonFloor = {
    ...floor,
    tiles: updatedTiles
  };
  
  // Check if floor is completed (exit found)
  let floorCompleted = false;
  let milestoneUnlocked: number | undefined;
  let newCurrentFloor = event.currentFloor;
  let newTotalFloorsCompleted = event.totalFloorsCompleted;
  
  if (tile.reward.type === 'exit') {
    floorCompleted = true;
    updatedFloor.completed = true;
    newTotalFloorsCompleted++;
    
    // Check for milestone
    if (config.milestoneRewards[floorId] !== undefined && 
        !event.milestoneClaimed?.includes(floorId)) {
      milestoneUnlocked = floorId;
    }
    
    // Move to next floor
    if (event.currentFloor < config.totalFloors - 1) {
      newCurrentFloor = event.currentFloor + 1;
    }
  }
  
  const updatedFloors = [...event.floors];
  updatedFloors[floorId] = updatedFloor;
  
  const updatedEvent: DungeonDigEvent = {
    ...event,
    floors: updatedFloors,
    shovels: event.shovels - 1,
    currentFloor: newCurrentFloor,
    totalFloorsCompleted: newTotalFloorsCompleted
  };
  
  return {
    event: updatedEvent,
    reward: tile.reward,
    floorCompleted,
    milestoneUnlocked
  };
}

/**
 * Claim milestone reward
 */
export function claimMilestone(
  event: DungeonDigEvent, 
  floorIdx: number,
  config: DungeonDigConfig = DEFAULT_CONFIG
): { event: DungeonDigEvent; reward: import('./types').MilestoneReward | null } {
  const reward = config.milestoneRewards[floorIdx];
  
  const milestoneClaimed = event.milestoneClaimed || [];
  if (!reward || milestoneClaimed.includes(floorIdx)) {
    return { event, reward: null };
  }
  
  return {
    event: {
      ...event,
      milestoneClaimed: [...milestoneClaimed, floorIdx]
    },
    reward
  };
}

/**
 * Get milestone to show (if any)
 */
export function getMilestoneToShow(
  event: DungeonDigEvent,
  config: DungeonDigConfig = DEFAULT_CONFIG
): number | null {
  for (const floorIdx of Object.keys(config.milestoneRewards).map(Number)) {
    if (event.floors[floorIdx]?.completed && !event.milestoneClaimed?.includes(floorIdx)) {
      return floorIdx;
    }
  }
  return null;
}

/**
 * Check if all floors are completed
 */
export function isEventComplete(event: DungeonDigEvent): boolean {
  return event.floors.every(f => f.completed);
}

/**
 * Complete and deactivate the event
 */
export function completeEvent(event: DungeonDigEvent): DungeonDigEvent {
  return {
    ...event,
    active: false
  };
}

/**
 * Get current floor progress
 */
export function getCurrentFloorProgress(event: DungeonDigEvent): { dug: number; total: number } {
  const floor = event.floors[event.currentFloor];
  if (!floor) return { dug: 0, total: 0 };
  
  const dug = floor.tiles.filter(t => t.dug).length;
  return { dug, total: floor.tiles.length };
}

/**
 * Format remaining time (same as TreasureHunt)
 */
export function formatTimeRemaining(endTime: number): string {
  const now = Date.now();
  const remaining = endTime - now;
  
  if (remaining <= 0) return 'Завершено';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  
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
