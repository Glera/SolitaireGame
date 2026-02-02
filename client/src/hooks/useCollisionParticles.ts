/**
 * useCollisionParticles Hook
 * 
 * Управляет анимацией частиц при столкновении/прибытии иконок.
 * Создаёт эффект "взрыва" частиц, разлетающихся в разные стороны.
 */

import { useState, useCallback } from 'react';

export interface CollisionParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

const PARTICLE_COLORS = ['#f59e0b', '#fb923c', '#fbbf24', '#fcd34d', '#ffffff'];

export interface CollisionParticlesState {
  particles: CollisionParticle[];
  createBurst: (x: number, y: number) => void;
  removeParticle: (id: number) => void;
}

interface UseCollisionParticlesOptions {
  /** Количество частиц (по умолчанию 5-7 случайно) */
  particleCount?: number | { min: number; max: number };
  /** Цвета частиц */
  colors?: string[];
  /** Длительность жизни частицы в мс (по умолчанию 600) */
  lifetime?: number;
}

export function useCollisionParticles(options?: UseCollisionParticlesOptions): CollisionParticlesState {
  const {
    particleCount = { min: 5, max: 7 },
    colors = PARTICLE_COLORS,
    lifetime = 600,
  } = options || {};
  
  const [particles, setParticles] = useState<CollisionParticle[]>([]);
  
  const createBurst = useCallback((x: number, y: number) => {
    const count = typeof particleCount === 'number' 
      ? particleCount 
      : particleCount.min + Math.floor(Math.random() * (particleCount.max - particleCount.min + 1));
    
    const newParticles: CollisionParticle[] = [];
    const baseId = Date.now();
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      
      newParticles.push({
        id: baseId + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // slight upward bias
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Clean up particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, lifetime);
  }, [particleCount, colors, lifetime]);
  
  const removeParticle = useCallback((id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);
  
  return {
    particles,
    createBurst,
    removeParticle,
  };
}
