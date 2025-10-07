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
      const AD_SPACE = 0;           // Bottom ad space (removed)
      const PROGRESS_BAR = 95;      // Progress bar at top (with animations space)
      const CONTROLS = 30;          // Room info + game controls
      const PADDING = 15;           // Padding and spacing
      
      const reservedHeight = AD_SPACE + PROGRESS_BAR + CONTROLS + PADDING;
      const availableHeight = containerHeight - reservedHeight;

      // Base game dimensions (at scale 1)
      // 7 columns × 64px (card width) + 6 gaps × 8px = 496px width
      const BASE_WIDTH = 496 + 100;   // Add padding for centering
      
      // Height calculation:
      // - Top row (Stock/Waste/Foundations): 96px (card height) + 12px gap
      // - Tableau: Maximum 18 cards stacked
      //   - First card: 96px (full card)
      //   - Remaining 17 cards: 17 × 18px = 306px (18px vertical offset per card)
      //   Total: 96 + 306 = 402px
      const CARD_HEIGHT = 96;
      const CARD_VERTICAL_OFFSET = 18;  // Space between stacked cards (matches TableauColumn)
      const MAX_TABLEAU_CARDS = 18;     // Maximum: 6 initial + 12 cards (K to 2)
      const TOP_ROW_HEIGHT = CARD_HEIGHT + 12; // Top row + gap
      const TABLEAU_HEIGHT = CARD_HEIGHT + ((MAX_TABLEAU_CARDS - 1) * CARD_VERTICAL_OFFSET);
      const BASE_HEIGHT = TOP_ROW_HEIGHT + TABLEAU_HEIGHT; // ~510px total

      // Calculate scale to fit
      const scaleX = containerWidth / BASE_WIDTH;
      const scaleY = availableHeight / BASE_HEIGHT;
      
      // Use the smaller scale to ensure everything fits
      // Min scale 0.5, max scale 1.5 for reasonable limits
      const scale = Math.max(0.5, Math.min(1.5, Math.min(scaleX, scaleY)));

      setDimensions({
        scale,
        containerWidth,
        containerHeight,
        availableHeight
      });

      console.log('🎮 Game Scale:', {
        containerSize: `${containerWidth}x${containerHeight}`,
        availableHeight,
        scale: scale.toFixed(2)
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

