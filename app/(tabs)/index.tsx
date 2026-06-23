import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { DaySwitcher } from '../../components/DaySwitcher';
import { ExerciseCard, type SetField, type SetInputState } from '../../components/ExerciseCard';
import {
  getDraftForExercise,
  getExercisesByDay,
  getLatestLog,
  getLogsForExercise,
  logCompletedExercise,
  saveDraftSet,
  todayISO,
  type Exercise,
  type LogEntry,
  type SetInput,
  type WorkoutDay,
} from '../../db';
import { parseNum } from '../../format';
import { colors } from '../../theme/colors';

/** Ориентиры по упражнению: последняя запись и рекорд по весу. */
type ExerciseStats = { last: LogEntry | null; record: LogEntry | null };

// Считает «прошлый раз» и «рекорд» для упражнения.
function computeStats(exerciseId: number): ExerciseStats {
  const last = getLatestLog(exerciseId);
  let record: LogEntry | null = null;
  for (const log of getLogsForExercise(exerciseId)) {
    if (record == null || log.weight > record.weight) record = log;
  }
  return { last, record };
}

// Пустой набор подходов для упражнения (по числу подходов в программе).
function emptySets(count: number): SetInputState[] {
  return Array.from({ length: count }, () => ({ weight: '', reps: '' }));
}

// Загружает значения подходов из черновика (или пустые, если черновика нет).
function loadSets(exercise: Exercise): SetInputState[] {
  const drafts = getDraftForExercise(exercise.id);
  return Array.from({ length: exercise.sets }, (_, i) => {
    const draft = drafts.find((d) => d.setIndex === i);
    return {
      weight: draft?.weight != null ? String(draft.weight) : '',
      reps: draft?.reps != null ? String(draft.reps) : '',
    };
  });
}

export default function WorkoutScreen() {
  const router = useRouter();
  const [day, setDay] = useState<WorkoutDay>('mon');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [inputs, setInputs] = useState<Record<number, SetInputState[]>>({});
  const [stats, setStats] = useState<Record<number, ExerciseStats>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // При смене дня перечитываем упражнения, черновики и ориентиры.
  useEffect(() => {
    const list = getExercisesByDay(day);
    setExercises(list);
    const inputMap: Record<number, SetInputState[]> = {};
    const statsMap: Record<number, ExerciseStats> = {};
    for (const ex of list) {
      inputMap[ex.id] = loadSets(ex);
      statsMap[ex.id] = computeStats(ex.id);
    }
    setInputs(inputMap);
    setStats(statsMap);
    setExpandedId(null);
  }, [day]);

  // Изменение поля подхода: обновляем локальное состояние и пишем черновик.
  const handleChangeSet = (exerciseId: number, setIndex: number, field: SetField, value: string) => {
    const current = inputs[exerciseId] ?? [];
    const updated = current.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s));
    setInputs({ ...inputs, [exerciseId]: updated });

    const pair = updated[setIndex];
    saveDraftSet({
      exerciseId,
      setIndex,
      weight: parseNum(pair.weight),
      reps: parseNum(pair.reps),
    });
  };

  // «Готово»: сохраняем самый тяжёлый подход в лог и очищаем поля упражнения.
  const handleDone = (exercise: Exercise) => {
    const arr = inputs[exercise.id] ?? [];
    const sets: SetInput[] = arr
      .map((s) => ({ weight: parseNum(s.weight), reps: parseNum(s.reps) }))
      .filter((s) => s.weight != null || s.reps != null)
      .map((s) => ({ weight: s.weight ?? 0, reps: s.reps ?? 0 }));

    if (sets.length === 0) {
      Alert.alert('Нет данных', 'Введите вес или повторы хотя бы в одном подходе.');
      return;
    }

    const log = logCompletedExercise(exercise.id, todayISO(), sets);
    // logCompletedExercise очищает черновик упражнения — сбрасываем и поля.
    setInputs((prev) => ({ ...prev, [exercise.id]: emptySets(exercise.sets) }));
    // Обновляем ориентиры (прошлый раз/рекорд) после новой записи.
    setStats((prev) => ({ ...prev, [exercise.id]: computeStats(exercise.id) }));
    setExpandedId(null);

    if (log) {
      Alert.alert('Записано', `${exercise.name}: ${log.weight} кг × ${log.reps}.`);
    }
  };

  // Кнопка таймера отдыха: открываем оверлей таймера поверх тренировки.
  const handleRest = (exercise: Exercise) => {
    router.push(`/timer-overlay?seconds=${exercise.restSeconds}`);
  };

  const today = todayISO();

  return (
    <View style={styles.container}>
      <DaySwitcher value={day} onChange={setDay} />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            expanded={expandedId === exercise.id}
            onToggle={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
            sets={inputs[exercise.id] ?? emptySets(exercise.sets)}
            last={stats[exercise.id]?.last ?? null}
            record={stats[exercise.id]?.record ?? null}
            done={stats[exercise.id]?.last?.date === today}
            onChangeSet={(setIndex, field, value) =>
              handleChangeSet(exercise.id, setIndex, field, value)
            }
            onRest={() => handleRest(exercise)}
            onDone={() => handleDone(exercise)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingTop: 4,
    paddingBottom: 32,
  },
});
