import React, { useRef, useState, useEffect } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType, Suit } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { registerDropTarget, unregisterDropTarget, getCurrentBestTarget, setCurrentBestTarget } from '../../lib/solitaire/dropTargets';
import { clearAllDropTargetHighlights } from '../../lib/solitaire/styleManager';
import { useTouchDrag } from '../../hooks/useTouchDrag';

interface FoundationPileProps {
  cards: CardType[];
  suit: Suit;
  id?: string;
}

export function FoundationPile({ cards, suit, id }: FoundationPileProps) {
  const { 
    dropCards, 
    startDrag, 
    canAutoMoveToFoundation, 
    autoMoveToFoundation,
    isDragging,
    draggedCards,
    sourceType,
    sourceFoundation,
    endDrag,
    animatingCard,
    setShowDragPreview,
    findTableauPlacementForCard,
    moveFoundationToTableau
  } = useSolitaire();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const foundationRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if we're in actual drag mode (not just click)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  
  // Track recently clicked cards to prevent duplication
  const recentlyClickedRef = useRef<string | null>(null);
  
  // Touch drag handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchDrag(
    startDrag,
    endDrag,
    dropCards,
    setShowDragPreview,
    () => useSolitaire.getState(),
    () => useSolitaire.getState().draggedCards,
    () => useSolitaire.getState().sourceType,
    () => useSolitaire.getState().sourceIndex,
    () => useSolitaire.getState().sourceFoundation
  );
  
  // Register this foundation as a drop target
  useEffect(() => {
    if (foundationRef.current) {
      registerDropTarget({
        type: 'foundation',
        suit: suit,
        element: foundationRef.current
      });
    }
    
    return () => {
      unregisterDropTarget('foundation', undefined, suit);
    };
  }, [suit]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Use collision-based target if available
    const bestTarget = getCurrentBestTarget();
    
    console.log('🎯 DROP EVENT on FoundationPile', suit, {
      bestTarget: bestTarget ? {
        type: bestTarget.type,
        index: bestTarget.index,
        suit: bestTarget.suit
      } : null,
      draggedCards: draggedCards.map(c => `${c.suit}-${c.rank}`),
      sourceType,
      sourceFoundation,
      isDragging,
      timestamp: Date.now()
    });
    
    if (bestTarget && bestTarget.type === 'foundation' && bestTarget.suit === suit) {
      // This is the best target based on collision detection
      console.log('✅ Dropping on THIS foundation via collision', suit);
      dropCards('foundation', undefined, suit);
    } else if (bestTarget) {
      // There's a better target, drop there instead
      console.log('➡️ Redirecting to better target:', bestTarget.type, bestTarget.index || bestTarget.suit);
      if (bestTarget.type === 'tableau') {
        dropCards('tableau', bestTarget.index);
      } else if (bestTarget.type === 'foundation' && bestTarget.suit) {
        dropCards('foundation', undefined, bestTarget.suit);
      }
    } else {
      // No collision detected, use traditional drop
      console.log('📍 No collision target, using cursor position drop on foundation', suit);
      dropCards('foundation', undefined, suit);
    }
    
    console.log('🧹 Clearing highlights after drop');
    // Clear the current target and all visual feedback
    setCurrentBestTarget(null);
    clearAllDropTargetHighlights();
  };

  const topCard = cards && cards.length > 0 ? cards[cards.length - 1] : null;
  const secondCard = cards && cards.length > 1 ? cards[cards.length - 2] : null;
  
  // Check if a card is flying TO this foundation (to show it early and avoid flicker)
  // Exclude undo animations - those cards are flying AWAY from foundation, not to it
  const incomingCard = animatingCard && 
    animatingCard.targetSuit === suit && 
    !animatingCard.isReturnAnimation &&
    !animatingCard.isTableauMove &&
    !animatingCard.isUndoAnimation
      ? animatingCard.card 
      : null;
  
  // Check if the top card is being dragged (only for real drag, not click)
  const isTopCardBeingDragged = () => {
    if (!topCard) return false;
    
    // Check if dragging from this foundation
    if (!isDragging || sourceType !== 'foundation' || sourceFoundation !== suit) {
      return false;
    }
    
    const isInDraggedCards = draggedCards.some(draggedCard => draggedCard.id === topCard.id);
    
    // Only hide card if we're actually dragging (not just clicked)
    return isInDraggedCards && isActuallyDragging;
  };
  
  // Check if we should show the second card (card underneath)
  const shouldShowSecondCard = () => {
    if (!secondCard) return false;
    if (!topCard) return false;
    
    // Show second card when top card is being dragged
    if (isTopCardBeingDragged()) return true;
    
    // Show second card when top card is animating
    if (animatingCard && animatingCard.card.id === topCard.id) {
      // For return animations, show second card until animation is near complete (80%)
      if (animatingCard.isReturnAnimation) {
        return !animatingCard.isNearComplete;
      }
      // For normal moves, show second card until animation FULLY completes
      return true;
    }
    
    return false;
  };
  
  // Check if the top card should be hidden (for rendering purposes)
  const isTopCardAnimating = () => {
    if (!topCard) return false;
    if (!animatingCard || animatingCard.card.id !== topCard.id) return false;
    
    // For return animations, show card when near complete (80%+) to avoid flicker
    if (animatingCard.isReturnAnimation && animatingCard.isNearComplete) {
      return false;
    }
    
    // For undo animations (card flying back from foundation), always hide
    if (animatingCard.isUndoAnimation) {
      return true;
    }
    
    // For normal moves, keep card hidden until animation FULLY completes
    // (card will appear in the NEW location, not the old one)
    return true;
  };
  
  const handleCardClick = () => {
    if (!topCard) return;
    
    // Block if this card was recently clicked (prevents duplication)
    if (recentlyClickedRef.current === topCard.id) {
      return;
    }
    
    // Mark card as recently clicked and clear after animation time
    recentlyClickedRef.current = topCard.id;
    setTimeout(() => {
      recentlyClickedRef.current = null;
    }, 300);
    
    // Check if there's a valid tableau placement for this card
    const targetColumn = findTableauPlacementForCard(topCard);
    if (targetColumn !== null) {
      // Move card from foundation back to tableau
      const startElement = cardRef.current;
      moveFoundationToTableau(topCard, suit, startElement || undefined);
    }
  };
  
  const handleDragStart = (e: React.DragEvent) => {
    if (!topCard) return;
    
    // Clear any click timeout since we're actually dragging
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // Mark that we're actually dragging (not just clicking)
    setIsActuallyDragging(true);
    
    // Calculate offset from the click position to the card position
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Use custom drag preview for foundation cards
    setShowDragPreview(true, 
      { x: rect.left, y: rect.top },
      { x: offsetX, y: offsetY }
    );
    
    // Hide the default drag image
    const img = new Image();
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    e.dataTransfer.setDragImage(img, 0, 0);
    
    // Start drag from foundation
    startDrag([topCard], 'foundation', undefined, suit);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Reset drag state
    setIsActuallyDragging(false);
    
    // Delay endDrag to allow drop events to process first
    setTimeout(() => {
      useSolitaire.getState().endDrag();
    }, 0);
  };

  return (
    <div 
      id={id} 
      className="relative" 
      ref={foundationRef} 
      data-drop-target="foundation"
      data-foundation-pile={suit}
    >
      {/* Invisible expanded drop zone - doesn't block clicks */}
      <div 
        className="absolute -inset-8 z-0 pointer-events-none"
        style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
        onDragOver={(e) => { 
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => { 
          e.preventDefault();
          handleDrop(e); 
        }}
      />
      <Pile
        onDrop={handleDrop}
        isEmpty={!cards || cards.length === 0}
        className="bg-teal-600/20 border-teal-400/50 relative z-10"
      >
      {/* Show second card when top card is being moved to a NEW location */}
      {shouldShowSecondCard() && secondCard && (
        <div style={{ position: 'absolute', top: 0, left: 0 }}>
          <Card 
            card={secondCard} 
            isPlayable={false}
            isDragging={false}
            isAnimating={false}
          />
        </div>
      )}
      
      {/* Show incoming card early (when animation is 80%+) to avoid flicker */}
      {incomingCard && animatingCard?.isNearComplete && (
        <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
          <Card 
            card={incomingCard} 
            isPlayable={false}
            isDragging={false}
            isAnimating={false}
          />
        </div>
      )}
      
      {/* Show top card */}
      {topCard ? (
        <div ref={cardRef} style={{ position: 'relative', zIndex: 1 }}>
          <Card 
            card={topCard} 
            onClick={handleCardClick}
            onDoubleClick={handleCardClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => {
              if (topCard) {
                handleTouchStart(e, [topCard], 'foundation', undefined, suit);
                setIsActuallyDragging(true);
              }
            }}
            onTouchMove={handleTouchMove}
            onTouchEnd={(e) => {
              handleTouchEnd(e);
              setIsActuallyDragging(false);
            }}
            isPlayable={true}
            isDragging={isTopCardBeingDragged()}
            isAnimating={isTopCardAnimating()}
          />
        </div>
      ) : null}
      
      {/* Show ace symbol when empty OR when top card is being dragged */}
      {(!topCard || isTopCardBeingDragged() || isTopCardAnimating()) && (
        <div className="w-full h-full absolute top-0 left-0 p-1" style={{ zIndex: 0 }}>
          <div className="text-lg font-bold opacity-40 select-none text-white">
            A
          </div>
        </div>
      )}
      </Pile>
    </div>
  );
}
