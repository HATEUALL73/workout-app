import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CircularCountdown } from './CircularCountdown';
import { colors } from '../theme/colors';

const PRESETS = [60, 90, 120, 150];
const TICK_MS = 100;
const REST_NOTIFICATION_CHANNEL_ID = 'rest-timer';
const beepSource = require('../assets/sounds/beep.wav');

// Время в формате m:ss.
function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Готовит Android channel и запрашивает разрешение только при необходимости.
async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REST_NOTIFICATION_CHANNEL_ID, {
      name: 'Таймер отдыха',
      description: 'Уведомления об окончании отдыха между подходами',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function scheduleRestNotification(endTimestamp: number): Promise<string | null> {
  const permitted = await ensureNotificationPermission();
  if (!permitted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Отдых закончен',
      body: 'Пора делать следующий подход',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: endTimestamp,
      channelId: Platform.OS === 'android' ? REST_NOTIFICATION_CHANNEL_ID : undefined,
    },
  });
}

type Props = {
  /** Стартовое время в секундах (например, отдых упражнения). */
  initialSeconds: number;
  /** Автоматически запустить отсчёт один раз после монтирования. */
  autoStart?: boolean;
  /** Кнопка закрытия — показывается в режиме оверлея. */
  onClose?: () => void;
};

export function RestTimer({ initialSeconds, autoStart = false, onClose }: Props) {
  const [total, setTotal] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  const endRef = useRef(0); // timestamp окончания (мс)
  const firedRef = useRef(false); // защита от повторного сигнала окончания
  const autoStartedRef = useRef(false);
  const notificationIdRef = useRef<string | null>(null);
  const notificationOperationRef = useRef(0);
  const player = useAudioPlayer(beepSource);

  // Разрешаем звук даже в беззвучном режиме телефона.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  // Сигнал окончания: вибрация + звук.
  const finish = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    player.seekTo(0);
    player.play();
  }, [player]);

  // Отменяет текущее уведомление и инвалидирует незавершённое планирование.
  const cancelRestNotification = useCallback(async () => {
    notificationOperationRef.current += 1;
    const identifier = notificationIdRef.current;
    notificationIdRef.current = null;
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }
  }, []);

  // Планирует одно уведомление. Если за время запроса разрешения таймер
  // остановили или сбросили, только что созданное уведомление сразу отменяется.
  const replaceRestNotification = useCallback(async (endTimestamp: number) => {
    const operation = notificationOperationRef.current + 1;
    notificationOperationRef.current = operation;

    const previousIdentifier = notificationIdRef.current;
    notificationIdRef.current = null;
    if (previousIdentifier) {
      await Notifications.cancelScheduledNotificationAsync(previousIdentifier);
    }

    if (notificationOperationRef.current !== operation) return;

    try {
      const identifier = await scheduleRestNotification(endTimestamp);
      if (!identifier) {
        if (notificationOperationRef.current === operation) {
          Alert.alert(
            'Уведомления отключены',
            'Таймер продолжит работать, но не сможет сообщить об окончании на заблокированном экране.'
          );
        }
        return;
      }

      if (notificationOperationRef.current !== operation) {
        await Notifications.cancelScheduledNotificationAsync(identifier);
        return;
      }
      notificationIdRef.current = identifier;
    } catch (error) {
      console.warn('Не удалось запланировать уведомление таймера отдыха', error);
    }
  }, []);

  // Единый путь запуска для ручной кнопки и autoStart.
  const startCountdown = useCallback(
    (durationSeconds: number) => {
      firedRef.current = false;
      setRemaining(durationSeconds);
      const endTimestamp = Date.now() + durationSeconds * 1000;
      endRef.current = endTimestamp;
      setRunning(true);
      void replaceRestNotification(endTimestamp);
    },
    [replaceRestNotification]
  );

  // Закрытие экрана/оверлея считается отменой текущего таймера.
  useEffect(() => {
    return () => {
      void cancelRestNotification();
    };
  }, [cancelRestNotification]);

  // Одноразовый timeout не даёт пробному effect в React Strict Mode
  // создать второе системное уведомление.
  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;

    const timeoutId = setTimeout(() => {
      if (autoStartedRef.current) return;
      autoStartedRef.current = true;
      startCountdown(initialSeconds);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [autoStart, initialSeconds, startCountdown]);

  // Тик отсчёта, пока запущен.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = (endRef.current - Date.now()) / 1000;
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        if (!firedRef.current) {
          firedRef.current = true;
          finish();
        }
      } else {
        setRemaining(left);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, finish]);

  const start = () => {
    // Если время вышло — начинаем заново с полного.
    const from = remaining <= 0 ? total : remaining;
    startCountdown(from);
  };

  const pause = () => {
    setRunning(false);
    setRemaining(Math.max(0, (endRef.current - Date.now()) / 1000));
    void cancelRestNotification();
  };

  const reset = () => {
    setRunning(false);
    firedRef.current = false;
    setRemaining(total);
    void cancelRestNotification();
  };

  const selectPreset = (preset: number) => {
    setRunning(false);
    firedRef.current = false;
    setTotal(preset);
    setRemaining(preset);
    void cancelRestNotification();
  };

  const progress = total > 0 ? remaining / total : 0;

  return (
    <View style={styles.container}>
      {onClose && (
        <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
      )}

      <Text style={styles.heading}>Отдых</Text>

      {/* Пресеты времени */}
      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const active = total === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => selectPreset(preset)}
              style={[styles.preset, active && styles.presetActive]}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>{preset}с</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Круговой отсчёт */}
      <CircularCountdown size={240} strokeWidth={14} progress={progress}>
        <Text style={styles.time}>{formatTime(remaining)}</Text>
        <Text style={styles.totalLabel}>из {formatTime(total)}</Text>
      </CircularCountdown>

      {/* Управление */}
      <View style={styles.controls}>
        <Pressable onPress={reset} style={[styles.control, styles.secondaryControl]}>
          <Ionicons name="refresh" size={22} color={colors.text} />
          <Text style={styles.controlText}>Сброс</Text>
        </Pressable>
        <Pressable
          onPress={running ? pause : start}
          style={[styles.control, styles.primaryControl]}
        >
          <Ionicons name={running ? 'pause' : 'play'} size={22} color={colors.text} />
          <Text style={styles.controlText}>{running ? 'Пауза' : 'Старт'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 24,
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 1,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
  },
  preset: {
    minWidth: 56,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  presetActive: {
    backgroundColor: colors.accent,
  },
  presetText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  presetTextActive: {
    color: colors.text,
  },
  time: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  secondaryControl: {
    backgroundColor: colors.surfaceElevated,
  },
  primaryControl: {
    backgroundColor: colors.accent,
  },
  controlText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
