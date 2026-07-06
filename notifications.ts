import Constants from 'expo-constants';
import { Platform } from 'react-native';

const REST_NOTIFICATION_CHANNEL_ID = 'rest-timer';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

/** На Android Expo Go не загружаем native-модуль уведомлений, чтобы приложение не падало. */
export function areNotificationsAvailable(): boolean {
  return !(Platform.OS === 'android' && Constants.appOwnership === 'expo');
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!areNotificationsAvailable()) return null;

  notificationsModulePromise ??= import('expo-notifications').catch((error) => {
    console.warn('Не удалось загрузить модуль уведомлений', error);
    return null;
  });
  return notificationsModulePromise;
}

/** В активном приложении таймер сам воспроизводит звук и вибрацию. */
export async function configureNotificationHandler(): Promise<boolean> {
  const notifications = await getNotifications();
  if (!notifications) return false;

  try {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        priority: notifications.AndroidNotificationPriority.HIGH,
      }),
    });
    return true;
  } catch (error) {
    console.warn('Не удалось настроить обработчик уведомлений', error);
    return false;
  }
}

export async function configureRestNotificationChannel(): Promise<boolean> {
  const notifications = await getNotifications();
  if (!notifications) return false;
  if (Platform.OS !== 'android') return true;

  try {
    await notifications.setNotificationChannelAsync(REST_NOTIFICATION_CHANNEL_ID, {
      name: 'Таймер отдыха',
      description: 'Уведомления об окончании отдыха между подходами',
      importance: notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'default',
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    });
    return true;
  } catch (error) {
    console.warn('Не удалось настроить канал уведомлений таймера отдыха', error);
    return false;
  }
}

export async function ensureRestNotificationPermission(): Promise<boolean> {
  const notifications = await getNotifications();
  if (!notifications) return false;

  if (!(await configureRestNotificationChannel())) return false;

  try {
    const current = await notifications.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.warn('Не удалось запросить разрешение на уведомления', error);
    return false;
  }
}

export async function scheduleRestNotification(endTimestamp: number): Promise<string | null> {
  const notifications = await getNotifications();
  if (!notifications || !(await ensureRestNotificationPermission())) return null;

  try {
    return await notifications.scheduleNotificationAsync({
      content: {
        title: 'Отдых закончен',
        body: 'Пора делать следующий подход',
        sound: 'default',
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: endTimestamp,
        channelId: Platform.OS === 'android' ? REST_NOTIFICATION_CHANNEL_ID : undefined,
      },
    });
  } catch (error) {
    console.warn('Не удалось запланировать уведомление таймера отдыха', error);
    return null;
  }
}

export async function cancelScheduledRestNotification(
  identifier: string | null | undefined
): Promise<void> {
  if (!identifier) return;

  const notifications = await getNotifications();
  if (!notifications) return;

  try {
    await notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn('Не удалось отменить уведомление таймера отдыха', error);
  }
}
