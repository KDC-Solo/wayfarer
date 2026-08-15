import { describe, expect, it } from 'vitest';
import { createHeroFromChoices } from './hero.ts';
import { CultureError, deriveEndurance, deriveHope, deriveParry, validateCalling, validateCulture } from './culture.ts';
import type { Calling, Culture } from './culture.ts';

const culture: Culture = {
  id: 'c1',
  name: 'Testfolk',
  attributeSets: [
    { roll: 1, strength: 5, heart: 7, wits: 2 },
    { roll: 2, strength: 4, heart: 6, wits: 4 },
  ],
  derived: { endurance: 20, hope: 8, parry: 12 },
  skills: { Awe: 1, Battle: 2, Travel: 3 },
  favouredSkillChoices: ['Awe', 'Battle'],
  blessingName: 'Stout-hearted',
  standardOfLiving: 'Prosperous',
  distinctiveFeatures: ['Bold', 'Fair', 'Proud'],
  sourceReference: 'core rules, p.36',
};

const calling: Calling = {
  id: 'k1',
  name: 'Warden',
  favouredSkillChoices: ['Awareness', 'Healing', 'Insight'],
  additionalFeature: 'Shadow-lore',
  shadowPath: 'Path of Despair',
  sourceReference: 'core rules, p.50',
};

describe('derived stats follow the culture, not a fixed formula', () => {
  it('adds the culture\'s own base to the attribute', () => {
    expect(deriveEndurance(culture, 5)).toBe(25);
    expect(deriveHope(culture, 7)).toBe(15);
    expect(deriveParry(culture, 2)).toBe(14);
  });
});

describe('createHeroFromChoices (F1.1)', () => {
  it('applies attributes, culture skills and derived stats', () => {
    const hero = createHeroFromChoices({
      name: 'Beran',
      culture,
      calling,
      attributeSet: culture.attributeSets[0],
      favouredSkills: ['Awe'],
      distinctiveFeatures: ['Bold', 'Proud'],
    });
    expect(hero.attributes).toEqual({ strength: 5, heart: 7, wits: 2 });
    expect(hero.resources.endurance).toBe(25);
    expect(hero.resources.hope).toBe(15);
    expect(hero.parry).toBe(14);
    expect(hero.culture).toBe('Testfolk');
    expect(hero.calling).toBe('Warden');
    expect(hero.skills.Battle).toBe(2);
    expect(hero.favouredSkills).toEqual(['Awe']);
  });

  it('keeps skills the culture never mentions, so house rules survive', () => {
    const hero = createHeroFromChoices({
      name: 'X',
      culture,
      calling: null,
      attributeSet: culture.attributeSets[1],
      favouredSkills: [],
      distinctiveFeatures: [],
    });
    // Seeded skills the culture omits stay present at 0 rather than vanishing.
    expect(hero.skills.Lore).toBe(0);
    expect(Object.keys(hero.skills).length).toBeGreaterThan(3);
  });

  it("adds the calling's granted feature without duplicating it", () => {
    const hero = createHeroFromChoices({
      name: 'X',
      culture,
      calling,
      attributeSet: culture.attributeSets[0],
      favouredSkills: [],
      distinctiveFeatures: ['Bold', 'Shadow-lore'],
    });
    expect(hero.distinctiveFeatures).toEqual(['Bold', 'Shadow-lore']);
  });
});

describe('validation is the import boundary', () => {
  it('accepts a well-formed culture and calling', () => {
    expect(validateCulture(JSON.parse(JSON.stringify(culture)))).toEqual(culture);
    expect(validateCalling(JSON.parse(JSON.stringify(calling)))).toEqual(calling);
  });

  it('rejects a culture with no attribute sets or malformed ones', () => {
    expect(() => validateCulture({ ...culture, attributeSets: [] })).toThrow(CultureError);
    expect(() => validateCulture({ ...culture, attributeSets: [{ roll: 1, strength: 'x' }] })).toThrow(
      /malformed/,
    );
  });

  it('rejects missing names and ids', () => {
    expect(() => validateCulture({ ...culture, name: ' ' })).toThrow(/name/);
    expect(() => validateCalling({ ...calling, id: '' })).toThrow(/id/);
  });
});
