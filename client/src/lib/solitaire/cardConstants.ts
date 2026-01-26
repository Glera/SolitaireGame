/**
 * Central constants for card dimensions and spacing
 * All card-related sizing should use these values for consistency
 */

// Card dimensions
export const CARD_WIDTH = 64;  // w-16 = 64px (previously w-20 = 80px)
export const CARD_HEIGHT = 104; // h-26 = 104px (previously h-24 = 96px)

// Stack offsets - distance between cards in a stack
// Desktop values
export const FACE_UP_OFFSET_DESKTOP = 33;   // Distance showing for face-up cards
export const FACE_DOWN_OFFSET_DESKTOP = 8;  // Distance showing for face-down cards

// Mobile values (slightly larger for touch targets)
export const FACE_UP_OFFSET_MOBILE = 36;
export const FACE_DOWN_OFFSET_MOBILE = 10;

/**
 * Get face-up card offset based on device
 */
export function getFaceUpOffset(isMobile: boolean): number {
  return isMobile ? FACE_UP_OFFSET_MOBILE : FACE_UP_OFFSET_DESKTOP;
}

/**
 * Get face-down card offset based on device
 */
export function getFaceDownOffset(isMobile: boolean): number {
  return isMobile ? FACE_DOWN_OFFSET_MOBILE : FACE_DOWN_OFFSET_DESKTOP;
}

/**
 * Get card offset based on face state and device
 */
export function getCardOffset(faceUp: boolean, isMobile: boolean): number {
  return faceUp ? getFaceUpOffset(isMobile) : getFaceDownOffset(isMobile);
}

/**
 * Check if we're on mobile device
 */
export function isMobileDevice(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
}
