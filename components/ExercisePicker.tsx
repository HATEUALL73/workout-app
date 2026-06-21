import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Exercise } from '../db';
import { dayLabel } from '../format';
import { colors } from '../theme/colors';

// Выпадающий список упражнений (через модальное окно).
type Props = {
  exercises: Exercise[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function ExercisePicker({ exercises, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selected = exercises.find((e) => e.id === selectedId) ?? null;

  const choose = (id: number) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <View>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected ? selected.name : 'Выберите упражнение'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Внутренний контейнер не закрывается по тапу */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView>
              {exercises.map((ex) => {
                const active = ex.id === selectedId;
                return (
                  <Pressable
                    key={ex.id}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => choose(ex.id)}
                  >
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>{dayLabel(ex.day)}</Text>
                    </View>
                    <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    {active && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  triggerText: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceElevated,
  },
  optionActive: {
    backgroundColor: colors.surfaceElevated,
  },
  dayBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dayBadgeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  optionTextActive: {
    fontWeight: '700',
  },
});
