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
    // console.log(`🎯 FloatingScore: Component mounted with score ${score} at (${x}, ${y})`);
    setMounted(true);
    
    const timer = setTimeout(() => {
      // console.log(`🎯 FloatingScore: Hiding score ${score} after 1900ms`);
      setIsVisible(false);
      setTimeout(() => {
        // console.log(`🎯 FloatingScore: Calling onComplete for score ${score}`);
        onComplete();
      }, 100); // Allow fade out to complete
    }, 1900);

    return () => {
      // console.log(`🎯 FloatingScore: Cleanup for score ${score}`);
      clearTimeout(timer);
    };
  }, []); // Empty dependency array to prevent re-creation

  if (!mounted) {
    // console.log(`🎯 FloatingScore: Not mounted yet for score ${score}`);
    return null;
  }

  if (!isVisible || score == null || score === undefined) {
    // console.log(`🎯 FloatingScore: Not rendering - isVisible: ${isVisible}, score: ${score}, mounted: ${mounted}`);
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
        backgroundColor: 'rgba(255, 0, 0, 0.3)', // Temporary red background for debugging
        border: '2px solid red', // Temporary red border for debugging
        padding: '10px',
      }}
    >
      <div 
        style={{
          color: '#22d3ee', // cyan-300 color
          fontSize: '3rem',
          fontWeight: 'bold',
          textShadow: '0 0 5px #22d3ee, 0 0 10px #22d3ee, 0 0 15px #22d3ee, 0 0 20px #22d3ee',
          transform: 'translate3d(0,0,0)',
          backfaceVisibility: 'hidden',
          whiteSpace: 'nowrap',
          zIndex: 1000,
        }}
      >
        +{(score ?? 0).toLocaleString()}
      </div>
      {breakdown && (
        <div 
          style={{
            color: '#a5f3fc', // cyan-200 color
            fontSize: '0.875rem',
            fontWeight: '500',
            textShadow: '0 0 3px #a5f3fc, 0 0 6px #a5f3fc',
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
            marginTop: '2px',
            whiteSpace: 'nowrap',
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
