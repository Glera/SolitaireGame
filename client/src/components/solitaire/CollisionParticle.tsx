/**
 * CollisionParticle Component
 * 
 * Отображает одну анимированную частицу.
 * Частица движется по заданной траектории с физикой (гравитация, трение)
 * и постепенно исчезает.
 */

import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CollisionParticle as CollisionParticleType } from '../../hooks/useCollisionParticles';

interface CollisionParticleProps {
  particle: CollisionParticleType;
}

export function CollisionParticle({ particle }: CollisionParticleProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const duration = 500;
    let x = particle.x;
    let y = particle.y;
    let vx = particle.vx;
    let vy = particle.vy;
    
    const animate = (timestamp: number) => {
      if (!elementRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      x += vx;
      y += vy;
      vy += 0.15; // gravity
      vx *= 0.98; // friction
      
      const opacity = 1 - progress;
      const scale = 1 - progress * 0.5;
      
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
      elementRef.current.style.opacity = `${opacity}`;
      elementRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsVisible(false);
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [particle]);
  
  if (!isVisible) return null;
  
  return ReactDOM.createPortal(
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[10001] rounded-full"
      style={{
        left: particle.x,
        top: particle.y,
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        transform: 'translate(-50%, -50%)',
        boxShadow: `0 0 ${particle.size}px ${particle.color}`
      }}
    />,
    document.body
  );
}

/**
 * CollisionParticles Container
 * 
 * Рендерит все активные частицы.
 */
interface CollisionParticlesProps {
  particles: CollisionParticleType[];
}

export function CollisionParticles({ particles }: CollisionParticlesProps) {
  return (
    <>
      {particles.map(particle => (
        <CollisionParticle key={particle.id} particle={particle} />
      ))}
    </>
  );
}
