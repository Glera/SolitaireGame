import { 
  PointsEventState, 
  getProgressToNextReward, 
  getRewardAtIndex,
  COLLECTION_PACKS,
} from '../../lib/liveops/pointsEvent';

interface PointsEventIconProps {
  eventState: PointsEventState;
  isPulsing?: boolean;
  isLocked?: boolean;
  requiredLevel?: number;
  onClick: () => void;
}

export function PointsEventIcon({ eventState, isPulsing, isLocked = false, requiredLevel = 2, onClick }: PointsEventIconProps) {
  const progress = getProgressToNextReward(eventState);
  const nextReward = getRewardAtIndex(eventState.currentRewardIndex);
  // Rewards are now earned automatically to miniatures, so we don't show "claimable" state on the button
  // Progress just shows the next reward to earn
  const hasClaimable = false; // Disabled - miniatures show pending rewards instead
  
  // Get pack color and info for display
  const getPackInfo = () => {
    if (nextReward.type === 'pack' && nextReward.packRarity) {
      const pack = COLLECTION_PACKS[nextReward.packRarity];
      return { color: pack.color, stars: nextReward.packRarity, isPack: true };
    }
    // For stars rewards, show golden color
    return { color: '#fbbf24', stars: 0, isPack: false };
  };
  
  const packInfo = getPackInfo();

  // Single card SVG component with stars on it
  const CardPack = ({ color, stars }: { color: string; stars: number }) => {
    // Split stars into rows if more than 3
    const topRow = stars > 3 ? Math.ceil(stars / 2) : stars;
    const bottomRow = stars > 3 ? stars - topRow : 0;
    
    return (
      <div className="relative flex items-center justify-center" style={{ width: 48, height: 58 }}>
        <svg 
          width="36" 
          height="48" 
          viewBox="0 0 36 48" 
          fill="none"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          {/* Single card */}
          <rect x="0" y="0" width="36" height="48" rx="4" fill={color} />
          {/* Shine effect */}
          <rect x="0" y="0" width="36" height="48" rx="4" fill="url(#packShine)" />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="packShine" x1="0" y1="0" x2="36" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
            </linearGradient>
          </defs>
        </svg>
        {/* Rarity stars centered on the card */}
        {stars > 0 && (
          <div 
            className="absolute flex flex-col items-center justify-center"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Top row */}
            <div className="flex justify-center gap-0">
              {Array.from({ length: topRow }).map((_, i) => (
                <span 
                  key={i} 
                  className="text-xs"
                  style={{ 
                    color: '#fbbf24',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                    textShadow: '0 0 4px rgba(251, 191, 36, 0.8)',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            {/* Bottom row (if needed) */}
            {bottomRow > 0 && (
              <div className="flex justify-center gap-0 -mt-0.5">
                {Array.from({ length: bottomRow }).map((_, i) => (
                  <span 
                    key={i} 
                    className="text-xs"
                    style={{ 
                      color: '#fbbf24',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                      textShadow: '0 0 4px rgba(251, 191, 36, 0.8)',
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Locked state - same dimensions as unlocked for consistency
  if (isLocked) {
    return (
      <button
        onClick={onClick}
        className="relative flex flex-col items-center justify-center rounded-xl transition-all duration-300 bg-gradient-to-br from-gray-600 to-gray-800 border-2 border-gray-500 opacity-70"
        style={{
          width: '70px',
          height: '96px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        {/* Card pack emoji - grayed out */}
        <span className="text-3xl" style={{ filter: 'grayscale(0.5) brightness(0.8)' }}>
          📦
        </span>
        
        {/* Level requirement */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <span className="text-sm font-bold text-white bg-black/90 px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
            🔒 {requiredLevel}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div 
      className="relative cursor-pointer select-none"
      onClick={onClick}
      style={{ width: '70px' }}
    >
      {/* Pulsing background - separate layer */}
      <div 
        className="absolute inset-0 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
          border: hasClaimable ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.2)',
          boxShadow: hasClaimable 
            ? '0 0 15px rgba(251, 191, 36, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)' 
            : '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          transform: isPulsing ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 0.15s ease-out',
        }}
      />
      
      {/* Content container - doesn't pulse */}
      <div 
        className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center"
        style={{
          padding: '8px 8px 4px 8px',
          minHeight: '96px',
        }}
      >
        {/* Reward icon - centered */}
        <div className="flex flex-col items-center justify-center mb-2">
          {packInfo.isPack ? (
            <CardPack color={packInfo.color} stars={packInfo.stars} />
          ) : (
            <>
              {/* Stars reward icon with count in bottom-right corner */}
              <div className="relative">
                <div 
                  className="text-3xl"
                  style={{
                    filter: hasClaimable 
                      ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))'
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}
                >
                  ⭐
                </div>
                <div 
                  className="absolute text-sm font-bold text-yellow-300"
                  style={{
                    right: '-9px',
                    bottom: '-9px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5)',
                  }}
                >
                  {nextReward.stars}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Progress bar - horizontal at bottom */}
        <div 
          className="w-full rounded-full overflow-hidden"
          style={{ 
            height: '6px',
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${progress}%`,
              background: hasClaimable 
                ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)'
                : 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
              boxShadow: hasClaimable 
                ? '0 0 8px rgba(251, 191, 36, 0.6)'
                : '0 0 4px rgba(59, 130, 246, 0.5)',
            }}
          />
        </div>
      </div>
      
      {/* Claimable indicator - positioned at top-right corner (outside overflow-hidden) */}
      {hasClaimable && (
        <div 
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold z-10"
          style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            boxShadow: '0 2px 8px rgba(251, 191, 36, 0.5)',
          }}
        >
          !
        </div>
      )}
      
      {/* Pulse animation for claimable */}
      {hasClaimable && (
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            border: '2px solid #fbbf24',
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          }}
        />
      )}
      
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
