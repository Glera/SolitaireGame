import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface StreakPopupProps {
  isVisible: boolean;
  streakDay: number; // 2-10
  onContinue: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

export function StreakPopup({ isVisible, streakDay, onContinue }: StreakPopupProps) {
  const [showNumber, setShowNumber] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [numberScale, setNumberScale] = useState(0);
  const numberRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!isVisible) {
      setShowNumber(false);
      setParticles([]);
      setNumberScale(0);
      return;
    }
    
    // Sequence: wait -> show number with explosion
    const timer1 = setTimeout(() => {
      setShowNumber(true);
      setNumberScale(2.5); // Start big
      
      // Create explosion particles
      if (numberRef.current) {
        const rect = numberRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        createParticles(centerX, centerY);
      } else {
        createParticles(window.innerWidth / 2, window.innerHeight / 2 - 50);
      }
      
      // Scale down to normal
      setTimeout(() => setNumberScale(1), 100);
    }, 400);
    
    return () => {
      clearTimeout(timer1);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible]);
  
  const createParticles = (x: number, y: number) => {
    const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#fef3c7', '#ff6b6b', '#4ecdc4', '#45b7d1'];
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.5;
      const speed = 3 + Math.random() * 5;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1
      });
    }
    
    setParticles(newParticles);
    animateParticles();
  };
  
  const animateParticles = () => {
    const animate = () => {
      setParticles(prev => {
        const updated = prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // gravity
            life: p.life - 0.02
          }))
          .filter(p => p.life > 0);
        
        if (updated.length > 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
        return updated;
      });
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  
  if (!isVisible) return null;
  
  // Streak messages based on day
  const getStreakMessage = () => {
    if (streakDay >= 10) return '🔥 Невероятно! Ты в огне!';
    if (streakDay >= 7) return '🌟 Целая неделя! Потрясающе!';
    if (streakDay >= 5) return '💪 Отличная серия!';
    if (streakDay >= 3) return '👏 Так держать!';
    return '🎉 Отлично! Продолжай!';
  };
  
  return (
    <>
      <div 
        className="fixed inset-0 z-[9998] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
      >
        <div className="bg-gradient-to-b from-orange-900/90 to-slate-900 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl border border-orange-500/50 animate-streak-appear">
          {/* Title */}
          <div className="text-center mb-4 mt-2">
            <h2 className="text-xl font-bold text-orange-200">Серия входов!</h2>
            <p className="text-orange-300/80 text-sm mt-1">
              Ты заходишь в игру каждый день
            </p>
          </div>
          
          {/* Streak number */}
          <div className="text-center mb-4">
            <div 
              ref={numberRef}
              className="inline-block relative"
            >
              {showNumber && (
                <div 
                  className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-400 to-red-500 transition-transform duration-300 ease-out"
                  style={{ 
                    transform: `scale(${numberScale})`,
                    textShadow: '0 0 30px rgba(251, 191, 36, 0.5)'
                  }}
                >
                  {streakDay}
                </div>
              )}
              {!showNumber && (
                <div className="text-7xl font-black text-orange-900/50">
                  ?
                </div>
              )}
            </div>
            <p className="text-orange-200 text-lg mt-2">
              {streakDay === 1 ? 'день' : streakDay < 5 ? 'дня' : 'дней'} подряд
            </p>
          </div>
          
          {/* Message */}
          <div className="text-center mb-5">
            <p className="text-xl font-semibold text-white">
              {getStreakMessage()}
            </p>
          </div>
          
          {/* Continue button */}
          <button
            onClick={onContinue}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95"
          >
            Получить награду →
          </button>
        </div>
      </div>
      
      {/* Particles */}
      {particles.map(particle => (
        ReactDOM.createPortal(
          <div
            key={particle.id}
            className="fixed pointer-events-none z-[10000] rounded-full"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: particle.life,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 ${particle.size}px ${particle.color}`
            }}
          />,
          document.body
        )
      ))}
    </>
  );
}

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes streak-appear {
    0% { 
      opacity: 0; 
      transform: scale(0.5) rotate(-5deg); 
    }
    50% { 
      transform: scale(1.05) rotate(2deg); 
    }
    100% { 
      opacity: 1; 
      transform: scale(1) rotate(0deg); 
    }
  }
  
  .animate-streak-appear {
    animation: streak-appear 0.5s ease-out;
  }
  
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  .animate-bounce-slow {
    animation: bounce-slow 1s ease-in-out infinite;
  }
`;

if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}

