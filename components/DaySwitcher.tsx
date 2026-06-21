import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WorkoutDay } from '../db';
import { colors } from '../theme/colors';

// Переключатель тренировочного дня: ПН / СР / ПТ.
type Props = {
  value: WorkoutDay;
  onChange: (day: WorkoutDay) => void;
};

const DAYS: { key: WorkoutDay; label: string }[] = [
  { key: 'mon', label: 'ПН' },
  { key: 'wed', label: 'СР' },
  { key: 'fri', label: 'ПТ' },
];

export function DaySwitcher({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const active = day.key === value;
        return (
          <Pressable
            key={day.key}
            onPress={() => onChange(day.key)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{day.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  labelActive: {
    color: colors.text,
  },
});
