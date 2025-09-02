import { GameState, Card, Suit } from './types';
import { createDeck, shuffleDeck, canPlaceOnTableau, canPlaceOnFoundation } from './cardUtils';

export function initializeGame(): GameState {
  const deck = shuffleDeck(createDeck());
  
  // Deal cards to tableau (7 columns, 1-7 cards each)
  const tableau: Card[][] = Array(7).fill(null).map(() => []);
  let deckIndex = 0;
  
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[deckIndex] };
      // Only the top card in each column is face up
      card.faceUp = row === col;
      tableau[col].push(card);
      deckIndex++;
    }
  }
  
  // Remaining cards go to stock pile
  const stock = deck.slice(deckIndex).map(card => ({ ...card, faceUp: false }));
  
  return {
    tableau,
    foundations: {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: []
    },
    stock,
    waste: [],
    isWon: false,
    moves: 0,
    startTime: new Date()
  };
}

export function drawFromStock(gameState: GameState): GameState {
  if (gameState.stock.length === 0) {
    // If waste is also empty, nothing to do
    if (gameState.waste.length === 0) {
      return gameState;
    }
    
    // Reset stock from waste pile
    const newStock = [...gameState.waste].reverse().map(card => ({ ...card, faceUp: false }));
    
    // Now draw one card from the new stock
    if (newStock.length > 0) {
      const drawnCard = { ...newStock[newStock.length - 1], faceUp: true };
      const finalStock = newStock.slice(0, -1);
      
      return {
        ...gameState,
        stock: finalStock,
        waste: [drawnCard],
        moves: gameState.moves + 1
      };
    }
    
    return {
      ...gameState,
      stock: newStock,
      waste: [],
      moves: gameState.moves + 1
    };
  }
  
  // Draw one card from stock to waste
  const drawnCard = { ...gameState.stock[gameState.stock.length - 1], faceUp: true };
  const newStock = gameState.stock.slice(0, -1);
  const newWaste = [...gameState.waste, drawnCard];
  
  return {
    ...gameState,
    stock: newStock,
    waste: newWaste,
    moves: gameState.moves + 1
  };
}

export function moveCards(
  gameState: GameState,
  cards: Card[],
  sourceType: 'tableau' | 'waste' | 'foundation',
  sourceIndex: number | undefined,
  sourceFoundation: Suit | undefined,
  targetType: 'tableau' | 'foundation',
  targetIndex: number | undefined,
  targetFoundation: Suit | undefined
): GameState | null {
  // Validate move
  if (!isValidMove(gameState, cards, targetType, targetIndex, targetFoundation)) {
    return null;
  }
  
  let newState = { ...gameState };
  
  // Remove cards from source
  if (sourceType === 'tableau' && sourceIndex !== undefined) {
    const column = [...newState.tableau[sourceIndex]];
    const removeCount = cards.length;
    column.splice(-removeCount);
    
    // Flip the top card if it's face down
    if (column.length > 0 && !column[column.length - 1].faceUp) {
      column[column.length - 1] = { ...column[column.length - 1], faceUp: true };
    }
    
    newState.tableau[sourceIndex] = column;
  } else if (sourceType === 'waste') {
    newState.waste = newState.waste.slice(0, -1);
  } else if (sourceType === 'foundation' && sourceFoundation) {
    newState.foundations[sourceFoundation] = newState.foundations[sourceFoundation].slice(0, -1);
  }
  
  // Add cards to target
  if (targetType === 'tableau' && targetIndex !== undefined) {
    newState.tableau[targetIndex] = [...newState.tableau[targetIndex], ...cards];
  } else if (targetType === 'foundation' && targetFoundation) {
    newState.foundations[targetFoundation] = [...newState.foundations[targetFoundation], ...cards];
  }
  
  newState.moves += 1;
  
  // Check win condition
  newState.isWon = checkWinCondition(newState);
  
  return newState;
}

function isValidMove(
  gameState: GameState,
  cards: Card[],
  targetType: 'tableau' | 'foundation',
  targetIndex: number | undefined,
  targetFoundation: Suit | undefined
): boolean {
  if (targetType === 'foundation') {
    // Can only move single card to foundation
    if (cards.length !== 1 || !targetFoundation) return false;
    const foundationCards = gameState.foundations[targetFoundation];
    return canPlaceOnFoundation(foundationCards, cards[0]);
  }
  
  if (targetType === 'tableau' && targetIndex !== undefined) {
    const targetColumn = gameState.tableau[targetIndex];
    
    if (targetColumn.length === 0) {
      // Can place King on empty column
      return cards[0].rank === 'K';
    }
    
    const bottomCard = targetColumn[targetColumn.length - 1];
    return canPlaceOnTableau(bottomCard, cards[0]);
  }
  
  return false;
}

function checkWinCondition(gameState: GameState): boolean {
  // Game is won when all foundations have 13 cards (complete suits)
  return Object.values(gameState.foundations).every(foundation => foundation.length === 13);
}

export function getMovableCards(column: Card[]): Card[] {
  if (column.length === 0) return [];
  
  const movableCards: Card[] = [];
  
  // Start from the last (top) card and work backwards
  for (let i = column.length - 1; i >= 0; i--) {
    const card = column[i];
    
    if (!card.faceUp) break;
    
    movableCards.unshift(card);
    
    // Check if this sequence can continue (alternating colors, descending ranks)
    if (i > 0) {
      const nextCard = column[i - 1];
      if (!nextCard.faceUp || !canPlaceOnTableau(nextCard, card)) {
        break;
      }
    }
  }
  
  return movableCards;
}
