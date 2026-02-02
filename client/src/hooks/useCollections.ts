/**
 * useCollections Hook
 * 
 * Управляет состоянием коллекций:
 * - Загрузка/сохранение прогресса
 * - Награды за завершённые коллекции
 * - UI состояние (popup visibility, new items, pulse)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePopupQueue } from '../lib/stores/usePopupQueue';
import { defaultCollections, type Collection } from '../components/solitaire/Collections';

export interface FlyingIcon {
  id: string;
  icon: string;
  itemId: string;
  collectionId: string;
  startX: number;
  startY: number;
  isDuplicate?: boolean;
  rarity?: number;
}

export interface CollectionsState {
  // Data
  collections: Collection[];
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  completedCollectionsCount: number;
  
  // Rewards tracking
  rewardedCollections: Set<string>;
  setRewardedCollections: React.Dispatch<React.SetStateAction<Set<string>>>;
  allCollectionsRewarded: boolean;
  setAllCollectionsRewarded: React.Dispatch<React.SetStateAction<boolean>>;
  pendingCollectionRewards: string[];
  setPendingCollectionRewards: React.Dispatch<React.SetStateAction<string[]>>;
  
  // UI state
  showCollections: boolean;
  openCollections: () => void;
  closeCollections: () => void;
  collectionsAfterWin: boolean;
  setCollectionsAfterWin: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Flying icons
  flyingIcons: FlyingIcon[];
  setFlyingIcons: React.Dispatch<React.SetStateAction<FlyingIcon[]>>;
  hasNewCollectionItem: boolean;
  setHasNewCollectionItem: React.Dispatch<React.SetStateAction<boolean>>;
  newItemsInCollections: Set<string>;
  setNewItemsInCollections: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // UI helpers
  collectionsResetKey: number;
  setCollectionsResetKey: React.Dispatch<React.SetStateAction<number>>;
  collectionButtonPulse: boolean;
  setCollectionButtonPulse: React.Dispatch<React.SetStateAction<boolean>>;
  collectionsButtonRef: React.RefObject<HTMLButtonElement>;
  
  // Unlock state
  collectionsUnlockShown: boolean;
  setCollectionsUnlockShown: React.Dispatch<React.SetStateAction<boolean>>;
  pendingCollectionsUnlock: boolean;
  setPendingCollectionsUnlock: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  resetCollections: () => void;
  markCollectionRewarded: (collectionId: string) => void;
  collectItem: (collectionId: string, itemId: string) => void;
}

export function useCollections(): CollectionsState {
  const popupQueue = usePopupQueue();
  
  // Popup visibility via queue
  const showCollections = popupQueue.onDemandPopup?.type === 'collections';
  const openCollections = useCallback(() => popupQueue.showOnDemand({ type: 'collections' }), [popupQueue]);
  const closeCollections = useCallback(() => popupQueue.closeOnDemand(), [popupQueue]);
  
  // Track if collections were opened automatically after winning
  const [collectionsAfterWin, setCollectionsAfterWin] = useState(false);
  
  // Collections data with localStorage persistence
  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('solitaire_collections');
    if (saved) {
      try {
        const savedCollections = JSON.parse(saved) as Collection[];
        // Merge saved progress with default structure (to get updated rewards/names)
        return defaultCollections.map(defaultColl => {
          const savedColl = savedCollections.find(sc => sc.id === defaultColl.id);
          if (savedColl) {
            return {
              ...defaultColl,
              items: defaultColl.items.map(defaultItem => {
                const savedItem = savedColl.items.find(si => si.id === defaultItem.id);
                return {
                  ...defaultItem,
                  collected: savedItem?.collected || false
                };
              })
            };
          }
          return defaultColl;
        });
      } catch {
        return defaultCollections;
      }
    }
    return defaultCollections;
  });
  
  // Save collections to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_collections', JSON.stringify(collections));
  }, [collections]);
  
  // Calculate completed collections count
  const completedCollectionsCount = collections.filter(c => c.items.every(i => i.collected)).length;
  
  // Track which collections have been rewarded
  const [rewardedCollections, setRewardedCollections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('solitaire_rewarded_collections');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  
  // Save rewarded collections to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_rewarded_collections', JSON.stringify(Array.from(rewardedCollections)));
  }, [rewardedCollections]);
  
  // Track if grand prize has been rewarded
  const [allCollectionsRewarded, setAllCollectionsRewarded] = useState(() => {
    const saved = localStorage.getItem('solitaire_all_collections_rewarded');
    return saved === 'true';
  });
  
  useEffect(() => {
    localStorage.setItem('solitaire_all_collections_rewarded', allCollectionsRewarded.toString());
  }, [allCollectionsRewarded]);
  
  // Queue of pending collection rewards
  const [pendingCollectionRewards, setPendingCollectionRewards] = useState<string[]>([]);
  
  // Flying icons state
  const [flyingIcons, setFlyingIcons] = useState<FlyingIcon[]>([]);
  const [hasNewCollectionItem, setHasNewCollectionItem] = useState(false);
  const [newItemsInCollections, setNewItemsInCollections] = useState<Set<string>>(new Set());
  
  // UI state
  const [collectionsResetKey, setCollectionsResetKey] = useState(0);
  const [collectionButtonPulse, setCollectionButtonPulse] = useState(false);
  const collectionsButtonRef = useRef<HTMLButtonElement>(null);
  
  // Unlock state
  const [collectionsUnlockShown, setCollectionsUnlockShown] = useState(() => {
    return localStorage.getItem('solitaire_collections_unlock_shown') === 'true';
  });
  const [pendingCollectionsUnlock, setPendingCollectionsUnlock] = useState(false);
  
  // Actions
  const resetCollections = useCallback(() => {
    setCollections(defaultCollections);
    setRewardedCollections(new Set());
    setAllCollectionsRewarded(false);
    setPendingCollectionRewards([]);
    setHasNewCollectionItem(false);
    setNewItemsInCollections(new Set());
    setCollectionsResetKey(k => k + 1);
    localStorage.removeItem('solitaire_collections');
    localStorage.removeItem('solitaire_rewarded_collections');
    localStorage.removeItem('solitaire_all_collections_rewarded');
    localStorage.removeItem('solitaire_collections_unlock_shown');
  }, []);
  
  const markCollectionRewarded = useCallback((collectionId: string) => {
    setRewardedCollections(prev => new Set([...prev, collectionId]));
  }, []);
  
  const collectItem = useCallback((collectionId: string, itemId: string) => {
    setCollections(prev => prev.map(collection => {
      if (collection.id === collectionId) {
        return {
          ...collection,
          items: collection.items.map(item => {
            if (item.id === itemId) {
              return { ...item, collected: true };
            }
            return item;
          })
        };
      }
      return collection;
    }));
  }, []);
  
  return {
    // Data
    collections,
    setCollections,
    completedCollectionsCount,
    
    // Rewards tracking
    rewardedCollections,
    setRewardedCollections,
    allCollectionsRewarded,
    setAllCollectionsRewarded,
    pendingCollectionRewards,
    setPendingCollectionRewards,
    
    // UI state
    showCollections,
    openCollections,
    closeCollections,
    collectionsAfterWin,
    setCollectionsAfterWin,
    
    // Flying icons
    flyingIcons,
    setFlyingIcons,
    hasNewCollectionItem,
    setHasNewCollectionItem,
    newItemsInCollections,
    setNewItemsInCollections,
    
    // UI helpers
    collectionsResetKey,
    setCollectionsResetKey,
    collectionButtonPulse,
    setCollectionButtonPulse,
    collectionsButtonRef,
    
    // Unlock state
    collectionsUnlockShown,
    setCollectionsUnlockShown,
    pendingCollectionsUnlock,
    setPendingCollectionsUnlock,
    
    // Actions
    resetCollections,
    markCollectionRewarded,
    collectItem,
  };
}
