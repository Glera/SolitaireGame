import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { useGameScaleContext } from '../../contexts/GameScaleContext';

interface StockPileProps {
  cards: CardType[];
}

export function StockPile({ cards }: StockPileProps) {
  const { drawCard, waste, setStockAnimating, animatingCard, isAutoCollecting, isDealing } = useSolitaire();
  const { scale } = useGameScaleContext();
  const [isAnimating, setIsAnimating] = useState(false);
  const [flyingCard, setFlyingCard] = useState<CardType | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const stockPileRef = useRef<HTMLDivElement>(null);

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  
  const handleClick = () => {
    // Block clicks during dealing animation
    if (isDealing) {
      return;
    }
    
    // Block clicks during auto-collect
    if (isAutoCollecting) {
      return;
    }
    
    if (isAnimating) {
      return;
    }
    
    // Start animation if there's a card to fly
    if (topCard) {
      const cardToFly = { ...topCard, faceUp: true };
      setFlyingCard(cardToFly);
      setIsAnimating(true);
      setStockAnimating(true); // Notify store that animation is in progress (hides card in WastePile)
      
      // Draw card IMMEDIATELY so it appears in waste pile
      drawCard();
      
      // Calculate distance for speed-based animation
      const stockRect = stockPileRef.current.getBoundingClientRect();
      const wastePile = document.querySelector('[data-waste-pile]');
      
      if (!wastePile) {
        // If can't find waste pile, skip animation
        setIsAnimating(false);
        setFlyingCard(null);
        setStockAnimating(false);
        return;
      }
      
      const wasteRect = wastePile.getBoundingClientRect();
      
      // Calculate fan offset - new card will be at rightmost position in the fan
      // After drawCard(), waste.length already includes the new card
      const CARD_FAN_OFFSET = 20;
      const wasteCount = useSolitaire.getState().waste.length;
      // Fan shows max 3 cards: positions 0, 20, 40 (scaled)
      const fanOffset = Math.min(wasteCount - 1, 2) * CARD_FAN_OFFSET * scale;
      
      const dx = wasteRect.left + fanOffset - stockRect.left;
      const dy = wasteRect.top - stockRect.top;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Adjust distance for scale (same as CardAnimation)
      const adjustedDistance = distance / scale;
      
      // Speed for stock animation (slower than card moves)
      const SPEED_PX_PER_SEC = 1200; // Slower: 1200 pixels per second
      const duration = (adjustedDistance / SPEED_PX_PER_SEC) * 1000;
      
      // Clamp duration: minimum 50ms, no maximum limit for constant speed
      const clampedDuration = Math.max(50, duration);
      
      // Animate the flying card
      const startTime = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / clampedDuration, 1);
        
        // Linear animation for constant speed
        setAnimationProgress(progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animation complete, show the card in waste pile
          setIsAnimating(false);
          setFlyingCard(null);
          setAnimationProgress(0);
          setStockAnimating(false);
          
          // Check for available moves - call directly from store for fresh state
          setTimeout(() => {
            useSolitaire.getState().checkForAvailableMoves();
          }, 50);
        }
      };
      
      requestAnimationFrame(animate);
    } else {
      // No animation for recycle action
      drawCard();
      
      // Check for available moves - call directly from store for fresh state
      setTimeout(() => {
        useSolitaire.getState().checkForAvailableMoves();
      }, 50);
    }
  };
  
  // Calculate positions for animation
  const getAnimationStyle = () => {
    if (!isAnimating || !stockPileRef.current) return {};
    
    const stockRect = stockPileRef.current.getBoundingClientRect();
    const wastePile = document.querySelector('[data-waste-pile]');
    
    if (!wastePile) return {};
    
    const wasteRect = wastePile.getBoundingClientRect();
    
    // Calculate fan offset for end position (scaled)
    const CARD_FAN_OFFSET = 20;
    const wasteCount = waste.length;
    const fanOffset = Math.min(wasteCount - 1, 2) * CARD_FAN_OFFSET * scale;
    
    // Start position (relative to viewport for fixed positioning)
    const startX = stockRect.left;
    const startY = stockRect.top;
    
    // End position (with fan offset for correct card position)
    const endX = wasteRect.left + fanOffset;
    const endY = wasteRect.top;
    
    // Calculate distance to move
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    // Apply easing to movement
    const currentX = startX + (deltaX * animationProgress);
    const currentY = startY + (deltaY * animationProgress);
    
    return {
      transform: `translate3d(${currentX}px, ${currentY}px, 0)`,
      transition: 'none' // Using manual animation
    };
  };

  return (
    <>
      <div ref={stockPileRef} style={{ position: 'relative' }}>
        <Pile
          onClick={handleClick}
          isEmpty={cards.length === 0}
          className={`${waste.length === 0 && cards.length === 0 ? "" : "cursor-pointer hover:bg-teal-600/10"} ${isDealing ? 'stock-dealing' : ''}`}
          data-stock-pile
          style={isDealing ? { animationDelay: '840ms' } : undefined}
        >
          {/* Always show top card, even during animation */}
          {topCard ? (
            <div className="w-full h-full" key={`static-${topCard.id}`}>
              <Card card={topCard} />
            </div>
          ) : waste.length > 0 ? (
            // Show recycle button only if there are cards in waste to recycle
            <div className="flex items-center justify-center h-full">
              <div className="text-lg select-none">🔄</div>
            </div>
          ) : null}
        </Pile>
      </div>
      
      {/* Flying card animation - rendered via portal */}
      {isAnimating && flyingCard && createPortal(
        <div 
          style={{
            position: 'fixed',
            zIndex: 10000,
            pointerEvents: 'none',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            ...getAnimationStyle()
          }}
        >
          <div style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}>
            {/* Simple card face up - no 3D flip */}
            <div
              className="w-20 h-[104px] bg-amber-50 p-1 shadow-md rounded-lg border border-stone-900"
              style={{ borderRadius: '0.5rem' }}
            >
              <div className="w-full h-full flex flex-col relative px-0.5 pt-0 pb-1">
                <div className="flex justify-between items-start -mx-1 -mt-0.5">
                  <div className={`${flyingCard.rank === '10' ? "text-3xl" : "text-4xl"} font-extrabold leading-none ${flyingCard.rank !== '10' ? "pl-1" : ""} ${flyingCard.color === 'red' ? "text-red-600" : "text-black"}`}>
                    {flyingCard.rank}
                  </div>
                  <div className={`${flyingCard.rank === '10' ? "text-xl" : "text-2xl"} font-extrabold leading-none ${flyingCard.color === 'red' ? "text-red-600" : "text-black"}`}>
                    {flyingCard.suit === 'hearts' ? '♥' : flyingCard.suit === 'diamonds' ? '♦' : flyingCard.suit === 'clubs' ? '♣' : '♠'}
                  </div>
                </div>
                <div className={`text-[3rem] font-black absolute bottom-[-2px] left-1/2 -translate-x-1/2 ${flyingCard.color === 'red' ? "text-red-600" : "text-black"}`}>
                  {flyingCard.suit === 'hearts' ? '♥' : flyingCard.suit === 'diamonds' ? '♦' : flyingCard.suit === 'clubs' ? '♣' : '♠'}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
