import { GameState, Card, Suit } from './types';
import { createDeck, shuffleDeck, canPlaceOnTableau, canPlaceOnFoundation } from './cardUtils';
import { calculateCardPoints, calculateCardPointsWithBreakdown } from './scoring';

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
    startTime: new Date(),
    totalGifts: 0
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
  targetFoundation: Suit | undefined,
  onPointsEarned?: (points: number) => void,
  onFloatingScore?: (points: number, x: number, y: number, cardRank: string) => void
): GameState | null {
  console.log('🎲 moveCards validation:', {
    cards: cards.map(c => `${c.suit}-${c.rank}`),
    source: { type: sourceType, index: sourceIndex, foundation: sourceFoundation },
    target: { type: targetType, index: targetIndex, foundation: targetFoundation }
  });
  
  // Validate move
  if (!isValidMove(gameState, cards, targetType, targetIndex, targetFoundation)) {
    console.log('❌ Move validation failed');
    return null;
  }
  
  console.log('✅ Move validation passed');
  
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
    
    // Calculate points for cards moved to foundation
    if (onPointsEarned) {
      let totalPoints = 0;
      for (const card of cards) {
        const result = calculateCardPointsWithBreakdown(card);
        totalPoints += result.points;
        
        // Show floating score for each card
        if (result.points > 0 && onFloatingScore && result.breakdown) {
          // Calculate position for floating score - safe positioning in upper area
          let foundationX = window.innerWidth / 2; // Center horizontally
          let foundationY = 150; // Safe distance from top
          
          // Try to position near the foundation pile if element exists
          const foundationElement = document.getElementById(`foundation-${targetFoundation}`);
          if (foundationElement) {
            const rect = foundationElement.getBoundingClientRect();
            // Ensure we're not too close to edges
            foundationX = Math.max(100, Math.min(window.innerWidth - 100, rect.left + rect.width / 2));
            foundationY = Math.max(100, rect.top - 30); // Above the foundation pile but not too high
          }
          
          // console.log(`🎯 Triggering floating score: +${result.points} for ${result.breakdown.cardRank} at (${foundationX}, ${foundationY})`);
          onFloatingScore(result.points, foundationX, foundationY, result.breakdown.cardRank);
        }
      }
      if (totalPoints > 0) {
        onPointsEarned(totalPoints);
      }
    }
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
    if (cards.length !== 1 || !targetFoundation) {
      console.log('🚫 Foundation move invalid: multiple cards or no target foundation');
      return false;
    }
    const foundationCards = gameState.foundations[targetFoundation];
    const canPlace = canPlaceOnFoundation(foundationCards, cards[0]);
    if (!canPlace) {
      console.log('🚫 Foundation move invalid: cannot place', cards[0].suit, cards[0].rank, 'on foundation', targetFoundation);
    }
    return canPlace;
  }
  
  if (targetType === 'tableau' && targetIndex !== undefined) {
    const targetColumn = gameState.tableau[targetIndex];
    
    if (targetColumn.length === 0) {
      // Can place King on empty column
      const isKing = cards[0].rank === 'K';
      if (!isKing) {
        console.log('🚫 Tableau move invalid: only King can go on empty column, got', cards[0].rank);
      }
      return isKing;
    }
    
    const bottomCard = targetColumn[targetColumn.length - 1];
    const canPlace = canPlaceOnTableau(bottomCard, cards[0]);
    if (!canPlace) {
      console.log('🚫 Tableau move invalid: cannot place', cards[0].suit, cards[0].rank, 'on', bottomCard.suit, bottomCard.rank);
    }
    return canPlace;
  }
  
  console.log('🚫 Move invalid: bad target type or index');
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
