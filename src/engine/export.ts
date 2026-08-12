import { SCHEMA_VERSION, type Chronicle, type LogEntry } from './types.ts';
import type { OracleTable } from './oracleTable.ts';
import type { StepTemplate } from './stepTemplate.ts';
import type { Journey, Route } from './journey.ts';
import {
  appendLogEntry,
  clearAll,
  getAllJourneys,
  getAllLogEntries,
  getAllOracleTables,
  getAllRoutes,
  getAllStepTemplates,
  getChronicle,
  putChronicle,
  putJourney,
  putOracleTable,
  putRoute,
  putStepTemplate,
} from './persistence.ts';

/**
 * Full application state as a single portable JSON document (F6.4, N5).
 * Dice packs aren't modeled yet (Phase 7) — the envelope shape reserves
 * room for them so the format doesn't need a breaking change when they land.
 */
export interface StateEnvelope {
  format: 'wayfarer-export';
  schemaVersion: number;
  exportedAt: string;
  chronicle: Chronicle;
  log: LogEntry[];
  oracleTables: OracleTable[];
  stepTemplates: StepTemplate[];
  journeys: Journey[];
  routes: Route[];
}

export class ImportError extends Error {}

export async function exportState(): Promise<StateEnvelope> {
  const chronicle = await getChronicle();
  if (!chronicle) throw new Error('No chronicle to export — nothing has been created yet.');
  const [log, oracleTables, stepTemplates, journeys, routes] = await Promise.all([
    getAllLogEntries(),
    getAllOracleTables(),
    getAllStepTemplates(),
    getAllJourneys(),
    getAllRoutes(),
  ]);
  return {
    format: 'wayfarer-export',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    chronicle,
    log,
    oracleTables,
    stepTemplates,
    journeys,
    routes,
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

/** Replaces local state wholesale with the imported envelope. */
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
  for (const template of envelope.stepTemplates ?? []) {
    await putStepTemplate(template);
  }
  for (const journey of envelope.journeys ?? []) {
    await putJourney(journey);
  }
  for (const route of envelope.routes ?? []) {
    await putRoute(route);
  }
}
