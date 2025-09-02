import React, { useRef, useState, useEffect } from 'react';
import { Card } from './Card';
import { Pile } from './Pile';
import { Card as CardType } from '../../lib/solitaire/types';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { registerDropTarget, unregisterDropTarget, getCurrentBestTarget } from '../../lib/solitaire/dropTargets';

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
    isDragging,
    draggedCards,
    sourceType,
    sourceIndex,
    showDragPreview,
    setShowDragPreview,
    endDrag,
    animatingCard
  } = useSolitaire();
  
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Track if we're in actual drag mode (not just click)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  
  // Register this column as a drop target
  useEffect(() => {
    if (columnRef.current) {
      registerDropTarget({
        type: 'tableau',
        index: columnIndex,
        element: columnRef.current
      });
    }
    
    return () => {
      unregisterDropTarget('tableau', columnIndex);
    };
  }, [columnIndex]);

  const handleCardClick = (cardIndex: number) => {
    const card = cards[cardIndex];
    if (!card.faceUp) return;

    // Check if this is the top card and can be auto-moved to foundation
    if (cardIndex === cards.length - 1) {
      const foundationSuit = canAutoMoveToFoundation(card);
      if (foundationSuit) {
        const startElement = cardRefs.current[cardIndex];
        const endElement = document.getElementById(`foundation-${foundationSuit}`);
        autoMoveToFoundation(card, foundationSuit, startElement || undefined, endElement || undefined);
        return;
      }
    }
    
    // For clicks without drag, don't start drag state
    // Just check for auto-move, don't make cards transparent
  };

  const handleDragStart = (e: React.DragEvent, cardIndex: number) => {
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
    
    if (bestTarget && bestTarget.type === 'tableau' && bestTarget.index === columnIndex) {
      // This is the best target based on collision detection
      dropCards('tableau', columnIndex);
    } else if (bestTarget) {
      // There's a better target, drop there instead
      if (bestTarget.type === 'tableau') {
        dropCards('tableau', bestTarget.index);
      } else if (bestTarget.type === 'foundation' && bestTarget.suit) {
        dropCards('foundation', undefined, bestTarget.suit);
      }
    } else {
      // No collision detected, use traditional drop
      dropCards('tableau', columnIndex);
    }
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
  
  // Check if card is animating to foundation
  const isCardAnimating = (cardIndex: number) => {
    const card = cards[cardIndex];
    return !!(animatingCard && animatingCard.card.id === card.id);
  };

  return (
    <div className="relative" ref={columnRef} data-tableau-column={columnIndex} data-drop-target="tableau">
      {/* Invisible expanded drop zone - doesn't block clicks */}
      <div 
        className="absolute -inset-8 z-0 pointer-events-none"
        style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
        onDragOver={(e) => { 
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          // Visual feedback for tableau drop zone
          e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
          e.currentTarget.style.border = '2px dashed rgb(34, 197, 94)';
        }}
        onDragLeave={(e) => {
          // Remove visual feedback
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.border = '';
        }}
        onDrop={(e) => { 
          e.preventDefault();
          // Remove visual feedback
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.border = '';
          handleDrop(e); 
        }}
      />
      <Pile
        onDrop={handleDrop}
        isEmpty={cards.length === 0 || (isDragging && sourceType === 'tableau' && sourceIndex === columnIndex && draggedCards.length === cards.length)}
        label="K"
        className="mb-2 relative z-10"
      >
        {(cards.length === 0 || (isDragging && sourceType === 'tableau' && sourceIndex === columnIndex && draggedCards.length === cards.length)) && (
          <div className="w-full h-full" />
        )}
      </Pile>
      
      <div className="absolute top-0 left-0 z-10">
        {cards.map((card, index) => (
          <div
            key={card.id}
            ref={el => cardRefs.current[index] = el}
            className="absolute"
            style={{ top: `${index * 18}px` }}
            onDragOver={(e) => { 
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              // Visual feedback when dragging over a card
              e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
              e.currentTarget.style.outline = '2px dashed rgb(34, 197, 94)';
            }}
            onDragLeave={(e) => {
              // Remove visual feedback
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.outline = '';
            }}
            onDrop={(e) => { 
              e.preventDefault();
              // Remove visual feedback
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.outline = '';
              handleDrop(e); 
            }}
          >
            <Card
              card={card}
              onClick={() => handleCardClick(index)}
              onDoubleClick={() => handleCardClick(index)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              isPlayable={card.faceUp && index >= movableStartIndex}
              isDragging={isCardBeingDragged(index)}
              isAnimating={isCardAnimating(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
