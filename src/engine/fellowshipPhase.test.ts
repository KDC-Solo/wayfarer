import { describe, expect, it } from 'vitest';
import { createHero } from './hero.ts';
import {
  applyShadowRecovery,
  completeHeroTurn,
  createFellowshipPhase,
  SHADOW_RECOVERY_AMOUNT,
  setPatronErrand,
} from './fellowshipPhase.ts';

describe('createFellowshipPhase', () => {
  it('starts in-progress at the first hero and step', () => {
    const phase = createFellowshipPhase({
      year: 2954,
      location: 'Bree',
      stepTemplateId: 't1',
      heroIds: ['h1', 'h2'],
    });
    expect(phase.status).toBe('in-progress');
    expect(phase.currentHeroIndex).toBe(0);
    expect(phase.currentStepIndex).toBe(0);
    expect(phase.heroOrder).toEqual(['h1', 'h2']);
  });

  it('an empty company completes immediately rather than getting stuck', () => {
    const phase = createFellowshipPhase({ year: 2954, location: 'Bree', stepTemplateId: 't1', heroIds: [] });
    expect(phase.status).toBe('completed');
  });
});

describe('completeHeroTurn', () => {
  it('advances to the next hero and resets step position', () => {
    let phase = createFellowshipPhase({
      year: 2954,
      location: 'Bree',
      stepTemplateId: 't1',
      heroIds: ['h1', 'h2'],
    });
    phase = { ...phase, currentStepIndex: 3, lastOutcome: 'success' };
    phase = completeHeroTurn(phase);
    expect(phase.currentHeroIndex).toBe(1);
    expect(phase.currentStepIndex).toBe(0);
    expect(phase.lastOutcome).toBeNull();
    expect(phase.status).toBe('in-progress');
  });

  it('completes the phase after the last hero (F4.6)', () => {
    let phase = createFellowshipPhase({ year: 2954, location: 'Bree', stepTemplateId: 't1', heroIds: ['h1'] });
    phase = completeHeroTurn(phase);
    expect(phase.status).toBe('completed');
  });
});

describe('setPatronErrand (F4.5)', () => {
  it('sets the errand without touching anything else', () => {
    const phase = createFellowshipPhase({ year: 2954, location: 'Bree', stepTemplateId: 't1', heroIds: ['h1'] });
    const updated = setPatronErrand(phase, 'Investigate the ruins at Amon Sûl');
    expect(updated.patronErrand).toBe('Investigate the ruins at Amon Sûl');
    expect(updated.currentHeroIndex).toBe(phase.currentHeroIndex);
  });
});

describe('applyShadowRecovery (F4.3, Strider Mode p.20)', () => {
  it('removes the tiered amount, clamped at zero', () => {
    let hero = createHero({ name: 'Idis' });
    hero = { ...hero, resources: { ...hero.resources, shadow: 5 } };

    expect(applyShadowRecovery(hero, 'marginal').resources.shadow).toBe(4);
    expect(applyShadowRecovery(hero, 'active-harm').resources.shadow).toBe(3);
    expect(applyShadowRecovery(hero, 'major-feat').resources.shadow).toBe(2);
  });

  it('does not go negative', () => {
    let hero = createHero({ name: 'Idis' });
    hero = { ...hero, resources: { ...hero.resources, shadow: 1 } };
    expect(applyShadowRecovery(hero, 'major-feat').resources.shadow).toBe(0);
  });

  it('tiers match the verified amounts (1/2/3)', () => {
    expect(SHADOW_RECOVERY_AMOUNT).toEqual({ marginal: 1, 'active-harm': 2, 'major-feat': 3 });
  });
});
