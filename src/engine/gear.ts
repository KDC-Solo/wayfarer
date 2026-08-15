// Weapons, armour and adversary templates — the reference data combat
// otherwise makes you retype every single time.
//
// All of it is rulebook content, so the app ships NONE (C1): these are
// empty libraries until the player imports their own. Combat works
// without them exactly as before, asking for damage and Injury by hand;
// with them, picking a weapon fills those in.

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  /** Free text, because the book gives some weapons a grip-dependent
   * rating ("16 (1h)/18 (2h)") rather than one number. */
  injury: string;
  load: number;
  /** Which combat proficiency rolls it — matches Hero.combatProficiencies. */
  proficiency: string;
  notes: string;
  sourceReference: string;
}

export interface Armour {
  id: string;
  name: string;
  /** Protection dice. */
  protection: number;
  /** True for a helm and anything else that adds to a suit rather than
   * replacing it, so the creator can sum instead of overwrite. */
  additive: boolean;
  load: number;
  type: string;
  sourceReference: string;
}

export interface AdversaryAttack {
  name: string;
  rating: number;
  damage: number;
  injury: number;
  special: string;
}

/**
 * A bestiary entry. Distinct from `combat.ts`'s `Adversary`, which is a
 * *live* combatant with current Endurance and Hate — this is the
 * template you spawn one from, and it stays untouched by the fight.
 */
export interface AdversaryTemplate {
  id: string;
  name: string;
  attributeLevel: number;
  endurance: number;
  might: number;
  hate: number;
  parry: number;
  armour: number;
  attacks: AdversaryAttack[];
  fellAbilities: string;
  sourceReference: string;
}

export class GearError extends Error {}

function requireIdName(value: unknown, kind: string): { id: string; name: string } {
  if (typeof value !== 'object' || value === null) throw new GearError(`${kind} is not an object.`);
  const v = value as { id?: unknown; name?: unknown };
  if (typeof v.id !== 'string' || !v.id) throw new GearError(`${kind} is missing an id.`);
  if (typeof v.name !== 'string' || !v.name.trim()) throw new GearError(`${kind} is missing a name.`);
  return { id: v.id, name: v.name };
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function validateWeapon(value: unknown): Weapon {
  const { id, name } = requireIdName(value, 'Weapon');
  const v = value as Partial<Weapon>;
  return {
    id,
    name,
    damage: num(v.damage),
    injury: typeof v.injury === 'string' ? v.injury : String(v.injury ?? ''),
    load: num(v.load),
    proficiency: v.proficiency ?? '',
    notes: v.notes ?? '',
    sourceReference: v.sourceReference ?? '',
  };
}

export function validateArmour(value: unknown): Armour {
  const { id, name } = requireIdName(value, 'Armour');
  const v = value as Partial<Armour>;
  return {
    id,
    name,
    protection: num(v.protection),
    additive: v.additive === true,
    load: num(v.load),
    type: v.type ?? '',
    sourceReference: v.sourceReference ?? '',
  };
}

export function validateAdversaryTemplate(value: unknown): AdversaryTemplate {
  const { id, name } = requireIdName(value, 'Adversary');
  const v = value as Partial<AdversaryTemplate>;
  const attacks = Array.isArray(v.attacks) ? v.attacks : [];
  return {
    id,
    name,
    attributeLevel: num(v.attributeLevel),
    endurance: num(v.endurance),
    might: num(v.might),
    hate: num(v.hate),
    parry: num(v.parry),
    armour: num(v.armour),
    attacks: attacks.map((a) => ({
      name: a?.name ?? '',
      rating: num(a?.rating),
      damage: num(a?.damage),
      injury: num(a?.injury),
      special: a?.special ?? '',
    })),
    fellAbilities: v.fellAbilities ?? '',
    sourceReference: v.sourceReference ?? '',
  };
}

/** Total Protection dice: one suit plus anything additive (a helm). */
export function totalProtection(pieces: Armour[]): number {
  const suit = pieces.filter((p) => !p.additive).reduce((best, p) => Math.max(best, p.protection), 0);
  const extra = pieces.filter((p) => p.additive).reduce((sum, p) => sum + p.protection, 0);
  return suit + extra;
}

export function totalLoad(weapons: Weapon[], armour: Armour[]): number {
  return (
    weapons.reduce((s, w) => s + w.load, 0) + armour.reduce((s, a) => s + a.load, 0)
  );
}

/** The book gives some Injury ratings per grip; when the player must
 * choose, surface both rather than silently picking one. */
export function injuryOptions(weapon: Weapon): string[] {
  const matches = weapon.injury.match(/\d+/g);
  return matches ?? [];
}
