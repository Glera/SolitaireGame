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
  const { drawCard, waste, setStockAnimating, animatingCard } = useSolitaire();
  const { scale } = useGameScaleContext();
  const [isAnimating, setIsAnimating] = useState(false);
  const [flyingCard, setFlyingCard] = useState<CardType | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const stockPileRef = useRef<HTMLDivElement>(null);

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  
  const handleClick = () => {
    // Don't allow clicks during any animation
    // Temporarily disabled to debug
    // if (isAnimating || animatingCard) {
    //   console.log('⏸️ StockPile: Animation in progress, ignoring click');
    //   return;
    // }
    
    if (isAnimating) {
      console.log('⏸️ StockPile: Local animation in progress, ignoring click');
      return;
    }
    
    console.log('StockPile: Click, drawing card', { 
      stockCount: cards.length,
      timestamp: Date.now()
    });
    
    // Start animation if there's a card to flip
    if (topCard) {
      // Show the card face-up immediately for animation
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
      const dx = wasteRect.left - stockRect.left;
      const dy = wasteRect.top - stockRect.top;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Adjust distance for scale (same as CardAnimation)
      const adjustedDistance = distance / scale;
      
      // Speed for stock animation (slower than card moves)
      const SPEED_PX_PER_SEC = 1200; // Slower: 1200 pixels per second
      const duration = (adjustedDistance / SPEED_PX_PER_SEC) * 1000;
      
      // Clamp duration: minimum 50ms, no maximum limit for constant speed
      const clampedDuration = Math.max(50, duration);
      
      console.log(`🃏 Stock animation: distance=${Math.round(distance)}px adjustedDistance=${Math.round(adjustedDistance)}px scale=${scale.toFixed(2)} duration=${Math.round(clampedDuration)}ms`);
      
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
          console.log('🎯 Animation complete');
          setIsAnimating(false);
          setFlyingCard(null);
          setAnimationProgress(0);
          setStockAnimating(false); // Animation finished, show card in WastePile
        }
      };
      
      requestAnimationFrame(animate);
    } else {
      // No animation for recycle action
      drawCard();
    }
  };
  
  // Calculate positions for animation
  const getAnimationStyle = () => {
    if (!isAnimating || !stockPileRef.current) return {};
    
    const stockRect = stockPileRef.current.getBoundingClientRect();
    const wastePile = document.querySelector('[data-waste-pile]');
    
    if (!wastePile) return {};
    
    const wasteRect = wastePile.getBoundingClientRect();
    
    // Start position (relative to viewport for fixed positioning)
    const startX = stockRect.left;
    const startY = stockRect.top;
    
    // End position (relative to viewport for fixed positioning)
    const endX = wasteRect.left;
    const endY = wasteRect.top;
    
    // Calculate distance to move
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    // Apply easing to movement
    const currentX = startX + (deltaX * animationProgress);
    const currentY = startY + (deltaY * animationProgress);
    
    return {
      transform: `translate(${currentX}px, ${currentY}px)`,
      transition: 'none' // Using manual animation
    };
  };

  return (
    <>
      <div ref={stockPileRef} style={{ position: 'relative' }}>
        <Pile
          onClick={handleClick}
          isEmpty={cards.length === 0}
          className="cursor-pointer hover:bg-teal-600/10"
          data-stock-pile
        >
          {/* Always show top card, even during animation */}
          {topCard ? (
            <div className="w-full h-full" key={`static-${topCard.id}`}>
              <Card card={topCard} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-lg select-none">🔄</div>
            </div>
          )}
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
            ...getAnimationStyle()
          }}
        >
          <div style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}>
            <Card card={flyingCard} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
