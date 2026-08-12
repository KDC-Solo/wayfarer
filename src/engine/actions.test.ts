import { describe, expect, it } from 'vitest';
import { createChronicle } from './chronicle.ts';
import { createHero } from './hero.ts';
import { addHero } from './company.ts';
import { changeResource, recordSkillRoll, undoResourceChange } from './actions.ts';
import { resolveSkillRoll } from './dice.ts';

function setup() {
  let chronicle = createChronicle();
  const hero = createHero({ name: 'Idis' });
  chronicle = addHero(chronicle, hero);
  return { chronicle, hero };
}

describe('changeResource', () => {
  it('applies the delta and logs from/to (F1.16)', () => {
    const { chronicle, hero } = setup();
    const { chronicle: updated, logEntry } = changeResource(
      chronicle,
      hero.id,
      'fatigue',
      3,
      'app-rolls',
    );
    expect(updated.company[0].resources.fatigue).toBe(3);
    expect(logEntry.type).toBe('resource-change');
    expect(logEntry.heroId).toBe(hero.id);
    expect(logEntry.inputMode).toBe('app-rolls');
    expect(logEntry.payload).toEqual({ field: 'fatigue', from: 0, to: 3 });
  });

  it('clamps at zero', () => {
    const { chronicle, hero } = setup();
    const { chronicle: updated } = changeResource(chronicle, hero.id, 'hope', -5, 'app-rolls');
    expect(updated.company[0].resources.hope).toBe(0);
  });

  it('throws for a hero not in the company', () => {
    const { chronicle } = setup();
    expect(() => changeResource(chronicle, 'nope', 'hope', 1, 'app-rolls')).toThrow();
  });
});

describe('undoResourceChange (F1.17)', () => {
  it('restores the field to its prior value and logs the undo', () => {
    const { chronicle, hero } = setup();
    const { chronicle: afterChange, logEntry } = changeResource(
      chronicle,
      hero.id,
      'shadow',
      4,
      'app-rolls',
    );
    expect(afterChange.company[0].resources.shadow).toBe(4);

    const { chronicle: afterUndo, logEntry: undoEntry } = undoResourceChange(
      afterChange,
      logEntry,
    );
    expect(afterUndo.company[0].resources.shadow).toBe(0);
    expect(undoEntry.payload).toMatchObject({ field: 'shadow', from: 4, to: 0, undoOf: logEntry.id });
  });

  it('refuses to undo a non resource-change entry', () => {
    const { chronicle, hero } = setup();
    const rollResult = resolveSkillRoll({
      featDice: [5],
      favourMode: 'normal',
      successDice: [],
      targetNumber: 10,
    });
    const rollEntry = recordSkillRoll(hero.id, 'Awareness', rollResult, 'app-rolls');
    expect(() => undoResourceChange(chronicle, rollEntry)).toThrow();
  });
});

describe('recordSkillRoll', () => {
  it('logs the roll with the skill name and full result', () => {
    const { hero } = setup();
    const result = resolveSkillRoll({
      featDice: [6],
      favourMode: 'normal',
      successDice: [4],
      targetNumber: 8,
    });
    const entry = recordSkillRoll(hero.id, 'Awareness', result, 'hybrid');
    expect(entry.type).toBe('roll');
    expect(entry.heroId).toBe(hero.id);
    expect(entry.inputMode).toBe('hybrid');
    expect(entry.payload.skillName).toBe('Awareness');
    expect(entry.payload.success).toBe(true);
  });
});
