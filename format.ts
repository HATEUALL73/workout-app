import type { WorkoutDay } from './db';

// Утилиты форматирования для отображения.

/** 'YYYY-MM-DD' -> 'DD.MM'. */
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

/** 'YYYY-MM-DD' -> 'DD.MM.YYYY'. */
export function formatDateFull(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Вес без лишних нулей: 40 -> «40», 42.5 -> «42.5». */
export function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}

/** Разбирает строку поля ввода в число (запятая как разделитель). Пусто/мусор -> null. */
export function parseNum(value: string): number | null {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Короткая метка дня для UI. */
export function dayLabel(day: WorkoutDay): string {
  switch (day) {
    case 'mon':
      return 'ПН';
    case 'wed':
      return 'СР';
    case 'fri':
      return 'ПТ';
  }
}
