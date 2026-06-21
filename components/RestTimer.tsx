import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CircularCountdown } from './CircularCountdown';
import { colors } from '../theme/colors';

const PRESETS = [60, 90, 120, 150];
const TICK_MS = 100;
const beepSource = require('../assets/sounds/beep.wav');

// Время в формате m:ss.
function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

type Props = {
  /** Стартовое время в секундах (например, отдых упражнения). */
  initialSeconds: number;
  /** Кнопка закрытия — показывается в режиме оверлея. */
  onClose?: () => void;
};

export function RestTimer({ initialSeconds, onClose }: Props) {
  const [total, setTotal] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  const endRef = useRef(0); // timestamp окончания (мс)
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

  // Тик отсчёта, пока запущен.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = (endRef.current - Date.now()) / 1000;
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        finish();
      } else {
        setRemaining(left);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, finish]);

  const start = () => {
    // Если время вышло — начинаем заново с полного.
    const from = remaining <= 0 ? total : remaining;
    setRemaining(from);
    endRef.current = Date.now() + from * 1000;
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setRemaining(total);
  };

  const selectPreset = (preset: number) => {
    setRunning(false);
    setTotal(preset);
    setRemaining(preset);
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.surface,
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
