/**
 * Dungeon Dig LiveOps Event - Type Definitions
 * 
 * Players collect shovels from cards and use them to dig through dungeon tiles.
 * Top-down view: start from entry, find the exit to proceed to next floor.
 * Grid size varies by floor:
 *   - Floors 1-3: 4x4 (16 tiles)
 *   - Floors 4-7: 5x5 (25 tiles)
 *   - Floors 8-10: 6x6 (36 tiles)
 */

import { PackRarity } from '../pointsEvent';

// Reward that can be found under a tile
export interface TileReward {
  type: 'stars' | 'pack' | 'exit' | 'empty';
  stars?: number;
  packRarity?: PackRarity;
}

// Individual tile in the dungeon
export interface DungeonTile {
  id: string;
  row: number;      // 0 to (gridSize-1) within floor
  col: number;      // 0 to (gridSize-1)
  dug: boolean;
  reward: TileReward;
  isEntry: boolean; // Entry point - always accessible, pre-revealed
}

// Floor containing multiple rows of tiles
export interface DungeonFloor {
  id: number;
  tiles: DungeonTile[];  // Variable size: 16/25/36 tiles depending on floor
  entryTileId: string;   // ID of the entry tile
  exitTileId: string;    // ID of the exit tile (hidden until dug)
  completed: boolean;
}

// Main event state
export interface DungeonDigEvent {
  id: string;
  active: boolean;
  activated: boolean;
  activatedAt: number | null;
  endTime: number | null;
  shovels: number;
  currentFloor: number;
  floors: DungeonFloor[];
  totalFloorsCompleted: number;
  milestoneClaimed: number[];  // Floor indices where milestone was claimed
}

// Result of digging a tile
export interface DigTileResult {
  event: DungeonDigEvent;
  reward: TileReward | null;
  floorCompleted: boolean;
  milestoneUnlocked?: number;
}

// Milestone reward for completing a floor
export interface MilestoneReward {
  stars?: number;
  packRarity?: PackRarity;
}

// Configuration for the event
export interface DungeonDigConfig {
  eventDurationMinutes: number;
  totalFloors: number;
  rowsPerFloor: number;
  tilesPerRow: number;
  requiredLevel: number;
  milestoneRewards: Record<number, MilestoneReward>;  // Floor index -> reward
}

// Callbacks for event communication with the game
export interface DungeonDigCallbacks {
  onShovelCollected?: (cardId: string, startX: number, startY: number) => void;
  onShovelsChanged?: () => void;
  onShovelDrop?: (cardId: string, targetX: number, targetY: number) => void;
  onEventStateChanged?: (event: DungeonDigEvent) => void;
}
