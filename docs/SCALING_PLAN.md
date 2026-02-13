# План масштабирования платформы

> **Цель:** быстро интегрировать новые LiveOps ивенты и game cores, полишить старые, не раздувая проект.

## Текущее состояние

6 пакетов работают, 2 игры (солитер + маджонг), 2 LiveOps ивента (TH + DD).

**Проблема:** ~2000 строк дублирования между играми. Добавление 3-й игры = ~1100 строк copy-paste. Добавление 3-го ивента = ~1360 строк, из которых ~860 — дублирование.

---

## 1. GameShell — единая оркестрация

### Зачем

Сейчас `GameBoard.tsx` (~2500 строк) и `MahjongGame.tsx` (~2000 строк) — оба содержат одинаковую оркестрацию: winflow, popups, flying items, event icons, boosters, daily rewards UI. При добавлении 3-й игры придётся скопировать ~1500 строк оркестрации.

### Что делать

Создать `<GameShell>` — компонент-обёртку, который берёт на себя всё, кроме игрового поля:

```tsx
// components/GameShell.tsx
<GameShell gameId="mahjong" storagePrefix="mahjong">
  <MahjongBoard />  {/* Только тайлы и клики */}
</GameShell>

<GameShell gameId="solitaire" storagePrefix="solitaire">
  <SolitaireBoard />  {/* Только карты, drag & drop */}
</GameShell>
```

GameShell управляет:
- **useWinFlow** — очередь победных экранов (сейчас ~600 строк, хардкод `solitaire_*` ключей)
- **usePopupQueue** — управление всеми попапами (уже shared, но интеграция дублируется)
- **TopEventBar / BottomButtonRow** — UI панели ивентов и кнопок
- **FlyingItemsOverlay** — анимации полёта звёзд/предметов/паков
- **Event Registry рендеринг** — иконки активных ивентов (см. пункт 3)
- **Collections, Shop, Leaderboard, DailyRewards** — общие попапы

Игровому компоненту (Board) остаётся **только**:
- Рендеринг игрового поля
- Обработка кликов/drag
- Коммуникация с GameShell через контракт (callbacks: onWin, onScoreChange, onItemCompleted)

### Контракт между GameShell и Board

```typescript
interface GameShellCallbacks {
  onWin: () => void;                           // Игра выиграна
  onScoreChange: (delta: number) => void;       // Очки изменились
  onItemCompleted: (item: CompletedItem) => void; // Карта собрана / пара убрана
  // LiveOps ресурсы передаются Board-у через контекст
}

interface GameShellContext {
  gameId: string;
  storagePrefix: string;
  stars: number;
  activeEvents: ActiveEvent[];
  // Ресурсы ивентов (ключи/лопатки) — Board отрисовывает на картах/тайлах
  eventResources: Map<string, ResourceDistribution>;
}
```

### Результат

- GameBoard.tsx: ~2500 → ~800 строк (только карты и drag)
- MahjongGame.tsx: ~2000 → ~500 строк (только тайлы и клики)
- GameShell.tsx: ~1500 строк (одна копия вместо двух)
- **Новая игра:** ~300-500 строк Board компонента + 0 строк оркестрации

### Порядок внедрения

1. Создать GameShell с минимальным набором (usePopupQueue + useWinFlow)
2. Вынести в него TopEventBar + BottomButtonRow
3. Перевести маджонг на GameShell (проще, меньше legacy)
4. Перевести солитер (сложнее, больше edge cases)
5. Удалить дублирующийся код из GameBoard/MahjongGame

---

## 2. Store Factories в пакетах ивентов

### Зачем

Сейчас каждая игра дублирует storage barrel для каждого ивента:
- `liveops/treasureHunt/index.ts` (~80 строк, storage для солитера)
- `liveops/mahjongTreasureHunt/index.ts` (~80 строк, storage для маджонга)
- То же для DungeonDig (~80+80 строк)

Отличие — **только storage key prefix** (`solitaire_` vs `mahjong_`). Остальное — copy-paste.

Дополнительно, timer/state хуки (`useLiveOpsEvents` vs `useMahjongTreasureHunt`) дублируют ~150-180 строк каждый: interval timer, formatTimeRemaining, auto-deactivation, state transitions.

### Что делать

Пакеты `@game/treasure-hunt` и `@game/dungeon-dig` экспортируют **фабрику store** вместо singleton:

```typescript
// В @game/treasure-hunt/src/store.ts
export const createTreasureHuntStore = (config: {
  storageKey: string;           // 'solitaire_treasure_hunt_event' | 'mahjong_treasure_hunt_event'
  eventDurationMinutes: number; // 5 (солитер) | 1 (маджонг debug)
}) => create<TreasureHuntStore>((set, get) => ({
  event: null,
  timeRemaining: '',
  isTimeCritical: false,

  // Timer logic — ОДНА реализация
  startTimer: () => { /* interval + formatTimeRemaining + auto-deactivation */ },
  stopTimer: () => { /* clearInterval */ },

  // Storage — параметризован через config.storageKey
  loadEvent: () => {
    const raw = localStorage.getItem(config.storageKey);
    // ...
  },
  saveEvent: (event) => {
    localStorage.setItem(config.storageKey, JSON.stringify(event));
    // ...
  },

  // Actions
  activate: () => { /* ... */ },
  deactivate: () => { /* ... */ },
  addKey: () => { /* ... */ },
}));
```

Платформа создаёт конкретные инстансы **одной строкой**:

```typescript
// В платформе
export const useSolitaireTreasureHunt = createTreasureHuntStore({
  storageKey: 'solitaire_treasure_hunt_event',
  eventDurationMinutes: 5,
});

export const useMahjongTreasureHunt = createTreasureHuntStore({
  storageKey: 'mahjong_treasure_hunt_event',
  eventDurationMinutes: 1,
});
```

### Что это убирает

- **4 storage барреля** (~320 строк) → 4 строки конфигурации
- **4 timer/state хука** (~710 строк) → 0 строк (timer внутри store)
- Итого: **~1030 строк дублирования → ~20 строк конфигурации**

### Что нужно изменить в пакетах

1. `@game/treasure-hunt`: рефакторить `store.ts` в фабрику, включить timer logic
2. `@game/dungeon-dig`: аналогично
3. `@game/liveops-shared`: вынести общие timer утилиты (formatTimeRemaining уже там)
4. Платформа: заменить 4 барреля на 4 вызова фабрики
5. Удалить `useMahjongTreasureHunt.ts`, `useMahjongDungeonDig.ts`, `useLiveOpsEvents.ts` (TH/DD часть)

### Результат

- **Новый ивент для существующей игры:** 1 строка `createXxxStore({ storageKey, duration })`
- **Новый ивент для ВСЕХ игр:** 1 строка на игру (сейчас ~300 строк на игру)

---

## 3. Event Registry — декларативное подключение ивентов

### Зачем

Сейчас ивенты хардкодятся в JSX:

```tsx
// В GameBoard.tsx
{treasureHuntActive && <TreasureHuntIcon />}
{dungeonDigActive && <DungeonDigIcon />}
{pointsEventActive && <PointsEventBar />}
```

При добавлении 3-го ивента нужно: найти все места в JSX где рендерятся ивенты (TopEventBar, GameBoard, MahjongGame), добавить условие + компонент. Легко забыть одно из мест.

### Что делать

Создать реестр ивентов как конфигурацию:

```typescript
// lib/liveops/eventRegistry.ts
interface EventRegistration {
  id: string;                              // 'treasure-hunt' | 'dungeon-dig' | 'points-event'
  name: string;                            // 'Сундуки'
  unlockLevel: number;                     // 3
  createStore: (config: StoreConfig) => UseBoundStore<...>;
  components: {
    Icon: React.ComponentType<EventIconProps>;        // Иконка в TopEventBar
    Popup: React.ComponentType<EventPopupProps>;      // Попап ивента
    MiniProgress?: React.ComponentType;               // Мини-прогрессбар (для Points Event)
  };
  resourceType?: 'key' | 'shovel' | null;             // Тип ресурса (для ResourceManager)
  rotation?: {                                         // Участвует в ротации?
    group: 'main';                                     // Группа ротации (TH и DD в одной)
    priority: number;                                  // Порядок в группе
  };
}

// Регистрация
export const eventRegistry: EventRegistration[] = [
  {
    id: 'treasure-hunt',
    name: 'Сундуки',
    unlockLevel: 3,
    createStore: createTreasureHuntStore,
    components: {
      Icon: TreasureHuntIcon,
      Popup: TreasureHuntPopup,
    },
    resourceType: 'key',
    rotation: { group: 'main', priority: 1 },
  },
  {
    id: 'dungeon-dig',
    name: 'Подземелье',
    unlockLevel: 5,
    createStore: createDungeonDigStore,
    components: {
      Icon: DungeonDigIcon,
      Popup: DungeonDigPopup,
    },
    resourceType: 'shovel',
    rotation: { group: 'main', priority: 2 },
  },
  // Points Event, будущие ивенты...
];
```

GameShell использует registry для рендеринга:

```tsx
// В GameShell
const activeEvents = eventRegistry.filter(e => playerLevel >= e.unlockLevel);
// TopEventBar
{activeEvents.map(event => <event.components.Icon key={event.id} />)}
// Popups
{activeEvents.map(event => <event.components.Popup key={event.id} />)}
```

### Результат

- **Новый ивент:** создать пакет + добавить 1 запись в registry. Ноль изменений в GameShell/GameBoard/MahjongGame.
- **Удалить ивент:** убрать из registry. Ноль изменений в UI коде.
- **A/B тест:** registry может быть динамическим (подгружаться с сервера через LiveOps Calendar).

---

## 4. ResourceManager\<TTarget\> — абстрактное распределение ресурсов

### Зачем

Сейчас 4 менеджера ресурсов дублируют логику (~665 строк):
- `keyManager.ts` (~180 строк) — распределяет ключи по картам солитера + DOM
- `tileKeyManager.ts` (~150 строк) — распределяет ключи по тайлам маджонга (без DOM)
- `shovelManager.ts` (~180 строк) — распределяет лопатки по картам + DOM
- `tileShovelManager.ts` (~155 строк) — распределяет лопатки по тайлам (без DOM)

Логика: взять N элементов из массива, случайно выбрать 2-4, пометить как "имеет ресурс". Отличия: тип элемента (Card vs Tile), DOM-эффекты (солитер показывает иконки, маджонг — нет).

### Что делать

```typescript
// lib/liveops/createResourceManager.ts
interface ResourceManagerConfig<TTarget> {
  getTargets: () => TTarget[];                         // Получить все элементы
  getId: (target: TTarget) => string;                  // ID элемента
  resourceCount: (level: number) => number;            // Сколько ресурсов на уровне
  onDistribute?: (targets: Map<string, boolean>) => void; // DOM-эффект (опционально)
  onCollect?: (targetId: string) => void;              // Когда ресурс собран
}

export function createResourceManager<TTarget>(config: ResourceManagerConfig<TTarget>) {
  let distribution = new Map<string, boolean>();

  return {
    distribute: (level: number) => {
      const targets = config.getTargets();
      const count = config.resourceCount(level);
      const selected = shuffle(targets).slice(0, count);
      distribution = new Map(selected.map(t => [config.getId(t), true]));
      config.onDistribute?.(distribution);
      return distribution;
    },
    hasResource: (targetId: string) => distribution.get(targetId) ?? false,
    collect: (targetId: string) => {
      distribution.delete(targetId);
      config.onCollect?.(targetId);
    },
    getRemainingCount: () => distribution.size,
    reset: () => { distribution.clear(); },
  };
}
```

Использование:

```typescript
// Солитер — с DOM-эффектом
const solitaireKeyManager = createResourceManager<Card>({
  getTargets: () => getAllFaceDownCards(),
  getId: (card) => card.id,
  resourceCount: (level) => Math.min(2 + Math.floor(level / 3), 4),
  onDistribute: (map) => {
    // Рисуем иконки ключей на картах
    map.forEach((_, cardId) => showKeyIcon(cardId));
  },
});

// Маджонг — без DOM
const mahjongKeyManager = createResourceManager<Tile>({
  getTargets: () => getAllTiles(),
  getId: (tile) => tile.id,
  resourceCount: (level) => Math.min(2 + Math.floor(level / 3), 4),
  // Нет onDistribute — маджонг не показывает иконки на тайлах
});
```

### Результат

- 4 файла (~665 строк) → 1 файл (~80 строк) + 4 вызова по ~10 строк
- **Новый тип ресурса (3-й ивент):** ~10 строк конфигурации вместо ~180 строк нового менеджера

---

## 5. Shared UI — попапы в components/shared/

### Зачем

Общие попапы (TreasureHuntPopup, DungeonDigPopup, CollectionPackPopup, Collections) живут в `components/solitaire/`. Маджонг импортирует из solitaire-пространства — это работает, но:
- При 3-й игре `components/solitaire/` станет "свалкой" для shared кода
- Непонятно что сolitaire-specific, а что shared
- IDE навигация и поиск путает

### Что делать

```
components/
├── shared/                    # Общие для всех игр
│   ├── TreasureHuntPopup.tsx
│   ├── DungeonDigPopup.tsx
│   ├── CollectionPackPopup.tsx
│   ├── Collections.tsx
│   ├── PointsEventPopup.tsx
│   ├── EventEndedPopups.tsx
│   ├── LockedFeaturePopups.tsx
│   ├── UnlockPopups.tsx
│   └── FlyingRewardToMiniature.tsx
├── solitaire/                 # Только солитер
│   ├── GameBoard.tsx          # → SolitaireBoard.tsx (после GameShell)
│   ├── Card.tsx
│   ├── TableauColumn.tsx
│   └── ...
├── mahjong/                   # Только маджонг
│   ├── MahjongBoard.tsx
│   ├── TileComponent.tsx
│   └── ...
└── GameShell.tsx              # Общая оркестрация
```

### Результат

Механическая работа (переместить файлы + обновить импорты). Ноль изменений логики, но чистая архитектура.

---

## 6. GameCoreAdapter — типобезопасный контракт

### Зачем

`GameCore` интерфейс определён в `@game/liveops-shared`, но нигде не enforced. Коры используют duck typing. При 3+ играх это запутает — разработчик не знает какие методы core обязан реализовать.

### Что делать

```typescript
// @game/liveops-shared
interface GameCoreAdapter<TState, TMove, TResult> {
  createGame: (config?: any) => TState;
  applyMove: (state: TState, move: TMove) => TResult;
  getHint: (state: TState) => TMove | null;
  checkWinCondition: (state: TState) => boolean;
  getCompletedItems: (result: TResult) => CompletedItem[];  // Для LiveOps интеграции
}

// В @game/solitaire-core
export const solitaireAdapter: GameCoreAdapter<SolitaireState, SolitaireMove, MoveResult> = {
  createGame: (config) => initializeGame(config),
  applyMove: (state, move) => {
    // Маппинг на внутренние функции (moveCards, drawFromStock и т.д.)
  },
  getHint: (state) => getHint(state),
  checkWinCondition: (state) => checkWinCondition(state),
  getCompletedItems: (result) => result.completedCards ?? [],
};
```

GameShell работает через адаптер — не знает деталей конкретной игры.

### Результат

- Типобезопасность при добавлении нового core
- Компилятор подскажет какие методы не реализованы
- GameShell может работать с любым core через единый контракт

---

## 7. Checklists — "добавить ивент" / "добавить core"

### Зачем

Без чеклиста добавление 3-й игры или 3-го ивента требует реверс-инжиниринга существующих интеграций. LLM-агент потратит время на анализ вместо работы.

### Checklist: Добавить новый LiveOps ивент

```
□ 1. Создать пакет @game/new-event/
    □ types.ts — типы данных ивента
    □ logic.ts — бизнес-логика, конфиги (этажи/комнаты/тайлы)
    □ store.ts — фабрика createNewEventStore(config)
    □ index.ts — public API
    □ package.json — peers: @game/liveops-shared, zustand
    □ tsconfig.json, tsup.config.ts — build config

□ 2. Добавить в eventRegistry (lib/liveops/eventRegistry.ts)
    □ id, name, unlockLevel
    □ createStore
    □ components: Icon, Popup
    □ resourceType (если есть ресурс)
    □ rotation config (если участвует)

□ 3. Создать UI компоненты
    □ components/shared/NewEventPopup.tsx — попап ивента
    □ Иконка для TopEventBar (может быть inline)

□ 4. ResourceManager (если ивент использует ресурсы)
    □ Создать конфигурацию createResourceManager для каждой игры
    □ Интегрировать в GameShell (resource distribution при начале игры)

□ 5. Добавить в workspace
    □ git init, push
    □ Добавить в workspace root package.json
    □ npm install
    □ Добавить в vite.config optimizeDeps.include и server.fs.allow

□ 6. Тестирование
    □ npm run build в пакете
    □ npm run build в p4g-platform (GAME=solitaire + GAME=mahjong)
    □ Проверить ротацию ивентов
    □ Проверить оверлей завершения
    □ Проверить на мобильном (Telegram WebView)

□ 7. Версия
    □ Обновить PLATFORM_VERSION в version.ts
```

### Checklist: Добавить новый game core

```
□ 1. Создать пакет @game/new-core/
    □ types.ts — игровые типы
    □ logic.ts — правила и валидация ходов
    □ generator.ts — генерация решаемых начальных состояний
    □ index.ts — public API
    □ Реализовать GameCoreAdapter интерфейс
    □ Zero deps
    □ Smoke tests

□ 2. Создать Board компонент
    □ components/newgame/NewGameBoard.tsx — только поле и клики
    □ Реализовать GameShellCallbacks (onWin, onScoreChange, onItemCompleted)

□ 3. Подключить к GameShell
    □ Добавить в App.tsx (conditional import по __GAME__)
    □ <GameShell gameId="newgame"><NewGameBoard /></GameShell>

□ 4. Создать store инстансы для ивентов
    □ createTreasureHuntStore({ storageKey: 'newgame_th', duration: X })
    □ createDungeonDigStore({ storageKey: 'newgame_dd', duration: X })
    □ (+ будущие ивенты — по 1 строке каждый)

□ 5. ResourceManagers
    □ createResourceManager для каждого ивента (keys, shovels)

□ 6. Build config
    □ Добавить в workspace
    □ Добавить GAME=newgame в vite.config
    □ Добавить порт dev-сервера

□ 7. Тестирование
    □ Build пакета
    □ GAME=newgame npx vite build
    □ LiveOps ивенты работают
    □ Win flow работает
    □ Мобильное тестирование

□ 8. Версия + документация
    □ CORE_VERSION в пакете
    □ PLATFORM_VERSION в version.ts
    □ Обновить ARCHITECTURE.md
```

---

## Порядок реализации

### Фаза 1: Фабрики (фундамент)

| Шаг | Что | Зависит от |
|-----|-----|-----------|
| 1.1 | Store Factories в @game/treasure-hunt и @game/dungeon-dig | — |
| 1.2 | createResourceManager\<TTarget\> | — |
| 1.3 | Заменить баррели + хуки на фабрики | 1.1 |

**Результат:** ~1700 строк дублирования убрано. Инфраструктура для фазы 2.

### Фаза 2: GameShell + Registry

| Шаг | Что | Зависит от |
|-----|-----|-----------|
| 2.1 | Event Registry конфигурация | 1.1 |
| 2.2 | Перенести попапы в components/shared/ | — |
| 2.3 | Создать GameShell (минимальный: popups + winflow) | 2.1, 2.2 |
| 2.4 | Перевести маджонг на GameShell | 2.3 |
| 2.5 | Перевести солитер на GameShell | 2.4 |

**Результат:** единая оркестрация, новая игра = Board компонент + 0 оркестрации.

### Фаза 3: Контракты + документация

| Шаг | Что | Зависит от |
|-----|-----|-----------|
| 3.1 | GameCoreAdapter в @game/liveops-shared | — |
| 3.2 | Адаптеры в solitaire-core и mahjong-core | 3.1 |
| 3.3 | Checklists в docs/ | 2.5 |

**Результат:** типобезопасность, документация для LLM-агентов.

---

## Метрики успеха

| Метрика | Сейчас | После |
|---------|--------|-------|
| Строк copy-paste для 3-й игры | ~1120 | ~300-500 (только Board) |
| Строк copy-paste для 3-го ивента | ~1360 | ~500 (только Popup + logic) |
| Файлов storage barrel на ивент×игру | 1 файл ~80 строк | 1 строка конфигурации |
| Хуков timer/state на ивент×игру | 1 файл ~150 строк | 0 (внутри store factory) |
| Менеджеров ресурсов на ивент×игру | 1 файл ~170 строк | ~10 строк конфигурации |
| Мест для правки при добавлении ивента | 5-7 файлов | 1 файл (registry) + Popup |
