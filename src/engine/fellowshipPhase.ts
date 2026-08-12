// F4.1-F4.6. The Fellowship Phase's base structure is confirmed unchanged
// from the core rulebook for solo players (Strider Mode p.20) and isn't on
// file here, so it isn't reproduced. What Strider Mode does add and is
// encoded below: "Spiritual Recovery for Solo Player-heroes" (p.20), a
// judged three-tier Shadow recovery in place of a Loremaster's call.

import type { Hero } from './types.ts';
import type { StepRunPosition } from './stepRunner.ts';

export type ShadowRecoveryTier = 'marginal' | 'active-harm' | 'major-feat';

/** Strider Mode p.20, "Spiritual Recovery for Solo Player-heroes." */
export const SHADOW_RECOVERY_AMOUNT: Record<ShadowRecoveryTier, number> = {
  marginal: 1,
  'active-harm': 2,
  'major-feat': 3,
};

export const SHADOW_RECOVERY_LABEL: Record<ShadowRecoveryTier, string> = {
  marginal: 'Actions at least marginally interfered with the return of the Shadow',
  'active-harm': 'Deeds actively hindered or damaged the Enemy',
  'major-feat': "Feats that would gain the Dark Lord's own attention (or a major servant's)",
};

export function applyShadowRecovery(hero: Hero, tier: ShadowRecoveryTier): Hero {
  const amount = SHADOW_RECOVERY_AMOUNT[tier];
  return { ...hero, resources: { ...hero.resources, shadow: Math.max(0, hero.resources.shadow - amount) } };
}

export type FellowshipPhaseStatus = 'in-progress' | 'completed';

/**
 * One Fellowship Phase, run as a step template (F4.6) over each hero in
 * turn — "legs" here are hero turns, not waypoints, which is why this is
 * its own small entity rather than a reuse of Journey (the targeting
 * semantics genuinely differ: no roles, no land danger, just "this turn's
 * hero"). It shares the same generic interpreter (stepRunner.ts) that
 * Journey uses, which is the actual reuse F4.6 asks for.
 */
export interface FellowshipPhase extends StepRunPosition {
  id: string;
  year: number;
  location: string;
  stepTemplateId: string;
  /** Snapshot of the company at phase start, so a hero added/removed
   * mid-phase doesn't shift whose turn it is. */
  heroOrder: string[];
  currentHeroIndex: number;
  patronErrand: string;
  status: FellowshipPhaseStatus;
  createdAt: string;
}

export function createFellowshipPhase(input: {
  year: number;
  location: string;
  stepTemplateId: string;
  heroIds: string[];
}): FellowshipPhase {
  return {
    id: crypto.randomUUID(),
    year: input.year,
    location: input.location,
    stepTemplateId: input.stepTemplateId,
    heroOrder: input.heroIds,
    currentHeroIndex: 0,
    currentStepIndex: 0,
    lastOutcome: null,
    patronErrand: '',
    status: input.heroIds.length === 0 ? 'completed' : 'in-progress',
    createdAt: new Date().toISOString(),
  };
}

/** Call when currentStep() (stepRunner.ts) returns a null step — advances
 * to the next hero's turn, or completes the phase after the last one. */
export function completeHeroTurn(phase: FellowshipPhase): FellowshipPhase {
  const next = phase.currentHeroIndex + 1;
  if (next >= phase.heroOrder.length) {
    return { ...phase, status: 'completed', currentHeroIndex: next };
  }
  return { ...phase, currentHeroIndex: next, currentStepIndex: 0, lastOutcome: null };
}

/** F4.5 — the errand that opens the next adventuring phase. */
export function setPatronErrand(phase: FellowshipPhase, errand: string): FellowshipPhase {
  return { ...phase, patronErrand: errand };
}
