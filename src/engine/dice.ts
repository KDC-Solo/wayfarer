// The skill-roll dice engine (F1.6–F1.9, F1.11, F1.12). Resolution is a pure
// function over already-known face values — deciding *what* the faces are is
// a separate concern (rollFeatDie/rollSuccessDie for app-rolls mode; UI
// tap-selection for player-rolls/hybrid) so that F1.13 holds: interpretation,
// degrees of success, and logging behave identically regardless of input
// mode, which only changes where the numbers come from.

import { randomInt } from './random.ts';

export type FeatDieFace = number | 'eye' | 'rune'; // number is 1-10
export type SuccessDieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type FavourMode = 'normal' | 'favoured' | 'ill-favoured';
export type DegreeOfSuccess = 'none' | 'success' | 'great' | 'extraordinary';

/**
 * F1.5/F1.6 (D8): TN = 20 − Attribute in standard company play; TN = 18 −
 * Attribute when the solo adjustment is active (company of exactly one).
 */
export function targetNumber(attributeValue: number, companySize: number): number {
  const base = companySize === 1 ? 18 : 20;
  return base - attributeValue;
}

function featDieRank(face: FeatDieFace): number {
  if (face === 'eye') return -1; // worst possible outcome
  if (face === 'rune') return 11; // best possible outcome (auto success)
  return face;
}

function pickFeatDie(
  dice: FeatDieFace[],
  favourMode: FavourMode,
): { used: FeatDieFace; discarded?: FeatDieFace } {
  if (dice.length === 1) return { used: dice[0] };
  const [a, b] = dice;
  const wantHigher = favourMode !== 'ill-favoured'; // favoured or (defensively) normal-with-2
  const aWins = wantHigher ? featDieRank(a) >= featDieRank(b) : featDieRank(a) <= featDieRank(b);
  return aWins ? { used: a, discarded: b } : { used: b, discarded: a };
}

export interface SkillRollInput {
  /** One die normally; two when favoured or ill-favoured (F1.9). */
  featDice: FeatDieFace[];
  favourMode: FavourMode;
  /** Length should equal the skill rank; may be empty for a rank-0 skill. */
  successDice: SuccessDieFace[];
  targetNumber: number;
  /** Weary (F1.9, F1.15): Success dice showing 1–3 count as zero. Scoped to
   * Success dice only, not the Feat die, which already has its own special
   * faces — check this against your book if the ruling differs. */
  weary?: boolean;
  hopeSpent?: boolean;
  /** Required when hopeSpent — the relevant attribute value is added to the total. */
  attributeValue?: number;
}

export interface SkillRollResult {
  featDieUsed: FeatDieFace;
  discardedFeatDie?: FeatDieFace;
  successDiceRolled: SuccessDieFace[];
  effectiveSuccessValues: number[];
  rune: boolean;
  eye: boolean;
  sixCount: number;
  total: number;
  targetNumber: number;
  success: boolean;
  degreeOfSuccess: DegreeOfSuccess;
}

export function resolveSkillRoll(input: SkillRollInput): SkillRollResult {
  const { used, discarded } = pickFeatDie(input.featDice, input.favourMode);
  const rune = used === 'rune';
  const eye = used === 'eye';
  const featNumeric = typeof used === 'number' ? used : 0; // eye and rune both contribute 0

  const effectiveSuccessValues: number[] = input.successDice.map((v) =>
    input.weary && v <= 3 ? 0 : v,
  );
  const sixCount = effectiveSuccessValues.filter((v) => v === 6).length;

  const successSum = effectiveSuccessValues.reduce((a, b) => a + b, 0);
  const hopeBonus = input.hopeSpent ? (input.attributeValue ?? 0) : 0;
  const total = featNumeric + successSum + hopeBonus;

  // F1.7: rune is an automatic success regardless of total. Eye counts as
  // zero but does not itself force a failure — it's judged on the total
  // like any other roll, just handicapped.
  const success = rune ? true : total >= input.targetNumber;

  const degreeOfSuccess: DegreeOfSuccess = !success
    ? 'none'
    : sixCount >= 3
      ? 'extraordinary'
      : sixCount === 2
        ? 'great'
        : 'success';

  return {
    featDieUsed: used,
    discardedFeatDie: discarded,
    successDiceRolled: input.successDice,
    effectiveSuccessValues,
    rune,
    eye,
    sixCount,
    total,
    targetNumber: input.targetNumber,
    success,
    degreeOfSuccess,
  };
}

/** F1.11 — what to present before rolling, so the requirement is unambiguous
 * in player-rolls and hybrid modes. */
export interface RollRequirement {
  featDiceCount: 1 | 2;
  successDiceCount: number;
  targetNumber: number;
  favourMode: FavourMode;
  weary: boolean;
}

export function describeRollRequirement(params: {
  skillRank: number;
  attributeValue: number;
  companySize: number;
  favourMode: FavourMode;
  weary: boolean;
}): RollRequirement {
  return {
    featDiceCount: params.favourMode === 'normal' ? 1 : 2,
    successDiceCount: params.skillRank,
    targetNumber: targetNumber(params.attributeValue, params.companySize),
    favourMode: params.favourMode,
    weary: params.weary,
  };
}

/** app-rolls mode only — player-rolls/hybrid get face values from the UI. */
export function rollFeatDie(): FeatDieFace {
  const n = randomInt(12); // 0..11, each face equally likely
  if (n === 10) return 'eye';
  if (n === 11) return 'rune';
  return n + 1;
}

export function rollSuccessDie(): SuccessDieFace {
  return (randomInt(6) + 1) as SuccessDieFace;
}
