import { DarkTheme, type Theme } from 'expo-router/react-navigation';

import { colors } from './colors';

// Тема навигации на основе тёмной темы react-navigation,
// чтобы фон контейнера и шапки совпадали с палитрой приложения
// и не было белых вспышек при переходах между экранами.
export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.surface,
    notification: colors.accent,
  },
};
