import React from 'react';
import { Card as CardType } from '../../lib/solitaire/types';
import { getSuitSymbol } from '../../lib/solitaire/cardUtils';
import { cn } from '../../lib/utils';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
  isDragging?: boolean;
  isPlayable?: boolean;
}

export function Card({ 
  card, 
  onClick, 
  onDoubleClick,
  onDragStart, 
  onDragEnd, 
  className,
  isDragging = false,
  isPlayable = false
}: CardProps) {
  if (!card.faceUp) {
    return (
      <div 
        className={cn(
          "w-16 h-24 bg-blue-800 border-2 border-blue-900 rounded-lg flex items-center justify-center cursor-pointer select-none",
          "bg-gradient-to-br from-blue-700 to-blue-900",
          className
        )}
        onClick={onClick}
      >
        <div className="w-12 h-20 border border-blue-400 rounded opacity-50" />
      </div>
    );
  }

  const suitSymbol = getSuitSymbol(card.suit);
  const isRed = card.color === 'red';

  return (
    <div
      className={cn(
        "w-16 h-24 bg-white border-2 border-gray-300 rounded-lg p-1 cursor-pointer select-none shadow-sm",
        "hover:shadow-md transition-shadow duration-200",
        isDragging && "opacity-50 scale-95",
        isPlayable && "ring-2 ring-green-400 ring-opacity-50",
        className
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      draggable={isPlayable}
    >
      <div className="w-full h-full flex flex-col justify-between">
        {/* Top rank and suit */}
        <div className={cn(
          "text-xs font-bold leading-none",
          isRed ? "text-red-600" : "text-black"
        )}>
          <div>{card.rank}</div>
          <div>{suitSymbol}</div>
        </div>
        
        {/* Center suit symbol */}
        <div className={cn(
          "text-2xl self-center",
          isRed ? "text-red-600" : "text-black"
        )}>
          {suitSymbol}
        </div>
        
        {/* Bottom rank and suit (rotated) */}
        <div className={cn(
          "text-xs font-bold leading-none self-end transform rotate-180",
          isRed ? "text-red-600" : "text-black"
        )}>
          <div>{card.rank}</div>
          <div>{suitSymbol}</div>
        </div>
      </div>
    </div>
  );
}
