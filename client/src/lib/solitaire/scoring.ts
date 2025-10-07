import { Card, Rank } from './types';

// Points for each card rank when moved to foundation
// Target: 1500 points total for all 52 cards (4 cards of each rank)
// Calculation: 1500 ÷ 52 = ~28.85 points per card average
// Let's distribute with progression from low to high cards:
export const CARD_POINTS: Record<Rank, number> = {
  'A': 19,   // 19 × 4 = 76
  '2': 21,   // 21 × 4 = 84  
  '3': 23,   // 23 × 4 = 92
  '4': 25,   // 25 × 4 = 100
  '5': 27,   // 27 × 4 = 108
  '6': 29,   // 29 × 4 = 116
  '7': 31,   // 31 × 4 = 124
  '8': 33,   // 33 × 4 = 132
  '9': 35,   // 35 × 4 = 140
  '10': 37,  // 37 × 4 = 148
  'J': 39,   // 39 × 4 = 156
  'Q': 41,   // 41 × 4 = 164
  'K': 43    // 43 × 4 = 172
};
// Total: 76+84+92+100+108+116+124+132+140+148+156+164+172 = 1512
// Perfect! Just 12 points over 1500, which is acceptable

// Set to track cards that have already been scored
const scoredCards = new Set<string>();

/**
 * Calculate points for a card moved to foundation
 * @param card The card being moved to foundation
 * @returns Points earned for this card (0 if already scored)
 */
export function calculateCardPoints(card: Card): number {
  // Check if this card has already been scored
  if (scoredCards.has(card.id)) {
    console.log(`🔄 Card ${card.suit}-${card.rank} already scored, no points awarded`);
    return 0;
  }

  let points = CARD_POINTS[card.rank];
  
  // Premium cards give 10x points
  if (card.isPremium) {
    points *= 10;
    console.log(`⭐ Premium card ${card.suit}-${card.rank} scored for ${points} points (10x multiplier)`);
  } else {
    console.log(`🎯 Card ${card.suit}-${card.rank} scored for ${points} points`);
  }
  
  scoredCards.add(card.id);
  return points;
}

/**
 * Calculate points for a card with breakdown info
 * @param card The card being moved to foundation
 * @returns Object with points and breakdown info
 */
export function calculateCardPointsWithBreakdown(card: Card): { points: number; breakdown?: { cardRank: string; points: number } } {
  // Check if this card has already been scored
  if (scoredCards.has(card.id)) {
    console.log(`🔄 Card ${card.suit}-${card.rank} already scored, no points awarded`);
    return { points: 0 };
  }

  let points = CARD_POINTS[card.rank];
  
  // Premium cards give 10x points
  if (card.isPremium) {
    points *= 10;
    console.log(`⭐ Premium card ${card.suit}-${card.rank} scored for ${points} points (10x multiplier)`);
  } else {
    console.log(`🎯 Card ${card.suit}-${card.rank} scored for ${points} points`);
  }
  
  scoredCards.add(card.id);
  
  return {
    points,
    breakdown: {
      cardRank: `${card.rank} ${card.suit}${card.isPremium ? ' ⭐' : ''}`,
      points
    }
  };
}

/**
 * Calculate points for a card without tracking (for current results calculation)
 * @param card The card to calculate points for
 * @returns Points for this card (always returns points, ignores scoring history)
 */
export function calculateCardPointsRaw(card: Card): number {
  let points = CARD_POINTS[card.rank];
  // Premium cards give 10x points
  if (card.isPremium) {
    points *= 10;
  }
  return points;
}

/**
 * Reset the scored cards set (called when starting a new game)
 */
export function resetScoredCards(): void {
  scoredCards.clear();
  console.log('🔄 Scored cards reset for new game');
}

/**
 * Get the total number of cards that have been scored
 */
export function getScoredCardsCount(): number {
  return scoredCards.size;
}

/**
 * Check if a card has already been scored
 */
export function isCardScored(cardId: string): boolean {
  return scoredCards.has(cardId);
}
