// The Lore Table (Strider Mode p.11-12) — the open-ended-question oracle.
// Its shape doesn't fit the single-column OracleTable row model (a roll is
// two-dimensional: one Feat die picks a section, one Success die picks the
// row, and each row holds three separately consultable columns — Action,
// Aspect, Focus), so it gets its own entity, the same way the Telling
// Table got its own module. Per C1/C2 the 216 cell texts are licensed
// content and ship empty; only the verified structure (12 sections × 6
// rows × 3 columns) is encoded, and the user transcribes their own copy.

import { rollFeatDie, rollSuccessDie, type FeatDieFace, type SuccessDieFace } from './dice.ts';

export const LORE_COLUMNS = ['action', 'aspect', 'focus'] as const;
export type LoreColumn = (typeof LORE_COLUMNS)[number];

export const LORE_COLUMN_LABEL: Record<LoreColumn, string> = {
  action: 'Action',
  aspect: 'Aspect',
  focus: 'Focus',
};

export interface LoreRow {
  action: string;
  aspect: string;
  focus: string;
}

/** Section keys in Feat-die order: the Eye, 1-10, the rune. */
export type LoreSectionKey = 'eye' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'rune';

export const LORE_SECTION_KEYS: readonly LoreSectionKey[] = [
  'eye',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'rune',
];

export function sectionKeyForFeatFace(face: FeatDieFace): LoreSectionKey {
  return (typeof face === 'number' ? String(face) : face) as LoreSectionKey;
}

export const LORE_SECTION_LABEL: Record<LoreSectionKey, string> = {
  eye: 'Eye of Sauron',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  rune: 'Gandalf rune',
};

export interface LoreTable {
  id: string;
  name: string;
  sourceReference: string;
  /** Every section always has exactly 6 rows (Success die 1-6). */
  sections: Record<LoreSectionKey, LoreRow[]>;
}

function emptySection(): LoreRow[] {
  return Array.from({ length: 6 }, () => ({ action: '', aspect: '', focus: '' }));
}

/** The shipped skeleton (C2): correct structure, every cell empty. */
export function createLoreTable(input?: { name?: string; sourceReference?: string }): LoreTable {
  const sections = {} as Record<LoreSectionKey, LoreRow[]>;
  for (const key of LORE_SECTION_KEYS) sections[key] = emptySection();
  return {
    id: crypto.randomUUID(),
    name: input?.name ?? 'Lore Table',
    sourceReference: input?.sourceReference ?? 'Strider Mode p.11-12',
    sections,
  };
}

export function updateLoreCell(
  table: LoreTable,
  section: LoreSectionKey,
  rowIndex: number,
  column: LoreColumn,
  text: string,
): LoreTable {
  const rows = table.sections[section].map((row, i) => (i === rowIndex ? { ...row, [column]: text } : row));
  return { ...table, sections: { ...table.sections, [section]: rows } };
}

export function renameLoreTable(table: LoreTable, name: string): LoreTable {
  return { ...table, name };
}

/** F2.6's principle applies here too: structure without text is "empty." */
export function isLoreTableEmpty(table: LoreTable): boolean {
  return LORE_SECTION_KEYS.every((key) =>
    table.sections[key].every((row) => LORE_COLUMNS.every((c) => row[c].trim() === '')),
  );
}

export interface LoreRollResult {
  featFace: FeatDieFace;
  successDie: SuccessDieFace;
  section: LoreSectionKey;
  /** Only the columns the player asked for (p.11: "roll on one column for
   * a single word prompt, or two or more to construct a prompt phrase"). */
  results: Partial<Record<LoreColumn, string>>;
  /** True when any consulted cell is blank — fall back to the book/manual
   * entry, never block (F2.6). */
  needsManualResult: boolean;
}

export function consultLoreTable(
  table: LoreTable,
  featFace: FeatDieFace,
  successDie: SuccessDieFace,
  columns: LoreColumn[],
): LoreRollResult {
  const section = sectionKeyForFeatFace(featFace);
  const row = table.sections[section][successDie - 1];
  const results: Partial<Record<LoreColumn, string>> = {};
  for (const column of columns) results[column] = row[column];
  return {
    featFace,
    successDie,
    section,
    results,
    needsManualResult: columns.some((c) => row[c].trim() === ''),
  };
}

/**
 * Fills a whole section (6 rows × 3 columns) from pasted text — the way
 * anyone sane transcribes a table they own: select the section in the
 * PDF, copy, paste. Accepts tab, pipe, or run-of-spaces separated
 * columns, with or without a leading row number, because that is what
 * actually comes out of a PDF selection.
 *
 * Returns the rows it understood plus per-line problems; the caller
 * decides whether to apply. Lines are matched to rows by their leading
 * number when present, otherwise by order.
 */
export function parseLoreSection(input: string): {
  rows: LoreRow[];
  errors: string[];
  notes: string[];
} {
  const lines = input
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');

  const rows: LoreRow[] = Array.from({ length: 6 }, () => ({ action: '', aspect: '', focus: '' }));
  const errors: string[] = [];
  const notes: string[] = [];
  let cursor = 0;
  let trimmedNeighbour = false;

  for (const [i, line] of lines.entries()) {
    // Split on tab, pipe, or two-or-more spaces — single spaces are kept
    // because a cell can legitimately be more than one word.
    const leading = /^(\d{1,2})[\s.):|]+(.*)$/.exec(line);
    const index = leading ? Number(leading[1]) - 1 : cursor;
    const body = leading ? leading[2] : line;
    let cells = body
      .split(/\t|\s*\|\s*|\s{2,}/)
      .map((c) => c.trim())
      .filter((c) => c !== '');

    // The book prints two sections side by side, so selecting a band of
    // rows in a PDF yields both at once: "1 a b c  2 d e f". A bare row
    // number after the third column marks where the neighbour starts.
    const neighbour = cells.findIndex((c, ci) => ci >= 3 && /^\d{1,2}$/.test(c));
    if (neighbour !== -1) {
      cells = cells.slice(0, neighbour).slice(0, 3);
      trimmedNeighbour = true;
    }

    if (index < 0 || index > 5) {
      errors.push(`Line ${i + 1}: row ${index + 1} is outside this section's six rows.`);
      continue;
    }
    if (cells.length === 0) continue;
    if (cells.length > 3) {
      errors.push(`Line ${i + 1}: found ${cells.length} columns, expected up to 3 (Action, Aspect, Focus).`);
      continue;
    }
    rows[index] = { action: cells[0] ?? '', aspect: cells[1] ?? '', focus: cells[2] ?? '' };
    cursor = index + 1;
  }

  if (trimmedNeighbour) {
    notes.push('Kept the left-hand section — the paste also contained the section printed beside it.');
  }
  return { rows, errors, notes };
}

export function setLoreSection(table: LoreTable, section: LoreSectionKey, rows: LoreRow[]): LoreTable {
  return { ...table, sections: { ...table.sections, [section]: rows } };
}

/** Rolls the two dice and consults. Like generic table rolls (TableRoller),
 * this auto-rolls rather than honouring the dice input mode — the same
 * deliberate scope cut, documented in CLAUDE.md. */
export function rollOnLoreTable(table: LoreTable, columns: LoreColumn[]): LoreRollResult {
  return consultLoreTable(table, rollFeatDie(), rollSuccessDie(), columns);
}
