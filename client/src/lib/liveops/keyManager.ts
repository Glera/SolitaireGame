/**
 * @deprecated This file is kept for backward compatibility.
 * Please import from './treasureHunt/keyManager' instead.
 * 
 * Key management is now part of the TreasureHunt module.
 */

// Re-export everything from the new location
export {
  distributeKeys,
  addKeyToCard,
  cardHasKey,
  collectKeyFromCard,
  getCardsWithKeys,
  clearAllKeys,
  getKeyCount,
  setCallbacks
} from './treasureHunt/keyManager';

// Legacy callback setters for backward compatibility
import { setCallbacks } from './treasureHunt/keyManager';

export function setOnKeyCollectedCallback(callback: (cardId: string, startX: number, startY: number) => void): void {
  setCallbacks({ onKeyCollected: callback });
}

export function setOnKeysChangedCallback(callback: () => void): void {
  setCallbacks({ onKeysChanged: callback });
}

export function setOnKeyDropCallback(callback: (cardId: string, targetX: number, targetY: number) => void): void {
  setCallbacks({ onKeyDrop: callback });
}

export function getOnKeyDropCallback() {
  // This is deprecated - callbacks are managed internally now
  return null;
}
