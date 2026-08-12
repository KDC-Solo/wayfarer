// The Telling Table (F2.1, F2.3) — Strider Mode p.10. This is a mechanic
// (a threshold formula), not narrative table content, so — like the TN
// formula (D8) — it's implemented directly rather than shipped as a
// user-populated OracleTable skeleton. The band names and thresholds below
// are the game's actual chance-to-threshold mapping; see D9/D10.

import type { FeatDieFace } from './dice.ts';

export type ChanceBand = 'certain' | 'likely' | 'middling' | 'doubtful' | 'unthinkable';

export const CHANCE_BANDS: readonly ChanceBand[] = [
  'certain',
  'likely',
  'middling',
  'doubtful',
  'unthinkable',
];

export const DEFAULT_CHANCE_BAND: ChanceBand = 'middling';

const THRESHOLD: Record<ChanceBand, number> = {
  certain: 1,
  likely: 4,
  middling: 6,
  doubtful: 8,
  unthinkable: 10,
};

export interface TellingTableResult {
  question: string;
  chance: ChanceBand;
  featDie: FeatDieFace;
  answer: 'yes' | 'no';
  /** True on rune (always yes) or Eye (always no) — "an extreme result or
   * twist" for the player to elaborate on (F1.7-style narrative flag). */
  extreme: boolean;
}

export function resolveTellingTable(
  question: string,
  chance: ChanceBand,
  featDie: FeatDieFace,
): TellingTableResult {
  if (featDie === 'rune') return { question, chance, featDie, answer: 'yes', extreme: true };
  if (featDie === 'eye') return { question, chance, featDie, answer: 'no', extreme: true };
  const answer = featDie >= THRESHOLD[chance] ? 'yes' : 'no';
  return { question, chance, featDie, answer, extreme: false };
}
