// Room types and multipliers
export type RoomType = 'standard' | 'premium' | 'luxury';

export interface RoomConfig {
  type: RoomType;
  multiplier: number;
  description: string;
}

export const ROOM_CONFIGS: Record<RoomType, RoomConfig> = {
  standard: {
    type: 'standard',
    multiplier: 1,
    description: 'Обычная комната (очки x1)'
  },
  premium: {
    type: 'premium', 
    multiplier: 2,
    description: 'Премиальная комната (очки x2)'
  },
  luxury: {
    type: 'luxury',
    multiplier: 5,
    description: 'Люкс комната (очки x5)'
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

// Get points multiplier for current room
export function getPointsMultiplier(roomType?: RoomType): number {
  return getRoomConfig(roomType).multiplier;
}
