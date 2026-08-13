import { DEFAULT_SKILL_NAMES } from '../data/skills.ts';
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
