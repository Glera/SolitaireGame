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

// Level system: 
// - Level 1→2: 2 games max
// - Level 2→3: 2 games max (TEMP: same as level 2)
// - Level 3→4: 2 games max (TEMP: same as level 2)
// - Level N→N+1: min(N+1, 10) games max
// One win = ~102 XP (52 cards + 50 bonus)
const XP_PER_GAME = 102;
const MAX_GAMES_PER_LEVEL = 10;

// Helper to get games needed for a specific level transition
function getGamesNeededForLevel(targetLevel: number): number {
  // TEMP: Levels 2, 3, 4 all require 2 games
  if (targetLevel <= 4) {
    return 2;
  }
  return Math.min(targetLevel, MAX_GAMES_PER_LEVEL);
}

// Calculate XP needed to reach a specific level
function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  
  let totalXP = 0;
  for (let lvl = 2; lvl <= level; lvl++) {
    // Games needed to go from lvl-1 to lvl
    const gamesNeeded = getGamesNeededForLevel(lvl);
    totalXP += gamesNeeded * XP_PER_GAME;
  }
  return totalXP;
}

// Get XP needed to go from level to level+1
function getXPForNextLevel(level: number): number {
  const gamesNeeded = getGamesNeededForLevel(level + 1);
  return gamesNeeded * XP_PER_GAME;
}

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
  // Find current level by checking thresholds
  let level = 1;
  while (getXPForLevel(level + 1) <= totalXP) {
    level++;
    // Safety limit
    if (level > 1000) break;
  }
  
  const currentThreshold = getXPForLevel(level);
  const nextThreshold = getXPForLevel(level + 1);
  
  const xpInCurrentLevel = totalXP - currentThreshold;
  const xpNeededForNext = nextThreshold - currentThreshold;
  const progress = xpNeededForNext > 0 
    ? Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100) 
    : 100;
  
  return {
    level,
    progress,
    currentXP: xpInCurrentLevel,
    xpForNextLevel: xpNeededForNext,
    totalXP
  };
}
