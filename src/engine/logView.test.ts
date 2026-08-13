import { describe, expect, it } from 'vitest';
import { addHero } from './company.ts';
import { addAdversary, createAdversary, createCombat } from './combat.ts';
import { createChronicle } from './chronicle.ts';
import { createFellowshipPhase } from './fellowshipPhase.ts';
import { createHero } from './hero.ts';
import { createJourney } from './journey.ts';
import { createLogEntry } from './log.ts';
import { buildRenderContext, describeLogEntry, isProseOnly, LOG_ENTRY_TYPE_LABEL } from './logView.ts';
import type { LogEntryType } from './types.ts';

function makeContext() {
  let chronicle = createChronicle();
  const hero = createHero({ name: 'Idis' });
  chronicle = addHero(chronicle, hero);
  const journey = createJourney({
    origin: 'Bree',
    destination: 'Rivendell',
    season: 'winter',
    waypoints: [],
    stepTemplateId: 't1',
  });
  const phase = createFellowshipPhase({ year: 2954, location: 'Bree', stepTemplateId: 't1', heroIds: [hero.id] });
  const combat = addAdversary(
    createCombat({ name: 'Ambush', stepTemplateId: 't1', heroIds: [hero.id] }),
    createAdversary({ name: 'Orc' }),
  );
  const context = buildRenderContext({ chronicle, journeys: [journey], fellowshipPhases: [phase], combats: [combat] });
  return { chronicle, hero, journey, phase, combat, context };
}

describe('buildRenderContext', () => {
  it('labels heroes and every kind of run', () => {
    const { hero, journey, phase, combat, context } = makeContext();
    expect(context.heroNames[hero.id]).toBe('Idis');
    expect(context.runLabels[journey.id]).toBe('Journey: Bree → Rivendell');
    expect(context.runLabels[phase.id]).toBe('Fellowship Phase — Year 2954');
    expect(context.runLabels[combat.id]).toBe('Combat: Ambush');
  });
});

describe('describeLogEntry (F6.1)', () => {
  it('renders rolls with hero, outcome, degree, and totals', () => {
    const { hero, context } = makeContext();
    const entry = createLogEntry({
      type: 'roll',
      heroId: hero.id,
      payload: { skillName: 'Hunting', success: true, degreeOfSuccess: 'great', total: 19, targetNumber: 14 },
    });
    expect(describeLogEntry(entry, context)).toBe('Idis rolled Hunting: success — great (19 vs TN 14)');
  });

  it('handles a hero no longer in the company', () => {
    const { context } = makeContext();
    const entry = createLogEntry({ type: 'roll', heroId: 'gone', payload: { skillName: 'Song', success: false } });
    expect(describeLogEntry(entry, context)).toContain('A former companion');
  });

  it('renders Telling Table answers and table draws', () => {
    const { context } = makeContext();
    const telling = createLogEntry({
      type: 'oracle',
      payload: { question: 'Is the bridge guarded?', chance: 'likely', featDie: 9, answer: 'yes', extreme: false },
    });
    expect(describeLogEntry(telling, context)).toBe('The Telling Table — "Is the bridge guarded?": yes');

    const draw = createLogEntry({
      type: 'oracle',
      payload: { tableId: 't', tableName: 'Solo Journey Events', key: 7, row: { text: 'A grey rider' } },
    });
    expect(describeLogEntry(draw, context)).toBe('Solo Journey Events (7): A grey rider');

    const emptyDraw = createLogEntry({
      type: 'oracle',
      payload: { tableId: 't', tableName: 'Solo Journey Events', key: 'eye', row: { text: '' } },
    });
    expect(describeLogEntry(emptyDraw, context)).toBe('Solo Journey Events (eye): (no result text)');
  });

  it('renders resource changes, undo, milestones, and spends', () => {
    const { hero, context } = makeContext();
    const change = createLogEntry({
      type: 'resource-change',
      heroId: hero.id,
      payload: { field: 'endurance', from: 24, to: 20 },
    });
    expect(describeLogEntry(change, context)).toBe('Idis: endurance 24 → 20');

    const undo = createLogEntry({
      type: 'resource-change',
      heroId: hero.id,
      payload: { field: 'endurance', from: 20, to: 24, undoOf: 'x' },
    });
    expect(describeLogEntry(undo, context)).toBe('Idis: endurance 20 → 24 (undo)');

    const milestone = createLogEntry({
      type: 'resource-change',
      heroId: hero.id,
      payload: { milestone: 'Complete a patron errand', adventurePoints: 2, skillPoints: 5 },
    });
    expect(describeLogEntry(milestone, context)).toContain('milestone: Complete a patron errand (+2 AP, +5 SP)');

    const spend = createLogEntry({
      type: 'resource-change',
      heroId: hero.id,
      payload: { currency: 'skill', cost: 4, target: { kind: 'skill', name: 'Hunting', newRank: 3 } },
    });
    expect(describeLogEntry(spend, context)).toBe('Idis spent 4 Skill Points on skill Hunting to rank 3');
  });

  it('renders company changes and prose-only types verbatim', () => {
    const { context } = makeContext();
    const joined = createLogEntry({ type: 'company-change', payload: { action: 'add', heroName: 'Berthild' } });
    expect(describeLogEntry(joined, context)).toBe('Berthild joined the company');

    const prose = createLogEntry({ type: 'prose', prose: 'The road was quiet.' });
    expect(describeLogEntry(prose, context)).toBe('The road was quiet.');
    expect(isProseOnly(prose)).toBe(true);

    const roll = createLogEntry({ type: 'roll', payload: {} });
    expect(isProseOnly(roll)).toBe(false);
  });

  it('has a label for every entry type the filter can offer', () => {
    const types: LogEntryType[] = [
      'roll',
      'resource-change',
      'company-change',
      'oracle',
      'prose',
      'journey-event',
      'fellowship-event',
      'combat-event',
      'system',
    ];
    for (const type of types) expect(LOG_ENTRY_TYPE_LABEL[type]).toBeTruthy();
  });
});
