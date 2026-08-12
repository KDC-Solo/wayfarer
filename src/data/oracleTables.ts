// Default table skeletons seeded on first run (C2): correct row structure
// (all twelve Feat die faces, page reference) with every result blank —
// the user fills these in from their own copy of Strider Mode p.8.
//
// The Lore Table (p.11-12, three columns — Action/Aspect/Focus — across
// twelve Feat-die sections of six rows each) isn't seeded yet: it doesn't
// fit the single-column row model below, and building a faithful
// multi-column skeleton editor is deferred rather than half-built here.
// Users can still replicate it manually via F2.4/F2.5's generic table
// tools in the meantime. See CLAUDE.md.

import type { OracleTable } from '../engine/oracleTable.ts';

const FEAT_FACE_ROWS = (): OracleTable['rows'] => [
  { featFace: 'eye', text: '' },
  ...Array.from({ length: 10 }, (_, i) => ({ min: i + 1, max: i + 1, text: '' })),
  { featFace: 'rune', text: '' },
];

export function defaultOracleTables(): OracleTable[] {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Fortune Table',
      rollExpression: 'Feat die (from a rune result)',
      rows: FEAT_FACE_ROWS(),
      sourceReference: 'Strider Mode, p.8',
    },
    {
      id: crypto.randomUUID(),
      name: 'Ill-Fortune Table',
      rollExpression: 'Feat die (from an Eye result)',
      rows: FEAT_FACE_ROWS(),
      sourceReference: 'Strider Mode, p.8',
    },
  ];
}
