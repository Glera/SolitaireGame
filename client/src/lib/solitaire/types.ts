export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Color = 'red' | 'black';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  color: Color;
  faceUp: boolean;
}

export interface GameState {
  // The seven tableau columns
  tableau: Card[][];
  // Four foundation piles (one for each suit)
  foundations: {
    hearts: Card[];
    diamonds: Card[];
    clubs: Card[];
    spades: Card[];
  };
  // Stock pile (face down cards to draw from)
  stock: Card[];
  // Waste pile (face up cards drawn from stock)
  waste: Card[];
  // Game status
  isWon: boolean;
  moves: number;
  startTime: Date | null;
  // Progress bar state
  totalGifts: number;
}

export interface DragState {
  isDragging: boolean;
  draggedCards: Card[];
  sourceType: 'tableau' | 'waste' | 'foundation';
  sourceIndex?: number;
  sourceFoundation?: Suit;
}
