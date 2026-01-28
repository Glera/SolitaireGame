import React, { useEffect, useState, useRef } from 'react';
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
  hasKey?: boolean;
  hasShovel?: boolean;
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
  isClickable = true,
  hasKey = false,
  hasShovel = false
}: CardProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [showFace, setShowFace] = useState(card.faceUp);
  const prevFaceUpRef = useRef(card.faceUp);
  // Resource visibility - show key or shovel emoji
  const keyVisible = hasKey;
  const shovelVisible = hasShovel;
  const hasResource = hasKey || hasShovel;
  
  // Flip animation (150ms) - only when card changes from faceDown to faceUp
  useEffect(() => {
    const wasFaceDown = !prevFaceUpRef.current;
    const isNowFaceUp = card.faceUp;
    
    if (wasFaceDown && isNowFaceUp) {
      // Card is flipping from back to front - animate
      setIsFlipping(true);
      setShowFace(false); // Start showing back
      
      const timer1 = setTimeout(() => {
        setShowFace(true); // Show face at halfway point
      }, 75);
      
      const timer2 = setTimeout(() => {
        setIsFlipping(false);
      }, 150);
      
      prevFaceUpRef.current = card.faceUp;
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      // No animation - just update state
      setShowFace(card.faceUp);
      prevFaceUpRef.current = card.faceUp;
    }
  }, [card.faceUp, card.id]); // Also depend on card.id to detect same card

  const suitSymbol = getSuitSymbol(card.suit);
  const isRed = card.color === 'red';

  // Card back (face down)
  const cardBack = (
    <div 
      className={cn(
        "absolute inset-0 w-full h-full bg-green-950 flex items-center justify-center",
        "shadow-md outline-none focus:outline-none",
        "rounded-lg border-2",
        "backface-hidden"
      )}
      style={{ 
        borderRadius: '0.5rem',
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
        borderColor: hasKey ? '#a3b550' : hasShovel ? '#b45309' : '#14532d' // muted yellow-green for keys, amber for shovels, green-900 default
      }}
    >
      <div 
        className="w-16 h-[88px] border border-green-700 rounded opacity-30"
        data-inner-border="true"
      />
    </div>
  );

  // Card front (face up)
  const cardFront = (
    <div
      className={cn(
        "absolute inset-0 w-full h-full bg-amber-50 p-1",
        "shadow-md outline-none focus:outline-none",
        "rounded-lg border-2",
        "backface-hidden"
      )}
      style={{ 
        borderRadius: '0.5rem',
        backfaceVisibility: 'hidden',
        borderColor: hasKey ? '#fbbf24' : hasShovel ? '#f59e0b' : '#1c1917' // amber-400 for keys, amber-500 for shovels, stone-900 default
      }}
    >
      {/* Desktop version */}
      <div className="w-full h-full flex flex-col desktop-card relative px-0.5 pt-0 pb-1">
        <div className="flex justify-between items-start -mx-1 -mt-1">
          <div className={cn(
            card.rank === '10' ? "text-2xl font-extrabold leading-none" : "text-3xl font-extrabold leading-none pl-1",
            isRed ? "text-red-600" : "text-black"
          )}>
            {card.rank}
          </div>
          <div className={cn(
            card.rank === '10' ? "text-2xl font-extrabold leading-none" : "text-3xl font-extrabold leading-none",
            isRed ? "text-red-600" : "text-black"
          )}>
            {suitSymbol}
          </div>
        </div>
        <div className={cn(
          "text-[2.6rem] font-black absolute bottom-[-10px] left-1/2 -translate-x-1/2",
          isRed ? "text-red-600" : "text-black"
        )}>
          {suitSymbol}
        </div>
      </div>

      {/* Mobile version */}
      <div className="w-full h-full flex flex-col mobile-card relative px-0.5 pt-0 pb-1">
        <div className="flex justify-between items-start -mx-1 -mt-1">
          <div className={cn(
            card.rank === '10' ? "text-3xl font-extrabold leading-none" : "text-4xl font-extrabold leading-none pl-1",
            isRed ? "text-red-600" : "text-black"
          )}>
            {card.rank}
          </div>
          <div className={cn(
            card.rank === '10' ? "text-3xl font-extrabold leading-none" : "text-4xl font-extrabold leading-none",
            isRed ? "text-red-600" : "text-black"
          )}>
            {suitSymbol}
          </div>
        </div>
        <div className={cn(
          "text-[2.7rem] font-black absolute bottom-[-10px] left-1/2 -translate-x-1/2",
          isRed ? "text-red-600" : "text-black"
        )}>
          {suitSymbol}
        </div>
      </div>
    </div>
  );

  return (
    <div
      data-card-id={card.id}
      data-face-up={showFace ? 'true' : 'false'}
      data-has-key={hasKey ? 'true' : 'false'}
      data-has-shovel={hasShovel ? 'true' : 'false'}
      className={cn(
        "w-20 h-[104px] cursor-pointer select-none relative",
        isDragging && "opacity-0 pointer-events-none",
        isAnimating && "opacity-0 pointer-events-none",
        className
      )}
      style={{ 
        perspective: '1000px',
        ...style 
      }}
      onClick={isClickable ? onClick : undefined}
      onDoubleClick={isClickable ? onDoubleClick : undefined}
      onDragStart={(e) => onDragStart?.(e)}
      onDragEnd={onDragEnd}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      draggable={isPlayable}
    >
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transition: isFlipping ? 'transform 0.15s ease-out' : 'none',
          transform: showFace ? 'rotateY(0deg)' : 'rotateY(180deg)'
        }}
      >
        {cardFront}
        {cardBack}
      </div>
      
      {/* Key indicator for Treasure Hunt event - only show on face-up cards */}
      {keyVisible && showFace && (
        <div 
          className="absolute flex items-center justify-center z-10 pointer-events-none"
          style={{
            left: '2px',
            bottom: '2px',
            filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.7)) drop-shadow(0 0 1px rgba(0,0,0,0.5))',
          }}
        >
          <span style={{ fontSize: '0.8rem' }}>🔑</span>
        </div>
      )}
      
      {/* Shovel indicator for Dungeon Dig event - only show on face-up cards */}
      {shovelVisible && showFace && (
        <div 
          className="absolute flex items-center justify-center z-10 pointer-events-none"
          style={{
            left: '2px',
            bottom: '2px',
            filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.7)) drop-shadow(0 0 1px rgba(0,0,0,0.5))',
          }}
        >
          <span style={{ fontSize: '0.8rem' }}>🪏</span>
        </div>
      )}
      
    </div>
  );
}
