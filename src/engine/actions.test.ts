import { describe, expect, it } from 'vitest';
import { createChronicle } from './chronicle.ts';
import { createHero } from './hero.ts';
import { addHero } from './company.ts';
import {
  changeResource,
  recordExperienceSpend,
  recordFellowshipEvent,
  recordMilestoneAward,
  recordOracleAnswer,
  recordSkillRoll,
  recordTableRoll,
  setResource,
  undoResourceChange,
} from './actions.ts';
import { EXPERIENCE_MILESTONES, InsufficientExperienceError } from './experience.ts';
import { resolveSkillRoll } from './dice.ts';
import { resolveTellingTable } from './tellingTable.ts';
import { addRow, createOracleTable, rollOnTable } from './oracleTable.ts';

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

describe('recordOracleAnswer', () => {
  it('logs the Telling Table result with an attached free-text interpretation (F2.1/F2.2)', () => {
    const result = resolveTellingTable('Is there a bridge?', 'likely', 7);
    const entry = recordOracleAnswer(result, 'app-rolls', 'A rope bridge, half-rotted.');
    expect(entry.type).toBe('oracle');
    expect(entry.prose).toBe('A rope bridge, half-rotted.');
    expect(entry.payload).toMatchObject({ answer: 'yes', chance: 'likely' });
  });

  it('prose defaults to null when no interpretation is given', () => {
    const result = resolveTellingTable('q', 'middling', 3);
    const entry = recordOracleAnswer(result, 'app-rolls');
    expect(entry.prose).toBeNull();
  });
});

describe('recordTableRoll', () => {
  it('logs identically to any other roll, regardless of table (F2.4)', () => {
    let table = createOracleTable({ name: 'Lore Table', rollExpression: '1d6' });
    table = addRow(table, { min: 1, max: 6, text: 'A distant howl' });
    const { row } = rollOnTable(table, 4);
    const entry = recordTableRoll(table.id, table.name, 4, row, 'app-rolls', 'Wargs, probably.');
    expect(entry.type).toBe('oracle');
    expect(entry.payload).toMatchObject({ tableId: table.id, tableName: 'Lore Table', key: 4 });
    expect(entry.prose).toBe('Wargs, probably.');
  });
});

describe('setResource (F4.3)', () => {
  it('assigns the value directly rather than adding a delta', () => {
    const { chronicle, hero } = setup();
    const withFatigue = changeResource(chronicle, hero.id, 'fatigue', 5, 'app-rolls').chronicle;
    const { chronicle: reset, logEntry } = setResource(withFatigue, hero.id, 'fatigue', 0, 'app-rolls');
    expect(reset.company[0].resources.fatigue).toBe(0);
    expect(logEntry.payload).toEqual({ field: 'fatigue', from: 5, to: 0 });
  });
});

describe('recordFellowshipEvent', () => {
  it('logs as a fellowship-event tagged with the phase id', () => {
    const { hero } = setup();
    const entry = recordFellowshipEvent('phase-1', hero.id, 'Idis mends her boots and rests.');
    expect(entry.type).toBe('fellowship-event');
    expect(entry.journeyId).toBe('phase-1');
    expect(entry.prose).toBe('Idis mends her boots and rests.');
  });
});

describe('recordMilestoneAward', () => {
  it('awards the milestone and logs it against the phase', () => {
    const { chronicle, hero } = setup();
    const milestone = EXPERIENCE_MILESTONES.find((m) => m.name === 'Complete a meaningful journey')!;
    const { chronicle: updated, logEntry } = recordMilestoneAward(chronicle, hero.id, milestone, 'phase-1');
    expect(updated.company[0].skillPoints).toBe(2);
    expect(logEntry.journeyId).toBe('phase-1');
    expect(logEntry.payload).toMatchObject({ milestone: 'Complete a meaningful journey', skillPoints: 2 });
  });
});

describe('recordExperienceSpend', () => {
  it('spends the currency and logs the target advancement', () => {
    const { chronicle: base, hero } = setup();
    const chronicle = {
      ...base,
      company: base.company.map((h) => (h.id === hero.id ? { ...h, skillPoints: 3 } : h)),
    };
    const { chronicle: updated, logEntry } = recordExperienceSpend(chronicle, hero.id, 'skill', 3, {
      kind: 'skill',
      name: 'Awareness',
      newRank: 1,
    });
    expect(updated.company[0].skillPoints).toBe(0);
    expect(updated.company[0].skills.Awareness).toBe(1);
    expect(logEntry.payload).toMatchObject({ currency: 'skill', cost: 3 });
  });

  it('throws (and does not persist) when the hero cannot afford it', () => {
    const { chronicle, hero } = setup();
    expect(() =>
      recordExperienceSpend(chronicle, hero.id, 'adventure', 1, { kind: 'valour', newRank: 1 }),
    ).toThrow(InsufficientExperienceError);
  });
});
