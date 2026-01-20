import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  PointsEventState, 
  getProgressToNextReward, 
  getRewardAtIndex,
  getNextRewards,
  COLLECTION_PACKS,
  EventReward,
} from '../../lib/liveops/pointsEvent';

// Single card SVG component
function CardPackIcon({ color, stars, size = 40 }: { color: string; stars: number; size?: number }) {
  const topRow = stars > 3 ? Math.ceil(stars / 2) : stars;
  const bottomRow = stars > 3 ? stars - topRow : 0;
  const scale = size / 40;
  const cardHeight = size * 1.33;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: cardHeight }}>
      <svg 
        width={size} 
        height={cardHeight} 
        viewBox="0 0 36 48" 
        fill="none"
        style={{ filter: `drop-shadow(0 2px 4px ${color}60)` }}
      >
        {/* Single card */}
        <rect x="0" y="0" width="36" height="48" rx="4" fill={color} />
        <rect x="0" y="0" width="36" height="48" rx="4" fill="url(#packShinePopup)" />
        <defs>
          <linearGradient id="packShinePopup" x1="0" y1="0" x2="36" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
          </linearGradient>
        </defs>
      </svg>
      {stars > 0 && (
        <div 
          className="absolute flex flex-col items-center justify-center"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <div className="flex justify-center gap-0">
            {Array.from({ length: topRow }).map((_, i) => (
              <span key={i} style={{ 
                fontSize: `${10 * scale}px`,
                color: '#fbbf24',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                textShadow: '0 0 4px rgba(251, 191, 36, 0.8)',
              }}>★</span>
            ))}
          </div>
          {bottomRow > 0 && (
            <div className="flex justify-center gap-0" style={{ marginTop: -2 * scale }}>
              {Array.from({ length: bottomRow }).map((_, i) => (
                <span key={i} style={{ 
                  fontSize: `${10 * scale}px`,
                  color: '#fbbf24',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                  textShadow: '0 0 4px rgba(251, 191, 36, 0.8)',
                }}>★</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PointsEventPopupProps {
  isVisible: boolean;
  eventState: PointsEventState;
  onClose: () => void;
}

export function PointsEventPopup({
  isVisible,
  eventState,
  onClose,
}: PointsEventPopupProps) {
  const [isClosing, setIsClosing] = useState(false);
  
  // Get next rewards to display
  const visibleRewards = getNextRewards(eventState.currentRewardIndex, 6);
  const progress = getProgressToNextReward(eventState);
  const currentReward = visibleRewards[0];
  const pendingCount = eventState.pendingRewards?.length || 0;
  
  // Reset closing state when popup becomes visible
  useEffect(() => {
    if (isVisible) {
      setIsClosing(false);
    }
  }, [isVisible]);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };
  
  const getRewardIcon = (reward: EventReward, size: 'small' | 'large' = 'small') => {
    if (reward.type === 'stars') {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className={size === 'large' ? 'text-3xl' : 'text-xl'}>⭐</span>
          <span className={`font-bold ${size === 'large' ? 'text-lg' : 'text-xs'} text-yellow-300`}>
            {reward.stars}
          </span>
        </div>
      );
    } else if (reward.packRarity) {
      const pack = COLLECTION_PACKS[reward.packRarity];
      return (
        <CardPackIcon 
          color={pack.color} 
          stars={reward.packRarity} 
          size={size === 'large' ? 50 : 36} 
        />
      );
    }
    return <span className="text-2xl">🎁</span>;
  };
  
  if (!isVisible) return null;
  
  return createPortal(
    <div 
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{ 
        background: 'rgba(0, 0, 0, 0.7)',
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.2s ease-out',
      }}
      onClick={handleClose}
    >
      <div 
        className="relative rounded-2xl p-5 max-w-md w-full mx-4"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
          transform: isClosing ? 'scale(0.9)' : 'scale(1)',
          transition: 'transform 0.2s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h2 className="text-xl font-bold text-white">Очки за карты</h2>
              <p className="text-sm text-white/60">Убирайте карты, получайте награды</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Current points */}
        <div 
          className="rounded-xl p-4 mb-4"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/60 text-sm">Ваши очки</div>
              <div className="text-3xl font-bold text-white">{eventState.currentPoints}</div>
            </div>
            <div className="text-right">
              <div className="text-white/60 text-sm">До награды</div>
              <div className="text-xl font-bold text-blue-300">
                {Math.max(0, currentReward.pointsRequired - eventState.currentPoints)}
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3">
            <div 
              className="h-3 rounded-full overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
                  boxShadow: '0 0 6px rgba(59, 130, 246, 0.5)',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/50 mt-1">
              <span>{eventState.currentRewardIndex > 0 ? getRewardAtIndex(eventState.currentRewardIndex - 1).pointsRequired : 0}</span>
              <span>{currentReward.pointsRequired}</span>
            </div>
          </div>
        </div>
        
        {/* Rewards track */}
        <div className="mb-4">
          <div className="text-white/60 text-sm mb-2">Награды</div>
          <div 
            className="flex gap-2 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {visibleRewards.map((reward, index) => {
              const isNext = index === 0;
              
              return (
                <div
                  key={index}
                  className={`relative flex-shrink-0 rounded-xl p-3 flex flex-col items-center justify-center transition-all ${
                    isNext ? 'scale-105' : ''
                  }`}
                  style={{
                    width: '80px',
                    height: '90px',
                    background: isNext 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)'
                      : 'rgba(0,0,0,0.3)',
                    border: isNext 
                      ? '2px solid #3b82f6' 
                      : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isNext 
                      ? '0 0 15px rgba(59, 130, 246, 0.3)'
                      : 'none',
                  }}
                >
                  {/* Reward icon */}
                  {getRewardIcon(reward)}
                  
                  {/* Points required */}
                  <div className="text-[10px] text-white/50 mt-1">
                    {reward.pointsRequired} очков
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Pending rewards info */}
        {pendingCount > 0 && (
          <div 
            className="rounded-xl p-3 mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🎁</span>
              <div>
                <div className="text-yellow-300 font-medium">
                  {pendingCount} {pendingCount === 1 ? 'награда ожидает' : 'награды ожидают'}
                </div>
                <div className="text-white/50 text-xs">
                  Начисляются автоматически после победы
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Info */}
        <div className="text-center text-white/40 text-xs">
          Награды начисляются автоматически после победы на уровне
        </div>
      </div>
      
    </div>,
    document.body
  );
}
