import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  PackRarity, 
  COLLECTION_PACKS, 
  PackItem,
} from '../../lib/liveops/pointsEvent';

// Rarity colors for glow effects
const RARITY_GLOW_COLORS: Record<number, string> = {
  1: '#9ca3af', // gray
  2: '#22c55e', // green  
  3: '#3b82f6', // blue
  4: '#a855f7', // purple
  5: '#ef4444', // red/gold
};

interface FlyingCardData {
  index: number;
  item: PackItem;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  delay: number;
}

interface CollectionPackPopupProps {
  isVisible: boolean;
  packRarity: PackRarity;
  items: PackItem[];
  onClose: () => void;
  onItemsCollected: (items: PackItem[]) => void;
  onItemArrived?: (x: number, y: number) => void;
  onCardsStartFlying?: () => void; // Called when cards start flying - can unblock interactions early
  collectionsButtonRef?: React.RefObject<HTMLButtonElement>;
  sourceRef?: React.RefObject<HTMLDivElement>; // Where the pack flies from (ref)
  sourcePosition?: { x: number; y: number }; // Where the pack flies from (coordinates)
  skipBounce?: boolean; // Skip bouncing phase, go directly to arriving (for milestone rewards)
}

type Phase = 'bouncing' | 'arriving' | 'pack' | 'revealing' | 'items' | 'flying';

export function CollectionPackPopup({
  isVisible,
  packRarity,
  items,
  onClose,
  onItemsCollected,
  onItemArrived,
  onCardsStartFlying,
  collectionsButtonRef,
  sourceRef,
  sourcePosition,
  skipBounce,
}: CollectionPackPopupProps) {
  const [phase, setPhase] = useState<Phase>('bouncing');
  const [revealedItems, setRevealedItems] = useState<number[]>([]);
  const [flyingCards, setFlyingCards] = useState<FlyingCardData[]>([]);
  const [completedFlights, setCompletedFlights] = useState(0);
  const [bounceProgress, setBounceProgress] = useState(0);
  const [arrivalProgress, setArrivalProgress] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const arrivalRafRef = useRef<number>();
  const bounceRafRef = useRef<number>();
  
  const pack = COLLECTION_PACKS[packRarity];
  
  // Use refs to avoid stale closure issues
  const onItemsCollectedRef = useRef(onItemsCollected);
  const onCloseRef = useRef(onClose);
  const itemsRef = useRef(items);
  const hasCompletedRef = useRef(false);
  
  useEffect(() => {
    onItemsCollectedRef.current = onItemsCollected;
    onCloseRef.current = onClose;
    itemsRef.current = items;
  }, [onItemsCollected, onClose, items]);
  
  // Reset state when popup becomes visible and start bounce + arrival animation
  useEffect(() => {
    if (isVisible) {
      setRevealedItems([]);
      setFlyingCards([]);
      setCompletedFlights(0);
      hasCompletedRef.current = false;
      cardRefs.current = [];
      setBounceProgress(0);
      setArrivalProgress(0);
      
      // Check if we have a source to fly from (ref or coordinates)
      const hasSource = sourceRef?.current || sourcePosition;
      if (hasSource) {
        // Arrival animation function (reused)
        const startArrivalAnimation = () => {
          setPhase('arriving');
          const arrivalStartTime = performance.now();
          const arrivalDuration = 400; // ms
          
          const animateArrival = (timestamp: number) => {
            const elapsed = timestamp - arrivalStartTime;
            const progress = Math.min(elapsed / arrivalDuration, 1);
            
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setArrivalProgress(eased);
            
            if (progress < 1) {
              arrivalRafRef.current = requestAnimationFrame(animateArrival);
            } else {
              setPhase('pack');
            }
          };
          
          arrivalRafRef.current = requestAnimationFrame(animateArrival);
        };
        
        if (skipBounce) {
          // Skip bouncing, go directly to arriving
          startArrivalAnimation();
        } else {
          // Start with bouncing phase
          setPhase('bouncing');
          
          // Animate bounce - smooth pulse effect at source position
          const bounceStartTime = performance.now();
          const bounceDuration = 600; // ms - longer for smoother feel
          
          const animateBounce = (timestamp: number) => {
            const elapsed = timestamp - bounceStartTime;
            const progress = Math.min(elapsed / bounceDuration, 1);
            
            // Smooth sine wave easing - gentle pulse up and down
            const eased = Math.sin(progress * Math.PI);
            setBounceProgress(eased);
            
            if (progress < 1) {
              bounceRafRef.current = requestAnimationFrame(animateBounce);
            } else {
              // Bounce complete, start arrival animation
              startArrivalAnimation();
            }
          };
          
          bounceRafRef.current = requestAnimationFrame(animateBounce);
        }
      } else {
        // No source, go directly to pack phase
        setPhase('pack');
        setArrivalProgress(1);
      }
    }
    
    return () => {
      if (bounceRafRef.current) {
        cancelAnimationFrame(bounceRafRef.current);
      }
      if (arrivalRafRef.current) {
        cancelAnimationFrame(arrivalRafRef.current);
      }
    };
  }, [isVisible, sourceRef, sourcePosition, skipBounce]);
  
  // Check when all flights complete
  useEffect(() => {
    if (phase === 'flying' && completedFlights >= itemsRef.current.length && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onItemsCollectedRef.current(itemsRef.current);
      onCloseRef.current();
    }
  }, [completedFlights, phase]);
  
  // Handle pack tap - start revealing items
  const handlePackTap = () => {
    if (phase !== 'pack') return;
    setPhase('revealing');
    
    // Reveal items one by one with delay
    items.forEach((_, index) => {
      setTimeout(() => {
        setRevealedItems(prev => [...prev, index]);
        
        // After all items revealed, switch to items phase
        if (index === items.length - 1) {
          setTimeout(() => setPhase('items'), 300);
        }
      }, index * 200 + 100);
    });
  };
  
  // Handle items tap - fly cards to collections button
  const handleItemsTap = () => {
    if (phase !== 'items') return;
    
    // Get collections button position
    const targetRect = collectionsButtonRef?.current?.getBoundingClientRect();
    const targetX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth / 2;
    const targetY = targetRect ? targetRect.top + targetRect.height / 2 : window.innerHeight - 100;
    
    // Create flying cards data from current positions
    const newFlyingCards: FlyingCardData[] = [];
    
    items.forEach((item, index) => {
      const cardEl = cardRefs.current[index];
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        newFlyingCards.push({
          index,
          item,
          startX: rect.left + rect.width / 2,
          startY: rect.top + rect.height / 2,
          targetX,
          targetY,
          delay: index * 80, // Staggered flight
        });
      }
    });
    
    setFlyingCards(newFlyingCards);
    setPhase('flying');
    
    // Notify parent that cards are flying - can unblock interactions early
    if (onCardsStartFlying) {
      onCardsStartFlying();
    }
  };
  
  if (!isVisible) return null;
  
  // Get source position helper
  const getSourcePosition = () => {
    if (sourcePosition) {
      return { x: sourcePosition.x, y: sourcePosition.y };
    } else if (sourceRef?.current) {
      const sourceRect = sourceRef.current.getBoundingClientRect();
      return { x: sourceRect.left + sourceRect.width / 2, y: sourceRect.top + sourceRect.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  // Calculate pack position during bouncing and arrival
  const getPackPosition = () => {
    if (phase === 'bouncing') {
      const source = getSourcePosition();
      
      // Smooth pulse effect - bounceProgress is sine wave (0 → 1 → 0)
      const bounceHeight = 25; // pixels to bounce up
      const bounceY = -bounceHeight * bounceProgress; // Smooth up and down
      
      // Scale with bounce - gentle pulse
      const baseScale = 0.15;
      const bounceScale = baseScale * (1 + bounceProgress * 0.3); // Grow slightly during pulse
      
      return {
        position: 'fixed' as const,
        left: source.x,
        top: source.y + bounceY,
        transform: `translate(-50%, -50%) scale(${bounceScale})`,
      };
    }
    
    if (phase === 'arriving') {
      const source = getSourcePosition();
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // Interpolate from source to center
      const currentX = source.x + (centerX - source.x) * arrivalProgress;
      const currentY = source.y + (centerY - source.y) * arrivalProgress;
      
      // Scale from small (0.15) to full size (1.0)
      const scaleEased = Math.pow(arrivalProgress, 0.5); // Faster scale growth
      const scale = 0.15 + 0.85 * scaleEased;
      
      return {
        position: 'fixed' as const,
        left: currentX,
        top: currentY,
        transform: `translate(-50%, -50%) scale(${scale})`,
      };
    }
    return {};
  };
  
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ 
        background: phase === 'flying' ? 'transparent' : 
          phase === 'bouncing' ? `rgba(0, 0, 0, ${0.85 * bounceProgress})` :
          phase === 'arriving' ? `rgba(0, 0, 0, 0.85)` : 
          'rgba(0, 0, 0, 0.85)',
        pointerEvents: phase === 'flying' || phase === 'arriving' || phase === 'bouncing' ? 'none' : 'auto',
      }}
      onClick={phase === 'pack' ? handlePackTap : phase === 'items' ? handleItemsTap : undefined}
    >
      {/* Pack display - shown during bouncing, arriving and pack phases */}
      {(phase === 'bouncing' || phase === 'arriving' || phase === 'pack') && (
        <div 
          className="relative cursor-pointer"
          style={{
            ...getPackPosition(),
          }}
        >
          {/* Pack card */}
          <div
            className="relative rounded-2xl p-6 flex flex-col items-center"
            style={{
              width: '180px',
              height: '240px',
              background: pack.bgGradient,
              boxShadow: `0 0 40px ${pack.color}80, 0 10px 40px rgba(0,0,0,0.5)`,
              border: `3px solid ${pack.color}`,
            }}
          >
            {/* Shine effect */}
            <div 
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, transparent 100%)',
              }}
            />
            
            {/* Pack icon */}
            <div className="text-6xl mt-4">📦</div>
            
            {/* Pack name */}
            <div className="text-white font-bold text-lg mt-4">{pack.name}</div>
            
            {/* Stars */}
            <div className="flex gap-1 mt-2">
              {Array.from({ length: packRarity }).map((_, i) => (
                <span 
                  key={i} 
                  className="text-xl"
                  style={{ 
                    color: '#fbbf24',
                    filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            
            {/* Item count */}
            <div className="text-white/70 text-sm mt-4">
              {pack.itemCount} предмета
            </div>
          </div>
          
          {/* Tap hint - only show when pack has arrived */}
          {phase === 'pack' && (
            <div 
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white/60 text-sm whitespace-nowrap"
              style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
            >
              Нажмите, чтобы открыть
            </div>
          )}
        </div>
      )}
      
      {/* Items reveal */}
      {(phase === 'revealing' || phase === 'items') && (
        <div className="relative">
          {/* Items spread from center - responsive gap */}
          <div 
            className="flex gap-2 sm:gap-4 items-center justify-center px-2"
            style={{ perspective: '1000px' }}
          >
            {items.map((item, index) => {
              const isRevealed = revealedItems.includes(index);
              
              return (
                <div
                  key={index}
                  ref={el => cardRefs.current[index] = el}
                  className="relative"
                  style={{
                    transform: isRevealed
                      ? `rotateY(0deg) translateY(0) scale(1)`
                      : `rotateY(180deg) translateY(50px) scale(0.5)`,
                    opacity: isRevealed ? 1 : 0,
                    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
                  }}
                >
                  <ItemCard item={item} />
                </div>
              );
            })}
          </div>
          
          {/* Tap hint for items phase */}
          {phase === 'items' && (
            <div 
              className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-white/60 text-sm whitespace-nowrap"
              style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
            >
              Нажмите, чтобы собрать
            </div>
          )}
        </div>
      )}
      
      {/* Flying cards - each card flies to collections button */}
      {flyingCards.map((flyingCard) => (
        <FlyingCard
          key={flyingCard.index}
          item={flyingCard.item}
          startX={flyingCard.startX}
          startY={flyingCard.startY}
          targetX={flyingCard.targetX}
          targetY={flyingCard.targetY}
          delay={flyingCard.delay}
          onComplete={() => setCompletedFlights(prev => prev + 1)}
          onArrived={onItemArrived}
        />
      ))}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}

// Separate component for item card - responsive sizing
function ItemCard({ item }: { item: PackItem }) {
  // Use smaller cards on mobile (window width < 400px)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 400;
  const cardWidth = isMobile ? 72 : 90;
  const cardHeight = isMobile ? 92 : 110;
  
  return (
    <div
      className="relative rounded-xl p-2 sm:p-3 flex flex-col items-center"
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
        border: `2px solid ${RARITY_GLOW_COLORS[item.rarity]}`,
        boxShadow: item.isNew 
          ? `0 0 20px ${RARITY_GLOW_COLORS[item.rarity]}80, inset 0 1px 0 rgba(255,255,255,0.1)`
          : `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
      }}
    >
      {/* New indicator */}
      {item.isNew && (
        <div 
          className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#000',
            boxShadow: '0 2px 8px rgba(251, 191, 36, 0.5)',
          }}
        >
          NEW
        </div>
      )}
      
      {/* Item icon - responsive size */}
      <div 
        className="text-3xl sm:text-4xl"
        style={{
          filter: item.isNew 
            ? `drop-shadow(0 0 8px ${RARITY_GLOW_COLORS[item.rarity]})`
            : 'none',
        }}
      >
        {item.icon}
      </div>
      
      {/* Rarity stars */}
      <div className="flex gap-0.5 mt-1">
        {Array.from({ length: item.rarity }).map((_, i) => (
          <span 
            key={i} 
            className="text-xs"
            style={{ 
              color: RARITY_GLOW_COLORS[item.rarity],
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
            }}
          >
            ★
          </span>
        ))}
      </div>
      
      {/* Item name */}
      <div className="text-[9px] text-white/80 text-center mt-1 leading-tight">
        {item.name}
      </div>
    </div>
  );
}

// Flying card component with parabolic physics animation
// The card shrinks as it flies, showing just the icon at the end
function FlyingCard({ 
  item, 
  startX, 
  startY, 
  targetX, 
  targetY, 
  delay,
  onComplete,
  onArrived,
}: { 
  item: PackItem;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  delay: number;
  onComplete: () => void;
  onArrived?: (x: number, y: number) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onArrivedRef = useRef(onArrived);
  
  // Update ref to avoid stale closure
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onArrivedRef.current = onArrived;
  }, [onComplete, onArrived]);
  
  useEffect(() => {
    // Start after delay
    const startTimer = setTimeout(() => {
      setIsVisible(true);
      
      // Physics parameters for parabolic flight
      const totalDuration = 900; // ms
      const gravity = 1400; // pixels per second^2
      
      const dx = targetX - startX;
      const dy = targetY - startY;
      
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
        
        if (cardRef.current) {
          cardRef.current.style.left = `${x}px`;
          cardRef.current.style.top = `${y}px`;
          
          // Scale from 1 to 0.4 as it approaches target
          const scale = 1 - progress * 0.6;
          
          const currentVy = vy0 + gravity * timeInSeconds;
          const angle = Math.atan2(currentVy, vx0) * (180 / Math.PI);
          
          cardRef.current.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${angle * 0.15}deg)`;
        }
        
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setIsComplete(true);
          // Trigger particle effect at arrival point
          if (onArrivedRef.current) {
            onArrivedRef.current(targetX, targetY);
          }
          onCompleteRef.current();
        }
      };
      
      rafRef.current = requestAnimationFrame(animate);
    }, delay);
    
    return () => {
      clearTimeout(startTimer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [delay, startX, startY, targetX, targetY]);
  
  if (!isVisible || isComplete) return null;
  
  const glowColor = RARITY_GLOW_COLORS[item.rarity];
  
  return (
    <div
      ref={cardRef}
      className="fixed pointer-events-none z-[10001]"
      style={{
        left: startX,
        top: startY,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* The entire card flies */}
      <div
        className="relative rounded-xl p-3 flex flex-col items-center"
        style={{
          width: '90px',
          height: '110px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: `2px solid ${glowColor}`,
          boxShadow: `0 0 20px ${glowColor}80`,
        }}
      >
        {/* Item icon */}
        <div 
          className="text-4xl"
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        >
          {item.icon}
        </div>
        
        {/* Rarity stars */}
        <div className="flex gap-0.5 mt-1">
          {Array.from({ length: item.rarity }).map((_, i) => (
            <span 
              key={i} 
              className="text-xs"
              style={{ 
                color: glowColor,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
              }}
            >
              ★
            </span>
          ))}
        </div>
        
        {/* Item name */}
        <div className="text-[9px] text-white/80 text-center mt-1 leading-tight">
          {item.name}
        </div>
      </div>
    </div>
  );
}
