import type { SQLiteDatabase } from 'expo-sqlite';

interface Migration {
  version: number;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS user_profile (
        id             TEXT PRIMARY KEY,
        name           TEXT NOT NULL,
        age            INTEGER NOT NULL,
        sex            TEXT,
        height_cm      REAL NOT NULL,
        weight_kg      REAL NOT NULL,
        waist_cm       REAL NOT NULL,
        bmi            REAL NOT NULL,
        bmi_band       TEXT,
        level          TEXT NOT NULL DEFAULT 'beginner',
        has_condition  INTEGER NOT NULL DEFAULT 0,
        equipment      TEXT NOT NULL DEFAULT '[]',
        wake_time      TEXT NOT NULL DEFAULT '06:00',
        workout_time   TEXT NOT NULL DEFAULT '07:00',
        sleep_goal_hours INTEGER NOT NULL DEFAULT 8,
        start_date     TEXT NOT NULL,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plan_days (
        id             TEXT PRIMARY KEY,
        day_number     INTEGER NOT NULL UNIQUE,
        date           TEXT NOT NULL,
        type           TEXT NOT NULL,
        phase          TEXT NOT NULL,
        session_label  TEXT NOT NULL,
        notes          TEXT NOT NULL DEFAULT '[]',
        exercises      TEXT NOT NULL DEFAULT '[]',
        is_completed   INTEGER NOT NULL DEFAULT 0,
        completed_at   TEXT
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id                   TEXT PRIMARY KEY,
        name                 TEXT NOT NULL,
        muscle_group         TEXT NOT NULL,
        equipment_tier       INTEGER NOT NULL DEFAULT 0,
        impact               TEXT NOT NULL DEFAULT 'none',
        type                 TEXT NOT NULL DEFAULT 'reps',
        beginner_day1        TEXT NOT NULL DEFAULT '{}',
        beginner_day60       TEXT NOT NULL DEFAULT '{}',
        intermediate_day1    TEXT NOT NULL DEFAULT '{}',
        intermediate_day60   TEXT NOT NULL DEFAULT '{}',
        easier_id            TEXT,
        harder_id            TEXT,
        substitutions        TEXT NOT NULL DEFAULT '{}',
        bmi_restrictions     TEXT NOT NULL DEFAULT '{}',
        cues                 TEXT NOT NULL DEFAULT '[]',
        common_mistake       TEXT NOT NULL DEFAULT '',
        image_ref            TEXT,
        is_custom            INTEGER NOT NULL DEFAULT 0,
        created_at           TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workout_logs (
        id               TEXT PRIMARY KEY,
        plan_day_id      TEXT NOT NULL,
        day_number       INTEGER NOT NULL,
        started_at       TEXT NOT NULL,
        completed_at     TEXT,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        exercise_logs    TEXT NOT NULL DEFAULT '[]',
        session_rpe      INTEGER,
        notes            TEXT,
        pain_event_logged INTEGER NOT NULL DEFAULT 0,
        is_partial       INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS test_results (
        id                  TEXT PRIMARY KEY,
        day_number          INTEGER NOT NULL,
        date                TEXT NOT NULL,
        two_km_time_seconds INTEGER,
        max_push_ups        INTEGER,
        push_up_variation   TEXT,
        squats_in_60s       INTEGER,
        plank_seconds       INTEGER,
        wall_sit_seconds    INTEGER,
        dead_hang_seconds   INTEGER,
        inverted_rows       INTEGER,
        pull_ups            INTEGER,
        resting_heart_rate  INTEGER,
        weight_kg           REAL,
        waist_cm            REAL,
        photo_front         TEXT,
        photo_side          TEXT,
        photo_back          TEXT,
        notes               TEXT,
        created_at          TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS body_metrics (
        id                 TEXT PRIMARY KEY,
        date               TEXT NOT NULL,
        weight_kg          REAL,
        waist_cm           REAL,
        resting_heart_rate INTEGER,
        created_at         TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id           TEXT PRIMARY KEY,
        kind         TEXT NOT NULL,
        title        TEXT NOT NULL,
        body         TEXT NOT NULL,
        fire_time    TEXT,
        repeat_rule  TEXT NOT NULL DEFAULT '{"type":"once"}',
        priority     TEXT NOT NULL DEFAULT 'gentle',
        sound        TEXT NOT NULL DEFAULT 'gentle',
        vibration    INTEGER NOT NULL DEFAULT 1,
        snooze_mins  INTEGER NOT NULL DEFAULT 10,
        linked_entity TEXT,
        enabled      INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL,
        last_fired_at TEXT,
        status       TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS reminder_events (
        id           TEXT PRIMARY KEY,
        reminder_id  TEXT NOT NULL,
        fired_at     TEXT NOT NULL,
        action       TEXT NOT NULL,
        snooze_until TEXT,
        created_at   TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id                    TEXT PRIMARY KEY,
        type                  TEXT NOT NULL DEFAULT 'text',
        text                  TEXT NOT NULL DEFAULT '',
        checklist_items       TEXT NOT NULL DEFAULT '[]',
        remind_at             TEXT,
        priority              TEXT NOT NULL DEFAULT 'gentle',
        attached_to           TEXT,
        done                  INTEGER NOT NULL DEFAULT 0,
        pinned                INTEGER NOT NULL DEFAULT 0,
        timer_seconds         INTEGER,
        timer_started_at      TEXT,
        countdown_reminder_id TEXT,
        created_at            TEXT NOT NULL,
        updated_at            TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sleep_logs (
        id            TEXT PRIMARY KEY,
        date          TEXT NOT NULL,
        in_bed_at     TEXT,
        woke_at       TEXT,
        duration_hours REAL,
        quality       INTEGER,
        created_at    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hydration_logs (
        id             TEXT PRIMARY KEY,
        date           TEXT NOT NULL UNIQUE,
        glasses_logged INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS readiness_checks (
        id                 TEXT PRIMARY KEY,
        date               TEXT NOT NULL UNIQUE,
        sleep_quality      INTEGER NOT NULL,
        soreness           INTEGER NOT NULL,
        mood               INTEGER NOT NULL,
        override_and_train INTEGER NOT NULL DEFAULT 0,
        outcome            TEXT NOT NULL,
        created_at         TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
        id          TEXT PRIMARY KEY,
        after_phase TEXT NOT NULL,
        day_number  INTEGER NOT NULL,
        outcome     TEXT NOT NULL,
        percent_hit REAL NOT NULL,
        metrics     TEXT NOT NULL DEFAULT '{}',
        explanation TEXT NOT NULL,
        applied_at  TEXT NOT NULL,
        created_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS photo_refs (
        id              TEXT PRIMARY KEY,
        path            TEXT NOT NULL,
        angle           TEXT NOT NULL,
        date            TEXT NOT NULL,
        test_day_number INTEGER,
        created_at      TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS walk_run_state (
        id                   TEXT PRIMARY KEY DEFAULT 'singleton',
        current_rung         INTEGER NOT NULL DEFAULT 0,
        consecutive_low_rpe  INTEGER NOT NULL DEFAULT 0,
        last_updated         TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );

      INSERT OR IGNORE INTO schema_version (version) VALUES (0);
    `,
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Ensure schema_version table exists first
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
    INSERT OR IGNORE INTO schema_version (version) VALUES (0);
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1',
  );
  let currentVersion = row?.version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      await db.execAsync(migration.sql);
      await db.runAsync('UPDATE schema_version SET version = ?', [migration.version]);
      currentVersion = migration.version;
    }
  }
}

export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
