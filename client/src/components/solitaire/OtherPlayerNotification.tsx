import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

// Russian names for fake players - separated by gender
const FEMALE_NAMES = [
  'Анна', 'Мария', 'Елена', 'Ольга', 'Наталья', 'Ирина', 'Светлана', 'Татьяна',
  'Катя', 'Даша', 'Настя', 'Юля', 'Вика', 'Лена', 'Оля', 'Маша',
  'Алина', 'Кристина', 'Полина', 'Софья', 'Вера', 'Надя', 'Люба', 'Женя'
];

const MALE_NAMES = [
  'Александр', 'Сергей', 'Андрей', 'Дмитрий', 'Алексей', 'Максим', 'Иван', 'Михаил',
  'Паша', 'Саша', 'Коля', 'Вова', 'Петя', 'Костя', 'Артём', 'Денис',
  'Никита', 'Егор', 'Антон', 'Роман', 'Олег', 'Илья', 'Кирилл', 'Глеб'
];

// Player icons by gender
const FEMALE_ICONS = ['👩', '👧', '👱‍♀️', '👩‍🦰', '👩‍🦱'];
const MALE_ICONS = ['👨', '👦', '👱‍♂️', '👨‍🦰', '👨‍🦱', '🧔'];

interface FlyingStar {
  id: number;
  value: number; // How many stars this icon represents
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

// Max number of flying star icons
const MAX_FLYING_ICONS = 10;

// Pluralize "игрок" in Russian
function pluralizePlayer(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  
  if (mod100 >= 11 && mod100 <= 19) {
    return 'игроков';
  }
  if (mod10 === 1) {
    return 'игрок';
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'игрока';
  }
  return 'игроков';
}

interface OtherPlayerNotificationProps {
  progressBarRef?: React.RefObject<HTMLDivElement>;
  onStarsEarned?: (count: number) => void;
  minInterval?: number; // Min seconds between notifications
  maxInterval?: number; // Max seconds between notifications
  triggerRef?: React.MutableRefObject<(() => void) | null>; // Ref to trigger notification manually
}

export function OtherPlayerNotification({ 
  progressBarRef, 
  onStarsEarned,
  minInterval = 15,
  maxInterval = 60,
  triggerRef
}: OtherPlayerNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isContainerVisible, setIsContainerVisible] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerIcon, setPlayerIcon] = useState('👤');
  const [extraPeopleCount, setExtraPeopleCount] = useState(0); // Additional people count
  const [starsCount, setStarsCount] = useState(0);
  const [flyingStars, setFlyingStars] = useState<FlyingStar[]>([]);
  const [starsIconHidden, setStarsIconHidden] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const starsIconRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideContainerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const starsArrivedRef = useRef(0);
  const expectedStarsRef = useRef(0);
  const totalStarsValueRef = useRef(0); // Total stars value to award
  
  // Schedule next notification
  const scheduleNext = () => {
    const delay = (minInterval + Math.random() * (maxInterval - minInterval)) * 1000;
    timerRef.current = setTimeout(() => {
      showNotification();
    }, delay);
  };
  
  // Generate random group data
  const generateGroup = () => {
    // Randomly choose lead player gender
    const female = Math.random() < 0.5;
    const names = female ? FEMALE_NAMES : MALE_NAMES;
    const icons = female ? FEMALE_ICONS : MALE_ICONS;
    
    const name = names[Math.floor(Math.random() * names.length)];
    const icon = icons[Math.floor(Math.random() * icons.length)];
    
    // Number of additional people (0-9), weighted towards lower numbers
    const rand = Math.random();
    let extraPeople: number;
    if (rand < 0.3) {
      extraPeople = 0; // Just one person - 30%
    } else if (rand < 0.6) {
      extraPeople = 1 + Math.floor(Math.random() * 3); // 1-3 extra - 30%
    } else if (rand < 0.85) {
      extraPeople = 4 + Math.floor(Math.random() * 4); // 4-7 extra - 25%
    } else {
      extraPeople = 8 + Math.floor(Math.random() * 7); // 8-14 extra - 15%
    }
    
    const totalPeople = 1 + extraPeople;
    
    // Stars per person: 3-8 on average
    const starsPerPerson = 3 + Math.floor(Math.random() * 6);
    const totalStars = totalPeople * starsPerPerson;
    
    return { name, icon, extraPeople, totalStars };
  };
  
  // Hide container after animation completes
  const hideContainerAfterAnimation = () => {
    // Clear any existing timer
    if (hideContainerTimerRef.current) {
      clearTimeout(hideContainerTimerRef.current);
    }
    // Wait for slide-out animation (400ms) then hide container completely
    hideContainerTimerRef.current = setTimeout(() => {
      setIsContainerVisible(false);
    }, 450);
  };
  
  // Show notification
  const showNotification = () => {
    const { name, icon, extraPeople, totalStars } = generateGroup();
    setPlayerName(name);
    setPlayerIcon(icon);
    setExtraPeopleCount(extraPeople);
    setStarsCount(totalStars);
    setStarsIconHidden(false);
    setFlyingStars([]);
    starsArrivedRef.current = 0;
    totalStarsValueRef.current = totalStars;
    
    // Calculate number of flying icons (max 10)
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    expectedStarsRef.current = iconCount;
    
    // Clear hide timer if any
    if (hideContainerTimerRef.current) {
      clearTimeout(hideContainerTimerRef.current);
    }
    
    // Show container first (with panel hidden), then animate panel in
    setIsContainerVisible(true);
    setIsVisible(false); // Start hidden
    
    // Small delay to let container render, then animate panel in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
    
    // After slide-in animation (500ms), wait a bit then launch stars
    setTimeout(() => {
      launchStars(totalStars);
    }, 800);
  };
  
  // Launch flying stars with limit
  const launchStars = (totalStars: number) => {
    if (!starsIconRef.current) return;
    
    setStarsIconHidden(true);
    
    // Get target position (progress bar star icon) - search globally in document
    let targetX = window.innerWidth / 2;
    let targetY = 30;
    
    // Find star icon globally (works even with scaled containers)
    const starIcon = document.querySelector('[data-star-icon]');
    if (starIcon) {
      const rect = starIcon.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }
    
    // Get start position from notification's star icon
    const iconRect = starsIconRef.current.getBoundingClientRect();
    const centerX = iconRect.left + iconRect.width / 2;
    const centerY = iconRect.top + iconRect.height / 2;
    
    // Limit number of icons, each carries multiple stars if needed
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    const stars: FlyingStar[] = [];
    const scatterDuration = 400;
    const minRadius = 10;
    const maxRadius = 30;
    
    for (let i = 0; i < iconCount; i++) {
      // Calculate value for this icon (last one gets remainder)
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
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
      
      const curvature = (Math.random() - 0.5) * 100;
      const controlX = midX + (perpX / len) * curvature;
      const controlY = midY + (perpY / len) * curvature;
      
      const flyDuration = 300 + Math.random() * 150;
      const flyDelay = i * 50;
      
      stars.push({
        id: Date.now() + i,
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
  };
  
  // Handle star arrival
  const handleStarArrived = (star: FlyingStar) => {
    setFlyingStars(prev => prev.filter(s => s.id !== star.id));
    starsArrivedRef.current++;
    
    // Notify parent about the value this star carries
    if (onStarsEarned) {
      onStarsEarned(star.value);
    }
    
    // Check if all stars arrived
    if (starsArrivedRef.current >= expectedStarsRef.current) {
      // Hide notification after small delay
      setTimeout(() => {
        setIsVisible(false);
        hideContainerAfterAnimation();
        // Schedule next notification
        scheduleNext();
      }, 300);
    }
  };
  
  // Expose trigger function via ref
  useEffect(() => {
    if (triggerRef) {
      triggerRef.current = () => {
        // Cancel any pending timer
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        // Show notification immediately if not already visible
        if (!isVisible) {
          showNotification();
        }
      };
    }
    return () => {
      if (triggerRef) {
        triggerRef.current = null;
      }
    };
  }, [triggerRef, isVisible]);
  
  // Start the cycle on mount
  useEffect(() => {
    // Initial delay before first notification (5-15 seconds)
    const initialDelay = (5 + Math.random() * 10) * 1000;
    timerRef.current = setTimeout(() => {
      showNotification();
    }, initialDelay);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (hideContainerTimerRef.current) {
        clearTimeout(hideContainerTimerRef.current);
      }
    };
  }, []);
  
  return (
    <>
      {/* Notification container - clips content that slides from ABOVE progress bar */}
      {/* Positioned inside flex-1 container, ABOVE the progress bar */}
      {/* Hidden completely after slide-out animation to prevent artifacts */}
      {isContainerVisible && (
        <div
          className="absolute pointer-events-none overflow-hidden"
          style={{
            bottom: '100%', // Right at TOP edge of progress bar
            left: 0,
            right: 0,
            height: '50px', // Increased to fit 2 lines of text
            zIndex: 5,
          }}
        >
          {/* Notification banner - slides UP from hidden position */}
          <div
            ref={containerRef}
            className="flex justify-center h-full items-end"
            style={{
              // Same paddingLeft as progress bar text (24px) to align centers
              paddingLeft: '24px',
              transform: isVisible ? 'translateY(0)' : 'translateY(calc(100% + 2px))',
              transition: 'transform 0.4s ease-out'
            }}
          >
            <div className="bg-gradient-to-r from-indigo-600/95 to-purple-600/95 backdrop-blur-sm rounded-t-lg px-3 py-1 shadow-lg border border-white/20 border-b-0 flex items-center gap-2">
              <span className="text-base">{playerIcon}</span>
              <span className="text-white text-xs font-medium">
                {playerName}
                {extraPeopleCount > 0 && (
                  <span className="text-white/70"> и ещё {extraPeopleCount} {pluralizePlayer(extraPeopleCount)}</span>
                )}
              </span>
              <span className="text-white/70 text-xs">{extraPeopleCount > 0 ? 'приносят' : 'приносит'}</span>
              <div 
                ref={starsIconRef}
                className="flex items-center gap-1"
                style={{ visibility: starsIconHidden ? 'hidden' : 'visible' }}
              >
                <span className="text-yellow-300 font-bold text-xs">+{starsCount}</span>
                <span className="text-sm">⭐</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Flying stars - rendered via portal to escape transform stacking context */}
      {flyingStars.length > 0 && ReactDOM.createPortal(
        <>
          {flyingStars.map(star => (
            <NotificationFlyingStar
              key={star.id}
              star={star}
              onArrived={() => handleStarArrived(star)}
            />
          ))}
        </>,
        document.body
      )}
    </>
  );
}

// Quadratic bezier interpolation
function quadraticBezier(t: number, p0: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInQuad(t: number): number {
  return t * t;
}

// Flying star component
function NotificationFlyingStar({ star, onArrived }: { star: FlyingStar; onArrived: () => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const arrivedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const flyDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onArrivedRef = useRef(onArrived);
  
  onArrivedRef.current = onArrived;
  
  useEffect(() => {
    const animateScatter = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animateScatter);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / star.scatterDuration, 1);
      const easedProgress = easeOutCubic(progress);
      
      const x = star.startX + (star.scatterX - star.startX) * easedProgress;
      const y = star.startY + (star.scatterY - star.startY) * easedProgress;
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateScatter);
      } else {
        flyDelayTimerRef.current = setTimeout(() => {
          startTimeRef.current = null;
          rafRef.current = requestAnimationFrame(animateFly);
        }, star.flyDelay);
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
      const progress = Math.min(elapsed / star.flyDuration, 1);
      const easedProgress = easeInQuad(progress);
      
      const x = quadraticBezier(easedProgress, star.scatterX, star.controlX, star.targetX);
      const y = quadraticBezier(easedProgress, star.scatterY, star.controlY, star.targetY);
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateFly);
      } else {
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          setIsVisible(false);
          onArrivedRef.current();
        }
      }
    };
    
    rafRef.current = requestAnimationFrame(animateScatter);
    
    return () => {
      if (flyDelayTimerRef.current) clearTimeout(flyDelayTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [star]);
  
  if (!isVisible) return null;
  
  return (
    <div
      ref={elementRef}
      className="fixed text-lg pointer-events-none z-[10000]"
      style={{
        left: star.startX,
        top: star.startY,
        transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 0 3px rgba(250, 204, 21, 0.8))'
      }}
    >
      ⭐
    </div>
  );
}

