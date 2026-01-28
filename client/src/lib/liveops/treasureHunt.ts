/**
 * @deprecated This file is kept for backward compatibility.
 * Please import from './treasureHunt/index' instead.
 * 
 * All functionality has been moved to the treasureHunt/ folder:
 * - types.ts - Type definitions
 * - logic.ts - Pure business logic
 * - storage.ts - localStorage operations
 * - keyManager.ts - Key distribution and collection
 * - store.ts - Zustand state management
 * - index.ts - Public API
 */

// Re-export everything from the new modular structure
export * from './treasureHunt/index';

// Also re-export types for convenience
export type {
  TreasureHuntEvent,
  TreasureChest,
  TreasureRoom,
  ChestReward,
  TreasureHuntConfig,
  TreasureHuntCallbacks
} from './treasureHunt/types';
