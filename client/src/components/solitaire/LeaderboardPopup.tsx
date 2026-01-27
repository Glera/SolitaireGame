import React, { useEffect, useState, useRef } from 'react';
import { LeaderboardPlayer, SeasonInfo, formatTimeRemaining } from '../../lib/leaderboard';

interface LeaderboardPopupProps {
  isVisible: boolean;
  onClose: () => void;
  players: LeaderboardPlayer[];
  oldPosition: number;
  newPosition: number;
  seasonInfo: SeasonInfo;
}

// Fallback height until we measure real row spacing from the DOM
const DEFAULT_ROW_HEIGHT = 52;

export function LeaderboardPopup({ 
  isVisible, 
  onClose, 
  players, 
  oldPosition, 
  newPosition,
  seasonInfo
}: LeaderboardPopupProps) {
  const positionChange = oldPosition - newPosition;
  const hasPositionImproved = positionChange > 0;
  
  const [showList, setShowList] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  // Start with 'ready' so offset is applied from the very first render
  const [animationPhase, setAnimationPhase] = useState<'ready' | 'moving' | 'complete'>('ready');
  const [isLoading, setIsLoading] = useState(true);
  const rowHeightRef = useRef(DEFAULT_ROW_HEIGHT);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRowRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const initialOffset = hasPositionImproved ? positionChange * rowHeightRef.current : 0;
  
  // Update timer every minute
  useEffect(() => {
    if (!isVisible) return;
    
    const updateTimer = () => {
      setTimeRemaining(formatTimeRemaining(seasonInfo.endTime));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    
    return () => clearInterval(interval);
  }, [isVisible, seasonInfo.endTime]);
  
  // Reset state when popup closes
  useEffect(() => {
    if (!isVisible) {
      setAnimationPhase('ready'); // Reset to 'ready' so offset is applied on next open
      setShowList(false);
      setIsLoading(true);
      hasStartedRef.current = false;
    }
  }, [isVisible]);
  
  // Animate scroll with exact duration to sync with CSS transition
  const animateScroll = (container: HTMLDivElement, from: number, to: number, duration: number) => {
    const startTime = performance.now();
    
    // Ease-out function matching CSS cubic-bezier(0.25, 1, 0.5, 1)
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      
      const currentScroll = from + (to - from) * easedProgress;
      container.scrollTop = currentScroll;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  };
  
  // Handle animation sequence
  useEffect(() => {
    if (!isVisible || hasStartedRef.current) return;
    
    hasStartedRef.current = true;
    setShowList(true);
    
    // Wait for DOM to be ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        const playerRow = playerRowRef.current;
        if (!container || !playerRow) {
          setIsLoading(false);
          setAnimationPhase('complete');
          return;
        }
        
        // Calculate row height (row + vertical spacing) from the actual DOM
        const measureRowHeight = () => {
          const rows = container.querySelectorAll<HTMLElement>('[data-player-row]');
          if (rows.length >= 2) {
            const first = rows[0];
            const second = rows[1];
            const gap = Math.max(0, second.offsetTop - first.offsetTop - first.offsetHeight);
            return first.offsetHeight + gap;
          }
          if (rows.length === 1) {
            return rows[0].offsetHeight + 4; // space-y-1 fallback
          }
          return rowHeightRef.current;
        };
        
        const measuredRowHeight = measureRowHeight();
        rowHeightRef.current = measuredRowHeight;
        const containerHeight = container.clientHeight;
        
        if (!hasPositionImproved) {
          // No improvement - scroll directly to current position
          const targetScroll = Math.max(
            0,
            (newPosition - 1) * measuredRowHeight - containerHeight / 2 + measuredRowHeight / 2
          );
          container.scrollTop = targetScroll;
          setIsLoading(false);
          setAnimationPhase('complete');
          return;
        }
        
        // Has position improved - setup initial state with offset
        // Set phase to 'ready' - this applies transform to user row
        setAnimationPhase('ready');
        
        // Wait for React to apply marginTop (double RAF for safety)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Scroll to show user at OLD position (center of screen)
          const oldPositionScroll = Math.max(0, (oldPosition - 1) * measuredRowHeight - containerHeight / 2 + measuredRowHeight / 2);
          container.scrollTop = oldPositionScroll;
          
          const startOffset = hasPositionImproved ? positionChange * measuredRowHeight : 0;
          console.log('📍 Initial state: oldPosition:', oldPosition, 'scroll:', oldPositionScroll, 'offset:', startOffset);
          
          // Start animation as soon as готово
          requestAnimationFrame(() => {
            setIsLoading(false);
            setAnimationPhase('moving');

            // Мгновенный старт полёта: одна фаза
            const movePhaseDuration = 1500;

            const newPositionScroll = Math.max(
              0,
              (newPosition - 1) * measuredRowHeight - containerHeight / 2 + measuredRowHeight / 2
            );

              // Анимация: один непрерывный полёт с ростом + синхронный скролл
            const runAnimation = async () => {
              try {
                const lowerOffset = startOffset + measuredRowHeight * 0.1; // лёгкое смещение вниз в начале
                const startScrollTop = container.scrollTop;
                animateScroll(container, startScrollTop, newPositionScroll, movePhaseDuration);

                await playerRow.animate(
                  [
                    { transform: `translateY(${lowerOffset}px) scale(0.98)` },
                    { transform: 'translateY(0px) scale(1.08)' }
                  ],
                  {
                    duration: movePhaseDuration,
                    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                    fill: 'forwards'
                  }
                ).finished;

                // Быстрый возврат к норме при посадке
                await playerRow.animate([
                  { transform: 'translateY(0px) scale(1.08)' },
                  { transform: 'translateY(0px) scale(1.0)' },
                ], {
                  duration: 140,
                  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  fill: 'forwards'
                }).finished;
              } catch (e) {
                console.error('Animation interrupted', e);
              } finally {
                setAnimationPhase('complete');
              }
            };

            runAnimation();

            console.log('🚀 Animating from pos', oldPosition, 'to', newPosition);
          });
        });
        });
      });
    });
  }, [isVisible, hasPositionImproved, positionChange, oldPosition, newPosition, initialOffset]);
  
  if (!isVisible) return null;
  
  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };
  
  const getPositionStyle = (isCurrentUser: boolean, position: number) => {
    let baseStyle = 'flex items-center gap-2 p-2 rounded-xl';
    
    if (isCurrentUser) {
      baseStyle += ' bg-gradient-to-r from-yellow-500/50 to-amber-500/50 border-2 border-yellow-400';
      
      if (animationPhase === 'moving') {
        baseStyle += ' scale-[1.02]';
      }
    } else if (position <= 3) {
      baseStyle += ' bg-slate-700/40 border border-slate-500/30';
    } else {
      baseStyle += ' bg-slate-800/30';
    }
    
    return baseStyle;
  };
  
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop - separate layer, no animation */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-5 mx-4 max-w-md w-full shadow-2xl border border-slate-600/50 max-h-[80vh] flex flex-col"
        style={{
          animation: 'modalSlideIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">🏆</div>
          <h2 className="text-xl font-bold text-white">Рейтинг сезона {seasonInfo.seasonNumber}</h2>
          
          {/* Season timer */}
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-300">
            <span>⏱️</span>
            <span>До конца сезона: <span className="text-cyan-400 font-semibold">{timeRemaining}</span></span>
          </div>
          
          {/* Prize info */}
          <div className="mt-2 text-xs text-slate-400">
            🏅 Топ-3 получат памятный трофей!
          </div>
        </div>
        
        {/* Player list - always full list with scroll */}
        <div 
          ref={containerRef} 
          className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1 relative"
          data-scrollable
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain'
          }}
        >
          {/* Loading overlay - completely opaque to hide list until ready */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-amber-300/80 text-sm">Загрузка...</span>
              </div>
            </div>
          )}
          
          {showList && players.map((player, index) => {
            const position = index + 1;
            const medal = getMedalEmoji(position);
            const isUser = player.isCurrentUser;
            
            // Calculate offset for current user
            // 'ready' = at old position (offset applied)
            // 'moving'/'complete' = at new position
            const shouldOffsetUser = isUser && hasPositionImproved && animationPhase === 'ready';
            const isUserMoving = isUser && animationPhase === 'moving';
            const transitionDuration = Math.min(500 + positionChange * 80, 1200);
            
            // DISABLED: Elements between positions - let's see if this fixes the issue
            const isBetweenPositions = false; // !isUser && hasPositionImproved && position > newPosition && position <= oldPosition;
            const shouldOffsetOther = false; // isBetweenPositions && animationPhase === 'ready';
            const isOtherMoving = false; // isBetweenPositions && animationPhase === 'moving';
            
            // Calculate margin offset - ONLY for user (using margin instead of transform)
            const startOffset = shouldOffsetUser ? initialOffset : 0;
            
            return (
              <div
                key={player.id}
                ref={isUser ? playerRowRef : null}
                data-player-row
                className={getPositionStyle(isUser, position)}
                style={{
                  // Don't apply fadeInSlide animation for user
                  animation: isUser ? 'none' : `fadeInSlide 0.15s ease-out ${Math.min(index * 0.015, 0.2)}s both`,
                  // Overlay move for current user so другие не двигаются
                  transform: isUser && shouldOffsetUser ? `translateY(${startOffset}px)` : undefined,
                  willChange: isUser ? 'transform' : undefined,
                  // No transitions - WAAPI will handle animation
                  transition: 'none',
                  // Keep player above others during animation
                  zIndex: isUser ? 10 : undefined,
                  position: isUser ? 'relative' : undefined
                }}
              >
                {/* Position */}
                <div className="w-7 text-center flex-shrink-0">
                  {medal ? (
                    <span className="text-base">{medal}</span>
                  ) : (
                    <span className={`font-mono text-xs ${isUser ? 'text-yellow-300 font-bold' : 'text-slate-400'}`}>
                      {position}
                    </span>
                  )}
                </div>
                
                {/* Avatar */}
                <div className={`text-lg w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${isUser ? 'bg-yellow-500/30' : 'bg-slate-700/50'}`}>
                  {player.avatar}
                </div>
                
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${isUser ? 'text-yellow-300' : 'text-white'}`}>
                    {player.name}
                    {isUser && <span className="ml-1 text-[10px] bg-yellow-500/30 px-1.5 py-0.5 rounded-full">Вы</span>}
                  </div>
                  {/* Show position change on user's row */}
                  {isUser && hasPositionImproved && (animationPhase === 'moving' || animationPhase === 'complete') && (
                    <div className="text-[10px] text-green-400 font-semibold">
                      ⬆️ +{positionChange} {positionChange === 1 ? 'позиция' : positionChange < 5 ? 'позиции' : 'позиций'}
                    </div>
                  )}
                </div>
                
                {/* Stars */}
                <div className={`flex items-center gap-1 text-sm font-bold flex-shrink-0 ${isUser ? 'text-yellow-300' : 'text-yellow-400'}`}>
                  <span>⭐</span>
                  <span>{player.stars}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition-all active:scale-95"
        >
          Отлично!
        </button>
      </div>
      
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInSlide {
          from { 
            opacity: 0; 
            transform: translateX(-20px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
