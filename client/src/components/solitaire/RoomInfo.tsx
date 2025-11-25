import React from 'react';
import { getRoomConfig, RoomType } from '../../lib/roomUtils';

interface RoomInfoProps {
  roomType: RoomType;
  gameVersion?: string;
  gameMode?: 'random' | 'solvable' | 'unsolvable';
}

export function RoomInfo({ roomType, gameVersion, gameMode }: RoomInfoProps) {
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
  
  const getGameModeDisplay = (mode?: 'random' | 'solvable' | 'unsolvable') => {
    switch (mode) {
      case 'solvable':
        return { text: '✅ Решаемая', color: 'text-amber-400' };
      case 'unsolvable':
        return { text: '❌ Нерешаемая', color: 'text-red-400' };
      case 'random':
      default:
        return { text: '🎲 Случайная', color: 'text-gray-400' };
    }
  };
  
  const modeDisplay = getGameModeDisplay(gameMode);
  
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
          {gameMode && (
            <span className={`text-xs ${modeDisplay.color}`}>
              {modeDisplay.text}
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
