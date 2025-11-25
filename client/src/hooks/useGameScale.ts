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

      // Reserved spaces (in pixels)
      const AD_SPACE = 60;          // Bottom ad space for banner
      const PROGRESS_BAR = 70;      // Progress bar at top
      const CONTROLS = 25;          // Room info + game controls
      const PADDING = 10;           // Padding and spacing
      
      const reservedHeight = AD_SPACE + PROGRESS_BAR + CONTROLS + PADDING;
      const availableHeight = containerHeight - reservedHeight;

      // Base game dimensions (at scale 1)
      // 7 columns × 80px (card width w-20) + 6 gaps × 4px (gap-1) = 560 + 24 = 584px
      // But we also need to account for actual game board width with proper margins
      const BASE_WIDTH = 600;   // Slightly larger to better fill screen
      
      // Height calculation:
      // - Top row (Stock/Waste/Foundations): 112px (card height h-28) + 12px gap = 124px
      // - Tableau: Optimize for typical case (not absolute maximum)
      //   - First card: 112px (full card)
      //   - Remaining cards: Assume typical 10 cards max visible
      const isMobile = containerWidth <= 768;
      const CARD_HEIGHT = 112;
      const CARD_VERTICAL_OFFSET = isMobile ? 52 : 48;  // Mobile uses 52px, desktop 48px
      const TYPICAL_MAX_CARDS = 10;     // Reduced from 13 to better fit screens
      const TOP_ROW_HEIGHT = CARD_HEIGHT + 12; // Top row + gap = 124px
      const TABLEAU_HEIGHT = CARD_HEIGHT + ((TYPICAL_MAX_CARDS - 1) * CARD_VERTICAL_OFFSET);
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

