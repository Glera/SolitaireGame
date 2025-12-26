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

const ROW_HEIGHT = 48; // Height of each player row (p-2 = 8px*2 + content ~32px) + gap (space-y-1 = 4px)

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
  const initialOffset = hasPositionImproved ? positionChange * ROW_HEIGHT : 0;
  
  const [showList, setShowList] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [animationPhase, setAnimationPhase] = useState<'waiting' | 'ready' | 'moving' | 'complete'>('waiting');
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRowRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  
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
      setAnimationPhase('waiting');
      setShowList(false);
      hasStartedRef.current = false;
    }
  }, [isVisible]);
  
  // Calculate scroll position to center a player
  const getScrollForPosition = (position: number, container: HTMLDivElement) => {
    const containerHeight = container.clientHeight;
    const playerTop = (position - 1) * ROW_HEIGHT;
    // Center the player in the container, with slight upward bias (-20px) for better visual
    const targetScroll = playerTop - (containerHeight / 2) + (ROW_HEIGHT / 2) - 20;
    const maxScroll = Math.max(0, container.scrollHeight - containerHeight);
    return Math.max(0, Math.min(targetScroll, maxScroll));
  };
  
  // Animate scroll with exact duration to sync with CSS transition
  const animateScroll = (container: HTMLDivElement, from: number, to: number, duration: number) => {
    const startTime = performance.now();
    
    // Ease-out function matching CSS ease-out
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      
      const currentScroll = from + (to - from) * easedProgress;
      container.scrollTop = currentScroll;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  };
  
  // Handle animation sequence with CSS transitions
  useEffect(() => {
    // DEBUG - always log
    console.log('=== LEADERBOARD useEffect ===');
    console.log('isVisible:', isVisible, 'hasStartedRef:', hasStartedRef.current);
    console.log('oldPosition:', oldPosition, 'newPosition:', newPosition);
    console.log('positionChange:', positionChange, 'hasPositionImproved:', hasPositionImproved);
    console.log('initialOffset:', initialOffset);
    
    if (!isVisible || hasStartedRef.current) {
      console.log('SKIPPING - isVisible:', isVisible, 'hasStarted:', hasStartedRef.current);
      return;
    }
    
    hasStartedRef.current = true;
    console.log('=== STARTING ANIMATION ===');
    
    // Phase 1: Show list with player at OLD position (via translateY)
    setShowList(true);
    setAnimationPhase('waiting');
    
    // Phase 2: After render, scroll to OLD visual position and mark ready
    setTimeout(() => {
      console.log('Phase 2: scrolling to OLD position, setting ready');
      
      const container = containerRef.current;
      if (container && hasPositionImproved) {
        // Scroll to show the OLD position (where player visually appears with translateY offset)
        const oldPositionScroll = getScrollForPosition(oldPosition, container);
        console.log('Scrolling to old position:', oldPosition, 'scroll:', oldPositionScroll);
        container.scrollTop = oldPositionScroll; // Instant scroll to old position
      } else {
        playerRowRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
      
      setAnimationPhase('ready'); // Player visible at old position
      
      // Phase 3: Start CSS transition to move player up
      if (hasPositionImproved) {
        const transitionDuration = Math.min(600 + positionChange * 100, 1500);
        console.log(`Will start movement in 800ms. Transition duration: ${transitionDuration}ms`);
        
        setTimeout(() => {
          console.log('Phase 3: starting movement animation');
          setAnimationPhase('moving'); // CSS transition kicks in, translateY -> 0
          
          // Animate scroll in sync with CSS transition (same duration & easing)
          const container = containerRef.current;
          if (container) {
            const fromScroll = container.scrollTop;
            const toScroll = getScrollForPosition(newPosition, container);
            console.log('Animating scroll from', fromScroll, 'to', toScroll, 'duration:', transitionDuration);
            animateScroll(container, fromScroll, toScroll, transitionDuration);
          }
          
          // Phase 4: Mark complete after transition
          setTimeout(() => {
            console.log('Phase 4: animation complete');
            setAnimationPhase('complete');
          }, transitionDuration);
        }, 800); // Pause to show old position
      } else {
        console.log('No position improvement, skipping animation');
        setAnimationPhase('complete');
      }
    }, 150);
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
      if (animationPhase === 'complete' && hasPositionImproved) {
        baseStyle += ' animate-pulse';
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-5 mx-4 max-w-md w-full shadow-2xl border border-slate-600/50 max-h-[80vh] flex flex-col"
        style={{
          animation: 'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        }}
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
          className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1"
        >
          {showList && players.map((player, index) => {
            const position = index + 1;
            const medal = getMedalEmoji(position);
            const isUser = player.isCurrentUser;
            
            // Calculate offset for current user
            // waiting/ready = at old position (offset applied)
            // moving/complete = at new position (no offset, with transition)
            const shouldOffset = isUser && hasPositionImproved && (animationPhase === 'waiting' || animationPhase === 'ready');
            const isMoving = isUser && animationPhase === 'moving';
            const transitionDuration = Math.min(600 + positionChange * 100, 1500);
            
            return (
              <div
                key={player.id}
                ref={isUser ? playerRowRef : null}
                className={getPositionStyle(isUser, position)}
                style={{
                  // Don't apply fadeInSlide animation to current user - it conflicts with translateY!
                  animation: isUser ? undefined : `fadeInSlide 0.15s ease-out ${Math.min(index * 0.015, 0.2)}s both`,
                  // Offset player to OLD position, then animate to 0
                  transform: shouldOffset ? `translateY(${initialOffset}px)` : 'translateY(0)',
                  // CSS transition for smooth movement - cubic-bezier matches JS easeOut
                  transition: isMoving ? `transform ${transitionDuration}ms cubic-bezier(0.33, 1, 0.68, 1)` : undefined,
                  // Keep player above others during animation
                  zIndex: isUser && (shouldOffset || isMoving) ? 10 : undefined,
                  position: isUser ? 'relative' : undefined,
                  // Glow during movement
                  boxShadow: isMoving ? '0 0 20px rgba(234, 179, 8, 0.5)' : undefined
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
