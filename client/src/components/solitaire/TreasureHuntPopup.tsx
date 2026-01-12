import React, { useState, useEffect } from 'react';
import { 
  TreasureHuntEvent, 
  TreasureChest, 
  ChestReward,
  openChest,
  formatEventTimeRemaining,
  claimMilestone,
  completeEvent,
  MILESTONE_REWARDS
} from '../../lib/liveops/treasureHunt';

interface TreasureHuntPopupProps {
  isVisible: boolean;
  onClose: () => void;
  event: TreasureHuntEvent;
  onEventUpdate: (event: TreasureHuntEvent) => void;
  onRewardClaimed: (reward: ChestReward, chestPosition?: { x: number; y: number }) => void;
  isLocked: boolean;
  requiredLevel: number;
}

export const TreasureHuntPopup: React.FC<TreasureHuntPopupProps> = ({
  isVisible,
  onClose,
  event,
  onEventUpdate,
  onRewardClaimed,
  isLocked,
  requiredLevel
}) => {
  const [openingChests, setOpeningChests] = useState<Set<string>>(new Set());
  const [showNoKeysHint, setShowNoKeysHint] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  // Track chest click positions for reward animation
  const [chestClickPosition, setChestClickPosition] = useState<{ x: number; y: number } | null>(null);
  // Track which chests have appeared (for staggered animation)
  const [visibleChests, setVisibleChests] = useState<Set<number>>(new Set());
  const [lastRoomId, setLastRoomId] = useState<number | null>(null);
  // Milestone reward popup
  const [showMilestoneReward, setShowMilestoneReward] = useState<number | null>(null);
  // Block chest animation while milestone is being shown
  const [waitingForMilestone, setWaitingForMilestone] = useState(false);
  
  // Staggered chest appearance when room changes
  useEffect(() => {
    if (!isVisible) return;
    // Don't animate new room chests if milestone reward is showing
    if (waitingForMilestone || showMilestoneReward !== null) return;
    
    const currentRoomId = event.currentRoom;
    const currentRoom = event.rooms[currentRoomId];
    
    // If room changed or first load, animate chests appearing
    if (lastRoomId !== currentRoomId && currentRoom) {
      setVisibleChests(new Set());
      setLastRoomId(currentRoomId);
      
      // Stagger chest appearances
      currentRoom.chests.forEach((_, idx) => {
        setTimeout(() => {
          setVisibleChests(prev => new Set([...prev, idx]));
        }, idx * 100); // 100ms between each chest
      });
    }
  }, [isVisible, event.currentRoom, lastRoomId, waitingForMilestone, showMilestoneReward]);
  
  // Update time remaining
  useEffect(() => {
    if (!event.endTime) return;
    
    const updateTime = () => {
      setTimeRemaining(formatEventTimeRemaining(event.endTime!));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [event.endTime]);
  
  if (!isVisible) return null;
  
  const currentRoom = event.rooms[event.currentRoom];
  const completedRooms = event.rooms.filter(r => r.completed).length;
  
  const handleChestClick = (chest: TreasureChest, clickEvent: React.MouseEvent) => {
    // Already opened or currently opening this chest
    if (chest.opened || openingChests.has(chest.id)) return;
    
    // No keys - show hint
    if (event.keys <= 0) {
      setShowNoKeysHint(true);
      setTimeout(() => setShowNoKeysHint(false), 3000);
      return;
    }
    
    // Get chest position from the button element (not the click target which might be a child)
    const button = (clickEvent.currentTarget as HTMLElement);
    const rect = button.getBoundingClientRect();
    const chestPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    
    // Mark this chest as opening (allows parallel animations)
    setOpeningChests(prev => new Set([...prev, chest.id]));
    
    setTimeout(() => {
      const roomIdBeforeOpen = event.currentRoom;
      const result = openChest(roomIdBeforeOpen, chest.id);
      onEventUpdate(result.event);
      
      // Trigger reward animations (no popup) - rewards fly from chest position
      if (result.reward) {
        onRewardClaimed(result.reward, chestPos);
      }
      
      // Check for milestone bonus (rooms 5 and 10) - show popup
      if (result.milestoneUnlocked !== undefined) {
        // Block chest animation until milestone is claimed
        setWaitingForMilestone(true);
        // Slight delay so it doesn't overlap with chest reward
        setTimeout(() => {
          setShowMilestoneReward(result.milestoneUnlocked!);
        }, 500);
      }
      
      // Remove from opening set
      setOpeningChests(prev => {
        const next = new Set(prev);
        next.delete(chest.id);
        return next;
      });
    }, 600); // Faster - no popup to wait for
  };
  
  const handleClaimMilestone = () => {
    if (showMilestoneReward === null) return;
    
    const isLastRoom = showMilestoneReward === 9; // Room 10 (index 9)
    
    const result = claimMilestone(showMilestoneReward);
    onEventUpdate(result.event);
    
    // Trigger reward animation from center
    const centerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    onRewardClaimed({ type: 'stars', stars: result.stars }, centerPos);
    
    setShowMilestoneReward(null);
    
    // If last room - complete event and close popup
    if (isLastRoom) {
      setTimeout(() => {
        const completedEvent = completeEvent();
        onEventUpdate(completedEvent);
        onClose();
      }, 1000); // Short delay for stars to start flying
    } else {
      // Wait for stars animation to complete before showing new room chests
      setTimeout(() => {
        setWaitingForMilestone(false);
      }, 1500); // Stars fly ~1-1.5 seconds
    }
  };
  
  // Locked state
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-sm mx-4 border-2 border-gray-600 shadow-2xl">
          <div className="text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h2 className="text-xl font-bold text-white mb-2">Охота за сокровищами</h2>
            <p className="text-gray-400 mb-4">
              Достигни {requiredLevel}-го уровня, чтобы открыть увлекательное событие!
            </p>
            <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-400">
                🎁 Открывай сундуки с наградами<br/>
                🔑 Собирай ключи в пасьянсе<br/>
                ⭐ Получай звёзды и предметы
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Calculate chest positions for 3D layout
  const getChestPositions = (count: number) => {
    const positions: { x: number; y: number; z: number }[] = [];
    const rows = Math.ceil(count / 4);
    let idx = 0;
    
    for (let row = 0; row < rows && idx < count; row++) {
      const chestsInRow = Math.min(4, count - idx);
      // Add padding from edges (start at 10%, each takes ~20% leaving room)
      const startX = 10 + (4 - chestsInRow) * 10; // Center the row with edge padding
      
      for (let col = 0; col < chestsInRow && idx < count; col++) {
        positions.push({
          x: startX + col * 20 + (row % 2) * 6, // Stagger rows, less spread
          y: 22 + row * 28,
          z: row
        });
        idx++;
      }
    }
    return positions;
  };
  
  const chestPositions = getChestPositions(currentRoom?.chests.length || 0);
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl max-w-lg w-full mx-4 border border-amber-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/80 to-orange-900/80 px-4 py-3 border-b border-amber-500/30 relative">
          <button
            onClick={onClose}
            className="absolute right-2 top-2 w-8 h-8 flex items-center justify-center text-amber-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            ✕
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-amber-100">🎁 Комната {event.currentRoom + 1}</h2>
            {event.endTime && (
              <span className="text-sm text-amber-300/70">⏱️ {timeRemaining}</span>
            )}
          </div>
        </div>
        
        {/* Progress bar with milestone chests */}
        <div className="px-4 py-2 bg-black/30">
          {/* Milestone indicators */}
          <div className="flex gap-1 mb-1 relative h-8">
            {event.rooms.map((room, idx) => {
              const isMilestone = idx === 4 || idx === 9;
              const isMilestoneClaimed = event.milestoneClaimed?.includes(idx);
              
              return (
                <div key={room.id} className="flex-1 relative">
                  {/* Milestone chest above 5th and 10th room - hide if claimed */}
                  {isMilestone && !isMilestoneClaimed && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl">
                      🎁
                      <div 
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 
                          border-l-[5px] border-r-[5px] border-t-[5px] 
                          border-l-transparent border-r-transparent 
                          ${completedRooms > idx ? 'border-t-green-500' : 'border-t-amber-500/50'}`}
                      />
                    </div>
                  )}
                  {/* Claimed milestone - show checkmark */}
                  {isMilestone && isMilestoneClaimed && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-lg text-green-400">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Progress bars */}
          <div className="flex gap-1">
            {event.rooms.map((room, idx) => (
              <div 
                key={room.id}
                className={`flex-1 h-2 rounded-full transition-all ${
                  room.completed 
                    ? 'bg-green-500' 
                    : idx === event.currentRoom 
                      ? 'bg-amber-500' 
                      : 'bg-slate-700'
                } ${(idx === 4 || idx === 9) ? 'ring-1 ring-amber-400/50' : ''}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-400">
            <span>Комната {event.currentRoom + 1}/10</span>
            <span className="text-yellow-300 font-bold">🔑 {event.keys}</span>
          </div>
        </div>
        
        {/* 3D Room */}
        <div 
          className="relative h-64 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            perspective: '500px',
            padding: '16px'
          }}
        >
          {/* Floor */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-40"
            style={{
              background: 'linear-gradient(180deg, #2d2d44 0%, #1a1a2e 100%)',
              transform: 'rotateX(60deg)',
              transformOrigin: 'bottom center',
              boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)'
            }}
          />
          
          {/* Chests - keep positions fixed, staggered appearance */}
          {currentRoom?.chests.map((chest, idx) => {
            if (chest.opened) return null; // Hide opened chests but keep positions
            if (!visibleChests.has(idx)) return null; // Not yet visible (staggered animation)
            
            const pos = chestPositions[idx];
            if (!pos) return null;
            
            return (
              <Chest3D
                key={chest.id}
                chest={chest}
                position={pos}
                isOpening={openingChests.has(chest.id)}
                hasKeys={event.keys > 0}
                onClick={(e) => handleChestClick(chest, e)}
                isAppearing={true}
              />
            );
          })}
          
          {/* Ambient light effect */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, rgba(255,200,100,0.1) 0%, transparent 60%)'
            }}
          />
        </div>
        
        {/* No keys hint */}
        {showNoKeysHint && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-800/95 text-amber-200 px-4 py-3 rounded-xl shadow-lg border border-amber-500/30 text-center animate-[fadeIn_0.3s_ease-out]">
            <p className="font-bold mb-1">🔑 Нужен ключ!</p>
            <p className="text-sm text-slate-300">Собирай карты с ключами в пасьянсе</p>
          </div>
        )}
        
        {/* Footer hint */}
        <div className="px-4 py-3 bg-black/40 text-center text-sm text-slate-400">
          Нажми на сундук, чтобы открыть
        </div>
        
        
        {/* Milestone reward modal */}
        {showMilestoneReward !== null && (
          <MilestoneRewardModal 
            roomIndex={showMilestoneReward}
            stars={MILESTONE_REWARDS[showMilestoneReward] || 0}
            onClaim={handleClaimMilestone}
          />
        )}
        
      </div>
    </div>
  );
};

// 3D Chest component
interface Chest3DProps {
  chest: TreasureChest;
  position: { x: number; y: number; z: number };
  isOpening: boolean;
  hasKeys: boolean;
  onClick: (e: React.MouseEvent) => void;
  isAppearing?: boolean;
}

const Chest3D: React.FC<Chest3DProps> = ({
  chest,
  position,
  isOpening,
  hasKeys,
  onClick,
  isAppearing = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hasAppeared, setHasAppeared] = useState(false);
  const scale = 1 - position.z * 0.1; // Smaller in back
  const hoverScale = isHovered ? 1.15 : 1;
  
  // Trigger appear animation
  React.useEffect(() => {
    if (isAppearing && !hasAppeared) {
      requestAnimationFrame(() => {
        setHasAppeared(true);
      });
    }
  }, [isAppearing, hasAppeared]);
  
  // Appear animation - drop from above with bounce
  const appearTransform = hasAppeared 
    ? `scale(${scale * hoverScale})` 
    : `scale(${scale * 0.3}) translateY(-50px)`;
  const appearOpacity = hasAppeared ? 1 : 0;
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        absolute cursor-pointer
        ${isOpening ? 'animate-[wiggle_0.3s_ease-in-out_infinite]' : ''}
      `}
      style={{
        left: `${position.x}%`,
        bottom: `${position.y}%`,
        transform: appearTransform,
        opacity: appearOpacity,
        transition: hasAppeared 
          ? 'transform 0.2s ease-out, opacity 0.2s ease-out, filter 0.2s ease-out' 
          : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
        zIndex: isHovered ? 20 : 10 - position.z,
        filter: isHovered ? 'brightness(1.2) drop-shadow(0 0 10px rgba(255,200,0,0.5))' : 'none'
      }}
    >
      {/* Chest shadow */}
      <div 
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-14 h-3 rounded-full bg-black/40 blur-sm"
        style={{ transform: `translateX(-50%) scaleY(0.5)` }}
      />
      
      {/* Chest body */}
      <div className="relative">
        {/* Main chest */}
        <div 
          className="w-14 h-12 rounded-lg relative bg-gradient-to-b from-amber-600 to-amber-800"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.2)'
          }}
        >
          {/* Chest details */}
          <div className="absolute inset-x-1 top-1 h-1 bg-amber-900/50 rounded" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600" 
            style={{ boxShadow: '0 0 4px rgba(255,200,0,0.5)' }}
          />
          
          {/* Side highlight */}
          <div className="absolute left-0 inset-y-0 w-1 bg-gradient-to-r from-white/20 to-transparent rounded-l-lg" />
        </div>
        
        {/* Lid */}
        <div 
          className="absolute -top-3 left-0 right-0 h-5 rounded-t-lg bg-gradient-to-b from-amber-500 to-amber-700 transition-transform origin-bottom"
          style={{
            boxShadow: '0 -2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <div className="absolute inset-x-1 top-1 h-0.5 bg-amber-400/30 rounded" />
        </div>
        
        {/* Glow effect */}
        <div 
          className="absolute -inset-2 rounded-xl opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,200,0,0.3) 0%, transparent 70%)'
          }}
        />
        
        {/* Opening sparkles */}
        {isOpening && (
          <>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl animate-ping">✨</div>
            <div className="absolute -top-2 left-0 text-sm animate-ping" style={{animationDelay: '0.1s'}}>⭐</div>
            <div className="absolute -top-2 right-0 text-sm animate-ping" style={{animationDelay: '0.2s'}}>⭐</div>
          </>
        )}
      </div>
    </button>
  );
};

// Milestone reward modal
interface MilestoneRewardModalProps {
  roomIndex: number;
  stars: number;
  onClaim: () => void;
}

const MilestoneRewardModal: React.FC<MilestoneRewardModalProps> = ({ roomIndex, stars, onClaim }) => {
  const roomNumber = roomIndex + 1;
  
  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 cursor-pointer"
      onClick={onClaim}
    >
      <div 
        className="bg-gradient-to-br from-amber-600 via-orange-600 to-yellow-500 rounded-2xl p-8 max-w-sm mx-4 border-2 border-yellow-300/50 shadow-2xl animate-[bounceIn_0.5s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-7xl mb-4 animate-bounce">🎁</div>
          <h3 className="text-2xl font-bold text-white mb-2">Бонус за комнату {roomNumber}!</h3>
          <p className="text-white/80 mb-4">Ты прошёл {roomNumber} комнат!</p>
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <p className="text-lg font-bold text-white mb-2">Награда:</p>
            <p className="text-4xl font-bold">{stars} ⭐</p>
          </div>
          <button
            onClick={onClaim}
            className="px-8 py-3 bg-gradient-to-r from-white to-yellow-100 text-amber-800 rounded-xl font-bold text-lg hover:from-yellow-100 hover:to-yellow-200 transition-colors shadow-lg"
          >
            Забрать!
          </button>
          <p className="text-white/60 text-sm mt-3">Нажми в любом месте</p>
        </div>
      </div>
    </div>
  );
};

// CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes wiggle {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg); }
  }
  
  @keyframes bounceIn {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(styleSheet);
