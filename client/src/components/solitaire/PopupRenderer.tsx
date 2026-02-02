import React from 'react';
import { usePopupQueue, WinFlowPopup, OnDemandPopup } from '../../lib/stores/usePopupQueue';

// Import all popup components
import { LevelUpScreen } from './LevelUpScreen';
import { DailyRewardPopup } from './DailyRewardPopup';
import { StreakPopup } from './StreakPopup';
import { UnlockPopup, UNLOCK_CONFIGS } from './UnlockPopup';
import { TreasureHuntPromo } from './TreasureHuntPromo';
import { DungeonDigPromo } from './DungeonDigPromo';
import { CollectionPackPopup } from './CollectionPackPopup';
import { LockedFeaturePopupByKey } from './LockedFeaturePopup';
import { TreasureHuntPopup } from './TreasureHuntPopup';
import { DungeonDigPopup } from './DungeonDigPopup';
import { PointsEventPopup } from './PointsEventPopup';
import { LeaderboardPopup } from './LeaderboardPopup';
import { NoMovesModal } from './NoMovesModal';
import { DebugPopup } from '../DebugPopup';

export interface PopupRendererProps {
  // Refs needed by some popups
  progressBarRef: React.RefObject<HTMLDivElement>;
  
  // Callbacks for specific popup actions
  onLevelUpComplete: () => void;
  onDailyRewardClaim: () => void;
  onStreakContinue: () => void;
  onUnlockClose: (type: 'collections' | 'tournament' | 'dailyQuests' | 'promo') => void;
  onTreasureHuntPromoClose: () => void;
  onDungeonDigPromoClose: () => void;
  onDailyQuestsClose: () => void;
  onLeaderboardClose: () => void;
  onPackClose: () => void;
  
  // On-demand popup callbacks
  onTreasureHuntClose: () => void;
  onDungeonDigClose: () => void;
  onPointsEventClose: () => void;
  onLockedFeatureClose: () => void;
  onEventEndedClose: () => void;
  onDungeonEndedClose: () => void;
  onNoMovesClose: () => void;
  onNoMovesNewGame: () => void;
  
  // Star animation callback
  onStarArrived?: (count: number) => void;
  
  // Treasure Hunt popup props
  treasureHuntPopupProps?: {
    keys: number;
    chests: any[];
    milestones: any[];
    grandPrize: any;
    onOpenChest: (index: number) => void;
    onClaimMilestone: (index: number) => void;
    onClaimGrandPrize: () => void;
    timeRemaining: number;
    isExpired: boolean;
  };
  
  // Dungeon Dig popup props
  dungeonDigPopupProps?: {
    shovels: number;
    floor: number;
    grid: any[][];
    isRevealed: boolean[][];
    entryPosition: { row: number; col: number } | null;
    exitPosition: { row: number; col: number } | null;
    exitFound: boolean;
    onDig: (row: number, col: number) => void;
    onNextFloor: () => void;
    timeRemaining: number;
    isExpired: boolean;
    onAddShovels?: () => void;
  };
  
  // Points event props
  pointsEventProps?: {
    points: number;
    level: number;
    rewards: any[];
  };
  
  // Leaderboard props
  leaderboardProps?: {
    isExpired: boolean;
  };
  
  // No moves props
  noMovesProps?: {
    remainingCards: number;
  };
  
  // Debug callback
  onDebugCallback?: (info: any) => void;
}

/**
 * PopupRenderer - renders the current popup from the queue.
 * 
 * This component subscribes to the popup queue store and renders
 * the appropriate popup component based on the current queue state.
 * 
 * Key principle: Each popup is rendered based on queue state only.
 * No complex isVisible logic needed - if it's current, it renders.
 */
export function PopupRenderer(props: PopupRendererProps) {
  const { current, onDemandPopup, dismiss, closeOnDemand } = usePopupQueue();
  
  // Render on-demand popup if present (takes priority)
  if (onDemandPopup) {
    return renderOnDemandPopup(onDemandPopup, props, closeOnDemand);
  }
  
  // Render current queue popup
  if (current) {
    return renderQueuePopup(current, props, dismiss);
  }
  
  return null;
}

function renderQueuePopup(
  popup: WinFlowPopup,
  props: PopupRendererProps,
  dismiss: () => void
): React.ReactElement | null {
  switch (popup.type) {
    case 'levelUp':
      return (
        <LevelUpScreen
          isVisible={true}
          newLevel={popup.level}
          starsReward={popup.stars}
          onComplete={() => {
            props.onLevelUpComplete();
            dismiss();
          }}
          progressBarRef={props.progressBarRef}
        />
      );
      
    case 'dailyReward':
      return (
        <DailyRewardPopup
          isVisible={true}
          currentDay={popup.day}
          previousStreak={popup.day - 1}
          onClaim={() => {
            props.onDailyRewardClaim();
            dismiss();
          }}
          progressBarRef={props.progressBarRef}
          onStarArrived={props.onStarArrived}
        />
      );
      
    case 'streak':
      return (
        <StreakPopup
          isVisible={true}
          streakDay={popup.count}
          onContinue={() => {
            props.onStreakContinue();
            dismiss();
          }}
        />
      );
      
    case 'unlockCollections':
      return (
        <UnlockPopup
          isVisible={true}
          onClose={() => {
            props.onUnlockClose('collections');
            dismiss();
          }}
          {...UNLOCK_CONFIGS.collections}
        />
      );
      
    case 'unlockTournament':
      return (
        <UnlockPopup
          isVisible={true}
          onClose={() => {
            props.onUnlockClose('tournament');
            dismiss();
          }}
          {...UNLOCK_CONFIGS.leaderboard}
          headerSubtitle="Достигнут 4 уровень"
        />
      );
      
    case 'unlockDailyQuests':
      // Daily quests don't have a dedicated unlock popup in current implementation
      // Just dismiss and proceed
      dismiss();
      return null;
      
    case 'unlockPromo':
      return (
        <UnlockPopup
          isVisible={true}
          onClose={() => {
            props.onUnlockClose('promo');
            dismiss();
          }}
          {...UNLOCK_CONFIGS.promo}
        />
      );
      
    case 'treasureHuntPromo':
      return (
        <TreasureHuntPromo
          onClose={() => {
            props.onTreasureHuntPromoClose();
            dismiss();
          }}
        />
      );
      
    case 'dungeonDigPromo':
      return (
        <DungeonDigPromo
          onClose={() => {
            props.onDungeonDigPromoClose();
            dismiss();
          }}
        />
      );
      
    case 'dailyQuests':
      // Daily quests is handled differently - it's a full screen component
      // We just signal that it should be shown
      props.onDailyQuestsClose();
      dismiss();
      return null;
      
    case 'leaderboard':
      // Leaderboard in win flow
      props.onLeaderboardClose();
      dismiss();
      return null;
      
    case 'collectionPack':
      return (
        <CollectionPackPopup
          isOpen={true}
          pack={popup.pack}
          onClose={() => {
            props.onPackClose();
            dismiss();
          }}
        />
      );
      
    default:
      return null;
  }
}

function renderOnDemandPopup(
  popup: OnDemandPopup,
  props: PopupRendererProps,
  closeOnDemand: () => void
): React.ReactElement | null {
  switch (popup.type) {
    case 'treasureHunt':
      if (!props.treasureHuntPopupProps) return null;
      return (
        <TreasureHuntPopup
          isOpen={true}
          onClose={() => {
            props.onTreasureHuntClose();
            closeOnDemand();
          }}
          {...props.treasureHuntPopupProps}
        />
      );
      
    case 'dungeonDig':
      if (!props.dungeonDigPopupProps) return null;
      return (
        <DungeonDigPopup
          isOpen={true}
          onClose={() => {
            props.onDungeonDigClose();
            closeOnDemand();
          }}
          {...props.dungeonDigPopupProps}
        />
      );
      
    case 'pointsEvent':
      if (!props.pointsEventProps) return null;
      return (
        <PointsEventPopup
          isOpen={true}
          onClose={() => {
            props.onPointsEventClose();
            closeOnDemand();
          }}
          {...props.pointsEventProps}
        />
      );
      
    case 'lockedCollections':
      return (
        <LockedFeaturePopupByKey
          isVisible={true}
          featureKey="collections"
          onClose={() => {
            props.onLockedFeatureClose();
            closeOnDemand();
          }}
        />
      );
      
    case 'lockedLeaderboard':
      return (
        <LockedFeaturePopupByKey
          isVisible={true}
          featureKey="leaderboard"
          onClose={() => {
            props.onLockedFeatureClose();
            closeOnDemand();
          }}
        />
      );
      
    case 'lockedDungeon':
      return (
        <LockedFeaturePopupByKey
          isVisible={true}
          featureKey="dungeon"
          onClose={() => {
            props.onLockedFeatureClose();
            closeOnDemand();
          }}
        />
      );
      
    case 'lockedPointsEvent':
      return (
        <LockedFeaturePopupByKey
          isVisible={true}
          featureKey="pointsEvent"
          onClose={() => {
            props.onLockedFeatureClose();
            closeOnDemand();
          }}
        />
      );
      
    case 'leaderboardView':
      return (
        <LeaderboardPopup
          isOpen={true}
          onClose={() => {
            closeOnDemand();
          }}
          isExpired={props.leaderboardProps?.isExpired ?? false}
        />
      );
      
    case 'noMoves':
      return (
        <NoMovesModal
          isOpen={true}
          onClose={() => {
            props.onNoMovesClose();
            closeOnDemand();
          }}
          onNewGame={() => {
            props.onNoMovesNewGame();
            closeOnDemand();
          }}
          remainingCards={props.noMovesProps?.remainingCards ?? 0}
        />
      );
      
    case 'eventEnded':
    case 'dungeonEnded':
      // These are simple modals handled inline in GameBoard for now
      return null;
      
    case 'debug':
      // Debug popup is special - handled elsewhere
      return null;
      
    default:
      return null;
  }
}
