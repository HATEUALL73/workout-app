import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExercisePicker } from '../../components/ExercisePicker';
import { WeightChart } from '../../components/WeightChart';
import { getAllExercises, getLogsForExercise, type Exercise, type LogEntry } from '../../db';
import { formatDateFull, formatWeight } from '../../format';
import { colors } from '../../theme/colors';

export default function ProgressScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Список упражнений загружаем один раз, выбираем первое по умолчанию.
  useEffect(() => {
    const list = getAllExercises();
    setExercises(list);
    setSelectedId((prev) => prev ?? (list.length > 0 ? list[0].id : null));
  }, []);

  // Логи перечитываем при выборе упражнения и при каждом возврате на экран,
  // чтобы свежие записи с вкладки «Тренировка» сразу появлялись.
  useFocusEffect(
    useCallback(() => {
      setLogs(selectedId != null ? getLogsForExercise(selectedId) : []);
    }, [selectedId])
  );

  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    const weights = logs.map((l) => l.weight);
    const current = weights[weights.length - 1];
    const start = weights[0];
    const max = Math.max(...weights);
    const workouts = new Set(logs.map((l) => l.date)).size;
    return { current, gain: current - start, max, workouts };
  }, [logs]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ExercisePicker exercises={exercises} selectedId={selectedId} onSelect={setSelectedId} />

        {stats === null ? (
          <View style={styles.empty}>
            <Ionicons name="stats-chart-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Пока нет записей</Text>
            <Text style={styles.emptyText}>
              Отметьте упражнение как выполненное на вкладке «Тренировка» — здесь появится график
              и статистика.
            </Text>
          </View>
        ) : (
          <>
            <WeightChart logs={logs} />

            <View style={styles.statsGrid}>
              <StatCard label="Текущий вес" value={`${formatWeight(stats.current)} кг`} />
              <StatCard
                label="Прибавка"
                value={`${stats.gain > 0 ? '+' : ''}${formatWeight(stats.gain)} кг`}
                highlight={stats.gain > 0}
              />
              <StatCard label="Максимум" value={`${formatWeight(stats.max)} кг`} />
              <StatCard label="Тренировок" value={String(stats.workouts)} />
            </View>

            <Text style={styles.historyHeading}>История</Text>
            <View style={styles.history}>
              {[...logs].reverse().map((log) => (
                <View key={log.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{formatDateFull(log.date)}</Text>
                  <Text style={styles.historyValue}>
                    {formatWeight(log.weight)} кг × {log.reps}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Карточка одного показателя статистики.
function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  statValueHighlight: {
    color: colors.accent,
  },
  historyHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  history: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceElevated,
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 15,
  },
  historyValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
