# Архитектура проекта

## Общая структура

```
client/                    # Frontend (React + Vite)
├── src/
│   ├── components/
│   │   ├── solitaire/    # Игровые компоненты
│   │   └── ui/           # UI kit (Radix-based)
│   ├── hooks/            # React hooks
│   ├── lib/
│   │   ├── liveops/      # LiveOps события
│   │   ├── solitaire/    # Игровая логика
│   │   └── stores/       # Zustand stores
│   └── pages/
server/                    # Backend (Express)
shared/                    # Общие типы и схемы
docs/                      # Документация
```

## Компонентная архитектура

### GameBoard.tsx (главный компонент)
Центральный компонент, оркестрирующий:
- Игровое поле (tableau, foundation, stock, waste)
- LiveOps события
- Popups и модальные окна
- Анимации и визуальные эффекты

**Рефакторинг выполнен**: С ~4025 до ~2387 строк (сокращение **41%**).
Бизнес-логика вынесена в 12 отдельных хуков. См. [REFACTORING.md](./REFACTORING.md).

### Игровые компоненты
```
Card.tsx           # Отдельная карта
TableauColumn.tsx  # Колонка на столе
FoundationPile.tsx # Стопка для сбора
StockPile.tsx      # Колода
WastePile.tsx      # Открытые карты из колоды
DragPreview.tsx    # Превью при перетаскивании
```

### LiveOps компоненты
```
TreasureHuntIcon.tsx / TreasureHuntPopup.tsx   # Ивент "Сундуки"
DungeonDigIcon.tsx / DungeonDigPopup.tsx       # Ивент "Подземелье"
PointsEventIcon.tsx / PointsEventPopup.tsx     # Ивент "Паки"
Collections.tsx / CollectionPackPopup.tsx      # Коллекции
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
Главный store игровой логики:
- `tableau`, `foundations`, `stock`, `waste` — игровое состояние
- `animatingCard` — текущая анимируемая карта
- `isDragging`, `draggedCards` — состояние перетаскивания
- `isAutoCollecting` — флаг авто-сбора
- `hint`, `hasNoMoves` — подсказки

### usePopupQueue (Zustand)
Централизованное управление всеми popups:
- **WinFlow popups** — очередь FIFO для победного флоу
- **On-Demand popups** — popups по запросу (shop, settings, etc.)

См. [REFACTORING.md](./REFACTORING.md) для деталей.

### Бизнес-логика хуки
Извлечённые из GameBoard.tsx:
```
hooks/
├── useWinFlow.ts           # ⭐ Win Flow оркестрация (~600 строк)
├── useCollections.ts       # Коллекции предметов
├── useShop.ts              # Магазин и подписка
├── useLeaderboard.ts       # Лидерборд и сезоны
├── useDailyRewards.ts      # Daily streak и награды
├── usePointsEvent.ts       # Points Event LiveOps
├── useTreasureFlyingStars.ts # Анимация звёзд
├── useCollisionParticles.ts  # Burst-частицы
├── useDebugActions.ts      # Дебаг-функции
├── useDailyQuests.ts       # Ежедневные задания
├── useGameProgress.ts      # Прогресс игрока
├── useLiveOpsEvents.ts     # LiveOps координация
└── useTouchDrag.ts         # Touch-перетаскивание
```

### LiveOps Stores
Каждый ивент имеет свой store:
- `treasureHunt/store.ts` — состояние ивента "Сундуки"
- `dungeonDig/store.ts` — состояние ивента "Подземелье"

**Важно**: localStorage — источник истины для LiveOps состояния.

## Система анимаций

### Паттерн анимации карт
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

### useTouchDrag hook
Единый хук для всех touch-взаимодействий:
- Определяет tap vs drag (threshold 15px)
- Управляет drag preview
- Определяет drop target
- Вызывает onTap callback для tap-действий

### Особенности мобильных устройств
- Telegram WebView имеет свои ограничения
- Нет доступа к console (используем debug logger)
- Touch события могут конфликтовать со scroll

## LiveOps система

### Модульная структура
```
liveops/
├── treasureHunt/
│   ├── types.ts      # Типы данных
│   ├── logic.ts      # Бизнес-логика
│   ├── storage.ts    # localStorage операции
│   ├── store.ts      # Zustand store
│   └── index.ts      # Public API
├── dungeonDig/
│   └── ...
└── pointsEvent.ts    # Простой ивент (один файл)
```

### Жизненный цикл ивента
1. **Активация** — при достижении уровня или ротации
2. **Таймер** — ограниченное время (5 минут для теста)
3. **Ресурсы** — распределение на карты (keys/shovels)
4. **Сбор** — анимация полёта к кнопке ивента
5. **Завершение** — когда таймер истёк И ресурсы потрачены

### Ротация ивентов
Treasure Hunt → Dungeon Dig → Treasure Hunt → ...
Следующий ивент активируется после победы на уровне.

## База данных

### Drizzle ORM + PostgreSQL (Neon)
- Схемы в `shared/schema.ts`
- Миграции через `drizzle-kit`

### localStorage
Активно используется для:
- Прогресс игрока (уровень, звёзды)
- Состояние LiveOps ивентов
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
