import React, { useEffect, useState } from 'react';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { useAudio } from '../../lib/stores/useAudio';
import { useProgressGift } from '../../hooks/useProgressGift';
import { useFloatingScores } from '../../hooks/useFloatingScores';
import { FloatingScore } from '../FloatingScore';
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
import { setAddFloatingScoreFunction } from '../../lib/solitaire/floatingScoreManager';

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
  
  // Floating scores integration
  const { floatingScores, addFloatingScore, removeFloatingScore } = useFloatingScores();
  
  // Register addPoints function with progress manager
  useEffect(() => {
    setAddPointsFunction(addPoints);
    return () => {
      setAddPointsFunction(() => {});
    };
  }, [addPoints]);
  
  // Register addFloatingScore function with floating score manager
  useEffect(() => {
    console.log(`🎯 GameBoard: Registering addFloatingScore function`);
    setAddFloatingScoreFunction(addFloatingScore);
    return () => {
      console.log(`🎯 GameBoard: Unregistering addFloatingScore function`);
      setAddFloatingScoreFunction(() => {});
    };
  }, [addFloatingScore]);
  
  // Reset progress bar on component mount
  useEffect(() => {
    reinitialize();
    
    // Test floating score after 2 seconds
    setTimeout(() => {
      console.log('🧪 Testing floating score...');
      console.log('🧪 addFloatingScore function:', addFloatingScore);
      console.log('🧪 Window dimensions:', window.innerWidth, window.innerHeight);
      addFloatingScore(100, window.innerWidth / 2, window.innerHeight / 2, 'TEST');
    }, 2000);
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
          marginBottom: '5px',
          pointerEvents: 'none'
        }}>
          <div ref={containerRef} className="w-full h-full" style={{ pointerEvents: 'none' }} />
        </div>
        
        <div style={{ position: 'relative', zIndex: 2, marginTop: '35px' }}>
          <GameControls onDebugClick={() => setShowDebugPanel(true)} />
        </div>
        
        <div className="inline-block space-y-3" data-game-field style={{ position: 'relative', zIndex: 2, marginTop: '20px' }}>
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
      
      
      {/* Floating scores */}
      {floatingScores.length > 0 && console.log(`🎯 GameBoard: Rendering ${floatingScores.length} floating scores`)}
      {floatingScores.map(score => {
        const handleComplete = () => {
          console.log(`🎯 GameBoard: Removing floating score ${score.id}`);
          removeFloatingScore(score.id);
        };
        
        return (
          <FloatingScore
            key={score.id}
            score={score.score}
            x={score.x}
            y={score.y}
            breakdown={score.breakdown}
            onComplete={handleComplete}
          />
        );
      })}
      
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
