import { describe, expect, it } from 'vitest';
import {
  describeRollRequirement,
  resolveSkillRoll,
  rollFeatDie,
  rollSuccessDie,
  targetNumber,
} from './dice.ts';

describe('targetNumber', () => {
  it('uses 20 − Attribute for a company larger than one', () => {
    expect(targetNumber(4, 2)).toBe(16);
    expect(targetNumber(4, 4)).toBe(16);
  });

  it('uses 18 − Attribute for a lone hero (D8)', () => {
    expect(targetNumber(4, 1)).toBe(14);
  });
});

describe('resolveSkillRoll — basic success/failure', () => {
  it('succeeds when total meets the target number', () => {
    const r = resolveSkillRoll({
      featDice: [8],
      favourMode: 'normal',
      successDice: [3, 4],
      targetNumber: 14, // 8+3+4=15 >= 14
    });
    expect(r.total).toBe(15);
    expect(r.success).toBe(true);
    expect(r.degreeOfSuccess).toBe('success');
  });

  it('fails when total is below the target number', () => {
    const r = resolveSkillRoll({
      featDice: [2],
      favourMode: 'normal',
      successDice: [1, 1],
      targetNumber: 14,
    });
    expect(r.total).toBe(4);
    expect(r.success).toBe(false);
    expect(r.degreeOfSuccess).toBe('none');
  });

  it('handles a rank-0 skill (no success dice)', () => {
    const r = resolveSkillRoll({
      featDice: [10],
      favourMode: 'normal',
      successDice: [],
      targetNumber: 10,
    });
    expect(r.total).toBe(10);
    expect(r.success).toBe(true);
  });
});

describe('resolveSkillRoll — special Feat die faces (F1.7)', () => {
  it('rune is an automatic success regardless of total', () => {
    const r = resolveSkillRoll({
      featDice: ['rune'],
      favourMode: 'normal',
      successDice: [1, 1],
      targetNumber: 20, // total will be far below 20
    });
    expect(r.rune).toBe(true);
    expect(r.success).toBe(true);
  });

  it('eye counts as zero but does not force a failure by itself', () => {
    const r = resolveSkillRoll({
      featDice: ['eye'],
      favourMode: 'normal',
      successDice: [6, 6, 6],
      targetNumber: 14, // 0+18=18 >= 14, still succeeds
    });
    expect(r.eye).toBe(true);
    expect(r.total).toBe(18);
    expect(r.success).toBe(true);
  });
});

describe('resolveSkillRoll — favoured / ill-favoured (F1.9)', () => {
  it('favoured keeps the better of two Feat dice', () => {
    const r = resolveSkillRoll({
      featDice: [3, 9],
      favourMode: 'favoured',
      successDice: [],
      targetNumber: 5,
    });
    expect(r.featDieUsed).toBe(9);
    expect(r.discardedFeatDie).toBe(3);
  });

  it('favoured prefers a rune over any number', () => {
    const r = resolveSkillRoll({
      featDice: [10, 'rune'],
      favourMode: 'favoured',
      successDice: [],
      targetNumber: 5,
    });
    expect(r.featDieUsed).toBe('rune');
  });

  it('ill-favoured keeps the worse of two Feat dice', () => {
    const r = resolveSkillRoll({
      featDice: [3, 9],
      favourMode: 'ill-favoured',
      successDice: [],
      targetNumber: 5,
    });
    expect(r.featDieUsed).toBe(3);
    expect(r.discardedFeatDie).toBe(9);
  });

  it('ill-favoured prefers an eye over any number', () => {
    const r = resolveSkillRoll({
      featDice: [1, 'eye'],
      favourMode: 'ill-favoured',
      successDice: [],
      targetNumber: 5,
    });
    expect(r.featDieUsed).toBe('eye');
  });
});

describe('resolveSkillRoll — weary (F1.9, F1.15)', () => {
  it('zeroes Success dice showing 1-3 when weary', () => {
    const r = resolveSkillRoll({
      featDice: [5],
      favourMode: 'normal',
      successDice: [1, 2, 3, 4, 5, 6],
      targetNumber: 0,
      weary: true,
    });
    expect(r.effectiveSuccessValues).toEqual([0, 0, 0, 4, 5, 6]);
    expect(r.total).toBe(5 + 0 + 0 + 0 + 4 + 5 + 6);
  });

  it('does not zero anything when not weary', () => {
    const r = resolveSkillRoll({
      featDice: [5],
      favourMode: 'normal',
      successDice: [1, 2, 3],
      targetNumber: 0,
    });
    expect(r.effectiveSuccessValues).toEqual([1, 2, 3]);
  });
});

describe('resolveSkillRoll — Hope spend (F1.9)', () => {
  it('adds the attribute value to the total when Hope is spent', () => {
    const withoutHope = resolveSkillRoll({
      featDice: [5],
      favourMode: 'normal',
      successDice: [1],
      targetNumber: 0,
    });
    const withHope = resolveSkillRoll({
      featDice: [5],
      favourMode: 'normal',
      successDice: [1],
      targetNumber: 0,
      hopeSpent: true,
      attributeValue: 6,
    });
    expect(withHope.total).toBe(withoutHope.total + 6);
  });
});

describe('resolveSkillRoll — degrees of success (F1.8)', () => {
  it('one six is a plain success', () => {
    const r = resolveSkillRoll({
      featDice: [1],
      favourMode: 'normal',
      successDice: [6],
      targetNumber: 0,
    });
    expect(r.sixCount).toBe(1);
    expect(r.degreeOfSuccess).toBe('success');
  });

  it('two sixes is a great success', () => {
    const r = resolveSkillRoll({
      featDice: [1],
      favourMode: 'normal',
      successDice: [6, 6],
      targetNumber: 0,
    });
    expect(r.degreeOfSuccess).toBe('great');
  });

  it('three or more sixes is an extraordinary success', () => {
    const r = resolveSkillRoll({
      featDice: [1],
      favourMode: 'normal',
      successDice: [6, 6, 6],
      targetNumber: 0,
    });
    expect(r.degreeOfSuccess).toBe('extraordinary');
  });

  it('a failed roll is never a degree of success, even with sixes', () => {
    const r = resolveSkillRoll({
      featDice: ['eye'],
      favourMode: 'normal',
      successDice: [6],
      targetNumber: 100,
    });
    expect(r.success).toBe(false);
    expect(r.degreeOfSuccess).toBe('none');
  });
});

describe('describeRollRequirement', () => {
  it('requests one Feat die when normal, two when favoured/ill-favoured', () => {
    const normal = describeRollRequirement({
      skillRank: 2,
      attributeValue: 4,
      companySize: 2,
      favourMode: 'normal',
      weary: false,
    });
    expect(normal.featDiceCount).toBe(1);
    expect(normal.successDiceCount).toBe(2);
    expect(normal.targetNumber).toBe(16);

    const favoured = describeRollRequirement({
      skillRank: 2,
      attributeValue: 4,
      companySize: 2,
      favourMode: 'favoured',
      weary: false,
    });
    expect(favoured.featDiceCount).toBe(2);
  });
});

describe('rollFeatDie / rollSuccessDie', () => {
  it('rollFeatDie only ever returns 1-10, eye, or rune', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const face = rollFeatDie();
      seen.add(String(face));
      if (typeof face === 'number') {
        expect(face).toBeGreaterThanOrEqual(1);
        expect(face).toBeLessThanOrEqual(10);
      } else {
        expect(['eye', 'rune']).toContain(face);
      }
    }
    // Over 500 rolls we should see a good spread, including both special faces.
    expect(seen.has('eye')).toBe(true);
    expect(seen.has('rune')).toBe(true);
  });

  it('rollSuccessDie only ever returns 1-6', () => {
    for (let i = 0; i < 200; i++) {
      const face = rollSuccessDie();
      expect(face).toBeGreaterThanOrEqual(1);
      expect(face).toBeLessThanOrEqual(6);
    }
  });
});
