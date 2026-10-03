import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Open (or return cached) the FAWA SQLite database.
 * The WAL journal mode is enabled for concurrent read performance.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('fawa.db');
  // Enable WAL for better concurrent read performance
  await _db.execAsync('PRAGMA journal_mode=WAL;');
  return _db;
}

export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}
