import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Chronicle, LogEntry } from './types.ts';

// IndexedDB for chronicle + log (PRD §9 — volume grows unbounded over a
// campaign); localStorage is reserved for small settings only (see settings.ts).
// One database = one campaign; the app does not manage multiple chronicles.

const DB_NAME = 'wayfarer';
const DB_VERSION = 1;
const CHRONICLE_STORE = 'chronicle';
const LOG_STORE = 'log';
const SINGLETON_KEY = 'current';

interface WayfarerDB extends DBSchema {
  [CHRONICLE_STORE]: {
    key: string;
    value: Chronicle;
  };
  [LOG_STORE]: {
    key: string;
    value: LogEntry;
    indexes: { timestamp: string; sessionId: string };
  };
}

let dbPromise: Promise<IDBPDatabase<WayfarerDB>> | null = null;

function getDb(): Promise<IDBPDatabase<WayfarerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WayfarerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(CHRONICLE_STORE);
        const logStore = db.createObjectStore(LOG_STORE, { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp');
        logStore.createIndex('sessionId', 'sessionId');
      },
    });
  }
  return dbPromise;
}

export async function getChronicle(): Promise<Chronicle | undefined> {
  const db = await getDb();
  return db.get(CHRONICLE_STORE, SINGLETON_KEY);
}

export async function putChronicle(chronicle: Chronicle): Promise<void> {
  const db = await getDb();
  await db.put(CHRONICLE_STORE, chronicle, SINGLETON_KEY);
}

/** The only way to add a log entry — there is deliberately no update/delete
 * for the log store; it is append-only (PRD §9, D7). Undo (F1.17) is
 * implemented by appending a compensating entry, not by mutating history. */
export async function appendLogEntry(entry: LogEntry): Promise<void> {
  const db = await getDb();
  await db.add(LOG_STORE, entry);
}

export async function getAllLogEntries(): Promise<LogEntry[]> {
  const db = await getDb();
  return db.getAll(LOG_STORE);
}

/** Full local-state reset. Used by tests and by a future "start new campaign" flow. */
export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear(CHRONICLE_STORE);
  await db.clear(LOG_STORE);
}
