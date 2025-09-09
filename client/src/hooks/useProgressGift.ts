import { useEffect, useRef, useCallback } from 'react';
import { RoomType, getPointsMultiplier } from '../lib/roomUtils';

// Import external library with any type (no TypeScript definitions available)
// @ts-ignore - no type definitions available
import * as ProgressGiftLib from '@gleb.askerko/componentkit-js';

export function useProgressGift(onGiftEarned: (gifts: number) => void, roomType: RoomType = 'standard') {
  const progressGiftRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Memoize the callback to prevent unnecessary re-renders
  const memoizedOnGiftEarned = useCallback(onGiftEarned, []);

  useEffect(() => {
    const initProgressGift = () => {
      if (ProgressGiftLib?.ProgressGift && containerRef.current) {
        try {
          // Calculate max points based on room multiplier
          // Base game has 1512 points total, so we use that as baseline
          const baseMaxPoints = 1500;
          const multiplier = getPointsMultiplier(roomType);
          const maxPoints = baseMaxPoints * multiplier;
          
          // Create new ProgressGift instance
          progressGiftRef.current = new ProgressGiftLib.ProgressGift({
            maxPoints: maxPoints,
            onGiftEarned: memoizedOnGiftEarned
          } as any);
          
          // Clear container and render
          containerRef.current.innerHTML = '';
          progressGiftRef.current.render(containerRef.current);
          
          console.log('✅ ProgressGift component initialized');
        } catch (error) {
          console.error('❌ Failed to initialize ProgressGift:', error);
        }
      } else {
        // Retry after a short delay if library not ready
        setTimeout(initProgressGift, 100);
      }
    };

    initProgressGift();

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      progressGiftRef.current = null;
    };
  }, [memoizedOnGiftEarned, roomType]); // Re-create when callback or room type changes

  const addPoints = (points: number) => {
    if (progressGiftRef.current) {
      try {
        progressGiftRef.current.addPoints(points);
        console.log(`🎁 Added ${points} points to ProgressGift`);
      } catch (error) {
        console.error('❌ Failed to add points:', error);
      }
    } else {
      console.warn('⚠️ ProgressGift not initialized yet');
    }
  };

  const getTotalGifts = (): number => {
    if (progressGiftRef.current) {
      try {
        return progressGiftRef.current.getTotalGifts();
      } catch (error) {
        console.error('❌ Failed to get total gifts:', error);
      }
    }
    return 0;
  };

  const reinitialize = () => {
    if (progressGiftRef.current) {
      try {
        progressGiftRef.current.reinitialize();
        console.log('🔄 ProgressGift reinitialized');
      } catch (error) {
        console.error('❌ Failed to reinitialize ProgressGift:', error);
      }
    } else {
      console.warn('⚠️ ProgressGift not initialized yet, cannot reinitialize');
    }
  };

  return {
    containerRef,
    addPoints,
    getTotalGifts,
    reinitialize
  };
}
