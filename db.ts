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

export type WorkoutDraftSessionStatus = 'active' | 'archived';
export type WorkoutDraftExerciseStatus = 'not_started' | 'in_progress';

/** Метаданные незавершённой тренировки. */
export interface WorkoutDraftSession {
  id: number;
  workoutDate: string;
  selectedDay: WorkoutDay;
  status: WorkoutDraftSessionStatus;
  updatedAt: string;
  legacyImported: boolean;
}

/** Состояние упражнения внутри незавершённой тренировки. */
export interface WorkoutDraftExercise {
  sessionId: number;
  /** Исходный слот упражнения в программе. */
  slotExerciseId: number;
  /** Фактически выполняемое упражнение; пока совпадает со slotExerciseId. */
  exerciseId: number;
  completedSets: number;
  status: WorkoutDraftExerciseStatus;
  replacementReason: string | null;
  updatedAt: string;
}

/** Ввод одного подхода внутри новой модели черновика. */
export interface WorkoutDraftSet {
  sessionId: number;
  slotExerciseId: number;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  updatedAt: string;
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

interface WorkoutDraftSessionRow {
  id: number;
  workout_date: string;
  selected_day: string;
  status: string;
  updated_at: string;
  legacy_imported: number;
}

interface WorkoutDraftExerciseRow {
  session_id: number;
  slot_exercise_id: number;
  exercise_id: number;
  completed_sets: number;
  status: string;
  replacement_reason: string | null;
  updated_at: string;
}

interface WorkoutDraftSetRow {
  session_id: number;
  slot_exercise_id: number;
  set_index: number;
  weight: number | null;
  reps: number | null;
  updated_at: string;
}

// --- Открытие БД (ленивый синглтон) ----------------------------------------

const DATABASE_NAME = 'workout.db';

let db: SQLite.SQLiteDatabase | null = null;
let migrated = false;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
  }
  // Гарантируем, что схема и seed применены до первого же запроса —
  // эффекты экранов срабатывают раньше эффекта корневого layout.
  if (!migrated) {
    migrated = true;
    migrate(db);
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

function mapWorkoutDraftSession(r: WorkoutDraftSessionRow): WorkoutDraftSession {
  return {
    id: r.id,
    workoutDate: r.workout_date,
    selectedDay: r.selected_day as WorkoutDay,
    status: r.status as WorkoutDraftSessionStatus,
    updatedAt: r.updated_at,
    legacyImported: r.legacy_imported === 1,
  };
}

function mapWorkoutDraftExercise(r: WorkoutDraftExerciseRow): WorkoutDraftExercise {
  return {
    sessionId: r.session_id,
    slotExerciseId: r.slot_exercise_id,
    exerciseId: r.exercise_id,
    completedSets: r.completed_sets,
    status: r.status as WorkoutDraftExerciseStatus,
    replacementReason: r.replacement_reason,
    updatedAt: r.updated_at,
  };
}

function mapWorkoutDraftSet(r: WorkoutDraftSetRow): WorkoutDraftSet {
  return {
    sessionId: r.session_id,
    slotExerciseId: r.slot_exercise_id,
    setIndex: r.set_index,
    weight: r.weight,
    reps: r.reps,
    updatedAt: r.updated_at,
  };
}

function getWorkoutDayForLocalDate(date: Date): WorkoutDay {
  switch (date.getDay()) {
    case 1:
    case 2:
      return 'mon';
    case 3:
    case 4:
      return 'wed';
    default:
      return 'fri';
  }
}

// --- Версионирование схемы и пошаговые миграции ------------------------------

/**
 * Один шаг миграции: переводит схему из версии (toVersion - 1) в toVersion.
 * `up` выполняется ВНУТРИ транзакции (при ошибке весь шаг откатывается) и НЕ должен
 * открывать собственную транзакцию. Меняйте структуру так, чтобы НЕ терять данные
 * пользователя (логи, черновики, история).
 */
type Migration = {
  toVersion: number;
  up: (db: SQLite.SQLiteDatabase) => void;
};

/**
 * Список миграций строго по возрастанию версии (1, 2, 3, ...).
 *
 * КАК ДОБАВИТЬ НОВУЮ МИГРАЦИЮ:
 *   1. Допишите В КОНЕЦ массива объект { toVersion: <следующее число>, up: (db) => {...} }.
 *   2. В `up` меняйте схему: ALTER TABLE для добавления колонок (с DEFAULT, чтобы
 *      старые строки остались валидными) или CREATE TABLE для новых таблиц.
 *      Для несовместимых изменений (смена типа/удаление колонки) применяйте паттерн:
 *      создать новую таблицу → INSERT ... SELECT из старой → DROP старой → ALTER RENAME.
 *   3. Больше ничего не трогайте: целевая версия и запуск нужных шагов считаются сами.
 *      УЖЕ ВЫШЕДШИЕ миграции не редактируйте — только добавляйте новые в конец,
 *      иначе у пользователей с прежней версией схема разойдётся.
 */
const MIGRATIONS: Migration[] = [
  {
    // v1 — исходная схема + наполнение программой тренировок.
    toVersion: 1,
    up: (db) => {
      db.execSync(`
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
      seedExercises(db);
    },
  },

  {
    // v2 — необязательная заметка к записи лога.
    // Аддитивно: у существующих записей note получит DEFAULT ''.
    toVersion: 2,
    up: (db) => {
      db.execSync(`ALTER TABLE logs ADD COLUMN note TEXT NOT NULL DEFAULT ''`);
    },
  },

  {
    // v3 — нормализованный черновик тренировки с метаданными сессии.
    // Legacy-таблица draft остаётся на месте для безопасного перехода и отката.
    toVersion: 3,
    up: (db) => {
      db.execSync(`
        CREATE TABLE workout_draft_sessions (
          id              INTEGER PRIMARY KEY NOT NULL,
          workout_date    TEXT    NOT NULL,
          selected_day    TEXT    NOT NULL CHECK (selected_day IN ('mon', 'wed', 'fri')),
          status          TEXT    NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'archived')),
          updated_at      TEXT    NOT NULL,
          legacy_imported INTEGER NOT NULL DEFAULT 0
                                  CHECK (legacy_imported IN (0, 1))
        );

        CREATE UNIQUE INDEX idx_workout_draft_sessions_single_active
          ON workout_draft_sessions (status)
          WHERE status = 'active';

        CREATE TABLE workout_draft_exercises (
          session_id        INTEGER NOT NULL,
          slot_exercise_id  INTEGER NOT NULL,
          exercise_id       INTEGER NOT NULL,
          completed_sets    INTEGER NOT NULL DEFAULT 0 CHECK (completed_sets >= 0),
          status            TEXT    NOT NULL DEFAULT 'not_started'
                                     CHECK (status IN ('not_started', 'in_progress')),
          replacement_reason TEXT,
          updated_at        TEXT    NOT NULL,
          PRIMARY KEY (session_id, slot_exercise_id),
          FOREIGN KEY (session_id) REFERENCES workout_draft_sessions (id)
            ON DELETE CASCADE
        );

        CREATE TABLE workout_draft_sets (
          session_id       INTEGER NOT NULL,
          slot_exercise_id INTEGER NOT NULL,
          set_index        INTEGER NOT NULL CHECK (set_index >= 0),
          weight           REAL,
          reps             INTEGER,
          updated_at       TEXT    NOT NULL,
          PRIMARY KEY (session_id, slot_exercise_id, set_index),
          FOREIGN KEY (session_id, slot_exercise_id)
            REFERENCES workout_draft_exercises (session_id, slot_exercise_id)
            ON DELETE CASCADE
        );
      `);

      const legacyCount = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM draft`
      )?.count ?? 0;
      if (legacyCount === 0) return;

      const now = new Date();
      const updatedAt = now.toISOString();
      const sessionResult = db.runSync(
        `INSERT INTO workout_draft_sessions
           (workout_date, selected_day, status, updated_at, legacy_imported)
         VALUES ($workoutDate, $selectedDay, 'active', $updatedAt, 1)`,
        {
          $workoutDate: todayISO(),
          $selectedDay: getWorkoutDayForLocalDate(now),
          $updatedAt: updatedAt,
        }
      );
      const sessionId = sessionResult.lastInsertRowId;

      db.runSync(
        `INSERT INTO workout_draft_exercises
           (session_id, slot_exercise_id, exercise_id, completed_sets,
            status, replacement_reason, updated_at)
         SELECT $sessionId, exercise_id, exercise_id, 0,
                'in_progress', NULL, $updatedAt
         FROM draft
         GROUP BY exercise_id`,
        { $sessionId: sessionId, $updatedAt: updatedAt }
      );

      db.runSync(
        `INSERT INTO workout_draft_sets
           (session_id, slot_exercise_id, set_index, weight, reps, updated_at)
         SELECT $sessionId, exercise_id, set_index, weight, reps, $updatedAt
         FROM draft`,
        { $sessionId: sessionId, $updatedAt: updatedAt }
      );
    },
  },

  // --- Пример будущей миграции (раскомментируйте и адаптируйте) ---
  // {
  //   toVersion: 4,
  //   up: (db) => {
  //     db.execSync(`ALTER TABLE exercises ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`);
  //   },
  // },
];

/** Актуальная версия схемы — целевая версия последней миграции. */
const SCHEMA_VERSION = MIGRATIONS.length > 0 ? MIGRATIONS[MIGRATIONS.length - 1].toVersion : 0;

// --- Инициализация -----------------------------------------------------------

/**
 * Доводит схему до актуальной версии, применяя недостающие миграции по порядку.
 * Идемпотентна. Можно вызвать явно при старте, но любой запрос инициализирует БД лениво.
 */
export function initDatabase(): void {
  getDb();
}

/** Запускает недостающие миграции по нарастающей. Вызывается лениво из getDb(). */
function migrate(database: SQLite.SQLiteDatabase): void {
  // PRAGMA выполняются ВНЕ транзакции: WAL — надёжность/скорость записи,
  // foreign_keys — контроль ссылочной целостности.
  database.execSync('PRAGMA journal_mode = WAL;');
  database.execSync('PRAGMA foreign_keys = ON;');

  const versionRow = database.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;
  if (currentVersion >= SCHEMA_VERSION) return;

  for (const migration of MIGRATIONS) {
    if (migration.toVersion <= currentVersion) continue;
    // Шаг схемы и фиксация новой версии — атомарно: при ошибке откатывается всё,
    // user_version не сдвинется, и при следующем запуске шаг повторится с чистого листа.
    database.withTransactionSync(() => {
      migration.up(database);
      database.execSync(`PRAGMA user_version = ${migration.toVersion}`);
    });
    currentVersion = migration.toVersion;
  }
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

/**
 * Заполняет таблицу exercises всей программой.
 * Вызывается из миграции v1, которая уже выполняется внутри транзакции,
 * поэтому собственную транзакцию здесь НЕ открываем (вложенные не поддерживаются).
 */
function seedExercises(database: SQLite.SQLiteDatabase): void {
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
}

// --- Вспомогательное ---------------------------------------------------------

/** Сегодняшняя дата в формате 'YYYY-MM-DD' (локальное время). */
export function todayISO(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
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
  const database = getDb();
  database.withTransactionSync(() => {
    newId = insertLog({ exerciseId, date, weight: heaviest.weight, reps: heaviest.reps });
    clearDraftForExerciseRows(database, exerciseId);
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

// --- Нормализованный черновик тренировки -----------------------------------

export function createWorkoutDraftSession(input: {
  workoutDate: string;
  selectedDay: WorkoutDay;
  updatedAt?: string;
  legacyImported?: boolean;
}): WorkoutDraftSession {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const result = getDb().runSync(
    `INSERT INTO workout_draft_sessions
       (workout_date, selected_day, status, updated_at, legacy_imported)
     VALUES ($workoutDate, $selectedDay, 'active', $updatedAt, $legacyImported)`,
    {
      $workoutDate: input.workoutDate,
      $selectedDay: input.selectedDay,
      $updatedAt: updatedAt,
      $legacyImported: input.legacyImported ? 1 : 0,
    }
  );
  return {
    id: result.lastInsertRowId,
    workoutDate: input.workoutDate,
    selectedDay: input.selectedDay,
    status: 'active',
    updatedAt,
    legacyImported: input.legacyImported ?? false,
  };
}

export function getWorkoutDraftSession(sessionId: number): WorkoutDraftSession | null {
  const row = getDb().getFirstSync<WorkoutDraftSessionRow>(
    `SELECT * FROM workout_draft_sessions WHERE id = $sessionId`,
    { $sessionId: sessionId }
  );
  return row ? mapWorkoutDraftSession(row) : null;
}

export function getActiveWorkoutDraftSession(): WorkoutDraftSession | null {
  const row = getDb().getFirstSync<WorkoutDraftSessionRow>(
    `SELECT * FROM workout_draft_sessions WHERE status = 'active' LIMIT 1`
  );
  return row ? mapWorkoutDraftSession(row) : null;
}

export function updateWorkoutDraftSession(
  sessionId: number,
  updates: {
    selectedDay?: WorkoutDay;
    status?: WorkoutDraftSessionStatus;
    updatedAt?: string;
  }
): void {
  const current = getWorkoutDraftSession(sessionId);
  if (!current) return;

  getDb().runSync(
    `UPDATE workout_draft_sessions
     SET selected_day = $selectedDay,
         status = $status,
         updated_at = $updatedAt
     WHERE id = $sessionId`,
    {
      $sessionId: sessionId,
      $selectedDay: updates.selectedDay ?? current.selectedDay,
      $status: updates.status ?? current.status,
      $updatedAt: updates.updatedAt ?? new Date().toISOString(),
    }
  );
}

export function deleteWorkoutDraftSession(sessionId: number): void {
  const database = getDb();
  database.withTransactionSync(() => {
    const session = database.getFirstSync<WorkoutDraftSessionRow>(
      `SELECT * FROM workout_draft_sessions WHERE id = $sessionId`,
      { $sessionId: sessionId }
    );
    if (!session) return;

    if (session.status === 'active') {
      database.runSync(`DELETE FROM draft`);
    }
    database.runSync(`DELETE FROM workout_draft_sessions WHERE id = $sessionId`, {
      $sessionId: sessionId,
    });
  });
}

export function saveWorkoutDraftExercise(exercise: WorkoutDraftExercise): void {
  getDb().runSync(
    `INSERT INTO workout_draft_exercises
       (session_id, slot_exercise_id, exercise_id, completed_sets,
        status, replacement_reason, updated_at)
     VALUES ($sessionId, $slotExerciseId, $exerciseId, $completedSets,
             $status, $replacementReason, $updatedAt)
     ON CONFLICT (session_id, slot_exercise_id)
     DO UPDATE SET
       exercise_id = excluded.exercise_id,
       completed_sets = excluded.completed_sets,
       status = excluded.status,
       replacement_reason = excluded.replacement_reason,
       updated_at = excluded.updated_at`,
    {
      $sessionId: exercise.sessionId,
      $slotExerciseId: exercise.slotExerciseId,
      $exerciseId: exercise.exerciseId,
      $completedSets: exercise.completedSets,
      $status: exercise.status,
      $replacementReason: exercise.replacementReason,
      $updatedAt: exercise.updatedAt,
    }
  );
}

export function getWorkoutDraftExercises(sessionId: number): WorkoutDraftExercise[] {
  const rows = getDb().getAllSync<WorkoutDraftExerciseRow>(
    `SELECT * FROM workout_draft_exercises
     WHERE session_id = $sessionId
     ORDER BY slot_exercise_id`,
    { $sessionId: sessionId }
  );
  return rows.map(mapWorkoutDraftExercise);
}

export function deleteWorkoutDraftExercise(sessionId: number, slotExerciseId: number): void {
  const database = getDb();
  database.withTransactionSync(() => {
    const session = database.getFirstSync<WorkoutDraftSessionRow>(
      `SELECT * FROM workout_draft_sessions WHERE id = $sessionId`,
      { $sessionId: sessionId }
    );
    database.runSync(
      `DELETE FROM workout_draft_exercises
       WHERE session_id = $sessionId AND slot_exercise_id = $slotExerciseId`,
      { $sessionId: sessionId, $slotExerciseId: slotExerciseId }
    );
    if (session?.status === 'active') {
      database.runSync(`DELETE FROM draft WHERE exercise_id = $exerciseId`, {
        $exerciseId: slotExerciseId,
      });
    }
  });
}

export function saveWorkoutDraftSet(set: WorkoutDraftSet): void {
  const database = getDb();
  database.withTransactionSync(() => {
    database.runSync(
      `INSERT INTO workout_draft_sets
         (session_id, slot_exercise_id, set_index, weight, reps, updated_at)
       VALUES ($sessionId, $slotExerciseId, $setIndex, $weight, $reps, $updatedAt)
       ON CONFLICT (session_id, slot_exercise_id, set_index)
       DO UPDATE SET
         weight = excluded.weight,
         reps = excluded.reps,
         updated_at = excluded.updated_at`,
      {
        $sessionId: set.sessionId,
        $slotExerciseId: set.slotExerciseId,
        $setIndex: set.setIndex,
        $weight: set.weight,
        $reps: set.reps,
        $updatedAt: set.updatedAt,
      }
    );

    const session = database.getFirstSync<WorkoutDraftSessionRow>(
      `SELECT * FROM workout_draft_sessions WHERE id = $sessionId`,
      { $sessionId: set.sessionId }
    );
    if (session?.status === 'active') {
      upsertLegacyDraftSet(database, {
        exerciseId: set.slotExerciseId,
        setIndex: set.setIndex,
        weight: set.weight,
        reps: set.reps,
      });
    }
  });
}

export function getWorkoutDraftSets(
  sessionId: number,
  slotExerciseId: number
): WorkoutDraftSet[] {
  const rows = getDb().getAllSync<WorkoutDraftSetRow>(
    `SELECT * FROM workout_draft_sets
     WHERE session_id = $sessionId AND slot_exercise_id = $slotExerciseId
     ORDER BY set_index`,
    { $sessionId: sessionId, $slotExerciseId: slotExerciseId }
  );
  return rows.map(mapWorkoutDraftSet);
}

export function deleteWorkoutDraftSet(
  sessionId: number,
  slotExerciseId: number,
  setIndex: number
): void {
  const database = getDb();
  database.withTransactionSync(() => {
    database.runSync(
      `DELETE FROM workout_draft_sets
       WHERE session_id = $sessionId
         AND slot_exercise_id = $slotExerciseId
         AND set_index = $setIndex`,
      {
        $sessionId: sessionId,
        $slotExerciseId: slotExerciseId,
        $setIndex: setIndex,
      }
    );
    const session = database.getFirstSync<WorkoutDraftSessionRow>(
      `SELECT * FROM workout_draft_sessions WHERE id = $sessionId`,
      { $sessionId: sessionId }
    );
    if (session?.status === 'active') {
      database.runSync(
        `DELETE FROM draft WHERE exercise_id = $exerciseId AND set_index = $setIndex`,
        { $exerciseId: slotExerciseId, $setIndex: setIndex }
      );
    }
  });
}

// --- Черновик (текущий незавершённый ввод) ----------------------------------

function upsertLegacyDraftSet(database: SQLite.SQLiteDatabase, draft: DraftSet): void {
  database.runSync(
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

function saveNormalizedDraftSetFromLegacyInput(
  database: SQLite.SQLiteDatabase,
  draft: DraftSet,
  updatedAt: string
): void {
  const exercise = database.getFirstSync<{ day: string }>(
    `SELECT day FROM exercises WHERE id = $exerciseId`,
    { $exerciseId: draft.exerciseId }
  );
  if (!exercise) return;

  let session = database.getFirstSync<WorkoutDraftSessionRow>(
    `SELECT * FROM workout_draft_sessions WHERE status = 'active' LIMIT 1`
  );
  if (!session) {
    const result = database.runSync(
      `INSERT INTO workout_draft_sessions
         (workout_date, selected_day, status, updated_at, legacy_imported)
       VALUES ($workoutDate, $selectedDay, 'active', $updatedAt, 0)`,
      {
        $workoutDate: todayISO(),
        $selectedDay: exercise.day,
        $updatedAt: updatedAt,
      }
    );
    session = {
      id: result.lastInsertRowId,
      workout_date: todayISO(),
      selected_day: exercise.day,
      status: 'active',
      updated_at: updatedAt,
      legacy_imported: 0,
    };
  } else {
    database.runSync(
      `UPDATE workout_draft_sessions
       SET selected_day = $selectedDay, updated_at = $updatedAt
       WHERE id = $sessionId`,
      {
        $sessionId: session.id,
        $selectedDay: exercise.day,
        $updatedAt: updatedAt,
      }
    );
  }

  database.runSync(
    `INSERT INTO workout_draft_exercises
       (session_id, slot_exercise_id, exercise_id, completed_sets,
        status, replacement_reason, updated_at)
     VALUES ($sessionId, $exerciseId, $exerciseId, 0,
             'in_progress', NULL, $updatedAt)
     ON CONFLICT (session_id, slot_exercise_id)
     DO UPDATE SET
       exercise_id = excluded.exercise_id,
       status = 'in_progress',
       updated_at = excluded.updated_at`,
    {
      $sessionId: session.id,
      $exerciseId: draft.exerciseId,
      $updatedAt: updatedAt,
    }
  );

  database.runSync(
    `INSERT INTO workout_draft_sets
       (session_id, slot_exercise_id, set_index, weight, reps, updated_at)
     VALUES ($sessionId, $exerciseId, $setIndex, $weight, $reps, $updatedAt)
     ON CONFLICT (session_id, slot_exercise_id, set_index)
     DO UPDATE SET
       weight = excluded.weight,
       reps = excluded.reps,
       updated_at = excluded.updated_at`,
    {
      $sessionId: session.id,
      $exerciseId: draft.exerciseId,
      $setIndex: draft.setIndex,
      $weight: draft.weight,
      $reps: draft.reps,
      $updatedAt: updatedAt,
    }
  );
}

function clearDraftForExerciseRows(
  database: SQLite.SQLiteDatabase,
  exerciseId: number
): void {
  database.runSync(`DELETE FROM draft WHERE exercise_id = $id`, { $id: exerciseId });
  database.runSync(
    `DELETE FROM workout_draft_exercises
     WHERE slot_exercise_id = $id
       AND session_id IN (
         SELECT id FROM workout_draft_sessions WHERE status = 'active'
       )`,
    { $id: exerciseId }
  );
}

/** Сохраняет/обновляет ввод одного подхода (upsert по exercise_id + set_index). */
export function saveDraftSet(draft: DraftSet): void {
  const database = getDb();
  const updatedAt = new Date().toISOString();
  database.withTransactionSync(() => {
    upsertLegacyDraftSet(database, draft);
    saveNormalizedDraftSetFromLegacyInput(database, draft, updatedAt);
  });
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
  const database = getDb();
  database.withTransactionSync(() => {
    clearDraftForExerciseRows(database, exerciseId);
  });
}

/** Очищает весь черновик (например, при завершении тренировки). */
export function clearAllDrafts(): void {
  const database = getDb();
  database.withTransactionSync(() => {
    database.runSync(`DELETE FROM draft`);
    database.runSync(`DELETE FROM workout_draft_sessions WHERE status = 'active'`);
  });
}
