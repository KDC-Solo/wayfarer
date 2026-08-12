import { SCHEMA_VERSION, type Chronicle, type LogEntry } from './types.ts';
import type { OracleTable } from './oracleTable.ts';
import {
  appendLogEntry,
  clearAll,
  getAllLogEntries,
  getAllOracleTables,
  getChronicle,
  putChronicle,
  putOracleTable,
} from './persistence.ts';

/**
 * Full application state as a single portable JSON document (F6.4, N5).
 * Step templates and dice packs aren't modeled yet (Phases 3/7) — the
 * envelope shape reserves room for them so the format doesn't need a
 * breaking change when they land.
 */
export interface StateEnvelope {
  format: 'wayfarer-export';
  schemaVersion: number;
  exportedAt: string;
  chronicle: Chronicle;
  log: LogEntry[];
  oracleTables: OracleTable[];
}

export class ImportError extends Error {}

export async function exportState(): Promise<StateEnvelope> {
  const chronicle = await getChronicle();
  if (!chronicle) throw new Error('No chronicle to export — nothing has been created yet.');
  const log = await getAllLogEntries();
  const oracleTables = await getAllOracleTables();
  return {
    format: 'wayfarer-export',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    chronicle,
    log,
    oracleTables,
  };
}

export function serializeState(envelope: StateEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

export function parseStateEnvelope(json: string): StateEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ImportError('File is not valid JSON.');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Record<string, unknown>).format !== 'wayfarer-export'
  ) {
    throw new ImportError('File is not a Wayfarer export.');
  }
  const envelope = parsed as StateEnvelope;
  if (typeof envelope.schemaVersion !== 'number' || envelope.schemaVersion > SCHEMA_VERSION) {
    throw new ImportError(
      `Export was made by a newer version of the app (schema ${envelope.schemaVersion}, this app supports up to ${SCHEMA_VERSION}).`,
    );
  }
  if (!envelope.chronicle || !Array.isArray(envelope.log)) {
    throw new ImportError('Export is missing chronicle or log data.');
  }
  return envelope;
}

/** Replaces local state with the imported envelope's chronicle, log, and oracle tables. */
export async function importState(json: string): Promise<void> {
  const envelope = parseStateEnvelope(json);
  await clearAll();
  await putChronicle(envelope.chronicle);
  for (const entry of envelope.log) {
    await appendLogEntry(entry);
  }
  for (const table of envelope.oracleTables ?? []) {
    await putOracleTable(table);
  }
}
