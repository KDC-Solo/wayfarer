import type { Chronicle, Hero } from './types.ts';

export const MAX_COMPANY_SIZE = 4;

export class CompanyError extends Error {}

/** F1.2 — up to four heroes per chronicle. Pure: returns a new Chronicle. */
export function addHero(chronicle: Chronicle, hero: Hero): Chronicle {
  if (chronicle.company.length >= MAX_COMPANY_SIZE) {
    throw new CompanyError(`A company may not exceed ${MAX_COMPANY_SIZE} heroes.`);
  }
  if (chronicle.company.some((h) => h.id === hero.id)) {
    throw new CompanyError(`Hero ${hero.id} is already in the company.`);
  }
  const company = [...chronicle.company, hero];
  return {
    ...chronicle,
    company,
    // First hero added becomes active automatically (F1.3).
    activeHeroId: chronicle.activeHeroId ?? hero.id,
  };
}

export function removeHero(chronicle: Chronicle, heroId: string): Chronicle {
  const company = chronicle.company.filter((h) => h.id !== heroId);
  const activeHeroId =
    chronicle.activeHeroId === heroId ? (company[0]?.id ?? null) : chronicle.activeHeroId;
  return { ...chronicle, company, activeHeroId };
}

export function replaceHero(chronicle: Chronicle, hero: Hero): Chronicle {
  const company = chronicle.company.map((h) => (h.id === hero.id ? hero : h));
  return { ...chronicle, company };
}

/** F1.3 — designate the active hero; all rolls default to them. */
export function setActiveHero(chronicle: Chronicle, heroId: string): Chronicle {
  if (!chronicle.company.some((h) => h.id === heroId)) {
    throw new CompanyError(`Hero ${heroId} is not in the company.`);
  }
  return { ...chronicle, activeHeroId: heroId };
}

export function getActiveHero(chronicle: Chronicle): Hero | null {
  return chronicle.company.find((h) => h.id === chronicle.activeHeroId) ?? null;
}
