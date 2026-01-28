/**
 * Treasure Hunt - Key Manager
 * 
 * Manages which cards have keys attached and handles key collection.
 * This module bridges between the game (cards) and the event (keys).
 */

import { TreasureHuntCallbacks } from './types';

// Internal state
let cardsWithKeys = new Set<string>();
let callbacks: TreasureHuntCallbacks = {};

/**
 * Set callbacks for key events
 */
export function setCallbacks(newCallbacks: TreasureHuntCallbacks): void {
  callbacks = { ...callbacks, ...newCallbacks };
}

/**
 * Get current callbacks (for internal use)
 */
export function getCallbacks(): TreasureHuntCallbacks {
  return callbacks;
}

/**
 * Distribute keys to random cards at game start
 * Prefers face-down cards to create more anticipation
 * 
 * @param faceDownCardIds Cards that are face down (preferred)
 * @param faceUpCardIds Cards that are face up
 * @param eventActive Whether the treasure hunt event is active
 * @returns Set of card IDs that will have keys (initially empty, fills via animation)
 */
export function distributeKeys(
  faceDownCardIds: string[], 
  faceUpCardIds: string[], 
  eventActive: boolean
): Set<string> {
  cardsWithKeys.clear();
  callbacks.onKeysChanged?.();
  
  if (!eventActive) {
    return cardsWithKeys;
  }
  
  // 2-4 keys per game
  const keysToPlace = Math.floor(Math.random() * 3) + 2;
  
  // Shuffle cards
  const shuffledFaceDown = [...faceDownCardIds].sort(() => Math.random() - 0.5);
  const shuffledFaceUp = [...faceUpCardIds].sort(() => Math.random() - 0.5);
  
  // Pick which cards will get keys (70% preference for face-down)
  const cardsToGetKeys: string[] = [];
  let faceDownIndex = 0;
  let faceUpIndex = 0;
  
  while (cardsToGetKeys.length < keysToPlace) {
    if (faceDownIndex < shuffledFaceDown.length && 
        (Math.random() < 0.7 || faceUpIndex >= shuffledFaceUp.length)) {
      cardsToGetKeys.push(shuffledFaceDown[faceDownIndex]);
      faceDownIndex++;
    } else if (faceUpIndex < shuffledFaceUp.length) {
      cardsToGetKeys.push(shuffledFaceUp[faceUpIndex]);
      faceUpIndex++;
    } else {
      break;
    }
  }
  
  // Pre-calculate card positions to avoid reflows
  const KEY_DROP_DELAY = 350;
  const cardPositions: Map<string, { x: number; y: number }> = new Map();
  
  cardsToGetKeys.forEach(cardId => {
    const cardEl = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      cardPositions.set(cardId, {
        x: rect.left + 12,
        y: rect.bottom - 12
      });
    }
  });
  
  // Animate keys dropping sequentially
  cardsToGetKeys.forEach((cardId, index) => {
    setTimeout(() => {
      const pos = cardPositions.get(cardId);
      if (pos && callbacks.onKeyDrop) {
        callbacks.onKeyDrop(cardId, pos.x, pos.y);
      }
      console.log(`🔑 Key ${index + 1}/${cardsToGetKeys.length} dropping on card ${cardId}`);
    }, index * KEY_DROP_DELAY);
  });
  
  console.log(`🔑 Scheduling ${cardsToGetKeys.length} keys to drop on cards:`, cardsToGetKeys);
  
  return cardsWithKeys;
}

/**
 * Add a key to a card (called by animation when key lands)
 * Uses setTimeout to defer the UI update callback
 */
export function addKeyToCard(cardId: string): void {
  cardsWithKeys.add(cardId);
  setTimeout(() => {
    callbacks.onKeysChanged?.();
  }, 0);
}

/**
 * Check if a card has a key
 */
export function cardHasKey(cardId: string): boolean {
  return cardsWithKeys.has(cardId);
}

/**
 * Collect key from a card (called when card moves to foundation)
 * 
 * @param cardId The card ID
 * @param startX X position to start flying animation from
 * @param startY Y position to start flying animation from
 * @returns true if a key was collected
 */
export function collectKeyFromCard(
  cardId: string, 
  startX?: number, 
  startY?: number
): boolean {
  if (cardsWithKeys.has(cardId)) {
    cardsWithKeys.delete(cardId);
    
    if (callbacks.onKeyCollected && startX !== undefined && startY !== undefined) {
      callbacks.onKeyCollected(cardId, startX, startY);
    }
    
    console.log(`🔑 Key collected from card ${cardId}! Remaining keys: ${cardsWithKeys.size}`);
    return true;
  }
  return false;
}

/**
 * Get all cards that currently have keys
 */
export function getCardsWithKeys(): Set<string> {
  return new Set(cardsWithKeys);
}

/**
 * Clear all keys (for reset)
 */
export function clearAllKeys(): void {
  cardsWithKeys.clear();
  callbacks.onKeysChanged?.();
}

/**
 * Get count of keys on cards
 */
export function getKeyCount(): number {
  return cardsWithKeys.size;
}
