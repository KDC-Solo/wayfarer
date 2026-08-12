import { describe, expect, it } from 'vitest';
import { DEFAULT_SKILL_NAMES } from '../data/skills.ts';
import { createHero, deriveHeroStates } from './hero.ts';

describe('createHero', () => {
  it('seeds all default skills at rank 0', () => {
    const hero = createHero({ name: 'Idis' });
    for (const skill of DEFAULT_SKILL_NAMES) {
      expect(hero.skills[skill]).toBe(0);
    }
  });

  it('starts with zeroed resources and attributes', () => {
    const hero = createHero({ name: 'Idis' });
    expect(hero.attributes).toEqual({ strength: 0, heart: 0, wits: 0 });
    expect(hero.resources).toEqual({
      endurance: 0,
      hope: 0,
      fatigue: 0,
      shadow: 0,
      shadowPoints: 0,
      shadowScars: 0,
    });
  });

  it('gives every hero a unique id', () => {
    const a = createHero({ name: 'Idis' });
    const b = createHero({ name: 'Halbarad' });
    expect(a.id).not.toBe(b.id);
  });
});

describe('deriveHeroStates', () => {
  it('is neither weary nor miserable once Endurance/Hope are set and untaxed', () => {
    const hero = createHero({ name: 'Idis' });
    hero.resources.endurance = 20;
    hero.resources.hope = 10;
    expect(deriveHeroStates(hero)).toEqual({ weary: false, miserable: false });
  });

  it('a freshly created hero (Endurance/Hope still 0) reads as Weary/Miserable', () => {
    // Degenerate but correct per the literal rule (fatigue/shadow >= 0):
    // chargen must set real Endurance/Hope before this becomes meaningful.
    const hero = createHero({ name: 'Idis' });
    expect(deriveHeroStates(hero)).toEqual({ weary: true, miserable: true });
  });

  it('flags Weary when Fatigue reaches Endurance (F1.15)', () => {
    const hero = createHero({ name: 'Idis' });
    hero.resources.endurance = 20;
    hero.resources.fatigue = 20;
    expect(deriveHeroStates(hero).weary).toBe(true);
    hero.resources.fatigue = 19;
    expect(deriveHeroStates(hero).weary).toBe(false);
  });

  it('flags Miserable when Shadow reaches Hope (F1.15)', () => {
    const hero = createHero({ name: 'Idis' });
    hero.resources.hope = 10;
    hero.resources.shadow = 10;
    expect(deriveHeroStates(hero).miserable).toBe(true);
    hero.resources.shadow = 9;
    expect(deriveHeroStates(hero).miserable).toBe(false);
  });
});
