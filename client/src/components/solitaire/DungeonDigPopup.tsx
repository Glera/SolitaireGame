import React, { useState, useEffect, useRef } from 'react';
import { DungeonDigEvent, DungeonTile, TileReward, DungeonFloor, MilestoneReward } from '../../lib/liveops/dungeonDig/types';
import { canDigTile, formatTimeRemaining, DEFAULT_CONFIG, addShovels, getFloorGridSize } from '../../lib/liveops/dungeonDig';
import { MiniCardPack } from './MiniCardPack';
import { COLLECTION_PACKS } from '../../lib/liveops/pointsEvent';

interface DungeonDigPopupProps {
  isVisible: boolean;
  onClose: () => void;
  event: DungeonDigEvent;
  onEventUpdate: (event: DungeonDigEvent) => void;
  onRewardClaimed: (reward: TileReward, tilePosition?: { x: number; y: number }) => void;
  onDigTile: (floorId: number, tileId: string) => { reward: TileReward | null; floorCompleted: boolean; milestoneUnlocked?: number };
  onMilestoneReward?: (floorIdx: number, reward: MilestoneReward) => void;
  onStarsEarned?: (stars: number, position: { x: number; y: number }) => void;
  onEventComplete?: () => void; // Called when all 10 floors are completed
  showEventCompleteOverlay?: boolean; // Controlled by parent - show after all rewards claimed
  isPackPopupOpen?: boolean; // True when pack popup is open - blocks tile digging
}

// Single tile component
const Tile: React.FC<{
  tile: DungeonTile;
  floor: DungeonFloor;
  isDiggable: boolean;
  hasShovels: boolean;
  onClick: (e: React.MouseEvent) => void;
  tileSize?: string;
  textSize?: string;
  entryRevealed?: boolean;
}> = ({ tile, floor, isDiggable, hasShovels, onClick, tileSize = 'w-12 h-12', textSize = 'text-xl', entryRevealed = true }) => {
  const [isDigging, setIsDigging] = useState(false);
  const [showEntryAnimation, setShowEntryAnimation] = useState(false);
  
  // Trigger entry reveal animation
  useEffect(() => {
    if (tile.isEntry && entryRevealed && !showEntryAnimation) {
      setShowEntryAnimation(true);
    }
  }, [tile.isEntry, entryRevealed, showEntryAnimation]);
  
  // Entry tile - special appearance (door icon) or hidden before reveal
  if (tile.isEntry) {
    // Before reveal - show as undug tile
    if (!entryRevealed) {
      return (
        <div 
          className={`${tileSize} rounded-md flex items-center justify-center`}
          style={{
            background: 'linear-gradient(135deg, #3f3f46 0%, #27272a 100%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            border: '1px solid rgba(0,0,0,0.3)',
          }}
        >
          <span className={`${textSize} opacity-70`}>■</span>
        </div>
      );
    }
    
    // After reveal - show door with animation
    return (
      <div 
        className={`${tileSize} rounded-md flex items-center justify-center transition-all duration-300`}
        style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(0,0,0,0.3)',
          animation: showEntryAnimation ? 'bounceIn 0.4s ease-out' : undefined,
        }}
        title="Вход"
      >
        <span className={textSize}>🚪</span>
      </div>
    );
  }
  
  // Dug tile - show reward
  if (tile.dug) {
    return (
      <div 
        className={`${tileSize} rounded-md flex items-center justify-center`}
        style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(0,0,0,0.3)',
        }}
      >
        <span className={textSize}>
          {tile.reward.type === 'exit' && '🚪'}
          {tile.reward.type === 'empty' && '·'}
          {tile.reward.type === 'stars' && '·'}
          {tile.reward.type === 'pack' && '·'}
        </span>
      </div>
    );
  }
  
  const canDig = isDiggable && hasShovels;
  const canClick = isDiggable; // Allow clicking to show "no shovels" hint
  
  return (
    <button
      onClick={(e) => {
        if (!canClick) return;
        if (canDig) {
          setIsDigging(true);
          setTimeout(() => setIsDigging(false), 200);
        }
        onClick(e); // Always call onClick if tile is diggable (parent handles no shovels case)
      }}
      disabled={!canClick}
      className={`${tileSize} rounded-md transition-all duration-150 flex items-center justify-center ${
        isDigging ? 'scale-90' : ''
      } ${canClick ? 'hover:scale-105 cursor-pointer active:scale-95' : 'cursor-not-allowed'} ${canDig ? 'hover:scale-110' : ''}`}
      style={{
        background: isDiggable 
          ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
          : 'linear-gradient(135deg, #3f3f46 0%, #27272a 100%)',
        boxShadow: isDiggable 
          ? '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
          : '0 1px 3px rgba(0,0,0,0.3)',
        border: isDiggable 
          ? '2px solid rgba(251, 191, 36, 0.6)' 
          : '1px solid rgba(0,0,0,0.3)',
        opacity: !hasShovels && isDiggable ? 0.6 : 1,
      }}
    >
      <span className={`${textSize} opacity-70`}>
        {isDiggable ? '?' : '■'}
      </span>
    </button>
  );
};

// Floor view component - top-down dungeon map
const FloorView: React.FC<{
  floor: DungeonFloor;
  event: DungeonDigEvent;
  onTileClick: (tile: DungeonTile, e: React.MouseEvent) => void;
  entryRevealed: boolean;
  adjacentUnlocked: boolean;
}> = ({ floor, event, onTileClick, entryRevealed, adjacentUnlocked }) => {
  // Get grid size for this floor
  const gridSize = getFloorGridSize(floor.id);
  
  const rows: DungeonTile[][] = [];
  
  // Group tiles by row
  for (let row = 0; row < gridSize.rows; row++) {
    rows.push(floor.tiles.filter(t => t.row === row).sort((a, b) => a.col - b.col));
  }
  
  // Tile size classes based on grid size (smaller grids = larger tiles)
  const getTileSize = () => {
    if (gridSize.rows <= 4) return 'w-14 h-14';  // 4x4 - largest tiles
    if (gridSize.rows <= 5) return 'w-12 h-12';  // 5x5 - medium tiles
    return 'w-10 h-10';                           // 6x6 - smaller tiles
  };
  
  const getTextSize = () => {
    if (gridSize.rows <= 4) return 'text-2xl';
    if (gridSize.rows <= 5) return 'text-xl';
    return 'text-lg';
  };
  
  return (
    <div className="flex flex-col gap-0.5 items-center">
      {rows.map((rowTiles, rowIndex) => (
        <div key={rowIndex} className="flex gap-0.5">
          {rowTiles.map(tile => (
            <Tile
              key={tile.id}
              tile={tile}
              floor={floor}
              isDiggable={adjacentUnlocked && canDigTile(floor, tile)}
              hasShovels={event.shovels > 0}
              onClick={(e) => onTileClick(tile, e)}
              tileSize={getTileSize()}
              textSize={getTextSize()}
              entryRevealed={entryRevealed}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Pack rarity colors and names
const getPackStyle = (rarity: number) => {
  switch (rarity) {
    case 5: return { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', name: 'Легендарный' };
    case 4: return { bg: 'linear-gradient(135deg, #a855f7, #7c3aed)', name: 'Эпический' };
    case 3: return { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', name: 'Редкий' };
    case 2: return { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', name: 'Необычный' };
    default: return { bg: 'linear-gradient(135deg, #9ca3af, #6b7280)', name: 'Обычный' };
  }
};

export const DungeonDigPopup: React.FC<DungeonDigPopupProps> = ({
  isVisible,
  onClose,
  event,
  onEventUpdate,
  onRewardClaimed,
  onDigTile,
  onMilestoneReward,
  onStarsEarned,
  onEventComplete,
  showEventCompleteOverlay,
  isPackPopupOpen
}) => {
  const [showNoShovelsHint, setShowNoShovelsHint] = useState(false);
  const [currentViewFloor, setCurrentViewFloor] = useState(event.currentFloor);
  const [showExitFound, setShowExitFound] = useState(false);
  const [exitFoundLock, setExitFoundLock] = useState(false); // Block digging after exit found
  const [hideMilestoneOnFloor, setHideMilestoneOnFloor] = useState<number | null>(null); // Hide milestone icon when exit found
  const [pendingMilestone, setPendingMilestone] = useState<{ floorIdx: number; reward: MilestoneReward } | null>(null);
  const [pendingFloorTransition, setPendingFloorTransition] = useState<number | null>(null); // Floor to transition to after tap
  const [flyingGiftStart, setFlyingGiftStart] = useState<{ floorIdx: number; startX: number; startY: number } | null>(null); // Gift flying from floor selector with exact position
  const [flyingGiftProgress, setFlyingGiftProgress] = useState(0); // 0-1 animation progress
  const floorButtonRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Entry tile reveal animation - tracks which floor has had entry revealed
  const [entryRevealedFloors, setEntryRevealedFloors] = useState<Set<number>>(new Set());
  // Adjacent tiles unlock - tracks which floors have adjacent tiles available for digging
  const [adjacentUnlockedFloors, setAdjacentUnlockedFloors] = useState<Set<number>>(new Set());
  // Reward unwrap animation states
  const [rewardUnwrapPhase, setRewardUnwrapPhase] = useState<'idle' | 'showing'>('idle');
  const [unwrappingReward, setUnwrappingReward] = useState<{ floorIdx: number; reward: MilestoneReward } | null>(null);
  const [starsClaimed, setStarsClaimed] = useState(false);
  const [packClaimed, setPackClaimed] = useState(false);
  const [rewardsRevealed, setRewardsRevealed] = useState(0); // 0 = none, 1 = stars, 2 = both
  const packRewardRef = useRef<HTMLDivElement>(null);
  // Event completion state (after floor 10)
  const [showEventComplete, setShowEventComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const floorSelectorRef = useRef<HTMLDivElement>(null);
  const starsProgressBarRef = useRef<HTMLDivElement>(null);
  
  // Don't auto-sync floors - only sync when popup opens with a new floor
  useEffect(() => {
    // Only update if not showing any overlay and floors are different
    if (!showExitFound && !pendingMilestone && !pendingFloorTransition && !flyingGiftStart && rewardUnwrapPhase === 'idle') {
      setCurrentViewFloor(event.currentFloor);
    }
  }, [event.currentFloor, showExitFound, pendingMilestone, pendingFloorTransition, flyingGiftStart, rewardUnwrapPhase]);
  
  // Entry reveal animation - reveal entry tile after short delay when viewing a new floor
  useEffect(() => {
    if (!isVisible) return;
    if (entryRevealedFloors.has(currentViewFloor)) return;
    
    // Delay the entry reveal for a nice effect
    const timer = setTimeout(() => {
      setEntryRevealedFloors(prev => new Set([...prev, currentViewFloor]));
    }, 400); // 400ms delay before revealing entry
    
    return () => clearTimeout(timer);
  }, [isVisible, currentViewFloor, entryRevealedFloors]);
  
  // Unlock adjacent tiles after entry is revealed
  useEffect(() => {
    if (!isVisible) return;
    if (!entryRevealedFloors.has(currentViewFloor)) return; // Entry not yet revealed
    if (adjacentUnlockedFloors.has(currentViewFloor)) return; // Already unlocked
    
    // Delay adjacent unlock after entry reveal animation completes
    const timer = setTimeout(() => {
      setAdjacentUnlockedFloors(prev => new Set([...prev, currentViewFloor]));
    }, 350); // 350ms after entry reveal for adjacent tiles to become available
    
    return () => clearTimeout(timer);
  }, [isVisible, currentViewFloor, entryRevealedFloors, adjacentUnlockedFloors]);
  
  // Reset reward states and start sequential reveal when unwrapping starts
  useEffect(() => {
    if (rewardUnwrapPhase === 'showing' && unwrappingReward) {
      setStarsClaimed(false);
      setPackClaimed(false);
      setRewardsRevealed(0);
      
      // Reveal rewards sequentially
      const hasStars = !!unwrappingReward.reward.stars;
      const hasPack = !!unwrappingReward.reward.packRarity;
      
      // First reward appears after short delay
      setTimeout(() => {
        setRewardsRevealed(1);
        
        // Second reward (if exists) appears after another delay
        if ((hasStars && hasPack)) {
          setTimeout(() => {
            setRewardsRevealed(2);
          }, 300);
        }
      }, 200);
    }
  }, [rewardUnwrapPhase, unwrappingReward]);
  
  // Flying gift animation
  useEffect(() => {
    if (!flyingGiftStart) return;
    
    setFlyingGiftProgress(0);
    const duration = 500; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setFlyingGiftProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - show the milestone tap overlay
        const milestoneReward = DEFAULT_CONFIG.milestoneRewards[flyingGiftStart.floorIdx];
        if (milestoneReward) {
          setPendingMilestone({ floorIdx: flyingGiftStart.floorIdx, reward: milestoneReward });
        }
        setFlyingGiftStart(null);
        setFlyingGiftProgress(0);
      }
    };
    
    requestAnimationFrame(animate);
  }, [flyingGiftStart]);
  
  // Finish claiming pack and close reward overlay
  const finishPackClaim = () => {
    if (!unwrappingReward) return;
    
    // Get pack position for animation source
    const packRect = packRewardRef.current?.getBoundingClientRect();
    const sourcePosition = packRect ? {
      x: packRect.left + packRect.width / 2,
      y: packRect.top + packRect.height / 2
    } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    // Trigger milestone reward with source position for pack animation
    if (onMilestoneReward) {
      // Pass source position through a custom property on the reward
      onMilestoneReward(unwrappingReward.floorIdx, { 
        ...unwrappingReward.reward,
        sourcePosition 
      } as MilestoneReward & { sourcePosition: { x: number; y: number } });
    }
    
    const completedFloorIdx = unwrappingReward.floorIdx;
    const completedReward = unwrappingReward.reward;
    setRewardUnwrapPhase('idle');
    setUnwrappingReward(null);
    
    // Check if this was floor 10 (index 9) - event complete!
    // Don't show internal overlay if there was a pack reward - parent will show it after pack claimed
    if (completedFloorIdx === 9 && !completedReward?.packRarity) {
      setShowEventComplete(true);
    } else if (pendingFloorTransition !== null) {
      // Transition to next floor
      setCurrentViewFloor(pendingFloorTransition);
      setPendingFloorTransition(null);
      setExitFoundLock(false); // Allow digging on new floor
      setHideMilestoneOnFloor(null); // Reset milestone visibility
    }
  };
  
  // Handle claiming stars
  const handleClaimStars = () => {
    if (!unwrappingReward || starsClaimed) return;
    setStarsClaimed(true);
    
    if (unwrappingReward.reward.stars && onStarsEarned) {
      onStarsEarned(unwrappingReward.reward.stars, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    
    // If no pack, finish after stars
    if (!unwrappingReward.reward.packRarity) {
      setTimeout(() => {
        // Mark milestone as claimed
        if (onMilestoneReward) {
          onMilestoneReward(unwrappingReward.floorIdx, unwrappingReward.reward);
        }
        
        const completedFloorIdx = unwrappingReward.floorIdx;
        setRewardUnwrapPhase('idle');
        setUnwrappingReward(null);
        
        if (completedFloorIdx === 9) {
          setShowEventComplete(true);
        } else if (pendingFloorTransition !== null) {
          setCurrentViewFloor(pendingFloorTransition);
          setPendingFloorTransition(null);
          setExitFoundLock(false);
          setHideMilestoneOnFloor(null);
        }
      }, 800); // Wait for stars animation
    }
  };
  
  // Handle tap anywhere to claim next reward
  const handleClaimNextReward = () => {
    if (!unwrappingReward) return;
    
    const hasStars = !!unwrappingReward.reward.stars;
    const hasPack = !!unwrappingReward.reward.packRarity;
    
    // Claim stars first if not claimed
    if (hasStars && !starsClaimed) {
      handleClaimStars();
      return;
    }
    
    // Then claim pack
    if (hasPack && !packClaimed) {
      handleClaimPack();
      return;
    }
  };
  
  // Handle claiming pack
  const handleClaimPack = () => {
    if (!unwrappingReward || packClaimed || !unwrappingReward.reward.packRarity) return;
    
    // If stars not claimed yet, claim them first
    if (unwrappingReward.reward.stars && !starsClaimed) {
      handleClaimStars();
      // Auto-claim pack after a delay
      setTimeout(() => {
        setPackClaimed(true);
        // Small delay for visual feedback, then trigger pack popup
        setTimeout(() => finishPackClaim(), 100);
      }, 1000);
    } else {
      setPackClaimed(true);
      // Small delay for visual feedback, then trigger pack popup
      setTimeout(() => finishPackClaim(), 100);
    }
  };
  
  if (!isVisible) return null;
  
  const currentFloor = event.floors[currentViewFloor];
  if (!currentFloor) return null;
  
  const handleTileClick = (tile: DungeonTile, e: React.MouseEvent) => {
    if (tile.dug || tile.isEntry) return;
    
    // Block digging after exit found
    if (exitFoundLock) return;
    
    // Block digging while pack popup is open
    if (isPackPopupOpen) return;
    
    if (event.shovels <= 0) {
      setShowNoShovelsHint(true);
      setTimeout(() => setShowNoShovelsHint(false), 2500);
      return;
    }
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const tilePosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    const result = onDigTile(currentViewFloor, tile.id);
    
    if (result.reward) {
      // Show exit found animation
      if (result.reward.type === 'exit') {
        // Block further digging immediately
        setExitFoundLock(true);
        
        // Check if this floor has a milestone reward
        const milestoneReward = DEFAULT_CONFIG.milestoneRewards[currentViewFloor];
        const alreadyClaimed = event.milestoneClaimed?.includes(currentViewFloor);
        
        // Store the next floor to transition to
        const nextFloor = currentViewFloor + 1;
        if (nextFloor < DEFAULT_CONFIG.totalFloors) {
          setPendingFloorTransition(nextFloor);
        }
        
        // Give player 1 second to see the door before showing transition overlay
        setTimeout(() => {
          // Get gift icon position from the floor button
          const getGiftPosition = (floorIdx: number) => {
            const buttonEl = floorButtonRefs.current.get(floorIdx);
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (buttonEl && containerRect) {
              const buttonRect = buttonEl.getBoundingClientRect();
              // Gift icon is positioned at top-right of button (-top-1 -right-1)
              return {
                startX: buttonRect.right - 4 - containerRect.left,
                startY: buttonRect.top - 4 - containerRect.top
              };
            }
            // Fallback to center
            return { startX: containerRect?.width ? containerRect.width / 2 : 150, startY: 50 };
          };
          
          // Check if this is the final floor (floor 10 = index 9)
          if (currentViewFloor === 9) {
            if (milestoneReward && !alreadyClaimed) {
              // Hide gift icon and start flying animation simultaneously
              setHideMilestoneOnFloor(currentViewFloor);
              const pos = getGiftPosition(currentViewFloor);
              setFlyingGiftStart({ floorIdx: currentViewFloor, ...pos });
            } else {
              // No milestone - show event complete directly
              setShowEventComplete(true);
            }
          } else if (milestoneReward && !alreadyClaimed) {
            // Hide gift icon and start flying animation simultaneously
            setHideMilestoneOnFloor(currentViewFloor);
            const pos = getGiftPosition(currentViewFloor);
            setFlyingGiftStart({ floorIdx: currentViewFloor, ...pos });
          } else {
            // No milestone - show exit found overlay (tap to continue)
            setShowExitFound(true);
          }
        }, 1000);
      }
      
      // Pass tile position to GameBoard for pack flying animation
      onRewardClaimed(result.reward, tilePosition);
    }
  };
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div 
        ref={containerRef}
        className="relative bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-4 mx-3 shadow-2xl border border-stone-600 max-w-sm w-full max-h-[90vh] overflow-hidden"
        style={{ animation: 'modalSlideIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">Подземелье</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-700 hover:bg-stone-600 text-white transition-colors text-xl"
          >
            ×
          </button>
        </div>
        
        {/* Timer & Shovels */}
        <div className="flex items-center justify-between mb-3 px-2">
          {event.endTime && (
            <span className="text-xs text-stone-400">⏱️ {formatTimeRemaining(event.endTime)}</span>
          )}
          <div className="flex items-center gap-2">
            {/* Debug: Add shovels button */}
            <button
              onClick={() => {
                const updated = addShovels(5);
                onEventUpdate(updated);
              }}
              className="w-6 h-6 rounded-full bg-amber-600/50 hover:bg-amber-600/70 text-white text-xs font-bold transition-colors border border-amber-500/50"
              title="Добавить 5 лопаток"
            >
              +5
            </button>
            <div 
              className="px-3 py-1 rounded-full flex items-center gap-1.5 text-sm"
              style={{
                background: event.shovels > 0 
                  ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
                  : 'rgba(0,0,0,0.4)'
              }}
            >
              <span>🪏</span>
              <span className={`font-bold ${event.shovels > 0 ? 'text-amber-200' : 'text-stone-400'}`}>
                {event.shovels}
              </span>
            </div>
          </div>
        </div>
        
        {/* No shovels hint */}
        {showNoShovelsHint && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-800/95 text-white px-5 py-3 rounded-xl z-50 text-center shadow-xl border border-stone-600">
            <div className="text-2xl mb-2">🪏</div>
            <div className="text-sm font-bold mb-1">Нет лопаток!</div>
            <div className="text-xs text-stone-300">Зарабатывай лопатки,<br/>раскладывая пасьянс</div>
          </div>
        )}
        
        {/* Event complete overlay - tap to close */}
        {(showEventComplete || showEventCompleteOverlay) && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 rounded-2xl cursor-pointer"
            onClick={() => {
              setShowEventComplete(false);
              if (onEventComplete) onEventComplete();
              onClose();
            }}
          >
            <div className="text-center px-4">
              {/* Trophy icon */}
              <div 
                className="text-7xl mb-4"
                style={{ 
                  animation: 'pulse 1.5s ease-in-out infinite',
                  filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8))'
                }}
              >
                🏆
              </div>
              
              {/* Congratulations */}
              <div 
                className="text-2xl font-bold text-amber-400 mb-2"
                style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
              >
                Поздравляем!
              </div>
              
              <div className="text-base text-stone-300 mb-4">
                Вы прошли все 10 этажей подземелья!
              </div>
              
              {/* Tap hint */}
              <div className="text-xs text-stone-400">
                Нажми, чтобы закрыть
              </div>
            </div>
          </div>
        )}
        
        {/* Exit found overlay - tap to continue */}
        {showExitFound && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 rounded-2xl cursor-pointer"
            onClick={() => {
              setShowExitFound(false);
              // Transition to next floor
              if (pendingFloorTransition !== null) {
                setCurrentViewFloor(pendingFloorTransition);
                setPendingFloorTransition(null);
                setExitFoundLock(false); // Allow digging on new floor
                setHideMilestoneOnFloor(null); // Reset milestone visibility
              }
            }}
          >
            <div className="text-center">
              {/* Tap hint */}
              <div 
                className="text-xl font-bold text-emerald-400"
                style={{ animation: 'pulse 1s ease-in-out infinite' }}
              >
                Выход найден!
              </div>
              
              {/* Floor text */}
              <div className="text-xs text-stone-400 mt-2">
                Нажми, чтобы продолжить
              </div>
            </div>
          </div>
        )}
        
        {/* Milestone reward - tap to claim gift */}
        {pendingMilestone && rewardUnwrapPhase === 'idle' && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 rounded-2xl cursor-pointer"
            onClick={() => {
              // Start unwrap animation - show rewards in row
              setUnwrappingReward(pendingMilestone);
              setPendingMilestone(null);
              setRewardUnwrapPhase('showing');
            }}
          >
            <div className="text-center">
              {/* Gift icon with pulse animation */}
              <div 
                className="text-7xl mb-4"
                style={{ 
                  animation: 'pulse 1s ease-in-out infinite',
                  filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8))'
                }}
              >
                🎁
              </div>
              
              {/* Tap hint */}
              <div 
                className="text-lg font-bold text-amber-300"
                style={{ animation: 'pulse 1s ease-in-out infinite' }}
              >
                Нажми!
              </div>
              
              {/* Floor completion text */}
              <div className="text-xs text-stone-400 mt-2">
                Этаж {pendingMilestone.floorIdx + 1} пройден
              </div>
            </div>
          </div>
        )}
        
        {/* Reward unwrap - show rewards in a row */}
        {unwrappingReward && rewardUnwrapPhase === 'showing' && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 rounded-2xl cursor-pointer"
            onClick={handleClaimNextReward}
          >
            <div className="text-center">
              {/* Floor completion text */}
              <div className="text-sm text-stone-400 mb-6">
                Этаж {unwrappingReward.floorIdx + 1} пройден!
              </div>
              
              {/* Rewards in a row - appear sequentially, stay in place when claimed */}
              <div className="flex justify-center items-center gap-8 mb-6" style={{ minHeight: '80px' }}>
                {/* Stars reward - invisible when claimed but keeps space */}
                {unwrappingReward.reward.stars && (
                  <div 
                    className={`flex flex-col items-center transition-all duration-300 ${
                      rewardsRevealed >= 1 && !starsClaimed ? 'opacity-100 translate-y-0 scale-100' : 
                      starsClaimed ? 'opacity-0 scale-75' : 'opacity-0 translate-y-4 scale-75'
                    }`}
                    style={{ 
                      animation: rewardsRevealed >= 1 && !starsClaimed ? 'bounceIn 0.4s ease-out' : undefined,
                      pointerEvents: starsClaimed ? 'none' : 'auto'
                    }}
                  >
                    <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.6))' }}>⭐</span>
                    <span className="font-bold text-xl text-amber-400 mt-1">
                      +{unwrappingReward.reward.stars}
                    </span>
                  </div>
                )}
                
                {/* Pack reward - invisible when claimed but keeps space */}
                {unwrappingReward.reward.packRarity && (
                  <div 
                    ref={packRewardRef}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      (unwrappingReward.reward.stars ? rewardsRevealed >= 2 : rewardsRevealed >= 1) && !packClaimed ? 'opacity-100 translate-y-0 scale-100' : 
                      packClaimed ? 'opacity-0 scale-75' : 'opacity-0 translate-y-4 scale-75'
                    }`}
                    style={{ 
                      animation: (unwrappingReward.reward.stars ? rewardsRevealed >= 2 : rewardsRevealed >= 1) && !packClaimed ? 'bounceIn 0.4s ease-out' : undefined,
                      pointerEvents: packClaimed ? 'none' : 'auto'
                    }}
                  >
                    <MiniCardPack 
                      color={COLLECTION_PACKS[unwrappingReward.reward.packRarity as 1|2|3|4|5]?.color || '#9ca3af'} 
                      stars={unwrappingReward.reward.packRarity} 
                      size={56} 
                    />
                  </div>
                )}
              </div>
              
              {/* Single tap hint at bottom */}
              {(!starsClaimed || !packClaimed) && (
                <div className="text-sm text-stone-400 animate-pulse">
                  Нажми, чтобы забрать награды
                </div>
              )}
            </div>
          </div>
        )}
        
        
        {/* Flying gift animation overlay */}
        {flyingGiftStart && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 rounded-2xl pointer-events-none">
            {(() => {
              const containerRect = containerRef.current?.getBoundingClientRect();
              if (!containerRect) return null;
              
              // Start from exact gift icon position (stored when animation started)
              const startX = flyingGiftStart.startX;
              const startY = flyingGiftStart.startY;
              // End at center of container (same as flex centering)
              const endX = containerRect.width / 2;
              const endY = containerRect.height / 2;
              
              // Ease out cubic
              const eased = 1 - Math.pow(1 - flyingGiftProgress, 3);
              
              const currentX = startX + (endX - startX) * eased;
              const currentY = startY + (endY - startY) * eased;
              // text-7xl = 4.5rem = 72px, start at ~10px icon, end at 72px
              // Starting scale ~0.14, ending scale 1.0 for 72px font
              const scale = 0.14 + 0.86 * eased;
              
              return (
                <div
                  className="absolute text-7xl"
                  style={{
                    left: currentX,
                    top: currentY,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8))',
                  }}
                >
                  🎁
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Floor selector */}
        <div ref={floorSelectorRef} className="flex justify-center gap-1 mb-3 flex-wrap">
          {event.floors.slice(0, Math.min(10, event.floors.length)).map((floor, idx) => {
            const hasMilestone = DEFAULT_CONFIG.milestoneRewards[idx] !== undefined;
            const milestoneClaimed = event.milestoneClaimed?.includes(idx);
            
            return (
              <div 
                key={floor.id} 
                className="relative"
                ref={(el) => {
                  if (el) floorButtonRefs.current.set(idx, el);
                }}
              >
                <button
                  onClick={() => setCurrentViewFloor(idx)}
                  disabled={idx > event.currentFloor}
                  className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                    idx === currentViewFloor
                      ? 'bg-amber-600 text-white scale-110'
                      : floor.completed
                        ? 'bg-emerald-600 text-white'
                        : idx <= event.currentFloor
                          ? 'bg-stone-600 text-stone-300 hover:bg-stone-500'
                          : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                  }`}
                >
                  {idx + 1}
                </button>
                {/* Milestone indicator - hide when gift is flying or exit found on this floor */}
                {hasMilestone && !milestoneClaimed && flyingGiftStart?.floorIdx !== idx && hideMilestoneOnFloor !== idx && (
                  <span className="absolute -top-1 -right-1 text-[8px]">🎁</span>
                )}
                {hasMilestone && milestoneClaimed && (
                  <span className="absolute -top-1 -right-1 text-[8px]">✓</span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Floor grid - top-down dungeon view */}
        <div className="bg-stone-950/60 rounded-xl p-3 overflow-auto" style={{ maxHeight: '55vh' }}>
          <FloorView
            floor={currentFloor}
            event={event}
            onTileClick={handleTileClick}
            entryRevealed={entryRevealedFloors.has(currentViewFloor)}
            adjacentUnlocked={adjacentUnlockedFloors.has(currentViewFloor)}
          />
        </div>
        
        {/* Legend */}
        <div className="mt-3 flex justify-center gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)' }} />
            <span>Копать</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-stone-600" />
            <span>Закрыто</span>
          </div>
        </div>
        
        {/* Hint */}
        <div className="mt-2 text-center text-[10px] text-stone-500">
          Копай от входа 🚪 • Найди выход на следующий этаж
        </div>
      </div>
    </div>
  );
};
