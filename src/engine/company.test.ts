import { describe, expect, it } from 'vitest';
import { createChronicle } from './chronicle.ts';
import { createHero } from './hero.ts';
import { addHero, CompanyError, getActiveHero, removeHero, setActiveHero } from './company.ts';

describe('addHero', () => {
  it('adds a hero and makes it active if none was', () => {
    const chronicle = createChronicle();
    const hero = createHero({ name: 'Idis' });
    const updated = addHero(chronicle, hero);
    expect(updated.company).toHaveLength(1);
    expect(updated.activeHeroId).toBe(hero.id);
  });

  it('does not change the active hero when adding a second one', () => {
    let chronicle = createChronicle();
    const first = createHero({ name: 'Idis' });
    const second = createHero({ name: 'Halbarad' });
    chronicle = addHero(chronicle, first);
    chronicle = addHero(chronicle, second);
    expect(chronicle.activeHeroId).toBe(first.id);
    expect(chronicle.company).toHaveLength(2);
  });

  it('refuses a fifth hero (F1.2 — one to four)', () => {
    let chronicle = createChronicle();
    for (let i = 0; i < 4; i++) chronicle = addHero(chronicle, createHero({ name: `Hero ${i}` }));
    expect(() => addHero(chronicle, createHero({ name: 'Fifth' }))).toThrow(CompanyError);
  });

  it('refuses adding the same hero twice', () => {
    const chronicle = createChronicle();
    const hero = createHero({ name: 'Idis' });
    const once = addHero(chronicle, hero);
    expect(() => addHero(once, hero)).toThrow(CompanyError);
  });
});

describe('removeHero', () => {
  it('removes the hero from the company', () => {
    let chronicle = createChronicle();
    const hero = createHero({ name: 'Idis' });
    chronicle = addHero(chronicle, hero);
    chronicle = removeHero(chronicle, hero.id);
    expect(chronicle.company).toHaveLength(0);
  });

  it('reassigns the active hero when the active one is removed', () => {
    let chronicle = createChronicle();
    const first = createHero({ name: 'Idis' });
    const second = createHero({ name: 'Halbarad' });
    chronicle = addHero(chronicle, first);
    chronicle = addHero(chronicle, second);
    chronicle = removeHero(chronicle, first.id);
    expect(chronicle.activeHeroId).toBe(second.id);
  });

  it('leaves activeHeroId null when the last hero is removed', () => {
    let chronicle = createChronicle();
    const hero = createHero({ name: 'Idis' });
    chronicle = addHero(chronicle, hero);
    chronicle = removeHero(chronicle, hero.id);
    expect(chronicle.activeHeroId).toBeNull();
  });
});

describe('setActiveHero / getActiveHero', () => {
  it('switches the active hero (F1.3)', () => {
    let chronicle = createChronicle();
    const first = createHero({ name: 'Idis' });
    const second = createHero({ name: 'Halbarad' });
    chronicle = addHero(chronicle, first);
    chronicle = addHero(chronicle, second);
    chronicle = setActiveHero(chronicle, second.id);
    expect(getActiveHero(chronicle)?.id).toBe(second.id);
  });

  it('refuses to activate a hero not in the company', () => {
    const chronicle = createChronicle();
    expect(() => setActiveHero(chronicle, 'nonexistent')).toThrow(CompanyError);
  });

  it('getActiveHero returns null for an empty company', () => {
    const chronicle = createChronicle();
    expect(getActiveHero(chronicle)).toBeNull();
  });
});
