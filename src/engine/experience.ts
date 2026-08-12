// F4.4 — spending Adventure/Skill Points. Strider Mode p.21's "Experience
// Milestones" table is mechanical/procedural (a trigger → reward list, not
// narrative table content), so — like the TN formula and the Telling
// Table's chance bands — it's encoded directly rather than shipped blank;
// see D8/D9 for the same reasoning applied elsewhere. What ISN'T encoded:
// which currency pays for which advancement (skill rank vs. Valour vs.
// Wisdom) — that mapping lives in the core rulebook, not on file here, so
// the spend flow lets the player choose the currency and enter the cost
// themselves (NG2).

import type { Hero } from './types.ts';

export interface ExperienceMilestone {
  name: string;
  adventurePoints: number;
  skillPoints: number;
}

/** Strider Mode p.21, "Experience Milestones." */
export const EXPERIENCE_MILESTONES: readonly ExperienceMilestone[] = [
  { name: 'Accept a mission from a patron', adventurePoints: 1, skillPoints: 0 },
  { name: 'Achieve a notable personal goal', adventurePoints: 1, skillPoints: 1 },
  { name: "Complete a patron's mission", adventurePoints: 1, skillPoints: 1 },
  { name: 'Complete a meaningful journey', adventurePoints: 0, skillPoints: 2 },
  { name: 'Face a Noteworthy Encounter during a journey', adventurePoints: 0, skillPoints: 1 },
  { name: 'Reveal a significant location or discovery', adventurePoints: 1, skillPoints: 0 },
  { name: 'Overcome a tricky obstacle', adventurePoints: 0, skillPoints: 1 },
  { name: 'Participate in a Council', adventurePoints: 0, skillPoints: 1 },
  { name: 'Survive a dangerous combat', adventurePoints: 1, skillPoints: 0 },
  { name: 'Face a Revelation Episode', adventurePoints: 1, skillPoints: 0 },
];

export function awardMilestone(hero: Hero, milestone: ExperienceMilestone): Hero {
  return {
    ...hero,
    adventurePoints: hero.adventurePoints + milestone.adventurePoints,
    skillPoints: hero.skillPoints + milestone.skillPoints,
  };
}

export type ExperienceCurrency = 'adventure' | 'skill';

export type ExperienceTarget =
  | { kind: 'skill'; name: string; newRank: number }
  | { kind: 'proficiency'; name: string; newRank: number }
  | { kind: 'valour'; newRank: number }
  | { kind: 'wisdom'; newRank: number };

export class InsufficientExperienceError extends Error {}

function currencyField(currency: ExperienceCurrency): 'adventurePoints' | 'skillPoints' {
  return currency === 'adventure' ? 'adventurePoints' : 'skillPoints';
}

/** F4.4 — validates cost against the hero's current pool before applying
 * the advancement. Throws rather than silently clamping: overspending
 * should never happen unnoticed. */
export function applyExperienceSpend(
  hero: Hero,
  currency: ExperienceCurrency,
  cost: number,
  target: ExperienceTarget,
): Hero {
  const field = currencyField(currency);
  if (cost > hero[field]) {
    throw new InsufficientExperienceError(
      `Not enough ${currency === 'adventure' ? 'Adventure' : 'Skill'} Points (have ${hero[field]}, need ${cost}).`,
    );
  }
  let updated: Hero = { ...hero, [field]: hero[field] - cost };
  switch (target.kind) {
    case 'skill':
      updated = { ...updated, skills: { ...updated.skills, [target.name]: target.newRank } };
      break;
    case 'proficiency':
      updated = {
        ...updated,
        combatProficiencies: { ...updated.combatProficiencies, [target.name]: target.newRank },
      };
      break;
    case 'valour':
      updated = { ...updated, valour: target.newRank };
      break;
    case 'wisdom':
      updated = { ...updated, wisdom: target.newRank };
      break;
  }
  return updated;
}
