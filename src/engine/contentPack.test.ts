import { beforeEach, describe, expect, it } from 'vitest';
import { createChronicle } from './chronicle.ts';
import { importContentPack, ImportError } from './export.ts';
import { createLoreTable, updateLoreCell } from './loreTable.ts';
import { createLogEntry } from './log.ts';
import { createOracleTable } from './oracleTable.ts';
import {
  appendLogEntry,
  clearAll,
  getAllLogEntries,
  getAllLoreTables,
  getAllOracleTables,
  getChronicle,
  putChronicle,
  putLoreTable,
  putOracleTable,
} from './persistence.ts';

beforeEach(async () => {
  await clearAll();
});

function pack(tables: unknown[], lore: unknown[] = []) {
  return JSON.stringify({ format: 'wayfarer-export', schemaVersion: 8, oracleTables: tables, loreTables: lore });
}

describe('importContentPack — filling tables without losing the campaign', () => {
  it('fills a blank shipped skeleton in place, keeping its id', async () => {
    const skeleton = createOracleTable({
      name: 'Fortune Table',
      rollExpression: 'Feat die',
      rows: [{ featFace: 'eye', text: '' }, { min: 1, max: 1, text: '' }],
    });
    await putOracleTable(skeleton);

    await importContentPack(
      pack([
        {
          id: 'some-other-id',
          name: 'Fortune Table',
          rollExpression: 'Feat die',
          sourceReference: 'Strider Mode, p.8',
          rows: [{ featFace: 'eye', text: 'A' }, { min: 1, max: 1, text: 'B' }],
        },
      ]),
    );

    const stored = await getAllOracleTables();
    expect(stored).toHaveLength(1); // filled, not duplicated
    expect(stored[0].id).toBe(skeleton.id); // step templates referencing it still work
    expect(stored[0].rows[0].text).toBe('A');
    expect(stored[0].sourceReference).toBe('Strider Mode, p.8');
  });

  it('matches by name case- and whitespace-insensitively', async () => {
    await putOracleTable(createOracleTable({ name: 'Ill-Fortune Table', rollExpression: 'Feat die' }));
    await importContentPack(
      pack([{ id: 'x', name: '  ill-fortune table ', rollExpression: 'Feat die', sourceReference: '', rows: [] }]),
    );
    expect(await getAllOracleTables()).toHaveLength(1);
  });

  it('adds tables the app never shipped, like the Revelation Episode table', async () => {
    const result = await importContentPack(
      pack([{ id: 'r', name: 'Revelation Episode Table', rollExpression: 'Feat die', sourceReference: '', rows: [] }]),
    );
    expect(result.tablesAdded).toBe(1);
    expect(result.tablesFilled).toBe(0);
  });

  it('leaves the chronicle, log and existing play state completely alone', async () => {
    const chronicle = { ...createChronicle(), currentYear: 2953, currentLocation: 'Bree' };
    await putChronicle(chronicle);
    const entry = createLogEntry({ type: 'prose', prose: 'We set out at dawn.' });
    await appendLogEntry(entry);

    await importContentPack(pack([{ id: 'a', name: 'New', rollExpression: '1d6', sourceReference: '', rows: [] }]));

    expect(await getChronicle()).toEqual(chronicle);
    expect(await getAllLogEntries()).toHaveLength(1);
  });

  it('fills the seeded Lore Table in place rather than adding a second one', async () => {
    const seeded = createLoreTable();
    await putLoreTable(seeded);
    const filled = updateLoreCell(createLoreTable(), '3', 0, 'action', 'Demand');

    const result = await importContentPack(pack([], [{ ...filled, id: 'different' }]));

    const stored = await getAllLoreTables();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(seeded.id);
    expect(stored[0].sections['3'][0].action).toBe('Demand');
    expect(result.loreTablesFilled).toBe(1);
  });

  it('rejects files that carry no table content at all', async () => {
    await expect(importContentPack('not json')).rejects.toThrow(ImportError);
    await expect(importContentPack(JSON.stringify({ format: 'wayfarer-export' }))).rejects.toThrow(
      /No tables, cultures or callings/,
    );
  });
});
