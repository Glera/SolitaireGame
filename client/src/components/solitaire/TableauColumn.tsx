import React, { useRef, useState, useEffect } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { registerDropTarget, unregisterDropTarget, getCurrentBestTarget, setCurrentBestTarget } from '../../lib/solitaire/dropTargets';
import { clearAllDropTargetHighlights } from '../../lib/solitaire/styleManager';
import { useTouchDrag } from '../../hooks/useTouchDrag';
import { calculateStackOffsets } from '../../lib/solitaire/stackCompression';
import { useGameScaleContext } from '../../contexts/GameScaleContext';
import { cardHasKey } from '../../lib/liveops/keyManager';

interface TableauColumnProps {
  cards: CardType[];
  columnIndex: number;
}

export function TableauColumn({ cards, columnIndex }: TableauColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  
  const { 
    startDrag, 
    dropCards, 
    getMovableCardsFromTableau,
    canAutoMoveToFoundation,
    autoMoveToFoundation,
    findTableauPlacementForCard,
    autoMoveToTableau,
    autoMoveStackToTableau,
    isDragging,
    draggedCards,
    sourceType,
    sourceIndex,
    sourceFoundation,
    showDragPreview,
    setShowDragPreview,
    endDrag,
    animatingCard,
    isAutoCollecting,
    isDealing,
    dealingCardIds
  } = useSolitaire();
  
  const { scale } = useGameScaleContext();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Track if we're in actual drag mode (not just click)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  
  // Track shaking cards for invalid moves (store array of card IDs)
  const [shakingCardIds, setShakingCardIds] = useState<string[]>([]);
  
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
  
  // Register this column as drop target
  useEffect(() => {
    if (cards.length === 0) {
      // Register the column itself for empty columns
      if (columnRef.current) {
        registerDropTarget({
          type: 'tableau',
          index: columnIndex,
          element: columnRef.current
        });
      }
    } else {
      // Register only the last card as a drop target
      const lastCardIndex = cards.length - 1;
      const lastCardEl = cardRefs.current[lastCardIndex];
      if (lastCardEl) {
        registerDropTarget({
          type: 'tableau',
          index: columnIndex,
          element: lastCardEl
        });
      }
    }
    
    return () => {
      unregisterDropTarget('tableau', columnIndex);
    };
  }, [columnIndex, cards.length]); // Re-register when cards change

  const handleCardClick = (cardIndex: number) => {
    const card = cards[cardIndex];
    if (!card.faceUp) return;
    
    // Block clicks during auto-collect
    if (isAutoCollecting) {
      return;
    }

    // Get all cards from this index to the end (the stack we want to move)
    const cardsToMove = cards.slice(cardIndex);

    // Only allow moving if it's a single card (for now, stacks to tableau need special logic)
    if (cardsToMove.length === 1) {
      // Priority 1: Try auto-move to foundation first
      const foundationSuit = canAutoMoveToFoundation(card);
      if (foundationSuit) {
        const startElement = cardRefs.current[cardIndex];
        const endElement = document.querySelector(`[data-foundation-pile="${foundationSuit}"]`) as HTMLElement;
        autoMoveToFoundation(card, foundationSuit, startElement || undefined, endElement || undefined);
        return;
      }

      // Priority 2: Try to find a place in tableau (excluding current column)
      const tableauColumnIndex = findTableauPlacementForCard(card);
      
      // Make sure we don't move to the same column
      if (tableauColumnIndex !== null && tableauColumnIndex !== columnIndex) {
        const startElement = cardRefs.current[cardIndex];
        autoMoveToTableau(card, tableauColumnIndex, startElement || undefined);
        return;
      }
      
      // No valid moves found - shake the card and all cards above it
      const cardsToShake = cards.slice(cardIndex).map(c => c.id);
      setShakingCardIds(cardsToShake);
      setTimeout(() => setShakingCardIds([]), 300);
      // Check if there are any moves at all
      setTimeout(() => useSolitaire.getState().checkForAvailableMoves(), 50);
    } else {
      // For stacks, only try to move to tableau (foundation doesn't accept stacks)
      const tableauColumnIndex = findTableauPlacementForCard(card);
      
      if (tableauColumnIndex !== null && tableauColumnIndex !== columnIndex) {
        const startElement = cardRefs.current[cardIndex];
        autoMoveStackToTableau(cardsToMove, columnIndex, tableauColumnIndex, startElement || undefined);
      } else {
        // No valid moves - shake the whole stack
        const cardsToShake = cards.slice(cardIndex).map(c => c.id);
        setShakingCardIds(cardsToShake);
        setTimeout(() => setShakingCardIds([]), 300);
        // Check if there are any moves at all
        setTimeout(() => useSolitaire.getState().checkForAvailableMoves(), 50);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, cardIndex: number) => {
    // Block drag during auto-collect
    if (isAutoCollecting) {
      e.preventDefault();
      return;
    }
    
    // Mark as actually dragging
    setIsActuallyDragging(true);
    
    const movableCards = getMovableCardsFromTableau(columnIndex);
    const cardPosition = cards.length - movableCards.length;
    
    if (cardIndex >= cardPosition) {
      const cardsToMove = movableCards.slice(cardIndex - cardPosition);
      
      // Calculate offset from the click position to the card position
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      // Always use custom drag preview for tableau cards
      setShowDragPreview(true, 
        { x: rect.left, y: rect.top },
        { x: offsetX, y: offsetY }
      );
      
      // Hide the default drag image
      const img = new Image();
      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      e.dataTransfer.setDragImage(img, 0, 0);
      
      // Start drag with standard browser behavior
      startDrag(cardsToMove, 'tableau', columnIndex);
      e.dataTransfer.effectAllowed = 'move';
    } else {
      e.preventDefault();
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    console.log('🔚 handleDragEnd on TableauColumn', columnIndex, {
      dropEffect: e.dataTransfer.dropEffect,
      timestamp: Date.now()
    });
    
    // Reset actual dragging state
    setIsActuallyDragging(false);
    
    // Delay endDrag to allow drop events to process first
    setTimeout(() => {
      useSolitaire.getState().endDrag();
    }, 0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Use collision-based target if available
    const bestTarget = getCurrentBestTarget();
    
    console.log('🎯 DROP EVENT on TableauColumn', columnIndex, {
      bestTarget: bestTarget ? {
        type: bestTarget.type,
        index: bestTarget.index,
        suit: bestTarget.suit
      } : null,
      draggedCards: draggedCards.map(c => `${c.suit}-${c.rank}`),
      sourceType,
      sourceIndex,
      sourceFoundation,
      isDragging,
      timestamp: Date.now()
    });
    
    if (bestTarget && bestTarget.type === 'tableau' && bestTarget.index === columnIndex) {
      // This is the best target based on collision detection
      console.log('✅ Dropping on THIS column via collision', columnIndex);
      dropCards('tableau', columnIndex);
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
      console.log('📍 No collision target, using cursor position drop on column', columnIndex);
      dropCards('tableau', columnIndex);
    }
    
    console.log('🧹 Clearing highlights after drop');
    // Clear the current target and all visual feedback
    setCurrentBestTarget(null);
    clearAllDropTargetHighlights();
  };

  const movableCards = getMovableCardsFromTableau(columnIndex);
  const movableStartIndex = cards.length - movableCards.length;

  // Check if this card is being dragged from this column or animating
  const isCardBeingDragged = (cardIndex: number) => {
    const card = cards[cardIndex];
    
    // Check if dragging from this specific column
    if (!isDragging || sourceType !== 'tableau' || sourceIndex !== columnIndex) {
      return false;
    }
    
    // Check if this card is in the dragged cards list
    const isBeingDragged = draggedCards.some(draggedCard => draggedCard.id === card.id);
    
    // Hide dragged cards only during ACTUAL dragging (not just click)
    return isBeingDragged && card.faceUp && isActuallyDragging;
  };
  
  // Check if card is animating to foundation or tableau
  const isCardAnimating = (cardIndex: number) => {
    const card = cards[cardIndex];
    if (!animatingCard) return false;
    
    // Check if this card is part of the animation
    const isThisCard = animatingCard.card.id === card.id;
    const isInStack = animatingCard.stackCards && animatingCard.sourceTableauColumn === columnIndex &&
                      animatingCard.stackCards.some(stackCard => stackCard.id === card.id);
    
    // For undo animations, hide any card that matches the animating card
    // This covers both tableau-to-tableau and foundation-to-tableau undo
    const isUndoCard = animatingCard.isUndoAnimation && 
                       (animatingCard.card.id === card.id ||
                        (animatingCard.stackCards && animatingCard.stackCards.some(sc => sc.id === card.id)));
    
    if (!isThisCard && !isInStack && !isUndoCard) return false;
    
    // For return animations, show cards when near complete (80%+) to avoid flicker
    if (animatingCard.isReturnAnimation && animatingCard.isNearComplete) {
      return false;
    }
    
    // For undo animations, always hide the card being animated
    if (animatingCard.isUndoAnimation) {
      return true;
    }
    
    // For normal moves, keep cards hidden until animation FULLY completes
    // (cards will appear in the NEW location, not the old one)
    return true;
  };

  return (
    <div 
      className="relative" 
      ref={columnRef} 
      data-tableau-column={columnIndex} 
      data-drop-target={`tableau-${columnIndex}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        console.log('💧 Drop on main container', columnIndex);
        e.preventDefault();
        e.stopPropagation();
        handleDrop(e);
      }}
    >
      {/* Removed expanded drop zone - using only actual card bounds for precise drag & drop */}
      <Pile
        onDrop={(e) => {
          console.log('💧 Drop on Pile', columnIndex);
          e.preventDefault();
          e.stopPropagation();
          handleDrop(e);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        isEmpty={cards.length === 0 || (isDragging && sourceType === 'tableau' && sourceIndex === columnIndex && draggedCards.length === cards.length)}
        label="K"
        className="mb-2 relative z-10"
      >
        {(cards.length === 0 || (isDragging && sourceType === 'tableau' && sourceIndex === columnIndex && draggedCards.length === cards.length)) && (
          <div className="w-full h-full" />
        )}
      </Pile>
      
      <div className="absolute top-0 left-0 z-10" data-cards-container="true">
        {(() => {
          // Calculate offsets once for all cards with dynamic compression
          const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
          
          // Get the actual position of this column on screen
          const columnElement = columnRef.current;
          let availableHeight = 500; // Default fallback
          
          if (columnElement) {
            const columnRect = columnElement.getBoundingClientRect();
            const columnTop = columnRect.top;
            
            // Available height = from column top to ad banner (60px from bottom)
            const AD_BANNER_HEIGHT = 60;
            const screenBottom = window.innerHeight - AD_BANNER_HEIGHT;
            const screenAvailable = screenBottom - columnTop;
            
            // Convert to game coordinates (minimal padding to maximize card space)
            availableHeight = (screenAvailable / scale) - 5;
          }
          
          const offsets = calculateStackOffsets(cards, availableHeight, isMobile);
          
          // Calculate global card index for dealing animation delay
          // Cards before this column: sum of (i+1) for i from 0 to columnIndex-1 = columnIndex*(columnIndex+1)/2
          const cardsBeforeColumn = (columnIndex * (columnIndex + 1)) / 2;
          
          return cards.map((card, index) => {
            const cumulativeOffset = offsets[index];
            const globalCardIndex = cardsBeforeColumn + index;
            const dealDelay = globalCardIndex * 30; // 30ms between each card
            
            // Only apply dealing animation to cards that were dealt at game start
            const shouldAnimate = isDealing && dealingCardIds.has(card.id);
            
            return (
            <div
              key={card.id}
              ref={el => cardRefs.current[index] = el}
              className={`absolute ${shakingCardIds.includes(card.id) ? 'animate-shake' : ''} ${shouldAnimate ? 'card-dealing' : ''}`}
              style={{ 
                top: `${cumulativeOffset}px`,
                zIndex: (index + 1) * 10, // Explicit z-index (10, 20, 30...) - allows keys to have z-index between cards (e.g. 15, 25)
                animationDelay: shouldAnimate ? `${dealDelay}ms` : undefined,
                transform: 'translate3d(0, 0, 0)', // Base transform for consistent shake animation
              }}
              data-card-id={card.id}
              data-card-index={index}
              data-card-is-top={index === cards.length - 1}
              onDragOver={(e) => { 
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => { 
                console.log('💧 Drop on card', card.id, 'in column', columnIndex);
                e.preventDefault();
                handleDrop(e); 
              }}
            >
            <Card
              card={card}
              onClick={() => handleCardClick(index)}
              onDoubleClick={() => handleCardClick(index)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => {
                const movableCards = getMovableCardsFromTableau(columnIndex);
                const cardPosition = cards.length - movableCards.length;
                if (index >= cardPosition) {
                  const cardsToMove = movableCards.slice(index - cardPosition);
                  handleTouchStart(e, cardsToMove, 'tableau', columnIndex);
                  setIsActuallyDragging(true);
                }
              }}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => {
                handleTouchEnd(e);
                setIsActuallyDragging(false);
              }}
              isPlayable={card.faceUp && index >= movableStartIndex}
              isDragging={isCardBeingDragged(index)}
              isAnimating={isCardAnimating(index)}
              hasKey={cardHasKey(card.id)}
            />
          </div>
          );
        });
        })()}
      </div>
    </div>
  );
}
