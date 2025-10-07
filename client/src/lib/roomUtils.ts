// Room types and multipliers
export type RoomType = 'standard' | 'premium' | 'luxury';

export interface RoomConfig {
  type: RoomType;
  premiumCardsCount: number; // Number of premium cards (give 10x points)
  description: string;
}

export const ROOM_CONFIGS: Record<RoomType, RoomConfig> = {
  standard: {
    type: 'standard',
    premiumCardsCount: 1,
    description: 'Обычная комната (1 премиальная карта)'
  },
  premium: {
    type: 'premium', 
    premiumCardsCount: 5,
    description: 'Премиальная комната (5 премиальных карт)'
  },
  luxury: {
    type: 'luxury',
    premiumCardsCount: 10,
    description: 'Люкс комната (10 премиальных карт)'
  }
};

// Get room type from URL parameters
export function getRoomFromURL(): RoomType {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room') as RoomType;
  
  // Validate room parameter
  if (roomParam && roomParam in ROOM_CONFIGS) {
    return roomParam;
  }
  
  // Default to standard room
  return 'standard';
}

// Get room configuration
export function getRoomConfig(roomType?: RoomType): RoomConfig {
  const room = roomType || getRoomFromURL();
  return ROOM_CONFIGS[room];
}

// Get premium cards count for current room
export function getPremiumCardsCount(roomType?: RoomType): number {
  return getRoomConfig(roomType).premiumCardsCount;
}
