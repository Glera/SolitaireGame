import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

// Collection icons for animation
const COLLECTION_ICONS = ['🌸', '🍎', '🎾', '🍖', '🎀', '🏠', '💊', '🎪', '🐾'];

interface Pack {
  id: string;
  name: string;
  cards: number;
  uniqueGuaranteed: number;
  price: number;
  stars: number;
  color: string;
  icon: string;
}

const PACKS: Pack[] = [
  {
    id: 'small',
    name: 'Малый набор',
    cards: 5,
    uniqueGuaranteed: 1,
    price: 2.99,
    stars: 15,
    color: 'from-blue-600 to-blue-800',
    icon: '📦'
  },
  {
    id: 'medium',
    name: 'Средний набор',
    cards: 10,
    uniqueGuaranteed: 2,
    price: 3.99,
    stars: 35,
    color: 'from-purple-600 to-purple-800',
    icon: '🎁'
  },
  {
    id: 'large',
    name: 'Большой набор',
    cards: 15,
    uniqueGuaranteed: 3,
    price: 4.99,
    stars: 60,
    color: 'from-amber-500 to-orange-600',
    icon: '🏆'
  }
];

interface FlyingItem {
  id: number;
  icon: string;
  value: number; // How many stars/cards this icon represents
  startX: number;
  startY: number;
  scatterX: number;
  scatterY: number;
  targetX: number;
  targetY: number;
  controlX: number;
  controlY: number;
  scatterDuration: number;
  flyDelay: number;
  flyDuration: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

// Max number of flying icons to display
const MAX_FLYING_ICONS = 10;

// Particle colors (amber/orange theme matching collections button)
const PARTICLE_COLORS = ['#f59e0b', '#fb923c', '#fbbf24', '#fcd34d', '#ffffff'];

interface PromoWidgetProps {
  onPurchase?: (packId: string, stars: number, cards: number) => void;
  onStarArrived?: (count: number) => void; // Now receives count
  onCollectionCardArrived?: () => void;
  compact?: boolean; // Compact mode for events row
}

export function PromoWidget({ onPurchase, onStarArrived, onCollectionCardArrived, compact = false }: PromoWidgetProps) {
  const [showModal, setShowModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });
  const [flyingStars, setFlyingStars] = useState<FlyingItem[]>([]);
  const [flyingCards, setFlyingCards] = useState<FlyingItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const pendingPurchaseRef = useRef<{ stars: number; cards: number } | null>(null);
  
  // Create burst particles at collision point
  const createParticles = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    const particleCount = 5 + Math.floor(Math.random() * 3); // 5-7 particles
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 2 + Math.random() * 3;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // slight upward bias
        size: 3 + Math.random() * 4,
        opacity: 1,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Clean up particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 600);
  };
  
  // Countdown timer - resets daily
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      const diff = endOfDay.getTime() - now.getTime();
      
      if (diff <= 0) {
        return { hours: 23, minutes: 59, seconds: 59 };
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return { hours, minutes, seconds };
    };
    
    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const formatTime = (n: number) => n.toString().padStart(2, '0');
  
  // Create flying stars animation
  const createFlyingStars = (totalStars: number, onComplete: () => void) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Find star icon target
    let targetX = window.innerWidth / 2;
    let targetY = 50;
    const starIcon = document.querySelector('[data-star-icon]');
    if (starIcon) {
      const rect = starIcon.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }
    
    // Limit number of icons, each carries multiple stars if needed
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    const stars: FlyingItem[] = [];
    const scatterDuration = 400;
    const minRadius = 50;
    const maxRadius = 120;
    
    for (let i = 0; i < iconCount; i++) {
      // Calculate value for this icon (last one gets remainder)
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = centerX + Math.cos(angle) * radius;
      const scatterY = centerY + Math.sin(angle) * radius;
      
      const midX = (scatterX + targetX) / 2;
      const midY = (scatterY + targetY) / 2;
      
      const dx = targetX - scatterX;
      const dy = targetY - scatterY;
      const perpX = -dy;
      const perpY = dx;
      const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
      
      const curvature = (Math.random() - 0.5) * 150;
      const controlX = midX + (perpX / len) * curvature;
      const controlY = midY + (perpY / len) * curvature;
      
      const flyDuration = 350 + Math.random() * 150;
      const flyDelay = i * 60;
      
      stars.push({
        id: Date.now() + i,
        icon: '⭐',
        value,
        startX: centerX,
        startY: centerY,
        scatterX,
        scatterY,
        targetX,
        targetY,
        controlX,
        controlY,
        scatterDuration,
        flyDelay,
        flyDuration
      });
    }
    
    setFlyingStars(stars);
    
    // Calculate total animation duration
    const totalDuration = scatterDuration + (iconCount * 60) + 500 + 200;
    setTimeout(onComplete, totalDuration);
  };
  
  // Create flying collection cards animation
  const createFlyingCards = (totalCards: number, onComplete: () => void) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Find collections button target
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight - 100;
    const collectionsButton = document.querySelector('[data-collections-button]');
    if (collectionsButton) {
      const rect = collectionsButton.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }
    
    // Limit number of icons
    const iconCount = Math.min(totalCards, MAX_FLYING_ICONS);
    
    const cards: FlyingItem[] = [];
    const scatterDuration = 400;
    const minRadius = 40;
    const maxRadius = 100;
    
    for (let i = 0; i < iconCount; i++) {
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = centerX + Math.cos(angle) * radius;
      const scatterY = centerY + Math.sin(angle) * radius;
      
      const midX = (scatterX + targetX) / 2;
      const midY = (scatterY + targetY) / 2;
      
      const dx = targetX - scatterX;
      const dy = targetY - scatterY;
      const perpX = -dy;
      const perpY = dx;
      const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
      
      const curvature = (Math.random() - 0.5) * 150;
      const controlX = midX + (perpX / len) * curvature;
      const controlY = midY + (perpY / len) * curvature;
      
      const flyDuration = 400 + Math.random() * 150;
      const flyDelay = i * 80;
      
      // Pick random collection icon
      const icon = COLLECTION_ICONS[Math.floor(Math.random() * COLLECTION_ICONS.length)];
      
      cards.push({
        id: Date.now() + i + 1000,
        icon,
        value: 1, // Cards don't stack, just visual limit
        startX: centerX,
        startY: centerY,
        scatterX,
        scatterY,
        targetX,
        targetY,
        controlX,
        controlY,
        scatterDuration,
        flyDelay,
        flyDuration
      });
    }
    
    setFlyingCards(cards);
    
    // Calculate total animation duration
    const totalDuration = scatterDuration + (iconCount * 80) + 550 + 200;
    setTimeout(onComplete, totalDuration);
  };
  
  const handleStarArrived = (star: FlyingItem) => {
    setFlyingStars(prev => prev.filter(s => s.id !== star.id));
    // Call onStarArrived with the value this star carries
    onStarArrived?.(star.value);
  };
  
  const handleCardArrived = (card: FlyingItem) => {
    setFlyingCards(prev => prev.filter(c => c.id !== card.id));
    // Create particle burst at target position
    createParticles(card.targetX, card.targetY);
    onCollectionCardArrived?.();
  };
  
  const handlePurchase = (pack: Pack) => {
    setShowModal(false);
    setIsAnimating(true);
    pendingPurchaseRef.current = { stars: pack.stars, cards: pack.cards };
    
    // Phase 1: Stars fly to progress bar
    createFlyingStars(pack.stars, () => {
      // Phase 2: Collection cards fly to collections button
      createFlyingCards(pack.cards, () => {
        setIsAnimating(false);
        // Notify parent after all animations complete
        if (onPurchase) {
          onPurchase(pack.id, pack.stars, pack.cards);
        }
        pendingPurchaseRef.current = null;
      });
    });
  };
  
  return (
    <>
      {/* Promo Widget Button - Compact or Full */}
      {compact ? (
        <div className="relative" style={{ pointerEvents: 'auto' }}>
          <button
            onClick={() => !isAnimating && setShowModal(true)}
            className="relative flex flex-col items-center justify-center rounded-full transition-all duration-150 cursor-pointer hover:scale-110"
            style={{ 
              width: '62px', 
              height: '62px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
              border: '2px solid rgba(255,255,255,0.25)',
              opacity: isAnimating ? 0.5 : 1,
            }}
            disabled={isAnimating}
          >
            {/* Icon - discount percentage */}
            <span className="text-3xl font-black text-white" style={{ 
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}>%</span>
          </button>
          
          {/* Compact Timer below button - outside button so it doesn't scale */}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2 text-xs px-1.5 py-px rounded-full bg-black/90 text-white font-mono font-bold shadow-lg whitespace-nowrap pointer-events-none">
            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </span>
        </div>
      ) : (
        <button
          onClick={() => !isAnimating && setShowModal(true)}
          className="relative flex flex-col items-center justify-center bg-gradient-to-b from-amber-500 to-orange-600 rounded-xl shadow-lg border-2 border-amber-400/50 hover:scale-105 transition-transform"
          style={{ 
            width: '70px', 
            height: '96px',
            opacity: isAnimating ? 0.5 : 1,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.3)',
          }}
          disabled={isAnimating}
        >
          {/* Sale badge - static */}
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-400 shadow-md z-10">
            SALE
          </div>
          
          {/* Premium Pack Icon */}
          <div className="relative flex items-center justify-center" style={{ marginTop: '-4px' }}>
            <svg width="44" height="44" viewBox="0 0 36 36">
              {/* Glow effect */}
              <defs>
                <filter id="promoGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="promoCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fcd34d"/>
                  <stop offset="50%" stopColor="#f59e0b"/>
                  <stop offset="100%" stopColor="#d97706"/>
                </linearGradient>
              </defs>
              {/* Back cards (stack effect) */}
              <rect x="10" y="4" width="18" height="24" rx="3" fill="#92400e" opacity="0.6"/>
              <rect x="8" y="6" width="18" height="24" rx="3" fill="#b45309" opacity="0.8"/>
              {/* Main card */}
              <rect x="6" y="8" width="18" height="24" rx="3" fill="url(#promoCardGrad)" filter="url(#promoGlow)"/>
              {/* Stars on card */}
              <text x="15" y="18" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>★★</text>
              <text x="15" y="26" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>★★★</text>
              {/* Sparkle */}
              <text x="28" y="10" fill="#fff" fontSize="8">✨</text>
            </svg>
          </div>
          
          {/* Timer */}
          <div className="mt-1">
            <div className="text-[9px] text-white font-mono bg-black/50 px-1.5 py-0.5 rounded whitespace-nowrap">
              {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
            </div>
          </div>
        </button>
      )}
      
      {/* Purchase Modal */}
      {showModal && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-gradient-to-b from-slate-800 to-slate-900 text-white p-4 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border border-slate-600/50"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎴</span>
                <div>
                  <h2 className="text-lg font-bold">Наборы карточек</h2>
                  <p className="text-xs text-white/60">Пополни свою коллекцию!</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white/60 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            {/* Timer banner */}
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2 mb-4 text-center">
              <div className="text-xs text-red-300">⏰ Акция заканчивается через</div>
              <div className="text-lg font-bold text-white font-mono">
                {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
              </div>
            </div>
            
            {/* Packs */}
            <div className="space-y-3">
              {PACKS.map(pack => (
                <button
                  key={pack.id}
                  onClick={() => handlePurchase(pack)}
                  className={`w-full bg-gradient-to-r ${pack.color} rounded-xl p-3 text-left hover:scale-[1.02] transition-transform border border-white/10`}
                >
                  <div className="flex items-center gap-3">
                    {/* Pack icon */}
                    <div className="text-3xl">{pack.icon}</div>
                    
                    {/* Pack info */}
                    <div className="flex-1">
                      <div className="font-bold text-sm">{pack.name}</div>
                      <div className="text-xs text-white/80">
                        {pack.cards} карточек • мин. {pack.uniqueGuaranteed} уник.
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-yellow-300 text-xs">+{pack.stars} ⭐</span>
                        <span className="text-white/50 text-xs">в прогресс</span>
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="text-right">
                      <div className="text-lg font-bold">${pack.price.toFixed(2)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Info text */}
            <p className="text-center text-[10px] text-white/40 mt-4">
              Покупка помогает спасать животных и развивать игру
            </p>
          </div>
        </div>,
        document.body
      )}
      
      {/* Flying Stars */}
      {flyingStars.map(star => {
        // Determine star glow color based on value
        const getStarGlow = (value: number) => {
          if (value >= 100) {
            // Purple for x100
            return 'rgba(147, 51, 234, 0.9)';
          } else if (value >= 10) {
            // Blue for x10
            return 'rgba(59, 130, 246, 0.9)';
          } else {
            // Gold (default)
            return 'rgba(250, 204, 21, 0.8)';
          }
        };
        
        // Determine star filter based on value
        const getStarFilter = (value: number) => {
          if (value >= 100) {
            // Purple star
            return 'hue-rotate(260deg) brightness(1.2) saturate(1.5)';
          } else if (value >= 10) {
            // Blue star
            return 'hue-rotate(180deg) brightness(1.2)';
          } else {
            // Gold (no hue rotation)
            return '';
          }
        };
        
        return (
          <FlyingItemComponent
            key={star.id}
            item={star}
            onArrived={() => handleStarArrived(star)}
            glow={getStarGlow(star.value)}
            hueFilter={getStarFilter(star.value)}
          />
        );
      })}
      
      {/* Flying Collection Cards */}
      {flyingCards.map(card => (
        <FlyingItemComponent
          key={card.id}
          item={card}
          onArrived={() => handleCardArrived(card)}
          glow="rgba(139, 92, 246, 0.8)"
        />
      ))}
      
      {/* Collision Particles */}
      {particles.map(particle => (
        <ParticleComponent key={particle.id} particle={particle} />
      ))}
    </>
  );
}

// Quadratic bezier interpolation
function quadraticBezier(t: number, p0: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

// Easing functions
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInQuad(t: number): number {
  return t * t;
}

// Flying item component - two-phase animation (scatter + fly)
function FlyingItemComponent({ 
  item, 
  onArrived, 
  glow,
  hueFilter = ''
}: { 
  item: FlyingItem; 
  onArrived: () => void;
  glow: string;
  hueFilter?: string;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const arrivedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const flyDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onArrivedRef = useRef(onArrived);
  
  onArrivedRef.current = onArrived;
  
  useEffect(() => {
    setIsVisible(true);
    
    const animateScatter = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animateScatter);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / item.scatterDuration, 1);
      const easedProgress = easeOutCubic(progress);
      
      const x = item.startX + (item.scatterX - item.startX) * easedProgress;
      const y = item.startY + (item.scatterY - item.startY) * easedProgress;
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateScatter);
      } else {
        flyDelayTimerRef.current = setTimeout(() => {
          startTimeRef.current = null;
          rafRef.current = requestAnimationFrame(animateFly);
        }, item.flyDelay);
      }
    };
    
    const animateFly = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animateFly);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / item.flyDuration, 1);
      const easedProgress = easeInQuad(progress);
      
      const x = quadraticBezier(easedProgress, item.scatterX, item.controlX, item.targetX);
      const y = quadraticBezier(easedProgress, item.scatterY, item.controlY, item.targetY);
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      elementRef.current.style.transform = `translate(-50%, -50%)`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateFly);
      } else {
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          elementRef.current.style.display = 'none';
          onArrivedRef.current();
          setIsVisible(false);
        }
      }
    };
    
    rafRef.current = requestAnimationFrame(animateScatter);
    
    return () => {
      if (flyDelayTimerRef.current) {
        clearTimeout(flyDelayTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [item]);
  
  if (!isVisible) return null;
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed text-2xl pointer-events-none z-[10000]"
      style={{
        left: item.startX,
        top: item.startY,
        transform: 'translate(-50%, -50%)',
        filter: `${hueFilter} drop-shadow(0 0 6px ${glow}) drop-shadow(0 0 12px ${glow})`
      }}
    >
      {item.icon}
    </div>,
    document.body
  );
}

// Particle component - small burst particles on collision
function ParticleComponent({ particle }: { particle: Particle }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const duration = 500; // 500ms animation
    let x = particle.x;
    let y = particle.y;
    let vx = particle.vx;
    let vy = particle.vy;
    
    const animate = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Update position with velocity and gravity
      x += vx;
      y += vy;
      vy += 0.15; // gravity
      vx *= 0.98; // friction
      
      // Fade out
      const opacity = 1 - progress;
      const scale = 1 - progress * 0.5;
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      elementRef.current.style.opacity = `${opacity}`;
      elementRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsVisible(false);
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [particle]);
  
  if (!isVisible) return null;
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[10001] rounded-full"
      style={{
        left: particle.x,
        top: particle.y,
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        transform: 'translate(-50%, -50%)',
        boxShadow: `0 0 ${particle.size}px ${particle.color}`
      }}
    />,
    document.body
  );
}

