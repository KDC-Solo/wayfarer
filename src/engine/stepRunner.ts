// The generic step-template interpreter (F3.6, reused per F4.6/F5.8 — D2's
// "StepTemplate is the extensibility mechanism"). Journeys and Fellowship
// phases both walk a StepTemplate one step at a time; this module holds the
// shared algorithm — auto-resolving conditional-branch steps, since they
// need no player input — over anything that tracks a step position.
// journeyEngine.ts wraps this for Journey specifically (keeping its
// existing field names); fellowshipPhase.ts uses it directly.

import type { StepTemplate, StepTemplateStep } from './stepTemplate.ts';

export interface StepRunPosition {
  currentStepIndex: number;
  lastOutcome: 'success' | 'failure' | null;
}

export interface StepRunResult<T extends StepRunPosition> {
  /** Possibly advanced past auto-resolved conditional-branch steps — persist this. */
  position: T;
  /** Null means the current run has exhausted the template's steps. */
  step: StepTemplateStep | null;
}

export function currentStep<T extends StepRunPosition>(
  position: T,
  template: StepTemplate,
): StepRunResult<T> {
  let index = position.currentStepIndex;
  while (index < template.steps.length) {
    const step = template.steps[index];
    if (!step.enabled) {
      index++;
      continue;
    }
    if (step.type === 'conditional-branch') {
      const matches =
        (step.when === 'previous-roll-failed' && position.lastOutcome === 'failure') ||
        (step.when === 'previous-roll-succeeded' && position.lastOutcome === 'success');
      index += 1 + (matches ? step.skipCount : 0);
      continue;
    }
    return { position: { ...position, currentStepIndex: index }, step };
  }
  return { position: { ...position, currentStepIndex: index }, step: null };
}

/** Call once the UI has resolved and logged the current interactive step. */
export function completeStep<T extends StepRunPosition>(
  position: T,
  outcome?: 'success' | 'failure',
): T {
  return {
    ...position,
    currentStepIndex: position.currentStepIndex + 1,
    lastOutcome: outcome ?? position.lastOutcome,
  };
}
