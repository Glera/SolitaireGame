import { Card, Suit, GameState } from './types';
import { canPlaceOnFoundation, canPlaceOnTableau } from './cardUtils';

export interface DropTarget {
  type: 'tableau' | 'foundation';
  index?: number;
  suit?: Suit;
  element: HTMLElement;
  bounds: DOMRect;
}

// Global registry of drop targets
let dropTargets: DropTarget[] = [];

// Global state for the current best drop target during drag
let currentBestTarget: DropTarget | null = null;

export function setCurrentBestTarget(target: DropTarget | null) {
  currentBestTarget = target;
}

export function getCurrentBestTarget(): DropTarget | null {
  return currentBestTarget;
}

export function registerDropTarget(target: Omit<DropTarget, 'bounds'>) {
  const bounds = target.element.getBoundingClientRect();
  const existingIndex = dropTargets.findIndex(
    t => t.type === target.type && 
    t.index === target.index && 
    t.suit === target.suit
  );
  
  if (existingIndex >= 0) {
    dropTargets[existingIndex] = { ...target, bounds };
  } else {
    dropTargets.push({ ...target, bounds });
  }
}

export function unregisterDropTarget(type: string, index?: number, suit?: Suit) {
  dropTargets = dropTargets.filter(
    t => !(t.type === type && t.index === index && t.suit === suit)
  );
}

export function updateDropTargetBounds() {
  dropTargets = dropTargets.map(target => ({
    ...target,
    bounds: target.element.getBoundingClientRect()
  }));
}

function checkIntersection(rect1: DOMRect, rect2: DOMRect): boolean {
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  );
}

function getIntersectionArea(rect1: DOMRect, rect2: DOMRect): number {
  const xOverlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
  const yOverlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
  return xOverlap * yOverlap;
}

export function findBestDropTarget(
  dragBounds: DOMRect,
  cursorPos: { x: number, y: number },
  draggedCards: Card[],
  gameState: GameState,
  sourceType: 'tableau' | 'waste' | 'foundation',
  sourceIndex?: number,
  sourceFoundation?: Suit
): DropTarget | null {
  // Update bounds before checking
  updateDropTargetBounds();
  
  // Find all intersecting targets
  const intersectingTargets = dropTargets.filter(target => {
    // Check physical intersection
    if (!checkIntersection(dragBounds, target.bounds)) {
      return false;
    }
    
    // Check if move is valid
    if (target.type === 'foundation' && target.suit) {
      // Don't allow dropping back to the same foundation
      if (sourceType === 'foundation' && sourceFoundation === target.suit) {
        return false;
      }
      // Can only move single card to foundation
      if (draggedCards.length !== 1) return false;
      return canPlaceOnFoundation(gameState.foundations[target.suit], draggedCards[0]);
    } else if (target.type === 'tableau' && target.index !== undefined) {
      // Don't allow dropping back to the same tableau column
      if (sourceType === 'tableau' && sourceIndex === target.index) {
        return false;
      }
      const targetColumn = gameState.tableau[target.index];
      if (targetColumn.length === 0) {
        // Can place King on empty column
        return draggedCards[0].rank === 'K';
      }
      const bottomCard = targetColumn[targetColumn.length - 1];
      return canPlaceOnTableau(bottomCard, draggedCards[0]);
    }
    
    return false;
  });
  
  if (intersectingTargets.length === 0) {
    return null;
  }
  
  if (intersectingTargets.length === 1) {
    return intersectingTargets[0];
  }
  
  // Multiple targets - use cursor position as tiebreaker
  // Calculate distance from cursor to each target center
  const targetsWithDistance = intersectingTargets.map(target => {
    const centerX = target.bounds.left + target.bounds.width / 2;
    const centerY = target.bounds.top + target.bounds.height / 2;
    const distance = Math.sqrt(
      Math.pow(cursorPos.x - centerX, 2) + 
      Math.pow(cursorPos.y - centerY, 2)
    );
    
    // Also consider intersection area
    const intersectionArea = getIntersectionArea(dragBounds, target.bounds);
    
    return {
      target,
      distance,
      intersectionArea
    };
  });
  
  // Sort by intersection area first (larger is better), then by distance (smaller is better)
  targetsWithDistance.sort((a, b) => {
    // Prefer larger intersection area
    const areaDiff = b.intersectionArea - a.intersectionArea;
    if (Math.abs(areaDiff) > 100) { // Significant area difference
      return areaDiff;
    }
    // Otherwise use distance
    return a.distance - b.distance;
  });
  
  return targetsWithDistance[0].target;
}

export function getDropTargets() {
  return dropTargets;
}