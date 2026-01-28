/**
 * Dungeon Dig - Storage Operations
 * 
 * Handles persistence of event state to localStorage.
 */

import { DungeonDigEvent } from './types';

const STORAGE_KEY = 'dungeon_dig_event';

/**
 * Load event from storage
 */
export function loadEvent(): DungeonDigEvent | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as DungeonDigEvent;
    }
  } catch (e) {
    console.error('Failed to load Dungeon Dig event:', e);
  }
  return null;
}

/**
 * Save event to storage
 */
export function saveEvent(event: DungeonDigEvent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch (e) {
    console.error('Failed to save Dungeon Dig event:', e);
  }
}

/**
 * Clear event from storage (for reset)
 */
export function clearEvent(): void {
  localStorage.removeItem(STORAGE_KEY);
}
