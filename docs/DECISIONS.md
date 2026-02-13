# Журнал архитектурных решений (ADR)

## Формат записи

```
## [ДАТА] Название решения

**Контекст**: Почему возникла необходимость
**Решение**: Что было решено
**Альтернативы**: Какие варианты рассматривались
**Последствия**: К чему привело решение
```

---

## [2025-01] localStorage как источник истины для LiveOps

**Контекст**: 
При использовании Zustand store для LiveOps событий возникали проблемы синхронизации — state мог откатываться при ре-рендерах компонентов.

**Решение**: 
Сделать localStorage единственным источником истины. Все функции (getDungeonDigEvent, saveDungeonDigEvent и т.д.) читают/пишут напрямую в localStorage, а не в React state.

**Альтернативы**:
- Zustand persist middleware — сложнее отлаживать
- React Context — проблемы с производительностью

**Последствия**:
- ✅ Стабильное состояние между сессиями
- ✅ Простая отладка (можно смотреть localStorage)
- ⚠️ Нужно вручную триггерить ре-рендер

---

## [2025-01] pointer-events-none для анимируемых карт

**Контекст**:
Баг дублирования карт: при быстром клике на карту под анимируемой картой создавался дубликат.

**Решение**:
Добавить `pointer-events-none` к картам с `isAnimating` или `isDragging`.

**Альтернативы**:
- Блокировка кликов через ref с таймером — ненадёжно
- Глобальная блокировка во время анимации — ломает UX

**Последствия**:
- ✅ Полностью решает проблему дублирования
- ✅ Не влияет на производительность
- ✅ Работает и на desktop, и на mobile

---

## [2025-01] Модульная структура LiveOps событий

**Контекст**:
Первый ивент (Treasure Hunt) был реализован в нескольких файлах без чёткой структуры. При добавлении второго ивента (Dungeon Dig) стало сложно поддерживать код.

**Решение**:
Стандартная структура для каждого ивента:
```
liveops/eventName/
├── types.ts      # Типы данных
├── logic.ts      # Бизнес-логика и конфиги
├── storage.ts    # localStorage операции
├── store.ts      # Zustand store (опционально)
└── index.ts      # Public API
```

**Последствия**:
- ✅ Легко добавлять новые ивенты
- ✅ Чёткое разделение ответственности
- ✅ Переиспользование паттернов

---

## [2025-01] useTouchDrag с onTap callback

**Контекст**:
На мобильных устройствах tap и drag обрабатывались по-разному в разных компонентах. Некоторые компоненты (FoundationPile) не реагировали на tap.

**Решение**:
Добавить опциональный `onTap` callback в `useTouchDrag` hook. Если touch завершился без движения (< 15px), вызывается onTap.

**Альтернативы**:
- Отдельные обработчики onClick и onTouch — дублирование кода
- Синтетические click события — ненадёжно в WebView

**Последствия**:
- ✅ Единообразное поведение на всех платформах
- ✅ Чёткое разделение tap vs drag

---

## [2025-01] Проверка foundation-to-tableau в "нет ходов"

**Контекст**:
Игра показывала "нет ходов", хотя игрок мог вернуть карту из foundation на tableau и продолжить игру.

**Решение**:
Добавить в `getHint()` проверку: можно ли вернуть карту из foundation и получит ли это пользу (есть карта для размещения на неё).

**Последствия**:
- ✅ Более точное определение "нет ходов"
- ✅ Подсказка предлагает этот ход

---

## [2025-01] Debug logger для Telegram WebView

**Контекст**:
В Telegram WebView на мобильных устройствах нет доступа к console. Невозможно отлаживать баги.

**Решение**:
Создать `debugLogger.ts` который:
- Перехватывает console.log/warn/error
- Сохраняет в массив
- Показывает в popup через меню настроек

**Последствия**:
- ✅ Возможность отладки на мобильных
- ✅ Копирование логов для анализа

---

## [2025-01] Декомпозиция GameBoard.tsx

**Контекст**: 
GameBoard.tsx вырос до 4977 строк, 156 hooks, 27 handlers. "God component" сложно поддерживать.

**Решение (итеративное)**:

**Фаза 1 (завершена)**:
1. `LockedFeaturePopup.tsx` — универсальный компонент для 4 locked popups
2. `useGameProgress.ts` — хук для управления звёздами и unlocks (интегрирован)
3. `useDailyQuests.ts` — хук для daily quests логики (интегрирован)

**Фаза 1.5 (завершена)**:
4. `UnlockPopup.tsx` — универсальный компонент для 3 unlock popups (collections, leaderboard, promo)
   - Конфигурации в UNLOCK_CONFIGS
   - Touch-friendly закрытие

**Фаза 2 (завершена)**:
5. `TopEventBar.tsx` — компонент верхней панели ивентов (Points Event, Treasure Hunt, Dungeon Dig, Promo)
   - 447 строк, заменяет ~340 строк inline JSX
   - Экспортирует `FlyingRewardToMiniature` тип
6. `BottomButtonRow.tsx` — компонент нижних кнопок (Undo, Hint, Quests, Shop, Collections, Leaderboard)
   - 303 строки, заменяет ~257 строк inline JSX
   - Включает CollectionPackIcon и secondary collections button

**Результат**:
- GameBoard.tsx: 4977 → 4087 строк (-890)
- 7 переиспользуемых модулей

**Фаза 3 (завершена)**:
7. `useLiveOpsEvents.ts` — хук для таймеров и базового состояния событий (350 строк)
   - State для TreasureHunt и DungeonDig
   - Таймеры с автообновлением
   - Auto-deactivation при истечении и потраченных ресурсах
   - Callbacks для side effects (onTreasureHuntExpired, onDungeonDigExpired)
   - Actions: addKey, addShovel, activate, deactivate, reset
   - Удалено ~97 строк из GameBoard

**Результат**:
- GameBoard.tsx: 4977 → **3991** строк (**-986**)
- 8 переиспользуемых модулей

**Следующие шаги**:
- `useWinFlow.ts` — хук для цепочки после победы
- Дальнейшая декомпозиция по необходимости

---

## [2025-02] Извлечение кода в отдельные npm-пакеты

**Контекст**:
Проект (~15K+ строк) жил в одном репозитории. Это мешало: параллельной работе нескольких LLM-агентов, переиспользованию игровой логики для мобильного приложения, независимому развитию коров и ивентов.

**Решение**:
Извлечь 5 пакетов в отдельные git-репозитории + local npm workspace:
- `@game/liveops-shared` — общие типы, pointsEvent, timeUtils (zero deps)
- `@game/solitaire-core` — движок косынки (zero deps)
- `@game/treasure-hunt` — LiveOps ивент (peers: liveops-shared, zustand)
- `@game/dungeon-dig` — LiveOps ивент (peers: liveops-shared, zustand)
- `@game/mahjong-core` — движок маджонга (zero deps, создан с нуля)

**Альтернативы**:
- Monorepo (Turborepo/Lerna) — избыточно для 6 пакетов, сложная конфигурация
- npm publish — не нужен registry для внутренних пакетов
- Подмодули git — плохой DX, сложное обновление

**Последствия**:
- ✅ Каждый пакет автономен и понятен одному LLM-агенту (~500-1800 строк)
- ✅ npm workspace symlinks = мгновенный HMR при локальной разработке
- ✅ git-based deps (github:you/repo#tag) для production
- ✅ peerDependencies предотвращают дублирование zustand/react
- ⚠️ При изменении пакета нужен `npm run build` (или workspace автоматически)

---

## [2025-02] Shell Barrel Pattern для LiveOps

**Контекст**:
LiveOps ивенты (Treasure Hunt, Dungeon Dig) используются двумя играми (солитер, маджонг), но с разными storage keys и DOM-зависимостями. Пакеты `@game/treasure-hunt` и `@game/dungeon-dig` содержат только чистую логику.

**Решение**:
Каждая игра имеет свой "barrel" файл в shell:
```
lib/liveops/treasureHunt/        # солитер: re-export + keyManager (DOM)
lib/liveops/mahjongTreasureHunt/ # маджонг: re-export + mahjong localStorage
```
Barrel re-экспортирует чистую логику из пакета + добавляет game-specific localStorage API с уникальным storage key (`solitaire_*` vs `mahjong_*`).

**Альтернативы**:
- Передавать storage key как параметр в пакет — загромождает API
- Единый storage с namespace — риск конфликтов при параллельной игре

**Последствия**:
- ✅ Пакеты остаются чистыми (без DOM, без game-specific логики)
- ✅ Каждая игра имеет изолированный localStorage
- ✅ Солитер-баррели дополнительно содержат keyManager/shovelManager (DOM-зависимые)
- ✅ Маджонг-баррели — чистые функции

---

## [2025-02] Мультиигровая архитектура (build-time switching)

**Контекст**:
Платформа поддерживает несколько игр (солитер, маджонг). Нужен способ собирать разные версии из одного codebase.

**Решение**:
Переменная окружения `GAME` при сборке:
```bash
GAME=solitaire npx vite build  # → dist/solitaire/
GAME=mahjong npx vite build    # → dist/mahjong/
```
Vite define: `__GAME__` → conditional rendering в App.tsx. Каждый game core — отдельный пакет.

**Альтернативы**:
- Runtime switching (один бандл, переключение в UI) — больше размер бандла
- Отдельные проекты — дублирование бизнес-логики (коллекции, daily, shop)

**Последствия**:
- ✅ Минимальный размер бандла (только нужный core)
- ✅ Общая бизнес-логика (коллекции, daily quests, shop) переиспользуется
- ✅ Общие LiveOps попапы (TreasureHuntPopup, DungeonDigPopup)
- ⚠️ Нужны отдельные dev-серверы (порт 3002 для солитера, 3005 для маджонга)

---

## [2025-02] Core/Platform boundary для маджонга

**Контекст**:
При создании mahjong-core нужно было определить границу между core (чистая логика) и platform (UI, scoring).

**Решение**:
Core содержит: тайлы, лейауты, свободу тайлов, генератор, selectTile → SelectResult с `matched?` field.
Platform решает: scoring (сколько очков за пару), penalties, UI анимации, LiveOps интеграцию.
selectTile **не** содержит score — возвращает `{ matched, removedTiles, ... }`, shell начисляет очки.

**Альтернативы**:
- Score в core — связывает core с конкретной системой прогрессии
- Весь UI в core — нарушает портируемость на другие платформы

**Последствия**:
- ✅ Core остаётся zero deps, ~500 строк, 35 smoke tests
- ✅ Разные платформы могут иметь разный scoring
- ✅ Duck typing (структурная совместимость с GameCore интерфейсом)

---

## [2025-02] DungeonDigPopup не размонтируется

**Контекст**:
DungeonDigPopup (и TreasureHuntPopup) остаются в JSX-дереве всегда (возвращают `null` когда невидимы). При повторном открытии internal state (exitFoundLock, animation states) сохранялся от предыдущего ивента, что приводило к багу — тайлы не кликались.

**Решение**:
Добавить `useEffect` на `isVisible`, который сбрасывает **все** internal state при каждом открытии:
```typescript
useEffect(() => {
  if (isVisible) {
    setExitFoundLock(false);
    setShowExitFound(false);
    // ... сброс всех state
  }
}, [isVisible]);
```

**Альтернативы**:
- Размонтировать компонент при закрытии — потеря CSS-анимаций, сложнее exit transitions
- Использовать key для пересоздания — дороже, теряет DOM

**Последствия**:
- ✅ Надёжный сброс состояния при каждом открытии
- ✅ Exit анимации работают
- ⚠️ Нужно помнить добавлять новые state в сброс

---

## Шаблон для новых решений

```
## [ДАТА] Название

**Контекст**:

**Решение**:

**Альтернативы**:

**Последствия**:
```
