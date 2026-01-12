// Treasure Hunt LiveOps Event
// Keys are collected from cards, used to open chests with rewards

export interface TreasureChest {
  id: string;
  opened: boolean;
  reward: ChestReward | null;
}

export interface CollectionItemReward {
  collectionId: string;
  itemId: string;
}

export interface ChestReward {
  type: 'stars' | 'collection_item' | 'big_win' | 'empty';
  stars?: number;
  collectionId?: string;  // Legacy single item
  itemId?: string;        // Legacy single item
  collectionItems?: CollectionItemReward[];  // Multiple items support
  isBigWin?: boolean;
}

export interface TreasureRoom {
  id: number;
  chests: TreasureChest[];
  completed: boolean;
}

export interface TreasureHuntEvent {
  id: string;
  active: boolean;
  activated: boolean;
  activatedAt: number | null;
  endTime: number | null;
  keys: number;
  currentRoom: number;
  rooms: TreasureRoom[];
  grandPrizeClaimed: boolean;
  milestoneClaimed: number[];  // Array of room indices (4, 9) where milestone was claimed
}

const STORAGE_KEY = 'treasure_hunt_event';
const EVENT_DURATION_HOURS = 48; // 2 days
const TOTAL_ROOMS = 10;
const MIN_CHESTS = 5;
const MAX_CHESTS = 10;
const REQUIRED_LEVEL = 2;

// Collection IDs for random rewards (must match Collections.tsx)
const COLLECTION_IDS = ['nature', 'fruits', 'toys', 'treats', 'accessories', 'home', 'seasons', 'friends', 'hearts'];

// Generate a random collection item
function generateCollectionItem(): CollectionItemReward {
  return {
    collectionId: COLLECTION_IDS[Math.floor(Math.random() * COLLECTION_IDS.length)],
    itemId: `item_${Math.floor(Math.random() * 9)}` // 9 items per collection
  };
}

// Generate rewards for a room
function generateRoomRewards(roomNumber: number, chestCount: number): ChestReward[] {
  const rewards: ChestReward[] = [];
  
  // Balanced chances - total ~70% for rewards, ~30% empty
  const bigWinChance = 0.05 + (roomNumber * 0.01); // 5-15% - rare big win
  const multiItemChance = 0.08 + (roomNumber * 0.01); // 8-18% - multiple items (more visible)
  const collectionChance = 0.15 + (roomNumber * 0.01); // 15-25% - single item
  const starsChance = 0.20; // 20% - stars
  // Rest is empty (~30-40%)
  
  for (let i = 0; i < chestCount; i++) {
    const roll = Math.random();
    
    if (roll < bigWinChance) {
      // Big win - moderate stars + 2 collection items
      const items: CollectionItemReward[] = [
        generateCollectionItem(),
        generateCollectionItem()
      ];
      rewards.push({
        type: 'big_win',
        stars: 15 + roomNumber * 3, // 15-45 stars (less than before)
        collectionItems: items,
        isBigWin: true
      });
    } else if (roll < bigWinChance + multiItemChance) {
      // Multiple collection items (2-3)
      const itemCount = Math.floor(Math.random() * 2) + 2; // 2-3 items
      const items: CollectionItemReward[] = [];
      for (let j = 0; j < itemCount; j++) {
        items.push(generateCollectionItem());
      }
      rewards.push({
        type: 'collection_item',
        collectionItems: items
      });
    } else if (roll < bigWinChance + multiItemChance + collectionChance) {
      // Single collection item
      const item = generateCollectionItem();
      rewards.push({
        type: 'collection_item',
        collectionItems: [item]
      });
    } else if (roll < bigWinChance + multiItemChance + collectionChance + starsChance) {
      // Stars - small amounts
      const starAmount = Math.random() < 0.7 
        ? 3 + Math.floor(Math.random() * 5) // 70%: 3-7 stars (small)
        : 10 + Math.floor(Math.random() * 10) + roomNumber; // 30%: 10-20+ stars (medium)
      rewards.push({
        type: 'stars',
        stars: starAmount
      });
    } else {
      // Empty - about 30-40% chance
      rewards.push({
        type: 'empty'
      });
    }
  }
  
  // Shuffle rewards
  for (let i = rewards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rewards[i], rewards[j]] = [rewards[j], rewards[i]];
  }
  
  return rewards;
}

// Generate all rooms for the event
function generateRooms(): TreasureRoom[] {
  const rooms: TreasureRoom[] = [];
  
  for (let i = 0; i < TOTAL_ROOMS; i++) {
    // Chests count grows from MIN to MAX
    const chestCount = Math.min(
      MAX_CHESTS, 
      MIN_CHESTS + Math.floor((i / (TOTAL_ROOMS - 1)) * (MAX_CHESTS - MIN_CHESTS))
    );
    
    const rewards = generateRoomRewards(i, chestCount);
    
    const chests: TreasureChest[] = rewards.map((reward, idx) => ({
      id: `room_${i}_chest_${idx}`,
      opened: false,
      reward
    }));
    
    rooms.push({
      id: i,
      chests,
      completed: false
    });
  }
  
  return rooms;
}

// Initialize or load event
export function getTreasureHuntEvent(): TreasureHuntEvent {
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (stored) {
    const event = JSON.parse(stored) as TreasureHuntEvent;
    
    // Check if event expired
    if (event.endTime && Date.now() > event.endTime) {
      // Event expired, create new one
      return createNewEvent();
    }
    
    return event;
  }
  
  return createNewEvent();
}

function createNewEvent(): TreasureHuntEvent {
  const event: TreasureHuntEvent = {
    id: `treasure_hunt_${Date.now()}`,
    active: false,
    activated: false,
    activatedAt: null,
    endTime: null,
    keys: 0,
    currentRoom: 0,
    rooms: generateRooms(),
    grandPrizeClaimed: false,
    milestoneClaimed: []
  };
  
  saveTreasureHuntEvent(event);
  return event;
}

export function saveTreasureHuntEvent(event: TreasureHuntEvent): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
}

// Activate event when player reaches required level
export function activateTreasureHunt(playerLevel: number): TreasureHuntEvent | null {
  if (playerLevel < REQUIRED_LEVEL) {
    return null;
  }
  
  const event = getTreasureHuntEvent();
  
  if (!event.activated) {
    event.activated = true;
    event.active = true;
    event.activatedAt = Date.now();
    event.endTime = Date.now() + (EVENT_DURATION_HOURS * 60 * 60 * 1000);
    saveTreasureHuntEvent(event);
  }
  
  return event;
}

// Check if event is available (player level check)
export function isEventAvailable(playerLevel: number): boolean {
  return playerLevel >= REQUIRED_LEVEL;
}

export function getRequiredLevel(): number {
  return REQUIRED_LEVEL;
}

// Add keys
export function addKeys(amount: number): TreasureHuntEvent {
  const event = getTreasureHuntEvent();
  event.keys += amount;
  saveTreasureHuntEvent(event);
  return event;
}

// Bonus rewards for milestone rooms (5th and 10th)
export const MILESTONE_REWARDS: { [key: number]: number } = {
  4: 50,  // Room 5 (index 4) - 50 stars
  9: 100  // Room 10 (index 9) - 100 stars
};

// Check if milestone is available but not yet claimed
export function getMilestoneToShow(event: TreasureHuntEvent): number | null {
  for (const roomIdx of Object.keys(MILESTONE_REWARDS).map(Number)) {
    if (event.rooms[roomIdx]?.completed && !event.milestoneClaimed?.includes(roomIdx)) {
      return roomIdx;
    }
  }
  return null;
}

// Claim milestone reward
export function claimMilestone(roomIdx: number): { event: TreasureHuntEvent; stars: number } {
  const event = getTreasureHuntEvent();
  const stars = MILESTONE_REWARDS[roomIdx] || 0;
  
  if (!event.milestoneClaimed) {
    event.milestoneClaimed = [];
  }
  
  if (!event.milestoneClaimed.includes(roomIdx)) {
    event.milestoneClaimed.push(roomIdx);
  }
  
  saveTreasureHuntEvent(event);
  return { event, stars };
}

// Open a chest
export function openChest(roomId: number, chestId: string): { event: TreasureHuntEvent; reward: ChestReward | null; milestoneUnlocked?: number } {
  const event = getTreasureHuntEvent();
  
  if (event.keys <= 0) {
    return { event, reward: null };
  }
  
  const room = event.rooms[roomId];
  if (!room) {
    return { event, reward: null };
  }
  
  const chest = room.chests.find(c => c.id === chestId);
  if (!chest || chest.opened) {
    return { event, reward: null };
  }
  
  // Open chest
  chest.opened = true;
  event.keys--;
  
  // Check if room is complete (all chests opened)
  const allOpened = room.chests.every(c => c.opened);
  let milestoneUnlocked: number | undefined;
  
  if (allOpened) {
    room.completed = true;
    
    // Check for milestone bonus (don't claim, just signal)
    if (MILESTONE_REWARDS[roomId] !== undefined && !event.milestoneClaimed?.includes(roomId)) {
      milestoneUnlocked = roomId;
    }
    
    // Move to next room if available
    if (event.currentRoom < TOTAL_ROOMS - 1) {
      event.currentRoom++;
    }
  }
  
  saveTreasureHuntEvent(event);
  
  return { event, reward: chest.reward, milestoneUnlocked };
}

// Get current room progress
export function getCurrentRoomProgress(event: TreasureHuntEvent): { opened: number; total: number } {
  const room = event.rooms[event.currentRoom];
  if (!room) return { opened: 0, total: 0 };
  
  const opened = room.chests.filter(c => c.opened).length;
  return { opened, total: room.chests.length };
}

// Check if all rooms completed
export function isEventComplete(event: TreasureHuntEvent): boolean {
  return event.rooms.every(r => r.completed);
}

// Claim grand prize
export function claimGrandPrize(): { event: TreasureHuntEvent; stars: number; collectionItems: { collectionId: string; itemId: string }[] } {
  const event = getTreasureHuntEvent();
  
  if (!isEventComplete(event) || event.grandPrizeClaimed) {
    return { event, stars: 0, collectionItems: [] };
  }
  
  event.grandPrizeClaimed = true;
  saveTreasureHuntEvent(event);
  
  // Grand prize: 200 stars + random collection items
  return {
    event,
    stars: 200,
    collectionItems: [
      { collectionId: COLLECTION_IDS[0], itemId: 'item_0' },
      { collectionId: COLLECTION_IDS[1], itemId: 'item_1' },
    ]
  };
}

// Format remaining time
export function formatEventTimeRemaining(endTime: number): string {
  const now = Date.now();
  const remaining = endTime - now;
  
  if (remaining <= 0) return 'Завершено';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}д ${remainingHours}ч`;
  }
  
  return `${hours}ч ${minutes}м`;
}

// Complete and deactivate the event
export function completeEvent(): TreasureHuntEvent {
  const event = getTreasureHuntEvent();
  event.active = false;
  saveTreasureHuntEvent(event);
  return event;
}

// Reset event (for testing/reset all)
export function resetTreasureHuntEvent(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Generate keys for cards at game start
export function generateKeysForGame(cardCount: number, eventActive: boolean): Set<string> {
  if (!eventActive) return new Set();
  
  const keysToPlace = Math.floor(Math.random() * 3) + 2; // 2-4 keys per game
  const keyPositions = new Set<string>();
  
  // Random card indices to have keys
  const indices: number[] = [];
  while (indices.length < keysToPlace && indices.length < cardCount) {
    const idx = Math.floor(Math.random() * cardCount);
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
  }
  
  indices.forEach(idx => keyPositions.add(`card_${idx}`));
  
  return keyPositions;
}
