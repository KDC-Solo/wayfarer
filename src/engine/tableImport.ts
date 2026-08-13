// C3(b) — the second table-population path: bulk paste or file import.
// Plain text in, one result per line; the format is a documented public
// contract (SCHEMAS.md) so content can come from anywhere — a text file,
// a spreadsheet column, notes typed on a phone. Never any licensed
// content shipped: this only moves the *user's own* transcriptions in.

import type { OracleTable, OracleTableRow } from './oracleTable.ts';

export type BulkImportMode = 'auto' | 'keyed' | 'fill';

interface KeyedLine {
  key: { min: number; max: number } | { featFace: 'eye' | 'rune' };
  text: string;
}

/** "3", "3-5", "3–5", "eye", "rune" — optionally followed by ":", ".", "|",
 * or just whitespace, then the result text. */
const FEAT_FACE_LINE = /^(eye|rune)\s*(?:[:.|]\s*)?(.*)$/i;
const RANGE_LINE = /^(\d+)\s*[-–—]\s*(\d+)\s*(?:[:.|]\s*)?(.*)$/;
const SINGLE_LINE = /^(\d+)\s*(?:[:.|]\s*|\s+)(.*)$/;

function parseKeyedLine(line: string): KeyedLine | null {
  const feat = FEAT_FACE_LINE.exec(line);
  if (feat) {
    return { key: { featFace: feat[1].toLowerCase() as 'eye' | 'rune' }, text: feat[2].trim() };
  }
  const range = RANGE_LINE.exec(line);
  if (range) {
    return { key: { min: Number(range[1]), max: Number(range[2]) }, text: range[3].trim() };
  }
  const single = SINGLE_LINE.exec(line);
  if (single) {
    const n = Number(single[1]);
    return { key: { min: n, max: n }, text: single[2].trim() };
  }
  return null;
}

function sameKey(row: OracleTableRow, key: KeyedLine['key']): boolean {
  if ('featFace' in key) return row.featFace === key.featFace;
  return row.min === key.min && row.max === key.max;
}

export interface BulkImportResult {
  table: OracleTable;
  /** Which interpretation was applied ('auto' resolves to one of these). */
  mode: 'keyed' | 'fill';
  /** Rows whose text was set (updated in place or appended). */
  applied: number;
  /** Human-readable problems; when non-empty and applied is 0, the table
   * is returned unchanged. */
  errors: string[];
}

/**
 * Applies pasted/imported text to a table.
 *
 * - 'keyed': every line starts with its roll range (or eye/rune). Lines
 *   matching an existing row's range fill that row's text in place
 *   (categories and skeleton structure survive — the main onboarding
 *   path, C2 skeleton + user text); unmatched lines append new rows.
 * - 'fill': lines are bare text, assigned to the table's existing rows in
 *   order. Errors rather than guessing if there are more lines than rows.
 * - 'auto': 'keyed' when every line parses as keyed, else 'fill' — a
 *   result text that merely *starts* with a number can't silently eat the
 *   whole import, because one unkeyable line flips the mode to 'fill'.
 */
export function applyBulkRows(
  table: OracleTable,
  input: string,
  mode: BulkImportMode = 'auto',
): BulkImportResult {
  const lines = input
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');

  if (lines.length === 0) {
    return { table, mode: 'fill', applied: 0, errors: ['Nothing to import — the input is empty.'] };
  }

  const keyed = lines.map(parseKeyedLine);
  const resolvedMode: 'keyed' | 'fill' =
    mode === 'auto' ? (keyed.every((k) => k !== null) ? 'keyed' : 'fill') : mode;

  if (resolvedMode === 'keyed') {
    const errors: string[] = [];
    let rows = [...table.rows];
    let applied = 0;
    lines.forEach((line, i) => {
      const parsed = keyed[i] ?? parseKeyedLine(line);
      if (!parsed) {
        errors.push(`Line ${i + 1} has no leading range: "${line}"`);
        return;
      }
      const existing = rows.findIndex((r) => sameKey(r, parsed.key));
      if (existing !== -1) {
        rows[existing] = { ...rows[existing], text: parsed.text };
      } else {
        rows = [...rows, { ...parsed.key, text: parsed.text }];
      }
      applied++;
    });
    return { table: applied > 0 ? { ...table, rows } : table, mode: 'keyed', applied, errors };
  }

  // fill mode
  if (lines.length > table.rows.length) {
    return {
      table,
      mode: 'fill',
      applied: 0,
      errors: [
        `${lines.length} lines but only ${table.rows.length} rows — add rows first, or start lines with their ranges.`,
      ],
    };
  }
  const rows = table.rows.map((row, i) => (i < lines.length ? { ...row, text: lines[i] } : row));
  return { table: { ...table, rows }, mode: 'fill', applied: lines.length, errors: [] };
}
