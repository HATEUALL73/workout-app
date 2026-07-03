# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Project overview

- `workout-app` — мобильное приложение тренировок.
- Пользователь вводит подходы, сохраняет черновики и завершённые упражнения.
- Таймер, история, прогресс и данные упражнений хранятся локально.

# Tech stack

- Expo SDK 56
- React Native 0.85.3
- React 19.2.3
- TypeScript 6 в строгом режиме
- Expo Router
- Expo SQLite
- Expo Audio
- Expo Haptics
- React Native SVG
- EAS Build
- npm и `package-lock.json`

# Commands

- Install dependencies: `npm.cmd ci`
- Start development server: `npm.cmd start`
- Android: `npm.cmd run android`
- iOS: `npm.cmd run ios`
- TypeScript check: `npx.cmd tsc --noEmit`
- Expo dependency check: `npx.cmd expo install --check`

На Windows используйте `npm.cmd`, потому что обычный `npm` может блокироваться PowerShell Execution Policy.

# Project structure

- `app/` — файловые маршруты и экраны Expo Router.
- `app/_layout.tsx` — корневой layout, глобальная навигация, тема и инициализация базы данных.
- `app/(tabs)/_layout.tsx` — нижняя навигация по основным вкладкам.
- `app/(tabs)/index.tsx` — экран тренировки: ввод подходов, черновики и завершение упражнений.
- `app/(tabs)/timer.tsx` — отдельный экран таймера отдыха.
- `app/(tabs)/progress.tsx` — история тренировок, статистика и график прогресса.
- `app/timer-overlay.tsx` — модальный таймер отдыха поверх экрана тренировки.
- `components/` — переиспользуемые компоненты интерфейса.
- `db.ts` — схема, миграции, начальные данные и функции работы с Expo SQLite.
- `theme/` — цвета и тема навигации.
- `assets/` — иконки, изображения и звуковые файлы.
- `format.ts` — функции форматирования и разбора пользовательских значений.
- `app.json` — конфигурация Expo и платформ.
- `eas.json` — профили EAS Build.
- `tsconfig.json` — конфигурация TypeScript в строгом режиме.
- `CONTEXT.md` — продуктовые требования и исходная программа тренировок.

# Development rules

- Не менять архитектуру без явного запроса.
- Не удалять существующий функционал без явного запроса.
- Перед крупными изменениями сначала предлагать план.
- Делать минимальные точечные изменения.
- Не трогать `.env`, локальные секреты и `.claude/settings.local.json`.
- Не использовать `.claude/settings.local.json` как источник проектных требований.
- Не коммитить локальные настройки Claude Code.
- После изменений всегда показывать список изменённых файлов и `git diff`.
- После изменений запускать доступные проверки: `npx.cmd tsc --noEmit` и `npx.cmd expo install --check`, если это уместно.
- Если проверки не запускаются, объяснять причину.

# Notes for Codex

- `CLAUDE.md` может ссылаться на `AGENTS.md`, но основным источником инструкций для Codex является `AGENTS.md`.
- `CONTEXT.md` содержит продуктовые требования и исходную программу тренировок.
- `README.md` сейчас пустой, не использовать его как основной источник документации.
