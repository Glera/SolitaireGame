/**
 * Locked Feature Popups
 * 
 * Показываются когда пользователь пытается открыть заблокированную функцию.
 * Все popup'ы управляются через onDemand queue в usePopupQueue.
 */

import React from 'react';
import { LockedFeaturePopupByKey } from './LockedFeaturePopup';
import { usePopupQueue } from '../../lib/stores/usePopupQueue';
import { COLLECTIONS_REQUIRED_LEVEL, LEADERBOARD_REQUIRED_LEVEL } from '../../hooks/useGameProgress';
import { getRequiredLevel as getDungeonRequiredLevel } from '../../lib/liveops/dungeonDig';

export function LockedFeaturePopups() {
  const popupQueue = usePopupQueue();
  
  const showLockedCollectionsPopup = popupQueue.onDemandPopup?.type === 'lockedCollections';
  const showLockedPointsEventPopup = popupQueue.onDemandPopup?.type === 'lockedPointsEvent';
  const showLockedLeaderboardPopup = popupQueue.onDemandPopup?.type === 'lockedLeaderboard';
  const showLockedDungeonPopup = popupQueue.onDemandPopup?.type === 'lockedDungeon';
  
  const closeLockedPopup = () => popupQueue.closeOnDemand();
  
  return (
    <>
      <LockedFeaturePopupByKey 
        isVisible={showLockedPointsEventPopup}
        onClose={closeLockedPopup}
        featureKey="pointsEvent"
        requiredLevelOverride={COLLECTIONS_REQUIRED_LEVEL}
      />
      
      <LockedFeaturePopupByKey 
        isVisible={showLockedCollectionsPopup}
        onClose={closeLockedPopup}
        featureKey="collections"
      />
      
      <LockedFeaturePopupByKey 
        isVisible={showLockedLeaderboardPopup}
        onClose={closeLockedPopup}
        featureKey="leaderboard"
        requiredLevelOverride={LEADERBOARD_REQUIRED_LEVEL}
      />
      
      <LockedFeaturePopupByKey 
        isVisible={showLockedDungeonPopup}
        onClose={closeLockedPopup}
        featureKey="dungeonDig"
        requiredLevelOverride={getDungeonRequiredLevel()}
      />
    </>
  );
}
