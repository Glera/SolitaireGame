/**
 * Dungeon Dig - Shovel Manager
 * 
 * Manages which cards have shovels attached and handles shovel collection.
 * This module bridges between the game (cards) and the event (shovels).
 */

import { DungeonDigCallbacks } from './types';

// Internal state
let cardsWithShovels = new Set<string>();
let callbacks: DungeonDigCallbacks = {};

/**
 * Set callbacks for shovel events
 */
export function setCallbacks(newCallbacks: DungeonDigCallbacks): void {
  callbacks = { ...callbacks, ...newCallbacks };
}

/**
 * Get current callbacks
 */
export function getCallbacks(): DungeonDigCallbacks {
  return callbacks;
}

/**
 * Distribute shovels to random cards at game start
 * 
 * @param faceDownCardIds Cards that are face down (preferred)
 * @param faceUpCardIds Cards that are face up
 * @param eventActive Whether the dungeon dig event is active
 * @returns Set of card IDs that will have shovels
 */
export function distributeShovels(
  faceDownCardIds: string[], 
  faceUpCardIds: string[], 
  eventActive: boolean
): Set<string> {
  cardsWithShovels.clear();
  callbacks.onShovelsChanged?.();
  
  if (!eventActive) {
    return cardsWithShovels;
  }
  
  // 2-4 shovels per game
  const shovelsToPlace = Math.floor(Math.random() * 3) + 2;
  
  // Shuffle cards
  const shuffledFaceDown = [...faceDownCardIds].sort(() => Math.random() - 0.5);
  const shuffledFaceUp = [...faceUpCardIds].sort(() => Math.random() - 0.5);
  
  // Pick which cards will get shovels (70% preference for face-down)
  const cardsToGetShovels: string[] = [];
  let faceDownIndex = 0;
  let faceUpIndex = 0;
  
  while (cardsToGetShovels.length < shovelsToPlace) {
    if (faceDownIndex < shuffledFaceDown.length && 
        (Math.random() < 0.7 || faceUpIndex >= shuffledFaceUp.length)) {
      cardsToGetShovels.push(shuffledFaceDown[faceDownIndex]);
      faceDownIndex++;
    } else if (faceUpIndex < shuffledFaceUp.length) {
      cardsToGetShovels.push(shuffledFaceUp[faceUpIndex]);
      faceUpIndex++;
    } else {
      break;
    }
  }
  
  // Pre-calculate card positions to avoid reflows
  const SHOVEL_DROP_DELAY = 350;
  const cardPositions: Map<string, { x: number; y: number }> = new Map();
  
  cardsToGetShovels.forEach(cardId => {
    const cardEl = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      cardPositions.set(cardId, {
        x: rect.left + 12,
        y: rect.bottom - 12
      });
    }
  });
  
  // Animate shovels dropping sequentially
  cardsToGetShovels.forEach((cardId, index) => {
    setTimeout(() => {
      const pos = cardPositions.get(cardId);
      if (pos && callbacks.onShovelDrop) {
        callbacks.onShovelDrop(cardId, pos.x, pos.y);
      }
      console.log(`🪏 Shovel ${index + 1}/${cardsToGetShovels.length} dropping on card ${cardId}`);
    }, index * SHOVEL_DROP_DELAY);
  });
  
  console.log(`🪏 Scheduling ${cardsToGetShovels.length} shovels to drop on cards:`, cardsToGetShovels);
  
  return cardsWithShovels;
}

/**
 * Add a shovel to a card (called by animation when shovel lands)
 */
export function addShovelToCard(cardId: string): void {
  cardsWithShovels.add(cardId);
  setTimeout(() => {
    callbacks.onShovelsChanged?.();
  }, 0);
}

/**
 * Check if a card has a shovel
 */
export function cardHasShovel(cardId: string): boolean {
  return cardsWithShovels.has(cardId);
}

/**
 * Collect shovel from a card (called when card moves to foundation)
 * 
 * @param cardId The card ID
 * @param startX X position to start flying animation from
 * @param startY Y position to start flying animation from
 * @returns true if a shovel was collected
 */
export function collectShovelFromCard(
  cardId: string, 
  startX?: number, 
  startY?: number
): boolean {
  if (cardsWithShovels.has(cardId)) {
    cardsWithShovels.delete(cardId);
    
    if (callbacks.onShovelCollected && startX !== undefined && startY !== undefined) {
      callbacks.onShovelCollected(cardId, startX, startY);
    }
    
    return true;
  }
  return false;
}

/**
 * Get all cards that currently have shovels
 */
export function getCardsWithShovels(): Set<string> {
  return new Set(cardsWithShovels);
}

/**
 * Clear all shovels (for reset)
 */
export function clearAllShovels(): void {
  cardsWithShovels.clear();
  callbacks.onShovelsChanged?.();
}

/**
 * Get count of shovels on cards
 */
export function getShovelCount(): number {
  return cardsWithShovels.size;
}
