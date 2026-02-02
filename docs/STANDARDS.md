# Стандарты разработки

## Версионирование

### Формат версии
`MAJOR.MINOR.PATCH` — например `4.59.26`

### Правила обновления
- **PATCH**: баг-фиксы, мелкие изменения
- **MINOR**: новые фичи, значительные изменения
- **MAJOR**: breaking changes, крупные релизы

### Файл версии
```typescript
// client/src/version.ts
export const GAME_VERSION = '4.59.26';
```

**Обязательно**: обновлять при каждом изменении кода.

---

## Структура кода

### Компоненты React

```typescript
// Импорты
import React, { useState, useEffect, useCallback } from 'react';
import { SomeComponent } from './SomeComponent';

// Типы
interface MyComponentProps {
  prop1: string;
  prop2?: number;
  onAction: () => void;
}

// Компонент
export function MyComponent({ prop1, prop2 = 0, onAction }: MyComponentProps) {
  // State
  const [state, setState] = useState(false);
  
  // Refs
  const ref = useRef<HTMLDivElement>(null);
  
  // Callbacks (memoized)
  const handleClick = useCallback(() => {
    onAction();
  }, [onAction]);
  
  // Effects
  useEffect(() => {
    // ...
  }, []);
  
  // Render
  return (
    <div ref={ref} onClick={handleClick}>
      {/* ... */}
    </div>
  );
}
```

### LiveOps модули

```
liveops/eventName/
├── types.ts      # Типы и интерфейсы
├── logic.ts      # Бизнес-логика, конфиги, хелперы
├── storage.ts    # localStorage операции
├── store.ts      # Zustand store (если нужен)
└── index.ts      # Public API (re-exports)
```

---

## Стилизация

### Tailwind CSS
- Предпочитать Tailwind классы над inline styles
- Группировать классы логически: layout → spacing → colors → effects

```tsx
// Хорошо
<div className="flex items-center gap-2 p-4 bg-black/50 rounded-xl shadow-lg">

// Плохо
<div style={{ display: 'flex', padding: '16px', background: 'rgba(0,0,0,0.5)' }}>
```

### Z-index система
```
z-0      — фон
z-10     — карты
z-20     — drag preview
z-50     — модальные окна (базовые)
z-[9999] — попапы
z-[10000]+ — критические оверлеи
```

**Важно**: проверять конфликты при добавлении новых z-index.

### Анимации
```css
/* Предпочтительно */
transition-all duration-200 ease-out

/* Для production */
transition-transform duration-150

/* Избегать */
animation: custom-animation 0.3s infinite; /* если не нужно */
```

---

## Именование

### Файлы
- Компоненты: `PascalCase.tsx` — `GameBoard.tsx`
- Утилиты: `camelCase.ts` — `cardUtils.ts`
- Типы: `camelCase.ts` или `types.ts`

### Переменные
```typescript
// Константы
const MAX_CARDS = 52;
const ANIMATION_DURATION = 200;

// Функции
function calculateScore() { }
const handleClick = () => { };

// Boolean
const isVisible = true;
const hasError = false;
const canMove = true;

// Handlers
const handleCardClick = () => { };
const onAnimationEnd = () => { };
```

### CSS классы (Tailwind)
```tsx
// Условные классы
className={cn(
  "base-class",
  isActive && "active-class",
  variant === 'primary' && "primary-class"
)}
```

---

## Комментарии

### Когда комментировать
- Сложная бизнес-логика
- Неочевидные решения (с ссылкой на PROBLEMS.md)
- TODO/FIXME с контекстом

### Формат
```typescript
// Однострочный комментарий для простых пояснений

/**
 * Многострочный комментарий для функций/компонентов
 * @param cards - массив карт для обработки
 * @returns отсортированные карты
 */

// TODO: добавить анимацию [описание зачем]
// FIXME: временное решение для [проблема], см. PROBLEMS.md
```

### Язык
- **Русский**: UI текст, бизнес-логика, пользовательские сообщения
- **Английский**: технические комментарии, названия переменных

---

## State Management

### Zustand
```typescript
// Создание store
export const useMyStore = create<MyStore>((set, get) => ({
  // State
  value: 0,
  
  // Actions
  increment: () => set(state => ({ value: state.value + 1 })),
  
  // Computed (через get())
  getDouble: () => get().value * 2,
}));
```

### localStorage
```typescript
// Чтение
const data = localStorage.getItem('key');
const parsed = data ? JSON.parse(data) : defaultValue;

// Запись
localStorage.setItem('key', JSON.stringify(value));

// Ключи
const STORAGE_KEYS = {
  PLAYER_PROGRESS: 'solitaire_player_progress',
  EVENT_STATE: 'solitaire_event_state',
};
```

---

## Обработка ошибок

### Try-catch
```typescript
try {
  const data = JSON.parse(rawData);
} catch (error) {
  console.error('Failed to parse data:', error);
  return defaultValue;
}
```

### Defensive coding
```typescript
// Проверка существования
const topCard = cards?.[cards.length - 1];
if (!topCard) return;

// Optional chaining
const value = obj?.nested?.property ?? defaultValue;
```

---

## Тестирование

### Ручное тестирование
1. Web — desktop браузер (standalone сайт)
2. Web — mobile браузер (standalone сайт)
3. Telegram WebView (iOS)
4. Telegram WebView (Android)
5. Telegram Desktop

### Debug инструменты
- `console.log` с эмодзи-префиксами для фильтрации
- Встроенный debug logger (📋 в настройках)
- React DevTools

```typescript
console.log('📱 Touch event:', eventType);
console.log('🎴 Card action:', cardId);
console.log('⚠️ Warning:', message);
console.log('❌ Error:', error);
```

---

## Git

### Commit messages
```
Краткое описание (до 50 символов)

- Детали изменения 1
- Детали изменения 2

Fixes #123 (если есть issue)
```

### Примеры
```
Fix card duplication on fast click

- Add pointer-events-none to animating cards
- Remove redundant click blocking logic

Add foundation-to-tableau hint check

- Check if returning card enables new moves
- Include in "no moves" detection
```

---

## Performance

### React оптимизации
```typescript
// Мемоизация callbacks
const handleClick = useCallback(() => { }, [dependencies]);

// Мемоизация вычислений
const computed = useMemo(() => expensiveCalc(data), [data]);

// Избегать inline объектов в props
// Плохо
<Component style={{ color: 'red' }} />
// Хорошо
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />
```

### Анимации
- Использовать `transform` и `opacity` (GPU-accelerated)
- Избегать анимации `width`, `height`, `top`, `left`
- `will-change` только когда необходимо
