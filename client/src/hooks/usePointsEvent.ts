/**
 * usePointsEvent Hook
 * 
 * Управляет состоянием Points Event (ивент с очками):
 * - Состояние ивента
 * - UI pulse
 * - Popup visibility
 */

import { useState, useCallback, useRef } from 'react';
import { usePopupQueue } from '../lib/stores/usePopupQueue';
import {
  PointsEventState,
  getPointsEventState,
  resetPointsEvent,
} from '../lib/liveops/pointsEvent';

export interface PointsEventHookState {
  // State
  pointsEventState: PointsEventState;
  setPointsEventState: React.Dispatch<React.SetStateAction<PointsEventState>>;
  
  // UI
  pointsEventPulse: boolean;
  setPointsEventPulse: React.Dispatch<React.SetStateAction<boolean>>;
  rewardIconAnimating: boolean;
  setRewardIconAnimating: React.Dispatch<React.SetStateAction<boolean>>;
  nextRewardDropping: boolean;
  setNextRewardDropping: React.Dispatch<React.SetStateAction<boolean>>;
  animatingRewardIndex: number | null;
  setAnimatingRewardIndex: React.Dispatch<React.SetStateAction<number | null>>;
  
  // Ref
  pointsEventIconRef: React.RefObject<HTMLDivElement>;
  
  // Popup
  showPointsEventPopup: boolean;
  openPointsEventPopup: () => void;
  closePointsEventPopup: () => void;
  
  // Actions
  triggerPointsEventPulse: () => void;
  resetPointsEventData: () => PointsEventState;
}

export function usePointsEvent(): PointsEventHookState {
  const popupQueue = usePopupQueue();
  
  // State
  const [pointsEventState, setPointsEventState] = useState<PointsEventState>(() => getPointsEventState());
  
  // UI state
  const [pointsEventPulse, setPointsEventPulse] = useState(false);
  const [rewardIconAnimating, setRewardIconAnimating] = useState(false);
  const [nextRewardDropping, setNextRewardDropping] = useState(false);
  const [animatingRewardIndex, setAnimatingRewardIndex] = useState<number | null>(null);
  
  // Ref
  const pointsEventIconRef = useRef<HTMLDivElement>(null);
  
  // Popup visibility
  const showPointsEventPopup = popupQueue.onDemandPopup?.type === 'pointsEvent';
  const openPointsEventPopup = useCallback(() => popupQueue.showOnDemand({ type: 'pointsEvent' }), [popupQueue]);
  const closePointsEventPopup = useCallback(() => popupQueue.closeOnDemand(), [popupQueue]);
  
  // Trigger pulse animation
  const triggerPointsEventPulse = useCallback(() => {
    setPointsEventPulse(true);
    setTimeout(() => setPointsEventPulse(false), 150);
  }, []);
  
  // Reset
  const resetPointsEventData = useCallback(() => {
    const newState = resetPointsEvent();
    setPointsEventState(newState);
    return newState;
  }, []);
  
  return {
    pointsEventState,
    setPointsEventState,
    pointsEventPulse,
    setPointsEventPulse,
    rewardIconAnimating,
    setRewardIconAnimating,
    nextRewardDropping,
    setNextRewardDropping,
    animatingRewardIndex,
    setAnimatingRewardIndex,
    pointsEventIconRef,
    showPointsEventPopup,
    openPointsEventPopup,
    closePointsEventPopup,
    triggerPointsEventPulse,
    resetPointsEventData,
  };
}
