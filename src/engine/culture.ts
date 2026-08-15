// Cultures and Callings — the data character creation is built from.
//
// Every field here is licensed content from the core rulebook, so the app
// ships NONE of it (C1/C2): these are empty collections until the player
// imports their own, exactly like the oracle tables. Character creation
// degrades to the manual sheet when nothing is loaded, so the app is
// never broken by their absence — it just can't offer the guided path.
//
// The shapes mirror how the book lays a culture out, so a player reading
// their book can see what goes where.

export interface AttributeSet {
  /** The Success-die roll that selects this row (1-6), kept so a player
   * can roll for it exactly as the book allows. */
  roll: number;
  strength: number;
  heart: number;
  wits: number;
}

/**
 * The book gives derived stats as "STRENGTH + n" style formulas, and the
 * constants differ per culture — so they're stored as the addend, not as
 * a finished number.
 */
export interface DerivedStatBases {
  endurance: number;
  hope: number;
  parry: number;
}

export interface Culture {
  id: string;
  name: string;
  attributeSets: AttributeSet[];
  derived: DerivedStatBases;
  /** skill name → starting rank. */
  skills: Record<string, number>;
  /** The two the book underlines; the player picks one as Favoured.
   * Underlining doesn't survive text extraction, so this may be empty —
   * the creator then asks the player to choose freely. */
  favouredSkillChoices: string[];
  blessingName: string;
  standardOfLiving: string;
  /** Choose two. */
  distinctiveFeatures: string[];
  sourceReference: string;
}

export interface Calling {
  id: string;
  name: string;
  /** "Choose two Skills among…" — the pool, not the picks. */
  favouredSkillChoices: string[];
  /** The extra Distinctive Feature the calling grants outright. */
  additionalFeature: string;
  shadowPath: string;
  sourceReference: string;
}

export function deriveEndurance(culture: Culture, strength: number): number {
  return strength + culture.derived.endurance;
}

export function deriveHope(culture: Culture, heart: number): number {
  return heart + culture.derived.hope;
}

export function deriveParry(culture: Culture, wits: number): number {
  return wits + culture.derived.parry;
}

export class CultureError extends Error {}

/** The import boundary, like validateDicePack: third-party or
 * hand-authored culture packs must not reach the creator malformed. */
export function validateCulture(value: unknown): Culture {
  if (typeof value !== 'object' || value === null) throw new CultureError('Culture is not an object.');
  const c = value as Partial<Culture>;
  if (typeof c.id !== 'string' || !c.id) throw new CultureError('Culture is missing an id.');
  if (typeof c.name !== 'string' || !c.name.trim()) throw new CultureError('Culture is missing a name.');
  if (!Array.isArray(c.attributeSets) || c.attributeSets.length === 0) {
    throw new CultureError(`Culture "${c.name}" has no attribute sets.`);
  }
  for (const set of c.attributeSets) {
    for (const key of ['strength', 'heart', 'wits'] as const) {
      if (typeof set?.[key] !== 'number') throw new CultureError(`Culture "${c.name}" has a malformed attribute set.`);
    }
  }
  if (typeof c.skills !== 'object' || c.skills === null) throw new CultureError(`Culture "${c.name}" has no skills.`);
  const derived = c.derived ?? { endurance: 0, hope: 0, parry: 0 };
  return {
    id: c.id,
    name: c.name,
    attributeSets: c.attributeSets,
    derived: {
      endurance: derived.endurance ?? 0,
      hope: derived.hope ?? 0,
      parry: derived.parry ?? 0,
    },
    skills: c.skills as Record<string, number>,
    favouredSkillChoices: c.favouredSkillChoices ?? [],
    blessingName: c.blessingName ?? '',
    standardOfLiving: c.standardOfLiving ?? '',
    distinctiveFeatures: c.distinctiveFeatures ?? [],
    sourceReference: c.sourceReference ?? '',
  };
}

export function validateCalling(value: unknown): Calling {
  if (typeof value !== 'object' || value === null) throw new CultureError('Calling is not an object.');
  const c = value as Partial<Calling>;
  if (typeof c.id !== 'string' || !c.id) throw new CultureError('Calling is missing an id.');
  if (typeof c.name !== 'string' || !c.name.trim()) throw new CultureError('Calling is missing a name.');
  return {
    id: c.id,
    name: c.name,
    favouredSkillChoices: c.favouredSkillChoices ?? [],
    additionalFeature: c.additionalFeature ?? '',
    shadowPath: c.shadowPath ?? '',
    sourceReference: c.sourceReference ?? '',
  };
}
