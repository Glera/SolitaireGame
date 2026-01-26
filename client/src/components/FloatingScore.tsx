import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface FloatingScoreProps {
  score: number;
  x: number;
  y: number;
  onComplete: () => void;
  breakdown?: {
    cardRank: string;
    points: number;
  };
}

export function FloatingScore({ score, x, y, onComplete, breakdown }: FloatingScoreProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Random offset to prevent scores from stacking in a line during fast auto-collect
  const [randomOffset] = useState(() => ({
    x: (Math.random() - 0.5) * 40, // -20 to +20 px
    y: (Math.random() - 0.5) * 20  // -10 to +10 px
  }));

  useEffect(() => {
    setMounted(true);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 100);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Check if this is an "empty" chest
  const isEmpty = breakdown?.cardRank === 'empty';

  if (!mounted || !isVisible || (score == null && !isEmpty)) {
    return null;
  }

  return createPortal(
    <div
      className="fixed pointer-events-none animate-float-up-delayed"
      style={{
        left: `${x + randomOffset.x}px`,
        top: `${y + randomOffset.y}px`,
        transform: 'translateX(-50%)',
        willChange: 'transform, opacity',
        isolation: 'isolate',
        position: 'fixed',
        zIndex: 10000,
      }}
    >
      <div 
        style={{
          color: isEmpty ? '#9ca3af' : '#fb923c', // Gray for empty, orange for score
          fontSize: isEmpty ? '1rem' : '1.15rem', // Smaller text
          fontWeight: 900,
          textShadow: isEmpty 
            ? '1px 0 0 #4b5563, -1px 0 0 #4b5563, 0 1px 0 #4b5563, 0 -1px 0 #4b5563'
            : '1px 0 0 #9a3412, -1px 0 0 #9a3412, 0 1px 0 #9a3412, 0 -1px 0 #9a3412, 0 2px 4px rgba(0,0,0,0.3)', // Dark orange outline
          transform: 'translate3d(0,0,0)',
          backfaceVisibility: 'hidden',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          lineHeight: '1',
        }}
      >
        {isEmpty ? 'Пусто' : `+${(score ?? 0).toLocaleString()}`}
      </div>
    </div>,
    document.body
  );
}

// Add CSS animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float-up-delayed {
    0% {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    25% {
      transform: translateX(-50%) translateY(-10px);
      opacity: 1;
    }
    100% {
      transform: translateX(-50%) translateY(-50px);
      opacity: 0;
    }
  }
  
  .animate-float-up-delayed {
    animation: float-up-delayed 1.5s ease-out forwards;
  }
  
  .text-shadow-glow {
    text-shadow: 
      0 0 5px currentColor,
      0 0 10px currentColor,
      0 0 15px currentColor,
      0 0 20px currentColor;
  }
`;

if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}
