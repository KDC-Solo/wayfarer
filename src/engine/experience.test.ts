import { describe, expect, it } from 'vitest';
import { createHero } from './hero.ts';
import {
  applyExperienceSpend,
  awardMilestone,
  EXPERIENCE_MILESTONES,
  InsufficientExperienceError,
} from './experience.ts';

describe('EXPERIENCE_MILESTONES', () => {
  it('has ten milestones verified against Strider Mode p.21', () => {
    expect(EXPERIENCE_MILESTONES).toHaveLength(10);
    expect(EXPERIENCE_MILESTONES.every((m) => m.name.length > 0)).toBe(true);
  });
});

describe('awardMilestone', () => {
  it('adds both point totals from the milestone', () => {
    const hero = createHero({ name: 'Idis' });
    const milestone = EXPERIENCE_MILESTONES.find((m) => m.name === "Complete a patron's mission")!;
    const updated = awardMilestone(hero, milestone);
    expect(updated.adventurePoints).toBe(1);
    expect(updated.skillPoints).toBe(1);
  });

  it('a Skill-Point-only milestone leaves Adventure Points untouched', () => {
    const hero = createHero({ name: 'Idis' });
    const milestone = EXPERIENCE_MILESTONES.find((m) => m.name === 'Complete a meaningful journey')!;
    const updated = awardMilestone(hero, milestone);
    expect(updated.adventurePoints).toBe(0);
    expect(updated.skillPoints).toBe(2);
  });
});

describe('applyExperienceSpend', () => {
  it('deducts the cost from the chosen currency and applies a skill rank increase', () => {
    let hero = createHero({ name: 'Idis' });
    hero = { ...hero, skillPoints: 5 };
    const updated = applyExperienceSpend(hero, 'skill', 3, { kind: 'skill', name: 'Awareness', newRank: 2 });
    expect(updated.skillPoints).toBe(2);
    expect(updated.skills.Awareness).toBe(2);
  });

  it('deducts from Adventure Points and applies a Valour increase', () => {
    let hero = createHero({ name: 'Idis' });
    hero = { ...hero, adventurePoints: 4 };
    const updated = applyExperienceSpend(hero, 'adventure', 4, { kind: 'valour', newRank: 1 });
    expect(updated.adventurePoints).toBe(0);
    expect(updated.valour).toBe(1);
  });

  it('applies a proficiency increase', () => {
    let hero = createHero({ name: 'Idis' });
    hero = { ...hero, skillPoints: 2 };
    const updated = applyExperienceSpend(hero, 'skill', 2, { kind: 'proficiency', name: 'Bows', newRank: 1 });
    expect(updated.combatProficiencies.Bows).toBe(1);
  });

  it('applies a Wisdom increase', () => {
    let hero = createHero({ name: 'Idis' });
    hero = { ...hero, adventurePoints: 3 };
    const updated = applyExperienceSpend(hero, 'adventure', 3, { kind: 'wisdom', newRank: 1 });
    expect(updated.wisdom).toBe(1);
  });

  it('refuses to spend more than the hero has (F4.4 validation)', () => {
    const hero = createHero({ name: 'Idis' });
    expect(() =>
      applyExperienceSpend(hero, 'skill', 1, { kind: 'skill', name: 'Awareness', newRank: 1 }),
    ).toThrow(InsufficientExperienceError);
  });

  it('the two currencies are tracked independently', () => {
    let hero = createHero({ name: 'Idis' });
    hero = { ...hero, adventurePoints: 5, skillPoints: 0 };
    expect(() =>
      applyExperienceSpend(hero, 'skill', 1, { kind: 'skill', name: 'Awareness', newRank: 1 }),
    ).toThrow(InsufficientExperienceError);
    // Adventure Points are untouched by the failed skill-currency spend.
    expect(hero.adventurePoints).toBe(5);
  });
});
