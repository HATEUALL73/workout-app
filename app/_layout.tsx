import { ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { initDatabase } from '../db';
import { navigationTheme } from '../theme/navigationTheme';

// Корневой layout: задаёт тёмную тему глобально и прячет шапку
// у группы вкладок (свою шапку рисует таб-навигатор).
export default function RootLayout() {
  // Создаём схему и заполняем программу при первом запуске (идемпотентно).
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="timer-overlay"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
