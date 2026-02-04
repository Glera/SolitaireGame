# Client CLAUDE.md — Frontend специфика

## Структура компонентов

```
components/solitaire/
├── GameBoard.tsx      # Главный — оркестрация всего
├── Card.tsx           # Отдельная карта
├── TableauColumn.tsx  # Колонка tableau (touch + click)
├── FoundationPile.tsx # Стопка сбора мастей
├── StockPile.tsx      # Колода
├── WastePile.tsx      # Открытые из колоды
├── CardAnimation.tsx  # Анимация перемещения
├── FlyingCard.tsx     # Параллельные анимации (auto-collect)
├── DragPreview.tsx    # Превью при drag
└── NoMovesPopup.tsx   # Окно "нет ходов" + джокер
```

## Hooks — бизнес-логика

| Hook | Ответственность |
|------|----------------|
| `useTouchDrag.ts` | Touch/drag взаимодействия |
| `useWinFlow.ts` | Победный флоу, daily quests update |
| `useBoosters.ts` | Hint/Undo бустеры |
| `useWinStreak.ts` | Множитель побед |
| `useGameScale.ts` | Масштабирование под разные экраны |
| `useDailyQuests.ts` | Ежедневные задания |
| `useCollections.ts` | Коллекции предметов |

## Stores (Zustand)

### useSolitaire — главный store
```typescript
// Ключевые поля
tableau: Card[][]        // 7 колонок
foundations: {...}       // 4 стопки по мастям
stock: Card[]           // Колода
waste: Card[]           // Открытые из колоды
animatingCard: {...}    // Текущая анимация
isDragging: boolean     // Идёт перетаскивание
hint: {...}             // Подсказка
hasNoMoves: boolean     // Показать "нет ходов"
isAutoCollecting: bool  // Авто-сбор активен
```

### usePopupQueue — управление окнами
```typescript
// Win Flow — очередь FIFO
addToWinFlowQueue('levelUp')
addToWinFlowQueue('dailyQuests')
proceedToNextPopup()

// On-Demand — немедленно
addOnDemandPopup('shop')
closeOnDemandPopup('shop')
```

## Анимации — константы

Централизованы в `lib/constants/animations.ts`:
```typescript
CARD_FLIGHT_DURATION = 200  // мс — скорость полёта
CARD_STAGGER_DELAY = 130    // мс — задержка между картами
STOCK_ANIMATION_SPEED = 1500 // px/s — из колоды
```

**Изменение скорости всех анимаций — только здесь!**

## Touch взаимодействия

### useTouchDrag.ts
```typescript
// Threshold для tap vs drag
const TAP_THRESHOLD = 15; // pixels

// Если movement < 15px → это tap
// Если movement >= 15px → это drag
```

### Флаг __isTapNotDrag
При tap устанавливается `window.__isTapNotDrag = true` чтобы
`useSolitaire.endDrag()` не создавал return animation.

## Масштабирование (useGameScale)

Три режима:
1. **Mobile** — по ширине, cards плотно
2. **Desktop Web** — по высоте, reservedHeight для UI
3. **Telegram Desktop** — isWideDesktop, увеличенный reservedHeight

```typescript
// Определение платформы
const isWideDesktop = aspectRatio > 1.2 && viewportHeight > 700;
```

## Подсказки (getHint)

Priority 1-6 в `useSolitaire.tsx`:
1. Waste → Foundation (туз/следующая карта)
2. Tableau → Foundation (туз/следующая)
3. Waste → Tableau
4. Foundation → Tableau (если открывает возможности)
5. Tableau → Tableau (открывает face-down)
6. Tableau → Tableau (lookahead на 1 ход)

**Важно**: Не предлагать бессмысленные ходы (король туда-сюда).

## Race Conditions — известные

### Daily Quests
`useWinFlow.ts` обновляет localStorage **синхронно** перед React state,
чтобы `DailyQuests.tsx` читал актуальные данные при открытии.

### Card Animation
`TableauColumn.tsx` учитывает `animatingCardsCount` при расчёте
`movableStartIndex`, чтобы карта под анимируемой была кликабельна.

## Debug

### Console префиксы
```typescript
console.log('📱 Touch:', ...)   // Touch события
console.log('🎴 Card:', ...)    // Действия с картами
console.log('🏆 Win:', ...)     // Победный флоу
console.log('⚠️ Warn:', ...)    // Предупреждения
```

### Debug панель
В настройках (⚙️) → Debug Menu:
- Test Win — симуляция победы
- Test Loss — симуляция "нет ходов"
- Add Boosters — начислить hint/undo
- Reset Progress — сброс всего
