# Рефакторинг GameBoard.tsx

## Обзор

GameBoard.tsx изначально вырос до ~4025 строк кода, став "god component". Был проведён масштабный рефакторинг для декомпозиции бизнес-логики, не связанной с игрой в Solitaire.

**Результат**: с ~4025 строк до ~2387 строк (сокращение **~41%**)

## Ключевые изменения

### 1. Popup Queue система

**Проблема**: Множество независимых `useState` для каждого popup, сложная логика показа в определённой последовательности, race conditions.

**Решение**: Централизованная система управления popups через Zustand store.

#### Файл: `lib/stores/usePopupQueue.ts`

Два типа popups:
- **WinFlow popups** — показываются последовательно после победы (очередь FIFO)
- **On-Demand popups** — открываются по запросу пользователя (только один активен)

```typescript
// WinFlow types
type WinFlowPopup = 
  | { type: 'levelUp'; level: number; stars: number }
  | { type: 'streak'; count: number; stars: number }
  | { type: 'dailyReward'; day: number; stars: number }
  | { type: 'dailyQuests' }
  | { type: 'treasureHuntPromo' }
  | { type: 'dungeonDigPromo' }
  | { type: 'unlockCollections' }
  | { type: 'unlockLeaderboard' }
  | { type: 'unlockPromo' };

// On-Demand types  
type OnDemandPopup =
  | { type: 'shop' }
  | { type: 'leaderboard' }
  | { type: 'collections' }
  | { type: 'settings' }
  | { type: 'dailyQuests' }
  | { type: 'pointsEvent' }
  | { type: 'lockedCollections' }
  | { type: 'lockedLeaderboard' }
  | { type: 'lockedPointsEvent' }
  | { type: 'lockedDungeonDig' }
  | { type: 'eventEnded' }
  | { type: 'dungeonEnded' };
```

#### Использование:

```typescript
// Добавить popup в очередь победного флоу
const { enqueue, dequeue, openOnDemand, closeOnDemand } = usePopupQueue();

enqueue({ type: 'levelUp', level: 5, stars: 100 });
enqueue({ type: 'dailyQuests' });

// Получить текущий popup
const current = popupQueue.current; // первый в очереди

// Закрыть и перейти к следующему
dequeue();

// On-demand popups
openOnDemand({ type: 'shop' });
closeOnDemand();
```

---

### 2. Извлечённые хуки

Каждый хук инкапсулирует состояние, localStorage persistence и бизнес-логику.

#### `useCollections.ts`

Управление коллекциями предметов.

```typescript
const {
  collections,              // Collection[]
  setCollections,
  rewardedCollections,      // Set<string>
  allCollectionsRewarded,
  newItemsInCollections,    // Set<string> — коллекции с новыми предметами
  newItemIds,               // Set<string> — ID новых предметов
  hasNewCollectionItem,
  flyingIcons,              // анимация полёта иконок
  launchFlyingIcon,
  removeFlyingIcon,
  collectionsUnlockShown,   // показан ли анлок
  pendingCollectionsUnlock,
  showCollections,          // boolean — окно открыто
  openCollections,          // () => void
  closeCollections,
} = useCollections();
```

#### `useShop.ts`

Управление магазином и подпиской.

```typescript
const {
  isSubscribed,
  setIsSubscribed,
  promoUnlocked,           // разблокирован ли promo
  pendingPromoUnlock,
  showShop,                // окно открыто
  openShop,
  closeShop,
} = useShop();
```

#### `useLeaderboard.ts`

Лидерборд, симуляция других игроков, сезоны.

```typescript
const {
  leaderboardPlayers,      // Player[]
  seasonInfo,              // { season, startDate, endDate }
  seasonStars,             // звёзды текущего сезона
  leaderboardTrophies,     // Map<number, number>
  leaderboardUnlockShown,
  pendingLeaderboardUnlock,
  showOvertakenNotification,
  
  initializeLeaderboardData,  // начальная загрузка
  resetLeaderboardData,       // сброс при reset progress
  addSeasonStarsAndUpdate,    // добавить звёзды и обновить позицию
  handleLeaderboardClose,     // закрыть с callback
  tryShowLeaderboard,         // попробовать открыть (проверяет уровень)
} = useLeaderboard({ playerLevel, onAfterClose });
```

#### `useDailyRewards.ts`

Daily login streak и награды.

```typescript
const {
  dailyStreak,
  setDailyStreak,
  lastLoginDate,
  setLastLoginDate,
  pendingDailyReward,
  setPendingDailyReward,
  pendingStreak,
  setPendingStreak,
  
  tryGetDailyRewardPopup,  // проверить и вернуть popup данные
  claimDailyReward,        // забрать награду, возвращает количество звёзд
} = useDailyRewards({ onNewDay: resetDailyQuests });

// Utility
import { getRewardStars } from './useDailyRewards';
getRewardStars(streak); // 10, 20, 30, 50, 75, 100, 150
```

#### `usePointsEvent.ts`

LiveOps ивент с очками и паками.

```typescript
const {
  pointsEventState,
  setPointsEventState,
  pointsEventPulse,        // пульсация иконки
  triggerPointsEventPulse,
  rewardIconAnimating,
  nextRewardDropping,
  animatingRewardIndex,
  pointsEventIconRef,      // ref для анимации
  
  showPointsEventPopup,
  openPointsEventPopup,
  closePointsEventPopup,
  resetPointsEventData,
} = usePointsEvent();
```

#### `useTreasureFlyingStars.ts`

Анимация звёзд из сундуков Treasure Hunt.

```typescript
const {
  treasureFlyingStars,     // TreasureFlyingStar[]
  launchTreasureStars,     // (count, startPos) => void
  handleTreasureStarArrived,
} = useTreasureFlyingStars({
  progressBarRef,
  onStarArrived: (id) => setDisplayedStars(prev => prev + 1),
  onPulse: triggerStarPulse,
});
```

#### `useCollisionParticles.ts`

Частицы при "столкновении" иконок с целью.

```typescript
const {
  particles,               // CollisionParticle[]
  createBurst,             // (x, y) => void
} = useCollisionParticles({
  particleCount: 12,
  colors: ['#FFD700', '#FFA500', '#FF6B6B'],
  lifetime: 800,
});

// Компонент для рендера
import { CollisionParticles } from './CollisionParticle';
<CollisionParticles particles={particles} />
```

#### `useDebugActions.ts`

Дебаг-функции для тестирования.

```typescript
const {
  handleTestWin,           // симуляция победы
  handleTestLevelUp,       // симуляция level up
  handleNextDay,           // симуляция нового дня
  handleStartDungeonDig,   // принудительный запуск Dungeon Dig
  handleResetAll,          // полный сброс прогресса
  handleDropCollectionItem, // выпадение предмета коллекции (дебаг)
} = useDebugActions({
  // ~50 callbacks и значений
  playSuccess,
  addStars,
  resetStarsProgress,
  // ...
});
```

#### `useWinFlow.ts` ⭐ САМЫЙ БОЛЬШОЙ

Полная оркестрация победного флоу (~600 строк).

```typescript
const {
  // Главные обработчики
  handleWinComplete,           // обработка экрана победы
  handleLevelUpComplete,       // обработка level up
  handleDailyQuestsClose,      // закрытие daily quests
  
  // Unlock handlers
  handleCollectionsUnlockClose,
  handleLeaderboardUnlockClose,
  handlePromoUnlockClose,
  
  // Event promo handlers
  handleTreasureHuntPromoClose,
  handleDungeonDigPromoClose,
  
  // Flow control
  tryClaimPointsEventReward,   // claim награды Points Event
  proceedAfterPointsEventRewards,
  proceedToDailyQuests,
  proceedToCollectionsOrNewGame,
} = useWinFlow({
  // State setters
  addStars,
  setDisplayedStars,
  launchTreasureStars,
  setShowWinScreen,
  
  // Daily quests
  dailyQuests,
  setDailyQuests,
  openDailyQuests,
  closeDailyQuests,
  
  // Points event
  setPointsEventState,
  setPackRewardsQueue,
  setShowPackPopup,
  
  // Level up
  pendingLevelUp,
  setPendingLevelUp,
  setPlayerLevel,
  playerLevel,
  
  // Collections
  collections,
  rewardedCollections,
  collectionsUnlocked,
  // ... и многое другое
  
  // Shared refs (важно для синхронизации!)
  dailyQuestsShownThisWinRef,
  autoClaimingRewardsRef,
  isClaimingRewardRef,
});
```

**Важно**: Refs передаются из GameBoard для синхронизации состояния между хуком и компонентами.

---

### 3. Извлечённые компоненты

#### `EventEndedPopups.tsx`

Popups окончания LiveOps ивентов.

```tsx
<EventEndedPopup    // Treasure Hunt ended
  isOpen={showEventEnded}
  onClose={closeEventEnded}
/>

<DungeonEndedPopup  // Dungeon Dig ended
  isOpen={showDungeonEnded}
  onClose={closeDungeonEnded}
/>
```

#### `LockedFeaturePopups.tsx`

Popups заблокированных фич.

```tsx
<LockedFeaturePopups
  showLockedCollections={...}
  showLockedLeaderboard={...}
  showLockedPointsEvent={...}
  showLockedDungeonDig={...}
  onClose={closeOnDemand}
  playerLevel={playerLevel}
/>
```

#### `UnlockPopups.tsx`

Popups разблокировки фич.

```tsx
<UnlockPopups
  showCollectionsUnlock={...}
  showLeaderboardUnlock={...}
  showPromoUnlock={...}
  onCollectionsUnlockClose={...}
  onLeaderboardUnlockClose={...}
  onPromoUnlockClose={...}
/>
```

#### `CollisionParticle.tsx`

Компонент частиц.

```tsx
// Один particle
<CollisionParticle particle={p} onComplete={removeParticle} />

// Контейнер для всех
<CollisionParticles particles={particles} />
```

#### `FlyingRewardToMiniature.tsx`

Анимация полёта наград из Points Event иконки к миниатюрам.

```tsx
<FlyingRewardToMiniature
  reward={flyingReward}
  targetRef={miniatureContainerRef}
  pendingIndex={pendingRewardsIndex}
  onComplete={() => setFlyingReward(null)}
/>
```

---

### 4. localStorage ключи

Все ключи вынесены в константу в `useDebugActions.ts`:

```typescript
const STORAGE_KEYS = [
  'solitaire_total_stars',
  'solitaire_daily_quests',
  'solitaire_daily_quests_date',
  'solitaire_aces_collected',
  'solitaire_monthly_progress',
  'solitaire_monthly_reward_claimed',
  'solitaire_daily_streak',
  'solitaire_last_login_date',
  'solitaire_collections',
  'solitaire_rewarded_collections',
  'solitaire_all_collections_rewarded',
  'solitaire_trophies',
  'solitaire_player_xp',
  'solitaire_leaderboard',
  'solitaire_leaderboard_position',
  'solitaire_season_info',
  'solitaire_season_stars',
  'solitaire_leaderboard_trophies',
  'solitaire_player_level',
  'solitaire_treasure_hunt_promo_shown',
  'solitaire_dungeon_dig_promo_shown',
  'solitaire_collections_unlock_shown',
  'solitaire_leaderboard_unlock_shown',
  'solitaire_promo_unlocked',
  'solitaire_first_win',
  'solitaire_next_event_type',
];
```

---

## Что осталось в GameBoard.tsx

После рефакторинга GameBoard содержит только:

1. **Игровую логику Solitaire** — tableau, foundations, stock, waste
2. **Интеграцию хуков** — связывание всех хуков вместе
3. **JSX разметку** — основной layout игры
4. **Flying Key/Shovel Callbacks** — анимации ключей и лопат
5. **Pack Rewards Queue** — очередь наград из паков
6. **Daily Quest callbacks** — claimDailyReward и reset

---

## Потенциальные дальнейшие улучшения

1. **Pack Rewards Queue** (~30 строк) → `usePackRewards.ts`
2. **Flying Key/Shovel Callbacks** (~170 строк) → объединить с `useLiveOpsEvents.ts` или создать `useFlyingDrops.ts`
3. **Points Event Card Callback** (~80 строк) → объединить с `usePointsEvent.ts`

---

## Версионирование

| Версия | Изменения |
|--------|-----------|
| 4.68.0 | Начало рефакторинга popup queue |
| 4.69.0 | Миграция Collections на хук |
| 4.70.0 | Миграция Shop на хук |
| 4.71.0 | Миграция Leaderboard на хук |
| 4.72.0 | Миграция TreasureFlyingStars на хук |
| 4.73.0 | Миграция DailyRewards на хук |
| 4.74.0 | Миграция CollisionParticles на хук |
| 4.75.0 | Миграция Debug Actions на хук |
| 4.76.0 | Извлечение handleDropCollectionItem в useDebugActions |
| 4.77.0 | Удаление _legacyShopPurchaseHandler |
| 4.78.0 | Извлечение FlyingRewardToMiniature компонента |
| 4.79.0 | Исправление ключей/лопат при перестановке карт (solvability) |
| 4.80.0 | Извлечение FlyingRewardToMiniature в отдельный файл |
| 4.81.0 | **Извлечение Win Flow Orchestration в useWinFlow.ts** (~500 строк) |
| 4.82.0 | Исправление двойного показа daily quests (синхронизация refs) |

---

## Версии v4.99+ — Подсказки и анимации

| Версия | Изменения |
|--------|-----------|
| 4.99.47 | Priority 6 в getHint — проверка ВСЕХ tableau-to-tableau ходов |
| 4.99.48 | Синхронное обновление localStorage перед открытием DailyQuests |
| 4.99.49 | Карта под анимирующейся доступна для клика |
| 4.99.50 | Ускорение анимаций на 30% + централизация констант |
| 4.99.51 | Исправлены бессмысленные подсказки хода |
| 4.99.52 | Подсказки предлагают только ходы открывающие карты |
| 4.99.53 | Умная подсказка с анализом на один ход вперёд |
| 4.99.54 | Добавлена документация CLAUDE.md |

---

## Версии v5.0+ — Мультиигровая платформа

| Версия | Изменения |
|--------|-----------|
| 5.0.0 | Извлечение пакетов: solitaire-core, liveops-shared, treasure-hunt, dungeon-dig |
| 5.0.1 | Shell barrel pattern, import replacements (29+ файлов) |
| 5.0.2 | Создание mahjong-core (tiles, layouts, generator, gameOps) |
| 5.0.3 | MahjongGame.tsx — главный компонент маджонга |
| 5.0.4 | Маджонг LiveOps — TreasureHunt, DungeonDig, Points Event |
| 5.0.5 | useMahjongTreasureHunt, useMahjongDungeonDig хуки |
| 5.0.6 | Оверлеи завершения ивентов, фикс DD exitFoundLock, floating "Пусто" |

---

## Статистика рефакторинга

| Метрика | До | После | Изменение |
|---------|-----|-------|-----------|
| Строк в GameBoard.tsx | ~4025 | ~2387 | **-1638 (-41%)** |
| Кол-во хуков (солитер) | 0 | 12 | +12 |
| Кол-во хуков (маджонг) | 0 | 3 | +3 (useMahjongGame, useMahjongTH, useMahjongDD) |
| Кол-во компонентов | 0 | 5+2 | +7 (5 солитер popup + 2 маджонг) |
| Извлечённые пакеты | 0 | 5 | +5 (@game/*) |
| Удалённые файлы (shell) | 0 | 14 | -14 (перенесены в пакеты) |
