import { ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { initDatabase } from '../db';
import { navigationTheme } from '../theme/navigationTheme';

// В активном приложении таймер сам проигрывает звук и haptics, поэтому
// системное уведомление показываем без дублирующего foreground-звука.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

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
