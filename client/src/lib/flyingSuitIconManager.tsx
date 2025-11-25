import React, { useState, useCallback, useRef } from 'react';
import { FlyingSuitIcon } from '../components/solitaire/FlyingSuitIcon';
import { Suit } from './solitaire/types';

interface FlyingIcon {
  id: string;
  suit: Suit;
  startPosition: { x: number; y: number };
}

let iconCounter = 0;
let addIconCallback: ((suit: Suit, x: number, y: number) => void) | null = null;
let iconCountRef: { current: number } = { current: 0 };

const MAX_ICONS = 20; // Maximum simultaneous icons (increased for longer flight)

// Global function to add flying icon - creates multiple icons at once
export function addFlyingSuitIcon(suit: Suit, x: number, y: number) {
  console.log('🎯 addFlyingSuitIcon:', { suit, x, y, hasCallback: !!addIconCallback, iconCount: iconCountRef.current });
  
  if (addIconCallback) {
    // Check current icon count
    if (iconCountRef.current >= MAX_ICONS) {
      console.log('⚠️ Max icons reached, skipping');
      return; // Skip if too many icons
    }
    
    // Create 2-3 "shattered pieces"
    const availableSlots = MAX_ICONS - iconCountRef.current;
    const count = Math.min(2 + Math.floor(Math.random() * 2), availableSlots); // 2-3 icons
    
    for (let i = 0; i < count; i++) {
      // Small random offset from impact point
      const offsetX = (Math.random() - 0.5) * 16; // -8 to +8px
      const offsetY = (Math.random() - 0.5) * 16;
      
      // Slight delay for staggered effect (0-30ms)
      const delay = Math.random() * 30;
      
      setTimeout(() => {
        if (addIconCallback) {
          addIconCallback(suit, x + offsetX, y + offsetY);
        }
      }, delay);
    }
  }
}

export function FlyingSuitIconManager() {
  const [icons, setIcons] = useState<FlyingIcon[]>([]);
  const iconsRef = useRef(icons);
  iconsRef.current = icons;
  
  // Update global counter ref
  iconCountRef.current = icons.length;
  
  const addIcon = useCallback((suit: Suit, x: number, y: number) => {
    const id = `icon-${iconCounter++}`;
    setIcons(prev => [...prev, { id, suit, startPosition: { x, y } }]);
  }, []);
  
  const removeIcon = useCallback((id: string) => {
    setIcons(prev => prev.filter(icon => icon.id !== id));
  }, []);
  
  // Register callback on mount only (no deps on icons.length)
  React.useEffect(() => {
    console.log('✅ FlyingSuitIconManager: Registering callback');
    addIconCallback = addIcon;
    return () => {
      console.log('❌ FlyingSuitIconManager: Unregistering callback');
      addIconCallback = null;
    };
  }, [addIcon]);
  
  return (
    <>
      {icons.map(icon => (
        <FlyingSuitIcon
          key={icon.id}
          suit={icon.suit}
          startPosition={icon.startPosition}
          onComplete={() => removeIcon(icon.id)}
        />
      ))}
    </>
  );
}

