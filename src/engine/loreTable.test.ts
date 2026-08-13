import { describe, expect, it } from 'vitest';
import {
  consultLoreTable,
  createLoreTable,
  isLoreTableEmpty,
  LORE_SECTION_KEYS,
  rollOnLoreTable,
  sectionKeyForFeatFace,
  updateLoreCell,
} from './loreTable.ts';

describe('createLoreTable (C2 skeleton)', () => {
  it('ships the verified structure — 12 sections × 6 rows × 3 columns — with every cell empty', () => {
    const table = createLoreTable();
    expect(LORE_SECTION_KEYS).toHaveLength(12);
    for (const key of LORE_SECTION_KEYS) {
      expect(table.sections[key]).toHaveLength(6);
      for (const row of table.sections[key]) {
        expect(row).toEqual({ action: '', aspect: '', focus: '' });
      }
    }
    expect(isLoreTableEmpty(table)).toBe(true);
    expect(table.sourceReference).toBe('Strider Mode p.11-12');
  });
});

describe('updateLoreCell', () => {
  it('writes one cell without touching its neighbours', () => {
    let table = createLoreTable();
    table = updateLoreCell(table, '3', 1, 'aspect', 'Windswept');
    expect(table.sections['3'][1]).toEqual({ action: '', aspect: 'Windswept', focus: '' });
    expect(table.sections['3'][0]).toEqual({ action: '', aspect: '', focus: '' });
    expect(isLoreTableEmpty(table)).toBe(false);
  });
});

describe('consultLoreTable', () => {
  it('maps the Feat die to its section (numbers, eye, rune) and the Success die to its row', () => {
    expect(sectionKeyForFeatFace(7)).toBe('7');
    expect(sectionKeyForFeatFace('eye')).toBe('eye');
    expect(sectionKeyForFeatFace('rune')).toBe('rune');

    let table = createLoreTable();
    table = updateLoreCell(table, 'eye', 4, 'action', 'Flee');
    const result = consultLoreTable(table, 'eye', 5, ['action']);
    expect(result.section).toBe('eye');
    expect(result.results).toEqual({ action: 'Flee' });
    expect(result.needsManualResult).toBe(false);
  });

  it('returns only the requested columns and flags blanks for manual fallback (F2.6)', () => {
    let table = createLoreTable();
    table = updateLoreCell(table, '2', 0, 'action', 'Guard');
    const result = consultLoreTable(table, 2, 1, ['action', 'focus']);
    expect(result.results).toEqual({ action: 'Guard', focus: '' });
    expect(result.needsManualResult).toBe(true);

    const single = consultLoreTable(table, 2, 1, ['action']);
    expect(single.needsManualResult).toBe(false);
  });
});

describe('rollOnLoreTable', () => {
  it('always lands in a legal section and row', () => {
    const table = createLoreTable();
    for (let i = 0; i < 50; i++) {
      const result = rollOnLoreTable(table, ['aspect']);
      expect(LORE_SECTION_KEYS).toContain(result.section);
      expect(result.successDie).toBeGreaterThanOrEqual(1);
      expect(result.successDie).toBeLessThanOrEqual(6);
      expect(result.needsManualResult).toBe(true); // skeleton is empty
    }
  });
});
