import React from 'react';
import { getRoomConfig, RoomType } from '../../lib/roomUtils';

interface RoomInfoProps {
  roomType: RoomType;
  gameVersion?: string;
}

export function RoomInfo({ roomType, gameVersion }: RoomInfoProps) {
  const roomConfig = getRoomConfig(roomType);
  
  const getRoomIcon = (type: RoomType) => {
    switch (type) {
      case 'standard':
        return '🎯';
      case 'premium':
        return '⭐';
      case 'luxury':
        return '💎';
      default:
        return '🎯';
    }
  };
  
  const getRoomColor = (type: RoomType) => {
    switch (type) {
      case 'standard':
        return 'text-green-300';
      case 'premium':
        return 'text-yellow-300';
      case 'luxury':
        return 'text-purple-300';
      default:
        return 'text-green-300';
    }
  };
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-2xl">{getRoomIcon(roomType)}</span>
      <div className="flex flex-col">
        <span className={`font-bold ${getRoomColor(roomType)}`}>
          {roomConfig.description}
        </span>
        <div className="flex flex-col gap-0.5">
          {roomConfig.premiumCardsCount > 0 && (
            <span className="text-xs text-yellow-400">
              ⭐ {roomConfig.premiumCardsCount} премиальн{roomConfig.premiumCardsCount === 1 ? 'ая карта' : roomConfig.premiumCardsCount < 5 ? 'ые карты' : 'ых карт'}
            </span>
          )}
          {gameVersion && (
            <span className="text-xs text-gray-500">
              v{gameVersion}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
