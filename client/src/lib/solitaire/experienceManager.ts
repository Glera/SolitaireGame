// Experience (XP) Manager for player leveling system
// XP is earned by:
// - Moving cards to foundation: 1 XP per card (52 cards = 52 XP per game max)
// - Winning a game: 50 XP bonus

const XP_PER_CARD = 1;
const XP_WIN_BONUS = 50;

// Set to track cards that have already earned XP in current game
const xpEarnedCards = new Set<string>();

// Callback for when XP changes
let onXPChangeCallback: ((totalXP: number) => void) | null = null;

// Callback for when level up happens
let onLevelUpCallback: ((newLevel: number) => void) | null = null;

export function setOnXPChangeCallback(callback: (totalXP: number) => void) {
  onXPChangeCallback = callback;
}

export function setOnLevelUpCallback(callback: (newLevel: number) => void) {
  onLevelUpCallback = callback;
}

/**
 * Get total XP from localStorage
 */
export function getTotalXP(): number {
  const saved = localStorage.getItem('solitaire_player_xp');
  return saved ? parseInt(saved, 10) : 0;
}

/**
 * Save total XP to localStorage and check for level up
 */
function saveTotalXP(xp: number, prevXP: number): void {
  localStorage.setItem('solitaire_player_xp', xp.toString());
  
  // Check for level up
  const prevLevel = calculateLevel(prevXP).level;
  const newLevel = calculateLevel(xp).level;
  
  if (newLevel > prevLevel && onLevelUpCallback) {
    console.log(`🎉 Level up! ${prevLevel} -> ${newLevel}`);
    onLevelUpCallback(newLevel);
  }
  
  if (onXPChangeCallback) {
    onXPChangeCallback(xp);
  }
}

/**
 * Award XP for moving a card to foundation
 * @param cardId The unique ID of the card
 * @returns XP earned (0 if card was already counted)
 */
export function awardCardXP(cardId: string): number {
  if (xpEarnedCards.has(cardId)) {
    return 0;
  }
  
  xpEarnedCards.add(cardId);
  const currentXP = getTotalXP();
  const newXP = currentXP + XP_PER_CARD;
  saveTotalXP(newXP, currentXP);
  
  return XP_PER_CARD;
}

/**
 * Award XP for winning a game
 * @returns XP earned for the win
 */
export function awardWinXP(): number {
  const currentXP = getTotalXP();
  const newXP = currentXP + XP_WIN_BONUS;
  saveTotalXP(newXP, currentXP);
  
  console.log(`🏆 Win bonus: +${XP_WIN_BONUS} XP (Total: ${newXP})`);
  return XP_WIN_BONUS;
}

/**
 * Reset XP earned cards tracker (called when starting a new game)
 */
export function resetXPEarnedCards(): void {
  xpEarnedCards.clear();
}

/**
 * Reset all XP (for debug)
 */
export function resetAllXP(): void {
  localStorage.removeItem('solitaire_player_xp');
  xpEarnedCards.clear();
  if (onXPChangeCallback) {
    onXPChangeCallback(0);
  }
}

// Level thresholds - XP needed for each level
// First level up after ~2 games, then gradually harder
// One win = ~102 XP (52 cards + 50 bonus)
const LEVEL_THRESHOLDS = [
  0,      // Level 1: 0 XP
  150,    // Level 2: 150 XP (~2 games to level up)
  250,    // Level 3: 250 XP (+100)
  370,    // Level 4: 370 XP (+120)
  510,    // Level 5: 510 XP (+140)
  670,    // Level 6: 670 XP (+160)
  850,    // Level 7: 850 XP (+180)
  1050,   // Level 8: 1050 XP (+200)
  1280,   // Level 9: 1280 XP (+230)
  1540,   // Level 10: 1540 XP (+260)
  1830,   // Level 11: 1830 XP (+290)
  2150,   // Level 12: 2150 XP (+320)
  2500,   // Level 13: 2500 XP (+350)
  2880,   // Level 14: 2880 XP (+380)
  3300,   // Level 15: 3300 XP (+420)
  3760,   // Level 16: 3760 XP (+460)
  4260,   // Level 17: 4260 XP (+500)
  4800,   // Level 18: 4800 XP (+540)
  5380,   // Level 19: 5380 XP (+580)
  6000,   // Level 20: 6000 XP (+620)
  // After level 20, each level needs +650 more XP
];

// XP per level for levels beyond the threshold array
const XP_PER_LEVEL_AFTER_20 = 650;

export interface LevelInfo {
  level: number;
  progress: number;        // 0-100 percentage to next level
  currentXP: number;       // XP in current level
  xpForNextLevel: number;  // XP needed to reach next level
  totalXP: number;         // Total XP earned
}

/**
 * Calculate player level from total XP
 */
export function calculateLevel(totalXP: number): LevelInfo {
  let level = 1;
  
  // Find current level
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  
  // For levels beyond the threshold array
  if (level >= LEVEL_THRESHOLDS.length) {
    const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const extraXP = totalXP - lastThreshold;
    const extraLevels = Math.floor(extraXP / XP_PER_LEVEL_AFTER_20);
    level = LEVEL_THRESHOLDS.length + extraLevels;
  }
  
  // Calculate progress to next level
  let currentThreshold: number;
  let nextThreshold: number;
  
  if (level < LEVEL_THRESHOLDS.length) {
    currentThreshold = LEVEL_THRESHOLDS[level - 1];
    nextThreshold = LEVEL_THRESHOLDS[level];
  } else {
    // Beyond predefined thresholds
    const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const levelsAfterLast = level - LEVEL_THRESHOLDS.length;
    currentThreshold = lastThreshold + levelsAfterLast * XP_PER_LEVEL_AFTER_20;
    nextThreshold = currentThreshold + XP_PER_LEVEL_AFTER_20;
  }
  
  const xpInCurrentLevel = totalXP - currentThreshold;
  const xpNeededForNext = nextThreshold - currentThreshold;
  const progress = Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100);
  
  return {
    level,
    progress,
    currentXP: xpInCurrentLevel,
    xpForNextLevel: xpNeededForNext,
    totalXP
  };
}
