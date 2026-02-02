import { useState, useEffect, useCallback } from 'react';
import { usePopupQueue } from '../lib/stores/usePopupQueue';

export interface Quest {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: number;
  completed: boolean;
  rewardClaimed?: boolean;
}

export const MONTHLY_TARGET = 50;
export const MONTHLY_REWARD = 500;

const DEFAULT_DAILY_QUESTS: Quest[] = [
  {
    id: 'daily-games',
    title: 'Первая победа',
    description: 'Успешно разложи 1 пасьянс',
    current: 0,
    target: 1,
    reward: 15,
    completed: false
  },
  {
    id: 'daily-aces',
    title: 'Собери тузы',
    description: 'Собери 12 тузов в основание',
    current: 0,
    target: 12,
    reward: 30,
    completed: false
  },
  {
    id: 'daily-wins',
    title: 'Мастер пасьянса',
    description: 'Успешно разложи 5 пасьянсов',
    current: 0,
    target: 5,
    reward: 45,
    completed: false
  }
];

export interface DailyQuestsState {
  quests: Quest[];
  acesCollected: number;
  monthlyProgress: number;
  monthlyRewardClaimed: boolean;
  
  // UI state
  showDailyQuests: boolean;
  dailyQuestsAfterWin: boolean;
  
  // Raw setters (for backward compatibility with existing logic)
  setQuests: React.Dispatch<React.SetStateAction<Quest[]>>;
  setAcesCollected: React.Dispatch<React.SetStateAction<number>>;
  setMonthlyProgress: React.Dispatch<React.SetStateAction<number>>;
  setMonthlyRewardClaimed: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  openDailyQuests: () => void;
  closeDailyQuests: () => void;
  setDailyQuestsAfterWin: (afterWin: boolean) => void;
  updateQuest: (questId: string, updates: Partial<Quest>) => void;
  incrementAces: (count?: number) => void;
  incrementMonthlyProgress: () => void;
  claimMonthlyReward: () => void;
  recordWin: () => void;
  resetQuests: () => void;
}

export function useDailyQuests(): DailyQuestsState {
  // Daily quests state - load from localStorage
  const [quests, setQuests] = useState<Quest[]>(() => {
    const saved = localStorage.getItem('solitaire_daily_quests');
    const savedDate = localStorage.getItem('solitaire_daily_quests_date');
    const today = new Date().toDateString();
    
    // Check if it's a new day - reset quests
    if (savedDate !== today) {
      localStorage.setItem('solitaire_daily_quests_date', today);
      localStorage.removeItem('solitaire_aces_collected');
      return DEFAULT_DAILY_QUESTS;
    }
    
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_DAILY_QUESTS;
      }
    }
    return DEFAULT_DAILY_QUESTS;
  });
  
  // Track aces collected (reset on new day)
  const [acesCollected, setAcesCollected] = useState(() => {
    const saved = localStorage.getItem('solitaire_aces_collected');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // Monthly progress state
  const [monthlyProgress, setMonthlyProgress] = useState(() => {
    const saved = localStorage.getItem('solitaire_monthly_progress');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [monthlyRewardClaimed, setMonthlyRewardClaimed] = useState(() => {
    return localStorage.getItem('solitaire_monthly_reward_claimed') === 'true';
  });
  
  // UI state - managed via onDemand popup queue
  const popupQueue = usePopupQueue();
  const showDailyQuests = popupQueue.onDemandPopup?.type === 'dailyQuests';
  const openDailyQuests = useCallback(() => popupQueue.showOnDemand({ type: 'dailyQuests' }), [popupQueue]);
  const closeDailyQuests = useCallback(() => popupQueue.closeOnDemand(), [popupQueue]);
  const [dailyQuestsAfterWin, setDailyQuestsAfterWin] = useState(false);
  
  // Save quests to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_daily_quests', JSON.stringify(quests));
    localStorage.setItem('solitaire_daily_quests_date', new Date().toDateString());
  }, [quests]);
  
  // Save aces to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_aces_collected', acesCollected.toString());
  }, [acesCollected]);
  
  // Save monthly progress to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_monthly_progress', monthlyProgress.toString());
  }, [monthlyProgress]);
  
  useEffect(() => {
    localStorage.setItem('solitaire_monthly_reward_claimed', monthlyRewardClaimed.toString());
  }, [monthlyRewardClaimed]);
  
  // Actions
  const updateQuest = useCallback((questId: string, updates: Partial<Quest>) => {
    setQuests(prev => prev.map(q => 
      q.id === questId ? { ...q, ...updates } : q
    ));
  }, []);
  
  const incrementAces = useCallback((count: number = 1) => {
    setAcesCollected(prev => prev + count);
    
    // Update aces quest
    setQuests(prev => prev.map(q => {
      if (q.id === 'daily-aces' && !q.completed) {
        const newCurrent = Math.min(q.current + count, q.target);
        return {
          ...q,
          current: newCurrent,
          completed: newCurrent >= q.target
        };
      }
      return q;
    }));
  }, []);
  
  const incrementMonthlyProgress = useCallback(() => {
    setMonthlyProgress(prev => Math.min(prev + 1, MONTHLY_TARGET));
  }, []);
  
  const claimMonthlyReward = useCallback(() => {
    setMonthlyRewardClaimed(true);
  }, []);
  
  const recordWin = useCallback(() => {
    setQuests(prev => prev.map(q => {
      if (q.id === 'daily-games' && !q.completed) {
        const newCurrent = Math.min(q.current + 1, q.target);
        return {
          ...q,
          current: newCurrent,
          completed: newCurrent >= q.target
        };
      }
      if (q.id === 'daily-wins' && !q.completed) {
        const newCurrent = Math.min(q.current + 1, q.target);
        return {
          ...q,
          current: newCurrent,
          completed: newCurrent >= q.target
        };
      }
      return q;
    }));
  }, []);
  
  const resetQuests = useCallback(() => {
    setQuests(DEFAULT_DAILY_QUESTS);
    setAcesCollected(0);
    setMonthlyProgress(0);
    setMonthlyRewardClaimed(false);
    localStorage.removeItem('solitaire_daily_quests');
    localStorage.removeItem('solitaire_daily_quests_date');
    localStorage.removeItem('solitaire_aces_collected');
    localStorage.removeItem('solitaire_monthly_progress');
    localStorage.removeItem('solitaire_monthly_reward_claimed');
  }, []);
  
  return {
    quests,
    acesCollected,
    monthlyProgress,
    monthlyRewardClaimed,
    showDailyQuests,
    dailyQuestsAfterWin,
    // Raw setters for backward compatibility
    setQuests,
    setAcesCollected,
    setMonthlyProgress,
    setMonthlyRewardClaimed,
    // Actions
    openDailyQuests,
    closeDailyQuests,
    setDailyQuestsAfterWin,
    updateQuest,
    incrementAces,
    incrementMonthlyProgress,
    claimMonthlyReward,
    recordWin,
    resetQuests,
  };
}
