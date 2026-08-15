import { DEFAULT_SKILL_NAMES } from '../data/skills.ts';
import {
  deriveEndurance,
  deriveHope,
  deriveParry,
  type AttributeSet,
  type Calling,
  type Culture,
} from './culture.ts';
import type { Hero } from './types.ts';

export interface NewHeroInput {
  name: string;
  culture?: string;
  calling?: string;
  patron?: string;
}

export function createHero(input: NewHeroInput): Hero {
  const skills: Record<string, number> = {};
  for (const name of DEFAULT_SKILL_NAMES) skills[name] = 0;

  return {
    id: crypto.randomUUID(),
    name: input.name,
    culture: input.culture ?? '',
    calling: input.calling ?? '',
    attributes: { strength: 0, heart: 0, wits: 0 },
    skills,
    combatProficiencies: {},
    valour: 0,
    wisdom: 0,
    virtues: [],
    rewards: [],
    gear: [],
    patron: input.patron ?? '',
    resources: { endurance: 0, hope: 0, fatigue: 0, shadow: 0, shadowPoints: 0, shadowScars: 0 },
    adventurePoints: 0,
    skillPoints: 0,
    wounded: false,
    woundTreated: false,
    favouredSkills: [],
    distinctiveFeatures: [],
  };
}

/** F5.4 — a failed Protection roll leaves the hero Wounded. Treatment and
 * the recovery track are core-rulebook mechanics not on file, so the app
 * tracks the two states (wounded, treated) and the player advances them
 * per their book; `recoverFromWound` clears both when recovery completes. */
export function applyWound(hero: Hero): Hero {
  return { ...hero, wounded: true, woundTreated: false };
}

export function treatWound(hero: Hero): Hero {
  return { ...hero, wounded: true, woundTreated: true };
}

export function recoverFromWound(hero: Hero): Hero {
  return { ...hero, wounded: false, woundTreated: false };
}

/**
 * A hero you can actually roll with, from just a name.
 *
 * `createHero` zeroes everything, which is correct for "I'm copying my
 * character sheet in" but lethal as a first-run default: with attributes
 * at 0 the Target Number is 18, and with every skill at rank 0 there are
 * no Success dice, so the Feat die alone can never reach it. A new player
 * following the obvious path would watch their first roll fail and have
 * no idea why. These are ordinary mid-range starting values — a playable
 * placeholder the player overwrites from their own sheet, exactly like
 * the table skeletons elsewhere in the app.
 */
export function createQuickStartHero(name: string): Hero {
  const hero = createHero({ name });
  const skills = { ...hero.skills };
  for (const skillName of Object.keys(skills)) skills[skillName] = 1;
  for (const skillName of QUICK_START_FOCUS_SKILLS) {
    if (skillName in skills) skills[skillName] = 2;
  }
  return {
    ...hero,
    attributes: { strength: 4, heart: 4, wits: 4 },
    skills,
    resources: { ...hero.resources, endurance: 24, hope: 12 },
  };
}

/** Arbitrary spread so a quick-start hero isn't uniformly flat — not a
 * claim about any culture or calling. */
const QUICK_START_FOCUS_SKILLS = ['Awe', 'Athletics', 'Travel', 'Insight'];

/**
 * Character creation proper (F1.1): a culture and calling from the
 * player's own imported data, an attribute set chosen from that
 * culture's table, and the picks the book asks for. Everything the
 * culture supplies — skill ranks, derived Endurance/Hope/Parry — is
 * applied here rather than left for the player to copy by hand.
 */
export interface CharacterCreationChoices {
  name: string;
  culture: Culture;
  calling: Calling | null;
  attributeSet: AttributeSet;
  favouredSkills: string[];
  distinctiveFeatures: string[];
  patron?: string;
}

export function createHeroFromChoices(choices: CharacterCreationChoices): Hero {
  const { culture, calling, attributeSet } = choices;
  const base = createHero({
    name: choices.name,
    culture: culture.name,
    calling: calling?.name ?? '',
    patron: choices.patron,
  });

  // The culture's ranks replace the blank defaults, but any skill the
  // app knows and the culture doesn't mention stays at 0 rather than
  // vanishing — house-ruled skill lists must survive creation.
  const skills = { ...base.skills };
  for (const [name, rank] of Object.entries(culture.skills)) skills[name] = rank;

  const features = [...choices.distinctiveFeatures];
  if (calling?.additionalFeature && !features.includes(calling.additionalFeature)) {
    features.push(calling.additionalFeature);
  }

  return {
    ...base,
    attributes: {
      strength: attributeSet.strength,
      heart: attributeSet.heart,
      wits: attributeSet.wits,
    },
    skills,
    favouredSkills: choices.favouredSkills,
    distinctiveFeatures: features,
    parry: deriveParry(culture, attributeSet.wits),
    resources: {
      ...base.resources,
      endurance: deriveEndurance(culture, attributeSet.strength),
      hope: deriveHope(culture, attributeSet.heart),
    },
  };
}

export interface DerivedStates {
  /** F1.15 — Fatigue at or above Endurance. */
  weary: boolean;
  /** F1.15 — Shadow at or above Hope. */
  miserable: boolean;
}

export function deriveHeroStates(hero: Hero): DerivedStates {
  return {
    weary: hero.resources.fatigue >= hero.resources.endurance,
    miserable: hero.resources.shadow >= hero.resources.hope,
  };
}
