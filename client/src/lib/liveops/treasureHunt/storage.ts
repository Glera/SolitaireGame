/**
 * Treasure Hunt - Storage Operations
 * 
 * Handles persistence of event state to localStorage.
 * Can be replaced with other storage backends for different platforms.
 */

import { TreasureHuntEvent } from './types';

const STORAGE_KEY = 'treasure_hunt_event';

/**
 * Load event from storage
 */
export function loadEvent(): TreasureHuntEvent | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as TreasureHuntEvent;
    }
  } catch (e) {
    console.error('Failed to load Treasure Hunt event:', e);
  }
  return null;
}

/**
 * Save event to storage
 */
export function saveEvent(event: TreasureHuntEvent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch (e) {
    console.error('Failed to save Treasure Hunt event:', e);
  }
}

/**
 * Clear event from storage (for reset)
 */
export function clearEvent(): void {
  localStorage.removeItem(STORAGE_KEY);
}
