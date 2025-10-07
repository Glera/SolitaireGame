import { Card, Suit, GameState } from './types';
import { canPlaceOnFoundation, canPlaceOnTableau } from './cardUtils';
import { clearAllDropTargetHighlights } from './styleManager';
import { perfMonitor } from './performanceMonitor';

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
  // Only log when target changes
  if (currentBestTarget !== target) {
    console.log('setCurrentBestTarget:', target ? {
      type: target.type,
      index: target.index,
      suit: target.suit
    } : null);
  }
  
  // If clearing target, also clear visual feedback
  if (!target) {
    clearAllDropTargetHighlights();
  }
  
  currentBestTarget = target;
}

export function getCurrentBestTarget(): DropTarget | null {
  // Reduce logging frequency
  if (Math.random() < 0.2) {
    console.log('getCurrentBestTarget called, returning:', currentBestTarget ? {
      type: currentBestTarget.type,
      index: currentBestTarget.index,
      suit: currentBestTarget.suit
    } : null);
  }
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
  
  console.log('📌 Registered drop target:', 
    target.type, target.index ?? target.suit, 
    'total:', dropTargets.length,
    'bounds:', bounds.left, bounds.top, bounds.width, bounds.height);
}

export function unregisterDropTarget(type: string, index?: number, suit?: Suit) {
  const before = dropTargets.length;
  dropTargets = dropTargets.filter(
    t => !(t.type === type && t.index === index && t.suit === suit)
  );
  const after = dropTargets.length;
  console.log('📌 Unregistered drop target:', type, index ?? suit, 'removed:', before - after, 'remaining:', after);
}

// Cache bounds and update them less frequently for performance
let lastBoundsUpdate = 0;
const BOUNDS_UPDATE_INTERVAL = 100; // Update max 10 times per second

export function updateDropTargetBounds(force = false) {
  const now = Date.now();
  
  // Skip if updated recently (unless forced)
  if (!force && now - lastBoundsUpdate < BOUNDS_UPDATE_INTERVAL) {
    return;
  }
  
  lastBoundsUpdate = now;
  
  perfMonitor.start('updateBounds');
  dropTargets = dropTargets.map(target => ({
    ...target,
    bounds: target.element.getBoundingClientRect()
  }));
  perfMonitor.end('updateBounds');
}

function checkIntersection(rect1: DOMRect, rect2: DOMRect, isMultiCard: boolean = false): boolean {
  let adjustedRect1 = rect1;
  
  // For multi-card drag, use even smaller area - just the top half of the card
  // This prevents false positives when dragging stacks
  if (isMultiCard && rect1.height > rect1.width * 1.5) {
    const originalBottom = rect1.bottom;
    adjustedRect1 = {
      top: rect1.top,
      bottom: rect1.top + (rect1.width * 0.75), // Use half the card height for stricter detection
      left: rect1.left,
      right: rect1.right,
      width: rect1.width,
      height: rect1.width * 0.75,
      x: rect1.x,
      y: rect1.y
    } as DOMRect;
    
    // Debug logging
    const intersects = !(
      adjustedRect1.right < rect2.left ||
      adjustedRect1.left > rect2.right ||
      adjustedRect1.bottom < rect2.top ||
      adjustedRect1.top > rect2.bottom
    );
    
    if (intersects) {
      console.log('🔍 Multi-card INTERSECTION DETECTED:', {
        originalHeight: rect1.height,
        adjustedHeight: adjustedRect1.bottom - adjustedRect1.top,
        width: rect1.width,
        rect1: { top: rect1.top, bottom: originalBottom, left: rect1.left, right: rect1.right },
        adjusted: { top: adjustedRect1.top, bottom: adjustedRect1.bottom, left: adjustedRect1.left, right: adjustedRect1.right },
        rect2: { top: rect2.top, bottom: rect2.bottom, left: rect2.left, right: rect2.right },
        checks: {
          rightCheck: `${adjustedRect1.right} < ${rect2.left} = ${adjustedRect1.right < rect2.left}`,
          leftCheck: `${adjustedRect1.left} > ${rect2.right} = ${adjustedRect1.left > rect2.right}`,
          bottomCheck: `${adjustedRect1.bottom} < ${rect2.top} = ${adjustedRect1.bottom < rect2.top}`,
          topCheck: `${adjustedRect1.top} > ${rect2.bottom} = ${adjustedRect1.top > rect2.bottom}`
        }
      });
    }
  }
  
  // Optimized intersection check without logging
  return !(
    adjustedRect1.right < rect2.left ||
    adjustedRect1.left > rect2.right ||
    adjustedRect1.bottom < rect2.top ||
    adjustedRect1.top > rect2.bottom
  );
}

function getIntersectionArea(rect1: DOMRect, rect2: DOMRect, isMultiCard: boolean = false): number {
  let adjustedRect1 = rect1;
  
  // For multi-card drag, use same smaller area as collision detection
  if (isMultiCard && rect1.height > rect1.width * 1.5) {
    adjustedRect1 = {
      top: rect1.top,
      bottom: rect1.top + (rect1.width * 0.75), // Use half the card height for stricter detection
      left: rect1.left,
      right: rect1.right,
      width: rect1.width,
      height: rect1.width * 0.75,
      x: rect1.x,
      y: rect1.y
    } as DOMRect;
  }
  
  const xOverlap = Math.max(0, Math.min(adjustedRect1.right, rect2.right) - Math.max(adjustedRect1.left, rect2.left));
  const yOverlap = Math.max(0, Math.min(adjustedRect1.bottom, rect2.bottom) - Math.max(adjustedRect1.top, rect2.top));
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
  perfMonitor.start('findBestDropTarget');
  
  // Update bounds before checking
  updateDropTargetBounds();
  
  // Disable logging for performance
  // console.log('findBestDropTarget called:', {
  //   dragBounds: { left: dragBounds.left, top: dragBounds.top, right: dragBounds.right, bottom: dragBounds.bottom },
  //   registeredTargets: dropTargets.length,
  //   draggedCard: draggedCards[0]?.id
  // });
  
  // Find all intersecting targets using cached bounds
  const isMultiCard = draggedCards.length > 1;
  
  // Debug: log drag info (commented out for performance)
  // if (isMultiCard && Math.random() < 0.1) {
  //   console.log('🎴 Dragging multiple cards:', {
  //     count: draggedCards.length,
  //     isMultiCard,
  //     dragBounds: { 
  //       top: dragBounds.top, 
  //       bottom: dragBounds.bottom, 
  //       left: dragBounds.left, 
  //       right: dragBounds.right,
  //       width: dragBounds.width,
  //       height: dragBounds.height
  //     }
  //   });
  // }
  
  const intersectingTargets = dropTargets.filter(target => {
    // Use cached bounds for performance (updated periodically)
    if (!target.bounds || !checkIntersection(dragBounds, target.bounds, isMultiCard)) {
      return false;
    }
    
    // Reduced logging for performance
    // console.log('Found intersection with:', {
    //   type: target.type,
    //   index: target.index,
    //   targetBounds: { left: target.bounds.left, top: target.bounds.top, right: target.bounds.right, bottom: target.bounds.bottom }
    // });
    
    // Check if move is valid
    if (target.type === 'foundation' && target.suit) {
      // Don't allow dropping back to the same foundation
      if (sourceType === 'foundation' && sourceFoundation === target.suit) {
        // console.log('Filtered: same foundation');
        return false;
      }
      // Can only move single card to foundation
      if (draggedCards.length !== 1) {
        // console.log('Filtered: multiple cards to foundation');
        return false;
      }
      const canPlace = canPlaceOnFoundation(gameState.foundations[target.suit], draggedCards[0]);
      // if (!canPlace) console.log('Filtered: invalid foundation placement');
      return canPlace;
    } else if (target.type === 'tableau' && target.index !== undefined) {
      // Don't allow dropping back to the same tableau column
      if (sourceType === 'tableau' && sourceIndex === target.index) {
        // console.log('Filtered: same tableau column', sourceIndex, target.index);
        return false;
      }
      const targetColumn = gameState.tableau[target.index];
      if (targetColumn.length === 0) {
        // Can place King on empty column
        const isKing = draggedCards[0].rank === 'K';
        // if (!isKing) console.log('Filtered: not King on empty column');
        return isKing;
      }
      const bottomCard = targetColumn[targetColumn.length - 1];
      const canPlace = canPlaceOnTableau(bottomCard, draggedCards[0]);
      // if (!canPlace) {
      //   console.log('Filtered: invalid tableau placement', 
      //     `${bottomCard.rank} of ${bottomCard.suit}`, 'cannot accept',
      //     `${draggedCards[0].rank} of ${draggedCards[0].suit}`);
      // }
      return canPlace;
    }
    
    return false;
  });
  
  // console.log('Total intersecting targets:', intersectingTargets.length);
  
  if (intersectingTargets.length === 0) {
    perfMonitor.end('findBestDropTarget');
    return null;
  }
  
  if (intersectingTargets.length === 1) {
    perfMonitor.end('findBestDropTarget');
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
    const intersectionArea = getIntersectionArea(dragBounds, target.bounds, isMultiCard);
    
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
  
  const result = targetsWithDistance[0].target;
  perfMonitor.end('findBestDropTarget');
  return result;
}

export function getDropTargets() {
  return dropTargets;
}