import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

interface FlyingCollectionIconProps {
  icon: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete: () => void;
}

export function FlyingCollectionIcon({ 
  icon, 
  startX, 
  startY, 
  endX, 
  endY, 
  onComplete 
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
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: startX,
        top: startY,
        transform: 'translate(-50%, -50%)',
        fontSize: '28px',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      }}
    >
      {icon}
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

// Drop chance per card: calibrated so 95% chance of at least 1 drop per game (52 cards)
// P(no drop per card)^52 = 0.05 → P(no drop per card) = 0.05^(1/52) ≈ 0.9440
// P(drop per card) = 1 - 0.9440 ≈ 0.056 = 5.6%
const DROP_CHANCE_PER_CARD = 0.056;

// Calculate collection weight for item selection (cheaper = more likely)
// Using squared inverse for more aggressive differentiation:
// reward 5 → weight 100, reward 8 → weight 39, reward 50 → weight 1
function getCollectionWeight(reward: number): number {
  const maxReward = 50;
  const ratio = maxReward / reward;
  return ratio * ratio; // Square for more aggressive weighting
}

// Global callback for when a card is moved to foundation
let onCardToFoundationCallback: ((cardX: number, cardY: number) => void) | null = null;

export function setOnCardToFoundationCallback(callback: (cardX: number, cardY: number) => void) {
  onCardToFoundationCallback = callback;
}

export function triggerCardToFoundation(cardX: number, cardY: number) {
  if (onCardToFoundationCallback) {
    onCardToFoundationCallback(cardX, cardY);
  }
}

// ID of the first (starter) collection that should be collected quickly
const STARTER_COLLECTION_ID = 'nature';
// Boost multiplier for starter collection items (makes them 20x more likely)
const STARTER_COLLECTION_BOOST = 20;
// Boost multiplier for the next incomplete collection after starter (sequential progression)
const NEXT_COLLECTION_BOOST = 8;

// Find the next incomplete collection in order (by reward ascending)
function findNextIncompleteCollection(
  collections: Array<{ id: string; reward: number; items: Array<{ collected: boolean }> }>,
  excludeStarter: boolean
): string | null {
  // Sort by reward (cheapest first)
  const sorted = [...collections].sort((a, b) => a.reward - b.reward);
  
  for (const collection of sorted) {
    if (excludeStarter && collection.id === STARTER_COLLECTION_ID) continue;
    const isComplete = collection.items.every(i => i.collected);
    if (!isComplete) return collection.id;
  }
  return null;
}

// Try to drop a collection item when a card is moved to foundation
// Returns info about drop including whether it's a duplicate
export function tryCollectionDrop(
  cardX: number, 
  cardY: number,
  collections: Array<{ id: string; reward: number; items: Array<{ id: string; icon: string; collected: boolean }> }>
): { collectionId: string; itemId: string; icon: string; isDuplicate: boolean } | null {
  // Check if starter collection is fully collected
  const starterCollection = collections.find(c => c.id === STARTER_COLLECTION_ID);
  const starterCollectionComplete = starterCollection?.items.every(i => i.collected) ?? true;
  
  // Find the next incomplete collection after starter
  const nextCollectionId = starterCollectionComplete 
    ? findNextIncompleteCollection(collections, true)
    : null;
  
  // First, check if drop happens at all
  // If starter collection is incomplete, increase drop chance significantly
  // Also boost when there's an incomplete collection to work on
  let effectiveDropChance = DROP_CHANCE_PER_CARD;
  if (!starterCollectionComplete) {
    effectiveDropChance *= 3; // 3x more drops while collecting starter
  } else if (nextCollectionId) {
    effectiveDropChance *= 1.5; // 1.5x more drops while working on next collection
  }
    
  if (Math.random() >= effectiveDropChance) {
    return null;
  }
  
  // Drop triggered! Now select which item drops based on collection rarity
  // All items (including already collected) can drop - duplicates maintain engagement
  const allItems: Array<{
    collectionId: string;
    itemId: string;
    icon: string;
    weight: number;
    collected: boolean;
  }> = [];
  
  for (const collection of collections) {
    let baseWeight = getCollectionWeight(collection.reward);
    
    const isStarterCollection = collection.id === STARTER_COLLECTION_ID;
    const isNextCollection = collection.id === nextCollectionId;
    const isCollectionComplete = collection.items.every(i => i.collected);
    
    for (const item of collection.items) {
      let itemWeight = baseWeight;
      
      // Apply massive boost to uncollected starter items
      if (isStarterCollection && !starterCollectionComplete && !item.collected) {
        itemWeight *= STARTER_COLLECTION_BOOST;
      }
      // Apply boost to uncollected items from the next collection in line
      else if (isNextCollection && !item.collected) {
        itemWeight *= NEXT_COLLECTION_BOOST;
      }
      // Slight boost to uncollected items from incomplete collections
      else if (!isCollectionComplete && !item.collected) {
        itemWeight *= 2;
      }
      
      allItems.push({
        collectionId: collection.id,
        itemId: item.id,
        icon: item.icon,
        weight: itemWeight,
        collected: item.collected
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
      isDuplicate: selectedItem.collected
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
