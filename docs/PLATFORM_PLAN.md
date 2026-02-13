# План: Модульная архитектура — separate repos + local workspace

> **Статус: ВЫПОЛНЕНО.** Все 6 пакетов извлечены, билдятся, работают в workspace. Маджонг-кор создан с нуля. LiveOps портированы на обе игры. Этот документ сохраняется как референс архитектурных решений.

## Контекст

Весь проект (~15K+ строк) жил в одном репозитории. Цели:
- **Разные люди/LLM** разрабатывают коры и LiveOps-ивенты **независимо**, каждый в своём repo
- Проекты **компактные** — каждый repo понятен одному LLM-агенту
- Shell подключает пакеты как **git-based npm-зависимости** (без registry)
- **Параллельная работа без merge-конфликтов**
- **Мобайл** (React Native) и **другие коры** (маджонг — уже реализован)

---

## Архитектура

### Репозитории (6 отдельных git repos)

```
github.com/you/solitaire-core     # ✅ ~1813 строк, чистый движок (zero deps)
github.com/you/mahjong-core       # ✅ ~500 строк, маджонг движок (zero deps, 35 smoke tests)
github.com/you/treasure-hunt      # ✅ ~587 строк, LiveOps event
github.com/you/dungeon-dig        # ✅ ~602 строк, LiveOps event
github.com/you/liveops-shared     # ✅ ~505 строк, общие типы + PlatformAdapter + GameCore контракт
github.com/you/p4g-platform       # ✅ Платформа: UI, бизнес-логика, shell для обеих игр
```

### Граф зависимостей

```
liveops-shared          ← zero deps
    ↑ (peer)
treasure-hunt           ← peerDeps: liveops-shared, zustand
dungeon-dig             ← peerDeps: liveops-shared, zustand
solitaire-core          ← zero deps
mahjong-core            ← zero deps

p4g-platform            ← dependencies: all above + zustand + react
    (будущее: mobile-platform ← те же deps)
```

### Разделение shared-кода (два разных "shared"!)

В архитектуре существуют **два разных shared**, и их критически важно не путать:

```
@game/liveops-shared (Git Repo)          p4g-platform/shared/ (Folder in Monolith)
─────────────────────────────────         ──────────────────────────────────────────
Содержит:                                 Содержит:
  • PackRarity, CollectionPack              • schema.ts (Drizzle ORM — DB таблицы)
  • PlatformAdapter (интерфейс)             • validators.ts (Zod — API контракты)
  • GameCore<TState, TMove, THint>
  • EventReward, reward cycle

Используется:                             Используется:
  • solitaire-core                          • client (React app)
  • treasure-hunt                           • server (Express API)
  • dungeon-dig                             • admin (Refine app)
  • p4g-platform

Зависимости: НОЛЬ                        Зависимости: drizzle-orm, zod
Назначение: общие типы ИГРОВОЙ логики     Назначение: общие типы БЭКЕНДА и API
```

**Почему это разделение критично:**

1. **Вес пакетов.** `solitaire-core` — zero deps, ~2640 строк. Если `@game/liveops-shared` начнёт тянуть `zod` (45KB min) или `drizzle-orm` — это убивает изоляцию лёгких игровых пакетов и раздувает контекст LLM-агентов.

2. **Граница ответственности.** Игровые пакеты не должны знать о структуре БД или формате API запросов. А серверный код не должен зависеть от игровых типов через тяжёлый shared.

3. **PlatformAdapter — базовый vs расширенный.** Базовый `PlatformAdapter` живёт в `@game/liveops-shared` (storage, now, getCardPosition). Расширение с auth-методами определяется **в p4g-platform**:

```typescript
// @game/liveops-shared — базовый (zero deps)
interface PlatformAdapter {
  now(): number
  storage: { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void }
  getCardPosition?(cardId: string): { x: number; y: number } | null
  analytics?: { track(event: string, data?: Record<string, unknown>): void }
  haptics?: { impact(style: 'light' | 'medium' | 'heavy'): void }
}

// p4g-platform — расширяет для платформенных нужд
interface PlatformAdapterFull extends PlatformAdapter {
  auth: {
    getProvider(): 'telegram' | 'guest' | 'apple' | 'google'
    getCredentials(): Promise<AuthCredentials>
    getDeviceId(): string
  }
}
```

**Правило:** Если тип нужен игровым пакетам (solitaire-core, treasure-hunt) → `@game/liveops-shared`. Если тип нужен только client/server/admin → `p4g-platform/shared/`.

---

### Как shell подключает пакеты (production/CI)

```jsonc
// p4g-platform/package.json
{
  "dependencies": {
    "@game/solitaire-core": "github:you/solitaire-core#v1.0.0",
    "@game/treasure-hunt": "github:you/treasure-hunt#v1.0.0",
    "@game/dungeon-dig": "github:you/dungeon-dig#v1.0.0",
    "@game/liveops-shared": "github:you/liveops-shared#v1.0.0",
    "zustand": "^5.0.0",
    "react": "^18.3.0"
  }
}
```

Git tags = версии. Никакого npm registry.

---

## Local Workspace паттерн (DX)

Для локальной разработки — все repos в одной папке с корневым workspace:

```
/p4g-platform-workspace/             # НЕ git repo, просто рабочая директория
├── package.json                  # private: true, workspaces: ["*"]
├── solitaire-core/               # git clone, свой .git
├── mahjong-core/                 # git clone, свой .git
├── treasure-hunt/                # git clone, свой .git
├── dungeon-dig/                  # git clone, свой .git
├── liveops-shared/               # git clone, свой .git
└── p4g-platform/                 # git clone, свой .git
```

```jsonc
// /p4g-platform-workspace/package.json
{
  "private": true,
  "workspaces": [
    "solitaire-core",
    "mahjong-core",
    "treasure-hunt",
    "dungeon-dig",
    "liveops-shared",
    "p4g-platform"
  ]
}
```

### Workflow

**Разработка** (человек за компом):
1. `npm install` в корне workspace → автоматические symlinks
2. Изменил solitaire-core → Vite HMR в p4g-platform подхватил мгновенно
3. Никаких `npm link`. Всё работает через workspace symlinks

**LLM-агент**:
1. Открывает только `/solitaire-core/` — изолированный контекст, ~2640 строк
2. Не видит p4g-platform, не может случайно сломать shell

**Готово к деплою**:
1. `cd solitaire-core && git tag v1.1.0 && git push --tags`
2. `cd p4g-platform` → обновить dep на `#v1.1.0` → `npm install` → commit & push

---

## Критичные детали пакетов

### 1. peerDependencies (предотвращение дублирования React/Zustand)

```jsonc
// treasure-hunt/package.json (и dungeon-dig аналогично)
{
  "name": "@game/treasure-hunt",
  "peerDependencies": {
    "zustand": "^5.0.0",
    "@game/liveops-shared": "^1.0.0"
  },
  "devDependencies": {
    "zustand": "^5.0.0",
    "@game/liveops-shared": "github:you/liveops-shared#v1.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.6.0"
  }
}
```

```jsonc
// solitaire-core/package.json — НОЛЬ зависимостей
{
  "name": "@game/solitaire-core",
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.6.0"
  }
}
```

**Почему:** Если zustand в dependencies — npm установит отдельную копию внутри node_modules пакета. Два Zustand = два store context = сломанные хуки. peerDependencies гарантирует единый экземпляр из shell.

### 2. `prepare` скрипт (критично для git-deps!)

```jsonc
// Каждый пакет:
{
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "check": "tsc --noEmit",
    "prepare": "npm run build"
  }
}
```

**Почему:** `prepublishOnly` работает только при `npm publish`. Для git-зависимостей npm скачивает исходники и запускает `prepare` после install. Без этого `dist/` не существует → пакет пустой → import fails.

**Минус:** `npm install` в p4g-platform будет билдить все пакеты. Для 4 маленьких пакетов (~5 сек каждый) это приемлемо.

### 3. tsup.config.ts — external зависимости

```typescript
// tsup.config.ts для treasure-hunt, dungeon-dig
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  external: ['zustand', 'react', '@game/liveops-shared'],
  clean: true,
})
```

**Почему:** Без `external` tsup забандлит zustand/react внутрь dist → дублирование → "Invalid hook call".

### 4. Diamond Dependency (liveops-shared)

```
p4g-platform → liveops-shared#v1.0.0 (dependency)
p4g-platform → treasure-hunt → liveops-shared (peerDependency)
p4g-platform → dungeon-dig → liveops-shared (peerDependency)
```

**Решение:** liveops-shared как **peerDependency** в treasure-hunt и dungeon-dig. Shell устанавливает единственную копию. Гарантированно один экземпляр типов — никаких instanceof/enum проблем.

---

## Защита от рисков и best practices

### 1. PlatformAdapter — единый контракт для platform-зависимостей

Вместо скрытых зависимостей на `window`, `document`, `Date.now()` — пакеты принимают адаптер:

```typescript
// @game/liveops-shared/src/types.ts
interface PlatformAdapter {
  // Позиционирование (для анимаций ключей/лопат)
  // Может быть undefined — пакеты ОБЯЗАНЫ корректно работать без него
  // (пропустить анимацию, использовать fallback позицию, etc.)
  getCardPosition?(cardId: string): { x: number; y: number } | null

  // Время (для таймеров, expiry)
  now(): number  // Date.now() на web, но может быть server time

  // Хранение (localStorage на web, AsyncStorage на RN, MMKV и т.д.)
  storage: {
    get(key: string): string | null
    set(key: string, value: string): void
    remove(key: string): void
  }

  // Опционально
  analytics?: { track(event: string, data?: Record<string, unknown>): void }
  haptics?: { impact(style: 'light' | 'medium' | 'heavy'): void }
}
```

Shell создаёт адаптер и передаёт при инициализации:

```typescript
// p4g-platform: web adapter
const webAdapter: PlatformAdapter = {
  getCardPosition: (cardId) => {
    const el = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y };
  },
  now: () => Date.now(),
  storage: {
    get: (k) => localStorage.getItem(k),
    set: (k, v) => localStorage.setItem(k, v),
    remove: (k) => localStorage.removeItem(k),
  }
};

// Будущее: React Native adapter
const rnAdapter: PlatformAdapter = {
  getCardPosition: (cardId) => cardPositionRegistry.get(cardId),
  now: () => Date.now(),
  storage: mmkvStorage, // или AsyncStorage wrapper
  haptics: { impact: (style) => Haptics.impactAsync(style) }
};
```

Пакеты используют адаптер через storage.ts:

```typescript
// treasure-hunt/src/storage.ts
let adapter: PlatformAdapter;
export function initStorage(a: PlatformAdapter) { adapter = a; }
export function loadEvent() {
  const raw = adapter.storage.get('treasure_hunt_event');
  // ...
}
```

### 2. schemaVersion + чистые миграции

Пакеты хранят данные через PlatformAdapter.storage. При изменении структуры — schemaVersion защищает от runtime crashes:

```typescript
// Каждый пакет определяет версию и миграции:
const SCHEMA_VERSION = 2;

// Миграции — ЧИСТЫЕ ФУНКЦИИ, без side effects
const migrations: Record<number, (data: unknown) => unknown> = {
  1: (data: any) => ({
    ...data,
    // v1→v2: добавлено поле milestoneClaimed
    milestoneClaimed: data.milestoneClaimed ?? [],
    schemaVersion: 2,
  }),
};

function migrate(data: any): TreasureHuntEvent | null {
  let current = data;
  while (current.schemaVersion < SCHEMA_VERSION) {
    const fn = migrations[current.schemaVersion];
    if (!fn) return null; // Неизвестная версия — сброс
    current = fn(current);
  }
  return current as TreasureHuntEvent;
}

// storage.ts — shell НЕ трогает структуру напрямую
function loadEvent(): TreasureHuntEvent | null {
  const raw = adapter.storage.get('treasure_hunt_event');
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (!data.schemaVersion) return null;  // Данные до системы версий
  if (data.schemaVersion === SCHEMA_VERSION) return data;
  return migrate(data);  // Чистая миграция
}

function saveEvent(event: TreasureHuntEvent): void {
  adapter.storage.set('treasure_hunt_event', JSON.stringify({
    ...event,
    schemaVersion: SCHEMA_VERSION
  }));
}
```

**Правила:**
- Миграции — чистые функции внутри пакета, без side effects
- Shell НЕ трогает структуру persisted data напрямую — только через API пакета
- Каждая миграция: `version N → version N+1`, цепочкой

### 3. Единый сценарий локальной разработки

README в каждом repo:

```markdown
## Local dev (в составе workspace) — рекомендуемый

1. Клонировать все repos в одну папку (p4g-platform-workspace/)
2. В корне workspace: `npm install` (создаст symlinks)
3. `cd p4g-platform && npm run dev`
4. Изменения в пакетах подхватываются через Vite HMR

## Standalone dev (пакет отдельно)

1. `npm install` (devDependencies для сборки)
2. `npm run check` — TypeScript
3. `npm run test` — smoke tests
4. `npm run build` — собрать dist/

## Отладка пакета + shell вне workspace

1. В пакете: `npm run build`
2. В p4g-platform: временно `"@game/solitaire-core": "file:../solitaire-core"`
3. `npm install && npm run dev`
4. После отладки: вернуть git-dep, tag, push
```

**Правило:** `npm link` НЕ использовать — workspace symlinks надёжнее.

### 4. Чёткая граница: пакет vs shell (orchestrator)

```
┌─────────────────────────────────────────────────┐
│ ПАКЕТ (treasure-hunt repo)                      │
│                                                 │
│ Что делает:                                     │
│ • Правила: openChest(), canClaimMilestone()     │
│ • State machine: Zustand store с actions        │
│ • Persistence: load/save через PlatformAdapter  │
│ • Resource: keyManager (distribute, collect)     │
│ • Миграции данных (чистые функции)              │
│                                                 │
│ Чего НЕ делает:                                 │
│ • НЕ запускает таймеры (setInterval)            │
│ • НЕ решает когда активировать event            │
│ • НЕ управляет UI (popups, animations)          │
│ • НЕ знает о других events (rotation)           │
│ • НЕ обращается к DOM/window напрямую           │
└─────────────────────────────────────────────────┘
                    ↕ API
┌─────────────────────────────────────────────────┐
│ SHELL (p4g-platform/useLiveOpsEvents.ts)          │
│                                                 │
│ Что делает:                                     │
│ • PlatformAdapter: создаёт и передаёт пакетам  │
│ • Таймеры: setInterval для countdown            │
│ • Activation: когда показать event игроку       │
│ • Rotation: treasure ↔ dungeon чередование      │
│ • UI sync: pulse, time critical, expiry popups  │
│ • Event lifecycle: activate → play → expire     │
└─────────────────────────────────────────────────┘
```

**Правило:** "что происходит при действии X" → пакет. "Когда и как показать X" → shell.

### 5. Lockfile — коммитить всегда

- `p4g-platform/package-lock.json` — коммитить. Фиксирует точные SHA git-deps, предотвращает "tag drift" (кто-то переставил tag на другой коммит)
- `p4g-platform-workspace/` — НЕ git repo, поэтому lockfile хранится локально. Если нужен общий lock — завести отдельный `workspace-config` repo с `package.json` + `package-lock.json`, либо просто `.gitignore` в workspace root
- Пакеты (solitaire-core и т.д.) — `package-lock.json` коммитить для воспроизводимых devDeps

### 6. npm overrides — блокировка транзитивных версий

```jsonc
// p4g-platform/package.json
{
  "overrides": {
    "zustand": "$zustand",    // Форсирует версию из dependencies
    "react": "$react"         // Запрещает транзитивные копии
  }
}
```

Это последняя линия защиты: даже если какой-то транзитивный пакет затянет свой zustand/react, overrides заставит npm использовать единственную копию из shell.

### 7. peerDependenciesMeta — для изолированного тестирования

```jsonc
// treasure-hunt/package.json
{
  "peerDependencies": {
    "zustand": "^5.0.0",
    "@game/liveops-shared": "^1.0.0"
  },
  "peerDependenciesMeta": {
    "zustand": { "optional": true },
    "@game/liveops-shared": { "optional": true }
  }
}
```

npm не будет ругаться при `npm install` в изолированном пакете (для тестов/CI). devDependencies покрывает сборку, peerDeps — runtime в shell.

### 8. Vite server.fs.allow — workspace symlinks

```typescript
// p4g-platform/vite.config.ts
export default defineConfig({
  server: {
    fs: {
      // Разрешить Vite читать файлы за пределами root (workspace пакеты)
      // Если workspace на уровень выше: '..' достаточно
      // Если workspace выше на 2+ уровня: указать абсолютный путь или '../..'
      allow: [path.resolve(__dirname, '..')],  // import path from 'path'
    },
  },
  // Включить пакеты в оптимизацию (иначе Vite может не трекать HMR)
  optimizeDeps: {
    include: [
      '@game/solitaire-core',
      '@game/mahjong-core',
      '@game/treasure-hunt',
      '@game/dungeon-dig',
      '@game/liveops-shared',
    ],
  },
})
```

Без `server.fs.allow` Vite блокирует чтение symlinked файлов за пределами project root.

### 9. CJS поддержка (на будущее)

Если появятся серверные скрипты или Node.js интеграции:

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  external: ['zustand', 'react', '@game/liveops-shared'],
  clean: true,
})
```

```jsonc
// package.json exports
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

tsup генерирует оба формата бесплатно — включаем сразу для совместимости с Jest и другими CJS-инструментами.

### 10. Smoke tests в core-пакетах

Минимальный тест-suite для защиты от регрессий при независимых релизах:

```typescript
// solitaire-core/src/__tests__/smoke.test.ts (vitest)
import { describe, it, expect } from 'vitest'
import { createDeck, initializeGame, moveCards, checkWinCondition } from '../index'

describe('solitaire-core smoke', () => {
  it('creates a valid 52-card deck', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map(c => c.id)).size).toBe(52)
  })

  it('initializes valid game state', () => {
    const state = initializeGame()
    expect(state.tableau).toHaveLength(7)
    expect(state.tableau[0]).toHaveLength(1)
    expect(state.tableau[6]).toHaveLength(7)
  })

  it('detects win condition', () => {
    const state = initializeGame()
    expect(checkWinCondition(state)).toBe(false)
  })
})
```

```jsonc
// package.json
{
  "scripts": {
    "test": "vitest run",
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "check": "tsc --noEmit",
    "prepare": "npm run build"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

2-3 кейса на пакет. Запуск: `npm test` перед каждым tag.

### 11. Политика версий (задокументировать в docs/DECISIONS.md)

**Breaking change** (MAJOR bump):
- Изменение экспортируемых типов (добавление required полей, удаление полей)
- Изменение сигнатур публичных функций
- Изменение shape persisted data (schemaVersion bump)
- Удаление экспортов из index.ts

**Non-breaking** (MINOR/PATCH):
- Добавление optional полей в типы
- Новые экспорты в index.ts
- Исправление логики без изменения API
- Добавление schemaVersion миграции (данные мигрируют автоматически)

---

## Что извлекается

### 1. `solitaire-core` (~2640 строк, 7 файлов)

| Файл | Строк | Роль |
|-------|--------|------|
| `types.ts` | ~51 | Card, Suit, Rank, SolitaireState (чистые) |
| `cardUtils.ts` | ~85 | createDeck, shuffleDeck, canPlaceOnTableau/Foundation |
| `gameLogic.ts` | ~276 | initializeGame, drawFromStock, moveCards, checkWinCondition |
| `scoring.ts` | ~128 | CARD_POINTS, calculateCardPoints |
| `solvableGenerator.ts` | ~1655 | generateSolvableGame, ensureSolvability (backtracking + симуляция) |
| `hints.ts` (NEW) | ~415 | getHint — извлечь из useSolitaire.tsx |
| `index.ts` | ~30 | Public API exports |

**Очистка:**
- `types.ts`: убрать `hasKey`, `hasShovel`, `isPremium`, `roomType` — shell расширит через `ShellCard`
- `gameLogic.ts`: убрать импорт `roomUtils` (roomType передавать параметром), `experienceManager` (XP через опциональный callback `onCardToFoundation?()`)
- `solvableGenerator.ts`: заменить импорт keyManager/shovelManager на опциональный интерфейс `ResourcePreservation` (см. ниже)
- `getHint()`: извлечь ~415 строк из useSolitaire.tsx, превратить в чистую функцию `getHint(state: GameState): Hint | null`, вынести `canAutoMoveToFoundation` в отдельную утилиту

**solvableGenerator — контракт для ресурсов LiveOps:**

Текущая связка: solvableGenerator напрямую импортирует keyManager/shovelManager чтобы при перестановке скрытых карт сохранить **позиции** ключей/лопат (не привязку к конкретным картам, а слоты в tableau). Из ~1655 строк только ~130 — эта обвязка, остальное — чистая генерация.

```typescript
// Вместо прямого импорта keyManager/shovelManager:
interface ResourcePreservation {
  /** Перед перестановкой: запомнить позиции с ресурсами */
  snapshot(tableau: Card[][]): ResourceSnapshot
  /** После перестановки: восстановить ресурсы на карты в тех же позициях */
  restore(tableau: Card[][], snapshot: ResourceSnapshot): void
}

interface GeneratorOptions {
  roomType?: string
  preserveResources?: ResourcePreservation  // Shell передаёт, core не знает про ключи/лопаты
}
```

Shell передаёт реализацию при вызове. Core вызывает `snapshot()` до перестановки, `restore()` после. Если `preserveResources` не передан — пропускается (чистая генерация без LiveOps).

**Зависимости: НОЛЬ**

#### Файлы `lib/solitaire/`, которые остаются в shell

| Файл | Строк | Почему shell |
|-------|--------|-------------|
| `dropTargets.ts` | ~320 | Хит-тестинг по экранным координатам, зависит от DOM (styleManager, perfMonitor) |
| `experienceManager.ts` | ~196 | Система прогрессии (XP/уровни) — бизнес-логика платформы, общая для всех игр, использует localStorage |
| `touchDragHandler.ts` | ~100 | Touch-события — UI-взаимодействие |
| `touchDragState.ts` | ~20 | Типы для touch drag — идёт вместе с handler |
| `cardConstants.ts` | ~43 | Размеры карт в пикселях, отступы — визуальные константы, зависят от платформы |
| `stackCompression.ts` | ~65 | Расчёт сжатия стопок для отображения — visual layout, не правила |
| `styleManager.ts` | ~61 | Манипуляция DOM-стилями |
| `performanceMonitor.ts` | ~101 | Debug-утилита для UI |
| `floatingScoreManager.ts` | ~23 | UI-эффект (всплывающие числа) |
| `progressManager.ts` | ~14 | UI-callback manager |
| `roomUtils.ts` | ~? | Режимы комнат (getRoomFromURL, getPremiumCardsCount) — LiveOps/shell-концепция |

**Критерий разделения:** "нужен ли этот код при написании маджонг-core?" Если да — shell (общая платформа). Если нет, и это правила конкретной игры — core.

### 2. `treasure-hunt` (~1700 строк, 6 файлов)

| Файл | Строк | Роль |
|-------|--------|------|
| `types.ts` | ~80 | TreasureHuntEvent, TreasureRoom, TreasureChest |
| `logic.ts` | ~437 | openChest, claimMilestone, formatTime |
| `storage.ts` | ~40 | localStorage load/save/clear |
| `keyManager.ts` | ~200 | распределение ключей, сбор с карт |
| `store.ts` | ~800 | Zustand store |
| `index.ts` | ~50 | Public API |

**Очистка:**
- `PackRarity` → import from `@game/liveops-shared`
- `keyManager.ts`: DOM queries → callback `getCardPosition()` от shell

**peerDeps: `@game/liveops-shared`, `zustand`**

### 3. `dungeon-dig` (~1750 строк, 6 файлов)

Зеркальная структура. Аналогичная очистка.

**peerDeps: `@game/liveops-shared`, `zustand`**

### 4. `liveops-shared` (~550 строк, 5 файлов)

| Файл | Строк | Роль |
|-------|--------|------|
| `types.ts` | ~80 | PackRarity, CollectionPack, EventReward, PlatformAdapter (базовый), GameCore (контракт) |
| `platform.ts` | ~40 | PlatformAdapter интерфейс (storage, now, getCardPosition — без auth) |
| `pointsEvent.ts` | ~350 | Reward cycle, pack generation, REWARD_CYCLE, COLLECTION_PACKS |
| `timeUtils.ts` | ~30 | `formatTimeRemaining()`, `getRemainingTime()`, `isTimeCritical()` — сейчас дублируется в treasureHunt и dungeonDig |
| `index.ts` | ~30 | Public API |

**Разделение pointsEvent.ts при извлечении:**
- **Типы** (`PackRarity`, `CollectionPack`, `EventReward`, `COLLECTION_PACKS`) → `types.ts` в liveops-shared
- **Логика наград** (`addEventPoints`, `earnReward`, `getRewardAtIndex`, `generatePackItems`) → `pointsEvent.ts` в liveops-shared
- **localStorage функции** (`getPointsEventState`, `savePointsEventState`) → переписать на PlatformAdapter.storage

**Примечание:** pointsEvent сейчас не имеет Zustand store (в отличие от treasureHunt/dungeonDig). Это допустимо — он проще и управляет state через localStorage + функции. При необходимости store можно добавить позже.

**Зависимости: НОЛЬ** — это общие типы ИГРОВОЙ логики. НЕ путать с `p4g-platform/shared/` (Drizzle + Zod). См. секцию "Разделение shared-кода".

### 5. Что остаётся в `p4g-platform`

| Слой | Что включает |
|------|-------------|
| **UI** | Все компоненты, анимации, drag & drop, touch |
| **Store** | useSolitaire.tsx (undo, auto-collect, animation, persistence) |
| **Business** | stars, levels, XP, boosters, daily quests, win streak, shop, collections |
| **Orchestration** | useWinFlow, useLiveOpsEvents (ротация ивентов), usePopupQueue |
| **Platform** | localStorage adapters, Telegram integration, scaling, audio |
| **Shell types** | `ShellCard = Card & { hasKey?, hasShovel?, isPremium?, isJoker? }` |

---

## Контракты

### Game Core — чистые типы

```typescript
// @game/solitaire-core/src/types.ts
interface Card {
  id: string; suit: Suit; rank: Rank; color: Color; faceUp: boolean
}

interface SolitaireState {
  tableau: Card[][]; foundations: Record<Suit, Card[]>
  stock: Card[]; waste: Card[]; moves: number; isWon: boolean
}
```

### Shell расширяет

```typescript
// p4g-platform/client/src/types.ts
import type { Card } from '@game/solitaire-core'
type ShellCard = Card & { isPremium?: boolean; hasKey?: boolean; hasShovel?: boolean; isJoker?: boolean }
```

### LiveOps Resource Manager — platform-agnostic

```typescript
// keyManager после очистки — shell передаёт позиции вместо DOM queries
function distributeKeys(
  faceDownCardIds: string[],
  faceUpCardIds: string[],
  eventActive: boolean,
  getCardPosition?: (cardId: string) => { x: number; y: number } | null
): Set<string>
```

---

## Структура каждого repo

### Пакет (solitaire-core как пример)

```
solitaire-core/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── cardUtils.ts
│   ├── gameLogic.ts
│   ├── scoring.ts
│   ├── solvableGenerator.ts
│   └── hints.ts
└── README.md
```

```jsonc
// package.json
{
  "name": "@game/solitaire-core",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "check": "tsc --noEmit",
    "prepare": "npm run build"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.6.0"
  }
}
```

### LiveOps пакет (treasure-hunt)

```jsonc
{
  "name": "@game/treasure-hunt",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "check": "tsc --noEmit",
    "prepare": "npm run build"
  },
  "peerDependencies": {
    "zustand": "^5.0.0",
    "@game/liveops-shared": "^1.0.0"
  },
  "devDependencies": {
    "zustand": "^5.0.0",
    "@game/liveops-shared": "github:you/liveops-shared#v1.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.6.0"
  }
}
```

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  external: ['zustand', 'react', '@game/liveops-shared'],
  clean: true,
})
```

---

## Что чистить при извлечении

### solitaire-core
| Что | Сейчас | После |
|-----|--------|-------|
| `Card.hasKey/hasShovel` | В базовом типе | Убрать — shell расширяет |
| `GameState.roomType` | В базовом типе | Убрать — shell расширяет |
| `gameLogic.ts` → roomUtils | Прямой импорт | Убрать |
| `gameLogic.ts` → experienceManager | Прямой импорт | Убрать — shell через callback |
| `solvableGenerator.ts` → keyManager/shovelManager | Прямой импорт: clearAll, addTo, cardHas | Опциональный `ResourcePreservation` интерфейс (snapshot/restore) |
| `solvableGenerator.ts` → roomUtils | `getRoomFromURL()`, `getPremiumCardsCount()` | Параметр `GeneratorOptions.roomType`, premium logic удалить (закомментирован) |
| `getHint()` | Внутри useSolitaire.tsx (~415 строк) | Извлечь в `hints.ts`, `canAutoMoveToFoundation` → отдельная утилита |

### treasure-hunt / dungeon-dig
| Что | Сейчас | После |
|-----|--------|-------|
| `PackRarity` import | Из `../pointsEvent` | Из `@game/liveops-shared` |
| `formatTimeRemaining()` | Дублируется в обоих logic.ts | Из `@game/liveops-shared/timeUtils` |
| key/shovelManager → DOM | `document.querySelector` | Callback `getCardPosition()` от shell |
| storage → localStorage | Прямой вызов `localStorage.getItem/setItem` | Через `PlatformAdapter.storage` |

---

## Стратегия перехода

Во время миграции приложение должно продолжать работать. Рекомендуемый подход — **параллельное существование** (не Big Bang):

```
Фаза 1: Создать пакеты, наполнить кодом, проверить что билдятся
         Приложение работает на СТАРОМ коде (без изменений)

Фаза 2: В shell постепенно менять импорты:
         import { createDeck } from '../lib/solitaire/cardUtils'
         →
         import { createDeck } from '@game/solitaire-core'
         Проверять после КАЖДОГО файла — игра работает

Фаза 3: Когда все импорты переключены и всё работает —
         удалить старые файлы из lib/solitaire/ и lib/liveops/

Фаза 4: Финальная верификация на всех платформах
```

**Правило:** НЕ удалять старые файлы до тех пор, пока все импорты не переключены и не проверены. Параллельное существование безопаснее, чем одномоментная замена.

---

## Шаги миграции

### Этап 0: Подготовка workspace ✅
1. Создать директорию `p4g-platform-workspace/`
2. `package.json` с `private: true` и `workspaces: ["*"]`
3. Все будущие repos клонировать сюда

### Этап 1: Создать repo `liveops-shared` ✅
1. Создать repo, package.json, tsconfig, tsup
2. Перенести `PackRarity`, `CollectionPack`, reward types из `pointsEvent.ts`
3. Перенести `PlatformAdapter` (базовый интерфейс, без auth), `GameCore` (контракт)
4. Извлечь `formatTimeRemaining()`, `getRemainingTime()`, `isTimeCritical()` из treasureHunt/logic.ts → `timeUtils.ts`
5. Перенести логику наград из pointsEvent.ts (REWARD_CYCLE, generatePackItems и т.д.)
6. Скрипт `prepare: "npm run build"`
7. `git tag v1.0.0 && git push --tags`

### Этап 2: Создать repo `solitaire-core` ✅
1. Создать repo, package.json (zero deps), tsconfig, tsup
2. Перенести: types, cardUtils, gameLogic, scoring, solvableGenerator
3. Очистить types.ts (убрать hasKey, hasShovel, isPremium, roomType)
4. Очистить gameLogic.ts: roomUtils → параметр `options.roomType`, experienceManager → callback `onCardToFoundation?()`
5. Рефакторинг solvableGenerator.ts (~1655 строк):
   - Заменить импорты keyManager/shovelManager на `GeneratorOptions.preserveResources?: ResourcePreservation`
   - Заменить `getRoomFromURL()` → `options.roomType`
   - Удалить `getPremiumCardsCount()` (закомментирован в коде)
6. Извлечь getHint() (~415 строк) из useSolitaire.tsx → hints.ts:
   - Превратить в чистую функцию `getHint(state: GameState): Hint | null`
   - Извлечь `canAutoMoveToFoundation` в отдельную утилиту в cardUtils
   - Заменить все `get()` store на параметр `state`
7. Smoke tests (vitest): deck creation, game init, win condition, hint
8. `git tag v1.0.0 && git push --tags`

### Этап 3: Создать repo `treasure-hunt` ✅
1. Создать repo, package.json с peerDeps (zustand, liveops-shared)
2. tsup.config.ts с external: ['zustand', 'react', '@game/liveops-shared']
3. Скопировать `liveops/treasureHunt/` → `src/`
4. `PackRarity` → import from `@game/liveops-shared`
5. `formatTimeRemaining` → import from `@game/liveops-shared/timeUtils`
6. keyManager: DOM queries → callback `getCardPosition()` от shell
7. storage: localStorage → `PlatformAdapter.storage`
8. `git tag v1.0.0 && git push --tags`

### Этап 4: Создать repo `dungeon-dig` ✅
1. Аналогично treasure-hunt
2. shovelManager: DOM queries → callback `getCardPosition()`
3. storage: localStorage → `PlatformAdapter.storage`
4. `git tag v1.0.0 && git push --tags`

### Этап 5: Адаптировать p4g-platform ✅
1. Добавить git-based deps + zustand/react/liveops-shared в dependencies
2. **Постепенно** менять импорты (см. "Стратегия перехода"):
   - Сначала solitaire-core (types, cardUtils, gameLogic, scoring, hints)
   - Затем liveops (treasureHunt, dungeonDig, pointsEvent)
   - Проверять работоспособность после каждого файла
3. Создать `ShellCard = Card & { hasKey?, hasShovel?, isPremium?, isJoker? }`
4. Создать `ResourcePreservation` реализацию (обёртка над keyManager/shovelManager)
5. Передать DOM callbacks: `getCardPosition()` для key/shovelManager
6. Создать `PlatformAdapterFull extends PlatformAdapter` с auth-методами
7. Удалить перенесённые файлы из `lib/solitaire/` и `lib/liveops/` (только после полной проверки!)
8. Проверить Vite: `optimizeDeps.include`, `server.fs.allow`

### Этап 6: Настроить workspace ✅
1. Склонировать все repos в `p4g-platform-workspace/`
2. `npm install` в корне workspace
3. Проверить что symlinks работают, HMR подхватывает изменения

### Этап 7: Верификация ✅
1. Каждый repo отдельно: `npm run check && npm run build`
2. p4g-platform: `npm install && npm run check && npm run dev`
3. Полный прогон игры в браузере (new game, moves, hints, win flow)
4. LiveOps events: ключи распределяются, собираются, сундуки/тайлы работают
5. Points Event: очки начисляются, награды выдаются
6. Mobile touch test (Telegram WebView iOS + Android)
7. Desktop browser test

---

## Верификация

```bash
# Изоляция каждого пакета
cd solitaire-core && npm run check && npm run build
cd treasure-hunt && npm run check && npm run build
cd dungeon-dig && npm run check && npm run build
cd liveops-shared && npm run check && npm run build

# Приложение
cd p4g-platform && npm install && npm run check && npm run dev

# Workspace (локальная разработка)
cd p4g-platform-workspace && npm install
cd p4g-platform && npm run dev   # HMR подхватывает изменения из пакетов

# Ручное тестирование
# - New game → карты раздаются
# - Moves → drag & drop работает
# - Hints → верный ход
# - Win → win flow полностью
# - Treasure Hunt → ключи распределяются, собираются, сундуки открываются
# - Dungeon Dig → лопаты распределяются, тайлы копаются
# - Points Event → очки начисляются, награды выдаются
# - Mobile → touch работает
```

---

## Размеры пакетов (LLM-friendliness)

| Repo | Строк | Файлов | LLM-контекст | Build |
|------|--------|--------|--------------|-------|
| `solitaire-core` | ~1813 | 7 | Полностью помещается | 45 KB |
| `mahjong-core` | ~500 | 7 | Полностью помещается | 11.4 KB |
| `treasure-hunt` | ~587 | 5 | Полностью помещается | 10.5 KB |
| `dungeon-dig` | ~602 | 5 | Полностью помещается | 11.6 KB |
| `liveops-shared` | ~505 | 5 | Полностью помещается | 10.4 KB |
| `p4g-platform` | ~25K | 50+ | Работа по частям | 591 KB (173 KB gz) |

Каждый пакет — автономный repo для LLM-агента. Локально — workspace для удобной разработки человеком.

**Миграция завершена.** Дополнительно создан `mahjong-core` (не был в исходном плане) и портированы LiveOps на маджонг с shell barrel pattern.

---

## Multi-game builds (build-time switching)

Один shell, один codebase бизнес-логики. Разные билды на каждую игру через переменную окружения:

```bash
GAME=solitaire npm run build   → dist/solitaire/
GAME=mahjong npm run build     → dist/mahjong/
```

### Как работает

**Vite подставляет нужный кор при сборке:**

```typescript
// p4g-platform/vite.config.ts
import path from 'path'

const game = process.env.GAME || 'solitaire';

// Маппинг: имя игры → npm-пакет
const corePackages: Record<string, string> = {
  solitaire: '@game/solitaire-core',
  mahjong: '@game/mahjong-core',
  puzzle: '@game/puzzle-core',
};

export default defineConfig({
  define: {
    __GAME__: JSON.stringify(game),
  },
  build: {
    outDir: `dist/${game}`,
  },
  resolve: {
    alias: {
      // Единый алиас — shell не знает какой кор
      '@game/core': corePackages[game],
    },
  },
})
```

**Shell импортирует через алиас — не знает конкретный кор:**

```typescript
// p4g-platform/client/src/lib/stores/useSolitaire.tsx
// (будет переименован в useGame.tsx)
import { createGame, applyMove, getHint, checkWinCondition } from '@game/core';

// Работает одинаково для solitaire, mahjong, puzzle
const state = createGame();
const hint = getHint(state);
```

### Общий GameCore контракт

Каждый кор обязан реализовать единый интерфейс. **Важно:** интерфейс `GameCore` живёт в `@game/liveops-shared`, но коры (solitaire-core) **НЕ импортируют** его напрямую — это сохраняет zero deps. Вместо этого используется duck typing (структурная совместимость TypeScript). Shell проверяет совместимость:

```typescript
// p4g-platform — проверка на стороне shell (compile-time)
import * as sol from '@game/solitaire-core'
import type { GameCore } from '@game/liveops-shared'
// TypeScript проверит что sol удовлетворяет GameCore<...>
const core: GameCore<SolitaireState, SolitaireMove, SolitaireHint> = sol
```

```typescript
// @game/liveops-shared/src/types.ts — контракт (НЕ импортируется корами!)
interface GameCore<TState, TMove, THint> {
  // Lifecycle
  createGame(options?: GameOptions): TState

  // Moves
  getAvailableMoves(state: TState): TMove[]
  applyMove(state: TState, move: TMove): MoveResult<TState>
  undoMove(state: TState): TState | null

  // Queries
  isWon(state: TState): boolean
  isStuck(state: TState): boolean
  getHint(state: TState): THint | null

  // Scoring
  getScore(state: TState): number
  getMoveCount(state: TState): number
}

interface MoveResult<TState> {
  newState: TState
  pointsEarned: number
  itemsCompleted: string[]  // Для LiveOps (ключи/лопаты при завершении элемента)
}

interface GameOptions {
  difficulty?: 'easy' | 'normal' | 'hard'
  seed?: number
}
```

**Solitaire реализует:**

```typescript
// @game/solitaire-core/src/index.ts
export const solitaireCore: GameCore<SolitaireState, SolitaireMove, SolitaireHint> = {
  createGame: initializeGame,
  applyMove: moveCards,
  getAvailableMoves: getAllAvailableMoves,
  undoMove: undoLastMove,
  isWon: checkWinCondition,
  isStuck: hasNoMoves,
  getHint: getHint,
  getScore: calculateTotalScore,
  getMoveCount: (state) => state.moves,
};
```

**Будущий mahjong:**

```typescript
// @game/mahjong-core/src/index.ts
export const mahjongCore: GameCore<MahjongState, MahjongMove, MahjongHint> = {
  createGame: generateMahjongLayout,
  applyMove: removePair,
  // ...
};
```

### TypeScript: типизация при build-time switching

```typescript
// p4g-platform/client/src/types.ts
// Условный тип на основе __GAME__
declare const __GAME__: string;

// Для TypeScript — каждый кор экспортирует свои типы через единый алиас
// vite alias разрешит в конкретный пакет при сборке
import type { GameState, Move, Hint } from '@game/core';
```

Для TypeScript в dev-режиме нужен `tsconfig.json` path:

```jsonc
// p4g-platform/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@game/core": ["./node_modules/@game/solitaire-core/dist"]  // Default для IDE
    }
  }
}
```

### package.json: все коры как dependencies

```jsonc
// p4g-platform/package.json
{
  "dependencies": {
    "@game/solitaire-core": "github:you/solitaire-core#v1.2.0",
    "@game/mahjong-core": "github:you/mahjong-core#v0.5.0",
    "@game/liveops-shared": "github:you/liveops-shared#v1.0.0",
    "@game/treasure-hunt": "github:you/treasure-hunt#v1.0.0",
    "@game/dungeon-dig": "github:you/dungeon-dig#v1.0.0"
  },
  "scripts": {
    "dev": "GAME=solitaire vite",
    "dev:mahjong": "GAME=mahjong vite",
    "build:solitaire": "GAME=solitaire vite build",
    "build:mahjong": "GAME=mahjong vite build",
    "build:all": "npm run build:solitaire && npm run build:mahjong"
  }
}
```

### Деплой: каждая игра — свой URL

```
solitaire.example.com  → dist/solitaire/
mahjong.example.com    → dist/mahjong/

# Или Telegram WebApp:
t.me/SolitaireBot  → WebApp URL → solitaire.example.com
t.me/MahjongBot    → WebApp URL → mahjong.example.com
```

### Что общее между играми (пишется один раз)

- Stars, levels, XP system
- Daily quests (параметризованные: "выиграй N игр", "набери N очков")
- Leaderboard
- Shop / Premium
- Win streak
- Daily rewards
- Popup queue
- LiveOps events (treasure-hunt, dungeon-dig — работают через `itemsCompleted` из MoveResult)
- Audio, animations framework
- Telegram integration

### Что уникально для каждого кора

- Game board UI компоненты (карты vs тайлы маджонга)
- Touch/drag механика (разная для каждой игры)
- Game-specific animations
- Card/tile rendering

### Граница: shell знает про UI игры, но не про правила

```
┌──────────────────────────────────────────┐
│ @game/core (через алиас → конкретный кор)│
│ Правила, state, moves, hints, scoring   │
└──────────────────────┬───────────────────┘
                       │ GameCore interface
┌──────────────────────┴───────────────────┐
│ p4g-platform/src/games/solitaire/          │
│ SolitaireBoard.tsx — UI для раскладки    │
│ SolitaireCard.tsx — рендер карт          │
│ useSolitaireDrag.ts — drag & drop карт   │
│                                          │
│ p4g-platform/src/games/mahjong/            │
│ MahjongBoard.tsx — UI для тайлов         │
│ MahjongTile.tsx — рендер тайлов          │
│ useMahjongSelect.ts — выбор пар          │
└──────────────────────┬───────────────────┘
                       │
┌──────────────────────┴───────────────────┐
│ p4g-platform/src/ (общий shell)            │
│ Business logic, popups, shop, quests...  │
└──────────────────────────────────────────┘
```

Game-specific UI живёт в `p4g-platform/src/games/{name}/`, но правила и state — в отдельном repo кора.

---

## LiveOps Calendar + Event Registry

Сейчас ротация events hardcoded (`treasure ↔ dungeon`). Нужна **config-driven** система для управления расписанием events без деплоя.

### Calendar — JSON конфиг на каждую игру

```typescript
interface LiveOpsCalendar {
  gameId: string              // "solitaire", "mahjong"
  events: LiveOpsSchedule[]
}

interface LiveOpsSchedule {
  eventId: string             // "@game/treasure-hunt"
  version: string             // "1.2.0" — какую версию пакета ожидаем
  startDate: string           // ISO date
  endDate: string
  config?: Record<string, unknown>  // Переопределение дефолтного конфига
  minLevel?: number
  priority?: number           // При пересечении — кто важнее
}
```

Пример:

```json
{
  "gameId": "solitaire",
  "events": [
    { "eventId": "@game/treasure-hunt", "version": "1.2.0",
      "startDate": "2026-03-01", "endDate": "2026-03-14", "minLevel": 5 },
    { "eventId": "@game/dungeon-dig", "version": "1.0.0",
      "startDate": "2026-03-15", "endDate": "2026-03-28", "minLevel": 5 },
    { "eventId": "@game/treasure-hunt", "version": "1.2.0",
      "startDate": "2026-03-29", "endDate": "2026-04-11",
      "config": { "totalRooms": 15, "eventDurationMinutes": 20160 } },
    { "eventId": "@game/new-event", "version": "1.0.0",
      "startDate": "2026-04-12", "endDate": "2026-04-25", "minLevel": 8 }
  ]
}
```

### Откуда берётся календарь (fallback chain)

```
Remote config (сервер API)  ← обновляется без деплоя
    ↓ fallback
Cached (localStorage)       ← работает оффлайн
    ↓ fallback
Bundled default (build-time) ← зашит в бандл
    ↓ fallback
Hardcoded rotation           ← emergency
```

```typescript
// p4g-platform/src/lib/liveops/calendar.ts
async function getCalendar(gameId: string): Promise<LiveOpsCalendar> {
  try {
    const res = await fetch(`/api/liveops/calendar/${gameId}`);
    if (res.ok) {
      const cal = await res.json();
      adapter.storage.set(`liveops_calendar_${gameId}`, JSON.stringify(cal));
      return cal;
    }
  } catch {}
  const cached = adapter.storage.get(`liveops_calendar_${gameId}`);
  if (cached) return JSON.parse(cached);
  return defaultCalendars[gameId];
}
```

### Event Registry — plugin система

Shell знает какие event-пакеты установлены:

```typescript
// p4g-platform/src/lib/liveops/eventRegistry.ts
interface EventPlugin {
  id: string
  version: string
  store: any                    // Zustand store пакета
  initStorage: (adapter: PlatformAdapter) => void
  getResourceManager: () => ResourceManager | null
  components: {
    Icon: React.ComponentType
    Popup: React.ComponentType
    Promo: React.ComponentType
    FlyingDrop: React.ComponentType
  }
}

const eventRegistry: Record<string, EventPlugin> = {
  '@game/treasure-hunt': {
    id: '@game/treasure-hunt',
    version: '1.2.0',
    store: useTreasureHuntStore,
    initStorage: treasureHuntInitStorage,
    getResourceManager: () => keyManager,
    components: { Icon: TreasureHuntIcon, Popup: TreasureHuntPopup, ... },
  },
  '@game/dungeon-dig': { /* аналогично */ },
};
```

### Orchestrator использует календарь + registry

```typescript
// p4g-platform/src/hooks/useLiveOpsEvents.ts (переписанный)
function useLiveOpsEvents() {
  const [calendar, setCalendar] = useState<LiveOpsCalendar | null>(null);

  useEffect(() => { getCalendar(__GAME__).then(setCalendar); }, []);

  const activeEvents = useMemo(() => {
    if (!calendar) return [];
    const now = adapter.now();
    return calendar.events.filter(e =>
      new Date(e.startDate).getTime() <= now &&
      new Date(e.endDate).getTime() > now &&
      eventRegistry[e.eventId]  // Пакет установлен
    );
  }, [calendar]);

  // Version mismatch guard
  for (const scheduled of activeEvents) {
    const plugin = eventRegistry[scheduled.eventId];
    if (plugin.version !== scheduled.version) {
      console.warn(`${scheduled.eventId}: installed ${plugin.version}, expected ${scheduled.version}`);
    }
  }

  return { activeEvents, eventRegistry };
}
```

### Error boundary для пакетов

Если пакет не загрузился, выбросил ошибку при инициализации, или версия критически несовместима — игра должна продолжать работать **без этого ивента**, а не крашиться целиком.

```tsx
// EventErrorBoundary.tsx — оборачивает каждый event plugin
function EventErrorBoundary({ eventId, children }: { eventId: string; children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={null}  // Ивент просто не показывается
      onError={(error) => {
        console.error(`Event ${eventId} crashed:`, error);
        adapter.analytics?.track('event_error', { eventId, error: error.message });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// TopEventBar.tsx — каждый ивент изолирован
{activeEvents.map(event => {
  const plugin = eventRegistry[event.eventId];
  if (!plugin) return null;  // Пакет не установлен — пропустить
  const { Icon } = plugin.components;
  return (
    <EventErrorBoundary key={event.eventId} eventId={event.eventId}>
      <Icon />
    </EventErrorBoundary>
  );
})}
```

**Правило:** Crash одного LiveOps event'а НЕ должен ломать основную игру (solitaire). Пользователь может продолжать играть без ивента.

### UI динамически рендерит активные events

```tsx
// TopEventBar.tsx — больше нет hardcoded TreasureHuntIcon / DungeonDigIcon
function TopEventBar() {
  const { activeEvents, eventRegistry } = useLiveOpsEvents();
  return (
    <div className="flex gap-2">
      {activeEvents.map(event => {
        const { Icon } = eventRegistry[event.eventId].components;
        return <Icon key={event.eventId} />;
      })}
    </div>
  );
}
```

### Добавление нового event

```
1. Разработчик создаёт @game/new-event repo (по шаблону)
2. git tag v1.0.0 && git push --tags
3. В p4g-platform: npm install + добавить в eventRegistry + components
4. Деплой p4g-platform (ОДИН РАЗ для нового пакета)
5. Добавить в календарь на сервере → активируется без деплоя
```

### Обновление event (patch/minor)

```
1. Правки в @game/treasure-hunt repo, schemaVersion bump + миграция
2. git tag v1.3.0 && git push --tags
3. В p4g-platform: npm install (обновить tag)
4. Обновить version в eventRegistry
5. Обновить calendar: "version": "1.3.0"
6. Деплой p4g-platform
   Данные пользователей мигрируют автоматически (чистые функции в пакете)
```

### Обновление кора

```
1. Правки в @game/solitaire-core, smoke tests
2. git tag v1.3.0 && git push --tags
3. В p4g-platform: npm install + npm run check (TS проверит совместимость)
4. Деплой p4g-platform
```

### Что требует деплой, а что нет

| Действие | Деплой shell? | Деплой сервера? |
|----------|:---:|:---:|
| Включить/выключить event | Нет | Да (calendar JSON) |
| Изменить расписание | Нет | Да |
| Изменить конфиг event'а (duration, rooms) | Нет | Да |
| Обновить пакет event'а (patch/minor) | Да | Нет |
| Обновить пакет event'а (breaking) | Да | Да (calendar version) |
| Добавить новый event | Да (registry) | Да (calendar) |
| Обновить кор игры | Да | Нет |
| Изменить бизнес-логику | Да | Нет |

---

## Бэкенд, база данных, админка

### Текущее состояние

- Express + Drizzle ORM + Neon PostgreSQL (serverless)
- Сервер — scaffold: routes.ts пустой, storage.ts — in-memory, schema.ts — только `users`
- Passport установлен но не подключён, Telegram auth не реализован
- **Вся** логика и прогресс на клиенте (localStorage, 33+ ключа)
- gameIntegration.ts — только postMessage для лобби (score, tokens)

### Принципы

1. **Offline-first** — игра работает без интернета. Сервер = sync + admin + anti-cheat
2. **Единый бэкенд** для всех игр (solitaire, mahjong, etc.) — `gameId` в каждой таблице
3. **Монолит** — Express, один процесс, одна БД. Микросервисы — overengineering на этом этапе
4. **Neon Serverless** — connection pooling через `@neondatabase/serverless`, без pgBouncer
5. **Telegram-first auth** — initData HMAC-SHA256 валидация, не username/password

---

### Аутентификация (мультиплатформенная)

#### Платформы и методы входа

| Платформа | P0 (старт) | P1 (позже) |
|-----------|------------|------------|
| **Telegram Mini App** | initData HMAC-SHA256 | — |
| **Web (сайт)** | Guest (UUID) | Telegram Login Widget |
| **iOS** | Guest (device UUID) | Apple Sign-In |
| **Android** | Guest (device UUID) | Google Sign-In |

#### Архитектура: provider-based auth

```
players              auth_providers
┌──────────┐         ┌─────────────────────────────────┐
│ id: 42   │◄────────│ playerId: 42                    │
│ name     │         │ provider: 'telegram'             │
│ photoUrl │         │ providerUserId: '123456789'      │
└──────────┘         └─────────────────────────────────┘
      ▲              ┌─────────────────────────────────┐
      └──────────────│ playerId: 42                    │
                     │ provider: 'guest'                │
                     │ providerUserId: 'uuid-abc-123'   │
                     └─────────────────────────────────┘
```

Один игрок — несколько способов входа. Это позволяет:
- Начать как **guest** на web → привязать **Telegram** позже
- Играть на **iOS (guest)** → привязать **Apple ID** позже
- Один аккаунт на всех платформах после привязки

#### Общий auth flow (все платформы)

```
Клиент (любая платформа)                    Сервер
────────────────────────                    ──────
1. Определить provider + credentials ──→ POST /api/auth
   {                                        2. Валидация по provider:
     provider: 'telegram' | 'guest',           telegram → HMAC-SHA256
     credentials: { ... }                      guest → принять UUID
   }                                        3. Найти auth_provider по (provider, providerUserId)
                                            4. Если найден → вернуть существующего player
                                               Если нет → создать player + auth_provider
                                            5. Генерация JWT
6. Сохранение JWT в memory   ←──────────── { token, player, isNew }
7. Authorization: Bearer <jwt> на все запросы
```

#### Guest auth (P0)

```typescript
// Клиент: генерация стабильного device ID
function getDeviceId(): string {
  let id = localStorage.getItem('device_id')  // или AsyncStorage на RN
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('device_id', id)
  }
  return id
}

// Запрос:
POST /api/auth
{ provider: 'guest', credentials: { deviceId: 'uuid-abc-123' } }
```

Guest — анонимный аккаунт привязанный к устройству. Прогресс сохраняется. Если юзер очистит данные браузера — гостевой аккаунт потерян (поэтому мотивируем привязать Telegram/Apple/Google).

#### Telegram auth (P0)

```typescript
// Telegram Mini App:
POST /api/auth
{ provider: 'telegram', credentials: { initData: window.Telegram.WebApp.initData } }

// Будущее: Telegram Login Widget (web):
POST /api/auth
{ provider: 'telegram', credentials: { loginWidget: { id, first_name, hash, auth_date, ... } } }
```

```typescript
// server/auth.ts — валидация initData
function validateTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  params.delete('hash')

  // 1. HMAC-SHA256 проверка подписи
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex')

  if (hmac !== hash) return null

  // 2. Проверка auth_date — не старше 24 часов (защита от replay)
  const authDate = parseInt(params.get('auth_date') || '0', 10)
  const now = Math.floor(Date.now() / 1000)
  const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60  // 24 часа
  if (now - authDate > MAX_AUTH_AGE_SECONDS) {
    console.warn('Telegram initData expired:', { authDate, now, diff: now - authDate })
    return null
  }

  // 3. Защита от replay: дедупликация по hash
  // Храним последние N хешей в in-memory Set (или Redis для multi-instance)
  if (usedInitDataHashes.has(hash)) {
    console.warn('Telegram initData replay detected:', hash.substring(0, 16))
    return null
  }
  usedInitDataHashes.add(hash)
  // Очистка старых хешей по таймеру (каждые 24ч)

  const user = JSON.parse(params.get('user') || '{}')
  return { id: user.id, firstName: user.first_name, photoUrl: user.photo_url }
}

// In-memory replay protection (достаточно для single-instance)
const usedInitDataHashes = new Set<string>()
setInterval(() => usedInitDataHashes.clear(), 24 * 60 * 60 * 1000)
```

#### Account linking (привязка аккаунтов)

```
Guest на web → хочет привязать Telegram:

POST /api/auth/link
Headers: Authorization: Bearer <guest-jwt>
Body: { provider: 'telegram', credentials: { initData: '...' } }

Сервер:
1. Проверить JWT → playerId: 42 (guest)
2. Валидировать Telegram initData → telegramUserId: 123456789
3. Проверить: есть ли auth_provider (telegram, 123456789)?
   a) НЕТ → создать auth_provider (playerId: 42, telegram, 123456789) ← привязка
   b) ДА, к другому player → conflict! Предложить merge аккаунтов (P2)
4. Обновить player name/photo из Telegram
5. Вернуть обновлённый JWT
```

**После привязки:** игрок может войти и через guest (UUID), и через Telegram — оба ведут к одному player.

#### JWT — безопасное хранение

**Хранение:** JWT хранится **только в памяти** (переменная в React state / module scope), **НЕ в localStorage**. Причина: localStorage доступен любому JS на странице (XSS), а в Telegram WebView нет гарантии изоляции.

**Короткий TTL + re-auth при каждом старте:**

```typescript
// Player JWT — короткий TTL
const token = jwt.sign(
  { playerId: player.id, type: 'player' },
  process.env.JWT_SECRET,
  { expiresIn: '2h' }  // Короткий TTL — переаутентификация при каждом старте
)
```

**Flow при старте приложения:**
1. Клиент **всегда** делает `POST /api/auth` при открытии (initData / deviceId)
2. Получает свежий JWT (2h TTL)
3. Хранит JWT в памяти (React ref / module-level variable)
4. Если JWT истёк во время сессии → автоматический re-auth через PlatformAdapter.auth
5. При закрытии → JWT теряется (это ок, re-auth при следующем открытии)

**Почему не refresh token:** В Telegram Mini App initData — это по сути "вечный" refresh token (пока пользователь в Mini App). Для guest — deviceId всегда доступен. Дополнительный refresh token — лишняя сложность.

#### Будущие провайдеры (P1) — добавляются без изменения схемы

```typescript
// Apple Sign-In (iOS):
POST /api/auth
{ provider: 'apple', credentials: { identityToken: '...', authorizationCode: '...' } }

// Google Sign-In (Android):
POST /api/auth
{ provider: 'google', credentials: { idToken: '...' } }
```

Каждый новый провайдер = новая функция валидации в `server/auth.ts`. Таблицы не меняются.

#### PlatformAdapter расширение для auth

```typescript
// Добавить в PlatformAdapter:
interface PlatformAdapter {
  // ... existing fields ...
  auth: {
    getProvider(): 'telegram' | 'guest' | 'apple' | 'google'
    getCredentials(): Promise<AuthCredentials>
    getDeviceId(): string  // UUID, стабильный для устройства
  }
}

// Web adapter:
auth: {
  getProvider: () => window.Telegram?.WebApp?.initData ? 'telegram' : 'guest',
  getCredentials: async () => {
    if (window.Telegram?.WebApp?.initData) {
      return { provider: 'telegram', credentials: { initData: window.Telegram.WebApp.initData } }
    }
    return { provider: 'guest', credentials: { deviceId: getDeviceId() } }
  },
  getDeviceId: () => { /* localStorage UUID */ }
}

// React Native adapter:
auth: {
  getProvider: () => 'guest',  // default, upgradeable
  getCredentials: async () => ({ provider: 'guest', credentials: { deviceId: await getDeviceId() } }),
  getDeviceId: () => { /* AsyncStorage / MMKV UUID */ }
}
```

#### Admin auth (изолированная от player auth)

```typescript
// Admin JWT — ОТДЕЛЬНЫЙ secret + короткий TTL
const adminToken = jwt.sign(
  { adminId: admin.id, role: admin.role, type: 'admin' },
  process.env.JWT_ADMIN_SECRET,  // ОТДЕЛЬНЫЙ секрет от JWT_SECRET
  { expiresIn: '4h' }  // Короткий TTL для админов
)
```

- **Отдельный JWT secret** (`JWT_ADMIN_SECRET`) — компрометация player secret не даёт доступ к админке
- **Короткий TTL (4h)** — рабочий день, потом re-login
- Login через username/password (bcrypt), таблица `admins` (бывшая `users`)
- Middleware `requireAdmin` проверяет:
  1. JWT подписан `JWT_ADMIN_SECRET` (не `JWT_SECRET`)
  2. `type === 'admin'` в payload
  3. `role` имеет нужные права (RBAC — см. Админ-панель)
- **Не принимать player JWT на admin endpoints** (разные secrets = автоматически)

---

### База данных (Drizzle + Neon PostgreSQL)

#### Схема таблиц

```
┌──────────────────────────────────────────────────────────┐
│ players (P0)                                             │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ displayName   text                                       │
│ photoUrl      text                                       │
│ createdAt     timestamp DEFAULT now()                    │
│ lastSeenAt    timestamp                                  │
│ isBanned      boolean DEFAULT false                      │
└──────────────────────────────────────────────────────────┘
         │
         │ 1:N (один игрок — несколько способов входа)
         ▼
┌──────────────────────────────────────────────────────────┐
│ auth_providers (P0)                                      │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ playerId      integer FK → players.id                    │
│ provider      text NOT NULL  ← 'guest'|'telegram'|...    │
│ providerUserId text NOT NULL  ← UUID / telegramId / etc. │
│ providerUserIdHash text NOT NULL  ← SHA-256 hash          │
│ metadata      jsonb  ← { firstName, photoUrl, ... }      │
│ createdAt     timestamp DEFAULT now()                    │
│ UNIQUE (provider, providerUserIdHash)  ← индекс по хешу │
│ INDEX (playerId)                                         │
└──────────────────────────────────────────────────────────┘

**PII минимизация в metadata:** Хранить ТОЛЬКО `{ firstName, photoUrl }` — то, что реально отображается в игре. НЕ сохранять: last_name, username, language_code, phone и другие поля из Telegram initData. Меньше PII = меньше рисков при утечке.

**providerUserIdHash:** SHA-256 от `provider:providerUserId`. Индекс строится по хешу, а не по raw ID. Это:
- Защищает от утечки Telegram ID при SQL injection / DB dump
- Фиксированная длина хеша → эффективнее для B-tree индекса
- providerUserId хранится для отображения в админке (encrypted at rest через Neon)
- Lookup: `WHERE provider = $1 AND providerUserIdHash = sha256($1 + ':' + $2)`
         │
         │ 1:N (один игрок — много игр)
         ▼
┌──────────────────────────────────────────────────────────┐
│ player_progress (P0)                                     │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ playerId      integer FK → players.id                    │
│ gameId        text NOT NULL ('solitaire', 'mahjong')     │
│ version       integer DEFAULT 1 NOT NULL  ← OCC (++)     │
│ schemaVersion integer DEFAULT 1  ← версия структуры      │
│ stars         integer DEFAULT 0  ← "soft" валюта          │
│ premiumCurrency integer DEFAULT 0  ← "hard" валюта ($$)  │
│ level         integer DEFAULT 1                          │
│ xp            integer DEFAULT 0                          │
│ winStreak     integer DEFAULT 0                          │
│ gamesPlayed   integer DEFAULT 0                          │
│ gamesWon      integer DEFAULT 0                          │
│ totalScore    integer DEFAULT 0                          │
│ bestScore     integer DEFAULT 0                          │
│ premium       boolean DEFAULT false                      │
│ updatedAt     timestamp                                  │
│ UNIQUE (playerId, gameId)                                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ boosters (P0)                                            │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ playerId      integer FK → players.id                    │
│ gameId        text NOT NULL                              │
│ version       integer DEFAULT 1 NOT NULL  ← OCC (++)     │
│ undo          integer DEFAULT 3                          │
│ hint          integer DEFAULT 5                          │
│ joker         integer DEFAULT 1                          │
│ updatedAt     timestamp                                  │
│ UNIQUE (playerId, gameId)                                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ game_sessions (P0)                                       │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ playerId      integer FK → players.id                    │
│ gameId        text NOT NULL                              │
│ schemaVersion integer DEFAULT 1  ← версия структуры      │
│ state         jsonb NOT NULL  ← полный game state        │
│ stateSize     integer NOT NULL  ← size in bytes          │
│ savedAt       timestamp DEFAULT now()                    │
│ expiresAt     timestamp  ← savedAt + 7 days              │
│ UNIQUE (playerId, gameId)  ← один save на игру           │
│ CHECK (stateSize <= 2097152)  ← max 2 MB                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ daily_quests (P1)                                        │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ playerId      integer FK → players.id                    │
│ gameId        text NOT NULL                              │
│ date          date NOT NULL  ← какой день                │
│ quests        jsonb NOT NULL  ← массив Quest[]           │
│ acesCollected integer DEFAULT 0                          │
│ monthlyProgress integer DEFAULT 0                        │
│ monthlyRewardClaimed boolean DEFAULT false                │
│ UNIQUE (playerId, gameId, date)                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ daily_rewards (P1)                                       │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ playerId      integer FK → players.id                    │
│ streak        integer DEFAULT 0                          │
│ lastLoginDate date                                       │
│ UNIQUE (playerId)                                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ collections (P1)                                         │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ playerId      integer FK → players.id                    │
│ gameId        text NOT NULL                              │
│ items         jsonb NOT NULL  ← Collection[]             │
│ rewardedIds   jsonb DEFAULT '[]'                         │
│ allRewarded   boolean DEFAULT false                      │
│ trophies      jsonb DEFAULT '[]'                         │
│ updatedAt     timestamp                                  │
│ UNIQUE (playerId, gameId)                                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ liveops_event_progress (P1)                              │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ playerId      integer FK → players.id                    │
│ gameId        text NOT NULL                              │
│ eventId       text NOT NULL  ← '@game/treasure-hunt'     │
│ schemaVersion integer DEFAULT 1  ← версия структуры      │
│ state         jsonb NOT NULL  ← TreasureHuntEvent etc.   │
│ updatedAt     timestamp                                  │
│ UNIQUE (playerId, gameId, eventId)                       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ leaderboard_seasons (P1)                                 │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ gameId        text NOT NULL                              │
│ seasonNumber  integer NOT NULL                           │
│ startDate     timestamp NOT NULL                         │
│ endDate       timestamp NOT NULL                         │
│ UNIQUE (gameId, seasonNumber)                            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ leaderboard_entries (P1)                                 │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ seasonId      integer FK → leaderboard_seasons.id        │
│ playerId      integer FK → players.id                    │
│ stars         integer DEFAULT 0                          │
│ updatedAt     timestamp                                  │
│ UNIQUE (seasonId, playerId)                              │
│ INDEX (seasonId, stars DESC, updatedAt DESC)  ← составной│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ liveops_calendar (P0 — нужен для админки)                │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ gameId        text NOT NULL                              │
│ calendar      jsonb NOT NULL  ← LiveOpsCalendar          │
│ version       integer DEFAULT 1  ← для оптимистичного    │
│ updatedAt     timestamp                                  │
│ updatedBy     integer FK → admins.id                     │
│ UNIQUE (gameId)                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ remote_config (P2)                                       │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ gameId        text NOT NULL                              │
│ key           text NOT NULL  ← 'feature_flags', etc.     │
│ value         jsonb NOT NULL                             │
│ updatedAt     timestamp                                  │
│ UNIQUE (gameId, key)                                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ admins (P0 — переименовать из users)                     │
│──────────────────────────────────────────────────────────│
│ id            serial PK                                  │
│ username      text UNIQUE NOT NULL                       │
│ passwordHash  text NOT NULL                              │
│ role          text DEFAULT 'editor'  ← 'admin'|'editor'  │
│ isDisabled    boolean DEFAULT false  ← soft delete        │
│ createdAt     timestamp DEFAULT now()                    │
└──────────────────────────────────────────────────────────┘

**Soft delete для admins:** `isDisabled` вместо DELETE. Причина: admin_audit_log ссылается на admins.id — удаление ломает FK и теряет контекст "кто это сделал".

┌──────────────────────────────────────────────────────────┐
│ progress_events (P1 — audit log)                         │
│──────────────────────────────────────────────────────────│
│ id            bigserial PK                               │
│ playerId      integer FK → players.id                    │
│ gameId        text NOT NULL                              │
│ action        text NOT NULL  ← 'sync'|'win'|'purchase'   │
│ delta         jsonb  ← { stars: +50, boosters: { undo: -1 } } │
│ idempotencyKey text  ← syncId или actionId (UUID)         │
│ clientVersion text  ← '4.99.54'                          │
│ ip            inet                                       │
│ createdAt     timestamp DEFAULT now()                    │
│ INDEX (playerId, createdAt DESC)                         │
│ UNIQUE (idempotencyKey) WHERE idempotencyKey IS NOT NULL  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ admin_audit_log (P0 — логирование действий админов)      │
│──────────────────────────────────────────────────────────│
│ id            bigserial PK                               │
│ adminId       integer FK → admins.id                     │
│ action        text NOT NULL  ← 'calendar.update'|'player.ban' │
│ target        text  ← gameId, playerId, etc.             │
│ before        jsonb  ← состояние до изменения            │
│ after         jsonb  ← состояние после изменения         │
│ ip            inet  ← IP адрес админа                    │
│ userAgent     text  ← браузер/клиент                     │
│ createdAt     timestamp DEFAULT now()                    │
│ INDEX (adminId, createdAt DESC)                          │
└──────────────────────────────────────────────────────────┘
```

**schemaVersion в серверных таблицах:** Добавлен в `player_progress`, `game_sessions`, `liveops_event_progress`. При изменении структуры JSONB-полей — bump schemaVersion + серверная миграция (аналог клиентской). Позволяет безопасно эволюционировать формат данных.

**stateSize в game_sessions:** Сервер вычисляет `JSON.stringify(state).length` при сохранении. CHECK constraint не позволит записать state больше 2 MB. Клиент тоже проверяет размер перед отправкой.

**progress_events (audit log):** Каждый sync записывает дельту. Позволяет:
- Отследить подозрительные паттерны (100 побед за час)
- Откатить прогресс при обнаружении чита
- Дебаг конфликтов синхронизации
- `syncId` для idempotency (см. API)

#### Optimistic Concurrency Control (OCC) — version field

**Проблема:** "Last-write-wins" при нескольких устройствах теряет прогресс.
Сценарий: Телефон играет оффлайн (v5). Планшет: v5 → v6. Телефон выходит в онлайн, отправляет v5 → перезаписывает v6.

**Решение:** Поле `version` в `player_progress`, `boosters`.

```typescript
// Клиент присылает version вместе с sync
POST /api/progress/sync
{ ..., expectedVersion: 5 }

// Сервер: атомарный UPDATE с проверкой version
const result = await db
  .update(playerProgress)
  .set({ ...newData, version: sql`version + 1` })
  .where(and(
    eq(playerProgress.playerId, playerId),
    eq(playerProgress.gameId, gameId),
    eq(playerProgress.version, expectedVersion)  // OCC check
  ))
  .returning()

if (result.length === 0) {
  // Conflict! version в БД уже > expectedVersion
  // Вернуть текущее серверное состояние для merge на клиенте
  const current = await db.select()...
  return res.status(409).json({
    error: 'VERSION_CONFLICT',
    serverState: current,
    serverVersion: current.version
  })
}
```

**Flow при конфликте (клиент):**
1. Получил 409 VERSION_CONFLICT
2. Взял serverState из ответа
3. Merge: server = authority для критичных полей, max() для некритичных
4. Retry sync с новым `expectedVersion = serverVersion`
5. Показать пользователю тост "Прогресс синхронизирован" (без потерь)

#### Разделение Hard/Soft валюты

**Stars** (soft) — фармятся через игру. Потеря некритична.
**PremiumCurrency** (hard) — покупается за деньги. Потеря = финансовые претензии.

**P0:** `premiumCurrency` — отдельная колонка в `player_progress`. Клиент **НЕ может** обновлять её через `POST /api/progress/sync`. Изменяется только через серверные actions:

```typescript
// Только через серверный endpoint
POST /api/progress/action
{ type: 'PURCHASE_PREMIUM', amount: 100, receiptId: '...' }
{ type: 'SPEND_PREMIUM', amount: 10, item: 'booster_pack' }

// Сервер: транзакция + проверка баланса
await db.transaction(async (tx) => {
  const progress = await tx.select()...
  if (progress.premiumCurrency < amount) throw new Error('Insufficient funds')
  await tx.update(playerProgress)
    .set({ premiumCurrency: sql`premium_currency - ${amount}` })
    .where(...)
  // Записать в progress_events для аудита
})
```

**P1 (Ledger pattern):** Таблица `wallet_transactions` — полная история:

```
wallet_transactions (P1)
│ id            bigserial PK
│ playerId      integer FK → players.id
│ type          text  ← 'purchase'|'spend'|'refund'|'reward'
│ amount        integer NOT NULL  (+ или -)
│ balance       integer NOT NULL  ← баланс после транзакции
│ reason        text  ← 'iap_receipt_123'|'booster_pack'
│ createdAt     timestamp
│ INDEX (playerId, createdAt DESC)
```

Ledger = неизменяемый журнал. Текущий баланс = последняя запись `.balance`. Никаких UPDATE, только INSERT. Полная история для поддержки и разбора споров.

#### Typed Contracts — Zod валидация (shared/)

Все API request/response типы определяются через **Zod schemas** в `shared/validators.ts`. Единый источник правды для клиента и сервера.

```typescript
// shared/validators.ts
import { z } from 'zod'

// === Auth ===
export const AuthRequestSchema = z.object({
  provider: z.enum(['telegram', 'guest', 'apple', 'google']),
  credentials: z.record(z.unknown()),  // Валидация per-provider на сервере
})

// === Progress Sync ===
export const ProgressDeltaSchema = z.object({
  gamesPlayed: z.number().int().min(0).max(50).optional(),
  gamesWon: z.number().int().min(0).max(50).optional(),
  levelUp: z.number().int().min(0).max(1).optional(),
  xpGained: z.number().int().min(0).max(10000).optional(),
  bestScore: z.number().int().min(0).optional(),
  winStreak: z.number().int().min(0).optional(),
})

export const SyncRequestSchema = z.object({
  syncId: z.string().uuid(),
  gameId: z.string().min(1).max(50),
  expectedVersion: z.number().int().positive(),  // OCC — версия которую клиент ожидает
  clientVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  coreVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  delta: ProgressDeltaSchema,
  signature: z.string().optional(),
  timestamp: z.number().int().positive(),
})

// === Game Sessions ===
export const SaveSessionSchema = z.object({
  gameId: z.string().min(1).max(50),
  schemaVersion: z.number().int().positive(),  // Клиент обязан указать версию
  state: z.unknown(),  // Валидация размера на сервере (< 2MB)
})

// === LiveOps Event Progress ===
export const EventProgressSchema = z.object({
  gameId: z.string().min(1).max(50),
  eventId: z.string(),
  schemaVersion: z.number().int().positive(),
  state: z.unknown(),
})

// === Schema Version валидация (серверная) ===
// Сервер хранит SUPPORTED_SCHEMA_VERSIONS per entity type
// Если клиент присылает неподдерживаемую версию → 400
// { error: 'UNSUPPORTED_SCHEMA', supported: [1, 2], received: 3 }
// Клиент показывает "Обновите приложение"

// === LiveOps Calendar ===
export const LiveOpsScheduleSchema = z.object({
  eventId: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  config: z.record(z.unknown()).optional(),
  minLevel: z.number().int().min(0).optional(),
  priority: z.number().int().optional(),
})

export const LiveOpsCalendarSchema = z.object({
  gameId: z.string(),
  events: z.array(LiveOpsScheduleSchema),
})

// TypeScript types — автоматически выводятся из Zod
export type AuthRequest = z.infer<typeof AuthRequestSchema>
export type SyncRequest = z.infer<typeof SyncRequestSchema>
export type ProgressDelta = z.infer<typeof ProgressDeltaSchema>
export type LiveOpsCalendar = z.infer<typeof LiveOpsCalendarSchema>
```

**Использование:**

```typescript
// Сервер: валидация входящих данных
app.post('/api/progress/sync', requireAuth, (req, res) => {
  const result = SyncRequestSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues })
  }
  // result.data — типизированный и валидированный
})

// Клиент: создание запросов с автокомплитом
const syncBody: SyncRequest = { ... }  // TypeScript проверит структуру
```

**Зависимость:** Добавить `zod` в `shared/` devDependencies и в p4g-platform dependencies.

#### Почему JSONB для сложных объектов

- `game_sessions.state` — полный game state (tableau, foundations, stock, waste). Структура зависит от кора (solitaire vs mahjong) → JSONB гибче чем реляционная модель
- `liveops_event_progress.state` — TreasureHuntEvent / DungeonDigEvent. Структура зависит от пакета ивента
- `daily_quests.quests` — массив Quest[], структура меняется часто
- `collections.items` — вложенная структура коллекций

**Правило:** Данные, которые читаются/пишутся **целиком** (не нужны SQL-запросы по внутренним полям) → JSONB. Данные для **фильтрации и агрегации** (stars, level, leaderboard) → отдельные колонки.

---

### API Endpoints

#### Auth (P0)

```
POST /api/auth                ← единый endpoint для всех провайдеров
  Body: { provider: 'telegram' | 'guest', credentials: { ... } }
  Response: { token: string, player: Player, isNew: boolean }

POST /api/auth/link           ← привязать доп. провайдер к текущему аккаунту
  Headers: Authorization: Bearer <jwt>
  Body: { provider: 'telegram', credentials: { initData: '...' } }
  Response: { token: string, player: Player }

GET  /api/auth/providers      ← список привязанных провайдеров
  Headers: Authorization: Bearer <jwt>
  Response: { providers: ['guest', 'telegram'] }

POST /api/auth/admin/login    ← username/password → admin JWT
  Body: { username: string, password: string }
```

#### Player Progress (P0)

```
GET  /api/progress             ← прогресс текущего игрока по текущей игре
  Headers: Authorization: Bearer <jwt>
  Query: ?gameId=solitaire
  Response: { progress, boosters, dailyRewards }

POST /api/progress/sync        ← bulk sync от клиента
  Body: {
    syncId: string,            ← UUID, уникальный для каждого sync (idempotency)
    gameId: string,
    clientVersion: string,     ← '4.99.54' — версия клиента
    coreVersion: string,       ← '1.2.0' — версия game core
    delta: ProgressDelta,      ← дельта от последнего sync (не полный state!)
    signature?: string,        ← HMAC подпись (P1, anti-cheat)
    timestamp: number          ← client timestamp
  }
  Response: {
    merged: MergedState,
    conflicts: Conflict[],
    serverTime: number         ← для синхронизации часов
  }
```

**Idempotency (syncId):** Если сервер получает sync с уже обработанным `syncId` → возвращает предыдущий результат без повторной записи. Защита от дублирования при network retry.

**Version fields:** Позволяют серверу:
- Отклонить sync от устаревшего клиента (`clientVersion < MIN_SUPPORTED_VERSION`)
- Логировать для дебага ("баг только на 4.99.52")
- Автоматически применять миграции по `coreVersion`

```
POST /api/progress/action      ← серверное действие (критичные операции)
  Body: {
    actionId: string,          ← UUID (idempotency — повтор не спишет валюту дважды)
    gameId: string,
    type: 'ADD_STARS' | 'USE_BOOSTER' | 'PURCHASE',
    payload: {...}
  }
  Response: { success, newBalance, serverTime, reason? }
```

**Idempotency на actions:** `actionId` хранится в `progress_events`. Если сервер получает повторный `actionId` → возвращает предыдущий результат. Критично для `USE_BOOSTER` и `PURCHASE` — повторный запрос из-за таймаута не должен списать валюту дважды.

#### Game Sessions (P0)

```
GET  /api/sessions             ← текущий saved game
  Query: ?gameId=solitaire
  Response: { state: GameState, savedAt } | null

PUT  /api/sessions             ← сохранить game state
  Body: { gameId, state: GameState }
  Response: { savedAt }

DELETE /api/sessions            ← удалить (после win)
  Query: ?gameId=solitaire
```

#### LiveOps Calendar (P0 — публичный + админский)

```
# Публичный (для клиента) — с ETag кешированием
GET  /api/liveops/calendar     ← текущий календарь
  Query: ?gameId=solitaire
  Headers: If-None-Match: "etag-from-previous-request" (опционально)
  Response: LiveOpsCalendar
  Response Headers:
    ETag: "calendar:solitaire:v42"  ← version из таблицы liveops_calendar
    Cache-Control: public, max-age=300  ← 5 мин клиентский кеш

# Админский
GET    /api/admin/liveops/calendars           ← все календари
POST   /api/admin/liveops/calendars           ← создать/обновить
  Body: { gameId, calendar: LiveOpsCalendar }
PUT    /api/admin/liveops/calendars/:gameId   ← обновить
DELETE /api/admin/liveops/calendars/:gameId   ← удалить
```

#### LiveOps Event Progress (P1)

```
GET  /api/liveops/progress     ← прогресс ивента игрока
  Query: ?gameId=solitaire&eventId=@game/treasure-hunt
  Response: { state: TreasureHuntEvent }

PUT  /api/liveops/progress     ← обновить прогресс ивента
  Body: { gameId, eventId, state }
```

#### Daily Quests (P1)

```
GET  /api/quests               ← квесты на сегодня
  Query: ?gameId=solitaire
  Response: { quests, acesCollected, monthlyProgress }

PUT  /api/quests               ← обновить прогресс квестов
  Body: { gameId, quests, acesCollected, monthlyProgress }
```

#### Leaderboard (P1)

```
GET  /api/leaderboard          ← текущий сезон + топ
  Query: ?gameId=solitaire&limit=20
  Response: { season, entries: [...], playerRank }

POST /api/leaderboard/score    ← добавить очки за сезон
  Body: { gameId, stars: number }
```

#### Admin — Players (P2)

```
GET  /api/admin/players        ← поиск игроков
  Query: ?search=123&provider=telegram&limit=20  ← поиск по providerUserId или displayName
GET  /api/admin/players/:id    ← детали игрока + все auth_providers
PUT  /api/admin/players/:id/ban  ← забанить
```

#### Admin — Remote Config (P2)

```
GET  /api/admin/config/:gameId        ← все конфиги игры
PUT  /api/admin/config/:gameId/:key   ← обновить конфиг
```

---

### Стратегия синхронизации (localStorage → сервер)

#### Фаза 1: Server-as-backup (P0)

Клиент остаётся source of truth. Сервер — резервная копия.

```
Инициализация:
1. Открытие Mini App → определить provider (Telegram initData / guest deviceId)
2. POST /api/auth → JWT (2h TTL, in memory) + player + syncSecret
3. GET /api/progress?gameId=solitaire → серверный прогресс
4. Merge: server = authority для stars/boosters/premium; остальное по timestamp
5. Игра начинается

Периодический sync (каждые 60 секунд + при закрытии):
1. Клиент собирает дельту от последнего sync
2. POST /api/progress/sync → { syncId, delta, clientVersion, coreVersion, signature }
3. Сервер: проверить syncId (idempotency), валидировать Zod, проверить дельту
4. Сервер сохраняет, записывает в progress_events, возвращает merged state

Закрытие Mini App:
1. beforeunload / Telegram.WebApp.onEvent('close') → последний sync
2. navigator.sendBeacon('/api/progress/sync', data) — гарантированная отправка

JWT expiry во время сессии:
1. Sync получает 401 → автоматический POST /api/auth (re-auth)
2. Новый JWT в памяти → retry sync
3. Бесшовно для пользователя

Clock skew (синхронизация часов):
1. Каждый ответ сервера содержит serverTime (unix ms)
2. Клиент при первом ответе вычисляет: timeOffset = serverTime - Date.now()
3. Все клиентские timestamps: Date.now() + timeOffset
4. Защищает от неверных часов устройства при merge по timestamp

Backoff при недоступности сервера:
1. Sync fail → retry через 1 мин
2. Второй fail → 2 мин
3. Третий+ → 5 мин (cap)
4. Успешный sync → сброс к 1 мин
5. Offline режим: localStorage only, без тостов ошибок (игра работает)
```

#### Фаза 2: Server-as-authority (P1)

Сервер становится source of truth для критичных данных (stars, boosters, premium).

```
Критичные операции (stars, покупки, бустеры):
→ POST /api/progress/action { type: 'ADD_STARS', amount: 50, reason: 'win' }
→ Сервер валидирует, обновляет, возвращает новый balance
→ Клиент обновляет local state

Некритичные (quests progress, UI flags):
→ localStorage first, periodic sync
```

#### Conflict Resolution — разделение по критичности

```typescript
function mergeProgress(local: Progress, server: Progress): Progress {
  // ========= СЕРВЕР = AUTHORITY (критичные поля) =========
  // Эти поля ВСЕГДА берутся с сервера — клиент НЕ может их увеличить
  // напрямую. Изменения идут через серверные actions.
  const premium = server.premium          // Покупки — только через сервер
  const boosters = server.boosters        // Бустеры — только через сервер (purchase/reward)
  const stars = server.stars              // Stars — сервер считает (anti-cheat)

  // ========= КЛИЕНТ + ВАЛИДАЦИЯ (отслеживаемые поля) =========
  // Клиент отправляет дельту, сервер валидирует допустимость
  const level = Math.max(local.level, server.level)   // Level не уменьшается
  const xp = Math.max(local.xp, server.xp)            // XP не уменьшается
  const gamesPlayed = Math.max(local.gamesPlayed, server.gamesPlayed)
  const gamesWon = Math.max(local.gamesWon, server.gamesWon)

  // ========= LAST-WRITE-WINS (некритичные поля) =========
  // Выбираем свежее по timestamp
  const session = local.savedAt > server.savedAt ? local.session : server.session
  const winStreak = local.updatedAt > server.updatedAt ? local.winStreak : server.winStreak

  // ========= UNION MERGE (аддитивные коллекции) =========
  // Собранные предметы не удаляются → union
  const collections = mergeCollections(local.collections, server.collections)

  return { premium, boosters, stars, level, xp, gamesPlayed, gamesWon,
           session, winStreak, collections }
}
```

**Ключевое отличие от первоначальной стратегии:** `Math.max()` для stars/boosters/premium УБРАН — это позволяло клиенту просто отправить `stars: 999999`. Теперь критичные поля меняются ТОЛЬКО через серверные actions (`POST /api/progress/action`), а sync просто записывает серверное значение на клиент.

**OCC интеграция:** Merge вызывается только при VERSION_CONFLICT (409). В обычном случае sync просто инкрементирует version и записывает. При конфликте — сервер возвращает своё состояние, клиент мержит и retry.

#### Миграция существующих пользователей

```
1. Пользователь открывает обновлённую версию игры
2. Если localStorage есть, а серверного профиля нет → первый sync:
   POST /api/progress/sync с ПОЛНЫМ localStorage
3. Сервер создаёт записи из localStorage data
4. С этого момента — двусторонний sync
5. localStorage остаётся как кеш (offline fallback)
```

---

### Админ-панель

#### Scope (P0 — MVP)

```
┌─────────────────────────────────────────────┐
│ Admin Panel (отдельный React SPA)           │
│─────────────────────────────────────────────│
│                                             │
│ 📅 LiveOps Calendar                         │
│   • Список игр (solitaire, mahjong, ...)   │
│   • Расписание ивентов (drag & drop)        │
│   • Создание/редактирование расписания      │
│   • Превью: какой ивент сейчас активен      │
│   • 🆕 Preview на произвольную дату          │
│   • 🆕 Version mismatch warning              │
│   •   (installed vs expected version)       │
│   • История изменений (кто, когда, что)     │
│   •   → из admin_audit_log таблицы          │
│                                             │
│ 🔐 RBAC (P0)                                │
│   • admin: полный доступ ко всему           │
│   • editor: calendar, config (без players)  │
│   • viewer: read-only (для аналитики)       │
│   • Все действия логируются в audit_log     │
│                                             │
│ 👤 Players (P2)                              │
│   • Поиск по Telegram ID                    │
│   • Просмотр прогресса                      │
│   • Ban/unban                               │
│   • Reset данных (support)                  │
│   • 🆕 Flagged players (anti-cheat)          │
│                                             │
│ ⚙️ Remote Config (P2)                        │
│   • Feature flags per game                  │
│   • Настройки балансировки                  │
│   • A/B тесты                              │
│                                             │
│ 📊 Dashboard (P2)                            │
│   • DAU/MAU                                 │
│   • Retention                               │
│   • LiveOps engagement                      │
└─────────────────────────────────────────────┘
```

#### RBAC (Role-Based Access Control)

```typescript
// Роли и разрешения
const RBAC: Record<string, string[]> = {
  admin: ['*'],  // Полный доступ
  editor: [
    'calendar.read', 'calendar.write',
    'config.read', 'config.write',
    'players.read',  // Только просмотр, не ban
  ],
  viewer: [
    'calendar.read', 'config.read', 'players.read', 'dashboard.read',
  ],
}

// Middleware
function requirePermission(permission: string) {
  return (req, res, next) => {
    const role = req.admin.role
    const perms = RBAC[role]
    if (!perms?.includes('*') && !perms?.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

// Все мутации логируются
app.put('/api/admin/liveops/calendars/:gameId',
  requireAdmin, requirePermission('calendar.write'),
  auditLog('calendar.update'),  // → admin_audit_log
  updateCalendarHandler
)
```

#### Calendar Preview на произвольную дату

```
GET /api/admin/liveops/calendars/:gameId/preview?date=2026-04-01
  Response: {
    activeEvents: LiveOpsSchedule[],  // Какие ивенты активны на эту дату
    installedVersions: Record<string, string>,  // Какие версии установлены
    mismatches: Array<{ eventId, installed, expected }>  // Warning!
  }
```

Админ может "заглянуть в будущее" — увидеть какие ивенты будут активны на указанную дату, и есть ли проблемы с версиями.

#### Фреймворк: Refine (не пишем с нуля!)

Вместо написания Admin SPA с нуля — используем **Refine** (https://refine.dev):

**Почему Refine:**
- CRUD из коробки: List, Create, Edit, Show — за минуты
- Auth provider — подключается к нашему `POST /api/auth/admin/login`
- Data provider — подключается к REST API (`/api/admin/*`)
- Access control provider — RBAC из коробки
- Audit log provider — для отображения истории
- Ant Design / Material UI на выбор — готовые компоненты
- TypeScript-first, отличная Zod интеграция

**Альтернатива:** React Admin (более зрелый, но менее гибкий для кастомных страниц вроде calendar preview).

**Экономия:** ~3-4 дня разработки UI. Вместо написания Grid, Filters, Forms, Pagination, Auth UI — настраиваем data/auth providers (~2-4 часа) и пишем только кастомные компоненты (CalendarTimeline, VersionMismatchBadge).

#### Где живёт админка

```
p4g-platform/
├── client/           # Игра (существующее)
├── admin/            # Refine app (новое)
│   ├── src/
│   │   ├── providers/
│   │   │   ├── authProvider.ts     # → POST /api/auth/admin/login
│   │   │   ├── dataProvider.ts     # → /api/admin/* REST endpoints
│   │   │   └── accessControl.ts    # RBAC roles → permissions
│   │   ├── resources/
│   │   │   ├── calendars/          # List + Edit (Refine CRUD)
│   │   │   ├── players/            # List + Show (Refine CRUD)
│   │   │   └── config/             # List + Edit (Refine CRUD)
│   │   ├── pages/
│   │   │   ├── CalendarPreview.tsx  # Кастом: preview на дату
│   │   │   └── Dashboard.tsx        # Кастом: метрики
│   │   └── App.tsx
│   ├── package.json   # @refinedev/core, @refinedev/antd, etc.
│   └── vite.config.ts
├── server/           # Один сервер для обоих
└── shared/
```

```typescript
// admin/src/providers/dataProvider.ts
import dataProvider from '@refinedev/simple-rest'

export default dataProvider('/api/admin', {
  headers: () => ({
    Authorization: `Bearer ${getAdminToken()}`
  })
})

// admin/src/providers/accessControl.ts
import { AccessControlProvider } from '@refinedev/core'

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const role = getAdminRole()  // из JWT
    const perms = RBAC[role]
    const permission = `${resource}.${action}`
    return { can: perms.includes('*') || perms.includes(permission) }
  }
}
```

**API формат для Refine:** Refine `simple-rest` data provider ожидает стандартный REST:
- `GET /api/admin/calendars` → `{ data: [...], total: N }`
- `GET /api/admin/calendars/:id` → `{ data: {...} }`
- `POST /api/admin/calendars` → create
- `PUT /api/admin/calendars/:id` → update
- `DELETE /api/admin/calendars/:id` → delete

Наши admin API endpoints уже в этом формате — минимальная адаптация.

Отдельный Vite проект в `admin/` с proxy на тот же Express сервер (dev mode: `vite.config.ts` → `server.proxy: { '/api': 'http://localhost:3001' }`).

---

### Масштабирование

#### Текущий стек (достаточно до ~100K DAU)

```
Клиент → Express (1 процесс) → Neon PostgreSQL (serverless)
```

**Neon Serverless** автоматически масштабирует:
- Connection pooling встроен (HTTP mode через `@neondatabase/serverless`)
- Autoscaling compute (0.25 → 8 vCPU)
- Read replicas (для leaderboard-запросов)
- Branching (для staging/testing)

#### Узкие места и решения

| Узкое место | Когда | Решение |
|-------------|-------|---------|
| Sync запросы (60с × N игроков) | >10K DAU | Batch sync: отправлять diff, не полный state |
| Leaderboard сортировка | >50K записей в сезоне | Materialized view / read replica + кеш |
| LiveOps calendar запросы | Каждый клиент при старте | In-memory cache (5 мин TTL) |
| Game session writes | Каждые 60с × N | Debounce на клиенте + upsert |
| Connection pool | >500 concurrent | Neon HTTP mode (stateless, no pool needed) |

#### Кеширование (без Redis на старте)

```typescript
// In-memory кеш для read-heavy данных
const cache = new Map<string, { data: any, expiresAt: number }>()

function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.data
  const data = fn()
  data.then(d => cache.set(key, { data: d, expiresAt: Date.now() + ttlMs }))
  return data
}

// Использование с ETag:
app.get('/api/liveops/calendar', async (req, res) => {
  const gameId = req.query.gameId as string
  const calendar = await cached(
    `calendar:${gameId}`,
    5 * 60 * 1000,  // 5 мин
    () => db.select().from(liveopsCalendar).where(eq(liveopsCalendar.gameId, gameId))
  )

  // ETag на основе version из таблицы
  const etag = `"calendar:${gameId}:v${calendar.version}"`
  res.setHeader('ETag', etag)
  res.setHeader('Cache-Control', 'public, max-age=300')

  // 304 Not Modified если клиент уже имеет актуальную версию
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end()
  }

  res.json(calendar.calendar)
})
```

Когда in-memory кеша станет мало → Redis (Upstash Serverless Redis — pay-per-request, как Neon).

#### Горизонтальное масштабирование (>100K DAU)

```
Этап 1 (текущий): 1 Express → Neon
Этап 2 (>10K DAU): PM2 cluster mode (4 workers) → Neon
Этап 3 (>50K DAU): PM2 + Upstash Redis (shared cache) → Neon + read replica
Этап 4 (>100K DAU): Kubernetes / Cloud Run + Redis + Neon autoscale
```

**Neon преимущество:** Serverless PostgreSQL автоматически масштабирует compute. Не нужно управлять инстансами.

#### Rate Limiting (P0)

**Два уровня:** pre-auth (по IP) и post-auth (по playerId).

```typescript
import rateLimit from 'express-rate-limit'

// 1. Pre-auth: лимит по IP (до аутентификации)
//    Применяется ко ВСЕМ запросам
app.use('/api/', rateLimit({
  windowMs: 60000,
  max: 100,
  // IP — единственный идентификатор до auth
  keyGenerator: (req) => req.ip
}))

// 2. Auth endpoints: жёсткий лимит по IP (защита от brute force)
app.use('/api/auth/', rateLimit({ windowMs: 60000, max: 5 }))
app.use('/api/auth/admin/', rateLimit({ windowMs: 60000, max: 3 }))

// 3. Post-auth: лимит по playerId (ТОЛЬКО после requireAuth middleware!)
//    Важно: req.playerId доступен только после requireAuth
//    Поэтому этот rate limiter регистрируется ПОСЛЕ requireAuth в route handlers
function playerRateLimit(max: number) {
  return rateLimit({
    windowMs: 60000,
    max,
    keyGenerator: (req) => `player:${req.playerId}`,  // Безопасно — requireAuth уже проверил JWT
    message: { error: 'Too many requests' }
  })
}

// В routes.ts:
app.post('/api/progress/sync', requireAuth, playerRateLimit(2), syncHandler)
app.put('/api/sessions', requireAuth, playerRateLimit(3), saveSessionHandler)
app.get('/api/progress', requireAuth, playerRateLimit(10), getProgressHandler)
```

**Почему playerId только после requireAuth:** До аутентификации `req.playerId` не существует. Если поставить rate limit по playerId до requireAuth → злоумышленник может подставить чужой playerId в заголовок и заблокировать его.

#### CORS: раздельные политики (P0)

```typescript
// Game API — открытый (Telegram WebView, разные домены)
app.use('/api/', cors({ origin: '*' }))

// Admin API — только свой домен (CSRF не нужен при JWT в памяти,
// но CORS ограничивает откуда можно слать запросы)
app.use('/api/admin/', cors({
  origin: process.env.ADMIN_ORIGIN || 'https://admin.p4g.example.com',
  credentials: true,
}))
```

#### Compression (P0)

```typescript
import compression from 'compression'
// Перед routes — сжимает JSONB ответы (sync, calendar, progress)
// JSONB хорошо сжимается: 60-80% экономия трафика
app.use(compression({ threshold: 1024 }))  // Сжимать ответы > 1KB
```

`package.json` → добавить `compression`.

#### Log Redaction (P0)

```typescript
// Гарантировать что PII / secrets НЕ попадают в логи
// В request logger (server/index.ts):
function sanitizeForLog(obj: any): any {
  const REDACT = ['initData', 'deviceId', 'token', 'authorization',
                  'password', 'syncSecret', 'providerUserId']
  // Заменить значения на '[REDACTED]'
}

// Правило: console.log НЕ ИСПОЛЬЗУЕТСЯ для request data в production
// Только структурированный logger (pino / winston) с redaction
```

#### Health Check + Metrics (P0)

```typescript
// /healthz — для мониторинга и load balancer
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// In-memory counters (без внешних зависимостей)
const metrics = {
  requests: 0,
  errors: 0,
  syncCount: 0,
  authCount: 0,
  avgResponseMs: 0,
}

// /metrics — для дашборда (admin only)
app.get('/api/admin/metrics', requireAdmin, (req, res) => {
  res.json({ ...metrics, memoryUsage: process.memoryUsage() })
})
```

#### Дополнительные DB индексы

```sql
-- progress_events: аналитика по игре
CREATE INDEX idx_progress_events_game_created
  ON progress_events (gameId, createdAt DESC);

-- progress_events: поиск flagged
CREATE INDEX idx_progress_events_flagged
  ON progress_events (action, createdAt DESC)
  WHERE action = 'flagged';
```

---

### Anti-cheat (P1)

#### Серверная валидация прогресса

```typescript
function validateProgressDelta(
  old: Progress,
  delta: ProgressDelta,
  syncMeta: SyncMeta
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Sanity checks — физически невозможные значения
  if (delta.gamesWon > delta.gamesPlayed) {
    errors.push('More wins than games played')
  }
  if (delta.gamesPlayed > 50) {  // >50 игр за 60 секунд sync interval
    errors.push('Too many games in sync interval')
  }

  // 2. Level не может перескочить больше чем на 1 за sync
  if (delta.levelUp > 1) {
    errors.push('Level jumped too far')
  }

  // 3. Score sanity — максимальный теоретический score за игру
  if (delta.bestScore > MAX_THEORETICAL_SCORE) {
    errors.push('Score exceeds theoretical maximum')
  }

  // 4. Time-based checks
  const timeSinceLastSync = syncMeta.timestamp - old.updatedAt
  if (timeSinceLastSync < 5000) {  // <5 секунд между syncs
    warnings.push('Suspiciously fast sync')
  }

  // 5. State size check (уже есть CHECK в БД, но валидируем до записи)
  if (syncMeta.stateSize > 2 * 1024 * 1024) {
    errors.push('State too large')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    shouldFlag: warnings.length > 2  // Флаг для ручной проверки
  }
}
```

#### Подпись прогресса (клиентская)

```typescript
// Клиент подписывает дельту HMAC-ом с session-специфичным ключом
// Это НЕ замена серверной валидации, а дополнительный слой

// При auth сервер выдаёт syncSecret (уникальный для сессии)
const syncSignature = hmacSHA256(
  JSON.stringify({ delta, syncId, timestamp }),
  syncSecret  // Получен при POST /api/auth
)

// Сервер проверяет подпись + валидирует дельту
// Если подпись не совпадает → replay attack или подмена данных
```

**Важно:** Подпись — "speed bump", не абсолютная защита. Мотивированный читер может извлечь syncSecret из памяти. Но это отсекает 99% casual cheating (Postman, curl).

#### Автоматическое флагирование

```typescript
// Записываем в progress_events с action = 'flagged'
// Админ видит в панели: список flagged игроков
// Решение: ban / reset / ignore
```

#### Критичные операции — server-side only

| Операция | Где выполняется | Почему |
|----------|:---:|---------|
| Начисление stars за победу | Сервер | Anti-cheat |
| Покупка бустеров | Сервер | Деньги |
| Premium статус | Сервер | Деньги |
| Расход бустеров | Сервер (P1) / Клиент (P0) | P0: offline-first |
| Прогресс квестов | Клиент + серверная валидация | Некритично |
| Game state save | Клиент → сервер (backup) | Допустимо |

---

### Этапы реализации бэкенда

#### Этап B0: Фундамент (~2-3 дня)
1. `shared/schema.ts` — все таблицы (Drizzle), включая audit logs
2. `shared/validators.ts` — Zod schemas для всех API contracts
3. `npm run db:push` — создание таблиц в Neon
4. `server/auth.ts` — Telegram initData валидация (с auth_date + replay protection) + JWT (in-memory, 2h TTL)
5. `server/middleware.ts` — requireAuth, requireAdmin (раздельные secrets), RBAC
6. `server/storage.ts` → `DatabaseStorage` (заменить MemStorage)
7. Rate limiting (pre-auth по IP + post-auth по playerId)
8. `package.json` — добавить zod, jsonwebtoken, express-rate-limit

#### Этап B1: Core API (~2 дня)
1. `POST /api/auth` — единый endpoint (telegram + guest)
2. `GET/POST /api/progress` — CRUD прогресса + sync с syncId idempotency
3. `POST /api/progress/action` — серверные actions (stars, boosters, premium)
4. `GET/PUT/DELETE /api/sessions` — game sessions (с stateSize check)
5. `GET /api/liveops/calendar` — публичный endpoint с ETag
6. In-memory кеш для calendar
7. Zod валидация на всех endpoints

#### Этап B2: Клиентский sync (~2 дня)
1. `useServerSync.ts` hook — периодический sync с syncId + version fields
2. Merge logic (server = authority для критичных полей)
3. `sendBeacon` при закрытии
4. JWT в памяти, re-auth при каждом старте через PlatformAdapter.auth
5. Migration: существующий localStorage → server при первом sync
6. Offline fallback (если сервер недоступен → localStorage only)

#### Этап B3: Админка MVP (~1-2 дня, Refine)
1. `npx create-refine-app admin` — scaffold с Ant Design
2. Auth provider → `POST /api/auth/admin/login` (отдельный JWT secret, 4h TTL)
3. Data provider → `/api/admin/*` REST endpoints
4. Access control provider → RBAC (admin/editor/viewer)
5. Resources: calendars (List + Edit), players (List + Show), config (List + Edit) — Refine CRUD
6. Кастомные страницы: CalendarPreview (preview на дату), VersionMismatchBadge
7. admin_audit_log — логирование через middleware (серверная часть уже в B0)
8. Proxy на Express dev server + деплой

#### Этап B4: Leaderboard + Quests (~2 дня)
1. Leaderboard API (seasons, entries, составной индекс)
2. Daily quests sync
3. Daily rewards sync

#### Этап B5: Anti-cheat + Monitoring (~2 дня)
1. Серверная валидация прогресса (delta-based)
2. progress_events audit log
3. Подпись прогресса (HMAC, syncSecret при auth)
4. Автоматическое флагирование подозрительных игроков
5. Базовые метрики (request count, error rate)
6. Flagged players в админке

---

### Файлы для изменения

| Файл | Действие |
|------|----------|
| `shared/schema.ts` | Полностью переписать — все таблицы (+ audit logs) |
| `shared/validators.ts` | **Новый** — Zod schemas для всех API contracts |
| `server/routes.ts` | Все API endpoints с Zod валидацией |
| `server/storage.ts` | DatabaseStorage вместо MemStorage |
| `server/auth.ts` | **Новый** — Telegram (+ auth_date + replay) + JWT (in-memory, 2h) + admin auth (отдельный secret) |
| `server/middleware.ts` | **Новый** — requireAuth, requireAdmin (раздельные secrets), RBAC, auditLog |
| `server/index.ts` | Подключить middleware, rate limiting |
| `client/src/hooks/useServerSync.ts` | **Новый** — sync hook (syncId, version fields, JWT in memory) |
| `client/src/main.tsx` | Re-auth при каждом старте через PlatformAdapter.auth |
| `admin/` | **Новая директория** — Refine app (CRUD из коробки, кастом для calendar preview) |
| `package.json` | express-rate-limit, jsonwebtoken, zod, compression |
| `admin/package.json` | @refinedev/core, @refinedev/antd, @refinedev/simple-rest |
| `drizzle.config.ts` | Без изменений (уже настроен) |
