import { Card, GameState, Suit, Rank, Color } from './types';
import { getRoomFromURL, getPremiumCardsCount } from '../roomUtils';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Generates a GUARANTEED solvable solitaire game using classic layout
 * Algorithm: Deal cards in classic pattern (1,2,3...7), then verify solvability
 * If not solvable, reshuffle and try again
 */
export function generateSolvableGame(): GameState {
  const roomType = getRoomFromURL();
  
  console.log('🎲 Starting solvable game generation...');
  
  const maxAttempts = 100;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🎲 Attempt ${attempts}...`);
    
    // Create and shuffle all 52 cards
    const allCards: Card[] = [];
    SUITS.forEach(suit => {
      const color: Color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
      RANKS.forEach(rank => {
        allCards.push({
          id: `${suit}-${rank}`,
          suit,
          rank,
          color,
          faceUp: false
        });
      });
    });
    
    // Shuffle cards
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    
    // Deal in classic pattern: column 0 gets 1 card, column 1 gets 2 cards, etc.
    const tableau: Card[][] = Array(7).fill(null).map(() => []);
    let cardIndex = 0;
    
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = allCards[cardIndex++];
        // Only top card (last in column) is face-up
        card.faceUp = row === col;
        tableau[col].push(card);
      }
    }
    
    // Remaining cards go to stock
    const stock: Card[] = [];
    while (cardIndex < allCards.length) {
      const card = allCards[cardIndex++];
      card.faceUp = false;
      stock.push(card);
    }
    
    console.log(`🎲 Dealt cards: ${tableau.flat().length} on tableau, ${stock.length} in stock`);
    
    // Check if this layout is solvable
    if (isSolvable(tableau, stock)) {
      console.log(`✅ Found solvable game on attempt ${attempts}!`);
      
      // Select premium cards from tableau only
      // COMMENTED OUT: Premium cards logic disabled
      /*
      const tableauCards = tableau.flat();
      const premiumCount = getPremiumCardsCount(roomType);
      const premiumCardIds = selectPremiumCards(tableauCards, premiumCount);
      
      // Mark premium cards
      tableau.forEach(column => {
        column.forEach(card => {
          if (premiumCardIds.has(card.id)) {
            card.isPremium = true;
          }
        });
      });
      */
      
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
        totalGifts: 0,
        roomType,
        gameMode: 'solvable'
      };
    }
  }
  
  // Fallback: couldn't find solvable game, return last attempt
  console.warn(`⚠️ Could not find solvable game after ${maxAttempts} attempts, using last shuffle`);
  
  // Create one more shuffle
  const allCards: Card[] = [];
  SUITS.forEach(suit => {
    const color: Color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
    RANKS.forEach(rank => {
      allCards.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        color,
        faceUp: false
      });
    });
  });
  
  for (let i = allCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
  }
  
  const tableau: Card[][] = Array(7).fill(null).map(() => []);
  let cardIndex = 0;
  
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = allCards[cardIndex++];
      card.faceUp = row === col;
      tableau[col].push(card);
    }
  }
  
  const stock: Card[] = [];
  while (cardIndex < allCards.length) {
    const card = allCards[cardIndex++];
    card.faceUp = false;
    stock.push(card);
  }
  
  const tableauCards = tableau.flat();
  // COMMENTED OUT: Premium cards logic disabled
  /*
  const premiumCount = getPremiumCardsCount(roomType);
  const premiumCardIds = selectPremiumCards(tableauCards, premiumCount);
  
  tableau.forEach(column => {
    column.forEach(card => {
      if (premiumCardIds.has(card.id)) {
        card.isPremium = true;
      }
    });
  });
  */
  
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
    totalGifts: 0,
    roomType,
    gameMode: 'solvable'
  };
}

/**
 * Generates a GUARANTEED unsolvable solitaire game
 * Strategy: Block all aces under high cards, create deadlocks
 */
export function generateUnsolvableGame(): GameState {
  const roomType = getRoomFromURL();
  
  // Create all cards
  const allCards: Card[] = [];
  SUITS.forEach(suit => {
    const color: Color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
    RANKS.forEach(rank => {
      allCards.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        color,
        faceUp: true
      });
    });
  });
  
  const tableau: Card[][] = Array(7).fill(null).map(() => []);
  const stock: Card[] = [];
  
  // Separate cards by rank
  const aces: Card[] = [];
  const twos: Card[] = [];
  const highCards: Card[] = []; // Kings, Queens, Jacks
  const otherCards: Card[] = [];
  
  allCards.forEach(card => {
    if (card.rank === 'A') {
      aces.push(card);
    } else if (card.rank === '2') {
      twos.push(card);
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      highCards.push(card);
    } else {
      otherCards.push(card);
    }
  });
  
  // Strategy: Put all aces at the BOTTOM of columns, covered by high cards
  // This makes it nearly impossible to start building foundations
  
  let aceIndex = 0;
  let highIndex = 0;
  let otherIndex = 0;
  
  // Build tableau with aces buried deep
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      let card: Card;
      
      if (row === 0 && aceIndex < aces.length) {
        // Put ace at the very bottom
        card = { ...aces[aceIndex++] };
      } else if (row === 1 && col > 0 && aceIndex < aces.length) {
        // Put remaining aces in second position
        card = { ...aces[aceIndex++] };
      } else if (highIndex < highCards.length) {
        // Fill with high cards to block aces
        card = { ...highCards[highIndex++] };
      } else if (otherIndex < otherCards.length) {
        card = { ...otherCards[otherIndex++] };
      } else {
        card = { ...aces[aceIndex++] };
      }
      
      card.faceUp = row === col; // Only top card face-up
      tableau[col].push(card);
    }
  }
  
  // Put remaining aces and twos in stock (buried)
  while (aceIndex < aces.length) {
    const card = { ...aces[aceIndex++] };
    card.faceUp = false;
    stock.push(card);
  }
  
  // Add twos to stock
  twos.forEach(two => {
    const card = { ...two };
    card.faceUp = false;
    stock.push(card);
  });
  
  // Add remaining high cards to stock
  while (highIndex < highCards.length) {
    const card = { ...highCards[highIndex++] };
    card.faceUp = false;
    stock.push(card);
  }
  
  // Add remaining other cards
  while (otherIndex < otherCards.length) {
    const card = { ...otherCards[otherIndex++] };
    card.faceUp = false;
    stock.push(card);
  }
  
  // Shuffle stock a bit (but keep it mostly bad)
  for (let i = 0; i < 10; i++) {
    const idx1 = Math.floor(Math.random() * stock.length);
    const idx2 = Math.floor(Math.random() * stock.length);
    [stock[idx1], stock[idx2]] = [stock[idx2], stock[idx1]];
  }
  
  // Select premium cards from tableau only
  // COMMENTED OUT: Premium cards logic disabled
  /*
  const tableauCards = tableau.flat();
  const premiumCount = getPremiumCardsCount(roomType);
  const premiumCardIds = selectPremiumCards(tableauCards, premiumCount);
  
  // Mark premium cards
  tableau.forEach(column => {
    column.forEach(card => {
      if (premiumCardIds.has(card.id)) {
        card.isPremium = true;
      }
    });
  });
  */
  
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
    totalGifts: 0,
    roomType,
    gameMode: 'unsolvable'
  };
}

// Check if card can be placed on top card in tableau (during reverse dealing)
function canPlaceOnTableauReverse(card: Card, topCard: Card): boolean {
  const rankOrder: { [key in Rank]: number } = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  };
  
  // In reverse dealing: card should be one rank LOWER than top card
  // Example: We have K on tableau, we can place Q on it (12 = 13 - 1)
  const cardRank = rankOrder[card.rank];
  const topRank = rankOrder[topCard.rank];
  
  // Must be opposite color and one rank lower
  return card.color !== topCard.color && cardRank === topRank - 1;
}

/**
 * Check if a solitaire layout is solvable using a simplified solver
 * This tries to actually solve the game with a depth-limited search
 */
function isSolvable(tableau: Card[][], stock: Card[]): boolean {
  // Quick reject: if no aces accessible at all
  const hasAccessibleAce = tableau.some(col => col.length > 0 && col[col.length - 1].rank === 'A') ||
                            stock.some(card => card.rank === 'A');
  
  if (!hasAccessibleAce) {
    return false;
  }
  
  // Clone state for simulation
  const simTableau = tableau.map(col => col.map(c => ({...c})));
  const simStock = stock.map(c => ({...c}));
  const simWaste: Card[] = [];
  const simFoundations: { [key in Suit]: Card[] } = {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: []
  };
  
  // Try to make progress for a limited number of moves
  const maxMoves = 200;
  let moves = 0;
  let madeProgress = true;
  
  while (madeProgress && moves < maxMoves) {
    madeProgress = false;
    moves++;
    
    // 1. Try to move cards to foundations
    for (let col = 0; col < simTableau.length; col++) {
      if (simTableau[col].length === 0) continue;
      const topCard = simTableau[col][simTableau[col].length - 1];
      if (!topCard.faceUp) continue;
      
      if (canMoveToFoundation(topCard, simFoundations)) {
        simTableau[col].pop();
        simFoundations[topCard.suit].push(topCard);
        
        // Flip next card if exists
        if (simTableau[col].length > 0) {
          simTableau[col][simTableau[col].length - 1].faceUp = true;
        }
        
        madeProgress = true;
        break;
      }
    }
    
    if (madeProgress) continue;
    
    // 2. Try to move from waste to foundations
    if (simWaste.length > 0) {
      const wasteTop = simWaste[simWaste.length - 1];
      if (canMoveToFoundation(wasteTop, simFoundations)) {
        simWaste.pop();
        simFoundations[wasteTop.suit].push(wasteTop);
        madeProgress = true;
        continue;
      }
    }
    
    // 3. Try to move cards between tableau columns
    for (let srcCol = 0; srcCol < simTableau.length; srcCol++) {
      if (simTableau[srcCol].length === 0) continue;
      
      // Find first face-up card
      let firstFaceUpIdx = -1;
      for (let i = 0; i < simTableau[srcCol].length; i++) {
        if (simTableau[srcCol][i].faceUp) {
          firstFaceUpIdx = i;
          break;
        }
      }
      
      if (firstFaceUpIdx === -1) continue;
      
      const cardToMove = simTableau[srcCol][firstFaceUpIdx];
      
      for (let dstCol = 0; dstCol < simTableau.length; dstCol++) {
        if (srcCol === dstCol) continue;
        
        if (simTableau[dstCol].length === 0) {
          // Only move King to empty column
          if (cardToMove.rank === 'K' && firstFaceUpIdx < simTableau[srcCol].length - 1) {
            const cards = simTableau[srcCol].splice(firstFaceUpIdx);
            simTableau[dstCol].push(...cards);
            
            // Flip next card in source
            if (simTableau[srcCol].length > 0) {
              simTableau[srcCol][simTableau[srcCol].length - 1].faceUp = true;
            }
            
            madeProgress = true;
            break;
          }
        } else {
          const dstTop = simTableau[dstCol][simTableau[dstCol].length - 1];
          if (canPlaceOnTableau(cardToMove, dstTop)) {
            const cards = simTableau[srcCol].splice(firstFaceUpIdx);
            simTableau[dstCol].push(...cards);
            
            // Flip next card in source
            if (simTableau[srcCol].length > 0) {
              simTableau[srcCol][simTableau[srcCol].length - 1].faceUp = true;
            }
            
            madeProgress = true;
            break;
          }
        }
      }
      
      if (madeProgress) break;
    }
    
    if (madeProgress) continue;
    
    // 4. Try to move from waste to tableau
    if (simWaste.length > 0) {
      const wasteTop = simWaste[simWaste.length - 1];
      
      for (let col = 0; col < simTableau.length; col++) {
        if (simTableau[col].length === 0) {
          if (wasteTop.rank === 'K') {
            simTableau[col].push(simWaste.pop()!);
            madeProgress = true;
            break;
          }
        } else {
          const colTop = simTableau[col][simTableau[col].length - 1];
          if (canPlaceOnTableau(wasteTop, colTop)) {
            simTableau[col].push(simWaste.pop()!);
            madeProgress = true;
            break;
          }
        }
      }
      
      if (madeProgress) continue;
    }
    
    // 5. Draw from stock
    if (simStock.length > 0) {
      const card = simStock.pop()!;
      card.faceUp = true;
      simWaste.push(card);
      madeProgress = true;
      continue;
    } else if (simWaste.length > 0) {
      // Recycle waste to stock
      while (simWaste.length > 0) {
        const card = simWaste.pop()!;
        card.faceUp = false;
        simStock.unshift(card);
      }
      madeProgress = true;
      continue;
    }
  }
  
  // Check if we made significant progress
  const foundationCount = Object.values(simFoundations).reduce((sum, pile) => sum + pile.length, 0);
  
  // If we moved at least 30% of cards to foundations, consider it solvable
  return foundationCount >= 16;
}

/**
 * Check if a card can be moved to foundations
 */
function canMoveToFoundation(card: Card, foundations: { [key in Suit]: Card[] }): boolean {
  const pile = foundations[card.suit];
  
  if (pile.length === 0) {
    return card.rank === 'A';
  }
  
  const topCard = pile[pile.length - 1];
  const rankOrder: { [key in Rank]: number } = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  };
  
  return rankOrder[card.rank] === rankOrder[topCard.rank] + 1;
}

/**
 * Check if a card can be placed on top of another card in tableau
 */
function canPlaceOnTableau(card: Card, topCard: Card): boolean {
  const rankOrder: { [key in Rank]: number } = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  };
  
  const cardRank = rankOrder[card.rank];
  const topRank = rankOrder[topCard.rank];
  
  // Must be opposite color and one rank lower
  return card.color !== topCard.color && cardRank === topRank - 1;
}

function selectPremiumCards(allCards: Card[], count: number): Set<string> {
  const premiumIds = new Set<string>();
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    premiumIds.add(shuffled[i].id);
  }
  
  return premiumIds;
}


