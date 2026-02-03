# Лог проблем и решений

## Формат записи

```
## [ДАТА] Краткое описание проблемы

**Симптомы**: Как проявлялась проблема
**Причина**: Почему возникла
**Решение**: Как исправили
**Файлы**: Какие файлы затронуты
**Версия**: В какой версии исправлено
```

---

## [2025-01] Дублирование карт при быстром клике

**Симптомы**: 
При клике на карту под анимируемой картой (до завершения анимации) создавался дубликат карты.

**Причина**: 
Анимируемые карты имели `opacity: 0`, но `pointer-events: auto`. Клик "проходил" через невидимую карту и обрабатывался дважды.

**Решение**: 
Добавить `pointer-events-none` к картам с `isDragging` или `isAnimating` в Card.tsx.

```tsx
className={cn(
  isDragging && "opacity-0 pointer-events-none",
  isAnimating && "opacity-0 pointer-events-none"
)}
```

**Файлы**: `client/src/components/solitaire/Card.tsx`
**Версия**: 4.59.21

---

## [2025-01] Tap не работает на мобильных устройствах

**Симптомы**: 
Карты на мобилке можно было перетаскивать, но tap (клик) не работал.

**Причина**: 
1. Изначально: блокировка `animatingCard` была слишком строгой
2. Порог tap/drag был 5px — слишком чувствительно для мобильных

**Решение**: 
1. Увеличить порог tap/drag с 5px до 15px в useTouchDrag.ts
2. Убрать избыточные блокировки, положиться на pointer-events-none

**Файлы**: 
- `client/src/hooks/useTouchDrag.ts`
- `client/src/components/solitaire/TableauColumn.tsx`

**Версия**: 4.59.22

---

## [2025-01] Возврат карты из foundation не работает на мобильных

**Симптомы**: 
На десктопе клик по карте в foundation возвращал её на tableau. На мобильных — нет реакции.

**Причина**: 
В FoundationPile не передавался `onTap` callback в useTouchDrag hook.

**Решение**: 
Добавить `handleTap` callback который вызывает `moveFoundationToTableau`.

**Файлы**: `client/src/components/solitaire/FoundationPile.tsx`
**Версия**: 4.59.24

---

## [2025-01] Откат состояния подземелья при заработке лопатки

**Симптомы**: 
При получении лопатки состояние ивента Dungeon Dig откатывалось — исчезали открытые тайлы, лопаток становилось больше ожидаемого.

**Причина**: 
Рассинхронизация между React state и localStorage. При сохранении использовался устаревший state.

**Решение**: 
Сделать localStorage единственным источником истины. Все функции читают актуальное состояние из localStorage перед модификацией.

**Файлы**: `client/src/lib/liveops/dungeonDig/index.ts`
**Версия**: 4.58.x

---

## [2025-01] Ключи распределялись после окончания ивента

**Симптомы**: 
После завершения Treasure Hunt и траты всех ключей, на следующий уровень всё равно раздавались ключи.

**Причина**: 
Проверка `eventExpired` не учитывала полное завершение ивента (expired + keys spent).

**Решение**: 
Добавить проверку `!event.active && eventExpired` перед распределением ресурсов.

**Файлы**: `client/src/components/solitaire/GameBoard.tsx`
**Версия**: 4.56.x

---

## [2025-01] Popup обрезается на десктопном Telegram

**Симптомы**: 
Окно "Новая функция" обрезалось снизу, кнопка не была видна.

**Причина**: 
Popup не имел ограничения высоты и не был скроллируемым.

**Решение**: 
Добавить `max-h-[85vh] overflow-y-auto` и уменьшить размеры элементов.

**Файлы**: `client/src/components/solitaire/GameBoard.tsx`
**Версия**: 4.59.26

---

## [2025-01] Неправильное определение "нет ходов"

**Симптомы**: 
Игра показывала "нет ходов", хотя можно было вернуть карту из foundation и продолжить.

**Причина**: 
`getHint()` не рассматривал foundation-to-tableau как допустимый ход.

**Решение**: 
Добавить проверку: можно ли вернуть карту из foundation и есть ли карта для размещения на неё.

**Файлы**: `client/src/lib/stores/useSolitaire.tsx`
**Версия**: 4.59.25

---

## [2025-01] Пропадание карт в auto-collect

**Симптомы**: 
Иногда при авто-сборе карты пропадали.

**Причина**: 
Race condition: карта добавлялась в foundation до завершения анимации, но могла быть обработана повторно.

**Решение**: 
Добавить `batchAutoCollectingCards` Set для отслеживания карт в процессе. Проверять существование карты в source перед обработкой.

**Файлы**: `client/src/lib/stores/useSolitaire.tsx`
**Версия**: 4.59.23

---

## [2025-01] Z-index конфликт: кнопка коллекций не видна

**Симптомы**: 
Кнопка коллекций не отображалась когда открыт popup Dungeon Dig.

**Причина**: 
Кнопка имела `z-[60]`, popup — `z-[9999]`.

**Решение**: 
Увеличить z-index кнопки до `z-[10001]`.

**Файлы**: `client/src/components/solitaire/GameBoard.tsx`

---

## [2025-01] Daily Quests не обновляются после первой победы

**Симптомы**: 
После первой победы счётчики daily quests обновлялись, но при второй и последующих победах оставались на месте.

**Причина**: 
**Stale Closure** в функции `updateDailyQuestsOnWin` в `useWinFlow.ts`.

Функция использовала `callbacks.dailyQuests` напрямую:
```typescript
const updateDailyQuestsOnWin = useCallback(() => {
  const { dailyQuests, setDailyQuests, ... } = callbacks;
  // dailyQuests здесь — "замороженное" значение на момент создания callback
  const updatedQuests = dailyQuests.map(quest => { ... });
  setDailyQuests(updatedQuests);
}, [callbacks]);
```

Проблема: `callbacks` — объект, передаваемый из GameBoard. Хотя объект пересоздаётся при каждом рендере, внутренние значения (например, `dailyQuests`) захватываются в closure и могут быть устаревшими к моменту вызова callback.

**Решение**: 
Использовать **functional update** вместо прямого чтения значения:
```typescript
const updateDailyQuestsOnWin = useCallback(() => {
  const { setDailyQuests, setAcesCollected, addStars } = callbacks;
  
  // Functional update гарантирует актуальное значение
  setDailyQuests(prevQuests => {
    const updatedQuests = prevQuests.map(quest => {
      // ... логика обновления
    });
    return updatedQuests;
  });
}, [callbacks]);
```

**Файлы**: `client/src/hooks/useWinFlow.ts`
**Версия**: 4.99.27

**Похожие риски в коде**:
- `proceedToDailyQuests`: читает `callbacks.dailyQuests` для проверки `allCompleted` — менее критично, т.к. только читает
- `proceedToCollectionsOrNewGame`: читает `callbacks.collections` — аналогично, только читает

**Правило**: При обновлении state из useCallback, всегда использовать functional update (`setState(prev => ...)`) вместо прямого чтения из props/callbacks.

---

## Шаблон для новых проблем

```
## [ДАТА] Краткое описание

**Симптомы**: 

**Причина**: 

**Решение**: 

**Файлы**: 
**Версия**: 
```
