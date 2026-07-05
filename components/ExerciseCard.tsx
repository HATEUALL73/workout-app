import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Exercise, LogEntry } from '../db';
import { formatWeight, parseNum } from '../format';
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
  /** Последняя запись («прошлый раз») или null, если истории нет. */
  last: LogEntry | null;
  /** Запись с максимальным весом («рекорд») или null. */
  record: LogEntry | null;
  /** Упражнение уже отмечено «выполнено» сегодня (есть запись в логах за сегодня). */
  done: boolean;
  onChangeSet: (setIndex: number, field: SetField, value: string) => void;
  onRest: () => void;
  onDone: () => void;
};

export function ExerciseCard({
  exercise,
  expanded,
  onToggle,
  sets,
  last,
  record,
  done,
  onChangeSet,
  onRest,
  onDone,
}: Props) {
  const recordWeight = record?.weight ?? null;

  // Введённый вес бьёт рекорд: если рекорда нет — любой положительный вес.
  const isNewRecord = (weightInput: string): boolean => {
    const w = parseNum(weightInput);
    if (w == null) return false;
    return recordWeight == null ? w > 0 : w > recordWeight;
  };

  return (
    <View style={[styles.card, done && styles.cardDone, exercise.danger && styles.cardDanger]}>
      {/* Шапка карточки — тап разворачивает/сворачивает */}
      <Pressable onPress={onToggle} style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{exercise.name}</Text>
          </View>
          <Text style={styles.subtitle}>
            {exercise.sets}×{exercise.reps} · отдых {exercise.restSeconds}с
          </Text>
          {exercise.danger && (
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={15} color={colors.accent} />
              <Text style={styles.warningText}>Осторожно: есть ограничение</Text>
            </View>
          )}
          {done && (
            <View style={styles.doneRow}>
              <Ionicons name="checkmark" size={14} color={colors.success} />
              <Text style={styles.doneText}>Выполнено сегодня</Text>
            </View>
          )}
          {/* Ориентир — виден всегда, без раскрытия карточки */}
          <View style={styles.orientir}>
            <Text style={styles.orientirItem}>
              прошлый раз:{' '}
              <Text style={styles.orientirValue}>
                {last ? `${formatWeight(last.weight)}×${last.reps}` : '—'}
              </Text>
            </Text>
            <Text style={styles.orientirItem}>
              рекорд:{' '}
              <Text style={styles.orientirValue}>
                {record ? `${formatWeight(record.weight)}×${record.reps}` : '—'}
              </Text>
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {/* Для ограничений пояснение выделяем отдельно, обычную заметку оставляем текстом. */}
          {exercise.danger && exercise.note ? (
            <View style={styles.warningBlock}>
              <View style={styles.warningBlockHeader}>
                <Ionicons name="warning" size={17} color={colors.accent} />
                <Text style={styles.warningBlockTitle}>Почему нужна осторожность</Text>
              </View>
              <Text selectable style={styles.warningBlockText}>
                {exercise.note}
              </Text>
            </View>
          ) : exercise.note ? (
            <Text style={styles.note}>{exercise.note}</Text>
          ) : null}

          {/* Поля ввода по каждому подходу */}
          <View style={styles.setsHeader}>
            <Text style={[styles.setLabel, styles.colIndex]}>Подход</Text>
            <Text style={[styles.setLabel, styles.colInput]}>Вес, кг</Text>
            <Text style={[styles.setLabel, styles.colInput]}>Повт.</Text>
          </View>
          {sets.map((set, index) => {
            const record = isNewRecord(set.weight);
            return (
              <View key={index} style={styles.setRow}>
                <Text style={[styles.setIndex, styles.colIndex]}>{index + 1}</Text>
                <View style={styles.colInput}>
                  <TextInput
                    style={[styles.input, record && styles.inputRecord]}
                    value={set.weight}
                    onChangeText={(v) => onChangeSet(index, 'weight', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                  />
                  {record && (
                    <Text style={styles.fire} pointerEvents="none">
                      🔥
                    </Text>
                  )}
                </View>
                <View style={styles.colInput}>
                  <TextInput
                    style={styles.input}
                    value={set.reps}
                    onChangeText={(v) => onChangeSet(index, 'reps', v)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                  />
                </View>
              </View>
            );
          })}

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
  cardDone: {
    borderColor: colors.success,
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
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  warningText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  doneText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  orientir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    marginTop: 6,
  },
  orientirItem: {
    color: colors.textMuted,
    fontSize: 13,
  },
  orientirValue: {
    color: colors.text,
    fontWeight: '700',
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
  warningBlock: {
    gap: 6,
    padding: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(232, 72, 43, 0.1)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
  },
  warningBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningBlockTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  warningBlockText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
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
  colIndex: {
    width: 64,
  },
  colInput: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  fire: {
    position: 'absolute',
    right: 10,
    top: 0,
    fontSize: 16,
    lineHeight: 52, // = minHeight поля, чтобы значок был по центру по вертикали
  },
  setIndex: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'transparent', // зарезервировано, чтобы рамка рекорда не сдвигала вёрстку
  },
  inputRecord: {
    borderColor: colors.accent,
    color: colors.accent,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 52,
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
