import { beforeEach, describe, expect, it } from 'vitest';
import { createChronicle } from './chronicle.ts';
import { createLogEntry } from './log.ts';
import { createOracleTable } from './oracleTable.ts';
import {
  appendLogEntry,
  clearAll,
  deleteOracleTable,
  getAllLogEntries,
  getAllOracleTables,
  getChronicle,
  putChronicle,
  putOracleTable,
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
