import fs from 'fs';
import path from 'path';
import { SQLiteDatabase, DB_PATH } from './sqlite.js';

export function resetDatabase() {
  console.log('[DB] Resetting VYRO SQLite Database...');

  // Try unlinking if not locked
  const filesToRemove = [
    DB_PATH,
    `${DB_PATH}-wal`,
    `${DB_PATH}-shm`
  ];

  let unlinked = true;
  for (const file of filesToRemove) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`[DB] Removed: ${file}`);
      } catch (err: any) {
        unlinked = false;
      }
    }
  }

  // If unlinking succeeded, instantiate new SQLiteDatabase to run fresh migrations
  // If unlinking failed due to active server file lock, open DB and truncate all tables
  const dbWrapper = new SQLiteDatabase();
  const db = dbWrapper.db;

  if (!unlinked) {
    console.log('[DB] Server holds file lock; executing clean database truncation...');
    db.exec(`
      DELETE FROM sessions;
      DELETE FROM audit_logs;
      DELETE FROM tuning_overrides;
      DELETE FROM review_queue;
      DELETE FROM transactions;
      DELETE FROM agreements;
      DELETE FROM proposals;
      DELETE FROM negotiations;
      DELETE FROM requests;
      DELETE FROM listings;
      DELETE FROM agents;
      DELETE FROM memory_items;
      DELETE FROM activity_events;
      DELETE FROM notifications;
      DELETE FROM reviews;
      DELETE FROM decisions;
      DELETE FROM users;
      VACUUM;
    `);
  }

  console.log('[DB] All database tables cleared and migrations verified. Database is completely empty.');
  dbWrapper.db.close();
}

if (process.argv[1] && process.argv[1].endsWith('reset.ts')) {
  resetDatabase();
  process.exit(0);
}
