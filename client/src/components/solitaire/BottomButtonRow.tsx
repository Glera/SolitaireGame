import React, { RefObject } from 'react';
import { Collection } from '../../lib/liveops/pointsEvent';
import { Quest } from '../../hooks/useDailyQuests';
import { COLLECTIONS_REQUIRED_LEVEL, LEADERBOARD_REQUIRED_LEVEL } from '../../hooks/useGameProgress';

export interface BottomButtonRowProps {
  // Visibility control - hide entire bar when any popup is open
  isVisible: boolean;
  
  // Secondary collections button for flying icons during TreasureHunt/DungeonDig popups
  showSecondaryCollectionsButton: boolean;
  
  // Game state
  showNewGameButton: boolean;
  canUndo: boolean;
  
  // Daily quests
  dailyQuests: Quest[];
  
  // Unlock states
  collectionsUnlocked: boolean;
  leaderboardUnlocked: boolean;
  isSubscribed: boolean;
  
  // Collections
  collections: Collection[];
  completedCollectionsCount: number;
  hasNewCollectionItem: boolean;
  allCollectionsRewarded: boolean;
  rewardedCollections: Set<string>;
  collectionButtonPulse: boolean;
  
  // Leaderboard
  leaderboardNewPosition: number;
  showOvertakenNotification: boolean;
  
  // Refs
  collectionsButtonRef: RefObject<HTMLButtonElement>;
  
  // Callbacks
  onNewGame: () => void;
  onUndo: () => void;
  onHint: () => void;
  onShowDailyQuests: () => void;
  onShowShop: () => void;
  onShowCollections: () => void;
  onShowLeaderboard: () => void;
  onShowLockedCollections: () => void;
  onShowLockedLeaderboard: () => void;
}

// Collection Pack Icon SVG Component
const CollectionPackIcon: React.FC<{ locked?: boolean; size?: 'sm' | 'md' }> = ({ locked = false, size = 'md' }) => {
  const width = size === 'sm' ? 28 : 34;
  const height = size === 'sm' ? 38 : 46;
  const topOffset = size === 'sm' ? '-top-6' : '-top-7';
  
  if (locked) {
    return (
      <svg className={`absolute ${topOffset}`} width={width} height={height} viewBox="0 0 36 48" fill="none" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))', opacity: 0.5 }}>
        <rect x="0" y="0" width="36" height="48" rx="5" fill="#6b7280" />
        <text x="18" y="20" textAnchor="middle" fontSize="8" fill="#9ca3af">★ ★ ★</text>
        <text x="18" y="32" textAnchor="middle" fontSize="10" fill="#9ca3af">★ ★</text>
      </svg>
    );
  }
  
  const gradientId = `packGradient5_${Math.random().toString(36).substr(2, 9)}`;
  const shineId = `packShine5_${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <svg className={`absolute ${topOffset}`} width={width} height={height} viewBox="0 0 36 48" fill="none" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
      <rect x="0" y="0" width="36" height="48" rx="5" fill={`url(#${gradientId})`} />
      <rect x="0" y="0" width="36" height="48" rx="5" fill={`url(#${shineId})`} />
      <text x="18" y="20" textAnchor="middle" fontSize="8" fill="#fbbf24" style={{ textShadow: '0 0 6px rgba(251, 191, 36, 1)' }}>★ ★ ★</text>
      <text x="18" y="32" textAnchor="middle" fontSize="10" fill="#fbbf24" style={{ textShadow: '0 0 6px rgba(251, 191, 36, 1)' }}>★ ★</text>
      <rect x="1" y="1" width="34" height="46" rx="4" fill="none" stroke="rgba(251, 191, 36, 0.5)" strokeWidth="1" />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="36" y2="48">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="50%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="36" y2="48">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const BottomButtonRow: React.FC<BottomButtonRowProps> = ({
  isVisible,
  showSecondaryCollectionsButton,
  showNewGameButton,
  canUndo,
  dailyQuests,
  collectionsUnlocked,
  leaderboardUnlocked,
  isSubscribed,
  collections,
  completedCollectionsCount,
  hasNewCollectionItem,
  allCollectionsRewarded,
  rewardedCollections,
  collectionButtonPulse,
  leaderboardNewPosition,
  showOvertakenNotification,
  collectionsButtonRef,
  onNewGame,
  onUndo,
  onHint,
  onShowDailyQuests,
  onShowShop,
  onShowCollections,
  onShowLeaderboard,
  onShowLockedCollections,
  onShowLockedLeaderboard,
}) => {
  const completedQuests = dailyQuests.filter(q => q.completed).length;
  const totalQuests = dailyQuests.length;
  const allQuestsCompleted = completedQuests === totalQuests;
  const allCollectionsCompleted = completedCollectionsCount === collections.length;

  return (
    <>
      {/* Main Bottom Buttons Row */}
      {isVisible && (
        <div className="fixed bottom-[49px] left-1/2 -translate-x-1/2 z-40 flex items-end gap-2 pb-0 pointer-events-none" style={{ paddingTop: '40px' }}>
          {/* New Game Button - shown when no moves available */}
          {showNewGameButton && (
            <button
              onClick={onNewGame}
              className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 rounded-xl shadow-lg border-b-4 border-red-700 transition-all hover:scale-105 animate-pulse pointer-events-auto"
              title="Новая раскладка"
            >
              <span className="absolute -top-9 text-[2.75rem]" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>🔄</span>
            </button>
          )}
          
          {/* Undo Button */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`relative w-14 h-8 flex items-center justify-center rounded-xl shadow-lg border-b-4 transition-all pointer-events-auto ${
              canUndo
                ? 'bg-gradient-to-b from-slate-400 to-slate-500 hover:from-slate-300 hover:to-slate-400 border-slate-600 hover:scale-105'
                : 'bg-gradient-to-b from-gray-400 to-gray-500 border-gray-600 opacity-40 cursor-not-allowed'
            }`}
            title="Отменить ход"
          >
            <span className={`absolute -top-9 text-[2.75rem] ${!canUndo ? 'opacity-40' : ''}`} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>↩️</span>
          </button>
          
          {/* Hint Button */}
          <button
            onClick={onHint}
            className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 rounded-xl shadow-lg border-b-4 border-amber-600 transition-all hover:scale-105 pointer-events-auto"
            title="Подсказка"
          >
            <span className="absolute -top-9 text-[2.75rem]" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>💡</span>
          </button>
          
          {/* Daily Quests Button */}
          <button
            onClick={onShowDailyQuests}
            className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 rounded-xl shadow-lg border-b-4 border-purple-700 transition-all hover:scale-105 pointer-events-auto"
            title="Задания"
          >
            <span className="absolute -top-9 text-[2.75rem]" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>📋</span>
            <span className={`absolute top-1 -right-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold shadow-md ${allQuestsCompleted ? 'bg-green-500 text-white' : 'bg-white text-gray-800'}`}>
              {completedQuests}/{totalQuests}
            </span>
          </button>
          
          {/* Shop Button */}
          <button
            onClick={onShowShop}
            className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-xl shadow-lg border-b-4 border-teal-700 transition-all hover:scale-105 pointer-events-auto"
            title="Магазин"
          >
            <span className="absolute -top-9 text-[2.75rem]" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>🛒</span>
            {isSubscribed && (
              <span className="absolute -top-3 -right-1 text-lg drop-shadow-md">👑</span>
            )}
          </button>
          
          {/* Collections Button */}
          <button
            ref={collectionsUnlocked ? collectionsButtonRef : undefined}
            data-collections-button
            onClick={collectionsUnlocked ? onShowCollections : onShowLockedCollections}
            className={`relative w-14 h-8 flex items-center justify-center rounded-xl shadow-lg border-b-4 transition-all pointer-events-auto ${
              collectionsUnlocked 
                ? 'bg-gradient-to-b from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-orange-700 hover:scale-105' 
                : 'bg-gradient-to-b from-gray-500 to-gray-600 border-gray-700 opacity-70'
            }`}
            style={collectionButtonPulse ? { animation: 'collection-pop 0.15s ease-out' } : undefined}
            title={collectionsUnlocked ? 'Коллекции' : `Коллекции (LVL ${COLLECTIONS_REQUIRED_LEVEL})`}
          >
            <CollectionPackIcon locked={!collectionsUnlocked} />
            {collectionsUnlocked ? (
              <span className={`absolute top-1 -right-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold shadow-md ${allCollectionsCompleted ? 'bg-green-500 text-white' : 'bg-white text-gray-800'}`}>
                {completedCollectionsCount}/{collections.length}
              </span>
            ) : (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">🔒 {COLLECTIONS_REQUIRED_LEVEL}</span>
            )}
            {collectionsUnlocked && hasNewCollectionItem && !allCollectionsRewarded && (
              <span className="absolute -top-2 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md animate-bounce">!</span>
            )}
          </button>
          
          {/* Leaderboard Button */}
          <button
            onClick={leaderboardUnlocked ? onShowLeaderboard : onShowLockedLeaderboard}
            className={`relative w-14 h-8 flex items-center justify-center rounded-xl shadow-lg border-b-4 transition-all pointer-events-auto ${
              leaderboardUnlocked 
                ? `bg-gradient-to-b from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-blue-700 hover:scale-105 ${showOvertakenNotification ? 'animate-pulse ring-2 ring-red-500' : ''}`
                : 'bg-gradient-to-b from-gray-500 to-gray-600 border-gray-700 opacity-70'
            }`}
            title={leaderboardUnlocked ? `Турнир ${leaderboardNewPosition}/20` : `Турнир (LVL ${LEADERBOARD_REQUIRED_LEVEL})`}
          >
            <span className={`absolute -top-9 text-[2.75rem] ${leaderboardUnlocked ? '' : 'opacity-50'}`} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>🏆</span>
            {leaderboardUnlocked ? (
              <>
                <span className="absolute top-1 -right-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold bg-white text-gray-800 shadow-md">
                  {leaderboardNewPosition}
                </span>
                {showOvertakenNotification && (
                  <span className="absolute -top-2 -left-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] items-center justify-center shadow-md">⬇️</span>
                  </span>
                )}
              </>
            ) : (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-sm px-2 py-0.5 rounded-full bg-black/90 text-white font-bold shadow-lg whitespace-nowrap">🔒 {LEADERBOARD_REQUIRED_LEVEL}</span>
            )}
          </button>
          
          {/* Overtaken notification toast - positioned just above buttons */}
          {leaderboardUnlocked && showOvertakenNotification && (
            <div 
              className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500/90 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg"
              style={{ animation: 'slideUp 0.3s ease-out' }}
            >
              😱 Вас обогнали!
            </div>
          )}
        </div>
      )}
      
      {/* Secondary Collections Button - visible during TreasureHunt/DungeonDig popups for flying icons */}
      {showSecondaryCollectionsButton && (
        <div className="fixed bottom-[49px] left-1/2 -translate-x-1/2 z-[10001] flex items-end gap-2 pb-0 pointer-events-none" style={{ paddingTop: '40px' }}>
          {/* Invisible spacers to match cushion button row layout */}
          <div className="w-14 h-8 opacity-0"></div>
          <div className="w-14 h-8 opacity-0"></div>
          <div className="w-14 h-8 opacity-0"></div>
          <div className="w-14 h-8 opacity-0"></div>
          <div className="w-14 h-8 opacity-0"></div>
          {/* Actual visible Collections button (non-clickable, just target for flying items) */}
          <div
            ref={collectionsButtonRef as React.RefObject<HTMLDivElement>}
            data-collections-button
            className="relative w-14 h-8 flex items-center justify-center bg-gradient-to-b from-amber-500 to-orange-600 rounded-xl shadow-lg border-b-4 border-orange-700"
            style={collectionButtonPulse ? { animation: 'collection-pop 0.15s ease-out' } : undefined}
          >
            <svg className="absolute -top-8" width="34" height="46" viewBox="0 0 36 48" fill="none" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
              <rect x="0" y="0" width="36" height="48" rx="5" fill="url(#packGradient5b)" />
              <rect x="0" y="0" width="36" height="48" rx="5" fill="url(#packShine5b)" />
              <text x="18" y="20" textAnchor="middle" fontSize="8" fill="#fbbf24" style={{ textShadow: '0 0 6px rgba(251, 191, 36, 1)' }}>★ ★ ★</text>
              <text x="18" y="32" textAnchor="middle" fontSize="10" fill="#fbbf24" style={{ textShadow: '0 0 6px rgba(251, 191, 36, 1)' }}>★ ★</text>
              <rect x="1" y="1" width="34" height="46" rx="4" fill="none" stroke="rgba(251, 191, 36, 0.5)" strokeWidth="1" />
              <defs>
                <linearGradient id="packGradient5b" x1="0" y1="0" x2="36" y2="48">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="50%" stopColor="#6d28d9" />
                  <stop offset="100%" stopColor="#4c1d95" />
                </linearGradient>
                <linearGradient id="packShine5b" x1="0" y1="0" x2="36" y2="48">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
                </linearGradient>
              </defs>
            </svg>
            <span className={`absolute top-1 -right-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold shadow-md ${allCollectionsCompleted ? 'bg-green-500 text-white' : 'bg-white text-gray-800'}`}>
              {completedCollectionsCount}/{collections.length}
            </span>
            {hasNewCollectionItem && !allCollectionsRewarded && (
              <span className="absolute -top-2 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">!</span>
            )}
          </div>
          <div className="w-14 h-8 opacity-0"></div>
        </div>
      )}
    </>
  );
};
