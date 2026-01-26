import { Card } from './types';
import { 
  getFaceUpOffset, 
  getFaceDownOffset, 
  CARD_HEIGHT 
} from './cardConstants';

/**
 * Calculate vertical offsets for a stack of cards with dynamic compression
 * Compresses the stack if it would exceed available height
 */
export function calculateStackOffsets(
  cards: Card[],
  availableHeight: number,
  isMobile: boolean
): number[] {
  if (cards.length === 0) return [];
  
  // Standard offsets from central constants (will be compressed if needed)
  const standardFaceUpOffset = getFaceUpOffset(isMobile);
  const standardFaceDownOffset = getFaceDownOffset(isMobile);
  const cardHeight = CARD_HEIGHT;
  
  // Calculate total height with standard offsets
  let totalHeightNeeded = cardHeight; // First card height
  for (let i = 0; i < cards.length - 1; i++) {
    totalHeightNeeded += cards[i].faceUp ? standardFaceUpOffset : standardFaceDownOffset;
  }
  
  // Calculate compression factor if stack is too tall
  let compressionFactor = 1;
  if (totalHeightNeeded > availableHeight) {
    // Calculate how much we need to compress
    // Keep first card full size, compress only the offsets
    const offsetsHeight = totalHeightNeeded - cardHeight;
    const availableForOffsets = availableHeight - cardHeight;
    // Min 65% of original to keep card ranks readable (34px for mobile, 31px for desktop)
    compressionFactor = Math.max(0.65, availableForOffsets / offsetsHeight);
  }
  
  // Apply compression to offsets
  const faceUpOffset = standardFaceUpOffset * compressionFactor;
  const faceDownOffset = standardFaceDownOffset * compressionFactor;
  
  // Calculate cumulative offsets for each card
  const offsets: number[] = [0]; // First card at 0
  for (let i = 1; i < cards.length; i++) {
    const prevCard = cards[i - 1];
    const prevOffset = offsets[i - 1];
    offsets.push(prevOffset + (prevCard.faceUp ? faceUpOffset : faceDownOffset));
  }
  
  return offsets;
}

/**
 * Get the vertical offset between stacked cards (for animations and drag previews)
 */
export function getStackCardOffset(isMobile: boolean, availableHeight?: number): number {
  // Use central constants for face-up offset
  return getFaceUpOffset(isMobile);
}


