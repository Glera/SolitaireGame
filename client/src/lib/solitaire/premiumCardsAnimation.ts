import { Card } from './types';

// Get all premium cards from the game field
export function getPremiumCardsFromTableau(tableau: Card[][]): { card: Card; columnIndex: number; cardIndex: number }[] {
  const premiumCards: { card: Card; columnIndex: number; cardIndex: number }[] = [];
  
  tableau.forEach((column, columnIndex) => {
    column.forEach((card, cardIndex) => {
      if (card.isPremium) {
        premiumCards.push({ card, columnIndex, cardIndex });
      }
    });
  });
  
  return premiumCards;
}

// Animate premium cards reveal - cards transform into premium one by one
export async function animatePremiumCardsReveal(
  premiumCards: { card: Card; columnIndex: number; cardIndex: number }[],
  delayBetweenCards: number = 300
): Promise<void> {
  console.log(`⭐ Starting premium cards reveal animation for ${premiumCards.length} cards`);
  
  // Premium cards already have data-premium-hidden="true" set on render
  // Now reveal them one by one
  for (const { card, columnIndex, cardIndex } of premiumCards) {
    await new Promise(resolve => setTimeout(resolve, delayBetweenCards));
    
    // Find all card elements with this ID (could be in multiple places)
    const cardElements = document.querySelectorAll(`[data-card-id="${card.id}"]`);
    
    cardElements.forEach(cardElement => {
      const el = cardElement as HTMLElement;
      
      // Add animation class for pulsing effect FIRST (still hidden)
      el.classList.add('premium-card-reveal');
      
      console.log(`⭐ Revealing premium card: ${card.rank} ${card.suit} at column ${columnIndex}`);
      
      // After a tiny delay, remove hidden flag to show premium styling
      setTimeout(() => {
        el.removeAttribute('data-premium-hidden');
      }, 10);
      
      // Remove animation class after animation completes
      setTimeout(() => {
        el.classList.remove('premium-card-reveal');
      }, 500);
    });
  }
  
  console.log('⭐ Premium cards reveal animation completed');
}

