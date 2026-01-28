import React from 'react';
import ReactDOM from 'react-dom';

interface TreasureHuntIconProps {
  keys: number;
  isLocked: boolean;
  requiredLevel: number;
  isActive: boolean;
  isPulsing?: boolean;
  timeRemaining?: string;  // Formatted time string like "4:32"
  isTimeCritical?: boolean; // True when < 1 minute left
  onClick: () => void;
}

export const TreasureHuntIcon: React.FC<TreasureHuntIconProps> = ({
  keys,
  isLocked,
  requiredLevel,
  isActive,
  isPulsing = false,
  timeRemaining,
  isTimeCritical = false,
  onClick
}) => {
  // Locked state
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
        {/* Chest emoji */}
        <span className="text-3xl" style={{ filter: 'grayscale(0.5) brightness(0.8)' }}>
          🎁
        </span>
        
        {/* Level requirement for locked state */}
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
          background: isActive 
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
            : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          border: keys > 0 ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.2)',
          boxShadow: isActive && keys > 0 
            ? '0 0 20px rgba(255, 200, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)' 
            : '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          transform: isPulsing ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 0.15s ease-out',
        }}
      />
      
      {/* Content container - doesn't pulse */}
      <div 
        className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center"
        style={{
          padding: '8px 8px 8px 8px',
          minHeight: '96px',
        }}
      >
        {/* Chest icon - centered */}
        <div className="flex flex-col items-center justify-center">
          <span 
            className="text-4xl"
            style={{
              filter: keys > 0 
                ? 'drop-shadow(0 0 8px rgba(255, 200, 0, 0.8))'
                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
          >
            🎁
          </span>
        </div>
        
        {/* Key counter */}
        <div 
          className="mt-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center"
          style={{
            background: keys > 0 
              ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
              : 'rgba(0,0,0,0.4)',
            color: keys > 0 ? '#78350f' : '#9ca3af',
          }}
        >
          <span className="mr-0.5">🔑</span>
          {keys}
        </div>
      </div>
      
      {/* Exclamation mark when keys > 0 */}
      {keys > 0 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center z-10">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      )}
      
      {/* Shine effect for active state */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 animate-pulse opacity-30"
            style={{
              background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)'
            }}
          />
        </div>
      )}
      
      {/* Timer display - same style as PromoWidget */}
      {isActive && timeRemaining && (
        <span 
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2 text-xs px-1.5 py-px rounded-full font-mono font-bold shadow-lg whitespace-nowrap pointer-events-none"
          style={{
            background: isTimeCritical ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            animation: isTimeCritical ? 'pulse 1s ease-in-out infinite' : undefined,
          }}
        >
          {timeRemaining}
        </span>
      )}
    </div>
  );
};

// Flying key animation component - parabolic trajectory like collection icons
interface FlyingKeyProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete: () => void;
}

export const FlyingKey: React.FC<FlyingKeyProps> = ({
  startX,
  startY,
  endX,
  endY,
  onComplete
}) => {
  const elementRef = React.useRef<HTMLDivElement>(null);
  const startTimeRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number>();
  const onCompleteRef = React.useRef(onComplete);
  const [isVisible, setIsVisible] = React.useState(true);
  
  // Update ref to avoid stale closure
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  React.useEffect(() => {
    if (!elementRef.current) return;
    
    // Physics parameters for parabolic flight (same as FlyingCollectionIcon)
    const totalDuration = 800; // ms
    const gravity = 1200; // pixels per second^2
    
    // Calculate horizontal distance and direction
    const dx = endX - startX;
    const dy = endY - startY;
    
    // Time in seconds
    const t = totalDuration / 1000;
    const vx0 = dx / t; // Horizontal velocity (constant)
    
    // For vertical: endY = startY + vy0 * t + 0.5 * g * t^2
    // vy0 = (endY - startY - 0.5 * g * t^2) / t
    const vy0 = (dy - 0.5 * gravity * t * t) / t;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / totalDuration, 1);
      const timeInSeconds = elapsed / 1000;
      
      // Calculate position using kinematic equations
      const x = startX + vx0 * timeInSeconds;
      const y = startY + vy0 * timeInSeconds + 0.5 * gravity * timeInSeconds * timeInSeconds;
      
      // Scale: slight pulse at start, shrink on impact
      let scale = 1;
      if (progress < 0.3) {
        scale = 1 + Math.sin(progress / 0.3 * Math.PI) * 0.3; // Pulse up to 1.3
      } else if (progress > 0.85) {
        // Quick bounce on impact
        const impactProgress = (progress - 0.85) / 0.15;
        scale = 1 - impactProgress * 0.5; // Shrink to 0.5
      }
      
      // Update position directly via DOM
      if (elementRef.current) {
        // Add slight rotation based on velocity direction
        const currentVy = vy0 + gravity * timeInSeconds;
        const angle = Math.atan2(currentVy, vx0) * (180 / Math.PI);
        elementRef.current.style.left = `${x}px`;
        elementRef.current.style.top = `${y}px`;
        elementRef.current.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${angle * 0.3}deg)`;
      }
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - instant disappear
        setIsVisible(false);
        onCompleteRef.current();
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [startX, startY, endX, endY]);
  
  if (!isVisible) return null;
  
  return (
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[10010]"
      style={{
        left: startX,
        top: startY,
        transform: 'translate(-50%, -50%)',
        fontSize: '28px',
        filter: 'drop-shadow(0 2px 8px rgba(255, 200, 0, 0.8))',
        willChange: 'transform, left, top',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      🔑
    </div>
  );
};

// Manager for flying keys
let flyingKeyId = 0;
const flyingKeysContainer: { id: number; props: Omit<FlyingKeyProps, 'onComplete'> }[] = [];
let updateFlyingKeys: ((keys: typeof flyingKeysContainer) => void) | null = null;
let onFlyingKeyCompleteCallback: (() => void) | null = null;

export function registerFlyingKeysUpdater(updater: (keys: typeof flyingKeysContainer) => void) {
  updateFlyingKeys = updater;
}

export function setOnFlyingKeyCompleteCallback(callback: () => void) {
  onFlyingKeyCompleteCallback = callback;
}

export function launchFlyingKey(startX: number, startY: number, endX: number, endY: number) {
  const id = flyingKeyId++;
  flyingKeysContainer.push({ id, props: { startX, startY, endX, endY } });
  updateFlyingKeys?.([...flyingKeysContainer]);
}

export function removeFlyingKey(id: number) {
  const index = flyingKeysContainer.findIndex(k => k.id === id);
  if (index !== -1) {
    flyingKeysContainer.splice(index, 1);
    updateFlyingKeys?.([...flyingKeysContainer]);
    // Trigger callback when key completes
    onFlyingKeyCompleteCallback?.();
  }
}

// Container component for flying keys - rendered via portal to ensure proper z-index
export const FlyingKeysContainer: React.FC = () => {
  const [keys, setKeys] = React.useState<typeof flyingKeysContainer>([]);
  
  React.useEffect(() => {
    registerFlyingKeysUpdater(setKeys);
    return () => {
      registerFlyingKeysUpdater(() => {});
    };
  }, []);
  
  if (keys.length === 0) return null;
  
  return ReactDOM.createPortal(
    <>
      {keys.map(({ id, props }) => (
        <FlyingKey
          key={id}
          {...props}
          onComplete={() => removeFlyingKey(id)}
        />
      ))}
    </>,
    document.body
  );
};
