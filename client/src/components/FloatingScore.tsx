import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface FloatingScoreProps {
  score: number;
  x: number;
  y: number;
  onComplete: () => void;
  isPremium?: boolean;
  breakdown?: {
    cardRank: string;
    points: number;
  };
}

export function FloatingScore({ score, x, y, onComplete, isPremium = false, breakdown }: FloatingScoreProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // console.log(`🎯 FloatingScore: Component mounted with score ${score} at (${x}, ${y})`);
    setMounted(true);
    
    const timer = setTimeout(() => {
      // console.log(`🎯 FloatingScore: Hiding score ${score} after 2090ms`);
      setIsVisible(false);
      setTimeout(() => {
        // console.log(`🎯 FloatingScore: Calling onComplete for score ${score}`);
        onComplete();
      }, 100); // Allow fade out to complete
    }, 2090); // Match the animation duration (2.09s)

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

  // console.log(`🎯 FloatingScore: Rendering score ${score} at (${x}, ${y})`);

  // Simple test - render text directly
  // const testText = `+${score} POINTS`;
  // console.log(`🎯 FloatingScore: Test text: "${testText}"`);

  return createPortal(
    <div
      className="fixed pointer-events-none animate-float-up"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translateX(-50%)',
        willChange: 'transform, opacity',
        isolation: 'isolate',
        position: 'fixed',
        zIndex: 10000, // Very high z-index to be above everything
      }}
    >
      <div 
        style={{
          color: isPremium ? 'rgb(59, 130, 246)' : '#f8fafc', // Blue for premium, white for normal
          fontSize: isPremium ? '1.75rem' : '1.25rem', // Larger for premium
          fontWeight: 'bold',
          textShadow: '0.5px 0 0 #000000, -0.5px 0 0 #000000, 0 0.5px 0 #000000, 0 -0.5px 0 #000000', // Ultra-thin pure black outline
          transform: 'translate3d(0,0,0)',
          backfaceVisibility: 'hidden',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1',
        }}
      >
        +{(score ?? 0).toLocaleString()}
      </div>
    </div>,
    document.body
  );
}

// Add CSS animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float-up {
    0% {
      transform: translateX(-50%) translateY(0) scale(0.1);
      opacity: 1;
    }
    4.78% {
      transform: translateX(-50%) translateY(-2.87px) scale(1);
      opacity: 1;
    }
    100% {
      transform: translateX(-50%) translateY(-60px) scale(1);
      opacity: 0;
    }
  }
  
  .animate-float-up {
    animation: float-up 2.09s ease-out forwards;
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
