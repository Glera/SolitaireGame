# Архитектура проекта

## Общая структура

Проект состоит из **6 git-репозиториев** в npm workspace:

```
p4g-platform-workspace/              # npm workspace root
├── liveops-shared/                  # @game/liveops-shared (zero deps)
├── solitaire-core/                  # @game/solitaire-core (zero deps)
├── mahjong-core/                    # @game/mahjong-core (zero deps)
├── treasure-hunt/                   # @game/treasure-hunt (peers: liveops-shared, zustand)
├── dungeon-dig/                     # @game/dungeon-dig (peers: liveops-shared, zustand)
└── p4g-platform/                    # Shell — UI, хуки, бизнес-логика
    ├── client/src/                  # Frontend (React + Vite)
    │   ├── components/
    │   │   ├── solitaire/           # Солитер компоненты + общие попапы (TH, DD)
    │   │   ├── mahjong/            # Маджонг компоненты (Board, Tile)
    │   │   └── ui/                 # UI kit (Radix-based)
    │   ├── games/
    │   │   └── MahjongGame.tsx     # Главный компонент маджонга
    │   ├── hooks/                  # React hooks
    │   ├── lib/
    │   │   ├── liveops/            # LiveOps баррели (per-game storage)
    │   │   ├── solitaire/          # Shell-файлы солитера
    │   │   └── stores/             # Zustand stores
    │   └── pages/
    ├── server/                     # Backend (Express)
    └── shared/                     # Drizzle ORM + Zod схемы
```

## Извлечённые пакеты

### @game/liveops-shared
Общие типы и утилиты для игровых пакетов. **Zero deps.**
- `PackRarity`, `CollectionPack`, `EventReward`
- `PlatformAdapter` интерфейс
- `GameCore<TState, TMove, THint>` контракт
- `pointsEvent` — reward cycle, pack generation
- `timeUtils` — `formatTimeRemaining()`, `isTimeCritical()`

### @game/solitaire-core
Движок косынки. **Zero deps.**
- `types.ts` — Card, Suit, Rank, SolitaireState
- `cardUtils.ts` — createDeck, canPlaceOnTableau/Foundation
- `gameLogic.ts` — initializeGame, drawFromStock, moveCards, checkWinCondition
- `scoring.ts` — CARD_POINTS, calculateCardPoints
- `solvableGenerator.ts` — generateSolvableGame (~1000 строк, backtracking)
- `hints.ts` — getHint (6 приоритетов)

### @game/mahjong-core
Движок маджонга. **Zero deps.**
- `types.ts` — Tile, TileSuit, Layout, MahjongState
- `tiles.ts` — создание 144 тайлов
- `layouts.ts` — лейаут "черепаха" (Turtle)
- `logic.ts` — isTileFree (layer overlap + left/right blocking)
- `generator.ts` — reverse placement (гарантированная решаемость)
- `gameOps.ts` — selectTile → SelectResult с matched? field

### @game/treasure-hunt
LiveOps ивент "Сундуки". **Peers: liveops-shared, zustand.**
- `types.ts` — TreasureHuntEvent, TreasureRoom
- `logic.ts` — openChest, claimMilestone, activateEvent
- `storage.ts` — PlatformAdapter-based storage
- `store.ts` — Zustand store

### @game/dungeon-dig
LiveOps ивент "Подземелье". **Peers: liveops-shared, zustand.**
- `types.ts` — DungeonDigEvent, DungeonFloor, DungeonTile
- `logic.ts` — digTile, canDigTile, getDiggableTiles
- `storage.ts` — PlatformAdapter-based storage
- `store.ts` — Zustand store

## Shell Barrel Pattern (LiveOps)

Каждая игра имеет свой barrel-файл для LiveOps ивентов:

```
lib/liveops/
├── treasureHunt/          # Солитер TH: re-export @game/treasure-hunt + keyManager
├── dungeonDig/            # Солитер DD: re-export @game/dungeon-dig + shovelManager
├── mahjongTreasureHunt/   # Маджонг TH: re-export + mahjong-specific localStorage
├── mahjongDungeonDig/     # Маджонг DD: re-export + mahjong-specific localStorage
└── pointsEvent.ts         # Points Event
```

**Зачем barrel?**
- Разные storage keys по играм (`solitaire_*` vs `mahjong_*`)
- Солитер-баррели содержат DOM-зависимые keyManager/shovelManager
- Маджонг-баррели — чистые функции (без DOM)
- Пакеты `@game/*` содержат только чистую логику

## Компонентная архитектура

### Солитер: GameBoard.tsx (главный компонент)
Центральный компонент, оркестрирующий:
- Игровое поле (tableau, foundation, stock, waste)
- LiveOps события
- Popups и модальные окна
- Анимации и визуальные эффекты

**Рефакторинг выполнен**: С ~4025 до ~2387 строк (сокращение **41%**).
Бизнес-логика вынесена в 12 отдельных хуков. См. [REFACTORING.md](./REFACTORING.md).

### Маджонг: MahjongGame.tsx (главный компонент)
Центральный компонент маджонга (~2000 строк):
- Тайловое поле с многослойным лейаутом
- LiveOps интеграция (TH, DD, Points Event)
- Победный флоу и автоигра
- Попапы (общие с солитером: TreasureHuntPopup, DungeonDigPopup, CollectionPackPopup)

### Общие LiveOps компоненты
```
TreasureHuntPopup.tsx     # Ивент "Сундуки" (используется обеими играми)
DungeonDigPopup.tsx        # Ивент "Подземелье" (используется обеими играми)
PointsEventPopup.tsx       # Ивент "Паки"
CollectionPackPopup.tsx    # Открытие паков коллекций
Collections.tsx            # Окно коллекций
```

### Солитер-специфичные компоненты
```
Card.tsx                   # Отдельная карта
TableauColumn.tsx          # Колонка на столе
FoundationPile.tsx         # Стопка для сбора
StockPile.tsx              # Колода
WastePile.tsx              # Открытые карты из колоды
DragPreview.tsx            # Превью при перетаскивании
TopEventBar.tsx            # Верхняя панель ивентов
BottomButtonRow.tsx        # Кнопки внизу
```

### Маджонг-специфичные компоненты
```
MahjongBoard.tsx           # Тайловое поле
TileComponent.tsx          # Отдельный тайл
```

### Извлечённые popup-компоненты
```
EventEndedPopups.tsx        # Popups окончания ивентов
LockedFeaturePopups.tsx     # Popups заблокированных фич
UnlockPopups.tsx            # Popups разблокировки фич
CollisionParticle.tsx       # Burst-частицы при анимациях
FlyingRewardToMiniature.tsx # Анимация полёта наград к миниатюрам
```

## State Management

### useSolitaire (Zustand)
Главный store солитера:
- `tableau`, `foundations`, `stock`, `waste` — игровое состояние
- `animatingCard` — текущая анимируемая карта
- `isDragging`, `draggedCards` — состояние перетаскивания
- `isAutoCollecting` — флаг авто-сбора
- `hint`, `hasNoMoves` — подсказки (делегируются в @game/solitaire-core)

### useMahjongGame (хук)
Стейт маджонга (React useState + useCallback):
- Делегирует логику в @game/mahjong-core
- selectTile → SelectResult → shell решает scoring/penalties
- Автоигра, подсказки, перезапуск

### usePopupQueue (Zustand)
Централизованное управление всеми popups:
- **WinFlow popups** — очередь FIFO для победного флоу
- **On-Demand popups** — popups по запросу (shop, settings, etc.)

См. [REFACTORING.md](./REFACTORING.md) для деталей.

### Маджонг LiveOps хуки
```
hooks/
├── useMahjongTreasureHunt.ts  # TH state, timer, actions
└── useMahjongDungeonDig.ts    # DD state, timer, actions
```

### Солитер бизнес-логика хуки
Извлечённые из GameBoard.tsx:
```
hooks/
├── useWinFlow.ts              # Win Flow оркестрация (~600 строк)
├── useCollections.ts          # Коллекции предметов
├── useShop.ts                 # Магазин и подписка
├── useLeaderboard.ts          # Лидерборд и сезоны
├── useDailyRewards.ts         # Daily streak и награды
├── usePointsEvent.ts          # Points Event LiveOps
├── useTreasureFlyingStars.ts  # Анимация звёзд
├── useCollisionParticles.ts   # Burst-частицы
├── useDebugActions.ts         # Дебаг-функции
├── useDailyQuests.ts          # Ежедневные задания
├── useGameProgress.ts         # Прогресс игрока
├── useLiveOpsEvents.ts        # LiveOps координация (солитер)
└── useTouchDrag.ts            # Touch-перетаскивание
```

### LiveOps Stores
Каждый ивент имеет свой store:
- `treasureHunt/store.ts` — состояние ивента "Сундуки"
- `dungeonDig/store.ts` — состояние ивента "Подземелье"

**Важно**: localStorage — источник истины для LiveOps состояния.

## Система анимаций

### Паттерн анимации карт (солитер)
1. Установить `animatingCard` с позициями start/end
2. CSS transition перемещает карту
3. `onTransitionEnd` или timeout завершает анимацию
4. Обновление state после завершения

### FlyingCard.tsx
Отдельный компонент для параллельных анимаций полёта карт (auto-collect).

### pointer-events-none
Критически важно для предотвращения дублирования:
```tsx
className={cn(
  isDragging && "opacity-0 pointer-events-none",
  isAnimating && "opacity-0 pointer-events-none"
)}
```

## Touch-взаимодействия

### useTouchDrag hook (солитер)
Единый хук для всех touch-взаимодействий:
- Определяет tap vs drag (threshold 15px)
- Управляет drag preview
- Определяет drop target
- Вызывает onTap callback для tap-действий

### Маджонг
Только тап (без drag & drop). Обработка кликов напрямую в TileComponent.

### Особенности мобильных устройств
- Telegram WebView имеет свои ограничения
- Нет доступа к console (используем debug logger)
- Touch события могут конфликтовать со scroll

## LiveOps система

### Жизненный цикл ивента
1. **Активация** — при достижении уровня или ротации
2. **Таймер** — ограниченное время
3. **Ресурсы** — распределение на карты/тайлы (keys/shovels)
4. **Сбор** — анимация полёта к кнопке ивента
5. **Завершение** — таймер истёк И ресурсы потрачены, или все 10 этажей/комнат пройдены
6. **Поздравление** — оверлей при полном прохождении (queued после pack popup)

### Ротация ивентов
Treasure Hunt → Dungeon Dig → Treasure Hunt → ...
Следующий ивент активируется после победы. Ротация раздельная для каждой игры.

## Multi-game builds

Один codebase, разные сборки через `GAME` env:
```bash
GAME=solitaire npx vite build   # → dist/solitaire/
GAME=mahjong npx vite build     # → dist/mahjong/
```
Vite define: `__GAME__` → conditional rendering в App.tsx.

## База данных

### Drizzle ORM + PostgreSQL (Neon)
- Схемы в `shared/schema.ts`
- Миграции через `drizzle-kit`

### localStorage
Активно используется для:
- Прогресс игрока (уровень, звёзды)
- Состояние LiveOps ивентов (раздельно по играм)
- Настройки и предпочтения
- Daily rewards и streaks

## API и интеграции

### Telegram Mini Apps
- `window.Telegram.WebApp` — API телеграма
- Viewport events, back button, main button
- Haptic feedback

### Web Platform
- Standalone веб-версия для игры в браузере
- Размещение на сайте
- Graceful degradation Telegram API (работает и без него)

### GameIntegration
Класс для интеграции с лобби и внешними системами.
