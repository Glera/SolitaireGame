/**
 * Unlock Popups
 * 
 * Показываются когда пользователь достигает нового уровня и открывает функции.
 * Управляются через win flow queue в usePopupQueue.
 * 
 * Используем условный рендеринг (как TreasureHuntPromo) вместо isVisible prop.
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
  
  const currentType = popupQueue.current?.type;
  
  return (
    <>
      {/* Collections Unlock Popup (shown when reaching level 2) */}
      {currentType === 'unlockCollections' && (
        <UnlockPopup
          onClose={onCollectionsUnlockClose}
          {...UNLOCK_CONFIGS.collections}
        />
      )}
      
      {/* Leaderboard Unlock Popup (shown when reaching level 4) */}
      {currentType === 'unlockTournament' && (
        <UnlockPopup
          onClose={onLeaderboardUnlockClose}
          {...UNLOCK_CONFIGS.leaderboard}
          headerSubtitle={`Достигнут ${LEADERBOARD_REQUIRED_LEVEL} уровень`}
        />
      )}
      
      {/* Promo/Shop Unlock Popup (shown on first win after collections unlock) */}
      {currentType === 'unlockPromo' && (
        <UnlockPopup
          onClose={onPromoUnlockClose}
          {...UNLOCK_CONFIGS.promo}
        />
      )}
    </>
  );
}
