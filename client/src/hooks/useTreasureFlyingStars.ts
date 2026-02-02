/**
 * useTreasureFlyingStars Hook
 * 
 * Управляет анимацией летящих звёзд от сундуков Treasure Hunt к прогресс-бару.
 * Звёзды разлетаются от исходной точки, затем летят к цели по параболе.
 */

import { useState, useCallback, RefObject } from 'react';

export interface TreasureFlyingStar {
  id: number;
  value: number;
  startX: number;
  startY: number;
  scatterX: number;
  scatterY: number;
  targetX: number;
  targetY: number;
  controlX: number;
  controlY: number;
  scatterDuration: number;
  flyDelay: number;
  flyDuration: number;
}

interface UseTreasureFlyingStarsOptions {
  progressBarRef: RefObject<HTMLDivElement | null>;
  onStarArrived: (value: number) => void;
  onPulse: () => void;
}

export interface TreasureFlyingStarsState {
  treasureFlyingStars: TreasureFlyingStar[];
  launchTreasureStars: (totalStars: number, startPos: { x: number; y: number }) => void;
  handleTreasureStarArrived: (star: TreasureFlyingStar) => void;
}

export function useTreasureFlyingStars({
  progressBarRef,
  onStarArrived,
  onPulse,
}: UseTreasureFlyingStarsOptions): TreasureFlyingStarsState {
  const [treasureFlyingStars, setTreasureFlyingStars] = useState<TreasureFlyingStar[]>([]);

  // Launch flying stars from chest position to progress bar
  const launchTreasureStars = useCallback((totalStars: number, startPos: { x: number; y: number }) => {
    // Generate unique base ID for this batch
    const batchId = Date.now();
    
    // Get target position - find the star icon in progress bar
    let targetX = window.innerWidth / 2;
    let targetY = 50;
    
    if (progressBarRef?.current) {
      const starIcon = progressBarRef.current.querySelector('[data-star-icon]');
      if (starIcon) {
        const rect = starIcon.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      } else {
        const rect = progressBarRef.current.getBoundingClientRect();
        targetX = rect.left + 20;
        targetY = rect.top + 16;
      }
    }
    
    const centerX = startPos.x;
    const centerY = startPos.y;
    
    const stars: TreasureFlyingStar[] = [];
    const MAX_FLYING_ICONS = 8;
    const iconCount = Math.min(totalStars, MAX_FLYING_ICONS);
    const starsPerIcon = Math.ceil(totalStars / iconCount);
    let remainingStars = totalStars;
    
    const minRadius = 15;
    const maxRadius = 40;
    const scatterDuration = 400;
    
    for (let i = 0; i < iconCount; i++) {
      const value = i === iconCount - 1 ? remainingStars : starsPerIcon;
      remainingStars -= value;
      
      const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const scatterX = centerX + Math.cos(angle) * radius;
      const scatterY = centerY + Math.sin(angle) * radius;
      
      const midX = (scatterX + targetX) / 2;
      const midY = (scatterY + targetY) / 2;
      
      const dx = targetX - scatterX;
      const dy = targetY - scatterY;
      const perpX = -dy;
      const perpY = dx;
      const len = Math.sqrt(perpX * perpX + perpY * perpY);
      
      const curvature = (Math.random() - 0.5) * 150;
      const controlX = midX + (perpX / len) * curvature;
      const controlY = midY + (perpY / len) * curvature;
      
      const flyDuration = 350 + Math.random() * 150;
      const flyDelay = i * 60;
      
      stars.push({
        id: batchId * 1000 + Math.random() * 1000 + i,
        value,
        startX: centerX,
        startY: centerY,
        scatterX,
        scatterY,
        targetX,
        targetY,
        controlX,
        controlY,
        scatterDuration,
        flyDelay,
        flyDuration
      });
    }
    
    // Append new stars to existing ones (don't replace)
    setTreasureFlyingStars(prev => [...prev, ...stars]);
  }, [progressBarRef]);

  const handleTreasureStarArrived = useCallback((star: TreasureFlyingStar) => {
    setTreasureFlyingStars(prev => prev.filter(s => s.id !== star.id));
    // Update displayed stars by the value of this flying star
    onStarArrived(star.value);
    // Pulse the progress bar
    onPulse();
  }, [onStarArrived, onPulse]);

  return {
    treasureFlyingStars,
    launchTreasureStars,
    handleTreasureStarArrived,
  };
}
