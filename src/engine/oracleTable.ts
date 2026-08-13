// Generic user-defined tables (F2.4, F2.5). Ships as skeletons per C2:
// correct row structure (ranges/faces, categories, source reference) with
// result text empty on install — populating text is entirely the user's
// job (F2.5, C3). Row *structure* (ranges, categories) is mechanical
// scaffolding, not narrative content, so it's fine to ship (see D8/D9 for
// the same reasoning applied to the TN formula and oracle chance bands).

export interface OracleTableRow {
  /** Inclusive numeric range, for dice-expression-driven tables. */
  min?: number;
  max?: number;
  /** Alternative match key for tables indexed by the Feat die's special
   * faces (e.g. the Fortune/Ill-Fortune tables, which cover all twelve
   * Feat die outcomes, not just 1-10). Mutually exclusive with min/max. */
  featFace?: 'eye' | 'rune';
  category?: string;
  /** Empty on install (C2) — the user fills this in. */
  text: string;
}

export interface OracleTable {
  id: string;
  name: string;
  /** Human-readable, e.g. "1d12", "1d6". Informational for Feat-face
   * tables — those are consulted from an existing Feat die result (see
   * tellingTable.ts / F1.7), not rolled fresh. */
  rollExpression: string;
  rows: OracleTableRow[];
  sourceReference: string;
}

export function createOracleTable(input: {
  name: string;
  rollExpression: string;
  sourceReference?: string;
  rows?: OracleTableRow[];
}): OracleTable {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    rollExpression: input.rollExpression,
    rows: input.rows ?? [],
    sourceReference: input.sourceReference ?? '',
  };
}

/** F2.6 — a table with no populated result text is "empty" even if its row
 * structure exists; play should fall back to a manual prompt, never block. */
export function isTableEmpty(table: OracleTable): boolean {
  return table.rows.every((r) => r.text.trim() === '');
}

/** Matches a numeric roll against a range-based table, or a Feat die face
 * (including eye/rune) against a Feat-face-indexed table. */
export function matchRow(table: OracleTable, key: number | 'eye' | 'rune'): OracleTableRow | null {
  if (typeof key === 'number') {
    return table.rows.find((r) => r.min !== undefined && r.max !== undefined && key >= r.min && key <= r.max) ?? null;
  }
  return table.rows.find((r) => r.featFace === key) ?? null;
}

export interface RollResult {
  row: OracleTableRow | null;
  /** F2.6 — true when there's no row, or the row exists but its text is blank. */
  needsManualResult: boolean;
}

export function rollOnTable(table: OracleTable, key: number | 'eye' | 'rune'): RollResult {
  const row = matchRow(table, key);
  return { row, needsManualResult: !row || row.text.trim() === '' };
}

/** How a row identifies itself to a human reading their book: "4–7",
 * "the Eye", "10". Used to point the player at the right line rather than
 * making them work it out from the roll. */
export function describeRowKey(row: OracleTableRow): string {
  if (row.featFace === 'eye') return 'the Eye';
  if (row.featFace === 'rune') return 'the rune';
  if (row.min === undefined || row.max === undefined) return '';
  return row.min === row.max ? String(row.min) : `${row.min}–${row.max}`;
}

/** Writes text into whichever row a given roll matched — the mechanism
 * behind filling a table by playing rather than by transcribing it up
 * front. No-ops when the roll matched no row at all. */
export function setRowTextForKey(
  table: OracleTable,
  key: number | 'eye' | 'rune',
  text: string,
): OracleTable {
  const index = table.rows.findIndex((r) => matchRow(table, key) === r);
  if (index === -1) return table;
  return updateRow(table, index, { ...table.rows[index], text });
}

export function addRow(table: OracleTable, row: OracleTableRow): OracleTable {
  return { ...table, rows: [...table.rows, row] };
}

export function updateRow(table: OracleTable, index: number, row: OracleTableRow): OracleTable {
  const rows = [...table.rows];
  rows[index] = row;
  return { ...table, rows };
}

export function removeRow(table: OracleTable, index: number): OracleTable {
  return { ...table, rows: table.rows.filter((_, i) => i !== index) };
}

export function renameTable(table: OracleTable, name: string): OracleTable {
  return { ...table, name };
}
