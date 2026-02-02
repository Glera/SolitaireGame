/**
 * useLeaderboard Hook
 * 
 * Управляет состоянием таблицы лидеров:
 * - Инициализация и обновление позиций
 * - Симуляция других игроков
 * - UI состояние (popup visibility)
 * - Трофеи за сезоны
 * - Season stars
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePopupQueue } from '../lib/stores/usePopupQueue';
import {
  LeaderboardPlayer,
  SeasonInfo,
  initializeLeaderboard,
  simulateOtherPlayers,
  getCurrentUserPosition,
  saveCurrentPosition,
  getSeasonInfo,
  getSeasonStars,
  getLeaderboardTrophies,
  LeaderboardTrophy,
  resetLeaderboard,
  checkSeasonEnd,
  updateCurrentUserStars,
  addSeasonStars,
  resetSeasonStars,
} from '../lib/leaderboard';

export interface LeaderboardState {
  // Popup visibility
  showLeaderboard: boolean;
  openLeaderboard: () => void;
  closeLeaderboard: () => void;
  
  // Data
  leaderboardPlayers: LeaderboardPlayer[];
  setLeaderboardPlayers: React.Dispatch<React.SetStateAction<LeaderboardPlayer[]>>;
  leaderboardOldPosition: number;
  setLeaderboardOldPosition: React.Dispatch<React.SetStateAction<number>>;
  leaderboardNewPosition: number;
  setLeaderboardNewPosition: React.Dispatch<React.SetStateAction<number>>;
  
  // Season
  seasonInfo: SeasonInfo;
  setSeasonInfo: React.Dispatch<React.SetStateAction<SeasonInfo>>;
  seasonStars: number;
  setSeasonStars: React.Dispatch<React.SetStateAction<number>>;
  lastCheckedSeasonStarsRef: React.MutableRefObject<number>;
  
  // Pending show state
  pendingLeaderboardShow: boolean;
  setPendingLeaderboardShow: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Trophies
  leaderboardTrophies: LeaderboardTrophy[];
  setLeaderboardTrophies: React.Dispatch<React.SetStateAction<LeaderboardTrophy[]>>;
  
  // Unlock state
  leaderboardUnlockShown: boolean;
  setLeaderboardUnlockShown: React.Dispatch<React.SetStateAction<boolean>>;
  pendingLeaderboardUnlock: boolean;
  setPendingLeaderboardUnlock: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Notification
  showOvertakenNotification: boolean;
  setShowOvertakenNotification: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Refs for simulation
  showLeaderboardRef: React.MutableRefObject<boolean>;
  leaderboardPositionRef: React.MutableRefObject<number>;
  pendingDowngradeRef: React.MutableRefObject<{ players: LeaderboardPlayer[]; position: number; overtaken: boolean } | null>;
  
  // Actions
  initializeLeaderboardData: (stars: number) => void;
  resetLeaderboardData: () => void;
  addSeasonStarsAndUpdate: (amount: number) => void;
  handleLeaderboardClose: (onAfterClose?: () => void) => void;
  tryShowLeaderboard: (onAfterLeaderboard?: () => void) => boolean;
  pendingAfterLeaderboardRef: React.MutableRefObject<(() => void) | null>;
}

interface UseLeaderboardOptions {
  leaderboardUnlocked: boolean;
}

export function useLeaderboard({ 
  leaderboardUnlocked,
}: UseLeaderboardOptions): LeaderboardState {
  const popupQueue = usePopupQueue();
  
  // Popup visibility via queue
  const showLeaderboard = popupQueue.onDemandPopup?.type === 'leaderboardView';
  const openLeaderboard = useCallback(() => popupQueue.showOnDemand({ type: 'leaderboardView' }), [popupQueue]);
  const closeLeaderboard = useCallback(() => popupQueue.closeOnDemand(), [popupQueue]);
  
  // Data state
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayer[]>([]);
  const [leaderboardOldPosition, setLeaderboardOldPosition] = useState(20);
  const [leaderboardNewPosition, setLeaderboardNewPosition] = useState(20);
  const [pendingLeaderboardShow, setPendingLeaderboardShow] = useState(false);
  
  // Season info
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo>(() => getSeasonInfo());
  const [seasonStars, setSeasonStars] = useState(() => getSeasonStars());
  const lastCheckedSeasonStarsRef = useRef(seasonStars);
  
  // Trophies
  const [leaderboardTrophies, setLeaderboardTrophies] = useState<LeaderboardTrophy[]>(() => getLeaderboardTrophies());
  
  // Unlock state
  const [leaderboardUnlockShown, setLeaderboardUnlockShown] = useState(() => {
    return localStorage.getItem('solitaire_leaderboard_unlock_shown') === 'true';
  });
  const [pendingLeaderboardUnlock, setPendingLeaderboardUnlock] = useState(false);
  
  // Notification
  const [showOvertakenNotification, setShowOvertakenNotification] = useState(false);
  
  // Refs for simulation
  const showLeaderboardRef = useRef(showLeaderboard);
  const leaderboardPositionRef = useRef(leaderboardNewPosition);
  const pendingDowngradeRef = useRef<{ players: LeaderboardPlayer[]; position: number; overtaken: boolean } | null>(null);
  const pendingAfterLeaderboardRef = useRef<(() => void) | null>(null);
  
  // Check for season end on mount and periodically
  useEffect(() => {
    const checkSeason = () => {
      const result = checkSeasonEnd();
      if (result.seasonEnded) {
        setSeasonInfo(getSeasonInfo());
        setSeasonStars(getSeasonStars());
        setLeaderboardTrophies(getLeaderboardTrophies());
        const players = initializeLeaderboard(0);
        setLeaderboardPlayers(players);
        
        if (result.trophy) {
          console.log('🏆 Trophy awarded:', result.trophy);
        }
      }
    };
    
    checkSeason();
    const interval = setInterval(checkSeason, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Initialize leaderboard on mount
  useEffect(() => {
    const players = initializeLeaderboard(seasonStars);
    setLeaderboardPlayers(players);
    const position = players.findIndex(p => p.isCurrentUser) + 1;
    setLeaderboardOldPosition(position);
    setLeaderboardNewPosition(position);
    saveCurrentPosition(position);
    lastCheckedSeasonStarsRef.current = seasonStars;
  }, []);
  
  // Sync refs with state
  useEffect(() => {
    showLeaderboardRef.current = showLeaderboard;
    // If leaderboard closed and pending downgrade, apply it
    if (!showLeaderboard && pendingDowngradeRef.current) {
      const pending = pendingDowngradeRef.current;
      setLeaderboardPlayers(pending.players);
      setLeaderboardNewPosition(pending.position);
      if (pending.overtaken) {
        setShowOvertakenNotification(true);
        setTimeout(() => setShowOvertakenNotification(false), 3000);
      }
      pendingDowngradeRef.current = null;
    }
  }, [showLeaderboard]);
  
  useEffect(() => {
    leaderboardPositionRef.current = leaderboardNewPosition;
  }, [leaderboardNewPosition]);
  
  // Simulate other players periodically
  useEffect(() => {
    if (!leaderboardUnlocked) return;
    
    const interval = setInterval(() => {
      const result = simulateOtherPlayers();
      if (result) {
        const currentPos = leaderboardPositionRef.current;
        const newPos = getCurrentUserPosition(result.players);
        const isDowngrade = newPos > currentPos;
        
        // If leaderboard is open and position is downgrade, defer update
        if (showLeaderboardRef.current && isDowngrade) {
          pendingDowngradeRef.current = { players: result.players, position: newPos, overtaken: result.overtaken };
          return;
        }
        
        setLeaderboardPlayers(result.players);
        setLeaderboardNewPosition(newPos);
        
        // Show notification if someone overtook us (auto-hide after 3s)
        if (result.overtaken && !(showLeaderboardRef.current && pendingDowngradeRef.current)) {
          setShowOvertakenNotification(true);
          setTimeout(() => setShowOvertakenNotification(false), 3000);
        }
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [leaderboardUnlocked]);
  
  // Actions
  const initializeLeaderboardData = useCallback((stars: number) => {
    const players = initializeLeaderboard(stars);
    setLeaderboardPlayers(players);
    const position = getCurrentUserPosition(players);
    setLeaderboardOldPosition(position);
    setLeaderboardNewPosition(position);
  }, []);
  
  const resetLeaderboardData = useCallback(() => {
    resetLeaderboard();
    resetSeasonStars();
    setLeaderboardTrophies(getLeaderboardTrophies());
    const players = initializeLeaderboard(0);
    setLeaderboardPlayers(players);
    const position = getCurrentUserPosition(players);
    setLeaderboardOldPosition(position);
    setLeaderboardNewPosition(position);
    setPendingLeaderboardShow(false);
    setShowOvertakenNotification(false);
    setSeasonStars(0);
    setLeaderboardUnlockShown(false);
    setPendingLeaderboardUnlock(false);
    localStorage.removeItem('solitaire_leaderboard_unlock_shown');
  }, []);
  
  // Add season stars and update leaderboard position
  const addSeasonStarsAndUpdate = useCallback((amount: number) => {
    if (!leaderboardUnlocked) return;
    
    const newSeasonStars = addSeasonStars(amount);
    setSeasonStars(newSeasonStars);
    
    // Check for position improvement
    const result = updateCurrentUserStars(newSeasonStars);
    setLeaderboardPlayers(result.players);
    
    if (result.positionImproved) {
      setLeaderboardOldPosition(result.oldPosition);
      setLeaderboardNewPosition(result.newPosition);
      setPendingLeaderboardShow(true);
    }
    
    lastCheckedSeasonStarsRef.current = newSeasonStars;
  }, [leaderboardUnlocked]);
  
  // Handle leaderboard popup close
  const handleLeaderboardClose = useCallback((onAfterClose?: () => void) => {
    // Save current position as "last viewed" for next animation
    saveCurrentPosition(leaderboardNewPosition);
    closeLeaderboard();
    
    // Execute pending callback if any
    const pendingCallback = pendingAfterLeaderboardRef.current;
    pendingAfterLeaderboardRef.current = null;
    
    if (onAfterClose) {
      onAfterClose();
    } else if (pendingCallback) {
      pendingCallback();
    }
  }, [leaderboardNewPosition, closeLeaderboard]);
  
  // Try to show leaderboard if position improved, returns true if shown
  const tryShowLeaderboard = useCallback((onAfterLeaderboard?: () => void): boolean => {
    if (pendingLeaderboardShow) {
      // Don't show leaderboard popup before the unlock/promo popup was shown
      if (!leaderboardUnlockShown) {
        return false;
      }
      
      setPendingLeaderboardShow(false);
      openLeaderboard();
      pendingAfterLeaderboardRef.current = onAfterLeaderboard || null;
      return true;
    }
    return false;
  }, [pendingLeaderboardShow, leaderboardUnlockShown, openLeaderboard]);
  
  return {
    // Popup visibility
    showLeaderboard,
    openLeaderboard,
    closeLeaderboard,
    
    // Data
    leaderboardPlayers,
    setLeaderboardPlayers,
    leaderboardOldPosition,
    setLeaderboardOldPosition,
    leaderboardNewPosition,
    setLeaderboardNewPosition,
    
    // Season
    seasonInfo,
    setSeasonInfo,
    seasonStars,
    setSeasonStars,
    lastCheckedSeasonStarsRef,
    
    // Pending show state
    pendingLeaderboardShow,
    setPendingLeaderboardShow,
    
    // Trophies
    leaderboardTrophies,
    setLeaderboardTrophies,
    
    // Unlock state
    leaderboardUnlockShown,
    setLeaderboardUnlockShown,
    pendingLeaderboardUnlock,
    setPendingLeaderboardUnlock,
    
    // Notification
    showOvertakenNotification,
    setShowOvertakenNotification,
    
    // Refs
    showLeaderboardRef,
    leaderboardPositionRef,
    pendingDowngradeRef,
    
    // Actions
    initializeLeaderboardData,
    resetLeaderboardData,
    addSeasonStarsAndUpdate,
    handleLeaderboardClose,
    tryShowLeaderboard,
    pendingAfterLeaderboardRef,
  };
}
