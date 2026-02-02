import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TreasureHuntEvent,
  getTreasureHuntEvent,
  saveTreasureHuntEvent,
  activateTreasureHunt,
  isEventAvailable,
  getRequiredLevel,
  addKeys,
  resetTreasureHuntEvent,
  formatTimeRemaining,
  isTimeCritical as checkIsTimeCritical,
  isEventExpired
} from '../lib/liveops/treasureHunt';
import {
  DungeonDigEvent,
  getDungeonDigEvent,
  saveDungeonDigEvent,
  activateDungeonDig,
  isEventAvailable as isDungeonAvailable,
  getRequiredLevel as getDungeonRequiredLevel,
  addShovels,
  resetDungeonDigEvent,
  formatTimeRemaining as formatDungeonTime,
  isTimeCritical as checkDungeonTimeCritical,
  isEventExpired as isDungeonExpired
} from '../lib/liveops/dungeonDig';

export type NextEventType = 'treasure' | 'dungeon';

// Callbacks for side effects that need to be handled by the parent component
export interface LiveOpsEventsCallbacks {
  // Called when treasure hunt timer expires (first time)
  onTreasureHuntExpired?: () => void;
  // Called when dungeon dig timer expires (first time)
  onDungeonDigExpired?: () => void;
}

export interface LiveOpsEventsState {
  // Treasure Hunt
  treasureHuntEvent: TreasureHuntEvent;
  treasureHuntExpired: boolean;
  treasureHuntTimeRemaining: string;
  treasureHuntTimeCritical: boolean;
  treasureHuntPulse: boolean;
  
  // Dungeon Dig
  dungeonDigEvent: DungeonDigEvent;
  dungeonDigExpired: boolean;
  dungeonDigTimeRemaining: string;
  dungeonDigTimeCritical: boolean;
  dungeonDigPulse: boolean;
  
  // Event rotation
  nextEventType: NextEventType;
  
  // Unlock status helpers
  eventsUnlocked: boolean;
  dungeonUnlocked: boolean;
  eventsRequiredLevel: number;
  dungeonRequiredLevel: number;
}

export interface LiveOpsEventsActions {
  // Treasure Hunt
  setTreasureHuntEvent: React.Dispatch<React.SetStateAction<TreasureHuntEvent>>;
  setTreasureHuntExpired: React.Dispatch<React.SetStateAction<boolean>>;
  setTreasureHuntPulse: React.Dispatch<React.SetStateAction<boolean>>;
  triggerTreasureHuntPulse: () => void;
  addKey: () => TreasureHuntEvent;
  resetTreasureHunt: () => void;
  activateTreasureHuntEvent: (level: number) => TreasureHuntEvent | null;
  deactivateTreasureHunt: () => void;
  
  // Dungeon Dig
  setDungeonDigEvent: React.Dispatch<React.SetStateAction<DungeonDigEvent>>;
  setDungeonDigExpired: React.Dispatch<React.SetStateAction<boolean>>;
  setDungeonDigPulse: React.Dispatch<React.SetStateAction<boolean>>;
  triggerDungeonDigPulse: () => void;
  addShovel: () => DungeonDigEvent;
  resetDungeonDig: () => void;
  activateDungeonDigEvent: (level: number) => DungeonDigEvent | null;
  deactivateDungeonDig: () => void;
  
  // Event rotation
  setNextEventType: React.Dispatch<React.SetStateAction<NextEventType>>;
  
  // Reset all
  resetAllEvents: () => void;
}

export interface UseLiveOpsEventsReturn extends LiveOpsEventsState, LiveOpsEventsActions {
  // Distribution refs (for external use)
  keysDistributedRef: React.MutableRefObject<boolean>;
  shovelsDistributedRef: React.MutableRefObject<boolean>;
}

export function useLiveOpsEvents(
  playerLevel: number,
  callbacks?: LiveOpsEventsCallbacks
): UseLiveOpsEventsReturn {
  // Treasure Hunt state
  const [treasureHuntEvent, setTreasureHuntEvent] = useState<TreasureHuntEvent>(() => getTreasureHuntEvent());
  const [treasureHuntExpired, setTreasureHuntExpired] = useState(() => {
    const event = getTreasureHuntEvent();
    return event.endTime ? isEventExpired(event) : false;
  });
  const [treasureHuntTimeRemaining, setTreasureHuntTimeRemaining] = useState('');
  const [treasureHuntTimeCritical, setTreasureHuntTimeCritical] = useState(false);
  const [treasureHuntPulse, setTreasureHuntPulse] = useState(false);
  
  // Dungeon Dig state
  const [dungeonDigEvent, setDungeonDigEvent] = useState<DungeonDigEvent>(() => getDungeonDigEvent());
  const [dungeonDigExpired, setDungeonDigExpired] = useState(() => {
    const event = getDungeonDigEvent();
    return event.endTime ? isDungeonExpired(event) : false;
  });
  const [dungeonDigTimeRemaining, setDungeonDigTimeRemaining] = useState('');
  const [dungeonDigTimeCritical, setDungeonDigTimeCritical] = useState(false);
  const [dungeonDigPulse, setDungeonDigPulse] = useState(false);
  
  // Event rotation
  const [nextEventType, setNextEventType] = useState<NextEventType>(() => {
    const saved = localStorage.getItem('solitaire_next_event_type');
    return (saved === 'dungeon' ? 'dungeon' : 'treasure') as NextEventType;
  });
  
  // Distribution tracking refs
  const keysDistributedRef = useRef(false);
  const shovelsDistributedRef = useRef(false);
  
  // Computed values
  const eventsUnlocked = isEventAvailable(playerLevel);
  const dungeonUnlocked = isDungeonAvailable(playerLevel);
  const eventsRequiredLevel = getRequiredLevel();
  const dungeonRequiredLevel = getDungeonRequiredLevel();
  
  // Track if we've already called the expiry callback
  const treasureHuntExpiredCallbackFiredRef = useRef(false);
  const dungeonDigExpiredCallbackFiredRef = useRef(false);
  
  // Treasure Hunt timer effect
  useEffect(() => {
    if (!treasureHuntEvent.active || !treasureHuntEvent.endTime) {
      setTreasureHuntTimeRemaining('');
      return;
    }
    
    const updateTimer = () => {
      if (isEventExpired(treasureHuntEvent)) {
        const wasExpired = treasureHuntExpired;
        setTreasureHuntExpired(true);
        setTreasureHuntTimeRemaining('0:00');
        setTreasureHuntTimeCritical(true);
        
        // Call callback only once when first expired
        if (!wasExpired && !treasureHuntExpiredCallbackFiredRef.current) {
          treasureHuntExpiredCallbackFiredRef.current = true;
          callbacks?.onTreasureHuntExpired?.();
        }
      } else {
        const timeStr = formatTimeRemaining(treasureHuntEvent.endTime!);
        setTreasureHuntTimeRemaining(timeStr);
        setTreasureHuntTimeCritical(checkIsTimeCritical(treasureHuntEvent.endTime!));
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [treasureHuntEvent.active, treasureHuntEvent.endTime, treasureHuntExpired, callbacks]);
  
  // Dungeon Dig timer effect
  useEffect(() => {
    if (!dungeonDigEvent.active || !dungeonDigEvent.endTime) {
      setDungeonDigTimeRemaining('');
      return;
    }
    
    const updateTimer = () => {
      if (isDungeonExpired(dungeonDigEvent)) {
        const wasExpired = dungeonDigExpired;
        setDungeonDigExpired(true);
        setDungeonDigTimeRemaining('0:00');
        setDungeonDigTimeCritical(true);
        
        // Call callback only once when first expired
        if (!wasExpired && !dungeonDigExpiredCallbackFiredRef.current) {
          dungeonDigExpiredCallbackFiredRef.current = true;
          callbacks?.onDungeonDigExpired?.();
        }
      } else {
        const timeStr = formatDungeonTime(dungeonDigEvent.endTime!);
        setDungeonDigTimeRemaining(timeStr);
        setDungeonDigTimeCritical(checkDungeonTimeCritical(dungeonDigEvent.endTime!));
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dungeonDigEvent.active, dungeonDigEvent.endTime, dungeonDigExpired, callbacks]);
  
  // Auto-deactivate Treasure Hunt when expired and keys spent
  useEffect(() => {
    if (treasureHuntExpired && treasureHuntEvent.keys === 0 && treasureHuntEvent.active) {
      const updatedEvent = { ...treasureHuntEvent, active: false };
      saveTreasureHuntEvent(updatedEvent);
      setTreasureHuntEvent(updatedEvent);
      setNextEventType('dungeon');
      localStorage.setItem('solitaire_next_event_type', 'dungeon');
    }
  }, [treasureHuntExpired, treasureHuntEvent.keys, treasureHuntEvent.active]);
  
  // Auto-deactivate Dungeon Dig when expired and shovels spent
  useEffect(() => {
    if (dungeonDigExpired && dungeonDigEvent.shovels === 0 && dungeonDigEvent.active) {
      const updatedEvent = { ...dungeonDigEvent, active: false };
      saveDungeonDigEvent(updatedEvent);
      setDungeonDigEvent(updatedEvent);
      setNextEventType('treasure');
      localStorage.setItem('solitaire_next_event_type', 'treasure');
    }
  }, [dungeonDigExpired, dungeonDigEvent.shovels, dungeonDigEvent.active]);
  
  // Actions
  const triggerTreasureHuntPulse = useCallback(() => {
    setTreasureHuntPulse(true);
    setTimeout(() => setTreasureHuntPulse(false), 200);
  }, []);
  
  const triggerDungeonDigPulse = useCallback(() => {
    setDungeonDigPulse(true);
    setTimeout(() => setDungeonDigPulse(false), 200);
  }, []);
  
  const addKey = useCallback(() => {
    const updated = addKeys(1);
    setTreasureHuntEvent(updated);
    return updated;
  }, []);
  
  const addShovelAction = useCallback(() => {
    const updated = addShovels(1);
    setDungeonDigEvent(updated);
    return updated;
  }, []);
  
  const resetTreasureHunt = useCallback(() => {
    resetTreasureHuntEvent();
    setTreasureHuntEvent(getTreasureHuntEvent());
    setTreasureHuntExpired(false);
    setTreasureHuntTimeRemaining('');
    keysDistributedRef.current = false;
    treasureHuntExpiredCallbackFiredRef.current = false;
  }, []);
  
  const resetDungeonDigAction = useCallback(() => {
    resetDungeonDigEvent();
    setDungeonDigEvent(getDungeonDigEvent());
    setDungeonDigExpired(false);
    setDungeonDigTimeRemaining('');
    shovelsDistributedRef.current = false;
    dungeonDigExpiredCallbackFiredRef.current = false;
  }, []);
  
  const activateTreasureHuntEventAction = useCallback((level: number) => {
    const activated = activateTreasureHunt(level);
    if (activated) {
      setTreasureHuntEvent(activated);
      setTreasureHuntExpired(false);
      setTreasureHuntTimeRemaining('');
      keysDistributedRef.current = false;
      treasureHuntExpiredCallbackFiredRef.current = false;
    }
    return activated;
  }, []);
  
  const activateDungeonDigEventAction = useCallback((level: number) => {
    const activated = activateDungeonDig(level);
    if (activated) {
      setDungeonDigEvent(activated);
      setDungeonDigExpired(false);
      setDungeonDigTimeRemaining('');
      shovelsDistributedRef.current = false;
      dungeonDigExpiredCallbackFiredRef.current = false;
    }
    return activated;
  }, []);
  
  const deactivateTreasureHunt = useCallback(() => {
    const updatedEvent = { ...treasureHuntEvent, active: false };
    saveTreasureHuntEvent(updatedEvent);
    setTreasureHuntEvent(updatedEvent);
    setNextEventType('dungeon');
    localStorage.setItem('solitaire_next_event_type', 'dungeon');
  }, [treasureHuntEvent]);
  
  const deactivateDungeonDig = useCallback(() => {
    const updatedEvent = { ...dungeonDigEvent, active: false };
    saveDungeonDigEvent(updatedEvent);
    setDungeonDigEvent(updatedEvent);
    setNextEventType('treasure');
    localStorage.setItem('solitaire_next_event_type', 'treasure');
  }, [dungeonDigEvent]);
  
  const resetAllEvents = useCallback(() => {
    resetTreasureHunt();
    resetDungeonDigAction();
    setNextEventType('treasure');
    localStorage.setItem('solitaire_next_event_type', 'treasure');
  }, [resetTreasureHunt, resetDungeonDigAction]);
  
  return {
    // State
    treasureHuntEvent,
    treasureHuntExpired,
    treasureHuntTimeRemaining,
    treasureHuntTimeCritical,
    treasureHuntPulse,
    dungeonDigEvent,
    dungeonDigExpired,
    dungeonDigTimeRemaining,
    dungeonDigTimeCritical,
    dungeonDigPulse,
    nextEventType,
    eventsUnlocked,
    dungeonUnlocked,
    eventsRequiredLevel,
    dungeonRequiredLevel,
    
    // Actions
    setTreasureHuntEvent,
    setTreasureHuntExpired,
    setTreasureHuntPulse,
    triggerTreasureHuntPulse,
    addKey,
    resetTreasureHunt,
    activateTreasureHuntEvent: activateTreasureHuntEventAction,
    deactivateTreasureHunt,
    setDungeonDigEvent,
    setDungeonDigExpired,
    setDungeonDigPulse,
    triggerDungeonDigPulse,
    addShovel: addShovelAction,
    resetDungeonDig: resetDungeonDigAction,
    activateDungeonDigEvent: activateDungeonDigEventAction,
    deactivateDungeonDig,
    setNextEventType,
    resetAllEvents,
    
    // Refs
    keysDistributedRef,
    shovelsDistributedRef,
  };
}
