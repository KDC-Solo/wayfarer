// Journey event table skeletons (F3.7) — Strider Mode p.17-19. Row
// structure (ranges, count) is verified against the book; per C2 every
// result cell is blank on install. Each Event Detail table repeats the
// same "Success die 1-6" shape from the book (Event / Outcome columns are
// collapsed into a single free-text cell here, same simplification as the
// Lore Table note in oracleTables.ts).

import type { OracleTable, OracleTableRow } from '../engine/oracleTable.ts';

function successDieRows(): OracleTableRow[] {
  return Array.from({ length: 6 }, (_, i) => ({ min: i + 1, max: i + 1, text: '' }));
}

export function createSoloJourneyEventsTable(): OracleTable {
  return {
    id: crypto.randomUUID(),
    name: 'Solo Journey Events',
    rollExpression: 'Feat die (Favoured in a Border Land, Ill-favoured in a Dark Land)',
    rows: [
      { featFace: 'eye', text: '' }, // Terrible Misfortune
      { min: 1, max: 1, text: '' }, // Despair
      { min: 2, max: 3, text: '' }, // Ill Choices
      { min: 4, max: 7, text: '' }, // Mishap
      { min: 8, max: 9, text: '' }, // Short Cut
      { min: 10, max: 10, text: '' }, // Chance Meeting
      { featFace: 'rune', text: '' }, // Joyful Sight
    ],
    sourceReference: 'Strider Mode, p.17',
  };
}

export const EVENT_DETAIL_TABLE_NAMES = [
  'Terrible Misfortune',
  'Despair',
  'Ill Choices',
  'Mishap',
  'Short Cut',
  'Chance Meeting',
  'Joyful Sight',
] as const;

export function createEventDetailTables(): OracleTable[] {
  return EVENT_DETAIL_TABLE_NAMES.map((name) => ({
    id: crypto.randomUUID(),
    name: `Event Detail: ${name}`,
    rollExpression: '1d6',
    rows: successDieRows(),
    sourceReference: 'Strider Mode, p.17-19',
  }));
}
