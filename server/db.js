// Plaza's data on this Mac: one SQLite file (data/plaza.db by default, or
// PLAZA_DB). Each district's store is one row, its whole state as JSON, so
// the districts keep working the way they did with localStorage.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS stores (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  const all = db.prepare('SELECT key, value FROM stores');
  const put = db.prepare(`
    INSERT INTO stores (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  return {
    // every store at once: the page reads them all before it starts
    stores: () => Object.fromEntries(all.all().map(({ key, value }) => [key, JSON.parse(value)])),
    save: (key, value) => put.run(key, JSON.stringify(value), Date.now()),
  };
}
