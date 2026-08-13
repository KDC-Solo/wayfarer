// The journey-specific wrapper around the generic step interpreter
// (stepRunner.ts) — see that module for the shared algorithm (F3.6, reused
// per F4.6 by fellowshipPhase.ts).

import type { FavourMode } from './dice.ts';
import type { Journey, Waypoint } from './journey.ts';
import { currentStep as genericCurrentStep, completeStep as genericCompleteStep } from './stepRunner.ts';
import type { JourneyRole, StepTemplate, StepTemplateStep } from './stepTemplate.ts';
import type { Chronicle } from './types.ts';

export interface CurrentStepResult {
  /** Possibly advanced past auto-resolved conditional-branch steps — persist this. */
  journey: Journey;
  /** Null means the current leg has run out of steps. */
  step: StepTemplateStep | null;
}

export function currentStep(journey: Journey, template: StepTemplate): CurrentStepResult {
  const { position, step } = genericCurrentStep(journey, template);
  return { journey: position, step };
}

/** Call once the UI has resolved and logged the current interactive step. */
export function completeStep(journey: Journey, outcome?: 'success' | 'failure'): Journey {
  return genericCompleteStep(journey, outcome);
}

/** Call when currentStep() returns a null step — advances to the next
 * waypoint, or completes the journey if that was the last one (F3.6). */
export function completeLeg(journey: Journey): Journey {
  const nextLeg = journey.currentLegIndex + 1;
  if (nextLeg >= journey.waypoints.length) {
    return { ...journey, status: 'completed', currentLegIndex: nextLeg };
  }
  return { ...journey, currentLegIndex: nextLeg, currentStepIndex: 0, lastOutcome: null };
}

/**
 * F3.5 — routes a roll to the hero holding the given role. Strider Mode p.3:
 * no roles are assigned when travelling as a solo company — the sole
 * Player-hero handles everything, so role routing is skipped entirely for a
 * company of one.
 */
export function resolveRoleHero(
  journey: Journey,
  chronicle: Chronicle,
  role: JourneyRole | undefined,
): string | null {
  if (chronicle.company.length === 1) return chronicle.company[0]?.id ?? null;
  if (!role) return chronicle.activeHeroId;
  return journey.roles[role] ?? chronicle.activeHeroId ?? null;
}

/**
 * Strider Mode p.17 — the Solo Journey Events roll (and, by extension, the
 * skill test it calls for) is Favoured in a Border Land, plain in a Wild
 * Land, Ill-favoured in a Dark Land.
 */
export function favourModeForLandDanger(landDanger: Waypoint['landDanger']): FavourMode {
  if (landDanger === 'border') return 'favoured';
  if (landDanger === 'dark') return 'ill-favoured';
  return 'normal';
}

/**
 * Strider Mode p.17 — the journey event's skill roll loses (1d) in hard
 * terrain and gains (1d) along a road. Feeds RollPanel's successDiceDelta
 * (the same plumbing the Skirmish stance uses); still overridable at the
 * roll like everything else (N7).
 */
export function successDiceDeltaForTerrain(modifier: Waypoint['terrainModifier']): number {
  if (modifier === 'hard') return -1;
  if (modifier === 'road') return 1;
  return 0;
}
