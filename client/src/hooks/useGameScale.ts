import { useState, useEffect } from 'react';

interface GameDimensions {
  scale: number;
  containerWidth: number;
  containerHeight: number;
  availableHeight: number;
}

/**
 * Hook to calculate game scale based on parent frame dimensions
 * Accounts for:
 * - Parent frame size (iframe or window)
 * - Ad space at the bottom (60px)
 * - Progress bar at the top (65px)
 * - Room info and controls (~80px)
 * - Padding and spacing (~50px)
 */
export function useGameScale(): GameDimensions {
  const [dimensions, setDimensions] = useState<GameDimensions>({
    scale: 1,
    containerWidth: window.innerWidth,
    containerHeight: window.innerHeight,
    availableHeight: window.innerHeight
  });

  useEffect(() => {
    const calculateDimensions = () => {
      // Get parent frame dimensions (works for iframe and regular window)
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;

      // Reserved spaces (in pixels) - must match actual UI measurements
      const AD_SPACE = 60;          // Bottom ad space for banner
      const PROGRESS_BAR = 95;      // Progress bar container (95px in GameBoard)
      const CONTROLS = 50;          // Room info + game controls + margins
      const PADDING = 20;           // Padding and spacing between elements
      
      const reservedHeight = AD_SPACE + PROGRESS_BAR + CONTROLS + PADDING;
      const availableHeight = containerHeight - reservedHeight;

      // Base game dimensions (at scale 1)
      // 7 columns × 80px (card width w-20) + 6 gaps × 4px (gap-1) = 560 + 24 = 584px
      // Plus side panels: 80px (left events) + 80px (right promos) + 2×12px (gaps) = 768px total
      // Adding padding for mobile safety margin
      const BASE_WIDTH = 780;   // Full width including side panels
      
      // Height calculation:
      // - Top row (Stock/Waste/Foundations): 112px (card height h-28) + 12px gap = 124px
      // - Tableau: Account for maximum possible stack
      //   - First card: 112px (full card)
      //   - Maximum stack: 19 cards (6 face-down + 13 face-up), but compressed
      //   - With 50% compression: face-up offset 26px, face-down 6px
      //   - Worst case: 6*6 + 12*26 = 36 + 312 = 348px + 112 = 460px for tableau
      const isMobile = containerWidth <= 768;
      const CARD_HEIGHT = 112;
      // Minimum readable offset at 65% compression (must match stackCompression.ts)
      // Mobile: 52px * 0.65 = 34px, Desktop: 48px * 0.65 = 31px
      const MIN_FACE_UP_OFFSET = isMobile ? 34 : 31;
      const MIN_FACE_DOWN_OFFSET = 8;  // 12px * 0.65 ≈ 8px
      const MAX_FACE_DOWN = 6;  // Maximum face-down cards in a column
      const MAX_FACE_UP = 13;   // Maximum face-up cards (full suit)
      const TOP_ROW_HEIGHT = CARD_HEIGHT + 12; // Top row + gap = 124px
      const TABLEAU_HEIGHT = CARD_HEIGHT + 
        (MAX_FACE_DOWN * MIN_FACE_DOWN_OFFSET) + 
        ((MAX_FACE_UP - 1) * MIN_FACE_UP_OFFSET);
      const BASE_HEIGHT = TOP_ROW_HEIGHT + TABLEAU_HEIGHT;

      // Calculate scale to fit
      const scaleX = containerWidth / BASE_WIDTH;
      const scaleY = availableHeight / BASE_HEIGHT;
      
      // Use the smaller scale to ensure everything fits
      // Removed max scale limit to allow better screen utilization
      const scale = Math.max(0.5, Math.min(scaleX, scaleY));

      setDimensions({
        scale,
        containerWidth,
        containerHeight,
        availableHeight
      });

      console.log('🎮 Game Scale:', {
        containerSize: `${containerWidth}x${containerHeight}`,
        availableHeight,
        baseSize: `${BASE_WIDTH}x${BASE_HEIGHT}`,
        scaleX: scaleX.toFixed(2),
        scaleY: scaleY.toFixed(2),
        finalScale: scale.toFixed(2),
        gameSize: `${Math.round(BASE_WIDTH * scale)}x${Math.round(BASE_HEIGHT * scale)}`
      });
    };

    // Calculate on mount
    calculateDimensions();

    // Recalculate on window resize
    window.addEventListener('resize', calculateDimensions);

    // Also listen for messages from parent frame (if in iframe)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RESIZE') {
        calculateDimensions();
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('resize', calculateDimensions);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return dimensions;
}

