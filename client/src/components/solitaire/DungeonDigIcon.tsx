import React from 'react';
import ReactDOM from 'react-dom';

interface DungeonDigIconProps {
  shovels: number;
  isLocked: boolean;
  requiredLevel: number;
  isActive: boolean;
  isPulsing?: boolean;
  timeRemaining?: string;
  isTimeCritical?: boolean;
  isExpired?: boolean;
  onClick: () => void;
}

export const DungeonDigIcon: React.FC<DungeonDigIconProps> = ({
  shovels,
  isLocked,
  requiredLevel,
  isActive,
  isPulsing = false,
  timeRemaining,
  isTimeCritical = false,
  isExpired = false,
  onClick
}) => {
  // Locked state
  if (isLocked) {
    return (
      <button
        onClick={onClick}
        className="relative flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer"
        style={{
          width: '62px',
          height: '62px',
          background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
          boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
          border: '2px solid rgba(255,255,255,0.15)',
          pointerEvents: 'auto',
        }}
      >
        <span className="text-3xl" style={{ filter: 'grayscale(0.5) brightness(0.7)' }}>⛏️</span>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">
          🔒 {requiredLevel}
        </span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="relative flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer hover:scale-110"
        style={{
          width: '62px',
          height: '62px',
          background: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
          boxShadow: isPulsing 
            ? '0 0 14px rgba(180, 83, 9, 0.6), 0 3px 10px rgba(0,0,0,0.3)'
            : '0 3px 10px rgba(0,0,0,0.3)',
          border: '2px solid rgba(255,255,255,0.25)',
          transform: isPulsing ? 'scale(1.1)' : undefined,
          pointerEvents: 'auto',
        }}
      >
        <span className="text-3xl">⛏️</span>
        {shovels > 0 && (
          <div className="absolute -top-1 -right-1 bg-amber-600 text-amber-100 rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold">{shovels}</span>
          </div>
        )}
      </button>
      
      {/* Timer display */}
      {isActive && timeRemaining && !isExpired && (
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
      
      {/* Expired but has shovels */}
      {isExpired && shovels > 0 && (
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
  );
};

// Flying shovel animation component
interface FlyingShovelProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete: () => void;
}

export const FlyingShovel: React.FC<FlyingShovelProps> = ({
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
  
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  React.useEffect(() => {
    if (!elementRef.current) return;
    
    const totalDuration = 800;
    const gravity = 1200;
    
    const dx = endX - startX;
    const dy = endY - startY;
    const t = totalDuration / 1000;
    const vx0 = dx / t;
    const vy0 = (dy - 0.5 * gravity * t * t) / t;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / totalDuration, 1);
      const timeInSeconds = elapsed / 1000;
      
      const x = startX + vx0 * timeInSeconds;
      const y = startY + vy0 * timeInSeconds + 0.5 * gravity * timeInSeconds * timeInSeconds;
      
      let scale = 1;
      if (progress < 0.3) {
        scale = 1 + Math.sin(progress / 0.3 * Math.PI) * 0.3;
      } else if (progress > 0.85) {
        const impactProgress = (progress - 0.85) / 0.15;
        scale = 1 - impactProgress * 0.5;
      }
      
      if (elementRef.current) {
        const currentVy = vy0 + gravity * timeInSeconds;
        const angle = Math.atan2(currentVy, vx0) * (180 / Math.PI);
        elementRef.current.style.left = `${x}px`;
        elementRef.current.style.top = `${y}px`;
        elementRef.current.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${angle * 0.3}deg)`;
      }
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
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
        filter: 'drop-shadow(0 2px 8px rgba(180, 83, 9, 0.8))',
        willChange: 'transform, left, top',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      🪏
    </div>
  );
};

// Manager for flying shovels
let flyingShovelId = 0;
const flyingShovelsContainer: { id: number; props: Omit<FlyingShovelProps, 'onComplete'> }[] = [];
let updateFlyingShovels: ((shovels: typeof flyingShovelsContainer) => void) | null = null;
let onFlyingShovelCompleteCallback: (() => void) | null = null;

export function registerFlyingShovelsUpdater(updater: (shovels: typeof flyingShovelsContainer) => void) {
  updateFlyingShovels = updater;
}

export function setOnFlyingShovelCompleteCallback(callback: () => void) {
  onFlyingShovelCompleteCallback = callback;
}

export function launchFlyingShovel(startX: number, startY: number, endX: number, endY: number) {
  const id = flyingShovelId++;
  flyingShovelsContainer.push({ id, props: { startX, startY, endX, endY } });
  updateFlyingShovels?.([...flyingShovelsContainer]);
}

export function removeFlyingShovel(id: number) {
  const index = flyingShovelsContainer.findIndex(s => s.id === id);
  if (index !== -1) {
    flyingShovelsContainer.splice(index, 1);
    updateFlyingShovels?.([...flyingShovelsContainer]);
    onFlyingShovelCompleteCallback?.();
  }
}

// Container component for flying shovels
export const FlyingShovelsContainer: React.FC = () => {
  const [shovels, setShovels] = React.useState<typeof flyingShovelsContainer>([]);
  
  React.useEffect(() => {
    registerFlyingShovelsUpdater(setShovels);
    return () => {
      registerFlyingShovelsUpdater(() => {});
    };
  }, []);
  
  if (shovels.length === 0) return null;
  
  return ReactDOM.createPortal(
    <>
      {shovels.map(({ id, props }) => (
        <FlyingShovel
          key={id}
          {...props}
          onComplete={() => removeFlyingShovel(id)}
        />
      ))}
    </>,
    document.body
  );
};
