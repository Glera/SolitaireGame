// Leaderboard system - groups of 20 players sorted by season stars

export interface LeaderboardPlayer {
  id: string;
  name: string;
  avatar: string;
  stars: number; // Stars earned this season
  isCurrentUser: boolean;
  // Behavior patterns for realistic simulation
  isActive: boolean;       // false = stopped playing (inactive)
  activityLevel: number;   // 0-1: how often they play (0.1 = rarely, 1 = very active)
  burstChance: number;     // 0-1: chance of making a big jump in stars
  lastActive: number;      // timestamp of last activity
}

export interface SeasonInfo {
  seasonId: string;
  seasonNumber: number;
  endTime: number; // timestamp
}

export interface LeaderboardTrophy {
  id: string;
  seasonNumber: number;
  place: 1 | 2 | 3;
  stars: number;
  earnedAt: number; // timestamp
}

const FAKE_NAMES = [
  'Алексей', 'Мария', 'Дмитрий', 'Анна', 'Сергей', 'Елена', 'Иван', 'Ольга',
  'Михаил', 'Наталья', 'Андрей', 'Татьяна', 'Павел', 'Екатерина', 'Николай',
  'Светлана', 'Александр', 'Юлия', 'Владимир', 'Ирина', 'Артём', 'Виктория',
  'Максим', 'Людмила', 'Денис', 'Марина', 'Роман', 'Валентина', 'Евгений'
];

const AVATARS = ['👤', '👩', '👨', '🧑', '👱', '👴', '👵', '🧔', '👸', '🤴', '🦊', '🐱', '🐶', '🐻', '🐼'];

const LEADERBOARD_KEY = 'solitaire_leaderboard';
const LEADERBOARD_POSITION_KEY = 'solitaire_leaderboard_position';
const SEASON_INFO_KEY = 'solitaire_season_info';
const SEASON_STARS_KEY = 'solitaire_season_stars';
const LEADERBOARD_TROPHIES_KEY = 'solitaire_leaderboard_trophies';

// Season duration: 15 days (same as donation progress)
const SEASON_DURATION_MS = 15 * 24 * 60 * 60 * 1000;

// Generate a random fake player with realistic behavior patterns
function generateFakePlayer(index: number, maxStars: number): LeaderboardPlayer {
  const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  
  // Realistic distribution of player types:
  // ~15% ghost (registered but never played - 0 stars)
  // ~25% churned (played once/twice then quit - very low stars)
  // ~30% casual (plays occasionally - low-medium stars)
  // ~20% regular (plays often - medium-high stars)
  // ~10% hardcore (very active - high stars, can burst)
  const roll = Math.random();
  let isActive = true;
  let activityLevel = 0.5;
  let burstChance = 0.1;
  let stars = 0;
  
  if (roll < 0.15) {
    // Ghost player - registered but never really played
    isActive = false;
    activityLevel = 0;
    burstChance = 0;
    stars = 0; // Zero stars!
  } else if (roll < 0.40) {
    // Churned player - tried the game, quit early
    isActive = false;
    activityLevel = 0;
    burstChance = 0;
    // Very low stars: 1-15% of max, exponential distribution favoring low end
    const lowRoll = Math.pow(Math.random(), 2); // Square for exponential bias toward 0
    stars = Math.floor(lowRoll * maxStars * 0.15) + Math.floor(Math.random() * 5);
  } else if (roll < 0.70) {
    // Casual - plays occasionally, inconsistent
    isActive = Math.random() > 0.3; // 70% chance still active
    activityLevel = 0.05 + Math.random() * 0.15; // 0.05-0.2 (very low activity)
    burstChance = 0.02; // Rarely bursts
    // Low-medium stars: 5-40% of max, slight exponential bias
    const casualRoll = Math.pow(Math.random(), 1.3);
    stars = Math.floor(casualRoll * maxStars * 0.4) + Math.floor(Math.random() * 10);
  } else if (roll < 0.90) {
    // Regular - plays fairly often
    isActive = Math.random() > 0.1; // 90% chance still active
    activityLevel = 0.2 + Math.random() * 0.3; // 0.2-0.5
    burstChance = 0.1; // Sometimes bursts
    // Medium-high stars: 20-70% of max
    stars = Math.floor(maxStars * 0.2 + Math.random() * maxStars * 0.5);
  } else {
    // Hardcore - very active, dominates
    isActive = true; // Always active
    activityLevel = 0.5 + Math.random() * 0.5; // 0.5-1.0
    burstChance = 0.25; // Often bursts
    // High stars: 50-100% of max
    stars = Math.floor(maxStars * 0.5 + Math.random() * maxStars * 0.5);
  }
  
  return {
    id: `fake_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name,
    avatar,
    stars,
    isCurrentUser: false,
    isActive,
    activityLevel,
    burstChance,
    lastActive: Date.now() - Math.floor(Math.random() * 72 * 60 * 60 * 1000) // Random time in last 72h
  };
}

// Get or create current season info
export function getSeasonInfo(): SeasonInfo {
  const stored = localStorage.getItem(SEASON_INFO_KEY);
  
  if (stored) {
    try {
      const info = JSON.parse(stored) as SeasonInfo;
      // Check if season is still valid
      if (info.endTime > Date.now()) {
        return info;
      }
      // Season expired - will create new one below
    } catch {
      // Fall through to create new
    }
  }
  
  // Create new season
  const newSeason: SeasonInfo = {
    seasonId: `season_${Date.now()}`,
    seasonNumber: getNextSeasonNumber(),
    endTime: Date.now() + SEASON_DURATION_MS
  };
  
  localStorage.setItem(SEASON_INFO_KEY, JSON.stringify(newSeason));
  return newSeason;
}

function getNextSeasonNumber(): number {
  const trophies = getLeaderboardTrophies();
  if (trophies.length === 0) return 1;
  const maxSeason = Math.max(...trophies.map(t => t.seasonNumber));
  return maxSeason + 1;
}

// Get player's season stars (personal, not shared)
export function getSeasonStars(): number {
  const stored = localStorage.getItem(SEASON_STARS_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

// Add stars to season count
export function addSeasonStars(amount: number): number {
  const current = getSeasonStars();
  const newTotal = current + amount;
  localStorage.setItem(SEASON_STARS_KEY, newTotal.toString());
  return newTotal;
}

// Reset season stars (called when new season starts)
export function resetSeasonStars(): void {
  localStorage.setItem(SEASON_STARS_KEY, '0');
}

// Get leaderboard trophies
export function getLeaderboardTrophies(): LeaderboardTrophy[] {
  const stored = localStorage.getItem(LEADERBOARD_TROPHIES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

// Add a trophy
export function addLeaderboardTrophy(trophy: LeaderboardTrophy): void {
  const trophies = getLeaderboardTrophies();
  trophies.push(trophy);
  localStorage.setItem(LEADERBOARD_TROPHIES_KEY, JSON.stringify(trophies));
}

// Check if season ended and award trophy if in top 3
export function checkSeasonEnd(): { 
  seasonEnded: boolean; 
  trophy?: LeaderboardTrophy;
  oldSeason?: SeasonInfo;
} {
  const storedInfo = localStorage.getItem(SEASON_INFO_KEY);
  if (!storedInfo) return { seasonEnded: false };
  
  try {
    const info = JSON.parse(storedInfo) as SeasonInfo;
    
    if (info.endTime > Date.now()) {
      return { seasonEnded: false };
    }
    
    // Season ended!
    const players = initializeLeaderboard(getSeasonStars());
    const position = getCurrentUserPosition(players);
    const userStars = getSeasonStars();
    
    let trophy: LeaderboardTrophy | undefined;
    
    // Award trophy if in top 3
    if (position <= 3 && userStars > 0) {
      trophy = {
        id: `trophy_${info.seasonId}`,
        seasonNumber: info.seasonNumber,
        place: position as 1 | 2 | 3,
        stars: userStars,
        earnedAt: Date.now()
      };
      addLeaderboardTrophy(trophy);
    }
    
    // Reset for new season
    resetSeasonStars();
    localStorage.removeItem(LEADERBOARD_KEY);
    localStorage.removeItem(LEADERBOARD_POSITION_KEY);
    localStorage.removeItem(SEASON_INFO_KEY);
    
    // Create new season
    getSeasonInfo();
    
    return { seasonEnded: true, trophy, oldSeason: info };
  } catch {
    return { seasonEnded: false };
  }
}

// Initialize leaderboard with 19 fake players + current user
export function initializeLeaderboard(currentUserSeasonStars: number): LeaderboardPlayer[] {
  const seasonInfo = getSeasonInfo();
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  
  if (stored) {
    try {
      const data = JSON.parse(stored);
      // Check if leaderboard is for current season
      if (data.seasonId === seasonInfo.seasonId) {
        const players = data.players as LeaderboardPlayer[];
        // Update current user's stars
        const updated = players.map(p => 
          p.isCurrentUser ? { ...p, stars: currentUserSeasonStars } : p
        );
        return sortLeaderboard(updated);
      }
      // Different season - fall through to create new
    } catch {
      // Fall through to create new
    }
  }
  
  // Create new leaderboard
  // If user has 0 stars (fresh start/reset), create low-star players for fair competition
  // Otherwise base on season progress
  let maxFakeStars: number;
  if (currentUserSeasonStars === 0) {
    // Fresh start - all players start with low stars (0-15 range)
    maxFakeStars = 15;
  } else {
    // Ongoing season - scale based on progress
    const seasonProgress = (Date.now() - (seasonInfo.endTime - SEASON_DURATION_MS)) / SEASON_DURATION_MS;
    maxFakeStars = Math.max(50, Math.floor(500 * seasonProgress) + 100);
  }
  
  const fakePlayers: LeaderboardPlayer[] = [];
  for (let i = 0; i < 19; i++) {
    fakePlayers.push(generateFakePlayer(i, maxFakeStars));
  }
  
  // Add current user
  const currentUser: LeaderboardPlayer = {
    id: 'current_user',
    name: 'Вы',
    avatar: '⭐',
    stars: currentUserSeasonStars,
    isCurrentUser: true,
    isActive: true,
    activityLevel: 1,
    burstChance: 0,
    lastActive: Date.now()
  };
  
  const allPlayers = [...fakePlayers, currentUser];
  const sorted = sortLeaderboard(allPlayers);
  saveLeaderboard(sorted, seasonInfo.seasonId);
  
  return sorted;
}

// Sort leaderboard by stars (descending)
function sortLeaderboard(players: LeaderboardPlayer[]): LeaderboardPlayer[] {
  return [...players].sort((a, b) => b.stars - a.stars);
}

// Save leaderboard to localStorage
function saveLeaderboard(players: LeaderboardPlayer[], seasonId: string): void {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify({ seasonId, players }));
}

// Get current user's position (1-based)
export function getCurrentUserPosition(players: LeaderboardPlayer[]): number {
  const index = players.findIndex(p => p.isCurrentUser);
  return index + 1;
}

// Get stored previous position
export function getPreviousPosition(): number {
  const stored = localStorage.getItem(LEADERBOARD_POSITION_KEY);
  return stored ? parseInt(stored, 10) : 20;
}

// Save current position
export function saveCurrentPosition(position: number): void {
  localStorage.setItem(LEADERBOARD_POSITION_KEY, position.toString());
}

// Update current user's stars and check for position change
export function updateCurrentUserStars(newSeasonStars: number): {
  players: LeaderboardPlayer[];
  oldPosition: number;
  newPosition: number;
  positionImproved: boolean;
} {
  const previousPosition = getPreviousPosition();
  let players = initializeLeaderboard(newSeasonStars);
  
  // Update current user's stars
  players = players.map(p => 
    p.isCurrentUser ? { ...p, stars: newSeasonStars } : p
  );
  
  // Re-sort
  players = sortLeaderboard(players);
  const seasonInfo = getSeasonInfo();
  saveLeaderboard(players, seasonInfo.seasonId);
  
  const newPosition = getCurrentUserPosition(players);
  const positionImproved = newPosition < previousPosition;
  
  if (positionImproved) {
    saveCurrentPosition(newPosition);
  }
  
  return {
    players,
    oldPosition: previousPosition,
    newPosition,
    positionImproved
  };
}

// Simulate other players gaining stars (called periodically)
// Realistic simulation with different player behaviors
export function simulateOtherPlayers(): {
  players: LeaderboardPlayer[];
  overtaken: boolean; // true if someone just passed you
} {
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  if (!stored) return { players: [], overtaken: false };
  
  try {
    const data = JSON.parse(stored);
    let players = data.players as LeaderboardPlayer[];
    
    // Find current user position and stars
    const userIndex = players.findIndex(p => p.isCurrentUser);
    const userStars = players[userIndex]?.stars || 0;
    const userPosition = userIndex + 1;
    
    let overtaken = false;
    const now = Date.now();
    
    // ============ DYNAMIC PLAYER BEHAVIOR ============
    // Each player acts based on their individual characteristics
    
    players = players.map((player, idx) => {
      if (player.isCurrentUser) return player;
      
      // Ensure player has behavior fields (for backwards compatibility)
      const isActive = player.isActive ?? true;
      const activityLevel = player.activityLevel ?? 0.5;
      const burstChance = player.burstChance ?? 0.1;
      
      // Ghost players (0 stars, never played) - 1% chance to finally start playing
      if (player.stars === 0 && !isActive) {
        if (Math.random() < 0.01) {
          // Ghost finally starts playing!
          return {
            ...player,
            isActive: true,
            activityLevel: 0.1 + Math.random() * 0.2, // Usually casual
            burstChance: 0.05,
            stars: Math.floor(Math.random() * 5) + 3, // First session: 3-8 stars
            lastActive: now
          };
        }
        return player; // Still a ghost
      }
      
      // Inactive players (churned) - very rare comeback (0.5%)
      if (!isActive) {
        if (Math.random() < 0.005) {
          // Comeback! But usually short-lived
          return { 
            ...player, 
            isActive: true, 
            activityLevel: 0.1 + Math.random() * 0.15, // Low activity on return
            burstChance: 0.03,
            lastActive: now 
          };
        }
        return player; // Still inactive
      }
      
      // Active players can become inactive
      // Higher activity players are less likely to quit
      const quitChance = 0.08 * (1 - activityLevel); // 0-8% based on activity
      if (Math.random() < quitChance) {
        return { ...player, isActive: false, activityLevel: 0 };
      }
      
      // Roll for activity based on player's activity level
      // Add some randomness - even active players don't play every tick
      if (Math.random() > activityLevel * 0.7) {
        return player; // This player doesn't play this tick
      }
      
      // Player is active this tick - calculate stars gained
      let starsGained = 0;
      
      // Check for burst (big session/win streak)
      if (Math.random() < burstChance) {
        // Burst! Player had a great session
        // Burst size scales with activity level
        const burstSize = activityLevel > 0.5 ? 
          Math.floor(Math.random() * 35) + 15 : // Active: 15-50 stars
          Math.floor(Math.random() * 15) + 8;   // Casual: 8-23 stars
        starsGained = burstSize;
      } else {
        // Normal play - gains scale with activity level
        if (activityLevel < 0.2) {
          // Casual: 1-4 stars (they win rarely)
          starsGained = Math.floor(Math.random() * 4) + 1;
        } else if (activityLevel < 0.5) {
          // Regular: 2-8 stars
          starsGained = Math.floor(Math.random() * 7) + 2;
        } else {
          // Active: 3-12 stars
          starsGained = Math.floor(Math.random() * 10) + 3;
        }
      }
      
      // Players just behind the user are slightly more motivated
      const distanceFromUser = idx - userIndex;
      if (distanceFromUser > 0 && distanceFromUser <= 3) {
        starsGained = Math.floor(starsGained * 1.15); // 15% boost for chasers
      }
      
      return {
        ...player,
        stars: player.stars + starsGained,
        lastActive: now
      };
    });
    
    // ============ RUBBER BAND MECHANIC ============
    // If user is far ahead in 1st place, ensure some competition
    const sortedNonUser = players.filter(p => !p.isCurrentUser).sort((a, b) => b.stars - a.stars);
    const topChaser = sortedNonUser[0];
    const gapToChaser = topChaser ? userStars - topChaser.stars : 0;
    
    if (userPosition === 1 && gapToChaser > 40 && topChaser) {
      // Make top chaser more aggressive
      const catchUpStars = Math.floor(gapToChaser * 0.15) + Math.floor(Math.random() * 10);
      players = players.map(p => 
        p.id === topChaser.id 
          ? { ...p, stars: p.stars + catchUpStars, isActive: true, activityLevel: Math.max(p.activityLevel, 0.6) } 
          : p
      );
    }
    
    // ============ OCCASIONAL EVENTS ============
    // 3% chance: One random active player has a great day
    if (Math.random() < 0.03) {
      const activePlayers = players.filter(p => !p.isCurrentUser && p.isActive && p.stars > 0);
      if (activePlayers.length > 0) {
        const luckyPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        const burstStars = Math.floor(Math.random() * 30) + 20; // 20-50 stars
        players = players.map(p => 
          p.id === luckyPlayer.id 
            ? { ...p, stars: p.stars + burstStars, lastActive: now } 
            : p
        );
      }
    }
    
    // 1% chance: A dormant player with some stars comes back strong
    if (Math.random() < 0.01) {
      const dormantPlayers = players.filter(p => !p.isCurrentUser && !p.isActive && p.stars > 10);
      if (dormantPlayers.length > 0) {
        const returningPlayer = dormantPlayers[Math.floor(Math.random() * dormantPlayers.length)];
        const comebackStars = Math.floor(Math.random() * 25) + 15; // 15-40 stars
        players = players.map(p => 
          p.id === returningPlayer.id 
            ? { 
                ...p, 
                stars: p.stars + comebackStars, 
                isActive: true, 
                activityLevel: 0.3 + Math.random() * 0.3,
                burstChance: 0.1,
                lastActive: now 
              } 
            : p
        );
      }
    }
    
    players = sortLeaderboard(players);
    saveLeaderboard(players, data.seasonId);
    
    // Check if user's position changed (got overtaken)
    const newUserIndex = players.findIndex(p => p.isCurrentUser);
    if (newUserIndex > userIndex) {
      overtaken = true;
      saveCurrentPosition(newUserIndex + 1);
    }
    
    return { players, overtaken };
  } catch {
    return { players: [], overtaken: false };
  }
}

// Reset leaderboard (for testing)
export function resetLeaderboard(): void {
  localStorage.removeItem(LEADERBOARD_KEY);
  localStorage.removeItem(LEADERBOARD_POSITION_KEY);
  localStorage.removeItem(SEASON_INFO_KEY);
  localStorage.removeItem(SEASON_STARS_KEY);
  localStorage.removeItem(LEADERBOARD_TROPHIES_KEY);
}

// Format time remaining
export function formatTimeRemaining(endTime: number): string {
  const diff = endTime - Date.now();
  if (diff <= 0) return 'Завершён';
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) {
    return `${days}д ${hours}ч`;
  }
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  return `${minutes}м`;
}
