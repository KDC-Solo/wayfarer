// The Eye of Mordor (Strider Mode p.13-14) — Eye Awareness, the Hunt
// threshold, and the Revelation Episode it triggers.
//
// This is Strider Mode's signature solo mechanic and the app shipped
// without it, which left the Fortune/Ill-Fortune tables instructing the
// player to "increase Eye Awareness" against a counter that existed
// nowhere. The rules themselves are optional in the book ("recommended
// for use with Strider Mode"), so the tracker is opt-in per chronicle.
//
// What's encoded here is procedural — trigger to effect, and a lookup of
// three numbers — the same category as the Experience Milestones (p.21)
// and Spiritual Recovery tiers (p.20) already in the engine, and the same
// reasoning as D8/D9: mechanics, not narrative content. The *starting*
// score is not computed: its derivation lives in the core rulebook, and
// its inputs (culture, famous items) aren't modelled here, so the player
// enters it themselves.

export type LandRegion = 'border' | 'wild' | 'dark';

/** Strider Mode p.13, Hunt Threshold Region Table. Verified. */
export const HUNT_THRESHOLD_BY_REGION: Record<LandRegion, number> = {
  border: 18,
  wild: 16,
  dark: 14,
};

export const LAND_REGION_LABEL: Record<LandRegion, string> = {
  border: 'Border Land',
  wild: 'Wild Land',
  dark: 'Dark Land',
};

/**
 * Per-chronicle state. `startingScore` is remembered separately because
 * both resets — after a Revelation Episode (p.14) and at the start of the
 * Adventure phase following a Fellowship phase (p.13) — return the score
 * to it, not to zero.
 */
export interface EyeAwarenessState {
  enabled: boolean;
  score: number;
  startingScore: number;
  region: LandRegion;
  /** p.13's Hunt Modifiers Table, applied to the region threshold. The
   * modifiers themselves are the player's judgement call, so this is a
   * single number they set rather than a checklist. */
  huntModifier: number;
}

export function createEyeAwareness(): EyeAwarenessState {
  return { enabled: false, score: 0, startingScore: 0, region: 'wild', huntModifier: 0 };
}

/** p.13: region threshold adjusted by the Hunt modifiers in play. */
export function huntThreshold(state: EyeAwarenessState): number {
  return Math.max(0, HUNT_THRESHOLD_BY_REGION[state.region] + state.huntModifier);
}

/** p.14: a Revelation Episode is due once awareness matches or exceeds
 * the threshold. */
export function revelationDue(state: EyeAwarenessState): boolean {
  return state.enabled && state.score >= huntThreshold(state);
}

export function setEyeScore(state: EyeAwarenessState, score: number): EyeAwarenessState {
  return { ...state, score: Math.max(0, Math.round(score)) };
}

export function adjustEyeScore(state: EyeAwarenessState, delta: number): EyeAwarenessState {
  return setEyeScore(state, state.score + delta);
}

/** p.14: "Once you have triggered a Revelation Episode, reset your Eye
 * Awareness to its starting value." Also p.13's Adventure-phase reset. */
export function resetEyeScore(state: EyeAwarenessState): EyeAwarenessState {
  return { ...state, score: Math.max(0, state.startingScore) };
}

export function setStartingScore(state: EyeAwarenessState, startingScore: number): EyeAwarenessState {
  const starting = Math.max(0, Math.round(startingScore));
  return { ...state, startingScore: starting };
}

/**
 * p.13's automatic increases, as a single decision the caller can apply
 * after any roll. Returns 0 when nothing applies, so callers need no
 * branching of their own.
 *
 * - An Eye icon on a roll *outside combat* raises the score by 1,
 *   whether the roll succeeded or not.
 * - Shadow points gained outside combat raise it by that amount.
 *
 * The third trigger — an Eye result on the Ill-Fortune Table adding a
 * further 2 — is applied where that table is rolled, since only the
 * caller knows which table produced the result.
 */
export function eyeIncreaseForRoll(input: {
  eye: boolean;
  inCombat: boolean;
  shadowPointsGained?: number;
}): number {
  if (input.inCombat) return 0;
  return (input.eye ? 1 : 0) + Math.max(0, input.shadowPointsGained ?? 0);
}

/** p.13: an Eye result on the Ill-Fortune Table adds 2, on top of the
 * increase from the Eye that sent you to that table in the first place. */
export const ILL_FORTUNE_EYE_INCREASE = 2;
