// Leaderboard system - groups of 20 players sorted by season stars

export interface LeaderboardPlayer {
  id: string;
  name: string;
  avatar: string;
  stars: number; // Stars earned this season
  isCurrentUser: boolean;
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

// Generate a random fake player
function generateFakePlayer(index: number, maxStars: number): LeaderboardPlayer {
  const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const stars = Math.floor(Math.random() * maxStars) + 5; // 5 to maxStars
  
  return {
    id: `fake_${index}_${Date.now()}`,
    name,
    avatar,
    stars,
    isCurrentUser: false
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
    isCurrentUser: true
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
// Makes competition interesting - players near you are more active
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
    
    // Players just behind you (positions userPosition+1 to userPosition+3)
    // These are the "chasers" - they should be catching up
    const chasers = players.filter((p, idx) => 
      !p.isCurrentUser && idx > userIndex && idx <= userIndex + 3
    );
    
    // Players just ahead of you (positions userPosition-1 to userPosition-3)
    // These shouldn't run too far ahead
    const leaders = players.filter((p, idx) => 
      !p.isCurrentUser && idx < userIndex && idx >= Math.max(0, userIndex - 3)
    );
    
    // Players far ahead (top positions) - they progress slowly
    const topPlayers = players.filter((p, idx) => 
      !p.isCurrentUser && idx < Math.max(0, userIndex - 3)
    );
    
    // Players far behind - they progress very slowly
    const farBehind = players.filter((p, idx) => 
      !p.isCurrentUser && idx > userIndex + 3
    );
    
    let overtaken = false;
    
    // 40% chance: A chaser gains stars (creates tension!)
    if (chasers.length > 0 && Math.random() < 0.4) {
      const chaser = chasers[Math.floor(Math.random() * chasers.length)];
      // They gain enough to potentially overtake you
      const gap = userStars - chaser.stars;
      const starsToAdd = Math.min(
        Math.floor(Math.random() * 8) + 3, // 3-10 stars
        gap + 5 // Don't go more than 5 stars ahead
      );
      
      players = players.map(p => 
        p.id === chaser.id ? { ...p, stars: p.stars + starsToAdd } : p
      );
      
      // Check if they overtook us
      if (chaser.stars + starsToAdd > userStars) {
        overtaken = true;
      }
    }
    
    // 25% chance: A leader gains a small amount (stay reachable)
    if (leaders.length > 0 && Math.random() < 0.25) {
      const leader = leaders[Math.floor(Math.random() * leaders.length)];
      const gap = leader.stars - userStars;
      // Only add stars if gap is small, otherwise let user catch up
      if (gap < 30) {
        const starsToAdd = Math.floor(Math.random() * 5) + 1; // 1-5 stars
        players = players.map(p => 
          p.id === leader.id ? { ...p, stars: p.stars + starsToAdd } : p
        );
      }
    }
    
    // 15% chance: Top players gain stars (but slowly)
    if (topPlayers.length > 0 && Math.random() < 0.15) {
      const topPlayer = topPlayers[Math.floor(Math.random() * topPlayers.length)];
      const starsToAdd = Math.floor(Math.random() * 3) + 1; // 1-3 stars
      players = players.map(p => 
        p.id === topPlayer.id ? { ...p, stars: p.stars + starsToAdd } : p
      );
    }
    
    // 10% chance: Someone far behind gains stars
    if (farBehind.length > 0 && Math.random() < 0.1) {
      const behind = farBehind[Math.floor(Math.random() * farBehind.length)];
      const starsToAdd = Math.floor(Math.random() * 5) + 1; // 1-5 stars
      players = players.map(p => 
        p.id === behind.id ? { ...p, stars: p.stars + starsToAdd } : p
      );
    }
    
    players = sortLeaderboard(players);
    saveLeaderboard(players, data.seasonId);
    
    // Check if user's position changed (got overtaken)
    const newUserIndex = players.findIndex(p => p.isCurrentUser);
    if (newUserIndex > userIndex) {
      overtaken = true;
      // Update saved position so we track this
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
