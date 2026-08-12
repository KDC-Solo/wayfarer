import { beforeEach, describe, expect, it } from 'vitest';
import { createChronicle } from './chronicle.ts';
import { createJourney, saveAsRoute } from './journey.ts';
import { createLogEntry } from './log.ts';
import { createOracleTable } from './oracleTable.ts';
import { createStepTemplate } from './stepTemplate.ts';
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
import { exportState, importState, ImportError, parseStateEnvelope, serializeState } from './export.ts';

beforeEach(async () => {
  await clearAll();
});

function seedJourneyContent() {
  const table = createOracleTable({ name: 'Lore Table', rollExpression: '1d12' });
  const template = createStepTemplate('Standard Leg');
  const journey = createJourney({
    origin: 'Bree',
    destination: 'Rivendell',
    season: 'winter',
    waypoints: [{ name: 'Weathertop', distance: 3, terrain: 'hills' }],
    stepTemplateId: template.id,
  });
  const route = saveAsRoute(journey, 'Winter path');
  return { table, template, journey, route };
}

describe('exportState', () => {
  it('refuses to export when nothing has been created yet', async () => {
    await expect(exportState()).rejects.toThrow('No chronicle to export');
  });

  it('bundles the current chronicle, log, oracle tables, step templates, journeys, and routes', async () => {
    const chronicle = createChronicle();
    await putChronicle(chronicle);
    const entry = createLogEntry({ type: 'system' });
    await appendLogEntry(entry);
    const { table, template, journey, route } = seedJourneyContent();
    await putOracleTable(table);
    await putStepTemplate(template);
    await putJourney(journey);
    await putRoute(route);

    const envelope = await exportState();
    expect(envelope.format).toBe('wayfarer-export');
    expect(envelope.chronicle).toEqual(chronicle);
    expect(envelope.log).toEqual([entry]);
    expect(envelope.oracleTables).toEqual([table]);
    expect(envelope.stepTemplates).toEqual([template]);
    expect(envelope.journeys).toEqual([journey]);
    expect(envelope.routes).toEqual([route]);
  });
});

describe('parseStateEnvelope', () => {
  it('rejects invalid JSON', () => {
    expect(() => parseStateEnvelope('not json')).toThrow(ImportError);
  });

  it('rejects a file that is not a Wayfarer export', () => {
    expect(() => parseStateEnvelope(JSON.stringify({ hello: 'world' }))).toThrow(ImportError);
  });

  it('rejects a schema version newer than this app supports', () => {
    const future = { format: 'wayfarer-export', schemaVersion: 999, chronicle: {}, log: [] };
    expect(() => parseStateEnvelope(JSON.stringify(future))).toThrow(/newer version/);
  });
});

describe('export/import round trip', () => {
  it('restores identical chronicle, log, oracle tables, step templates, journeys, and routes', async () => {
    const chronicle = { ...createChronicle(), currentYear: 2953, currentLocation: 'Bree' };
    await putChronicle(chronicle);
    const entries = [
      createLogEntry({ type: 'roll', heroId: 'h1' }),
      createLogEntry({ type: 'prose', prose: 'The road goes ever on.' }),
    ];
    for (const e of entries) await appendLogEntry(e);
    const { table, template, journey, route } = seedJourneyContent();
    await putOracleTable(table);
    await putStepTemplate(template);
    await putJourney(journey);
    await putRoute(route);

    const json = serializeState(await exportState());

    await clearAll();
    expect(await getChronicle()).toBeUndefined();

    await importState(json);

    expect(await getChronicle()).toEqual(chronicle);
    const restoredLog = await getAllLogEntries();
    expect(restoredLog.map((e) => e.id).sort()).toEqual(entries.map((e) => e.id).sort());
    expect(await getAllOracleTables()).toEqual([table]);
    expect(await getAllStepTemplates()).toEqual([template]);
    expect(await getAllJourneys()).toEqual([journey]);
    expect(await getAllRoutes()).toEqual([route]);
  });

  it('replaces existing state rather than merging with it', async () => {
    await putChronicle(createChronicle());
    await appendLogEntry(createLogEntry({ type: 'system' }));
    const json = serializeState(await exportState());

    // Simulate a different local campaign in progress...
    await clearAll();
    const other = createChronicle();
    await putChronicle(other);
    await appendLogEntry(createLogEntry({ type: 'system' }));
    await appendLogEntry(createLogEntry({ type: 'system' }));

    // ...importing replaces it wholesale, not merges.
    await importState(json);
    expect(await getChronicle()).not.toEqual(other);
    expect(await getAllLogEntries()).toHaveLength(1);
  });
});
