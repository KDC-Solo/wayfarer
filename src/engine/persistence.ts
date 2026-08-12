import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Chronicle, LogEntry } from './types.ts';
import type { OracleTable } from './oracleTable.ts';
import type { StepTemplate } from './stepTemplate.ts';
import type { Journey, Route } from './journey.ts';
import type { FellowshipPhase } from './fellowshipPhase.ts';

// IndexedDB for chronicle + log + oracle tables + step templates + journeys
// + routes + Fellowship phases (PRD §9 — volume grows unbounded over a
// campaign); localStorage is reserved for small settings only. One
// database = one campaign; the app does not manage multiple chronicles.

const DB_NAME = 'wayfarer';
const DB_VERSION = 4;
const CHRONICLE_STORE = 'chronicle';
const LOG_STORE = 'log';
const ORACLE_TABLE_STORE = 'oracleTables';
const STEP_TEMPLATE_STORE = 'stepTemplates';
const JOURNEY_STORE = 'journeys';
const ROUTE_STORE = 'routes';
const FELLOWSHIP_PHASE_STORE = 'fellowshipPhases';
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
  [ORACLE_TABLE_STORE]: {
    key: string;
    value: OracleTable;
  };
  [STEP_TEMPLATE_STORE]: {
    key: string;
    value: StepTemplate;
  };
  [JOURNEY_STORE]: {
    key: string;
    value: Journey;
  };
  [ROUTE_STORE]: {
    key: string;
    value: Route;
  };
  [FELLOWSHIP_PHASE_STORE]: {
    key: string;
    value: FellowshipPhase;
  };
}

let dbPromise: Promise<IDBPDatabase<WayfarerDB>> | null = null;

function getDb(): Promise<IDBPDatabase<WayfarerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WayfarerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(CHRONICLE_STORE);
          const logStore = db.createObjectStore(LOG_STORE, { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp');
          logStore.createIndex('sessionId', 'sessionId');
        }
        if (oldVersion < 2) {
          db.createObjectStore(ORACLE_TABLE_STORE, { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          db.createObjectStore(STEP_TEMPLATE_STORE, { keyPath: 'id' });
          db.createObjectStore(JOURNEY_STORE, { keyPath: 'id' });
          db.createObjectStore(ROUTE_STORE, { keyPath: 'id' });
        }
        if (oldVersion < 4) {
          db.createObjectStore(FELLOWSHIP_PHASE_STORE, { keyPath: 'id' });
        }
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

export async function getAllOracleTables(): Promise<OracleTable[]> {
  const db = await getDb();
  return db.getAll(ORACLE_TABLE_STORE);
}

export async function putOracleTable(table: OracleTable): Promise<void> {
  const db = await getDb();
  await db.put(ORACLE_TABLE_STORE, table);
}

export async function deleteOracleTable(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(ORACLE_TABLE_STORE, id);
}

export async function getAllStepTemplates(): Promise<StepTemplate[]> {
  const db = await getDb();
  return db.getAll(STEP_TEMPLATE_STORE);
}

export async function putStepTemplate(template: StepTemplate): Promise<void> {
  const db = await getDb();
  await db.put(STEP_TEMPLATE_STORE, template);
}

export async function deleteStepTemplate(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STEP_TEMPLATE_STORE, id);
}

export async function getAllJourneys(): Promise<Journey[]> {
  const db = await getDb();
  return db.getAll(JOURNEY_STORE);
}

export async function putJourney(journey: Journey): Promise<void> {
  const db = await getDb();
  await db.put(JOURNEY_STORE, journey);
}

export async function getAllRoutes(): Promise<Route[]> {
  const db = await getDb();
  return db.getAll(ROUTE_STORE);
}

export async function putRoute(route: Route): Promise<void> {
  const db = await getDb();
  await db.put(ROUTE_STORE, route);
}

export async function deleteRoute(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(ROUTE_STORE, id);
}

export async function getAllFellowshipPhases(): Promise<FellowshipPhase[]> {
  const db = await getDb();
  return db.getAll(FELLOWSHIP_PHASE_STORE);
}

export async function putFellowshipPhase(phase: FellowshipPhase): Promise<void> {
  const db = await getDb();
  await db.put(FELLOWSHIP_PHASE_STORE, phase);
}

/** Full local-state reset. Used by tests and by a future "start new campaign" flow. */
export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear(CHRONICLE_STORE);
  await db.clear(LOG_STORE);
  await db.clear(ORACLE_TABLE_STORE);
  await db.clear(STEP_TEMPLATE_STORE);
  await db.clear(JOURNEY_STORE);
  await db.clear(ROUTE_STORE);
  await db.clear(FELLOWSHIP_PHASE_STORE);
}
