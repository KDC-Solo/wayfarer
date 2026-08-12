import { beforeEach, describe, expect, it } from 'vitest';
import { createChronicle } from './chronicle.ts';
import { createFellowshipPhase } from './fellowshipPhase.ts';
import { createJourney, saveAsRoute } from './journey.ts';
import { createLogEntry } from './log.ts';
import { createOracleTable } from './oracleTable.ts';
import { createStepTemplate } from './stepTemplate.ts';
import {
  appendLogEntry,
  clearAll,
  deleteOracleTable,
  deleteRoute,
  deleteStepTemplate,
  getAllFellowshipPhases,
  getAllJourneys,
  getAllLogEntries,
  getAllOracleTables,
  getAllRoutes,
  getAllStepTemplates,
  getChronicle,
  putChronicle,
  putFellowshipPhase,
  putJourney,
  putOracleTable,
  putRoute,
  putStepTemplate,
} from './persistence.ts';

beforeEach(async () => {
  await clearAll();
});

describe('chronicle persistence', () => {
  it('returns undefined before anything is saved', async () => {
    expect(await getChronicle()).toBeUndefined();
  });

  it('round-trips a chronicle through put/get', async () => {
    const chronicle = createChronicle();
    await putChronicle(chronicle);
    expect(await getChronicle()).toEqual(chronicle);
  });

  it('put overwrites the single active chronicle', async () => {
    await putChronicle(createChronicle());
    const second = createChronicle();
    await putChronicle(second);
    expect(await getChronicle()).toEqual(second);
  });
});

describe('log persistence', () => {
  it('starts empty', async () => {
    expect(await getAllLogEntries()).toEqual([]);
  });

  it('accumulates appended entries', async () => {
    const a = createLogEntry({ type: 'system' });
    const b = createLogEntry({ type: 'roll', heroId: 'h1' });
    await appendLogEntry(a);
    await appendLogEntry(b);
    const all = await getAllLogEntries();
    expect(all).toHaveLength(2);
    expect(all.map((e) => e.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('rejects appending an entry with a duplicate id (append-only invariant)', async () => {
    const entry = createLogEntry({ type: 'system' });
    await appendLogEntry(entry);
    await expect(appendLogEntry(entry)).rejects.toThrow();
  });
});

describe('oracle table persistence', () => {
  it('starts empty', async () => {
    expect(await getAllOracleTables()).toEqual([]);
  });

  it('round-trips a table through put/getAll, and put upserts by id', async () => {
    const table = createOracleTable({ name: 'Lore Table', rollExpression: '1d12' });
    await putOracleTable(table);
    expect(await getAllOracleTables()).toEqual([table]);

    const renamed = { ...table, name: 'Renamed' };
    await putOracleTable(renamed);
    const all = await getAllOracleTables();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Renamed');
  });

  it('deletes by id', async () => {
    const table = createOracleTable({ name: 'T', rollExpression: '1d6' });
    await putOracleTable(table);
    await deleteOracleTable(table.id);
    expect(await getAllOracleTables()).toEqual([]);
  });
});

describe('step template persistence', () => {
  it('round-trips and deletes by id', async () => {
    const template = createStepTemplate('Standard Leg');
    await putStepTemplate(template);
    expect(await getAllStepTemplates()).toEqual([template]);
    await deleteStepTemplate(template.id);
    expect(await getAllStepTemplates()).toEqual([]);
  });
});

describe('journey persistence', () => {
  it('round-trips through put/getAll', async () => {
    const journey = createJourney({
      origin: 'Bree',
      destination: 'Rivendell',
      season: 'winter',
      waypoints: [],
      stepTemplateId: 'template-1',
    });
    await putJourney(journey);
    expect(await getAllJourneys()).toEqual([journey]);
  });
});

describe('route persistence', () => {
  it('round-trips and deletes by id', async () => {
    const journey = createJourney({
      origin: 'Bree',
      destination: 'Rivendell',
      season: 'winter',
      waypoints: [{ name: 'Weathertop', distance: 3, terrain: 'hills' }],
      stepTemplateId: 'template-1',
    });
    const route = saveAsRoute(journey, 'Winter path');
    await putRoute(route);
    expect(await getAllRoutes()).toEqual([route]);
    await deleteRoute(route.id);
    expect(await getAllRoutes()).toEqual([]);
  });
});

describe('fellowship phase persistence', () => {
  it('round-trips through put/getAll', async () => {
    const phase = createFellowshipPhase({
      year: 2954,
      location: 'Bree',
      stepTemplateId: 'template-1',
      heroIds: ['h1'],
    });
    await putFellowshipPhase(phase);
    expect(await getAllFellowshipPhases()).toEqual([phase]);
  });
});
