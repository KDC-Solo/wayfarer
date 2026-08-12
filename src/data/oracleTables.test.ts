import { describe, expect, it } from 'vitest';
import { isTableEmpty } from '../engine/oracleTable.ts';
import { defaultOracleTables } from './oracleTables.ts';

describe('defaultOracleTables', () => {
  it('ships Fortune and Ill-Fortune skeletons covering all twelve Feat die faces', () => {
    const tables = defaultOracleTables();
    expect(tables.map((t) => t.name)).toEqual(['Fortune Table', 'Ill-Fortune Table']);
    for (const table of tables) {
      expect(table.rows).toHaveLength(12);
      expect(table.rows.filter((r) => r.featFace === 'eye')).toHaveLength(1);
      expect(table.rows.filter((r) => r.featFace === 'rune')).toHaveLength(1);
      for (let n = 1; n <= 10; n++) {
        expect(table.rows.some((r) => r.min === n && r.max === n)).toBe(true);
      }
    }
  });

  it('ships with all result text blank (C2)', () => {
    for (const table of defaultOracleTables()) {
      expect(isTableEmpty(table)).toBe(true);
    }
  });

  it('gives each table a unique id on every call', () => {
    const [a] = defaultOracleTables();
    const [b] = defaultOracleTables();
    expect(a.id).not.toBe(b.id);
  });
});
