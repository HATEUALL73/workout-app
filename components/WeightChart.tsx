import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import type { LogEntry } from '../db';
import { formatDateShort, formatWeight } from '../format';
import { colors } from '../theme/colors';

// График роста рабочего веса по датам.
type Props = {
  logs: LogEntry[];
};

const HEIGHT = 220;
const PADDING = { top: 20, right: 16, bottom: 28, left: 40 };

export function WeightChart({ logs }: Props) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const innerW = width - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const weights = logs.map((l) => l.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1; // защита от деления на ноль при ровном весе
  const n = logs.length;

  // Координаты точки по индексу и весу.
  const xAt = (i: number) => (n === 1 ? PADDING.left + innerW / 2 : PADDING.left + (innerW * i) / (n - 1));
  const yAt = (w: number) => PADDING.top + innerH * (1 - (w - minW) / range);

  const points = logs.map((l, i) => `${xAt(i)},${yAt(l.weight)}`).join(' ');

  return (
    <View style={styles.container} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {/* Верхняя и нижняя опорные линии */}
          <Line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={width - PADDING.right}
            y2={PADDING.top}
            stroke={colors.surfaceElevated}
            strokeWidth={1}
          />
          <Line
            x1={PADDING.left}
            y1={PADDING.top + innerH}
            x2={width - PADDING.right}
            y2={PADDING.top + innerH}
            stroke={colors.surfaceElevated}
            strokeWidth={1}
          />

          {/* Подписи веса (макс сверху, мин снизу) */}
          <SvgText x={PADDING.left - 8} y={PADDING.top + 4} fill={colors.textMuted} fontSize={11} textAnchor="end">
            {formatWeight(maxW)}
          </SvgText>
          <SvgText
            x={PADDING.left - 8}
            y={PADDING.top + innerH + 4}
            fill={colors.textMuted}
            fontSize={11}
            textAnchor="end"
          >
            {formatWeight(minW)}
          </SvgText>

          {/* Линия графика (если точек больше одной) */}
          {n > 1 && <Polyline points={points} fill="none" stroke={colors.accent} strokeWidth={2.5} />}

          {/* Точки */}
          {logs.map((l, i) => (
            <Circle key={l.id} cx={xAt(i)} cy={yAt(l.weight)} r={4} fill={colors.accent} />
          ))}

          {/* Подписи дат: первая и последняя */}
          <SvgText x={xAt(0)} y={HEIGHT - 8} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            {formatDateShort(logs[0].date)}
          </SvgText>
          {n > 1 && (
            <SvgText
              x={xAt(n - 1)}
              y={HEIGHT - 8}
              fill={colors.textMuted}
              fontSize={11}
              textAnchor="middle"
            >
              {formatDateShort(logs[n - 1].date)}
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
});
