import { describe, expect, it } from 'vitest';
import {
  consultLoreTable,
  createLoreTable,
  isLoreTableEmpty,
  LORE_SECTION_KEYS,
  parseLoreSection,
  setLoreSection,
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

describe('parseLoreSection (transcribing by paste, not by typing 216 cells)', () => {
  it('accepts the column-aligned shape a PDF selection produces', () => {
    // Runs of spaces, leading row numbers — what you get selecting a
    // section in a PDF reader and hitting copy.
    const { rows, errors } = parseLoreSection(
      [
        '1   Abandon    Corrupted     Curse',
        '2   Attack     Cruel         Despair',
        '3   Betray     Deceptive     Enemy',
      ].join('\n'),
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toEqual({ action: 'Abandon', aspect: 'Corrupted', focus: 'Curse' });
    expect(rows[2]).toEqual({ action: 'Betray', aspect: 'Deceptive', focus: 'Enemy' });
    expect(rows[3]).toEqual({ action: '', aspect: '', focus: '' });
  });

  it('accepts tabs and pipes, and rows without leading numbers', () => {
    const tabbed = parseLoreSection('Aid\tActive\tBattle\nArrive\tAncient\tBorder');
    expect(tabbed.rows[0]).toEqual({ action: 'Aid', aspect: 'Active', focus: 'Battle' });
    expect(tabbed.rows[1].focus).toBe('Border');

    const piped = parseLoreSection('1 | Aid | Active | Battle');
    expect(piped.rows[0]).toEqual({ action: 'Aid', aspect: 'Active', focus: 'Battle' });
  });

  it('keeps multi-word cells intact — single spaces are not column breaks', () => {
    const { rows } = parseLoreSection('1  Gain Ground   Far-reaching   The Long Road');
    expect(rows[0]).toEqual({ action: 'Gain Ground', aspect: 'Far-reaching', focus: 'The Long Road' });
  });

  it('tolerates a partial paste — one or two columns fill what they can', () => {
    const { rows, errors } = parseLoreSection('1  Abandon\n2  Attack');
    expect(errors).toEqual([]);
    expect(rows[0]).toEqual({ action: 'Abandon', aspect: '', focus: '' });
  });

  it('handles the two-sections-side-by-side shape a real page paste produces', () => {
    // The book prints two sections next to each other, so selecting a
    // band of rows yields both: "1 a b c   2 d e f". Verified against the
    // real PDF's extracted layout; synthetic words here so no licensed
    // text lands in the repo.
    const { rows, errors, notes } = parseLoreSection(
      ['1   Alpha   Bravo   Charlie      1   Delta   Echo   Foxtrot',
       '2   Golf    Hotel   India        2   Juliet  Kilo   Lima'].join('\n'),
    );
    expect(errors).toEqual([]);
    expect(notes[0]).toContain('left-hand section');
    expect(rows[0]).toEqual({ action: 'Alpha', aspect: 'Bravo', focus: 'Charlie' });
    expect(rows[1]).toEqual({ action: 'Golf', aspect: 'Hotel', focus: 'India' });
  });

  it('reports rather than silently mangles out-of-range rows and extra columns', () => {
    const outOfRange = parseLoreSection('9  Nope  Nope  Nope');
    expect(outOfRange.errors[0]).toContain('outside');

    const tooMany = parseLoreSection('1  a  b  c  d');
    expect(tooMany.errors[0]).toContain('expected up to 3');
  });

  it('setLoreSection replaces exactly one section', () => {
    const table = createLoreTable();
    const { rows } = parseLoreSection('1  Aid  Active  Battle');
    const next = setLoreSection(table, '5', rows);
    expect(next.sections['5'][0].action).toBe('Aid');
    expect(next.sections['4'][0].action).toBe('');
  });
});
