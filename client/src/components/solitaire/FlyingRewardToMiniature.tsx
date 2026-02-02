/**
 * FlyingRewardToMiniature Component
 * 
 * Анимация полёта награды от кнопки Points Event к миниатюрам в очереди.
 * Используется для визуального feedback при получении наград.
 */

import React, { useState, useRef, useEffect } from 'react';
import { MiniCardPack } from './MiniCardPack';
import { COLLECTION_PACKS, PackRarity } from '../../lib/liveops/pointsEvent';

export interface FlyingReward {
  id: number;
  type: 'stars' | 'pack';
  stars?: number;
  packRarity?: PackRarity;
  startX: number;
  startY: number;
}

export interface FlyingRewardToMiniatureProps {
  reward: FlyingReward;
  targetRef: React.RefObject<HTMLDivElement>;
  pendingIndex: number; // Index where this miniature will appear
  onComplete: () => void;
}

export function FlyingRewardToMiniature({ 
  reward, 
  targetRef,
  pendingIndex,
  onComplete 
}: FlyingRewardToMiniatureProps) {
  const [position, setPosition] = useState({ x: reward.startX, y: reward.startY });
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const animationRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  
  useEffect(() => {
    // Only run animation once per component mount
    if (hasCompletedRef.current) return;
    
    const targetRect = targetRef.current?.getBoundingClientRect();
    // Calculate target position based on container and miniature index
    // Each miniature is 36x48 + 4px gap (same size as on event button)
    const miniatureWidth = 36;
    const miniatureHeight = 48;
    const gap = 4;
    
    // Miniatures are displayed in a single row (max 4 visible)
    const col = Math.min(pendingIndex, 3); // Max index 3 (4 items)
    
    let targetX: number;
    let targetY: number;
    
    if (targetRect) {
      // Calculate position within the container for this miniature
      targetX = targetRect.left + (col * (miniatureWidth + gap)) + miniatureWidth / 2;
      targetY = targetRect.top + miniatureHeight / 2;
    } else {
      // Fallback - below the start position
      targetX = reward.startX;
      targetY = reward.startY + 80;
    }
    
    const startX = reward.startX;
    const startY = reward.startY;
    
    // Animate over 400ms
    const duration = 400;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (hasCompletedRef.current) return;
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate position
      const x = startX + (targetX - startX) * eased;
      const y = startY + (targetY - startY) * eased;
      
      // Scale down to miniature size (0.4 = 40% of original)
      const newScale = 1 - eased * 0.6;
      
      setPosition({ x, y });
      setScale(newScale);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Fade out quickly
        hasCompletedRef.current = true;
        setOpacity(0);
        setTimeout(() => onCompleteRef.current(), 100);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [reward.id]); // Only depend on reward.id - run once per unique reward
  
  const packColor = reward.type === 'pack' && reward.packRarity 
    ? COLLECTION_PACKS[reward.packRarity].color 
    : '#fbbf24';
  
  return (
    <div
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        transition: 'opacity 0.1s',
      }}
    >
      {reward.type === 'pack' && reward.packRarity ? (
        <MiniCardPack color={packColor} stars={reward.packRarity} size={48} />
      ) : (
        <span 
          className="text-3xl"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(251, 191, 36, 0.8))' }}
        >
          ⭐
        </span>
      )}
    </div>
  );
}
