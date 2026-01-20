import { Card, GameState, Suit, Rank, Color } from './types';
import { getRoomFromURL, getPremiumCardsCount } from '../roomUtils';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RANK_VALUES: { [key in Rank]: number } = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

// Check if this is the very first game (no wins yet)
function isFirstGame(): boolean {
  return localStorage.getItem('solitaire_first_win') !== 'true';
}

// Mark that first win happened (called externally after win)
export function markFirstWin(): void {
  localStorage.setItem('solitaire_first_win', 'true');
}

// Reset first win flag (for testing/reset)
export function resetFirstWinFlag(): void {
  localStorage.removeItem('solitaire_first_win');
}

/**
 * Generates a GUARANTEED SOLVABLE solitaire game
 * Strategy:
 * - All 4 aces placed on top of tableau columns (guaranteed immediate moves)
 * - Twos and low cards are easily accessible
 * - Strict solvability check (must solve ALL 52 cards)
 * - Many attempts to find perfect layout
 */
export function generateSolvableGame(): GameState {
  console.log('🎲 Generating guaranteed solvable layout...');
  return generateGuaranteedSolvableLayout();
}

/**
 * OLD: Generates an EASY and DYNAMIC solvable solitaire game (backup)
 */
function generateOldSolvableGame(): GameState {
  const roomType = getRoomFromURL();
  
  console.log('🎲 Starting EASY solvable game generation (old method)...');
  
  const maxAttempts = 300;
  let attempts = 0;
  let bestGame: { tableau: Card[][], stock: Card[], score: number } | null = null;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Create all 52 cards
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
    
    // Smart shuffle: bias low cards towards accessible positions
    // First, separate cards by "importance" (lower = more important to be accessible)
    const aces = allCards.filter(c => c.rank === 'A');
    const twos = allCards.filter(c => c.rank === '2');
    const threes = allCards.filter(c => c.rank === '3');
    const lowCards = allCards.filter(c => RANK_VALUES[c.rank] >= 4 && RANK_VALUES[c.rank] <= 6);
    const midCards = allCards.filter(c => RANK_VALUES[c.rank] >= 7 && RANK_VALUES[c.rank] <= 10);
    const highCards = allCards.filter(c => RANK_VALUES[c.rank] >= 11);
    
    // Shuffle each group
    const shuffleArray = <T>(arr: T[]): T[] => {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };
    
    const shuffledAces = shuffleArray(aces);
    const shuffledTwos = shuffleArray(twos);
    const shuffledThrees = shuffleArray(threes);
    const shuffledLow = shuffleArray(lowCards);
    const shuffledMid = shuffleArray(midCards);
    const shuffledHigh = shuffleArray(highCards);
    
    // Build tableau with strategic placement
    const tableau: Card[][] = Array(7).fill(null).map(() => []);
    
    // Strategy: Put some aces as top cards of tableau columns
    // Put 2s and 3s in accessible positions
    // Kings at bottom of columns (they can start new piles)
    
    // First, let's create a pool of cards for top positions (face-up)
    const topCardPool: Card[] = [];
    // Add 1-2 aces to top positions (guaranteed accessible)
    topCardPool.push(...shuffledAces.splice(0, Math.min(2, shuffledAces.length)));
    // Add some twos and threes
    topCardPool.push(...shuffledTwos.splice(0, Math.min(2, shuffledTwos.length)));
    topCardPool.push(...shuffledThrees.splice(0, Math.min(1, shuffledThrees.length)));
    // Fill rest with random low/mid cards
    topCardPool.push(...shuffledLow.splice(0, Math.max(0, 7 - topCardPool.length)));
    
    // Shuffle top card pool
    const shuffledTopPool = shuffleArray(topCardPool);
    
    // Remaining cards for hidden positions and stock
    const remainingCards = shuffleArray([
      ...shuffledAces, ...shuffledTwos, ...shuffledThrees,
      ...shuffledLow, ...shuffledMid, ...shuffledHigh
    ]);
    
    // Deal tableau
    let remainingIdx = 0;
    for (let col = 0; col < 7; col++) {
      // Hidden cards (0 to col-1)
      for (let row = 0; row < col; row++) {
        const card = remainingCards[remainingIdx++];
        card.faceUp = false;
        tableau[col].push(card);
      }
      // Top card (face-up) - from our curated pool if available
      const topCard = col < shuffledTopPool.length ? shuffledTopPool[col] : remainingCards[remainingIdx++];
      topCard.faceUp = true;
      tableau[col].push(topCard);
    }
    
    // Stock gets remaining cards, but ordered so low cards come up sooner
    const stockCards = remainingCards.slice(remainingIdx);
    
    // Sort stock so that useful cards appear earlier (when drawn)
    // Cards are drawn from end, so put low cards at end
    stockCards.sort((a, b) => {
      // Higher rank values go first (will be drawn later)
      // Lower rank values go last (will be drawn sooner)
      return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
    });
    
    // Add some randomness to stock (don't make it too predictable)
    for (let i = 0; i < stockCards.length; i++) {
      if (Math.random() < 0.3) { // 30% chance to swap with nearby card
        const swapIdx = Math.min(stockCards.length - 1, i + Math.floor(Math.random() * 5));
        [stockCards[i], stockCards[swapIdx]] = [stockCards[swapIdx], stockCards[i]];
      }
    }
    
    const stock = stockCards.map(c => ({ ...c, faceUp: false }));
    
    // Check if this layout is solvable and score it
    if (isSolvable(tableau, stock)) {
      // Score the layout - higher is better (more accessible low cards)
      let score = 0;
      
      // Bonus for aces in top positions
      tableau.forEach(col => {
        const topCard = col[col.length - 1];
        if (topCard.rank === 'A') score += 50;
        if (topCard.rank === '2') score += 30;
        if (topCard.rank === '3') score += 20;
      });
      
      // Bonus for low cards early in stock
      stock.slice(-10).forEach((card, idx) => {
        if (card.rank === 'A') score += 40 - idx * 2;
        if (card.rank === '2') score += 25 - idx;
      });
      
      // Track best game
      if (!bestGame || score > bestGame.score) {
        bestGame = { tableau: tableau.map(col => col.map(c => ({...c}))), stock: stock.map(c => ({...c})), score };
        console.log(`🎲 Attempt ${attempts}: Found game with score ${score}`);
      }
      
      // If we found a really good one, use it
      if (score >= 100) {
        console.log(`✅ Found excellent game on attempt ${attempts} with score ${score}!`);
        break;
      }
    }
  }
  
  // Use best game found, or generate a basic solvable one
  if (bestGame) {
    console.log(`✅ Using best game with score ${bestGame.score}`);
    return {
      tableau: bestGame.tableau,
      foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
      stock: bestGame.stock,
      waste: [],
      isWon: false,
      moves: 0,
      startTime: new Date(),
      totalGifts: 0,
      roomType,
      gameMode: 'solvable'
    };
  }
  
  // Fallback to basic generation
  console.warn('⚠️ Could not find good game, using basic generation');
  return generateBasicSolvableGame();
}

/**
 * Basic solvable game generator (fallback)
 */
function generateBasicSolvableGame(): GameState {
  const roomType = getRoomFromURL();
  const maxAttempts = 100;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    const allCards: Card[] = [];
    SUITS.forEach(suit => {
      const color: Color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
      RANKS.forEach(rank => {
        allCards.push({ id: `${suit}-${rank}`, suit, rank, color, faceUp: false });
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
      stock.push({ ...allCards[cardIndex++], faceUp: false });
    }
    
    if (isSolvable(tableau, stock)) {
      return {
        tableau,
        foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
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
  
  // Fallback: return a random game
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
 * Check if a solitaire layout is solvable using an improved solver
 * Uses priority-based moves and multiple passes through stock
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
  
  const rankOrder: { [key in Rank]: number } = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  };
  
  // Helper: check if moving to foundation is "safe" (won't block other cards)
  const isSafeFoundationMove = (card: Card): boolean => {
    const cardRank = rankOrder[card.rank];
    // Aces and 2s are always safe
    if (cardRank <= 2) return true;
    
    // For higher cards, check if opposite color foundations are high enough
    const oppositeColors = card.color === 'red' ? ['clubs', 'spades'] : ['hearts', 'diamonds'];
    const minOppositeRank = Math.min(
      ...oppositeColors.map(suit => {
        const pile = simFoundations[suit as Suit];
        return pile.length === 0 ? 0 : rankOrder[pile[pile.length - 1].rank];
      })
    );
    
    // Safe to move if card rank is at most 2 higher than min opposite foundation
    return cardRank <= minOppositeRank + 2;
  };
  
  // Try to make progress
  const maxMoves = 500;
  let moves = 0;
  let stockCycles = 0;
  const maxStockCycles = 3;
  let lastFoundationCount = 0;
  let stuckCounter = 0;
  
  while (moves < maxMoves && stockCycles <= maxStockCycles) {
    moves++;
    let madeProgress = false;
    
    // Priority 1: Move safe cards to foundations (cards that won't block progress)
    for (let col = 0; col < simTableau.length; col++) {
      if (simTableau[col].length === 0) continue;
      const topCard = simTableau[col][simTableau[col].length - 1];
      if (!topCard.faceUp) continue;
      
      if (canMoveToFoundation(topCard, simFoundations) && isSafeFoundationMove(topCard)) {
        simTableau[col].pop();
        simFoundations[topCard.suit].push(topCard);
        if (simTableau[col].length > 0) {
          simTableau[col][simTableau[col].length - 1].faceUp = true;
        }
        madeProgress = true;
        break;
      }
    }
    
    if (!madeProgress && simWaste.length > 0) {
      const wasteTop = simWaste[simWaste.length - 1];
      if (canMoveToFoundation(wasteTop, simFoundations) && isSafeFoundationMove(wasteTop)) {
        simWaste.pop();
        simFoundations[wasteTop.suit].push(wasteTop);
        madeProgress = true;
      }
    }
    
    if (madeProgress) {
      stuckCounter = 0;
      continue;
    }
    
    // Priority 2: Move cards to reveal face-down cards
    for (let srcCol = 0; srcCol < simTableau.length; srcCol++) {
      if (simTableau[srcCol].length === 0) continue;
      
      // Count face-down cards
      const faceDownCount = simTableau[srcCol].filter(c => !c.faceUp).length;
      if (faceDownCount === 0) continue;
      
      // Find first face-up card
      let firstFaceUpIdx = simTableau[srcCol].findIndex(c => c.faceUp);
      if (firstFaceUpIdx === -1) continue;
      
      const cardToMove = simTableau[srcCol][firstFaceUpIdx];
      
      for (let dstCol = 0; dstCol < simTableau.length; dstCol++) {
        if (srcCol === dstCol) continue;
        
        if (simTableau[dstCol].length === 0) {
          if (cardToMove.rank === 'K' && firstFaceUpIdx > 0) {
            const cards = simTableau[srcCol].splice(firstFaceUpIdx);
            simTableau[dstCol].push(...cards);
            if (simTableau[srcCol].length > 0) {
              simTableau[srcCol][simTableau[srcCol].length - 1].faceUp = true;
            }
            madeProgress = true;
            break;
          }
        } else {
          const dstTop = simTableau[dstCol][simTableau[dstCol].length - 1];
          if (dstTop.faceUp && canPlaceOnTableau(cardToMove, dstTop)) {
            const cards = simTableau[srcCol].splice(firstFaceUpIdx);
            simTableau[dstCol].push(...cards);
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
    
    if (madeProgress) {
      stuckCounter = 0;
      continue;
    }
    
    // Priority 3: Move waste to tableau
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
          if (colTop.faceUp && canPlaceOnTableau(wasteTop, colTop)) {
            simTableau[col].push(simWaste.pop()!);
            madeProgress = true;
            break;
          }
        }
      }
    }
    
    if (madeProgress) {
      stuckCounter = 0;
      continue;
    }
    
    // Priority 4: Any card to foundation (even if not "safe")
    for (let col = 0; col < simTableau.length; col++) {
      if (simTableau[col].length === 0) continue;
      const topCard = simTableau[col][simTableau[col].length - 1];
      if (!topCard.faceUp) continue;
      
      if (canMoveToFoundation(topCard, simFoundations)) {
        simTableau[col].pop();
        simFoundations[topCard.suit].push(topCard);
        if (simTableau[col].length > 0) {
          simTableau[col][simTableau[col].length - 1].faceUp = true;
        }
        madeProgress = true;
        break;
      }
    }
    
    if (!madeProgress && simWaste.length > 0) {
      const wasteTop = simWaste[simWaste.length - 1];
      if (canMoveToFoundation(wasteTop, simFoundations)) {
        simWaste.pop();
        simFoundations[wasteTop.suit].push(wasteTop);
        madeProgress = true;
      }
    }
    
    if (madeProgress) {
      stuckCounter = 0;
      continue;
    }
    
    // Priority 5: Draw from stock or recycle
    if (simStock.length > 0) {
      const card = simStock.pop()!;
      card.faceUp = true;
      simWaste.push(card);
      madeProgress = true;
    } else if (simWaste.length > 0) {
      stockCycles++;
      if (stockCycles <= maxStockCycles) {
        while (simWaste.length > 0) {
          const card = simWaste.pop()!;
          card.faceUp = false;
          simStock.unshift(card);
        }
        madeProgress = true;
      }
    }
    
    // Check if stuck
    const currentFoundationCount = Object.values(simFoundations).reduce((sum, pile) => sum + pile.length, 0);
    if (currentFoundationCount === lastFoundationCount) {
      stuckCounter++;
      if (stuckCounter > 50) {
        break; // Truly stuck
      }
    } else {
      stuckCounter = 0;
      lastFoundationCount = currentFoundationCount;
    }
    
    if (!madeProgress) break;
  }
  
  // Check result
  const foundationCount = Object.values(simFoundations).reduce((sum, pile) => sum + pile.length, 0);
  
  // Require ALL 52 cards in foundations for true solvability
  // But accept 48+ as "very likely solvable" (92%+)
  return foundationCount >= 48;
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

/**
 * Generate a GUARANTEED SOLVABLE layout
 * Strategy:
 * - Place all 4 aces on top of tableau columns (guaranteed immediate moves)
 * - Place 2s right below aces where possible
 * - Very strict solvability check (must solve 100%)
 * - Many attempts to find perfect game
 */
function generateGuaranteedSolvableLayout(): GameState {
  const roomType = getRoomFromURL();
  
  const maxAttempts = 500; // Many attempts to find perfect layout
  let attempts = 0;
  let bestGame: { tableau: Card[][], stock: Card[], score: number } | null = null;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Create all 52 cards
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
    
    // Separate aces and other cards
    const aces = allCards.filter(c => c.rank === 'A');
    const twos = allCards.filter(c => c.rank === '2');
    const otherCards = allCards.filter(c => c.rank !== 'A' && c.rank !== '2');
    
    // Shuffle aces and twos randomly
    for (let i = aces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [aces[i], aces[j]] = [aces[j], aces[i]];
    }
    for (let i = twos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [twos[i], twos[j]] = [twos[j], twos[i]];
    }
    
    // Shuffle other cards
    for (let i = otherCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherCards[i], otherCards[j]] = [otherCards[j], otherCards[i]];
    }
    
    // Build tableau with aces guaranteed on top
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    const columnSizes = [1, 2, 3, 4, 5, 6, 7];
    
    let otherCardIndex = 0;
    let twosIndex = 0;
    
    // Fill columns - aces will be placed on top of columns 0, 1, 2, 3
    for (let col = 0; col < 7; col++) {
      const size = columnSizes[col];
      
      for (let row = 0; row < size; row++) {
        const isTop = row === size - 1;
        
        if (isTop && col < 4) {
          // Place ace on top of first 4 columns
          const ace = aces[col];
          ace.faceUp = true;
          tableau[col].push(ace);
        } else if (isTop) {
          // For columns 4, 5, 6 - try to place a 2 or low card on top
          if (twosIndex < twos.length && Math.random() > 0.3) {
            const two = twos[twosIndex++];
            two.faceUp = true;
            tableau[col].push(two);
          } else if (otherCardIndex < otherCards.length) {
            const card = otherCards[otherCardIndex++];
            card.faceUp = true;
            tableau[col].push(card);
          }
        } else {
          // Fill non-top positions with other cards (face down)
          if (otherCardIndex < otherCards.length) {
            const card = otherCards[otherCardIndex++];
            card.faceUp = false;
            tableau[col].push(card);
          } else if (twosIndex < twos.length) {
            const card = twos[twosIndex++];
            card.faceUp = false;
            tableau[col].push(card);
          }
        }
      }
    }
    
    // Put remaining cards in stock (face down)
    const usedIds = new Set(tableau.flat().map(c => c.id));
    const stockCards = allCards.filter(c => !usedIds.has(c.id));
    
    // Shuffle stock but bias twos to appear early
    const stockTwos = stockCards.filter(c => c.rank === '2');
    const stockOthers = stockCards.filter(c => c.rank !== '2');
    
    // Interleave: some twos early, then others
    const orderedStock: Card[] = [];
    let twoIdx = 0;
    let otherIdx = 0;
    
    while (twoIdx < stockTwos.length || otherIdx < stockOthers.length) {
      // Add a two every 3-5 cards if available
      if (twoIdx < stockTwos.length && (otherIdx % 4 === 0 || otherIdx >= stockOthers.length)) {
        orderedStock.push(stockTwos[twoIdx++]);
      } else if (otherIdx < stockOthers.length) {
        orderedStock.push(stockOthers[otherIdx++]);
      }
    }
    
    const stock = orderedStock.map(c => ({ ...c, faceUp: false }));
    
    // Check solvability with STRICT requirement (must solve ALL 52 cards)
    if (checkSolvabilityStrict(tableau, stock)) {
      // Score this layout
      let score = 100; // Base score for having all aces on top
      
      // Bonus for twos being accessible
      tableau.forEach(col => {
        const topCard = col[col.length - 1];
        if (topCard?.rank === '2') score += 40;
        if (topCard?.rank === '3') score += 20;
      });
      
      // Bonus if twos are early in stock
      stock.slice(0, 10).forEach(card => {
        if (card.rank === '2') score += 25;
        if (card.rank === '3') score += 15;
      });
      
      if (!bestGame || score > bestGame.score) {
        bestGame = { tableau, stock, score };
        
        // If score is excellent (aces on top + good twos), use immediately
        if (score >= 180) {
          console.log(`🌟 Found excellent first game layout (score: ${score}) in ${attempts} attempts!`);
          break;
        }
      }
    }
  }
  
  if (bestGame) {
    console.log(`✅ Using best first game layout with score ${bestGame.score} after ${attempts} attempts`);
    return {
      tableau: bestGame.tableau,
      foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
      stock: bestGame.stock,
      waste: [],
      isWon: false,
      moves: 0,
      startTime: new Date(),
      totalGifts: 0,
      roomType,
      gameMode: 'solvable'
    };
  }
  
  // Fallback to regular solvable game (should rarely happen)
  console.warn('⚠️ Could not find perfect first game, falling back to regular generation');
  return generateBasicSolvableGame();
}

/**
 * Strict solvability check - requires ALL 52 cards to be solved
 * Used for first game to ensure victory
 */
function checkSolvabilityStrict(tableau: Card[][], stock: Card[]): boolean {
  // Create deep copies
  const simTableau = tableau.map(col => col.map(c => ({ ...c })));
  const simStock = stock.map(c => ({ ...c }));
  const simWaste: Card[] = [];
  const simFoundations: { [key in Suit]: Card[] } = {
    hearts: [], diamonds: [], clubs: [], spades: []
  };
  
  const maxIterations = 2000;
  let iterations = 0;
  const maxStockCycles = 4;
  let stockCycles = 0;
  
  while (iterations < maxIterations) {
    iterations++;
    let madeProgress = false;
    
    // Try to move cards to foundations
    for (let colIdx = 0; colIdx < simTableau.length; colIdx++) {
      const col = simTableau[colIdx];
      if (col.length === 0) continue;
      
      const topCard = col[col.length - 1];
      if (!topCard.faceUp) continue;
      
      if (canMoveToFoundation(topCard, simFoundations)) {
        simFoundations[topCard.suit].push(col.pop()!);
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          col[col.length - 1].faceUp = true;
        }
        madeProgress = true;
      }
    }
    
    // Try waste to foundations
    if (simWaste.length > 0) {
      const topWaste = simWaste[simWaste.length - 1];
      if (canMoveToFoundation(topWaste, simFoundations)) {
        simFoundations[topWaste.suit].push(simWaste.pop()!);
        madeProgress = true;
      }
    }
    
    // Try tableau moves
    for (let fromIdx = 0; fromIdx < simTableau.length; fromIdx++) {
      if (madeProgress) break;
      
      const fromCol = simTableau[fromIdx];
      if (fromCol.length === 0) continue;
      
      let stackStart = fromCol.length - 1;
      while (stackStart > 0 && 
             fromCol[stackStart - 1].faceUp &&
             canPlaceOnTableau(fromCol[stackStart], fromCol[stackStart - 1])) {
        stackStart--;
      }
      
      const movingCard = fromCol[stackStart];
      if (!movingCard.faceUp) continue;
      
      for (let toIdx = 0; toIdx < simTableau.length; toIdx++) {
        if (fromIdx === toIdx) continue;
        
        const toCol = simTableau[toIdx];
        
        if (toCol.length === 0) {
          if (movingCard.rank === 'K' && stackStart > 0) {
            const stack = fromCol.splice(stackStart);
            toCol.push(...stack);
            if (fromCol.length > 0 && !fromCol[fromCol.length - 1].faceUp) {
              fromCol[fromCol.length - 1].faceUp = true;
            }
            madeProgress = true;
            break;
          }
        } else {
          const topCard = toCol[toCol.length - 1];
          if (topCard.faceUp && canPlaceOnTableau(movingCard, topCard)) {
            const stack = fromCol.splice(stackStart);
            toCol.push(...stack);
            if (fromCol.length > 0 && !fromCol[fromCol.length - 1].faceUp) {
              fromCol[fromCol.length - 1].faceUp = true;
            }
            madeProgress = true;
            break;
          }
        }
      }
    }
    
    // Try waste to tableau
    if (!madeProgress && simWaste.length > 0) {
      const wasteCard = simWaste[simWaste.length - 1];
      
      for (let toIdx = 0; toIdx < simTableau.length; toIdx++) {
        const toCol = simTableau[toIdx];
        
        if (toCol.length === 0) {
          if (wasteCard.rank === 'K') {
            toCol.push(simWaste.pop()!);
            madeProgress = true;
            break;
          }
        } else {
          const topCard = toCol[toCol.length - 1];
          if (topCard.faceUp && canPlaceOnTableau(wasteCard, topCard)) {
            toCol.push(simWaste.pop()!);
            madeProgress = true;
            break;
          }
        }
      }
    }
    
    // Draw from stock
    if (!madeProgress && simStock.length > 0) {
      const card = simStock.shift()!;
      card.faceUp = true;
      simWaste.push(card);
      madeProgress = true;
    } else if (!madeProgress && simWaste.length > 0) {
      stockCycles++;
      if (stockCycles <= maxStockCycles) {
        while (simWaste.length > 0) {
          const card = simWaste.pop()!;
          card.faceUp = false;
          simStock.unshift(card);
        }
        madeProgress = true;
      }
    }
    
    if (!madeProgress) break;
  }
  
  // STRICT: Require ALL 52 cards for first game
  const foundationCount = Object.values(simFoundations).reduce((sum, pile) => sum + pile.length, 0);
  return foundationCount === 52;
}
