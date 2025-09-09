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

  useEffect(() => {
    console.log(`🎯 FloatingScore: Component mounted with score ${score} at (${x}, ${y})`);
    setMounted(true);
    
    const timer = setTimeout(() => {
      console.log(`🎯 FloatingScore: Hiding score ${score} after 1900ms`);
      setIsVisible(false);
      setTimeout(() => {
        console.log(`🎯 FloatingScore: Calling onComplete for score ${score}`);
        onComplete();
      }, 100); // Allow fade out to complete
    }, 1900);

    return () => {
      console.log(`🎯 FloatingScore: Cleanup for score ${score}`);
      clearTimeout(timer);
    };
  }, []); // Empty dependency array to prevent re-creation

  if (!mounted) {
    console.log(`🎯 FloatingScore: Not mounted yet for score ${score}`);
    return null;
  }

  if (!isVisible || score == null || score === undefined) {
    console.log(`🎯 FloatingScore: Not rendering - isVisible: ${isVisible}, score: ${score}, mounted: ${mounted}`);
    return null;
  }

  console.log(`🎯 FloatingScore: Rendering score ${score} at (${x}, ${y})`);

  return createPortal(
    <div
      className="fixed pointer-events-none z-50 animate-float-up"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translateX(-50%)',
        willChange: 'transform, opacity',
        isolation: 'isolate',
        contain: 'size layout style paint', // Full containment
        position: 'fixed', // Ensure it's truly out of document flow
      }}
    >
      <div 
        className="text-cyan-300 text-5xl font-bold text-shadow-glow"
        style={{
          transform: 'translate3d(0,0,0)', // GPU layer
          backfaceVisibility: 'hidden',
          fontSize: '3rem',
          fontWeight: 'bold',
        }}
      >
        +{(score ?? 0).toLocaleString()}
      </div>
      {breakdown && (
        <div 
          className="text-cyan-200 text-sm font-medium text-shadow-glow"
          style={{
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
            marginTop: '2px',
          }}
        >
          {breakdown.cardRank}
        </div>
      )}
    </div>,
    document.body
  );
}

// Add CSS animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float-up {
    0% {
      transform: translateX(-50%) translateY(0px) translateZ(0) scale(1);
      opacity: 1;
    }
    50% {
      transform: translateX(-50%) translateY(-40px) translateZ(0) scale(1.2);
      opacity: 1;
    }
    100% {
      transform: translateX(-50%) translateY(-120px) translateZ(0) scale(0.8);
      opacity: 0;
    }
  }
  
  .animate-float-up {
    animation: float-up 2s ease-out forwards;
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
