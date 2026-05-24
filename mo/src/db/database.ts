import { open, type DB } from '@op-engineering/op-sqlite';
import { storagePaths } from '../storage/paths';
import { CREATE_TABLES_SQL, DATABASE_VERSION } from './schema';

let database: DB | null = null;

export const getDatabase = (): DB => {
  if (!database) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  return database;
};

export const initDatabase = async (): Promise<DB> => {
  if (database) {
    return database;
  }

  if (!storagePaths.data) {
    throw new Error('Storage paths not initialized. Call initializeStoragePaths() first.');
  }

  database = open({
    name: 'nexio.db',
    location: storagePaths.data,
  });

  const statements = CREATE_TABLES_SQL.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const sql of statements) {
    await database.execute(sql);
  }

  const versionRow = await database.execute(
    "SELECT value FROM settings WHERE key = 'db_version'",
  );

  if (versionRow.rows.length === 0) {
    await database.execute("INSERT INTO settings (key, value) VALUES ('db_version', ?)", [
      String(DATABASE_VERSION),
    ]);
  }

  console.log('[NexioAI] SQLite ready:', storagePaths.databaseFile);

  return database;
};
