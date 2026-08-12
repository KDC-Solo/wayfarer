import { describe, expect, it } from 'vitest';
import { createChronicle } from './chronicle.ts';
import { createHero } from './hero.ts';
import { addHero } from './company.ts';
import { createJourney } from './journey.ts';
import { addStep, createStepTemplate, type StepTemplateStep } from './stepTemplate.ts';
import {
  completeLeg,
  completeStep,
  currentStep,
  favourModeForLandDanger,
  resolveRoleHero,
} from './journeyEngine.ts';

function prompt(label: string, enabled = true): StepTemplateStep {
  return { id: crypto.randomUUID(), type: 'prompt', label, enabled, message: label };
}

function branch(when: 'previous-roll-failed' | 'previous-roll-succeeded', skipCount: number): StepTemplateStep {
  return { id: crypto.randomUUID(), type: 'conditional-branch', label: 'branch', enabled: true, when, skipCount };
}

function baseJourney() {
  return createJourney({
    origin: 'A',
    destination: 'B',
    season: 'spring',
    waypoints: [
      { name: 'Leg 1', distance: 1, terrain: 'plain' },
      { name: 'Leg 2', distance: 1, terrain: 'plain' },
    ],
    stepTemplateId: 'template-1',
  });
}

describe('currentStep', () => {
  it('returns the first enabled step', () => {
    let t = createStepTemplate('T');
    t = addStep(t, prompt('A', false));
    t = addStep(t, prompt('B'));
    const { step } = currentStep(baseJourney(), t);
    expect(step?.label).toBe('B');
  });

  it('returns null when the leg has run out of steps', () => {
    const t = createStepTemplate('T'); // no steps
    const { step } = currentStep(baseJourney(), t);
    expect(step).toBeNull();
  });

  it('auto-skips a conditional-branch step that does not match, landing on the next step', () => {
    let t = createStepTemplate('T');
    t = addStep(t, branch('previous-roll-failed', 1));
    t = addStep(t, prompt('Skippable'));
    t = addStep(t, prompt('Landing'));
    const journey = { ...baseJourney(), lastOutcome: 'success' as const };
    const { step } = currentStep(journey, t);
    expect(step?.label).toBe('Skippable'); // branch didn't match — nothing skipped
  });

  it('skips skipCount steps when the branch condition matches, persisting the advanced index', () => {
    let t = createStepTemplate('T');
    t = addStep(t, branch('previous-roll-failed', 1));
    t = addStep(t, prompt('Skipped'));
    t = addStep(t, prompt('Landing'));
    const journey = { ...baseJourney(), lastOutcome: 'failure' as const };
    const { step, journey: advanced } = currentStep(journey, t);
    expect(step?.label).toBe('Landing');
    expect(advanced.currentStepIndex).toBe(2);
  });
});

describe('completeStep / completeLeg', () => {
  it('completeStep advances the index and records the outcome', () => {
    const j = completeStep(baseJourney(), 'failure');
    expect(j.currentStepIndex).toBe(1);
    expect(j.lastOutcome).toBe('failure');
  });

  it('completeStep without an outcome leaves lastOutcome unchanged', () => {
    const j = completeStep({ ...baseJourney(), lastOutcome: 'success' });
    expect(j.lastOutcome).toBe('success');
  });

  it('completeLeg advances to the next waypoint and resets step position', () => {
    const j = completeLeg({ ...baseJourney(), currentStepIndex: 5, lastOutcome: 'success' });
    expect(j.currentLegIndex).toBe(1);
    expect(j.currentStepIndex).toBe(0);
    expect(j.lastOutcome).toBeNull();
    expect(j.status).toBe('in-progress');
  });

  it('completeLeg on the last waypoint marks the journey completed (F3.6)', () => {
    const j = completeLeg({ ...baseJourney(), currentLegIndex: 1 });
    expect(j.status).toBe('completed');
  });
});

describe('resolveRoleHero (F3.5)', () => {
  it('skips role routing for a solo company (Strider Mode p.3/p.16)', () => {
    let chronicle = createChronicle();
    const hero = createHero({ name: 'Idis' });
    chronicle = addHero(chronicle, hero);
    const journey = assignRoleForTest(baseJourney(), 'guide', 'someone-else');
    expect(resolveRoleHero(journey, chronicle, 'guide')).toBe(hero.id);
  });

  it('routes to the assigned hero for a multi-hero company', () => {
    let chronicle = createChronicle();
    const a = createHero({ name: 'Idis' });
    const b = createHero({ name: 'Halbarad' });
    chronicle = addHero(chronicle, a);
    chronicle = addHero(chronicle, b);
    const journey = assignRoleForTest(baseJourney(), 'guide', b.id);
    expect(resolveRoleHero(journey, chronicle, 'guide')).toBe(b.id);
  });

  it('falls back to the active hero when no role is given or the role is unassigned', () => {
    let chronicle = createChronicle();
    const a = createHero({ name: 'Idis' });
    const b = createHero({ name: 'Halbarad' });
    chronicle = addHero(chronicle, a);
    chronicle = addHero(chronicle, b); // active stays 'a' (first added)
    expect(resolveRoleHero(baseJourney(), chronicle, undefined)).toBe(a.id);
    expect(resolveRoleHero(baseJourney(), chronicle, 'scout')).toBe(a.id);
  });
});

function assignRoleForTest(journey: ReturnType<typeof baseJourney>, role: 'guide', heroId: string) {
  return { ...journey, roles: { ...journey.roles, [role]: heroId } };
}

describe('favourModeForLandDanger (Strider Mode p.17)', () => {
  it('maps border/wild/dark to favoured/normal/ill-favoured', () => {
    expect(favourModeForLandDanger('border')).toBe('favoured');
    expect(favourModeForLandDanger('wild')).toBe('normal');
    expect(favourModeForLandDanger('dark')).toBe('ill-favoured');
    expect(favourModeForLandDanger(undefined)).toBe('normal');
  });
});
