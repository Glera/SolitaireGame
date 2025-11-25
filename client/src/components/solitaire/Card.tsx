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
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  isDragging?: boolean;
  isPlayable?: boolean;
  isAnimating?: boolean;
  isClickable?: boolean;
}

export function Card({ 
  card, 
  onClick, 
  onDoubleClick,
  onDragStart, 
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  className,
  style,
  isDragging = false,
  isPlayable = false,
  isAnimating = false,
  isClickable = true
}: CardProps) {
  if (!card.faceUp) {
    return (
      <div 
        data-card-id={card.id}
        // COMMENTED OUT: Premium cards logic disabled
        // data-premium-hidden={card.isPremium ? "true" : undefined}
        // data-is-premium={card.isPremium ? "true" : undefined}
        className={cn(
          "w-20 h-28 bg-green-950 flex items-center justify-center cursor-pointer select-none",
          "shadow-md outline-none focus:outline-none",
          "rounded-lg",
          // Always render with normal border - CSS will handle premium styling after animation
          "border border-green-900",
          className
        )}
        style={{ borderRadius: '0.5rem' }}
        onClick={onClick}
      >
        <div 
          className="w-16 h-24 border border-green-700 rounded opacity-30"
          data-inner-border="true"
        />
      </div>
    );
  }

  const suitSymbol = getSuitSymbol(card.suit);
  const isRed = card.color === 'red';

  return (
    <div
      data-card-id={card.id}
      // COMMENTED OUT: Premium cards logic disabled
      // data-premium-hidden={card.isPremium ? "true" : undefined}
      // data-is-premium={card.isPremium ? "true" : undefined}
      className={cn(
        "w-20 h-28 bg-amber-50 p-1 cursor-pointer select-none shadow-md",
        "hover:shadow-lg transition-shadow duration-100",
        "outline-none focus:outline-none",
        "rounded-lg",
        // Always render with normal border - CSS will handle premium styling after animation
        "border border-stone-900",
        isDragging && "opacity-0",
        isAnimating && "opacity-0",
        className
      )}
      style={{ borderRadius: '0.5rem', ...style }}
      onClick={isClickable ? onClick : undefined}
      onDoubleClick={isClickable ? onDoubleClick : undefined}
      onDragStart={(e) => {
        onDragStart?.(e);
      }}
      onDragEnd={onDragEnd}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      draggable={isPlayable}
    >
      {/* Desktop version - same structure as mobile but 2x smaller */}
      <div className="w-full h-full flex flex-col desktop-card relative px-0.5 pt-0 pb-1">
        {/* Top row: rank on left, suit on right */}
        <div className="flex justify-between items-start -mx-1 -mt-0.5">
          <div className={cn(
            card.rank === '10' ? "text-3xl font-extrabold leading-none" : "text-4xl font-extrabold leading-none pl-1", // Smaller for '10', add more left padding for others
            isRed ? "text-red-600" : "text-black"
          )}>
            {card.rank}
          </div>
          <div className={cn(
            card.rank === '10' ? "text-xl font-extrabold leading-none" : "text-2xl font-extrabold leading-none", // Smaller suit for '10'
            isRed ? "text-red-600" : "text-black"
          )}>
            {suitSymbol}
          </div>
        </div>
        
        {/* Large suit at bottom-center - absolute positioning from bottom */}
        <div className={cn(
          "text-[3rem] font-black absolute bottom-[-2px] left-1/2 -translate-x-1/2",
          isRed ? "text-red-600" : "text-black"
        )}>
          {suitSymbol}
        </div>
      </div>

      {/* Mobile version - larger design */}
      <div className="w-full h-full flex flex-col mobile-card relative px-0.5 pt-0 pb-1">
        {/* Top row: rank on left, suit on right */}
        <div className="flex justify-between items-start -mx-1 -mt-0.5">
          <div className={cn(
            card.rank === '10' ? "text-4xl font-extrabold leading-none" : "text-5xl font-extrabold leading-none pl-1", // Smaller for '10', add more left padding for others
            isRed ? "text-red-600" : "text-black"
          )}>
            {card.rank}
          </div>
          <div className={cn(
            card.rank === '10' ? "text-2xl font-extrabold leading-none" : "text-3xl font-extrabold leading-none", // Smaller suit for '10'
            isRed ? "text-red-600" : "text-black"
          )}>
            {suitSymbol}
          </div>
        </div>
        
        {/* Large suit at bottom - absolute positioning from bottom */}
        <div className={cn(
          "text-6xl font-black absolute bottom-[-2px] left-1/2 -translate-x-1/2",
          isRed ? "text-red-600" : "text-black"
        )}>
          {suitSymbol}
        </div>
      </div>
    </div>
  );
}
