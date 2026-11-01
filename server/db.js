// Plaza's data on this Mac: one SQLite file (data/plaza.db by default, or
// PLAZA_DB). Each district's store is one row, its whole state as JSON, so
// the districts keep working the way they did with localStorage. Secrets
// (logins to other services) and synced bank data have tables of their own,
// and never go out through /api/stores.
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
    CREATE TABLE IF NOT EXISTS secrets (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    -- what the bank sync brought in: connections, accounts, transactions and
    -- card bills, each the provider's own object as JSON
    CREATE TABLE IF NOT EXISTS bank (
      kind   TEXT NOT NULL,
      id     TEXT NOT NULL,
      parent TEXT,
      date   TEXT,
      json   TEXT NOT NULL,
      PRIMARY KEY (kind, id)
    );
    CREATE INDEX IF NOT EXISTS bank_by_date ON bank (kind, date);
  `);
  const all = db.prepare('SELECT key, value FROM stores');
  const put = db.prepare(`
    INSERT INTO stores (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const getSecret = db.prepare('SELECT value FROM secrets WHERE key = ?');
  const putSecret = db.prepare('INSERT INTO secrets (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value');
  const dropSecret = db.prepare('DELETE FROM secrets WHERE key = ?');
  const putBank = db.prepare(`
    INSERT INTO bank (kind, id, parent, date, json) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (kind, id) DO UPDATE SET parent = excluded.parent, date = excluded.date, json = excluded.json
  `);
  const bankOf = db.prepare('SELECT json FROM bank WHERE kind = ? ORDER BY date DESC');
  const bankSince = db.prepare('SELECT json FROM bank WHERE kind = ? AND date >= ? ORDER BY date DESC');
  const dropBank = db.prepare('DELETE FROM bank WHERE kind = ?');
  return {
    // every store at once: the page reads them all before it starts
    stores: () => Object.fromEntries(all.all().map(({ key, value }) => [key, JSON.parse(value)])),
    save: (key, value) => put.run(key, JSON.stringify(value), Date.now()),

    secret: (key) => { const row = getSecret.get(key); return row ? JSON.parse(row.value) : undefined; },
    setSecret: (key, value) => (value === undefined ? dropSecret.run(key) : putSecret.run(key, JSON.stringify(value))),

    bank: {
      put: (kind, id, parent, date, obj) => putBank.run(kind, String(id), parent ?? null, date ?? null, JSON.stringify(obj)),
      all: (kind, since) => (since ? bankSince.all(kind, since) : bankOf.all(kind)).map((r) => JSON.parse(r.json)),
      clear: (kind) => dropBank.run(kind),
      // several writes as one, so a sync is never half saved
      batch(fn) {
        db.exec('BEGIN');
        try { fn(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
      },
    },
  };
}
