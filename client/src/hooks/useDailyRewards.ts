/**
 * useDailyRewards Hook
 * 
 * Полностью управляет логикой ежедневных наград:
 * - Daily streak tracking
 * - Login date tracking  
 * - Проверка на mount и при возврате в приложение
 * - Показ и получение награды
 */

import { useState, useEffect, useCallback } from 'react';

// Get reward stars based on streak day (caps at day 10)
export function getRewardStars(day: number): number {
  const rewardDay = Math.min(day, 10);
  const baseReward = Math.floor((rewardDay - 1) / 2) * 5 + 5;
  return Math.min(baseReward, 25);
}

export interface DailyRewardPopupData {
  type: 'streak' | 'dailyReward';
  streak: number;
  stars: number;
}

export interface DailyRewardsState {
  // Streak
  dailyStreak: number;
  setDailyStreak: React.Dispatch<React.SetStateAction<number>>;
  
  // Login tracking
  lastLoginDate: string;
  setLastLoginDate: React.Dispatch<React.SetStateAction<string>>;
  
  // Pending rewards (for win flow)
  pendingDailyReward: number;
  setPendingDailyReward: React.Dispatch<React.SetStateAction<number>>;
  pendingStreak: number;
  setPendingStreak: React.Dispatch<React.SetStateAction<number>>;
  pendingDailyRewardCheck: boolean;
  setPendingDailyRewardCheck: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  resetDailyRewards: () => void;
  
  /**
   * Проверяет, нужно ли показать награду. Возвращает данные для popup или null.
   * Вызывающий код должен сам показать popup и вызвать claimDailyReward после.
   */
  tryGetDailyRewardPopup: () => DailyRewardPopupData | null;
  
  /**
   * Вызывается после показа popup награды. Обновляет streak и дату.
   * Возвращает количество звёзд для начисления.
   */
  claimDailyReward: () => number;
}

interface UseDailyRewardsOptions {
  /** Callback для сброса daily quests при новом дне */
  onNewDay?: () => void;
}

export function useDailyRewards(options?: UseDailyRewardsOptions): DailyRewardsState {
  const { onNewDay } = options || {};
  
  // Streak state
  const [dailyStreak, setDailyStreak] = useState(() => {
    const saved = localStorage.getItem('solitaire_daily_streak');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // Login date tracking
  const [lastLoginDate, setLastLoginDate] = useState(() => {
    return localStorage.getItem('solitaire_last_login_date') || '';
  });
  
  // Pending rewards for win flow
  const [pendingDailyReward, setPendingDailyReward] = useState(0);
  const [pendingStreak, setPendingStreak] = useState(0);
  const [pendingDailyRewardCheck, setPendingDailyRewardCheck] = useState(false);
  
  // Save streak to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_daily_streak', dailyStreak.toString());
  }, [dailyStreak]);
  
  // Save login date to localStorage
  useEffect(() => {
    if (lastLoginDate) {
      localStorage.setItem('solitaire_last_login_date', lastLoginDate);
    }
  }, [lastLoginDate]);
  
  // Internal: calculate streak and set pending reward
  const setupPendingReward = useCallback(() => {
    const today = new Date().toDateString();
    const currentLastLogin = localStorage.getItem('solitaire_last_login_date') || '';
    
    if (currentLastLogin === today) {
      // Already claimed today
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    const currentStreak = parseInt(localStorage.getItem('solitaire_daily_streak') || '0', 10);
    
    let newStreak: number;
    if (currentLastLogin === yesterdayStr) {
      // Consecutive day - increase streak
      newStreak = currentStreak + 1;
    } else {
      // Missed a day or first login - reset to 1
      newStreak = 1;
    }
    
    setPendingStreak(newStreak);
    setPendingDailyReward(getRewardStars(newStreak));
    setPendingDailyRewardCheck(true);
  }, []);
  
  // Check for daily reward on mount
  useEffect(() => {
    setupPendingReward();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle tab visibility change - check for new day when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem('solitaire_daily_quests_date');
      const currentLastLogin = localStorage.getItem('solitaire_last_login_date') || '';
      
      // Check if it's a new day since quests were last saved
      if (savedDate !== today) {
        onNewDay?.();
        localStorage.setItem('solitaire_daily_quests_date', today);
      }
      
      // Check if daily reward should be given (new day since last login)
      if (currentLastLogin !== today && pendingDailyReward <= 0) {
        setupPendingReward();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pendingDailyReward, onNewDay, setupPendingReward]);
  
  // Try to get daily reward popup data (returns null if no reward pending)
  const tryGetDailyRewardPopup = useCallback((): DailyRewardPopupData | null => {
    if (!pendingDailyRewardCheck || pendingDailyReward <= 0) {
      return null;
    }
    
    // Mark as checked so we don't return it again
    setPendingDailyRewardCheck(false);
    
    // Show streak popup first if streak >= 2, otherwise show reward directly
    if (pendingStreak >= 2) {
      return { type: 'streak', streak: pendingStreak, stars: 0 };
    } else {
      return { type: 'dailyReward', streak: pendingStreak, stars: pendingDailyReward };
    }
  }, [pendingDailyRewardCheck, pendingDailyReward, pendingStreak]);
  
  // Claim the daily reward - updates streak and returns stars to add
  const claimDailyReward = useCallback((): number => {
    if (pendingDailyReward <= 0) return 0;
    
    const starsToAdd = pendingDailyReward;
    
    // Update streak and login date
    setDailyStreak(pendingStreak);
    setLastLoginDate(new Date().toDateString());
    
    // Clear pending state
    setPendingDailyReward(0);
    setPendingStreak(0);
    
    return starsToAdd;
  }, [pendingDailyReward, pendingStreak]);
  
  // Reset
  const resetDailyRewards = useCallback(() => {
    setDailyStreak(0);
    setLastLoginDate('');
    setPendingDailyReward(0);
    setPendingStreak(0);
    setPendingDailyRewardCheck(false);
    localStorage.removeItem('solitaire_daily_streak');
    localStorage.removeItem('solitaire_last_login_date');
  }, []);
  
  return {
    dailyStreak,
    setDailyStreak,
    lastLoginDate,
    setLastLoginDate,
    pendingDailyReward,
    setPendingDailyReward,
    pendingStreak,
    setPendingStreak,
    pendingDailyRewardCheck,
    setPendingDailyRewardCheck,
    resetDailyRewards,
    tryGetDailyRewardPopup,
    claimDailyReward,
  };
}
