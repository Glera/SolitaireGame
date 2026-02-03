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
      const AD_SPACE = 70;          // Bottom ad space for banner
      const PROGRESS_BAR = 85;      // Progress bar container + margins
      const EVENTS_ROW = 55;        // Top events row (icons + margins)
      const BOTTOM_BUTTONS = 100;   // Bottom control buttons with margins
      const PADDING = 50;           // Padding and spacing between elements
      
      // Detect wide desktop screens (like Telegram Desktop WebView)
      // These have aspect ratio > 0.55 (width/height) and width > 400
      const aspectRatio = containerWidth / containerHeight;
      const isWideDesktop = containerWidth > 400 && aspectRatio > 0.55 && aspectRatio < 0.85;
      
      // On wide desktop, UI takes less relative space
      const reservedHeight = isWideDesktop 
        ? AD_SPACE + 60 + 40 + 60 + 20  // 250px total for desktop
        : AD_SPACE + PROGRESS_BAR + EVENTS_ROW + BOTTOM_BUTTONS + PADDING; // 360px for mobile
      const availableHeight = containerHeight - reservedHeight;

      // Base game dimensions (at scale 1)
      // 7 columns × 80px (card width w-20) + 6 gaps × 4px (gap-1) = 560 + 24 = 584px
      // Side panels removed - events now inline above cards
      // 3px padding on each side
      const BASE_WIDTH = 590;   // Game field (584px) + padding (6px)
      
      // Height calculation:
      // - Top row (Stock/Waste/Foundations): 104px (card height h-26) + 12px gap = 116px
      // - Tableau: Account for maximum possible stack
      //   - First card: 104px (full card)
      //   - Maximum stack: 19 cards (6 face-down + 13 face-up), but compressed
      //   - With reduced spacing and 65% compression for worst case
      const isMobile = containerWidth <= 768;
      const CARD_HEIGHT = 104;
      // Minimum readable offset at 65% compression (must match stackCompression.ts)
      // Mobile: 36px * 0.65 = 23px, Desktop: 33px * 0.65 = 21px
      const MIN_FACE_UP_OFFSET = isMobile ? 23 : 21;
      const MIN_FACE_DOWN_OFFSET = isMobile ? 6 : 5;  // 10px/8px * 0.65
      const MAX_FACE_DOWN = 6;  // Maximum face-down cards in a column
      // On wide desktop, assume average stack size (not worst case) for better card size
      const MAX_FACE_UP = isWideDesktop ? 10 : 13;
      const TOP_ROW_HEIGHT = CARD_HEIGHT + 12; // Top row + gap = 124px
      const TABLEAU_HEIGHT = CARD_HEIGHT + 
        (MAX_FACE_DOWN * MIN_FACE_DOWN_OFFSET) + 
        ((MAX_FACE_UP - 1) * MIN_FACE_UP_OFFSET);
      const BASE_HEIGHT = TOP_ROW_HEIGHT + TABLEAU_HEIGHT;

      // Calculate scale to fit
      const scaleX = containerWidth / BASE_WIDTH;
      const scaleY = availableHeight / BASE_HEIGHT;
      
      // Always use the smaller scale to ensure everything fits
      // This prevents cards from overlapping with bottom buttons
      const scale = Math.max(0.5, Math.min(scaleX, scaleY));

      setDimensions({
        scale,
        containerWidth,
        containerHeight,
        availableHeight
      });

      console.log('🎮 Game Scale:', {
        containerSize: `${containerWidth}x${containerHeight}`,
        aspectRatio: aspectRatio.toFixed(2),
        isWideDesktop,
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

