// Points Event - collect points from clearing cards, earn rewards

export interface PointsEventState {
  active: boolean;
  currentPoints: number;
  currentRewardIndex: number; // Next reward to EARN (not claimed yet)
  claimedRewards: number[]; // indices of claimed rewards
  pendingRewards: PendingReward[]; // earned but not yet claimed
}

// A reward that has been earned (progress reached 100%) but not yet claimed
export interface PendingReward {
  id: number; // unique id for animation tracking
  rewardIndex: number;
  type: 'stars' | 'pack';
  stars?: number;
  packRarity?: PackRarity;
}

export type PackRarity = 1 | 2 | 3 | 4 | 5;

export interface CollectionPack {
  rarity: PackRarity;
  name: string;
  color: string;
  bgGradient: string;
  itemCount: number;
  guaranteedMinRarity: PackRarity;
}

export interface EventReward {
  type: 'stars' | 'pack';
  stars?: number;
  packRarity?: PackRarity;
  pointsRequired: number;
}

// Pack definitions
export const COLLECTION_PACKS: Record<PackRarity, CollectionPack> = {
  1: {
    rarity: 1,
    name: 'Обычный',
    color: '#9ca3af', // gray
    bgGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%)',
    itemCount: 2,
    guaranteedMinRarity: 1,
  },
  2: {
    rarity: 2,
    name: 'Необычный',
    color: '#22c55e', // green
    bgGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
    itemCount: 3,
    guaranteedMinRarity: 2,
  },
  3: {
    rarity: 3,
    name: 'Редкий',
    color: '#3b82f6', // blue
    bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
    itemCount: 3,
    guaranteedMinRarity: 3,
  },
  4: {
    rarity: 4,
    name: 'Эпический',
    color: '#a855f7', // purple
    bgGradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)',
    itemCount: 4,
    guaranteedMinRarity: 4,
  },
  5: {
    rarity: 5,
    name: 'Легендарный',
    color: '#ef4444', // red
    bgGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
    itemCount: 4,
    guaranteedMinRarity: 5,
  },
};

// One full solitaire game gives ~364 points (all 52 cards: 4 suits × sum(1..13) = 4 × 91)
// We want 1-3 full games per reward
const POINTS_ONE_GAME = 364;

// Reward cycle with points multiplier (how many games needed)
// Each reward specifies: type, value, and games required (1-3)
export const REWARD_CYCLE: Array<{ type: 'stars' | 'pack'; value: number; games: number }> = [
  { type: 'pack', value: 1, games: 1 },     // Gray pack - 1 game
  { type: 'stars', value: 5, games: 1 },    // 5 stars - 1 game
  { type: 'stars', value: 10, games: 1 },   // 10 stars - 1 game
  { type: 'pack', value: 2, games: 2 },     // Green pack - 2 games
  { type: 'stars', value: 5, games: 1 },    // 5 stars - 1 game
  { type: 'stars', value: 15, games: 2 },   // 15 stars - 2 games
  { type: 'pack', value: 3, games: 2 },     // Blue pack - 2 games
  { type: 'stars', value: 5, games: 1 },    // 5 stars - 1 game
  { type: 'stars', value: 15, games: 2 },   // 15 stars - 2 games
  { type: 'stars', value: 20, games: 2 },   // 20 stars - 2 games
  { type: 'pack', value: 1, games: 1 },     // Gray pack - 1 game
  { type: 'stars', value: 10, games: 1 },   // 10 stars - 1 game
  { type: 'pack', value: 4, games: 3 },     // Purple pack - 3 games
  { type: 'stars', value: 15, games: 2 },   // 15 stars - 2 games
];

// Get reward at given index (loops)
export function getRewardAtIndex(index: number): EventReward {
  const cycleIndex = index % REWARD_CYCLE.length;
  const cycleNumber = Math.floor(index / REWARD_CYCLE.length);
  const reward = REWARD_CYCLE[cycleIndex];
  
  // Calculate cumulative points required
  let totalPoints = 0;
  for (let i = 0; i <= index; i++) {
    const ri = i % REWARD_CYCLE.length;
    const cn = Math.floor(i / REWARD_CYCLE.length);
    // Each cycle increases points by 20%
    const cycleMultiplier = 1 + cn * 0.2;
    totalPoints += Math.round(REWARD_CYCLE[ri].games * POINTS_ONE_GAME * cycleMultiplier);
  }
  
  return {
    type: reward.type,
    stars: reward.type === 'stars' ? reward.value : undefined,
    packRarity: reward.type === 'pack' ? (reward.value as PackRarity) : undefined,
    pointsRequired: totalPoints,
  };
}

// Get next N rewards starting from index
export function getNextRewards(startIndex: number, count: number): EventReward[] {
  const rewards: EventReward[] = [];
  for (let i = 0; i < count; i++) {
    rewards.push(getRewardAtIndex(startIndex + i));
  }
  return rewards;
}

// Storage key
const STORAGE_KEY = 'solitaire_points_event';

// Get event state from localStorage
export function getPointsEventState(): PointsEventState {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      // Ensure pendingRewards exists (migration)
      if (!state.pendingRewards) {
        state.pendingRewards = [];
      }
      return state;
    } catch {
      // Invalid data, return default
    }
  }
  return {
    active: true, // Available from start
    currentPoints: 0,
    currentRewardIndex: 0,
    claimedRewards: [],
    pendingRewards: [],
  };
}

// Save event state
export function savePointsEventState(state: PointsEventState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Add points from clearing cards
export function addEventPoints(points: number): PointsEventState {
  const state = getPointsEventState();
  state.currentPoints += points;
  savePointsEventState(state);
  return state;
}

// Check if a reward is ready to be EARNED (moved to pending)
export function getEarnableReward(state: PointsEventState): EventReward | null {
  const nextReward = getRewardAtIndex(state.currentRewardIndex);
  if (state.currentPoints >= nextReward.pointsRequired) {
    return nextReward;
  }
  return null;
}

// Earn a reward (move to pending queue) - called when progress reaches 100%
// Returns the earned reward and new state
export function earnReward(): { state: PointsEventState; reward: PendingReward } | null {
  const state = getPointsEventState();
  const earnableReward = getEarnableReward(state);
  
  if (!earnableReward) return null;
  
  // Create pending reward
  const pendingReward: PendingReward = {
    id: Date.now(),
    rewardIndex: state.currentRewardIndex,
    type: earnableReward.type,
    stars: earnableReward.stars,
    packRarity: earnableReward.packRarity,
  };
  
  // Add to pending and advance to next reward
  state.pendingRewards.push(pendingReward);
  state.currentRewardIndex++;
  savePointsEventState(state);
  
  return { state, reward: pendingReward };
}

// Check if there are pending rewards to claim
export function hasPendingRewards(state: PointsEventState): boolean {
  return state.pendingRewards.length > 0;
}

// Get the next pending reward to claim (last one - LIFO order)
export function getNextPendingReward(state: PointsEventState): PendingReward | null {
  return state.pendingRewards.length > 0 ? state.pendingRewards[state.pendingRewards.length - 1] : null;
}

// Claim the last pending reward (remove from end - LIFO order)
export function claimPendingReward(): { state: PointsEventState; reward: PendingReward } | null {
  const state = getPointsEventState();
  
  if (state.pendingRewards.length === 0) return null;
  
  const reward = state.pendingRewards.pop()!; // Remove last (LIFO - last earned, first claimed)
  state.claimedRewards.push(reward.rewardIndex);
  savePointsEventState(state);
  
  return { state, reward };
}

// Legacy: Check if a reward is available to claim (for backwards compatibility)
export function getClaimableReward(state: PointsEventState): EventReward | null {
  // Check pending rewards - return last one (LIFO order)
  if (state.pendingRewards.length > 0) {
    const pending = state.pendingRewards[state.pendingRewards.length - 1];
    return {
      type: pending.type,
      stars: pending.stars,
      packRarity: pending.packRarity,
      pointsRequired: 0, // Already earned
    };
  }
  return null;
}

// Legacy: Claim reward (now claims from pending)
export function claimReward(): { state: PointsEventState; reward: EventReward } | null {
  const result = claimPendingReward();
  if (!result) return null;
  
  return {
    state: result.state,
    reward: {
      type: result.reward.type,
      stars: result.reward.stars,
      packRarity: result.reward.packRarity,
      pointsRequired: 0,
    },
  };
}

// Get progress to next reward (0-100)
export function getProgressToNextReward(state: PointsEventState): number {
  const currentReward = getRewardAtIndex(state.currentRewardIndex);
  const prevReward = state.currentRewardIndex > 0 
    ? getRewardAtIndex(state.currentRewardIndex - 1) 
    : { pointsRequired: 0 };
  
  const pointsNeeded = currentReward.pointsRequired - prevReward.pointsRequired;
  const pointsProgress = state.currentPoints - prevReward.pointsRequired;
  
  return Math.min(100, Math.max(0, (pointsProgress / pointsNeeded) * 100));
}

// Reset event (for debug)
export function resetPointsEvent(): PointsEventState {
  const state: PointsEventState = {
    active: true,
    currentPoints: 0,
    currentRewardIndex: 0,
    claimedRewards: [],
    pendingRewards: [],
  };
  savePointsEventState(state);
  return state;
}

// Generate items for a pack opening
export interface PackItem {
  collectionId: string;
  itemId: string;
  icon: string;
  name: string;
  rarity: number;
  isNew: boolean;
}

// Rarity weights for random selection
const RARITY_WEIGHTS: Record<number, number> = {
  1: 100,
  2: 40,
  3: 15,
  4: 4,
  5: 1,
};

export function generatePackItems(
  packRarity: PackRarity,
  collections: Array<{
    id: string;
    items: Array<{ id: string; icon: string; name: string; rarity: number; collected: boolean }>;
  }>
): PackItem[] {
  const pack = COLLECTION_PACKS[packRarity];
  const items: PackItem[] = [];
  
  // Build pool of all items with weights
  interface PoolItem {
    collectionId: string;
    itemId: string;
    icon: string;
    name: string;
    rarity: number;
    isCollected: boolean;
  }
  
  const allItems: PoolItem[] = [];
  for (const collection of collections) {
    for (const item of collection.items) {
      allItems.push({
        collectionId: collection.id,
        itemId: item.id,
        icon: item.icon,
        name: item.name,
        rarity: item.rarity,
        isCollected: item.collected,
      });
    }
  }
  
  // First, pick guaranteed item with minimum rarity
  const guaranteedPool = allItems.filter(i => i.rarity >= pack.guaranteedMinRarity);
  if (guaranteedPool.length > 0) {
    // Weight by rarity (higher rarity = lower weight) and boost uncollected
    let totalWeight = 0;
    const weightedGuaranteed = guaranteedPool.map(item => {
      let weight = RARITY_WEIGHTS[item.rarity] || 1;
      if (!item.isCollected) weight *= 2; // Boost uncollected
      totalWeight += weight;
      return { item, weight, cumulativeWeight: totalWeight };
    });
    
    const roll = Math.random() * totalWeight;
    const selected = weightedGuaranteed.find(w => roll <= w.cumulativeWeight);
    if (selected) {
      items.push({
        collectionId: selected.item.collectionId,
        itemId: selected.item.itemId,
        icon: selected.item.icon,
        name: selected.item.name,
        rarity: selected.item.rarity,
        isNew: !selected.item.isCollected,
      });
    }
  }
  
  // Fill remaining slots with random items (weighted by rarity)
  while (items.length < pack.itemCount) {
    let totalWeight = 0;
    const weightedItems = allItems.map(item => {
      // Skip if already selected (allow duplicates for common items)
      const alreadySelected = items.some(i => i.collectionId === item.collectionId && i.itemId === item.itemId);
      let weight = RARITY_WEIGHTS[item.rarity] || 1;
      if (!item.isCollected) weight *= 1.5; // Slight boost for uncollected
      if (alreadySelected && !item.isCollected) weight = 0; // Don't duplicate uncollected items
      totalWeight += weight;
      return { item, weight, cumulativeWeight: totalWeight };
    });
    
    const roll = Math.random() * totalWeight;
    const selected = weightedItems.find(w => roll <= w.cumulativeWeight);
    if (selected) {
      // Check if this item was already collected by player
      const wasAlreadyCollected = selected.item.isCollected;
      // Check if we already added this item in this pack opening
      const alreadyInPack = items.some(i => i.collectionId === selected.item.collectionId && i.itemId === selected.item.itemId);
      
      items.push({
        collectionId: selected.item.collectionId,
        itemId: selected.item.itemId,
        icon: selected.item.icon,
        name: selected.item.name,
        rarity: selected.item.rarity,
        isNew: !wasAlreadyCollected && !alreadyInPack,
      });
    } else {
      // Fallback - pick random item
      const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
      items.push({
        collectionId: randomItem.collectionId,
        itemId: randomItem.itemId,
        icon: randomItem.icon,
        name: randomItem.name,
        rarity: randomItem.rarity,
        isNew: !randomItem.isCollected,
      });
    }
  }
  
  // Sort by rarity (highest first) for dramatic reveal
  items.sort((a, b) => b.rarity - a.rarity);
  
  return items;
}
