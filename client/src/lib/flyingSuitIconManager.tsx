import React, { useState, useCallback, useRef } from 'react';
import { FlyingSuitIcon } from '../components/solitaire/FlyingSuitIcon';
import { Suit } from './solitaire/types';

interface FlyingIcon {
  id: string;
  suit: Suit;
  startPosition: { x: number; y: number };
  direction: 'left' | 'right';
}

let iconCounter = 0;
let addIconCallback: ((suit: Suit, x: number, y: number, direction: 'left' | 'right') => void) | null = null;
let iconCountRef: { current: number } = { current: 0 };

const MAX_ICONS = 20; // Maximum simultaneous icons (increased for longer flight)

// Global function to add flying icon - creates icons flying left AND right
export function addFlyingSuitIcon(suit: Suit, x: number, y: number) {
  console.log('🎯 addFlyingSuitIcon:', { suit, x, y, hasCallback: !!addIconCallback, iconCount: iconCountRef.current });
  
  if (addIconCallback) {
    // Check current icon count
    if (iconCountRef.current >= MAX_ICONS) {
      console.log('⚠️ Max icons reached, skipping');
      return; // Skip if too many icons
    }
    
    const availableSlots = MAX_ICONS - iconCountRef.current;
    
    // Create 1-3 icons flying LEFT
    const leftCount = Math.min(1 + Math.floor(Math.random() * 3), Math.floor(availableSlots / 2)); // 1-3 icons
    // Create 1-3 icons flying RIGHT
    const rightCount = Math.min(1 + Math.floor(Math.random() * 3), availableSlots - leftCount); // 1-3 icons
    
    // Spawn left-flying icons
    for (let i = 0; i < leftCount; i++) {
      const offsetX = -(5 + Math.random() * 10); // -5 to -15px (left side)
      const offsetY = (Math.random() - 0.5) * 16;
      const delay = Math.random() * 30;
      
      setTimeout(() => {
        if (addIconCallback) {
          addIconCallback(suit, x + offsetX, y + offsetY, 'left');
        }
      }, delay);
    }
    
    // Spawn right-flying icons
    for (let i = 0; i < rightCount; i++) {
      const offsetX = 5 + Math.random() * 10; // +5 to +15px (right side)
      const offsetY = (Math.random() - 0.5) * 16;
      const delay = Math.random() * 30;
      
      setTimeout(() => {
        if (addIconCallback) {
          addIconCallback(suit, x + offsetX, y + offsetY, 'right');
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
  
  const addIcon = useCallback((suit: Suit, x: number, y: number, direction: 'left' | 'right') => {
    const id = `icon-${iconCounter++}`;
    console.log(`✨ FlyingSuitIconManager: Adding icon ${id} for ${suit} at (${Math.round(x)}, ${Math.round(y)}) direction=${direction}`);
    setIcons(prev => {
      const newIcons = [...prev, { id, suit, startPosition: { x, y }, direction }];
      console.log(`✨ FlyingSuitIconManager: Now have ${newIcons.length} icons`);
      return newIcons;
    });
  }, []);
  
  const removeIcon = useCallback((id: string) => {
    setIcons(prev => prev.filter(icon => icon.id !== id));
  }, []);
  
  // Register callback on EVERY render to handle HMR reloads
  // (HMR resets global variables but doesn't remount components)
  addIconCallback = addIcon;
  
  console.log(`🎨 FlyingSuitIconManager render: ${icons.length} icons, callback registered`);
  
  return (
    <>
      {icons.map(icon => (
        <FlyingSuitIcon
          key={icon.id}
          suit={icon.suit}
          startPosition={icon.startPosition}
          direction={icon.direction}
          onComplete={() => removeIcon(icon.id)}
        />
      ))}
    </>
  );
}

