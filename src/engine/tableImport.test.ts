import { describe, expect, it } from 'vitest';
import { createOracleTable } from './oracleTable.ts';
import { applyBulkRows } from './tableImport.ts';

function skeleton() {
  // A C2-style shipped skeleton: ranges and categories, no text.
  return createOracleTable({
    name: 'Events',
    rollExpression: '1d12',
    rows: [
      { min: 1, max: 3, category: 'misfortune', text: '' },
      { min: 4, max: 9, text: '' },
      { min: 10, max: 12, text: '' },
    ],
  });
}

describe('applyBulkRows — keyed mode (C3b)', () => {
  it('fills existing rows in place by exact range, keeping categories', () => {
    const input = '1-3 A grey rider\n4-9: Wolves at dusk\n10–12 | An old friend';
    const { table, mode, applied, errors } = applyBulkRows(skeleton(), input);
    expect(mode).toBe('keyed');
    expect(applied).toBe(3);
    expect(errors).toEqual([]);
    expect(table.rows[0]).toEqual({ min: 1, max: 3, category: 'misfortune', text: 'A grey rider' });
    expect(table.rows[1].text).toBe('Wolves at dusk');
    expect(table.rows[2].text).toBe('An old friend');
  });

  it('appends rows for unmatched ranges, single numbers, and Feat faces', () => {
    const empty = createOracleTable({ name: 'T', rollExpression: '1d12' });
    const { table, applied } = applyBulkRows(empty, '7 A lone howl\neye Nothing stirs\nrune: A gift');
    expect(applied).toBe(3);
    expect(table.rows).toEqual([
      { min: 7, max: 7, text: 'A lone howl' },
      { featFace: 'eye', text: 'Nothing stirs' },
      { featFace: 'rune', text: 'A gift' },
    ]);
  });

  it('forced keyed mode reports unparseable lines and applies the rest', () => {
    const { table, applied, errors } = applyBulkRows(skeleton(), '1-3 Fine\nno range here', 'keyed');
    expect(applied).toBe(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Line 2');
    expect(table.rows[0].text).toBe('Fine');
  });
});

describe('applyBulkRows — fill mode (C3b)', () => {
  it('assigns bare lines to existing rows in order', () => {
    const { table, mode, applied } = applyBulkRows(skeleton(), 'First\nSecond', 'fill');
    expect(mode).toBe('fill');
    expect(applied).toBe(2);
    expect(table.rows.map((r) => r.text)).toEqual(['First', 'Second', '']);
  });

  it('refuses rather than guesses when there are more lines than rows', () => {
    const { table, applied, errors } = applyBulkRows(skeleton(), 'a\nb\nc\nd', 'fill');
    expect(applied).toBe(0);
    expect(errors[0]).toContain('4 lines but only 3 rows');
    expect(table.rows.map((r) => r.text)).toEqual(['', '', '']);
  });
});

describe('applyBulkRows — auto detection', () => {
  it('one unkeyable line flips the whole import to fill mode', () => {
    // "3 wolves circle the camp" would parse as a keyed line; the bare
    // second line proves the paste is prose, so nothing gets eaten.
    const { mode, table } = applyBulkRows(skeleton(), '3 wolves circle the camp\nA cold rain');
    expect(mode).toBe('fill');
    expect(table.rows[0].text).toBe('3 wolves circle the camp');
    expect(table.rows[1].text).toBe('A cold rain');
  });

  it('empty input is an error, not a no-op success', () => {
    const { applied, errors } = applyBulkRows(skeleton(), '  \n ');
    expect(applied).toBe(0);
    expect(errors).toHaveLength(1);
  });
});
