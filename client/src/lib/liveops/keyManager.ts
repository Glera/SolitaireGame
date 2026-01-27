// Key Manager for Treasure Hunt event
// Manages which cards have keys attached

import { getTreasureHuntEvent } from './treasureHunt';

// Set of card IDs that have keys
let cardsWithKeys = new Set<string>();

// Callback for when a key is collected (with start position for animation)
let onKeyCollectedCallback: ((cardId: string, startX: number, startY: number) => void) | null = null;

export function setOnKeyCollectedCallback(callback: (cardId: string, startX: number, startY: number) => void): void {
  onKeyCollectedCallback = callback;
}

// Callback for when keys distribution changes (for UI update)
let onKeysChangedCallback: (() => void) | null = null;

export function setOnKeysChangedCallback(callback: () => void): void {
  onKeysChangedCallback = callback;
}

// Callback for key drop animation (when key lands on a card)
let onKeyDropCallback: ((cardId: string, targetX: number, targetY: number) => void) | null = null;

export function setOnKeyDropCallback(callback: (cardId: string, targetX: number, targetY: number) => void): void {
  onKeyDropCallback = callback;
}

export function getOnKeyDropCallback() {
  return onKeyDropCallback;
}

/**
 * Distribute keys to random cards at game start
 * Prefers face-down cards to create more anticipation
 * Keys are added sequentially with delay for animation
 * @param faceDownCardIds Cards that are face down (preferred)
 * @param faceUpCardIds Cards that are face up
 * @param eventActive Whether the treasure hunt event is active
 * @returns Set of card IDs that have keys (initially empty, fills over time)
 */
export function distributeKeys(faceDownCardIds: string[], faceUpCardIds: string[], eventActive: boolean): Set<string> {
  cardsWithKeys.clear();
  onKeysChangedCallback?.();
  
  if (!eventActive) {
    return cardsWithKeys;
  }
  
  // 2-4 keys per game
  const keysToPlace = Math.floor(Math.random() * 3) + 2;
  
  // Shuffle face-down cards first
  const shuffledFaceDown = [...faceDownCardIds].sort(() => Math.random() - 0.5);
  const shuffledFaceUp = [...faceUpCardIds].sort(() => Math.random() - 0.5);
  
  // Pick which cards will get keys
  const cardsToGetKeys: string[] = [];
  let faceDownIndex = 0;
  let faceUpIndex = 0;
  
  while (cardsToGetKeys.length < keysToPlace) {
    // 70% chance to pick face-down if available
    if (faceDownIndex < shuffledFaceDown.length && (Math.random() < 0.7 || faceUpIndex >= shuffledFaceUp.length)) {
      cardsToGetKeys.push(shuffledFaceDown[faceDownIndex]);
      faceDownIndex++;
    } else if (faceUpIndex < shuffledFaceUp.length) {
      cardsToGetKeys.push(shuffledFaceUp[faceUpIndex]);
      faceUpIndex++;
    } else {
      break; // No more cards
    }
  }
  
  // Add keys sequentially with delay and animation
  const KEY_DROP_DELAY = 350; // ms between each key drop
  
  // Pre-calculate card positions in a single batch to avoid reflows
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
  
  cardsToGetKeys.forEach((cardId, index) => {
    setTimeout(() => {
      const pos = cardPositions.get(cardId);
      if (pos && onKeyDropCallback) {
        onKeyDropCallback(cardId, pos.x, pos.y);
      }
      // Note: Key is added to cardsWithKeys by FlyingKeyDrop when animation ends (via addKeyToCard)
      console.log(`🔑 Key ${index + 1}/${cardsToGetKeys.length} dropping on card ${cardId}`);
    }, index * KEY_DROP_DELAY);
  });
  
  console.log(`🔑 Scheduling ${cardsToGetKeys.length} keys to drop on cards:`, cardsToGetKeys);
  
  return cardsWithKeys;
}

/**
 * Immediately add a key to a card (used by FlyingKeyDrop when key lands)
 * Uses setTimeout to defer the UI update callback so it doesn't block animations
 */
export function addKeyToCard(cardId: string): void {
  cardsWithKeys.add(cardId);
  // Defer callback to next tick to avoid blocking animation frames
  setTimeout(() => {
    onKeysChangedCallback?.();
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
 * @param cardId The card ID
 * @param startX X position to start flying animation from
 * @param startY Y position to start flying animation from
 * @returns true if a key was collected
 */
export function collectKeyFromCard(cardId: string, startX?: number, startY?: number): boolean {
  if (cardsWithKeys.has(cardId)) {
    cardsWithKeys.delete(cardId);
    
    if (onKeyCollectedCallback && startX !== undefined && startY !== undefined) {
      onKeyCollectedCallback(cardId, startX, startY);
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
}
