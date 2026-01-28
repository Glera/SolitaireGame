import React, { useRef, useState, useEffect } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire, wasUndoJustCompleted } from '../../lib/stores/useSolitaire';
import { clearAllDropTargetHighlights } from '../../lib/solitaire/styleManager';
import { useTouchDrag } from '../../hooks/useTouchDrag';
// Note: Keys are only distributed to tableau cards, never to stock/waste pile

interface WastePileProps {
  cards: CardType[];
}

export function WastePile({ cards }: WastePileProps) {
  const { 
    startDrag, 
    dropCards,
    canAutoMoveToFoundation, 
    autoMoveToFoundation,
    findTableauPlacementForCard,
    autoMoveToTableau,
    isDragging,
    draggedCards,
    sourceType,
    endDrag,
    animatingCard,
    setShowDragPreview,
    isStockAnimating,
    isAutoCollecting
  } = useSolitaire();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [isShaking, setIsShaking] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get last 3 cards for fan display + 4th for smooth exit
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const secondCard = cards.length > 1 ? cards[cards.length - 2] : null;
  const thirdCard = cards.length > 2 ? cards[cards.length - 3] : null;
  const fourthCard = cards.length > 3 ? cards[cards.length - 4] : null;
  
  // Card offset for fan effect (in pixels)
  const CARD_FAN_OFFSET = 20;
  
  // Track 4th card visibility with timestamp
  const fourthCardTimestampRef = useRef<{ id: string; time: number } | null>(null);
  const [, forceUpdate] = useState(0);
  
  // Check if we should show the 4th card (within 150ms of appearance)
  const shouldShowFourthCard = (() => {
    if (!fourthCard) return false;
    
    const now = Date.now();
    
    // New 4th card appeared - record timestamp
    if (!fourthCardTimestampRef.current || fourthCardTimestampRef.current.id !== fourthCard.id) {
      fourthCardTimestampRef.current = { id: fourthCard.id, time: now };
      // Schedule hide after 150ms
      setTimeout(() => forceUpdate(n => n + 1), 155);
      return true;
    }
    
    // Check if still within 150ms window
    return now - fourthCardTimestampRef.current.time < 150;
  })();

  // Track if we're in actual drag mode (not just click)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  
  // Ref for tap handler (to avoid dependency issues with useTouchDrag)
  const handleTapRef = useRef<() => void>(() => {});
  
  // Touch drag handlers - with onTap for handling taps properly
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchDrag(
    startDrag,
    endDrag,
    dropCards,
    setShowDragPreview,
    () => useSolitaire.getState(),
    () => useSolitaire.getState().draggedCards,
    () => useSolitaire.getState().sourceType,
    () => useSolitaire.getState().sourceIndex,
    () => useSolitaire.getState().sourceFoundation,
    () => handleTapRef.current() // onTap callback via ref
  );
  
  // Track if a new card just appeared (for animation)
  // Removed - no longer using scale animation
  
  // Track card count changes
  const previousCardCountRef = useRef<number>(cards.length);
  const wasJustRecycledRef = useRef<boolean>(false);
  
  // Track card count changes for recycling detection
  useEffect(() => {
    const currentCount = cards.length;
    const previousCount = previousCardCountRef.current;
    
    if (topCard && currentCount > previousCount) {
      previousCardCountRef.current = currentCount;
      wasJustRecycledRef.current = false;
    } else {
      previousCardCountRef.current = currentCount;
      if (currentCount < previousCount && currentCount === 0) {
        wasJustRecycledRef.current = true;
      }
    }
  }, [topCard, cards.length]);
  
  // Check if the top card is being dragged (only for real drag, not click)
  const isTopCardBeingDragged = () => {
    if (!topCard) return false;
    
    // Check if dragging
    if (!isDragging || sourceType !== 'waste') {
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
    
    // Show second card when stock is animating
    if (isStockAnimating) return true;
    
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
    
    // For normal moves, keep card hidden until animation FULLY completes
    // (card will appear in the NEW location, not the old one)
    return true;
  };

  // Core card action logic (used by both click and tap handlers)
  const performCardAction = () => {
    if (!topCard) return;
    
    // Block during auto-collect
    if (isAutoCollecting) {
      return;
    }
    
    // Block if THIS card is currently animating (to prevent duplicates)
    if (animatingCard && animatingCard.card.id === topCard.id) {
      return;
    }

    console.log('🎯 WastePile: Card action', topCard);

    // Special case: Aces and 2s always go to foundation immediately (no point putting them on tableau)
    if (topCard.rank === 'A' || topCard.rank === '2') {
      const foundationSuit = canAutoMoveToFoundation(topCard);
      if (foundationSuit) {
        console.log(`✅ WastePile: ${topCard.rank} moving to foundation`, foundationSuit);
        const startElement = cardRef.current;
        const endElement = document.querySelector(`[data-foundation-pile="${foundationSuit}"]`) as HTMLElement;
        autoMoveToFoundation(topCard, foundationSuit, startElement || undefined, endElement || undefined);
        return;
      }
    }

    // Priority 1: Try to find a place in tableau FIRST
    const tableauColumnIndex = findTableauPlacementForCard(topCard);
    
    console.log('🔍 WastePile: Tableau placement search result:', tableauColumnIndex);
    
    if (tableauColumnIndex !== null) {
      console.log('✅ WastePile: Moving to tableau column', tableauColumnIndex);
      const startElement = cardRef.current;
      autoMoveToTableau(topCard, tableauColumnIndex, startElement || undefined);
      return;
    }

    // Priority 2: If no tableau placement, try foundation
    const foundationSuit = canAutoMoveToFoundation(topCard);
    
    if (foundationSuit) {
      console.log('✅ WastePile: Moving to foundation', foundationSuit);
      const startElement = cardRef.current;
      const endElement = document.querySelector(`[data-foundation-pile="${foundationSuit}"]`) as HTMLElement;
      autoMoveToFoundation(topCard, foundationSuit, startElement || undefined, endElement || undefined);
      return;
    }

    // No valid moves found - shake the card
    console.log(`⚠️ No valid moves for ${topCard.suit}-${topCard.rank}`);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
  };
  
  // Update tap ref to always use latest performCardAction
  handleTapRef.current = performCardAction;

  // Click handler (for desktop) - checks for synthetic click prevention
  const handleCardClick = () => {
    // Prevent synthetic click from touch events (tap was handled by touch end)
    if ((window as any).__preventNextClick) {
      delete (window as any).__preventNextClick;
      return;
    }
    performCardAction();
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!topCard) return;
    
    // Block drag during auto-collect
    if (isAutoCollecting) {
      e.preventDefault();
      return;
    }
    
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
    
    // Use custom drag preview for waste pile cards
    setShowDragPreview(true, 
      { x: rect.left, y: rect.top },
      { x: offsetX, y: offsetY }
    );
    
    // Hide the default drag image
    const img = new Image();
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    e.dataTransfer.setDragImage(img, 0, 0);
    
    // For waste pile, use standard browser drag behavior
    startDrag([topCard], 'waste');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset drag state
    setIsActuallyDragging(false);
    
    // Clear all visual feedback immediately
    clearAllDropTargetHighlights();
    
    // Delay endDrag to allow drop events to process first
    setTimeout(() => {
      useSolitaire.getState().endDrag();
      // Clear again after ending drag
      clearAllDropTargetHighlights();
    }, 0);
  };

  // Calculate how many cards to show in fan (up to 3)
  // Visible cards: just the last 3
  const visibleCards = [thirdCard, secondCard, topCard].filter(Boolean) as CardType[];
  
  // Track previous card IDs to know which cards are "new" (shouldn't animate position)
  const prevCardIdsRef = useRef<Set<string>>(new Set());
  const currentCardIds = new Set(visibleCards.map(c => c.id));
  
  // Check if undo animation is in progress OR just completed (disable transitions to prevent flickering)
  const isUndoAnimating = animatingCard?.isUndoAnimation === true;
  const disableTransitions = isUndoAnimating || wasUndoJustCompleted();
  
  // Update after render
  useEffect(() => {
    prevCardIdsRef.current = currentCardIds;
  });
  
  // Fixed width for 3 cards to prevent layout shifts
  const FIXED_FAN_WIDTH = 80 + 2 * CARD_FAN_OFFSET; // Always space for 3 cards
  
  return (
    <Pile
      isEmpty={cards.length === 0}
      className=""
      data-waste-pile
      style={{ 
        // Fixed width for 3 cards - prevents game scale changes when fanning
        width: `${FIXED_FAN_WIDTH}px`,
        minWidth: `${FIXED_FAN_WIDTH}px`
      }}
    >
      {/* Render 4th card at position 0 for 150ms while other cards shift */}
      {/* Don't show 4th card during undo or when cards just changed to prevent flickering */}
      {shouldShowFourthCard && fourthCard && !disableTransitions && (
        <div
          key={`fourth-${fourthCard.id}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: -1
          }}
        >
          <Card
            card={fourthCard}
            isPlayable={false}
            isClickable={false}
            hasKey={false}
          />
        </div>
      )}
      
      {/* Render fan of up to 3 cards */}
      {visibleCards.map((card, index) => {
        const isTop = index === visibleCards.length - 1;
        const offset = index * CARD_FAN_OFFSET;
        
        // Check if this card should be hidden (animating from stock or being dragged)
        const shouldHideTop = isTop && (isTopCardBeingDragged() || isTopCardAnimating() || isStockAnimating);
        
        // Skip rendering the top card entirely while stock animation is playing
        // (the flying card from StockPile will show instead)
        if (shouldHideTop && isStockAnimating) {
          return null;
        }
        
        // Only animate position for cards that were already visible (not new cards)
        const wasAlreadyVisible = prevCardIdsRef.current.has(card.id);
        
        return (
          <div
            key={card.id}
            ref={isTop ? cardRef : undefined}
            style={{
              position: 'absolute',
              left: `${offset}px`,
              top: 0,
              zIndex: index,
              // Only apply transition to cards that are shifting, not new ones
              // Disable transition during undo or when cards just changed to prevent flickering
              transition: (wasAlreadyVisible && !disableTransitions) ? 'left 0.15s linear' : 'none',
              // Hide if being dragged or animating (but not stock animation - that's handled above)
              opacity: (shouldHideTop && !isStockAnimating) ? 0 : 1
            }}
            className=""
            data-card-is-top={isTop ? "true" : undefined}
          >
            <Card
              card={card}
              onClick={isTop ? handleCardClick : undefined}
              onDoubleClick={isTop ? handleCardClick : undefined}
              className={isTop && isShaking ? 'animate-shake' : ''}
              onDragStart={isTop ? handleDragStart : undefined}
              onDragEnd={isTop ? handleDragEnd : undefined}
              onTouchStart={isTop ? (e) => {
                handleTouchStart(e, [card], 'waste');
                setIsActuallyDragging(true);
              } : undefined}
              onTouchMove={isTop ? handleTouchMove : undefined}
              onTouchEnd={isTop ? (e) => {
                handleTouchEnd(e);
                setIsActuallyDragging(false);
              } : undefined}
              isPlayable={isTop}
              isDragging={isTop && isTopCardBeingDragged()}
              isAnimating={isTop && isTopCardAnimating()}
              isClickable={isTop}
              hasKey={false}
            />
          </div>
        );
      })}
      
      {/* Empty state */}
      {cards.length === 0 && <div className="w-full h-full" />}
    </Pile>
  );
}
