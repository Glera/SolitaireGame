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
  const stars = Math.floor(Math.random() * maxStars) + 5; // 5 to maxStars
  
  // Realistic distribution of player types:
  // ~30% inactive (stopped playing)
  // ~40% casual (low activity)
  // ~20% regular (medium activity)
  // ~10% hardcore (high activity, can burst)
  const roll = Math.random();
  let isActive = true;
  let activityLevel = 0.5;
  let burstChance = 0.1;
  
  if (roll < 0.3) {
    // Inactive player - stopped playing
    isActive = false;
    activityLevel = 0;
    burstChance = 0;
  } else if (roll < 0.7) {
    // Casual - plays occasionally
    isActive = true;
    activityLevel = 0.1 + Math.random() * 0.3; // 0.1-0.4
    burstChance = 0.05; // Rarely bursts
  } else if (roll < 0.9) {
    // Regular - plays often
    isActive = true;
    activityLevel = 0.4 + Math.random() * 0.3; // 0.4-0.7
    burstChance = 0.15; // Sometimes bursts
  } else {
    // Hardcore - very active, can make big jumps
    isActive = true;
    activityLevel = 0.7 + Math.random() * 0.3; // 0.7-1.0
    burstChance = 0.3; // Often bursts
  }
  
  return {
    id: `fake_${index}_${Date.now()}`,
    name,
    avatar,
    stars,
    isCurrentUser: false,
    isActive,
    activityLevel,
    burstChance,
    lastActive: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000) // Random time in last 24h
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
      
      // Inactive players don't gain stars
      if (!isActive) return player;
      
      // 5% chance an active player becomes inactive (quit playing)
      if (Math.random() < 0.05) {
        return { ...player, isActive: false, activityLevel: 0 };
      }
      
      // 2% chance an inactive player becomes active again (comeback)
      if (!isActive && Math.random() < 0.02) {
        return { 
          ...player, 
          isActive: true, 
          activityLevel: 0.2 + Math.random() * 0.3, // Low-medium activity
          lastActive: now 
        };
      }
      
      // Roll for activity based on player's activity level
      if (Math.random() > activityLevel) {
        return player; // This player doesn't play this tick
      }
      
      // Player is active this tick - calculate stars gained
      let starsGained = 0;
      
      // Check for burst (big session/win streak)
      if (Math.random() < burstChance) {
        // Burst! Player had a great session
        starsGained = Math.floor(Math.random() * 30) + 20; // 20-50 stars burst
      } else {
        // Normal play - smaller gains
        starsGained = Math.floor(Math.random() * 8) + 2; // 2-10 stars
      }
      
      // Players near the user are slightly more motivated (keeps it interesting)
      const distanceFromUser = Math.abs(idx - userIndex);
      if (distanceFromUser <= 3) {
        starsGained = Math.floor(starsGained * 1.2); // 20% boost for nearby players
      }
      
      return {
        ...player,
        stars: player.stars + starsGained,
        lastActive: now
      };
    });
    
    // ============ RUBBER BAND MECHANIC ============
    // If user is far ahead in 1st place, ensure some competition
    const secondPlace = players.find((p, idx) => !p.isCurrentUser && idx === 1);
    const gapToSecond = userPosition === 1 && secondPlace ? userStars - secondPlace.stars : 0;
    
    if (userPosition === 1 && gapToSecond > 30 && secondPlace) {
      // Make second place more aggressive
      const catchUpStars = Math.floor(gapToSecond * 0.2) + Math.floor(Math.random() * 8);
      players = players.map(p => 
        p.id === secondPlace.id 
          ? { ...p, stars: p.stars + catchUpStars, isActive: true, activityLevel: 0.8 } 
          : p
      );
    }
    
    // ============ OCCASIONAL BIG SHAKE-UP ============
    // 5% chance: One random player makes a huge comeback burst
    if (Math.random() < 0.05) {
      const eligiblePlayers = players.filter(p => !p.isCurrentUser && p.stars < userStars);
      if (eligiblePlayers.length > 0) {
        const luckyPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
        const burstStars = Math.floor(Math.random() * 40) + 30; // 30-70 stars!
        players = players.map(p => 
          p.id === luckyPlayer.id 
            ? { 
                ...p, 
                stars: p.stars + burstStars, 
                isActive: true, 
                activityLevel: Math.max(p.activityLevel ?? 0.5, 0.6),
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
