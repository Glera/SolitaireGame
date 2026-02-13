# CLAUDE.md — Инструкции для Claude Code

## Проект

**P4G Platform** — мультиигровая платформа для Telegram Mini Apps и Web. Две игры: **Solitaire** (Косынка) и **Mahjong** (Маджонг).

### Стек
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand
- **Backend**: Express + Drizzle ORM + PostgreSQL (Neon)
- **UI Kit**: Radix UI
- **Build**: tsup (пакеты), Vite (shell)

### Платформы (тестировать на всех!)
1. Web — desktop браузер
2. Web — mobile браузер
3. Telegram WebView iOS
4. Telegram WebView Android
5. Telegram Desktop WebView

---

## Workspace и пакеты

Проект разбит на **6 git-репозиториев** в едином npm workspace:

```
p4g-platform-workspace/              # npm workspace root (private: true)
├── package.json                     # workspaces: ["*"]
├── liveops-shared/                  # @game/liveops-shared — общие типы, pointsEvent, timeUtils
├── solitaire-core/                  # @game/solitaire-core — движок косынки (zero deps)
├── mahjong-core/                    # @game/mahjong-core — движок маджонга (zero deps)
├── treasure-hunt/                   # @game/treasure-hunt — LiveOps ивент "Сундуки"
├── dungeon-dig/                     # @game/dungeon-dig — LiveOps ивент "Подземелье"
└── p4g-platform/                    # Shell: UI, хуки, бизнес-логика, оркестрация
```

**Граф зависимостей:**
```
liveops-shared          ← zero deps
solitaire-core          ← zero deps
mahjong-core            ← zero deps
treasure-hunt           ← peerDeps: liveops-shared, zustand
dungeon-dig             ← peerDeps: liveops-shared, zustand
p4g-platform            ← deps: all above + react + zustand
```

**Два разных "shared":**
- `@game/liveops-shared` (git repo) — типы ИГРОВОЙ логики (PackRarity, PlatformAdapter, GameCore)
- `p4g-platform/shared/` (папка в монолите) — типы БЭКЕНДА (Drizzle ORM + Zod)

---

## Сборка и запуск

Платформа — **мультиигровая**. Игра выбирается через переменную `GAME` при сборке/запуске.
Конфиг: `vite.config.ts` → `define: { __GAME__: process.env.GAME || "solitaire" }`.

```bash
# ─── Dev-серверы (из p4g-platform/) ──────────────────────
GAME=mahjong npx vite --port 3005    # Маджонг → http://localhost:3005
GAME=solitaire npx vite --port 3002  # Солитер → http://localhost:3002

# ─── Production-сборка ────────────────────────────────────
GAME=solitaire npx vite build        # → dist/solitaire/
GAME=mahjong npx vite build          # → dist/mahjong/

# ─── Сборка пакетов (после изменений в core) ─────────────
cd solitaire-core && npm run build   # пересобрать dist/
cd mahjong-core && npm run build     # пересобрать dist/

# ─── Другие команды (из p4g-platform/) ───────────────────
npm run check                        # Type check
npm run db:push                      # Миграции БД
```

> **Порты:** маджонг = 3005, солитер = 3002.
> Все команды (кроме сборки пакетов) — из `p4g-platform-workspace/p4g-platform/`.

---

## Структура проекта (shell: p4g-platform)

```
client/src/
├── components/solitaire/       # Компоненты солитера (GameBoard, Card, DragPreview...)
├── components/mahjong/         # Компоненты маджонга (MahjongBoard, TileComponent...)
├── games/
│   └── MahjongGame.tsx         # Главный компонент маджонга (~2000 строк)
├── hooks/                      # React хуки
│   ├── useWinFlow.ts           # Победный флоу (солитер)
│   ├── useTouchDrag.ts         # Touch-взаимодействия (солитер)
│   ├── useMahjongGame.ts       # Стейт и логика маджонга
│   ├── useMahjongTreasureHunt.ts # TH для маджонга
│   └── useMahjongDungeonDig.ts # DD для маджонга
├── lib/
│   ├── stores/                 # Zustand stores
│   ├── solitaire/              # Shell-файлы солитера (dropTargets, touch, scale...)
│   ├── liveops/
│   │   ├── treasureHunt/       # Солитер TH barrel (re-export + keyManager)
│   │   ├── dungeonDig/         # Солитер DD barrel (re-export + shovelManager)
│   │   ├── mahjongTreasureHunt/ # Маджонг TH barrel (localStorage API)
│   │   ├── mahjongDungeonDig/   # Маджонг DD barrel (localStorage API)
│   │   └── pointsEvent.ts      # Points Event
│   └── constants/              # Централизованные константы
├── version.ts                  # PLATFORM_VERSION (ОБЯЗАТЕЛЬНО обновлять!)
docs/                           # Документация
```

### Ключевые файлы
- `lib/stores/useSolitaire.tsx` — главный store солитера (~3000 строк)
- `components/solitaire/GameBoard.tsx` — главный компонент солитера (~2500 строк)
- `games/MahjongGame.tsx` — главный компонент маджонга (~2000 строк)
- `hooks/useMahjongGame.ts` — store маджонга
- `components/solitaire/TreasureHuntPopup.tsx` — попап TH (используется обеими играми)
- `components/solitaire/DungeonDigPopup.tsx` — попап DD (используется обеими играми)

### Shell barrel pattern (LiveOps)
Для каждой игры — свой barrel файл, который:
1. Re-экспортирует чистую логику из `@game/treasure-hunt` / `@game/dungeon-dig`
2. Добавляет game-specific localStorage API (свой storage key)
3. Солитер-баррели дополнительно содержат keyManager/shovelManager (DOM-зависимые)

---

## Документация (прогрессивное раскрытие)

**При работе с задачей — СНАЧАЛА читай релевантные docs:**

| Файл | Когда читать |
|------|-------------|
| `docs/ARCHITECTURE.md` | Структура, компоненты, state management |
| `docs/PLATFORM_PLAN.md` | Архитектура пакетов, контракты, workspace |
| `docs/STANDARDS.md` | Стиль кода, именование, паттерны |
| `docs/PROBLEMS.md` | Перед фиксом багов — похожие проблемы уже решались! |
| `docs/DECISIONS.md` | Почему приняты те или иные решения |
| `docs/REFACTORING.md` | История рефакторинга |
| `docs/FEATURES.md` | Описание фич обеих игр |

---

## Критические правила

### 1. Версионирование
Проект имеет **раздельные версии** для каждого модуля. Инкрементируй PATCH той версии, которая соответствует изменённому коду. После правки **обязательно сообщи** пользователю какие версии изменились.

| Модуль | Файл версии | Что меняет |
|--------|-------------|------------|
| **Платформа** (shell, UI, хуки) | `p4g-platform/client/src/version.ts` → `PLATFORM_VERSION` | GameBoard, MahjongGame, hooks, components, stores |
| **Солитер-кор** (логика игры) | `solitaire-core/src/index.ts` → `CORE_VERSION` | hints, gameLogic, scoring, cardUtils, solvableGenerator |
| **Маджонг-кор** (логика игры) | `mahjong-core/src/index.ts` → `CORE_VERSION` | tiles, logic, generator, layouts, gameOps |
| **LiveOps** (ивенты, очки) | `liveops-shared/src/index.ts` → версия в package.json | pointsEvent, timeUtils, коллекции |

**Правила:**
- Если меняется только платформа → bump `PLATFORM_VERSION`
- Если меняется кор солитера → bump `CORE_VERSION` в solitaire-core + rebuild (`cd solitaire-core && npm run build`)
- Если меняется кор маджонга → bump `CORE_VERSION` в mahjong-core + rebuild
- Если меняется несколько модулей → bump все затронутые версии
- **После каждой правки пиши:** "Платформа: 5.0.6, Солитер-кор: 0.1.1" (какие версии изменились)

### 2. Анимации карт — pointer-events-none
Карты во время анимации/перетаскивания ДОЛЖНЫ иметь `pointer-events-none`:
```tsx
className={cn(
  isDragging && "opacity-0 pointer-events-none",
  isAnimating && "opacity-0 pointer-events-none"
)}
```
Без этого — **дублирование карт**.

### 3. localStorage — источник истины
Для LiveOps, daily quests, прогресса — **localStorage первичен**.
React state синхронизируется с ним, НЕ наоборот.

**Ключи localStorage разделены по играм:**
- Солитер: `solitaire_treasure_hunt_event`, `solitaire_dungeon_dig_event`
- Маджонг: `mahjong_treasure_hunt_event`, `mahjong_dungeon_dig_event`

### 4. Touch vs Click
- Mobile: touch events через `useTouchDrag.ts`
- Desktop: click events
- Tap порог: 15px (меньше — tap, больше — drag)
- **Проверяй на мобильном!** Поведение отличается от desktop.

### 5. Stale Closures
В `useCallback` — следи за зависимостями. Используй functional updates:
```typescript
// Плохо — stale closure
setQuests(quests.map(...))

// Хорошо
setQuests(prev => prev.map(...))
```

### 6. Popup компоненты не размонтируются
DungeonDigPopup и TreasureHuntPopup **не размонтируются** — возвращают `null` когда невидимы, но React state персистит. При повторном открытии — обязательно сбрасывать internal state через `useEffect` на `isVisible`.

---

## Чего НЕ делать

1. **НЕ** пушить в git без явной просьбы пользователя
2. **НЕ** менять z-index без проверки конфликтов (см. STANDARDS.md)
3. **НЕ** использовать inline styles вместо Tailwind
4. **НЕ** добавлять новые npm пакеты без необходимости
5. **НЕ** игнорировать TypeScript ошибки
6. **НЕ** забывать про мобильное тестирование
7. **НЕ** путать два "shared" (см. workspace секцию)

---

## Верификация перед коммитом

1. ✅ `npx vite build` — нет ошибок сборки
2. ✅ Версии обновлены (см. раздел «Версионирование»)
3. ✅ Тестировал в браузере (dev server запущен)
4. ✅ Для touch-изменений — проверил на мобильном
5. ✅ Новые баги задокументированы в `docs/PROBLEMS.md`

---

## Типичные паттерны

### Добавление popup
```typescript
// Используй usePopupQueue
const { addToWinFlowQueue, addOnDemandPopup } = usePopupQueue();
addOnDemandPopup('myPopup');
```

### Анимация карты (солитер)
```typescript
// Через useSolitaire.animatingCard
set({
  animatingCard: {
    card, startPosition, endPosition,
    isReturnAnimation: false
  }
});
```

### Константы анимаций
```typescript
// Централизованы в lib/constants/animations.ts
import { CARD_FLIGHT_DURATION, CARD_STAGGER_DELAY } from '../constants/animations';
```

### LiveOps barrel (маджонг)
```typescript
// Каждая игра имеет свой barrel файл с game-specific storage key
import { getMahjongTreasureEvent, saveMahjongTreasureEvent } from '../lib/liveops/mahjongTreasureHunt';
import { getMahjongDungeonDigEvent } from '../lib/liveops/mahjongDungeonDig';
```

---

## При возникновении проблем

1. **Карты дублируются** → проверь pointer-events-none
2. **Touch не работает** → проверь useTouchDrag, threshold 15px
3. **State не обновляется** → проверь stale closure, localStorage sync
4. **Popup не показывается** → проверь usePopupQueue
5. **Анимация застряла** → проверь animatingCard cleanup
6. **Тайлы DD не кликаются** → проверь сброс internal state при open (exitFoundLock)
7. **LiveOps данные конфликтуют** → проверь storage key (solitaire_ vs mahjong_)

**Всегда проверяй `docs/PROBLEMS.md`** — возможно, проблема уже решалась!
