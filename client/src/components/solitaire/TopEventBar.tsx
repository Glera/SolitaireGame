import React, { RefObject } from 'react';
import { PointsEventState, getProgressToNextReward, getRewardAtIndex, PendingReward, PackRarity, COLLECTION_PACKS } from '../../lib/liveops/pointsEvent';

// Flying reward animation state type (different from PendingReward)
export interface FlyingRewardToMiniature {
  id: number;
  type: 'stars' | 'pack';
  stars?: number;
  packRarity?: PackRarity;
  startX: number;
  startY: number;
  pendingIndex: number;
}
import { TreasureHuntEvent } from '../../lib/liveops/treasureHunt/types';
import { DungeonDigEvent } from '../../lib/liveops/dungeonDig/types';
import { isEventAvailable, getRequiredLevel } from '../../lib/liveops/treasureHunt';
import { isEventAvailable as isDungeonAvailable, getRequiredLevel as getDungeonRequiredLevel } from '../../lib/liveops/dungeonDig';
import { COLLECTIONS_REQUIRED_LEVEL } from '../../hooks/useGameProgress';
import { StarsReward } from './StarsReward';
import { MiniCardPack } from './MiniCardPack';
import { PromoWidget } from './PromoWidget';

export interface TopEventBarProps {
  // Refs
  pointsEventIconRef: RefObject<HTMLDivElement>;
  treasureHuntIconRef: RefObject<HTMLDivElement>;
  dungeonDigIconRef: RefObject<HTMLDivElement>;
  miniatureContainerRef: RefObject<HTMLDivElement>;
  
  // Visibility
  showDailyQuests: boolean;
  showCollections: boolean;
  
  // Unlock states
  collectionsUnlocked: boolean;
  promoUnlocked: boolean;
  playerLevel: number;
  
  // Points Event
  pointsEventState: PointsEventState;
  pointsEventPulse: boolean;
  animatingRewardIndex: number | null;
  nextRewardDropping: boolean;
  rewardIconAnimating: boolean;
  flyingRewardToMiniature: FlyingRewardToMiniature | null;
  
  // Treasure Hunt
  treasureHuntEvent: TreasureHuntEvent;
  treasureHuntExpired: boolean;
  treasureHuntTimeRemaining: string;
  treasureHuntTimeCritical: boolean;
  treasureHuntPulse: boolean;
  
  // Dungeon Dig
  dungeonDigEvent: DungeonDigEvent;
  dungeonDigExpired: boolean;
  dungeonDigTimeRemaining: string;
  dungeonDigTimeCritical: boolean;
  dungeonDigPulse: boolean;
  
  // Event rotation
  nextEventType: 'treasure' | 'dungeon';
  
  // Callbacks - popups
  onShowLockedPointsEvent: () => void;
  onShowPointsEvent: () => void;
  onShowTreasureHunt: () => void;
  onShowDungeonDig: () => void;
  onShowLockedDungeon: () => void;
  
  // Callbacks - promo
  onPromoStarArrived: (count: number) => void;
  onPromoCollectionCardArrived: () => void;
  onPromoPurchase: (packId: string, stars: number, cards: number) => void;
}

export const TopEventBar: React.FC<TopEventBarProps> = ({
  pointsEventIconRef,
  treasureHuntIconRef,
  dungeonDigIconRef,
  miniatureContainerRef,
  showDailyQuests,
  showCollections,
  collectionsUnlocked,
  promoUnlocked,
  playerLevel,
  pointsEventState,
  pointsEventPulse,
  animatingRewardIndex,
  nextRewardDropping,
  rewardIconAnimating,
  flyingRewardToMiniature,
  treasureHuntEvent,
  treasureHuntExpired,
  treasureHuntTimeRemaining,
  treasureHuntTimeCritical,
  treasureHuntPulse,
  dungeonDigEvent,
  dungeonDigExpired,
  dungeonDigTimeRemaining,
  dungeonDigTimeCritical,
  dungeonDigPulse,
  nextEventType,
  onShowLockedPointsEvent,
  onShowPointsEvent,
  onShowTreasureHunt,
  onShowDungeonDig,
  onShowLockedDungeon,
  onPromoStarArrived,
  onPromoCollectionCardArrived,
  onPromoPurchase,
}) => {
  const eventsUnlocked = isEventAvailable(playerLevel);
  const dungeonUnlocked = isDungeonAvailable(playerLevel);
  
  // Show TreasureHunt when: active, OR expired but has keys, OR locked and nextEvent is treasure
  const showTreasureHuntIcon = treasureHuntEvent.active || 
    (treasureHuntExpired && treasureHuntEvent.keys > 0) || 
    (!eventsUnlocked && nextEventType === 'treasure');
  
  // Show DungeonDig when: active, OR expired but has shovels, OR locked and nextEvent is dungeon
  const showDungeonDigIcon = dungeonDigEvent.active || 
    (dungeonDigExpired && dungeonDigEvent.shovels > 0) || 
    (!dungeonUnlocked && nextEventType === 'dungeon');

  return (
    <div 
      className="flex items-center gap-3 mb-2"
      style={{ 
        visibility: (showDailyQuests || showCollections) ? 'hidden' : 'visible',
        width: '584px',
        paddingLeft: '120px',
        position: 'relative',
        zIndex: 10,
        pointerEvents: 'auto',
        boxSizing: 'border-box'
      }}
    >
      {/* Points Event - compact circle with progress ring */}
      <div 
        ref={pointsEventIconRef} 
        className="transition-transform duration-150 hover:scale-110 cursor-pointer"
        style={{ zIndex: 20, position: 'relative' }}
        onClick={() => {
          if (!collectionsUnlocked) {
            onShowLockedPointsEvent();
            return;
          }
          onShowPointsEvent();
        }}
      >
        {/* Progress ring SVG - same thickness as level indicator */}
        {collectionsUnlocked && (
          <svg 
            className="absolute pointer-events-none"
            style={{ width: '74px', height: '74px', transform: 'rotate(-90deg)', left: '-6px', top: '-6px' }}
          >
            {/* Background circle */}
            <circle
              cx="37"
              cy="37"
              r="33"
              fill="none"
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="5"
            />
            {/* Progress circle */}
            <circle
              cx="37"
              cy="37"
              r="33"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 33}`}
              strokeDashoffset={`${2 * Math.PI * 33 * (1 - getProgressToNextReward(pointsEventState) / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#c026d3" />
              </linearGradient>
            </defs>
          </svg>
        )}
        <div
          className="relative flex items-center justify-center rounded-full overflow-visible"
          style={{
            width: '62px',
            height: '62px',
            background: collectionsUnlocked 
              ? 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)'
              : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
            border: '2px solid rgba(255,255,255,0.25)',
            pointerEvents: 'auto',
          }}
        >
          {/* Dynamic reward icon based on next reward */}
          {(() => {
            // Use animating index during animation, otherwise current index
            const displayIndex = animatingRewardIndex ?? pointsEventState.currentRewardIndex;
            const currentReward = getRewardAtIndex(displayIndex);
            const isStars = currentReward.type === 'stars';
            const packRarity = currentReward.packRarity || 1;
            
            // Get next reward for drop animation
            const nextReward = getRewardAtIndex(pointsEventState.currentRewardIndex);
            const nextIsStars = nextReward.type === 'stars';
            const nextPackRarity = nextReward.packRarity || 1;
            
            return (
              <div className="relative" style={{ width: '40px', height: '40px' }}>
                {/* Current reward icon - hidden when flying copy is animating to miniature */}
                {!nextRewardDropping && !rewardIconAnimating && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ 
                      filter: collectionsUnlocked ? 'none' : 'grayscale(0.5) brightness(0.7)',
                    }}
                  >
                    {isStars ? (
                      <StarsReward 
                        stars={currentReward.stars || 0} 
                        size="md" 
                        pulse={pointsEventPulse}
                      />
                    ) : (
                      <span className={`transition-transform duration-150 inline-block ${pointsEventPulse ? 'scale-110' : 'scale-100'}`}>
                        <MiniCardPack 
                          color={COLLECTION_PACKS[packRarity as 1|2|3|4|5]?.color || '#9ca3af'} 
                          stars={packRarity} 
                          size={32} 
                        />
                      </span>
                    )}
                  </div>
                )}
                
                {/* Next reward dropping from above into button */}
                {nextRewardDropping && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      animation: 'rewardDrop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    }}
                  >
                    {nextIsStars ? (
                      <StarsReward stars={nextReward.stars || 0} size="md" />
                    ) : (
                      <MiniCardPack 
                        color={COLLECTION_PACKS[nextPackRarity as 1|2|3|4|5]?.color || '#9ca3af'} 
                        stars={nextPackRarity} 
                        size={32} 
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          {!collectionsUnlocked && (
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">🔒 {COLLECTIONS_REQUIRED_LEVEL}</span>
          )}
        </div>
      </div>
      
      {/* LiveOps Event Icon - shows one active event at a time */}
      {/* Treasure Hunt Icon */}
      {showTreasureHuntIcon && (
        <div ref={treasureHuntIconRef} style={{ zIndex: 20 }} className="relative">
          <button
            onClick={onShowTreasureHunt}
            className="relative flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer hover:scale-110"
            style={{
              width: '62px',
              height: '62px',
              background: eventsUnlocked
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
              boxShadow: treasureHuntPulse 
                ? '0 0 14px rgba(251, 191, 36, 0.6), 0 3px 10px rgba(0,0,0,0.3)'
                : '0 3px 10px rgba(0,0,0,0.3)',
              border: '2px solid rgba(255,255,255,0.25)',
              transform: treasureHuntPulse ? 'scale(1.1)' : undefined,
              pointerEvents: 'auto',
            }}
          >
            <span className="text-3xl" style={{ 
              filter: eventsUnlocked ? 'none' : 'grayscale(0.5) brightness(0.7)',
            }}>🎁</span>
            {eventsUnlocked && treasureHuntEvent.keys > 0 && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 text-yellow-900 rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold">{treasureHuntEvent.keys}</span>
              </div>
            )}
            {!eventsUnlocked && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">🔒 {getRequiredLevel()}</span>
            )}
          </button>
          {/* Timer display */}
          {treasureHuntEvent.active && treasureHuntTimeRemaining && !treasureHuntExpired && (
            <span 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2 text-xs px-1.5 py-px rounded-full font-mono font-bold shadow-lg whitespace-nowrap pointer-events-none"
              style={{
                background: treasureHuntTimeCritical ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 0, 0, 0.9)',
                color: '#fff',
                animation: treasureHuntTimeCritical ? 'pulse 1s ease-in-out infinite' : undefined,
              }}
            >
              {treasureHuntTimeRemaining}
            </span>
          )}
          {/* Expired but has keys */}
          {treasureHuntExpired && treasureHuntEvent.keys > 0 && (
            <span 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2 text-[9px] px-1.5 py-px rounded-full font-bold shadow-lg whitespace-nowrap pointer-events-none"
              style={{
                background: 'rgba(239, 68, 68, 0.95)',
                color: '#fff',
              }}
            >
              Потрать!
            </span>
          )}
        </div>
      )}
      
      {/* Dungeon Dig Icon */}
      {showDungeonDigIcon && (
        <div ref={dungeonDigIconRef} style={{ zIndex: 20 }} className="relative">
          <button
            onClick={() => {
              if (!dungeonUnlocked) {
                onShowLockedDungeon();
              } else {
                onShowDungeonDig();
              }
            }}
            className="relative flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer hover:scale-110"
            style={{
              width: '62px',
              height: '62px',
              background: dungeonUnlocked
                ? 'linear-gradient(135deg, #78350f 0%, #92400e 100%)'
                : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
              boxShadow: dungeonDigPulse 
                ? '0 0 14px rgba(180, 83, 9, 0.6), 0 3px 10px rgba(0,0,0,0.3)'
                : '0 3px 10px rgba(0,0,0,0.3)',
              border: '2px solid rgba(255,255,255,0.25)',
              transform: dungeonDigPulse ? 'scale(1.1)' : undefined,
              pointerEvents: 'auto',
            }}
          >
            <span className="text-3xl" style={{ 
              filter: dungeonUnlocked ? 'none' : 'grayscale(0.5) brightness(0.7)',
            }}>⛏️</span>
            {dungeonUnlocked && dungeonDigEvent.shovels > 0 && (
              <div className="absolute -top-1 -right-1 bg-amber-600 text-amber-100 rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold">{dungeonDigEvent.shovels}</span>
              </div>
            )}
            {!dungeonUnlocked && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">🔒 {getDungeonRequiredLevel()}</span>
            )}
          </button>
          {/* Timer display */}
          {dungeonDigEvent.active && dungeonDigTimeRemaining && !dungeonDigExpired && (
            <span 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2 text-xs px-1.5 py-px rounded-full font-mono font-bold shadow-lg whitespace-nowrap pointer-events-none"
              style={{
                background: dungeonDigTimeCritical ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 0, 0, 0.9)',
                color: '#fff',
                animation: dungeonDigTimeCritical ? 'pulse 1s ease-in-out infinite' : undefined,
              }}
            >
              {dungeonDigTimeRemaining}
            </span>
          )}
          {/* Expired but has shovels */}
          {dungeonDigExpired && dungeonDigEvent.shovels > 0 && (
            <span 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2 text-[9px] px-1.5 py-px rounded-full font-bold shadow-lg whitespace-nowrap pointer-events-none"
              style={{
                background: 'rgba(239, 68, 68, 0.95)',
                color: '#fff',
              }}
            >
              Потрать!
            </span>
          )}
        </div>
      )}
      
      {/* Promo Widget - compact mode (only when promo unlocked) */}
      {promoUnlocked && (
        <div style={{ zIndex: 20 }}>
          <PromoWidget 
            compact={true}
            onStarArrived={onPromoStarArrived}
            onCollectionCardArrived={onPromoCollectionCardArrived}
            onPurchase={onPromoPurchase}
          />
        </div>
      )}
      
      {/* Pending rewards miniatures - positioned after all event icons */}
      {playerLevel >= COLLECTIONS_REQUIRED_LEVEL && pointsEventState.pendingRewards.length > 0 && (
        <div 
          ref={miniatureContainerRef}
          className="flex items-center gap-1 ml-1"
          style={{ zIndex: 20 }}
        >
          {pointsEventState.pendingRewards.slice(0, 4).map((reward) => {
            const isFlying = flyingRewardToMiniature?.id === reward.id;
            return (
              <div
                key={reward.id}
                className="flex items-center justify-center"
                style={{ 
                  width: '36px', 
                  height: '48px',
                  opacity: isFlying ? 0 : 1,
                }}
              >
                {reward.type === 'pack' && reward.packRarity ? (
                  <MiniCardPack 
                    color={COLLECTION_PACKS[reward.packRarity].color} 
                    stars={reward.packRarity} 
                    size={29} 
                  />
                ) : (
                  <span className="text-2xl">⭐</span>
                )}
              </div>
            );
          })}
          {pointsEventState.pendingRewards.length > 4 && (
            <span className="text-xs text-white/70 font-bold">+{pointsEventState.pendingRewards.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
};
