import { describe, expect, it } from 'vitest';
import { advanceYear, createChronicle } from './chronicle.ts';
import {
  adjustEyeScore,
  createEyeAwareness,
  eyeIncreaseForRoll,
  HUNT_THRESHOLD_BY_REGION,
  huntThreshold,
  ILL_FORTUNE_EYE_INCREASE,
  resetEyeScore,
  revelationDue,
  setStartingScore,
} from './eyeAwareness.ts';

describe('Hunt threshold (Strider Mode p.13, verified)', () => {
  it('uses the region table', () => {
    expect(HUNT_THRESHOLD_BY_REGION).toEqual({ border: 18, wild: 16, dark: 14 });
  });

  it('applies the Hunt modifier to the region threshold, never below zero', () => {
    const state = { ...createEyeAwareness(), region: 'dark' as const, huntModifier: 4 };
    expect(huntThreshold(state)).toBe(18);
    expect(huntThreshold({ ...state, huntModifier: -20 })).toBe(0);
  });
});

describe('revelationDue (p.14)', () => {
  it('is due when the score matches or exceeds the threshold', () => {
    const base = { ...createEyeAwareness(), enabled: true, region: 'wild' as const };
    expect(revelationDue({ ...base, score: 15 })).toBe(false);
    expect(revelationDue({ ...base, score: 16 })).toBe(true);
    expect(revelationDue({ ...base, score: 20 })).toBe(true);
  });

  it('never fires while the optional rules are switched off', () => {
    expect(revelationDue({ ...createEyeAwareness(), score: 99 })).toBe(false);
  });
});

describe('increases (p.13)', () => {
  it('an Eye outside combat raises by 1, win or lose', () => {
    expect(eyeIncreaseForRoll({ eye: true, inCombat: false })).toBe(1);
    expect(eyeIncreaseForRoll({ eye: false, inCombat: false })).toBe(0);
  });

  it('rolls inside combat never raise it', () => {
    expect(eyeIncreaseForRoll({ eye: true, inCombat: true })).toBe(0);
    expect(eyeIncreaseForRoll({ eye: true, inCombat: true, shadowPointsGained: 3 })).toBe(0);
  });

  it('Shadow points gained outside combat raise it by that amount, and stack with the Eye', () => {
    expect(eyeIncreaseForRoll({ eye: false, inCombat: false, shadowPointsGained: 2 })).toBe(2);
    expect(eyeIncreaseForRoll({ eye: true, inCombat: false, shadowPointsGained: 2 })).toBe(3);
  });

  it('the Ill-Fortune Eye result adds 2 on top', () => {
    expect(ILL_FORTUNE_EYE_INCREASE).toBe(2);
  });

  it('never goes negative', () => {
    expect(adjustEyeScore(createEyeAwareness(), -5).score).toBe(0);
  });
});

describe('resets', () => {
  it('returns to the starting value, not to zero (p.14)', () => {
    let state = setStartingScore(createEyeAwareness(), 3);
    state = adjustEyeScore(state, 12);
    expect(state.score).toBe(12);
    expect(resetEyeScore(state).score).toBe(3);
  });

  it('a Fellowship phase resets it for the Adventure phase that follows (p.13)', () => {
    const chronicle = createChronicle();
    const eye = adjustEyeScore(setStartingScore(createEyeAwareness(), 2), 9);
    const next = advanceYear({ ...chronicle, eyeAwareness: eye });
    expect(next.eyeAwareness?.score).toBe(2);
    expect(next.currentYear).toBe(1);
  });

  it('leaves chronicles that predate the tracker alone', () => {
    const chronicle = { ...createChronicle(), eyeAwareness: undefined };
    expect(advanceYear(chronicle).eyeAwareness).toBeUndefined();
  });
});
