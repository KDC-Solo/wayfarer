import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Chronicle, LogEntry } from './types.ts';
import type { OracleTable } from './oracleTable.ts';
import type { StepTemplate } from './stepTemplate.ts';
import type { Journey, Route } from './journey.ts';
import type { FellowshipPhase } from './fellowshipPhase.ts';
import type { Combat } from './combat.ts';
import type { LoreTable } from './loreTable.ts';
import type { DicePack } from './dicePack.ts';

// IndexedDB for chronicle + log + oracle tables + step templates + journeys
// + routes + Fellowship phases (PRD §9 — volume grows unbounded over a
// campaign); localStorage is reserved for small settings only. One
// database = one campaign; the app does not manage multiple chronicles.

const DB_NAME = 'wayfarer';
const DB_VERSION = 7;
const CHRONICLE_STORE = 'chronicle';
const LOG_STORE = 'log';
const ORACLE_TABLE_STORE = 'oracleTables';
const STEP_TEMPLATE_STORE = 'stepTemplates';
const JOURNEY_STORE = 'journeys';
const ROUTE_STORE = 'routes';
const FELLOWSHIP_PHASE_STORE = 'fellowshipPhases';
const COMBAT_STORE = 'combats';
const LORE_TABLE_STORE = 'loreTables';
const DICE_PACK_STORE = 'dicePacks';
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
  [COMBAT_STORE]: {
    key: string;
    value: Combat;
  };
  [LORE_TABLE_STORE]: {
    key: string;
    value: LoreTable;
  };
  [DICE_PACK_STORE]: {
    key: string;
    value: DicePack;
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
        if (oldVersion < 5) {
          db.createObjectStore(COMBAT_STORE, { keyPath: 'id' });
        }
        if (oldVersion < 6) {
          db.createObjectStore(LORE_TABLE_STORE, { keyPath: 'id' });
        }
        if (oldVersion < 7) {
          db.createObjectStore(DICE_PACK_STORE, { keyPath: 'id' });
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

export async function getAllCombats(): Promise<Combat[]> {
  const db = await getDb();
  return db.getAll(COMBAT_STORE);
}

export async function putCombat(combat: Combat): Promise<void> {
  const db = await getDb();
  await db.put(COMBAT_STORE, combat);
}

export async function getAllLoreTables(): Promise<LoreTable[]> {
  const db = await getDb();
  return db.getAll(LORE_TABLE_STORE);
}

export async function putLoreTable(table: LoreTable): Promise<void> {
  const db = await getDb();
  await db.put(LORE_TABLE_STORE, table);
}

export async function deleteLoreTable(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(LORE_TABLE_STORE, id);
}

export async function getAllDicePacks(): Promise<DicePack[]> {
  const db = await getDb();
  return db.getAll(DICE_PACK_STORE);
}

export async function putDicePack(pack: DicePack): Promise<void> {
  const db = await getDb();
  await db.put(DICE_PACK_STORE, pack);
}

export async function deleteDicePack(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(DICE_PACK_STORE, id);
}

/**
 * Clears everything belonging to the *campaign* — the chronicle, the
 * log, and every run through it — while keeping the content the player
 * authored: their transcribed oracle and Lore tables, step templates,
 * and dice packs.
 *
 * That split is the whole point of a "new campaign" command. Table text
 * copied out of your own rulebook is expensive to produce and applies
 * to every campaign you will ever run; a chronicle belongs to exactly
 * one. Wiping both would make starting a second campaign as costly as
 * starting the first.
 */
export async function clearPlayData(): Promise<void> {
  const db = await getDb();
  await db.clear(CHRONICLE_STORE);
  await db.clear(LOG_STORE);
  await db.clear(JOURNEY_STORE);
  await db.clear(ROUTE_STORE);
  await db.clear(FELLOWSHIP_PHASE_STORE);
  await db.clear(COMBAT_STORE);
}

/** Full local-state reset — play data *and* authored content. */
export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear(CHRONICLE_STORE);
  await db.clear(LOG_STORE);
  await db.clear(ORACLE_TABLE_STORE);
  await db.clear(STEP_TEMPLATE_STORE);
  await db.clear(JOURNEY_STORE);
  await db.clear(ROUTE_STORE);
  await db.clear(FELLOWSHIP_PHASE_STORE);
  await db.clear(COMBAT_STORE);
  await db.clear(LORE_TABLE_STORE);
  await db.clear(DICE_PACK_STORE);
}
