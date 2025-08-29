import { Card, Suit, Rank, Color } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const color: Color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        color,
        faceUp: false
      });
    }
  }
  
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRankValue(rank: Rank): number {
  switch (rank) {
    case 'A': return 1;
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    default: return parseInt(rank);
  }
}

export function canPlaceOnTableau(bottomCard: Card, topCard: Card): boolean {
  // Can place if colors are different and topCard rank is one less than bottomCard
  const colorsDifferent = bottomCard.color !== topCard.color;
  const bottomValue = getRankValue(bottomCard.rank);
  const topValue = getRankValue(topCard.rank);
  const rankValid = topValue === bottomValue - 1;
  
  return colorsDifferent && rankValid;
}

export function canPlaceOnFoundation(foundationCards: Card[], card: Card): boolean {
  if (foundationCards.length === 0) {
    // Can only place Ace on empty foundation
    return card.rank === 'A';
  }
  
  const topCard = foundationCards[foundationCards.length - 1];
  // Must be same suit and one rank higher
  return (
    topCard.suit === card.suit &&
    getRankValue(card.rank) === getRankValue(topCard.rank) + 1
  );
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
}

export function getSuitColor(suit: Suit): Color {
  return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
}
