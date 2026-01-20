import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

// Pack colors by rarity
const PACK_COLORS: Record<number, string> = {
  1: '#9ca3af', // gray
  2: '#22c55e', // green
  3: '#3b82f6', // blue
  4: '#a855f7', // purple
  5: '#ef4444', // red
};

interface ShopItem {
  id: string;
  price: number;
  stars: number;
  packRarity: number; // 0 = no pack, 1-5 = pack with that rarity
  popular?: boolean;
  bestValue?: boolean;
}

interface FlyingItem {
  id: number;
  icon: string;
  value: number;
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

interface ShopProps {
  isVisible: boolean;
  onClose: () => void;
  onPurchase: (item: ShopItem) => void;
  onSubscribe: () => void;
  isSubscribed: boolean;
  onStarArrived?: (count: number) => void;
  onCollectionItemArrived?: (x: number, y: number) => void;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 'pack-1', price: 1.99, stars: 50, packRarity: 0 },
  { id: 'pack-2', price: 4.99, stars: 100, packRarity: 1, popular: true },
  { id: 'pack-3', price: 9.99, stars: 200, packRarity: 2 },
  { id: 'pack-4', price: 19.99, stars: 400, packRarity: 3, bestValue: true },
  { id: 'pack-5', price: 49.99, stars: 800, packRarity: 4 },
  { id: 'pack-6', price: 99.99, stars: 1500, packRarity: 5 },
];

const SUBSCRIPTION_PRICE = 5.99;

// Max flying icons
const MAX_STAR_ICONS = 25;

// Card pack SVG component
function CardPackIcon({ color, stars }: { color: string; stars: number }) {
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
        <rect x="0" y="0" width="36" height="48" rx="4" fill="url(#shopPackShine)" />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="shopPackShine" x1="0" y1="0" x2="36" y2="48" gradientUnits="userSpaceOnUse">
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
                style={{ 
                  fontSize: '10px',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                }}
              >
                ⭐
              </span>
            ))}
          </div>
          {/* Bottom row (if needed) */}
          {bottomRow > 0 && (
            <div className="flex justify-center gap-0 -mt-0.5">
              {Array.from({ length: bottomRow }).map((_, i) => (
                <span 
                  key={i} 
                  style={{ 
                    fontSize: '10px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                  }}
                >
                  ⭐
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Flying star component
interface FlyingStarProps {
  item: FlyingItem;
  onArrived: (value: number) => void;
}

function FlyingStar({ item, onArrived }: FlyingStarProps) {
  const [phase, setPhase] = useState<'scatter' | 'fly' | 'done'>('scatter');
  const [position, setPosition] = useState({ x: item.startX, y: item.startY });
  const startTimeRef = useRef(Date.now());
  const rafRef = useRef<number>();
  const arrivedRef = useRef(false);

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;

      if (phase === 'scatter') {
        const progress = Math.min(elapsed / item.scatterDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        setPosition({
          x: item.startX + (item.scatterX - item.startX) * eased,
          y: item.startY + (item.scatterY - item.startY) * eased
        });

        if (progress >= 1) {
          setPhase('fly');
          startTimeRef.current = Date.now() + item.flyDelay;
        }
      } else if (phase === 'fly') {
        const flyElapsed = Date.now() - startTimeRef.current;
        if (flyElapsed < 0) {
          rafRef.current = requestAnimationFrame(animate);
          return;
        }
        
        const progress = Math.min(flyElapsed / item.flyDuration, 1);
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const t = eased;
        const mt = 1 - t;
        const x = mt * mt * item.scatterX + 2 * mt * t * item.controlX + t * t * item.targetX;
        const y = mt * mt * item.scatterY + 2 * mt * t * item.controlY + t * t * item.targetY;

        setPosition({ x, y });

        if (progress >= 1) {
          setPhase('done');
          if (!arrivedRef.current) {
            arrivedRef.current = true;
            onArrived(item.value);
          }
          return;
        }
      }

      if (phase !== 'done') {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, item.scatterDuration, item.flyDelay, item.flyDuration, item.startX, item.startY, item.scatterX, item.scatterY, item.controlX, item.controlY, item.targetX, item.targetY, item.value, onArrived]);

  if (phase === 'done') return null;

  return (
    <div
      className="fixed pointer-events-none z-[10010]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        fontSize: '36px',
        filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.9))'
      }}
    >
      ⭐
    </div>
  );
}

export function Shop({ 
  isVisible, 
  onClose, 
  onPurchase, 
  onSubscribe, 
  isSubscribed,
  onStarArrived,
}: ShopProps) {
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState<'purchase' | 'subscribe'>('purchase');
  const [isAnimating, setIsAnimating] = useState(false);
  const [flyingStars, setFlyingStars] = useState<FlyingItem[]>([]);
  
  const pendingPurchaseRef = useRef<ShopItem | null>(null);
  const animationStartedRef = useRef(false);

  // Stable callback for star arrived
  const handleStarArrived = useCallback((value: number) => {
    onStarArrived?.(value);
  }, [onStarArrived]);

  // Create flying stars animation
  const createFlyingStars = useCallback((totalStars: number, onComplete: () => void) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    let targetX = window.innerWidth / 2;
    let targetY = 50;
    const starIcon = document.querySelector('[data-star-icon]');
    if (starIcon) {
      const rect = starIcon.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }
    
    const iconCount = Math.min(totalStars, MAX_STAR_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    const stars: FlyingItem[] = [];
    const scatterDuration = 400;
    const minRadius = 50;
    const maxRadius = 120;
    
    for (let i = 0; i < iconCount; i++) {
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
      const flyDelay = i * 25;
      
      stars.push({
        id: Date.now() * 1000 + Math.random() * 1000 + i,
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
    
    const totalDuration = scatterDuration + (iconCount * 25) + 500 + 200;
    setTimeout(() => {
      setFlyingStars([]);
      onComplete();
    }, totalDuration);
  }, []);

  const handlePurchaseClick = (item: ShopItem) => {
    setSelectedItem(item);
    setConfirmType('purchase');
    setShowConfirm(true);
  };

  const handleSubscribeClick = () => {
    setConfirmType('subscribe');
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (confirmType === 'purchase' && selectedItem) {
      // Prevent double animation
      if (animationStartedRef.current) return;
      animationStartedRef.current = true;
      
      // Start animation
      setShowConfirm(false);
      setIsAnimating(true);
      pendingPurchaseRef.current = selectedItem;
      
      // Close shop immediately so bottom buttons are visible during animation
      onClose();
      
      // Stars fly to progress bar
      createFlyingStars(selectedItem.stars, () => {
        setIsAnimating(false);
        animationStartedRef.current = false;
        // Actually process the purchase after animations
        if (pendingPurchaseRef.current) {
          onPurchase(pendingPurchaseRef.current);
          pendingPurchaseRef.current = null;
        }
      });
    } else if (confirmType === 'subscribe') {
      onSubscribe();
      setShowConfirm(false);
    }
    setSelectedItem(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setSelectedItem(null);
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const getPackName = (rarity: number) => {
    switch (rarity) {
      case 1: return 'Обычный пак';
      case 2: return 'Необычный пак';
      case 3: return 'Редкий пак';
      case 4: return 'Эпический пак';
      case 5: return 'Легендарный пак';
      default: return '';
    }
  };

  // Render flying animations
  const renderFlyingAnimations = () => {
    if (flyingStars.length === 0) return null;
    
    return ReactDOM.createPortal(
      <>
        {flyingStars.map(star => (
          <FlyingStar key={star.id} item={star} onArrived={handleStarArrived} />
        ))}
      </>,
      document.body
    );
  };

  if (!isVisible && !isAnimating) return null;

  // If animating, only show flying items
  if (isAnimating && !isVisible) {
    return renderFlyingAnimations();
  }

  const modal = (
    <div 
      className="fixed inset-0 z-[10003] flex items-center justify-center"
      onClick={isAnimating ? undefined : onClose}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${isAnimating ? 'opacity-50' : ''}`} />
      
      {/* Modal Content */}
      {!isAnimating && (
        <div 
          className="relative bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 rounded-2xl p-6 max-w-lg w-full mx-4 border border-purple-500/30 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl transition-colors"
          >
            ✕
          </button>

          {/* Header */}
          <div className="text-center mb-5">
            <h2 className="text-3xl font-bold text-white mb-1">🛒 Магазин</h2>
            <p className="text-purple-300/80">Получи звёзды и паки коллекций</p>
          </div>

          {/* Subscription Section */}
          <div className="mb-5">
            <div className={`relative p-4 rounded-xl border-2 transition-all ${
              isSubscribed 
                ? 'bg-green-500/20 border-green-500/50' 
                : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 hover:border-amber-400'
            }`}>
              {!isSubscribed && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  PREMIUM
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{isSubscribed ? '✅' : '👑'}</div>
                  <div>
                    <h3 className="text-white font-bold">
                      {isSubscribed ? 'Подписка активна' : 'Premium подписка'}
                    </h3>
                    <p className="text-white/60 text-sm">
                      Без рекламы • Дейли награды x3
                    </p>
                  </div>
                </div>
                
                {!isSubscribed && (
                  <button
                    onClick={handleSubscribeClick}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-lg transition-all hover:scale-105 shadow-lg"
                  >
                    {formatPrice(SUBSCRIPTION_PRICE)}/мес
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/40 text-sm">Наборы</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Shop Items Grid - 3 columns, 2 rows */}
          <div className="grid grid-cols-3 gap-3">
            {SHOP_ITEMS.map((item) => (
              <div
                key={item.id}
                className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.02] ${
                  item.bestValue 
                    ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400/50 hover:border-purple-300'
                    : item.popular
                    ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-400/40 hover:border-blue-300'
                    : 'bg-white/5 border-white/20 hover:border-white/40'
                }`}
                onClick={() => handlePurchaseClick(item)}
              >
                {/* Badges */}
                {item.bestValue && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    ХИТ
                  </div>
                )}
                {item.popular && !item.bestValue && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ТОП
                  </div>
                )}

                {/* Content */}
                <div className="text-center flex flex-col items-center">
                  {/* Stars amount */}
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-yellow-400 text-lg">⭐</span>
                    <span className="text-white font-bold text-lg">{item.stars}</span>
                  </div>
                  
                  {/* Pack icon or placeholder */}
                  <div className="h-[58px] flex items-center justify-center mb-2">
                    {item.packRarity > 0 ? (
                      <CardPackIcon color={PACK_COLORS[item.packRarity]} stars={item.packRarity} />
                    ) : (
                      <div className="text-white/30 text-xs text-center">
                        Только<br/>звёзды
                      </div>
                    )}
                  </div>
                  
                  {/* Pack name */}
                  <div className="text-white/60 text-xs h-4 mb-1">
                    {item.packRarity > 0 ? getPackName(item.packRarity) : ''}
                  </div>
                  
                  {/* Price button */}
                  <div className={`w-full py-1.5 px-2 rounded-lg font-bold text-sm ${
                    item.bestValue
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : item.popular
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      : 'bg-white/10 text-white'
                  }`}>
                    {formatPrice(item.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <p className="text-center text-white/30 text-xs mt-4">
            Покупки симулируются в демо-версии
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div 
          className="absolute inset-0 z-10 flex items-center justify-center"
          onClick={handleCancel}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="relative bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 border border-white/20"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white text-lg font-bold mb-2 text-center">
              {confirmType === 'subscribe' ? 'Оформить подписку?' : 'Подтвердить покупку?'}
            </h3>
            
            {confirmType === 'subscribe' ? (
              <div className="text-center mb-4">
                <p className="text-white/80 mb-2">Premium подписка</p>
                <p className="text-amber-400 font-bold text-xl">{formatPrice(SUBSCRIPTION_PRICE)}/месяц</p>
                <p className="text-white/60 text-sm mt-2">• Без рекламы<br/>• Дейли награды x3</p>
              </div>
            ) : selectedItem && (
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-1 mb-3">
                  <span className="text-yellow-400 text-2xl">⭐</span>
                  <span className="text-white font-bold text-2xl">{selectedItem.stars}</span>
                </div>
                {selectedItem.packRarity > 0 && (
                  <div className="flex flex-col items-center mb-2">
                    <CardPackIcon color={PACK_COLORS[selectedItem.packRarity]} stars={selectedItem.packRarity} />
                    <p className="text-white/80 text-sm mt-1">{getPackName(selectedItem.packRarity)}</p>
                  </div>
                )}
                <p className="text-purple-400 font-bold text-xl mt-2">
                  {formatPrice(selectedItem.price)}
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-lg transition-all"
              >
                Купить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Flying animations */}
      {renderFlyingAnimations()}
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

// Export types for use in GameBoard
export type { ShopItem };
export { SHOP_ITEMS };
