import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

// Rarity glow colors (matching RARITY_COLORS in Collections.tsx)
const RARITY_GLOW_COLORS: Record<number, { main: string; secondary: string }> = {
  1: { main: 'rgba(156, 163, 175, 1)', secondary: 'rgba(156, 163, 175, 0.6)' }, // gray
  2: { main: 'rgba(34, 197, 94, 1)', secondary: 'rgba(34, 197, 94, 0.6)' }, // green
  3: { main: 'rgba(59, 130, 246, 1)', secondary: 'rgba(59, 130, 246, 0.6)' }, // blue
  4: { main: 'rgba(168, 85, 247, 1)', secondary: 'rgba(168, 85, 247, 0.6)' }, // purple
  5: { main: 'rgba(245, 158, 11, 1)', secondary: 'rgba(245, 158, 11, 0.6)' }, // gold/orange
};

interface FlyingCollectionIconProps {
  icon: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete: () => void;
  isUnique?: boolean; // True if this is a NEW item (not duplicate)
  rarity?: number; // 1-5 for glow color
}

export function FlyingCollectionIcon({ 
  icon, 
  startX, 
  startY, 
  endX, 
  endY, 
  onComplete,
  isUnique = false,
  rarity = 1
}: FlyingCollectionIconProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  
  // Update ref to avoid stale closure
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  useEffect(() => {
    if (!elementRef.current) return;
    
    // Physics parameters for parabolic flight
    const totalDuration = 1200; // ms - slower for better visibility
    const gravity = 1200; // pixels per second^2
    
    // Calculate horizontal distance and direction
    const dx = endX - startX;
    const dy = endY - startY;
    
    // Initial velocity - throw upward and toward target
    // We want to reach endX, endY after totalDuration
    // Using kinematic equations:
    // x(t) = x0 + vx0 * t
    // y(t) = y0 + vy0 * t + 0.5 * g * t^2
    
    const t = totalDuration / 1000; // Convert to seconds
    const vx0 = dx / t; // Horizontal velocity (constant)
    
    // For vertical: endY = startY + vy0 * t + 0.5 * g * t^2
    // vy0 = (endY - startY - 0.5 * g * t^2) / t
    const vy0 = (dy - 0.5 * gravity * t * t) / t;
    
    // This gives us an initial upward velocity (negative vy0) that will arc and fall
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / totalDuration, 1);
      const timeInSeconds = elapsed / 1000;
      
      // Calculate position using kinematic equations
      const x = startX + vx0 * timeInSeconds;
      const y = startY + vy0 * timeInSeconds + 0.5 * gravity * timeInSeconds * timeInSeconds;
      
      // Update position directly via DOM
      if (elementRef.current) {
        elementRef.current.style.left = `${x}px`;
        elementRef.current.style.top = `${y}px`;
        
        // Add slight rotation based on velocity direction
        const currentVy = vy0 + gravity * timeInSeconds;
        const angle = Math.atan2(currentVy, vx0) * (180 / Math.PI);
        elementRef.current.style.transform = `translate(-50%, -50%) rotate(${angle * 0.3}deg)`;
      }
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        setIsVisible(false);
        onCompleteRef.current();
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [startX, startY, endX, endY]);
  
  if (!isVisible) return null;
  
  // Get rarity-based glow colors
  const glowColors = RARITY_GLOW_COLORS[rarity] || RARITY_GLOW_COLORS[1];
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: startX,
        top: startY,
        transform: 'translate(-50%, -50%)',
        fontSize: '28px',
        // Rarity-colored glow for unique items, simple shadow for duplicates
        filter: isUnique 
          ? `drop-shadow(0 0 8px ${glowColors.main}) drop-shadow(0 0 16px ${glowColors.main}) drop-shadow(0 0 24px ${glowColors.secondary})`
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        willChange: 'transform, left, top',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      {/* Pulsing ring for unique items - color based on rarity */}
      {isUnique && (
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${glowColors.secondary} 0%, transparent 70%)`,
            animation: 'uniqueItemPulse 0.5s ease-in-out infinite alternate',
            transform: 'scale(2)',
            pointerEvents: 'none',
          }}
        />
      )}
      {icon}
      {/* Add keyframes via style tag */}
      {isUnique && (
        <style>{`
          @keyframes uniqueItemPulse {
            0% { opacity: 0.6; transform: scale(1.8); }
            100% { opacity: 1; transform: scale(2.2); }
          }
        `}</style>
      )}
    </div>,
    document.body
  );
}

// Manager for collection drops
interface PendingDrop {
  id: string;
  icon: string;
  itemId: string;
  collectionId: string;
  startX: number;
  startY: number;
  isDuplicate?: boolean;
  rarity?: number; // 1-5
}

let dropCallback: ((collectionId: string, itemId: string) => void) | null = null;
let flyingIconCallback: ((drop: PendingDrop) => void) | null = null;
let collectionsButtonRect: { x: number; y: number } | null = null;

export function setDropCallback(callback: (collectionId: string, itemId: string) => void) {
  dropCallback = callback;
}

export function setFlyingIconCallback(callback: (drop: PendingDrop) => void) {
  flyingIconCallback = callback;
}

export function setCollectionsButtonPosition(x: number, y: number) {
  collectionsButtonRect = { x, y };
}

export function getCollectionsButtonPosition() {
  return collectionsButtonRect;
}

// ============ NEW DROP SYSTEM: 1-10 items per game, probability increases with progress ============
// Storage keys
const GAME_DROPS_KEY = 'solitaire_game_drops';
const GAME_CARDS_KEY = 'solitaire_game_cards';

// Drop parameters
const MIN_DROPS_PER_GAME = 1;
const MAX_DROPS_PER_GAME = 10;
const TOTAL_CARDS_IN_GAME = 52;

// Rarity weights (must match Collections.tsx RARITY_DROP_WEIGHTS)
const RARITY_DROP_WEIGHTS: Record<number, number> = {
  1: 100,  // Very common
  2: 40,   // Common
  3: 15,   // Uncommon
  4: 4,    // Rare
  5: 1,    // Legendary (very rare)
};

// Get current game state
function getGameDropState(): { dropsThisGame: number; cardsPlayed: number; targetDrops: number } {
  const drops = parseInt(localStorage.getItem(GAME_DROPS_KEY) || '0', 10);
  const cards = parseInt(localStorage.getItem(GAME_CARDS_KEY) || '0', 10);
  // Target drops is set at game start and persists
  const targetStr = localStorage.getItem('solitaire_target_drops');
  const target = targetStr ? parseInt(targetStr, 10) : MIN_DROPS_PER_GAME + Math.floor(Math.random() * (MAX_DROPS_PER_GAME - MIN_DROPS_PER_GAME + 1));
  return { dropsThisGame: drops, cardsPlayed: cards, targetDrops: target };
}

// Update game state
function updateGameDropState(drops: number, cards: number, target: number) {
  localStorage.setItem(GAME_DROPS_KEY, drops.toString());
  localStorage.setItem(GAME_CARDS_KEY, cards.toString());
  localStorage.setItem('solitaire_target_drops', target.toString());
}

// Reset for new game
export function resetCardsMovedForCollection(): void {
  // Set new random target for this game (1-10 drops)
  const targetDrops = MIN_DROPS_PER_GAME + Math.floor(Math.random() * (MAX_DROPS_PER_GAME - MIN_DROPS_PER_GAME + 1));
  updateGameDropState(0, 0, targetDrops);
  console.log(`🎯 New game: target ${targetDrops} collection drops`);
}

// Calculate drop probability based on progress
// Probability increases as game progresses to ensure we hit target drops
function calculateDropProbability(cardsPlayed: number, dropsNeeded: number, cardsRemaining: number): number {
  if (dropsNeeded <= 0) return 0; // Already hit target
  if (cardsRemaining <= 0) return 1; // Last chance!
  
  // Base probability: distribute drops evenly across remaining cards
  // But increase as we fall behind schedule
  const idealProgress = cardsPlayed / TOTAL_CARDS_IN_GAME;
  const neededDropsNow = dropsNeeded;
  
  // Probability that ensures we're likely to get the remaining drops
  // Using formula: P = dropsNeeded / cardsRemaining * (1 + progress bonus)
  const baseProbability = neededDropsNow / cardsRemaining;
  
  // Progressive bonus: starts low, increases as game progresses
  // At start: bonus = 0, at 80% progress: bonus = 1.5x
  const progressBonus = 1 + (idealProgress * 1.5);
  
  // Final probability, capped at 80% to avoid guaranteed drops every card
  return Math.min(baseProbability * progressBonus, 0.8);
}

// Global callback for when a card is moved to foundation
let onCardToFoundationCallback: ((cardX: number, cardY: number, points: number) => void) | null = null;

export function setOnCardToFoundationCallback(callback: (cardX: number, cardY: number, points: number) => void) {
  onCardToFoundationCallback = callback;
}

export function triggerCardToFoundation(cardX: number, cardY: number, points: number = 0) {
  if (onCardToFoundationCallback) {
    onCardToFoundationCallback(cardX, cardY, points);
  }
}

// Try to drop a collection item when a card is moved to foundation
// Returns info about drop including whether it's a duplicate
export function tryCollectionDrop(
  cardX: number, 
  cardY: number,
  collections: Array<{ id: string; reward: number; items: Array<{ id: string; icon: string; collected: boolean; rarity?: number }> }>
): { collectionId: string; itemId: string; icon: string; isDuplicate: boolean } | null {
  // Get current game state
  let { dropsThisGame, cardsPlayed, targetDrops } = getGameDropState();
  
  // Increment cards played
  cardsPlayed++;
  const cardsRemaining = TOTAL_CARDS_IN_GAME - cardsPlayed;
  const dropsNeeded = targetDrops - dropsThisGame;
  
  // Calculate probability based on progress
  const dropProbability = calculateDropProbability(cardsPlayed, dropsNeeded, cardsRemaining);
  
  // Roll for drop
  const roll = Math.random();
  const shouldDrop = roll < dropProbability;
  
  console.log(`🎲 Card ${cardsPlayed}/${TOTAL_CARDS_IN_GAME}: P=${(dropProbability*100).toFixed(1)}%, roll=${(roll*100).toFixed(1)}%, drops=${dropsThisGame}/${targetDrops} → ${shouldDrop ? 'DROP!' : 'no drop'}`);
  
  // Update state (even if no drop)
  if (shouldDrop) {
    dropsThisGame++;
  }
  updateGameDropState(dropsThisGame, cardsPlayed, targetDrops);
  
  if (!shouldDrop) {
    return null;
  }
  
  // ============ SELECT WHICH ITEM DROPS BASED ON RARITY ============
  // Build weighted pool based on item rarity (not collection rarity)
  const allItems: Array<{
    collectionId: string;
    itemId: string;
    icon: string;
    weight: number;
    collected: boolean;
    rarity: number;
  }> = [];
  
  // Check if first collection is complete
  const firstCollection = collections[0];
  const isFirstCollectionComplete = firstCollection ? firstCollection.items.every(i => i.collected) : true;
  
  for (let collectionIndex = 0; collectionIndex < collections.length; collectionIndex++) {
    const collection = collections[collectionIndex];
    const isFirstCollection = collectionIndex === 0;
    
    for (const item of collection.items) {
      // Get rarity weight (default to 1-star if rarity not set)
      const rarity = item.rarity || 1;
      let itemWeight = RARITY_DROP_WEIGHTS[rarity] || RARITY_DROP_WEIGHTS[1];
      
      // Slight boost to uncollected items (1.5x)
      if (!item.collected) {
        itemWeight *= 1.5;
      }
      
      // BIG boost for first collection until it's complete (to collect it in 1-2 sessions)
      if (isFirstCollection && !isFirstCollectionComplete) {
        // If item not collected: 10x boost, if already collected: 3x boost (for duplicates less)
        itemWeight *= item.collected ? 3 : 10;
      }
      
      allItems.push({
        collectionId: collection.id,
        itemId: item.id,
        icon: item.icon,
        weight: itemWeight,
        collected: item.collected,
        rarity: rarity
      });
    }
  }
  
  if (allItems.length === 0) return null;
  
  // Calculate total weight
  const totalWeight = allItems.reduce((sum, item) => sum + item.weight, 0);
  
  // Random weighted selection
  let random = Math.random() * totalWeight;
  let selectedItem = allItems[0];
  
  for (const item of allItems) {
    random -= item.weight;
    if (random <= 0) {
      selectedItem = item;
      break;
    }
  }
  
  console.log(`✨ Dropped: ${selectedItem.icon} from ${selectedItem.collectionId} (${selectedItem.collected ? 'duplicate' : 'NEW!'})`);
  
  // Trigger flying icon animation
  const buttonPos = getCollectionsButtonPosition();
  if (buttonPos && flyingIconCallback) {
    const drop: PendingDrop = {
      id: `drop-${Date.now()}-${Math.random()}`,
      icon: selectedItem.icon,
      itemId: selectedItem.itemId,
      collectionId: selectedItem.collectionId,
      startX: cardX,
      startY: cardY,
      isDuplicate: selectedItem.collected,
      rarity: selectedItem.rarity
    };
    flyingIconCallback(drop);
  }
  
  return {
    collectionId: selectedItem.collectionId,
    itemId: selectedItem.itemId,
    icon: selectedItem.icon,
    isDuplicate: selectedItem.collected
  };
}
