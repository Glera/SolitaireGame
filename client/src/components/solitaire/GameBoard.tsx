import React, { useEffect, useState } from 'react';
import { useSolitaire } from '../../lib/stores/useSolitaire';
import { useAudio } from '../../lib/stores/useAudio';
import { useProgressGift } from '../../hooks/useProgressGift';
import { useFloatingScores } from '../../hooks/useFloatingScores';
import { useGameScaleContext } from '../../contexts/GameScaleContext';
import { TableauColumn } from './TableauColumn';
import { FoundationPile } from './FoundationPile';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { GameControls, GAME_VERSION } from './GameControls';
import { CardAnimation } from './CardAnimation';
import { DragPreview } from './DragPreview';
import { DebugPopup, setDebugCallback, type DebugInfo } from '../DebugPopup';
import { FloatingScore } from '../FloatingScore';
import { RoomInfo } from './RoomInfo';
import { clearAllDropTargetHighlights } from '../../lib/solitaire/styleManager';
import { setAddPointsFunction } from '../../lib/solitaire/progressManager';
import { setAddFloatingScoreFunction } from '../../lib/solitaire/floatingScoreManager';

// Debug overlay component to show available space
function DebugAreaOverlay({ containerHeight, availableHeight, scale }: { containerHeight: number; availableHeight: number; scale: number }) {
  const AD_SPACE = 0;
  const PROGRESS_BAR = 95;
  const CONTROLS = 30;
  const PADDING = 15;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 10000
    }}>
      {/* Top reserved space (Progress bar + Controls + Padding) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: `${PROGRESS_BAR + CONTROLS + PADDING}px`,
        background: 'rgba(255, 0, 0, 0.15)',
        borderBottom: '2px dashed red'
      }}>
        <div style={{
          position: 'absolute',
          top: '5px',
          left: '5px',
          background: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '4px 8px',
          fontSize: '12px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          Reserved Top: {PROGRESS_BAR + CONTROLS + PADDING}px
        </div>
      </div>
      
      {/* Available game area */}
      <div style={{
        position: 'absolute',
        top: `${PROGRESS_BAR + CONTROLS + PADDING}px`,
        left: 0,
        right: 0,
        height: `${availableHeight}px`,
        border: '3px solid lime',
        background: 'rgba(0, 255, 0, 0.05)'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 255, 0, 0.9)',
          color: 'white',
          padding: '8px 16px',
          fontSize: '14px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          textAlign: 'center'
        }}>
          <div>Available Game Area</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            Width: {window.innerWidth}px<br/>
            Height: {availableHeight}px<br/>
            Scale: {scale.toFixed(2)}x
          </div>
        </div>
      </div>
      
      {/* Info panel */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.6'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🎯 Debug Info</div>
        <div>Container: {window.innerWidth}x{containerHeight}px</div>
        <div>Available: {availableHeight}px height</div>
        <div>Scale: {scale.toFixed(3)}x</div>
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
          <div>Progress Bar: {PROGRESS_BAR}px</div>
          <div>Controls: {CONTROLS}px</div>
          <div>Padding: {PADDING}px</div>
        </div>
      </div>
    </div>
  );
}

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
    newGame,
    roomType
  } = useSolitaire();
  
  const { playSuccess } = useAudio();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showAreaDebug, setShowAreaDebug] = useState(false); // Debug overlay disabled by default
  
  // Game scale for responsive layout
  const { scale, containerHeight, availableHeight } = useGameScaleContext();
  
  // Progress bar integration
  const { containerRef, addPoints, reinitialize } = useProgressGift(onGiftEarned, roomType);
  
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
    
    // Test floating score after 2 seconds (disabled for production)
    // setTimeout(() => {
    //   console.log('🧪 Testing floating score...');
    //   addFloatingScore(100, window.innerWidth / 2, window.innerHeight / 2, 'TEST');
    // }, 2000);
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
    <div 
      className="min-h-screen bg-green-800 flex flex-col items-center justify-start" 
      data-game-board
      style={{ 
        paddingTop: '5px',
        paddingBottom: '5px',
        overflow: 'hidden'
      }}
    >
      <div 
        className="w-full" 
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div className="max-w-fit mx-auto">
          {/* Progress Bar Container */}
          <div style={{
            position: 'relative',
            height: '95px',
            zIndex: 1,
            marginBottom: '5px',
            pointerEvents: 'none'
          }}>
            <div ref={containerRef} className="w-full h-full" style={{ pointerEvents: 'none' }} />
          </div>
          
          <div style={{ position: 'relative', zIndex: 2, marginTop: '0px' }}>
            <div className="flex justify-between items-center mb-3">
              <RoomInfo roomType={roomType} gameVersion={GAME_VERSION} />
              <GameControls onDebugClick={() => setShowDebugPanel(true)} />
            </div>
          </div>
          
          <div className="inline-block space-y-3" data-game-field style={{ position: 'relative', zIndex: 2, marginTop: '10px' }}>
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
      </div>
      
      {/* Render animating card */}
      {animatingCard && (
        <div style={{ position: 'fixed', zIndex: 1000, pointerEvents: 'none' }}>
          <CardAnimation
            card={animatingCard.card}
            startPosition={animatingCard.startPosition}
            endPosition={animatingCard.endPosition}
            onComplete={() => completeCardAnimation(animatingCard.card, animatingCard.targetSuit, animatingCard.cardStartPosition)}
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
            isPremium={score.isPremium}
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
      
      {/* Area Debug Overlay */}
      {showAreaDebug && (
        <DebugAreaOverlay 
          containerHeight={containerHeight}
          availableHeight={availableHeight}
          scale={scale}
        />
      )}
      
      {/* Toggle button for area debug */}
      <button
        onClick={() => setShowAreaDebug(!showAreaDebug)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: showAreaDebug ? 'rgba(0, 255, 0, 0.9)' : 'rgba(128, 128, 128, 0.9)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          zIndex: 10001,
          fontWeight: 'bold',
          pointerEvents: 'auto'
        }}
      >
        {showAreaDebug ? '🟢 Hide Debug' : '⚪ Show Debug'}
      </button>
    </div>
  );
}
