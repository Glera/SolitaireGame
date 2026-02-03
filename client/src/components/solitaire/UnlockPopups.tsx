/**
 * Unlock Popups
 * 
 * Показываются когда пользователь достигает нового уровня и открывает функции.
 * Управляются через win flow queue в usePopupQueue.
 */

import React from 'react';
import { UnlockPopup, UNLOCK_CONFIGS } from './UnlockPopup';
import { usePopupQueue } from '../../lib/stores/usePopupQueue';
import { LEADERBOARD_REQUIRED_LEVEL } from '../../hooks/useGameProgress';

interface UnlockPopupsProps {
  onCollectionsUnlockClose: () => void;
  onLeaderboardUnlockClose: () => void;
  onPromoUnlockClose: () => void;
}

export function UnlockPopups({
  onCollectionsUnlockClose,
  onLeaderboardUnlockClose,
  onPromoUnlockClose
}: UnlockPopupsProps) {
  const popupQueue = usePopupQueue();
  
  const isCollectionsUnlockShowing = popupQueue.current?.type === 'unlockCollections';
  const isLeaderboardUnlockShowing = popupQueue.current?.type === 'unlockTournament';
  const isPromoUnlockShowing = popupQueue.current?.type === 'unlockPromo';
  
  return (
    <>
      {/* Collections Unlock Popup (shown when reaching level 2) */}
      <UnlockPopup
        isVisible={isCollectionsUnlockShowing}
        onClose={onCollectionsUnlockClose}
        {...UNLOCK_CONFIGS.collections}
      />
      
      {/* Leaderboard Unlock Popup (shown when reaching level 4) */}
      <UnlockPopup
        isVisible={isLeaderboardUnlockShowing}
        onClose={onLeaderboardUnlockClose}
        {...UNLOCK_CONFIGS.leaderboard}
        headerSubtitle={`Достигнут ${LEADERBOARD_REQUIRED_LEVEL} уровень`}
      />
      
      {/* Promo/Shop Unlock Popup (shown on first win after collections unlock) */}
      <UnlockPopup
        isVisible={isPromoUnlockShowing}
        onClose={onPromoUnlockClose}
        {...UNLOCK_CONFIGS.promo}
      />
    </>
  );
}
