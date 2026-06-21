import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Exercise } from '../db';
import { colors } from '../theme/colors';

/** Локальное состояние ввода одного подхода (строки из полей ввода). */
export type SetInputState = {
  weight: string;
  reps: string;
};

export type SetField = 'weight' | 'reps';

type Props = {
  exercise: Exercise;
  expanded: boolean;
  onToggle: () => void;
  /** Значения подходов, длина массива = exercise.sets. */
  sets: SetInputState[];
  onChangeSet: (setIndex: number, field: SetField, value: string) => void;
  onRest: () => void;
  onDone: () => void;
};

export function ExerciseCard({
  exercise,
  expanded,
  onToggle,
  sets,
  onChangeSet,
  onRest,
  onDone,
}: Props) {
  return (
    <View style={[styles.card, exercise.danger && styles.cardDanger]}>
      {/* Шапка карточки — тап разворачивает/сворачивает */}
      <Pressable onPress={onToggle} style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            {exercise.danger && (
              <Ionicons name="warning" size={18} color={colors.accent} style={styles.warnIcon} />
            )}
            <Text style={styles.title}>{exercise.name}</Text>
          </View>
          <Text style={styles.subtitle}>
            {exercise.sets}×{exercise.reps} · отдых {exercise.restSeconds}с
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {/* Примечание по технике */}
          <Text style={[styles.note, exercise.danger && styles.noteDanger]}>{exercise.note}</Text>

          {/* Поля ввода по каждому подходу */}
          <View style={styles.setsHeader}>
            <Text style={[styles.setLabel, styles.setIndexCol]}>Подход</Text>
            <Text style={[styles.setLabel, styles.setInputCol]}>Вес, кг</Text>
            <Text style={[styles.setLabel, styles.setInputCol]}>Повт.</Text>
          </View>
          {sets.map((set, index) => (
            <View key={index} style={styles.setRow}>
              <Text style={[styles.setIndex, styles.setIndexCol]}>{index + 1}</Text>
              <TextInput
                style={[styles.input, styles.setInputCol]}
                value={set.weight}
                onChangeText={(v) => onChangeSet(index, 'weight', v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
              />
              <TextInput
                style={[styles.input, styles.setInputCol]}
                value={set.reps}
                onChangeText={(v) => onChangeSet(index, 'reps', v)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
              />
            </View>
          ))}

          {/* Кнопки действий */}
          <View style={styles.actions}>
            <Pressable onPress={onRest} style={[styles.button, styles.restButton]}>
              <Ionicons name="timer-outline" size={18} color={colors.text} />
              <Text style={styles.buttonText}>Отдых {exercise.restSeconds}с</Text>
            </Pressable>
            <Pressable onPress={onDone} style={[styles.button, styles.doneButton]}>
              <Ionicons name="checkmark" size={18} color={colors.text} />
              <Text style={styles.buttonText}>Готово</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  cardDanger: {
    borderColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warnIcon: {
    marginRight: 6,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  note: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  noteDanger: {
    color: colors.accent,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  setIndexCol: {
    width: 64,
  },
  setInputCol: {
    flex: 1,
    marginLeft: 8,
  },
  setIndex: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  restButton: {
    backgroundColor: colors.surfaceElevated,
  },
  doneButton: {
    backgroundColor: colors.accent,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
