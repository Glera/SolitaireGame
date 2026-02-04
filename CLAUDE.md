# CLAUDE.md — Инструкции для Claude Code

## Проект

**Solitaire Game** — мобильная игра "Косынка" для Telegram Mini Apps и Web.

### Стек
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand
- **Backend**: Express + Drizzle ORM + PostgreSQL (Neon)
- **UI Kit**: Radix UI

### Платформы (тестировать на всех!)
1. Web — desktop браузер
2. Web — mobile браузер  
3. Telegram WebView iOS
4. Telegram WebView Android
5. Telegram Desktop WebView

---

## Команды

```bash
# Запуск dev-сервера
npm run dev

# Сборка
npm run build

# Type check
npm run check

# Миграции БД
npm run db:push
```

---

## Структура проекта

```
client/src/
├── components/solitaire/  # Игровые компоненты
├── hooks/                 # React хуки (бизнес-логика)
├── lib/
│   ├── stores/           # Zustand stores
│   ├── solitaire/        # Игровая логика
│   ├── liveops/          # LiveOps события
│   └── constants/        # Централизованные константы
├── version.ts            # Версия (ОБЯЗАТЕЛЬНО обновлять!)
docs/                     # Документация (ЧИТАТЬ при сомнениях)
```

### Ключевые файлы
- `lib/stores/useSolitaire.tsx` — главный store игры (~3000 строк)
- `components/solitaire/GameBoard.tsx` — главный компонент (~2500 строк)
- `hooks/useWinFlow.ts` — победный флоу
- `hooks/useTouchDrag.ts` — touch-взаимодействия

---

## Документация (прогрессивное раскрытие)

**При работе с задачей — СНАЧАЛА читай релевантные docs:**

| Файл | Когда читать |
|------|-------------|
| `docs/ARCHITECTURE.md` | Структура, компоненты, state management |
| `docs/STANDARDS.md` | Стиль кода, именование, паттерны |
| `docs/PROBLEMS.md` | Перед фиксом багов — похожие проблемы уже решались! |
| `docs/DECISIONS.md` | Почему приняты те или иные решения |
| `docs/REFACTORING.md` | История рефакторинга |
| `docs/FEATURES.md` | Описание фич |

---

## Критические правила

### 1. Версия
**ВСЕГДА** обновляй `client/src/version.ts` при любом изменении:
```typescript
export const GAME_VERSION = '4.99.53';  // Инкрементируй PATCH
```

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

---

## Чего НЕ делать

1. **НЕ** пушить в git без явной просьбы пользователя
2. **НЕ** менять z-index без проверки конфликтов (см. STANDARDS.md)
3. **НЕ** использовать inline styles вместо Tailwind
4. **НЕ** добавлять новые npm пакеты без необходимости
5. **НЕ** игнорировать TypeScript ошибки
6. **НЕ** забывать про мобильное тестирование

---

## Верификация перед коммитом

1. ✅ `npm run check` — нет TypeScript ошибок
2. ✅ Версия обновлена в `version.ts`
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

### Анимация карты
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

---

## При возникновении проблем

1. **Карты дублируются** → проверь pointer-events-none
2. **Touch не работает** → проверь useTouchDrag, threshold 15px
3. **State не обновляется** → проверь stale closure, localStorage sync
4. **Popup не показывается** → проверь usePopupQueue
5. **Анимация застряла** → проверь animatingCard cleanup

**Всегда проверяй `docs/PROBLEMS.md`** — возможно, проблема уже решалась!
