import { describe, expect, it } from 'vitest';
import {
  GearError,
  injuryOptions,
  totalLoad,
  totalProtection,
  validateAdversaryTemplate,
  validateArmour,
  validateWeapon,
  type Armour,
  type Weapon,
} from './gear.ts';
import { adversaryFromTemplate } from './combat.ts';

const sword: Weapon = {
  id: 'w1', name: 'Sword', damage: 4, injury: '16', load: 2,
  proficiency: 'Swords', notes: '', sourceReference: 'p.52',
};
const longSword: Weapon = { ...sword, id: 'w2', name: 'Long Sword', damage: 5, injury: '16 (1h)/18 (2h)', load: 3 };
const mail: Armour = { id: 'a1', name: 'Mail-shirt', protection: 3, additive: false, load: 9, type: 'Mail', sourceReference: 'p.52' };
const helm: Armour = { id: 'a2', name: 'Helm', protection: 1, additive: true, load: 4, type: 'Headgear', sourceReference: 'p.52' };

describe('protection totals', () => {
  it('takes the best suit and adds anything additive, like a helm', () => {
    expect(totalProtection([mail])).toBe(3);
    expect(totalProtection([mail, helm])).toBe(4);
    // Two suits don't stack — you wear the better one.
    expect(totalProtection([mail, { ...mail, id: 'a3', protection: 2 }])).toBe(3);
    expect(totalProtection([])).toBe(0);
  });

  it('sums load across weapons and armour', () => {
    expect(totalLoad([sword, longSword], [mail, helm])).toBe(2 + 3 + 9 + 4);
  });
});

describe('injuryOptions', () => {
  it('returns every rating for grip-dependent weapons', () => {
    expect(injuryOptions(sword)).toEqual(['16']);
    expect(injuryOptions(longSword)).toEqual(['16', '1', '18', '2']);
  });
});

describe('validation (the import boundary)', () => {
  it('accepts well-formed entries', () => {
    expect(validateWeapon({ ...sword })).toEqual(sword);
    expect(validateArmour({ ...mail })).toEqual(mail);
  });

  it('rejects anything without an id or name', () => {
    expect(() => validateWeapon({ name: 'x' })).toThrow(GearError);
    expect(() => validateArmour({ id: 'a', name: '  ' })).toThrow(/name/);
    expect(() => validateAdversaryTemplate(null)).toThrow(GearError);
  });

  it('coerces missing numbers rather than exploding, so partial packs still load', () => {
    const w = validateWeapon({ id: 'w', name: 'Odd' });
    expect(w.damage).toBe(0);
    expect(w.injury).toBe('');
  });
});

describe('adversaryFromTemplate', () => {
  it('spawns a live combatant carrying its armour, leaving the template alone', () => {
    const template = validateAdversaryTemplate({
      id: 't1', name: 'Orc Soldier', attributeLevel: 4, endurance: 12,
      might: 1, hate: 2, parry: 3, armour: 2,
      attacks: [{ name: 'Axe', rating: 3, damage: 5, injury: 18, special: '' }],
      fellAbilities: 'Hate Sunlight',
    });
    const live = adversaryFromTemplate(template);
    expect(live.name).toBe('Orc Soldier');
    expect(live.endurance).toBe(12);
    expect(live.hate).toBe(2);
    expect(live.armourRating).toBe(2);
    expect(live.status).toBe('active');
    // The stat block survives as notes so it's readable mid-fight.
    expect(live.notes).toContain('Axe 3 (5/18)');
    expect(live.notes).toContain('Hate Sunlight');
    expect(template.endurance).toBe(12); // untouched
  });
});
