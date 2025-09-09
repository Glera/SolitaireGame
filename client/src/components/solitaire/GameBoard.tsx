import React, { useEffect, useState } from 'react';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { useAudio } from '../../lib/stores/useAudio';
import { useProgressGift } from '../../hooks/useProgressGift';
import { TableauColumn } from './TableauColumn';
import { FoundationPile } from './FoundationPile';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { GameControls } from './GameControls';
import { CardAnimation } from './CardAnimation';
import { DragPreview } from './DragPreview';
import { DebugPopup, setDebugCallback, type DebugInfo } from '../DebugPopup';
import { clearAllDropTargetHighlights } from '../../lib/solitaire/styleManager';
import { setAddPointsFunction } from '../../lib/solitaire/progressManager';

export function GameBoard() {
  const { 
    tableau, 
    foundations, 
    stock, 
    waste, 
    isWon,
    endDrag,
    animatingCard,
    completeCardAnimation,
    showDragPreview,
    draggedCards,
    dragPreviewPosition,
    dragOffset,
    isDragging,
    onGiftEarned,
    newGame
  } = useSolitaire();
  
  const { playSuccess } = useAudio();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Progress bar integration
  const { containerRef, addPoints, reinitialize } = useProgressGift(onGiftEarned);
  
  // Register addPoints function with progress manager
  useEffect(() => {
    setAddPointsFunction(addPoints);
    return () => {
      setAddPointsFunction(() => {});
    };
  }, [addPoints]);
  
  // Reset progress bar on component mount
  useEffect(() => {
    reinitialize();
  }, []); // Empty dependency array - only run on mount

  // Set up debug callback
  useEffect(() => {
    setDebugCallback((info: DebugInfo) => {
      // Only show debug info if panel is open
      if (showDebugPanel) {
        setDebugInfo(info);
      }
    });
  }, [showDebugPanel]);

  // Play success sound when game is won
  useEffect(() => {
    if (isWon) {
      playSuccess();
    }
  }, [isWon, playSuccess]);
  
  // Clean up any visual feedback when drag ends
  useEffect(() => {
    if (!isDragging) {
      // Clear all visual feedback when not dragging
      clearAllDropTargetHighlights();
    }
  }, [isDragging]);

  // Note: Drag end is now handled by individual drag components via onDragEnd

  return (
    <div className="min-h-screen bg-green-800 p-3" data-game-board>
      <div className="max-w-fit mx-auto">
        {/* Progress Bar Container */}
        <div style={{
          position: 'relative',
          height: '65px',
          zIndex: 1,
          marginBottom: '10px',
          pointerEvents: 'none'
        }}>
          <div ref={containerRef} className="w-full h-full" style={{ pointerEvents: 'none' }} />
        </div>
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          <GameControls onDebugClick={() => setShowDebugPanel(true)} />
        </div>
        
        <div className="inline-block space-y-3" data-game-field style={{ position: 'relative', zIndex: 2 }}>
          {/* Top row: Stock, Waste, and Foundation piles - aligned with 7 columns */}
          <div className="flex gap-2 items-start">
            <StockPile cards={stock} />
            <WastePile cards={waste} />
            <div className="w-16" /> {/* Empty space equivalent to 1 card */}
            <FoundationPile cards={foundations.hearts} suit="hearts" id="foundation-hearts" />
            <FoundationPile cards={foundations.diamonds} suit="diamonds" id="foundation-diamonds" />
            <FoundationPile cards={foundations.clubs} suit="clubs" id="foundation-clubs" />
            <FoundationPile cards={foundations.spades} suit="spades" id="foundation-spades" />
          </div>
          
          {/* Bottom row: Tableau columns */}
          <div className="flex gap-2">
            {tableau.map((column, index) => (
              <div key={index} className="min-h-32">
                <TableauColumn cards={column} columnIndex={index} />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Render animating card */}
      {animatingCard && (
        <div style={{ position: 'fixed', zIndex: 1000, pointerEvents: 'none' }}>
          <CardAnimation
            card={animatingCard.card}
            startPosition={animatingCard.startPosition}
            endPosition={animatingCard.endPosition}
            onComplete={() => completeCardAnimation(animatingCard.card, animatingCard.targetSuit)}
          />
        </div>
      )}
      
      {/* Render drag preview for dragged cards */}
      {showDragPreview && draggedCards.length > 0 && dragPreviewPosition && (
        <div style={{ position: 'fixed', zIndex: 1000, pointerEvents: 'none' }}>
          <DragPreview
            cards={draggedCards}
            startPosition={dragPreviewPosition}
            offset={dragOffset || { x: 32, y: 48 }}
          />
        </div>
      )}
      
      
      {/* Debug popup */}
      {showDebugPanel && (
        <div style={{ position: 'fixed', zIndex: 1001 }}>
          <DebugPopup 
            info={debugInfo}
            onClose={() => setShowDebugPanel(false)}
          />
        </div>
      )}
    </div>
  );
}
