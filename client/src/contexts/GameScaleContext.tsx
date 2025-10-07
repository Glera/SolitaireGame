import React, { createContext, useContext, ReactNode } from 'react';
import { useGameScale } from '../hooks/useGameScale';

interface GameScaleContextType {
  scale: number;
  containerWidth: number;
  containerHeight: number;
  availableHeight: number;
}

const GameScaleContext = createContext<GameScaleContextType>({
  scale: 1,
  containerWidth: window.innerWidth,
  containerHeight: window.innerHeight,
  availableHeight: window.innerHeight
});

export const useGameScaleContext = () => useContext(GameScaleContext);

interface GameScaleProviderProps {
  children: ReactNode;
}

export function GameScaleProvider({ children }: GameScaleProviderProps) {
  const dimensions = useGameScale();
  
  return (
    <GameScaleContext.Provider value={dimensions}>
      {children}
    </GameScaleContext.Provider>
  );
}

