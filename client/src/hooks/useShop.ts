/**
 * useShop Hook
 * 
 * Управляет состоянием магазина:
 * - Popup visibility
 * - Subscription state
 * - Purchase handlers
 */

import { useState, useCallback } from 'react';
import { usePopupQueue } from '../lib/stores/usePopupQueue';

export interface ShopState {
  // Popup visibility
  showShop: boolean;
  openShop: () => void;
  closeShop: () => void;
  
  // Subscription
  isSubscribed: boolean;
  setIsSubscribed: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Promo unlock
  promoUnlocked: boolean;
  setPromoUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  pendingPromoUnlock: boolean;
  setPendingPromoUnlock: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  handleSubscribe: () => void;
  resetShop: () => void;
}

export function useShop(): ShopState {
  const popupQueue = usePopupQueue();
  
  // Popup visibility via queue
  const showShop = popupQueue.onDemandPopup?.type === 'shop';
  const openShop = useCallback(() => popupQueue.showOnDemand({ type: 'shop' }), [popupQueue]);
  const closeShop = useCallback(() => popupQueue.closeOnDemand(), [popupQueue]);
  
  // Subscription state
  const [isSubscribed, setIsSubscribed] = useState(() => {
    return localStorage.getItem('solitaire_premium_subscription') === 'true';
  });
  
  // Promo unlock state
  const [promoUnlocked, setPromoUnlocked] = useState(() => {
    return localStorage.getItem('solitaire_promo_unlocked') === 'true';
  });
  const [pendingPromoUnlock, setPendingPromoUnlock] = useState(false);
  
  // Handle subscription
  const handleSubscribe = useCallback(() => {
    setIsSubscribed(true);
    localStorage.setItem('solitaire_premium_subscription', 'true');
    closeShop();
  }, [closeShop]);
  
  // Reset
  const resetShop = useCallback(() => {
    setIsSubscribed(false);
    setPromoUnlocked(false);
    setPendingPromoUnlock(false);
    localStorage.removeItem('solitaire_premium_subscription');
    localStorage.removeItem('solitaire_promo_unlocked');
  }, []);
  
  return {
    showShop,
    openShop,
    closeShop,
    isSubscribed,
    setIsSubscribed,
    promoUnlocked,
    setPromoUnlocked,
    pendingPromoUnlock,
    setPendingPromoUnlock,
    handleSubscribe,
    resetShop,
  };
}
