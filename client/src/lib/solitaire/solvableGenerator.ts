import { Card, GameState, Suit, Rank, Color } from './types';
import { getRoomFromURL, getPremiumCardsCount } from '../roomUtils';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Track if we've recently rearranged to avoid excessive operations
let lastRearrangeTime = 0;
const REARRANGE_COOLDOWN = 500; // ms

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
  console.log('🎲 Generating natural solvable layout...');
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
 * Generate a NATURAL but SOLVABLE layout
 * Strategy:
 * - 1-2 aces visible on top (not all 4 - that's too obvious)
 * - Low cards (2, 3) biased toward accessible positions
 * - Natural card distribution with solvability check
 * - Many attempts to find a good balance
 */
function generateGuaranteedSolvableLayout(): GameState {
  const roomType = getRoomFromURL();
  
  const maxAttempts = 800; // More attempts for finding natural solvable layout
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
    
    // Shuffle all cards first
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    
    // Separate by rank for strategic placement
    const aces = allCards.filter(c => c.rank === 'A');
    const twos = allCards.filter(c => c.rank === '2');
    const threes = allCards.filter(c => c.rank === '3');
    const lowCards = allCards.filter(c => ['4', '5', '6'].includes(c.rank));
    const otherCards = allCards.filter(c => !['A', '2', '3', '4', '5', '6'].includes(c.rank));
    
    // Shuffle each group
    [aces, twos, threes, lowCards, otherCards].forEach(group => {
      for (let i = group.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
    });
    
    // Decide how many aces to place on top (1-2 mostly, rarely 3 for naturalness)
    const acesRoll = Math.random();
    const acesOnTop = acesRoll < 0.4 ? 1 : (acesRoll < 0.85 ? 2 : 3); // 40% = 1 ace, 45% = 2 aces, 15% = 3 aces
    
    // Build tableau
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    const columnSizes = [1, 2, 3, 4, 5, 6, 7];
    
    // Create pool of cards for tableau, biasing low cards to be face-up
    const faceUpPool: Card[] = [];
    const faceDownPool: Card[] = [];
    
    // Add selected aces for face-up positions
    for (let i = 0; i < acesOnTop; i++) {
      if (aces[i]) faceUpPool.push(aces[i]);
    }
    // Remaining aces go to face-down pool or stock
    for (let i = acesOnTop; i < aces.length; i++) {
      faceDownPool.push(aces[i]);
    }
    
    // Add some twos/threes to face-up pool (more for higher win rate)
    const twosForFaceUp = Math.floor(Math.random() * 2) + 2; // 2-3 twos visible
    for (let i = 0; i < twosForFaceUp && i < twos.length; i++) {
      faceUpPool.push(twos[i]);
    }
    for (let i = twosForFaceUp; i < twos.length; i++) {
      faceDownPool.push(twos[i]);
    }
    
    // Add some threes (more for higher win rate)
    const threesForFaceUp = Math.floor(Math.random() * 2) + 1; // 1-2 threes visible
    for (let i = 0; i < threesForFaceUp && i < threes.length; i++) {
      faceUpPool.push(threes[i]);
    }
    for (let i = threesForFaceUp; i < threes.length; i++) {
      faceDownPool.push(threes[i]);
    }
    
    // Add low cards and others to face-down pool
    faceDownPool.push(...lowCards, ...otherCards);
    
    // Shuffle pools
    for (let i = faceUpPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [faceUpPool[i], faceUpPool[j]] = [faceUpPool[j], faceUpPool[i]];
    }
    for (let i = faceDownPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [faceDownPool[i], faceDownPool[j]] = [faceDownPool[j], faceDownPool[i]];
    }
    
    let faceUpIdx = 0;
    let faceDownIdx = 0;
    
    // Fill columns
    for (let col = 0; col < 7; col++) {
      const size = columnSizes[col];
      
      for (let row = 0; row < size; row++) {
        const isTop = row === size - 1;
        
        if (isTop) {
          // Top card - try to use from face-up pool
          if (faceUpIdx < faceUpPool.length) {
            const card = faceUpPool[faceUpIdx++];
            card.faceUp = true;
            tableau[col].push(card);
          } else if (faceDownIdx < faceDownPool.length) {
            const card = faceDownPool[faceDownIdx++];
            card.faceUp = true;
            tableau[col].push(card);
          }
        } else {
          // Not top - use face-down cards
          if (faceDownIdx < faceDownPool.length) {
            const card = faceDownPool[faceDownIdx++];
            card.faceUp = false;
            tableau[col].push(card);
          } else if (faceUpIdx < faceUpPool.length) {
            const card = faceUpPool[faceUpIdx++];
            card.faceUp = false;
            tableau[col].push(card);
          }
        }
      }
    }
    
    // Put remaining cards in stock
    const usedIds = new Set(tableau.flat().map(c => c.id));
    const stockCards = allCards.filter(c => !usedIds.has(c.id));
    
    // Shuffle stock but place remaining aces/twos in first half
    const stockAces = stockCards.filter(c => c.rank === 'A');
    const stockTwos = stockCards.filter(c => c.rank === '2');
    const stockThrees = stockCards.filter(c => c.rank === '3');
    const stockOthers = stockCards.filter(c => !['A', '2', '3'].includes(c.rank));
    
    // Shuffle others
    for (let i = stockOthers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stockOthers[i], stockOthers[j]] = [stockOthers[j], stockOthers[i]];
    }
    
    // Interleave low cards into first half of stock
    const orderedStock: Card[] = [];
    const importantCards = [...stockAces, ...stockTwos, ...stockThrees];
    
    // Shuffle important cards
    for (let i = importantCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [importantCards[i], importantCards[j]] = [importantCards[j], importantCards[i]];
    }
    
    let importantIdx = 0;
    let otherIdx = 0;
    
    // Place important cards in roughly first 2/3 of stock
    const totalStock = stockCards.length;
    const importantZone = Math.floor(totalStock * 0.7);
    
    for (let i = 0; i < totalStock; i++) {
      if (importantIdx < importantCards.length && i < importantZone && (i % 3 === 0 || otherIdx >= stockOthers.length)) {
        orderedStock.push(importantCards[importantIdx++]);
      } else if (otherIdx < stockOthers.length) {
        orderedStock.push(stockOthers[otherIdx++]);
      } else if (importantIdx < importantCards.length) {
        orderedStock.push(importantCards[importantIdx++]);
      }
    }
    
    const stock = orderedStock.map(c => ({ ...c, faceUp: false }));
    
    // Check solvability - require at least 85% completion (more forgiving for higher win rate)
    const solveResult = checkSolvabilityFlexible(tableau, stock);
    if (solveResult.solved >= 44) { // At least 44 out of 52 cards (85%)
      // Score this layout - prefer more natural distributions
      let score = solveResult.solved * 2;
      
      // Count visible aces
      const visibleAces = tableau.reduce((count, col) => {
        const top = col[col.length - 1];
        return count + (top?.rank === 'A' ? 1 : 0);
      }, 0);
      
      // Penalty for all 4 aces visible (too obvious)
      if (visibleAces >= 4) score -= 30;
      // Bonus for 2-3 aces (good balance of win rate and naturalness)
      if (visibleAces === 2 || visibleAces === 3) score += 30;
      if (visibleAces === 1) score += 10; // Still acceptable but less preferred
      
      // Bonus for some variety in top cards
      const topRanks = new Set(tableau.map(col => col[col.length - 1]?.rank).filter(Boolean));
      score += topRanks.size * 5;
      
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
 * Flexible solvability check - returns how many cards could be moved to foundations
 * Used for natural layouts that don't need to be 100% solvable
 */
function checkSolvabilityFlexible(tableau: Card[][], stock: Card[]): { solved: number } {
  // Create deep copies
  const simTableau = tableau.map(col => col.map(c => ({ ...c })));
  const simStock = stock.map(c => ({ ...c }));
  const simWaste: Card[] = [];
  const simFoundations: { [key in Suit]: Card[] } = {
    hearts: [], diamonds: [], clubs: [], spades: []
  };
  
  const maxIterations = 3000;
  let iterations = 0;
  const maxStockCycles = 8; // More cycles to find solutions
  let stockCycles = 0;
  
  while (iterations < maxIterations) {
    iterations++;
    let madeProgress = false;
    
    // Try to move cards to foundations from tableau
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
          if (canPlaceOnTableau(movingCard, topCard)) {
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
      const topWaste = simWaste[simWaste.length - 1];
      for (let toIdx = 0; toIdx < simTableau.length; toIdx++) {
        const toCol = simTableau[toIdx];
        if (toCol.length === 0) {
          if (topWaste.rank === 'K') {
            toCol.push(simWaste.pop()!);
            madeProgress = true;
            break;
          }
        } else {
          const topCard = toCol[toCol.length - 1];
          if (canPlaceOnTableau(topWaste, topCard)) {
            toCol.push(simWaste.pop()!);
            madeProgress = true;
            break;
          }
        }
      }
    }
    
    // Draw from stock
    if (!madeProgress) {
      if (simStock.length > 0) {
        simWaste.push(simStock.pop()!);
        madeProgress = true;
      } else if (simWaste.length > 0 && stockCycles < maxStockCycles) {
        while (simWaste.length > 0) {
          simStock.push(simWaste.pop()!);
        }
        stockCycles++;
        madeProgress = true;
      }
    }
    
    if (!madeProgress) break;
  }
  
  // Count solved cards (cards in foundations)
  const solvedCount = Object.values(simFoundations).reduce((sum, pile) => sum + pile.length, 0);
  return { solved: solvedCount };
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

/**
 * DYNAMIC SOLVABILITY CHECK AND CORRECTION
 * Called after each move that reveals a face-down card.
 * If the game becomes unsolvable, rearranges hidden cards to restore solvability.
 */
export function ensureSolvability(gameState: GameState): GameState {
  // Skip if game is already won
  if (gameState.isWon) return gameState;
  
  // Cooldown to avoid excessive operations
  const now = Date.now();
  if (now - lastRearrangeTime < REARRANGE_COOLDOWN) {
    return gameState;
  }
  
  // Count hidden cards - if very few left, no need to check
  const hiddenInTableau = gameState.tableau.reduce((count, col) => 
    count + col.filter(c => !c.faceUp).length, 0);
  const stockCount = gameState.stock.length;
  
  if (hiddenInTableau + stockCount < 3) {
    // Too few hidden cards to meaningfully rearrange
    return gameState;
  }
  
  // Check current solvability
  const { solved } = checkCurrentSolvability(gameState);
  
  // If solvable enough (90%+), don't intervene
  if (solved >= 47) { // 47/52 = ~90%
    return gameState;
  }
  
  console.log(`🔄 Game solvability dropped to ${solved}/52, rearranging hidden cards...`);
  lastRearrangeTime = now;
  
  // Collect all hidden cards (face-down in tableau + stock)
  const hiddenCards: Card[] = [];
  const faceDownPositions: { col: number; row: number }[] = [];
  
  // Collect face-down cards from tableau
  for (let col = 0; col < gameState.tableau.length; col++) {
    for (let row = 0; row < gameState.tableau[col].length; row++) {
      const card = gameState.tableau[col][row];
      if (!card.faceUp) {
        hiddenCards.push({ ...card });
        faceDownPositions.push({ col, row });
      }
    }
  }
  
  // Collect stock cards
  const stockCards = gameState.stock.map(c => ({ ...c }));
  hiddenCards.push(...stockCards);
  
  // Try to find a better arrangement
  const maxAttempts = 100;
  let bestArrangement: { tableau: Card[][]; stock: Card[]; solved: number } | null = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Shuffle hidden cards
    const shuffled = [...hiddenCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Build new tableau with rearranged hidden cards
    const newTableau = gameState.tableau.map(col => col.map(c => ({ ...c })));
    let shuffledIdx = 0;
    
    // Replace face-down cards in tableau
    for (const pos of faceDownPositions) {
      if (shuffledIdx < shuffled.length) {
        const newCard = shuffled[shuffledIdx++];
        newCard.faceUp = false;
        newTableau[pos.col][pos.row] = newCard;
      }
    }
    
    // Remaining shuffled cards go to stock
    const newStock = shuffled.slice(shuffledIdx).map(c => ({ ...c, faceUp: false }));
    
    // Check solvability of this arrangement
    const result = checkCurrentSolvabilityWithState(newTableau, newStock, gameState.waste, gameState.foundations);
    
    if (result.solved > (bestArrangement?.solved ?? 0)) {
      bestArrangement = { tableau: newTableau, stock: newStock, solved: result.solved };
      
      // If we found a highly solvable arrangement (95%+), use it
      if (result.solved >= 49) {
        console.log(`✅ Found excellent arrangement (${result.solved}/52) in ${attempt + 1} attempts`);
        break;
      }
    }
  }
  
  // Use best arrangement found, or return original if nothing better
  if (bestArrangement && bestArrangement.solved > solved) {
    console.log(`✅ Improved solvability from ${solved}/52 to ${bestArrangement.solved}/52`);
    return {
      ...gameState,
      tableau: bestArrangement.tableau,
      stock: bestArrangement.stock
    };
  }
  
  console.log(`⚠️ Could not improve solvability (${solved}/52)`);
  return gameState;
}

/**
 * Check solvability of current game state
 */
function checkCurrentSolvability(gameState: GameState): { solved: number } {
  return checkCurrentSolvabilityWithState(
    gameState.tableau,
    gameState.stock,
    gameState.waste,
    gameState.foundations
  );
}

/**
 * Check solvability with explicit state components
 */
function checkCurrentSolvabilityWithState(
  tableau: Card[][],
  stock: Card[],
  waste: Card[],
  foundations: { [key in Suit]: Card[] }
): { solved: number } {
  // Create deep copies for simulation
  const simTableau = tableau.map(col => col.map(c => ({ ...c })));
  const simStock = stock.map(c => ({ ...c }));
  const simWaste = waste.map(c => ({ ...c }));
  const simFoundations: { [key in Suit]: Card[] } = {
    hearts: foundations.hearts.map(c => ({ ...c })),
    diamonds: foundations.diamonds.map(c => ({ ...c })),
    clubs: foundations.clubs.map(c => ({ ...c })),
    spades: foundations.spades.map(c => ({ ...c }))
  };
  
  const maxIterations = 2000;
  let iterations = 0;
  const maxStockCycles = 5;
  let stockCycles = 0;
  
  while (iterations < maxIterations) {
    iterations++;
    let madeProgress = false;
    
    // Try to move cards to foundations from tableau
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
          if (canPlaceOnTableau(movingCard, topCard)) {
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
      const topWaste = simWaste[simWaste.length - 1];
      for (let toIdx = 0; toIdx < simTableau.length; toIdx++) {
        const toCol = simTableau[toIdx];
        if (toCol.length === 0) {
          if (topWaste.rank === 'K') {
            toCol.push(simWaste.pop()!);
            madeProgress = true;
            break;
          }
        } else {
          const topCard = toCol[toCol.length - 1];
          if (canPlaceOnTableau(topWaste, topCard)) {
            toCol.push(simWaste.pop()!);
            madeProgress = true;
            break;
          }
        }
      }
    }
    
    // Draw from stock
    if (!madeProgress) {
      if (simStock.length > 0) {
        simWaste.push(simStock.pop()!);
        madeProgress = true;
      } else if (simWaste.length > 0 && stockCycles < maxStockCycles) {
        while (simWaste.length > 0) {
          simStock.push(simWaste.pop()!);
        }
        stockCycles++;
        madeProgress = true;
      }
    }
    
    if (!madeProgress) break;
  }
  
  // Count solved cards
  const solvedCount = Object.values(simFoundations).reduce((sum, pile) => sum + pile.length, 0);
  return { solved: solvedCount };
}
