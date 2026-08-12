import { describe, expect, it } from 'vitest';
import { isTableEmpty } from '../engine/oracleTable.ts';
import {
  createEventDetailTables,
  createSoloJourneyEventsTable,
  EVENT_DETAIL_TABLE_NAMES,
} from './journeyEventTables.ts';

describe('createSoloJourneyEventsTable', () => {
  it('has the seven rows verified against Strider Mode p.17', () => {
    const table = createSoloJourneyEventsTable();
    expect(table.rows).toHaveLength(7);
    expect(table.rows[0]).toMatchObject({ featFace: 'eye' });
    expect(table.rows[1]).toMatchObject({ min: 1, max: 1 });
    expect(table.rows[2]).toMatchObject({ min: 2, max: 3 });
    expect(table.rows[3]).toMatchObject({ min: 4, max: 7 });
    expect(table.rows[4]).toMatchObject({ min: 8, max: 9 });
    expect(table.rows[5]).toMatchObject({ min: 10, max: 10 });
    expect(table.rows[6]).toMatchObject({ featFace: 'rune' });
  });

  it('ships with blank text (C2)', () => {
    expect(isTableEmpty(createSoloJourneyEventsTable())).toBe(true);
  });
});

describe('createEventDetailTables', () => {
  it('ships all seven Event Detail tables, each with six Success-die rows', () => {
    const tables = createEventDetailTables();
    expect(tables).toHaveLength(7);
    expect(tables.map((t) => t.name)).toEqual(
      EVENT_DETAIL_TABLE_NAMES.map((n) => `Event Detail: ${n}`),
    );
    for (const table of tables) {
      expect(table.rows).toHaveLength(6);
      for (let n = 1; n <= 6; n++) {
        expect(table.rows.some((r) => r.min === n && r.max === n)).toBe(true);
      }
      expect(isTableEmpty(table)).toBe(true);
    }
  });
});
