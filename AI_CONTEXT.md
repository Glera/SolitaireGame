# AI Assistant Context

Этот файл содержит контекст и правила для AI-ассистентов при работе с проектом.

## О проекте

**Solitaire Game** — мобильная игра "Косынка" (Klondike Solitaire) для Telegram Mini Apps с системой LiveOps событий, коллекций и турниров.

## Технологический стек

### Frontend
- **React 18** + **TypeScript**
- **Vite** — сборка
- **Tailwind CSS** — стилизация
- **Zustand** — state management
- **React Portals** — модальные окна и оверлеи

### Backend
- **Express.js** + **TypeScript**
- **Drizzle ORM** + **PostgreSQL** (Neon)

### Платформы
- **Telegram Mini Apps** — основная мобильная платформа
- **Telegram WebView** — особенности мобильного отображения
- **Web** — standalone веб-версия на сайте (играть прямо из браузера)

## Ключевые архитектурные решения

1. **localStorage как источник истины** для LiveOps событий (не React state)
2. **Модульная система LiveOps** — каждый ивент в отдельной папке
3. **pointer-events-none** для анимируемых карт (предотвращает дублирование)
4. **useTouchDrag** — единый хук для touch-взаимодействий

## Важные файлы

- `client/src/components/solitaire/GameBoard.tsx` — главный компонент игры
- `client/src/lib/stores/useSolitaire.tsx` — Zustand store игровой логики
- `client/src/lib/liveops/` — LiveOps события (treasureHunt, dungeonDig, pointsEvent)
- `client/src/hooks/useTouchDrag.ts` — touch-взаимодействия

## Правила разработки

### Обязательно
- Обновлять версию в `client/src/version.ts` при изменениях
- Проверять linter errors после изменений
- Тестировать на мобильных устройствах (Telegram WebView)
- Использовать console.log для отладки (есть встроенный debug logger)

### Избегать
- Прямое изменение state во время анимаций
- Создание новых файлов без необходимости
- Хардкод z-index без проверки конфликтов
- Блокирующие setTimeout без возможности отмены

### Стиль кода
- Русский язык в UI и комментариях к бизнес-логике
- Английский в технических комментариях и именах переменных
- Компактный JSX с Tailwind классами
- useCallback/useMemo для оптимизации рендеров

## Известные особенности

1. **Telegram WebView** не имеет доступа к console — используй встроенный debug logger
2. **Touch события** на мобилках требуют threshold 15px для различения tap/drag
3. **z-index конфликты** — проверяй перекрытие элементов (особенно popups)
4. **Auto-collect** работает только когда все карты tableau открыты

## Ссылки на документацию

- [Архитектура](docs/ARCHITECTURE.md)
- [Журнал решений](docs/DECISIONS.md)
- [Проблемы и решения](docs/PROBLEMS.md)
- [Описание фич](docs/FEATURES.md)
- [Стандарты разработки](docs/STANDARDS.md)
