import * as SQLite from 'expo-sqlite';

// ============================================================================
// db.ts — единая точка работы с локальной БД (expo-sqlite).
// Вся работа с SQLite инкапсулирована здесь и доступна только через
// типизированные функции. Схема описана в CONTEXT.md.
// ============================================================================

// --- Публичные типы предметной области -------------------------------------

/** Тренировочный день. В UI отображается как ПН / СР / ПТ. */
export type WorkoutDay = 'mon' | 'wed' | 'fri';

/** Упражнение из программы (справочник, заполняется через seed). */
export interface Exercise {
  id: number;
  day: WorkoutDay;
  /** Порядок упражнения внутри дня (1..5). */
  position: number;
  name: string;
  /** Количество подходов. */
  sets: number;
  /** Диапазон повторов как текст: «10-12», «8-10», «40-60 сек». */
  reps: string;
  /** Время отдыха между подходами, секунды. */
  restSeconds: number;
  /** Примечание по технике. */
  note: string;
  /** Ограничение по здоровью (спина/мениск) — в UI помечается ⚠. */
  danger: boolean;
}

/** Запись выполнения: самый тяжёлый подход за тренировку. */
export interface LogEntry {
  id: number;
  exerciseId: number;
  /** Дата в формате ISO 'YYYY-MM-DD'. */
  date: string;
  weight: number;
  reps: number;
}

/** Незавершённый ввод одного подхода (чтобы не терять данные при выходе). */
export interface DraftSet {
  exerciseId: number;
  /** Индекс подхода, 0-based. */
  setIndex: number;
  weight: number | null;
  reps: number | null;
}

/** Ввод одного подхода при отметке «выполнено». */
export interface SetInput {
  weight: number;
  reps: number;
}

// --- Внутренние типы строк БД (snake_case, danger как 0/1) ------------------

interface ExerciseRow {
  id: number;
  day: string;
  position: number;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  note: string;
  danger: number;
}

interface LogRow {
  id: number;
  exercise_id: number;
  date: string;
  weight: number;
  reps: number;
}

interface DraftRow {
  exercise_id: number;
  set_index: number;
  weight: number | null;
  reps: number | null;
}

// --- Открытие БД (ленивый синглтон) ----------------------------------------

const DATABASE_NAME = 'workout.db';
const DATABASE_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
  }
  return db;
}

// --- Мапперы строк БД -> доменные типы --------------------------------------

function mapExercise(r: ExerciseRow): Exercise {
  return {
    id: r.id,
    day: r.day as WorkoutDay,
    position: r.position,
    name: r.name,
    sets: r.sets,
    reps: r.reps,
    restSeconds: r.rest_seconds,
    note: r.note,
    danger: r.danger === 1,
  };
}

function mapLog(r: LogRow): LogEntry {
  return {
    id: r.id,
    exerciseId: r.exercise_id,
    date: r.date,
    weight: r.weight,
    reps: r.reps,
  };
}

function mapDraft(r: DraftRow): DraftSet {
  return {
    exerciseId: r.exercise_id,
    setIndex: r.set_index,
    weight: r.weight,
    reps: r.reps,
  };
}

// --- Инициализация: миграции + единоразовый seed -----------------------------

/**
 * Создаёт схему и заполняет программу тренировок при первом запуске.
 * Идемпотентна: повторные вызовы ничего не делают (контроль через user_version).
 * Вызывать один раз при старте приложения.
 */
export function initDatabase(): void {
  const database = getDb();
  // WAL ускоряет одновременное чтение/запись и безопаснее при выходе из приложения.
  database.execSync('PRAGMA journal_mode = WAL;');
  database.execSync('PRAGMA foreign_keys = ON;');

  const versionRow = database.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    database.execSync(`
      CREATE TABLE exercises (
        id           INTEGER PRIMARY KEY NOT NULL,
        day          TEXT    NOT NULL,
        position     INTEGER NOT NULL,
        name         TEXT    NOT NULL,
        sets         INTEGER NOT NULL,
        reps         TEXT    NOT NULL,
        rest_seconds INTEGER NOT NULL,
        note         TEXT    NOT NULL DEFAULT '',
        danger       INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE logs (
        id          INTEGER PRIMARY KEY NOT NULL,
        exercise_id INTEGER NOT NULL,
        date        TEXT    NOT NULL,
        weight      REAL    NOT NULL,
        reps        INTEGER NOT NULL,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id)
      );

      CREATE INDEX idx_logs_exercise ON logs (exercise_id, date);

      CREATE TABLE draft (
        exercise_id INTEGER NOT NULL,
        set_index   INTEGER NOT NULL,
        weight      REAL,
        reps        INTEGER,
        PRIMARY KEY (exercise_id, set_index)
      );
    `);
    seedExercises(database);
  }

  database.execSync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// --- Seed: программа тренировок из CONTEXT.md --------------------------------

/** Данные для seed — упражнение без id (id назначает БД). */
type ExerciseSeed = Omit<Exercise, 'id'>;

const SEED_EXERCISES: ExerciseSeed[] = [
  // --- Понедельник ---
  {
    day: 'mon',
    position: 1,
    name: 'Жим ногами в тренажёре',
    sets: 3,
    reps: '10-12',
    restSeconds: 120,
    note: 'Неполная амплитуда, колено не уходит глубоко за 90° — бережём мениск',
    danger: true,
  },
  {
    day: 'mon',
    position: 2,
    name: 'Жим штанги лёжа',
    sets: 3,
    reps: '8-10',
    restSeconds: 150,
    note: 'База на грудь. В последнем подходе 1-2 повтора в запасе',
    danger: false,
  },
  {
    day: 'mon',
    position: 3,
    name: 'Тяга верхнего блока к груди',
    sets: 3,
    reps: '10-12',
    restSeconds: 90,
    note: 'Спина прижата к упору, тянем локтями вниз',
    danger: false,
  },
  {
    day: 'mon',
    position: 4,
    name: 'Жим гантелей сидя (плечи)',
    sets: 3,
    reps: '10-12',
    restSeconds: 90,
    note: 'Только с опорой на спинку — без осевой нагрузки на поясницу',
    danger: true,
  },
  {
    day: 'mon',
    position: 5,
    name: 'Планка',
    sets: 3,
    reps: '40-60 сек',
    restSeconds: 60,
    note: 'Кор. Нейтральная спина, без прогиба в пояснице',
    danger: false,
  },

  // --- Среда ---
  {
    day: 'wed',
    position: 1,
    name: 'Сгибание ног в тренажёре лёжа',
    sets: 3,
    reps: '12',
    restSeconds: 90,
    note: 'Бицепс бедра. Безопасно для спины и колена',
    danger: false,
  },
  {
    day: 'wed',
    position: 2,
    name: 'Жим гантелей на наклонной',
    sets: 3,
    reps: '10-12',
    restSeconds: 120,
    note: 'Верх груди. Угол скамьи 30-45°',
    danger: false,
  },
  {
    day: 'wed',
    position: 3,
    name: 'Тяга горизонтального блока',
    sets: 3,
    reps: '10-12',
    restSeconds: 90,
    note: 'С упором в грудь, спина зафиксирована',
    danger: true,
  },
  {
    day: 'wed',
    position: 4,
    name: 'Подъём гантелей на бицепс',
    sets: 3,
    reps: '12',
    restSeconds: 60,
    note: 'Без раскачки корпусом',
    danger: false,
  },
  {
    day: 'wed',
    position: 5,
    name: 'Разгибание на трицепс на блоке',
    sets: 3,
    reps: '12',
    restSeconds: 60,
    note: 'Локти прижаты к корпусу',
    danger: false,
  },

  // --- Пятница ---
  {
    day: 'fri',
    position: 1,
    name: 'Разгибание ног в тренажёре',
    sets: 3,
    reps: '12-15',
    restSeconds: 90,
    note: 'ОСТОРОЖНО с мениском: минимальный вес, комфортная амплитуда. Боль или щелчки — убрать упражнение',
    danger: true,
  },
  {
    day: 'fri',
    position: 2,
    name: 'Жим штанги узким хватом',
    sets: 3,
    reps: '8-10',
    restSeconds: 120,
    note: 'Трицепс, вместо брусьев. Хват чуть уже плеч',
    danger: false,
  },
  {
    day: 'fri',
    position: 3,
    name: 'Тяга верхнего блока обратным хватом',
    sets: 3,
    reps: '10-12',
    restSeconds: 90,
    note: 'Акцент на широчайшие и бицепс',
    danger: false,
  },
  {
    day: 'fri',
    position: 4,
    name: 'Махи гантелями в стороны',
    sets: 3,
    reps: '12-15',
    restSeconds: 60,
    note: 'Средняя дельта. Лёгкий вес, чистая техника',
    danger: false,
  },
  {
    day: 'fri',
    position: 5,
    name: 'Скручивания на верхнем блоке',
    sets: 3,
    reps: '15',
    restSeconds: 60,
    note: '«Молитва». Стоя на коленях (колено на коврике). Можно добавлять вес',
    danger: false,
  },
];

/** Заполняет таблицу exercises всей программой (вызывается один раз из initDatabase). */
function seedExercises(database: SQLite.SQLiteDatabase): void {
  database.withTransactionSync(() => {
    for (const ex of SEED_EXERCISES) {
      database.runSync(
        `INSERT INTO exercises (day, position, name, sets, reps, rest_seconds, note, danger)
         VALUES ($day, $position, $name, $sets, $reps, $rest, $note, $danger)`,
        {
          $day: ex.day,
          $position: ex.position,
          $name: ex.name,
          $sets: ex.sets,
          $reps: ex.reps,
          $rest: ex.restSeconds,
          $note: ex.note,
          $danger: ex.danger ? 1 : 0,
        }
      );
    }
  });
}

// --- Упражнения --------------------------------------------------------------

/** Все упражнения программы, упорядочены по дню и позиции. */
export function getAllExercises(): Exercise[] {
  const rows = getDb().getAllSync<ExerciseRow>(
    `SELECT * FROM exercises ORDER BY day, position`
  );
  return rows.map(mapExercise);
}

/** Упражнения конкретного дня по порядку (1..5). */
export function getExercisesByDay(day: WorkoutDay): Exercise[] {
  const rows = getDb().getAllSync<ExerciseRow>(
    `SELECT * FROM exercises WHERE day = $day ORDER BY position`,
    { $day: day }
  );
  return rows.map(mapExercise);
}

/** Одно упражнение по id или null, если не найдено. */
export function getExerciseById(id: number): Exercise | null {
  const row = getDb().getFirstSync<ExerciseRow>(
    `SELECT * FROM exercises WHERE id = $id`,
    { $id: id }
  );
  return row ? mapExercise(row) : null;
}

// --- Логи выполнения ---------------------------------------------------------

/** Вставляет запись лога и возвращает её id. */
export function insertLog(entry: Omit<LogEntry, 'id'>): number {
  const result = getDb().runSync(
    `INSERT INTO logs (exercise_id, date, weight, reps)
     VALUES ($exerciseId, $date, $weight, $reps)`,
    {
      $exerciseId: entry.exerciseId,
      $date: entry.date,
      $weight: entry.weight,
      $reps: entry.reps,
    }
  );
  return result.lastInsertRowId;
}

/**
 * Отметка «выполнено»: из всех введённых подходов сохраняет самый тяжёлый
 * (по весу; при равном весе — больше повторов) и очищает черновик упражнения.
 * Возвращает созданную запись лога или null, если подходов не было.
 */
export function logCompletedExercise(
  exerciseId: number,
  date: string,
  sets: SetInput[]
): LogEntry | null {
  if (sets.length === 0) return null;

  const heaviest = sets.reduce((best, cur) => {
    if (cur.weight > best.weight) return cur;
    if (cur.weight === best.weight && cur.reps > best.reps) return cur;
    return best;
  });

  let newId = 0;
  getDb().withTransactionSync(() => {
    newId = insertLog({ exerciseId, date, weight: heaviest.weight, reps: heaviest.reps });
    clearDraftForExercise(exerciseId);
  });

  return { id: newId, exerciseId, date, weight: heaviest.weight, reps: heaviest.reps };
}

/** История по упражнению, от старых к новым (для графика прогресса). */
export function getLogsForExercise(exerciseId: number): LogEntry[] {
  const rows = getDb().getAllSync<LogRow>(
    `SELECT * FROM logs WHERE exercise_id = $id ORDER BY date ASC, id ASC`,
    { $id: exerciseId }
  );
  return rows.map(mapLog);
}

/** Последняя запись по упражнению или null. */
export function getLatestLog(exerciseId: number): LogEntry | null {
  const row = getDb().getFirstSync<LogRow>(
    `SELECT * FROM logs WHERE exercise_id = $id ORDER BY date DESC, id DESC LIMIT 1`,
    { $id: exerciseId }
  );
  return row ? mapLog(row) : null;
}

// --- Черновик (текущий незавершённый ввод) ----------------------------------

/** Сохраняет/обновляет ввод одного подхода (upsert по exercise_id + set_index). */
export function saveDraftSet(draft: DraftSet): void {
  getDb().runSync(
    `INSERT INTO draft (exercise_id, set_index, weight, reps)
     VALUES ($exerciseId, $setIndex, $weight, $reps)
     ON CONFLICT (exercise_id, set_index)
     DO UPDATE SET weight = excluded.weight, reps = excluded.reps`,
    {
      $exerciseId: draft.exerciseId,
      $setIndex: draft.setIndex,
      $weight: draft.weight,
      $reps: draft.reps,
    }
  );
}

/** Черновик подходов одного упражнения, по порядку подходов. */
export function getDraftForExercise(exerciseId: number): DraftSet[] {
  const rows = getDb().getAllSync<DraftRow>(
    `SELECT * FROM draft WHERE exercise_id = $id ORDER BY set_index`,
    { $id: exerciseId }
  );
  return rows.map(mapDraft);
}

/** Весь сохранённый черновик (по всем упражнениям). */
export function getAllDrafts(): DraftSet[] {
  const rows = getDb().getAllSync<DraftRow>(
    `SELECT * FROM draft ORDER BY exercise_id, set_index`
  );
  return rows.map(mapDraft);
}

/** Очищает черновик одного упражнения. */
export function clearDraftForExercise(exerciseId: number): void {
  getDb().runSync(`DELETE FROM draft WHERE exercise_id = $id`, { $id: exerciseId });
}

/** Очищает весь черновик (например, при завершении тренировки). */
export function clearAllDrafts(): void {
  getDb().runSync(`DELETE FROM draft`);
}
