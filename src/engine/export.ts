import { SCHEMA_VERSION, type Chronicle, type LogEntry } from './types.ts';
import type { OracleTable } from './oracleTable.ts';
import type { StepTemplate } from './stepTemplate.ts';
import type { Journey, Route } from './journey.ts';
import type { FellowshipPhase } from './fellowshipPhase.ts';
import type { Combat } from './combat.ts';
import type { LoreTable } from './loreTable.ts';
import { validateDicePack, type DicePack } from './dicePack.ts';
import { validateCalling, validateCulture, type Calling, type Culture } from './culture.ts';
import {
  validateAdversaryTemplate,
  validateArmour,
  validateWeapon,
  type AdversaryTemplate,
  type Armour,
  type Weapon,
} from './gear.ts';
import {
  appendLogEntry,
  clearAll,
  getAllCombats,
  getAllCallings,
  getAllArmour,
  getAllBestiary,
  getAllCultures,
  getAllWeapons,
  getAllDicePacks,
  getAllFellowshipPhases,
  getAllJourneys,
  getAllLogEntries,
  getAllLoreTables,
  getAllOracleTables,
  getAllRoutes,
  getAllStepTemplates,
  getChronicle,
  putChronicle,
  putCombat,
  putCalling,
  putArmour,
  putBestiaryEntry,
  putCulture,
  putWeapon,
  putDicePack,
  putFellowshipPhase,
  putJourney,
  putLoreTable,
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
  fellowshipPhases: FellowshipPhase[];
  combats: Combat[];
  loreTables: LoreTable[];
  /** F7.4 — optional dice texture packs (Phase 7 polish). Absent in
   * pre-8 exports; readers default to []. */
  dicePacks: DicePack[];
  /** Character-creation data (F1.1). Licensed content, so the app ships
   * none — absent in pre-10 exports; readers default to []. */
  cultures: Culture[];
  callings: Calling[];
  /** Reference libraries (F5.x ergonomics). Licensed content, so the app
   * ships none — absent in pre-11 exports; readers default to []. */
  weapons: Weapon[];
  armour: Armour[];
  bestiary: AdversaryTemplate[];
}

export class ImportError extends Error {}

export async function exportState(): Promise<StateEnvelope> {
  const chronicle = await getChronicle();
  if (!chronicle) throw new Error('No chronicle to export — nothing has been created yet.');
  const [
    log,
    oracleTables,
    stepTemplates,
    journeys,
    routes,
    fellowshipPhases,
    combats,
    loreTables,
    dicePacks,
    cultures,
    callings,
    weapons,
    armour,
    bestiary,
  ] =
    await Promise.all([
      getAllLogEntries(),
      getAllOracleTables(),
      getAllStepTemplates(),
      getAllJourneys(),
      getAllRoutes(),
      getAllFellowshipPhases(),
      getAllCombats(),
      getAllLoreTables(),
      getAllDicePacks(),
      getAllCultures(),
      getAllCallings(),
      getAllWeapons(),
      getAllArmour(),
      getAllBestiary(),
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
    fellowshipPhases,
    combats,
    loreTables,
    dicePacks,
    cultures,
    callings,
    weapons,
    armour,
    bestiary,
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

/**
 * A *content* import, as opposed to `importState`'s wholesale replace:
 * merges table content into the tables already present and leaves the
 * chronicle, log, journeys and everything else untouched. This is what
 * makes it safe to fill in your tables mid-campaign.
 *
 * Matching is by name, deliberately — the app seeds blank skeletons on
 * first run, so a pack filling "Fortune Table" should populate the
 * existing skeleton rather than sit beside it as a duplicate. Rows,
 * roll expression and source reference are taken from the pack; the
 * local id is kept so step templates that reference a table by id keep
 * working.
 */
export interface ContentPackResult {
  tablesFilled: number;
  tablesAdded: number;
  loreTablesFilled: number;
  culturesAdded: number;
  callingsAdded: number;
  weaponsAdded: number;
  armourAdded: number;
  bestiaryAdded: number;
}

export async function importContentPack(json: string): Promise<ContentPackResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ImportError('File is not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new ImportError('File is not a Wayfarer content pack.');
  }
  const pack = parsed as Partial<StateEnvelope>;
  const incomingTables = pack.oracleTables ?? [];
  const incomingLore = pack.loreTables ?? [];
  const incomingCultures = pack.cultures ?? [];
  const incomingCallings = pack.callings ?? [];
  const incomingWeapons = pack.weapons ?? [];
  const incomingArmour = pack.armour ?? [];
  // Accept "adversaries" as well: it reads more naturally when authoring
  // a pack by hand, and a silent mismatch here imports nothing.
  const incomingBestiary =
    pack.bestiary ?? ((pack as { adversaries?: AdversaryTemplate[] }).adversaries ?? []);
  const totalIncoming =
    incomingTables.length +
    incomingLore.length +
    incomingCultures.length +
    incomingCallings.length +
    incomingWeapons.length +
    incomingArmour.length +
    incomingBestiary.length;
  if (totalIncoming === 0) {
    throw new ImportError('No tables, cultures, callings, gear or adversaries found in this file.');
  }

  const existing = await getAllOracleTables();
  const byName = new Map(existing.map((t) => [t.name.trim().toLowerCase(), t]));
  const result: ContentPackResult = {
    tablesFilled: 0,
    tablesAdded: 0,
    loreTablesFilled: 0,
    culturesAdded: 0,
    callingsAdded: 0,
    weaponsAdded: 0,
    armourAdded: 0,
    bestiaryAdded: 0,
  };

  for (const table of incomingTables) {
    const match = byName.get(table.name.trim().toLowerCase());
    if (match) {
      await putOracleTable({ ...table, id: match.id });
      result.tablesFilled++;
    } else {
      await putOracleTable(table);
      result.tablesAdded++;
    }
  }

  const existingLore = await getAllLoreTables();
  for (const lore of incomingLore) {
    const match =
      existingLore.find((l) => l.name.trim().toLowerCase() === lore.name.trim().toLowerCase()) ??
      existingLore[0];
    await putLoreTable(match ? { ...lore, id: match.id } : lore);
    result.loreTablesFilled++;
  }

  // Cultures and callings replace by name so re-importing a corrected
  // pack updates in place rather than duplicating.
  const existingCultures = await getAllCultures();
  for (const raw of incomingCultures) {
    const culture = validateCulture(raw);
    const match = existingCultures.find(
      (c) => c.name.trim().toLowerCase() === culture.name.trim().toLowerCase(),
    );
    await putCulture(match ? { ...culture, id: match.id } : culture);
    result.culturesAdded++;
  }
  const existingCallings = await getAllCallings();
  for (const raw of incomingCallings) {
    const calling = validateCalling(raw);
    const match = existingCallings.find(
      (c) => c.name.trim().toLowerCase() === calling.name.trim().toLowerCase(),
    );
    await putCalling(match ? { ...calling, id: match.id } : calling);
    result.callingsAdded++;
  }

  for (const raw of incomingWeapons) {
    await putWeapon(validateWeapon(raw));
    result.weaponsAdded++;
  }
  for (const raw of incomingArmour) {
    await putArmour(validateArmour(raw));
    result.armourAdded++;
  }
  for (const raw of incomingBestiary) {
    await putBestiaryEntry(validateAdversaryTemplate(raw));
    result.bestiaryAdded++;
  }

  return result;
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
  for (const phase of envelope.fellowshipPhases ?? []) {
    await putFellowshipPhase(phase);
  }
  for (const combat of envelope.combats ?? []) {
    await putCombat(combat);
  }
  for (const loreTable of envelope.loreTables ?? []) {
    await putLoreTable(loreTable);
  }
  for (const culture of envelope.cultures ?? []) {
    await putCulture(validateCulture(culture));
  }
  for (const calling of envelope.callings ?? []) {
    await putCalling(validateCalling(calling));
  }
  for (const weapon of envelope.weapons ?? []) {
    await putWeapon(validateWeapon(weapon));
  }
  for (const piece of envelope.armour ?? []) {
    await putArmour(validateArmour(piece));
  }
  for (const entry of envelope.bestiary ?? (envelope as { adversaries?: AdversaryTemplate[] }).adversaries ?? []) {
    await putBestiaryEntry(validateAdversaryTemplate(entry));
  }
  for (const pack of envelope.dicePacks ?? []) {
    // Validated on the way in: packs are the one part of the envelope a
    // third party is expected to author by hand (C4).
    await putDicePack(validateDicePack(pack));
  }
}
