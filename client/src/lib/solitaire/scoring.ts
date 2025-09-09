import { Card, Rank } from './types';

// Points for each card rank when moved to foundation
export const CARD_POINTS: Record<Rank, number> = {
  'A': 10,
  '2': 10,
  '3': 15,
  '4': 20,
  '5': 25,
  '6': 30,
  '7': 35,
  '8': 40,
  '9': 45,
  '10': 50,
  'J': 55,
  'Q': 60,
  'K': 65
};

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

  const points = CARD_POINTS[card.rank];
  scoredCards.add(card.id);
  
  console.log(`🎯 Card ${card.suit}-${card.rank} scored for ${points} points`);
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
