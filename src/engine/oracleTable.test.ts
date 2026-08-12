import { describe, expect, it } from 'vitest';
import {
  addRow,
  createOracleTable,
  isTableEmpty,
  matchRow,
  removeRow,
  renameTable,
  rollOnTable,
  updateRow,
} from './oracleTable.ts';

describe('createOracleTable', () => {
  it('starts with no rows and a fresh id', () => {
    const table = createOracleTable({ name: 'Lore Table', rollExpression: '1d12' });
    expect(table.rows).toEqual([]);
    expect(table.id).toBeTruthy();
  });
});

describe('isTableEmpty', () => {
  it('is empty when there are no rows', () => {
    const table = createOracleTable({ name: 'T', rollExpression: '1d6' });
    expect(isTableEmpty(table)).toBe(true);
  });

  it('is empty when every row has blank text (C2 skeleton state)', () => {
    let table = createOracleTable({ name: 'T', rollExpression: '1d6' });
    table = addRow(table, { min: 1, max: 6, text: '' });
    expect(isTableEmpty(table)).toBe(true);
  });

  it('is not empty once at least one row has text', () => {
    let table = createOracleTable({ name: 'T', rollExpression: '1d6' });
    table = addRow(table, { min: 1, max: 6, text: 'A friendly face' });
    expect(isTableEmpty(table)).toBe(false);
  });
});

describe('matchRow / rollOnTable', () => {
  it('matches a numeric key against a range row', () => {
    let table = createOracleTable({ name: 'T', rollExpression: '1d6' });
    table = addRow(table, { min: 1, max: 3, text: 'Low' });
    table = addRow(table, { min: 4, max: 6, text: 'High' });
    expect(matchRow(table, 2)?.text).toBe('Low');
    expect(matchRow(table, 5)?.text).toBe('High');
  });

  it('matches eye/rune keys against featFace rows', () => {
    let table = createOracleTable({ name: 'Fortune', rollExpression: 'Feat die' });
    table = addRow(table, { featFace: 'eye', text: 'Bad omen' });
    table = addRow(table, { featFace: 'rune', text: 'Good omen' });
    expect(matchRow(table, 'eye')?.text).toBe('Bad omen');
    expect(matchRow(table, 'rune')?.text).toBe('Good omen');
  });

  it('rollOnTable reports needsManualResult for an unmatched or blank row (F2.6)', () => {
    let table = createOracleTable({ name: 'T', rollExpression: '1d6' });
    expect(rollOnTable(table, 3).needsManualResult).toBe(true);

    table = addRow(table, { min: 1, max: 6, text: '' });
    expect(rollOnTable(table, 3).needsManualResult).toBe(true);

    table = updateRow(table, 0, { min: 1, max: 6, text: 'Filled in' });
    const result = rollOnTable(table, 3);
    expect(result.needsManualResult).toBe(false);
    expect(result.row?.text).toBe('Filled in');
  });
});

describe('row/table editing', () => {
  it('addRow appends, updateRow replaces by index, removeRow deletes by index', () => {
    let table = createOracleTable({ name: 'T', rollExpression: '1d6' });
    table = addRow(table, { min: 1, max: 2, text: 'a' });
    table = addRow(table, { min: 3, max: 4, text: 'b' });
    table = updateRow(table, 1, { min: 3, max: 4, text: 'b-edited' });
    expect(table.rows[1].text).toBe('b-edited');
    table = removeRow(table, 0);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].text).toBe('b-edited');
  });

  it('renameTable only changes the name', () => {
    const table = createOracleTable({ name: 'Old', rollExpression: '1d6' });
    const renamed = renameTable(table, 'New');
    expect(renamed.name).toBe('New');
    expect(renamed.id).toBe(table.id);
  });
});
