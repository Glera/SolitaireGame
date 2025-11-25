import { Card, Suit } from './types';

export interface TouchDragState {
  isActive: boolean;
  cards: Card[];
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
  sourceType: 'tableau' | 'waste' | 'foundation';
  sourceIndex?: number;
  sourceFoundation?: Suit;
}

export const createInitialTouchDragState = (): TouchDragState => ({
  isActive: false,
  cards: [],
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  offsetX: 0,
  offsetY: 0,
  sourceType: 'tableau'
});






