import { describe, expect, it } from 'vitest';
import {
  addAdversary,
  applyAdversaryDelta,
  attackDiceDelta,
  beginNextRound,
  completeHeroTurn,
  createAdversary,
  createCombat,
  emptyStanceTargetNumbers,
  endCombat,
  describeCombatPosition,
  gainGroundBonusDice,
  generateCombatSummary,
  incomingAttackDiceDelta,
  removeAdversary,
  setStance,
  setStanceTargetNumber,
  updateAdversary,
} from './combat.ts';
import { createLogEntry } from './log.ts';
import { applyWound, recoverFromWound, treatWound, createHero } from './hero.ts';

function makeCombat(overrides: Parameters<typeof createCombat>[0] extends infer T ? Partial<T> : never = {}) {
  return createCombat({
    name: 'Ambush',
    stepTemplateId: 't1',
    heroIds: ['h1', 'h2'],
    ...overrides,
  });
}

describe('createCombat (F5.1/F5.2)', () => {
  it('starts at the first hero with opening volleys when some are set', () => {
    const combat = makeCombat({ openingVolleys: 2 });
    expect(combat.status).toBe('in-progress');
    expect(combat.phase).toBe('opening-volley');
    expect(combat.volley).toBe(1);
    expect(combat.round).toBe(0);
    expect(combat.currentHeroIndex).toBe(0);
    expect(combat.currentStepIndex).toBe(0);
  });

  it('skips straight to round 1 with zero opening volleys', () => {
    const combat = makeCombat({ openingVolleys: 0 });
    expect(combat.phase).toBe('round');
    expect(combat.round).toBe(1);
  });

  it('defaults every hero to the open stance and ships blank stance TNs (D16)', () => {
    const combat = makeCombat();
    expect(combat.stances).toEqual({ h1: 'open', h2: 'open' });
    expect(combat.stanceTargetNumbers).toEqual(emptyStanceTargetNumbers());
    expect(Object.values(combat.stanceTargetNumbers).every((tn) => tn === null)).toBe(true);
  });

  it('an empty company completes immediately rather than getting stuck', () => {
    const combat = createCombat({ name: 'X', stepTemplateId: 't1', heroIds: [] });
    expect(combat.status).toBe('completed');
  });
});

describe('stances (F5.1)', () => {
  it('setStance changes one hero only', () => {
    const combat = setStance(makeCombat(), 'h1', 'skirmish');
    expect(combat.stances).toEqual({ h1: 'skirmish', h2: 'open' });
  });

  it('setStanceTargetNumber stores and clears player-entered TNs', () => {
    let combat = setStanceTargetNumber(makeCombat(), 'forward', 6);
    expect(combat.stanceTargetNumbers.forward).toBe(6);
    combat = setStanceTargetNumber(combat, 'forward', null);
    expect(combat.stanceTargetNumbers.forward).toBeNull();
  });
});

describe('round structure (F5.2)', () => {
  it('completeHeroTurn advances heroes, then opens the between-rounds gate', () => {
    let combat = makeCombat();
    combat = { ...combat, currentStepIndex: 2, lastOutcome: 'success' };
    combat = completeHeroTurn(combat);
    expect(combat.currentHeroIndex).toBe(1);
    expect(combat.currentStepIndex).toBe(0);
    expect(combat.lastOutcome).toBeNull();
    expect(combat.betweenRounds).toBe(false);

    combat = completeHeroTurn(combat);
    expect(combat.betweenRounds).toBe(true);
    expect(combat.status).toBe('in-progress'); // ending is always a player decision
  });

  it('beginNextRound walks volleys, then closes to melee, then counts rounds', () => {
    let combat = makeCombat({ openingVolleys: 2 });

    combat = beginNextRound({ ...combat, betweenRounds: true });
    expect(combat.phase).toBe('opening-volley');
    expect(combat.volley).toBe(2);
    expect(combat.betweenRounds).toBe(false);
    expect(combat.currentHeroIndex).toBe(0);

    combat = beginNextRound({ ...combat, betweenRounds: true });
    expect(combat.phase).toBe('round');
    expect(combat.round).toBe(1);

    combat = beginNextRound({ ...combat, betweenRounds: true });
    expect(combat.round).toBe(2);
  });

  it('describeCombatPosition reports volleys and rounds', () => {
    const combat = makeCombat({ openingVolleys: 2 });
    expect(describeCombatPosition(combat)).toBe('Opening volley 1/2');
    expect(describeCombatPosition(beginNextRound(beginNextRound(combat)))).toBe('Round 1');
  });

  it('endCombat records the outcome', () => {
    const combat = endCombat(makeCombat(), 'Victory at the ford');
    expect(combat.status).toBe('completed');
    expect(combat.outcome).toBe('Victory at the ford');
  });
});

describe('adversaries (F5.5)', () => {
  it('createAdversary starts active and unwounded', () => {
    const adversary = createAdversary({ name: 'Orc', endurance: 12, hate: 2 });
    expect(adversary.status).toBe('active');
    expect(adversary.wounded).toBe(false);
  });

  it('add/update/remove operate by id', () => {
    const orc = createAdversary({ name: 'Orc' });
    const warg = createAdversary({ name: 'Warg' });
    let combat = addAdversary(addAdversary(makeCombat(), orc), warg);
    expect(combat.adversaries).toHaveLength(2);

    combat = updateAdversary(combat, { ...orc, status: 'defeated' });
    expect(combat.adversaries[0].status).toBe('defeated');

    combat = removeAdversary(combat, warg.id);
    expect(combat.adversaries.map((a) => a.name)).toEqual(['Orc']);
  });

  it('applyAdversaryDelta clamps at zero and reports from/to for logging', () => {
    const orc = createAdversary({ name: 'Orc', endurance: 5 });
    const combat = addAdversary(makeCombat(), orc);
    const { combat: next, from, to } = applyAdversaryDelta(combat, orc.id, 'endurance', -8);
    expect(from).toBe(5);
    expect(to).toBe(0);
    expect(next.adversaries[0].endurance).toBe(0);
    // Reaching zero does not auto-set a status — that call is the player's.
    expect(next.adversaries[0].status).toBe('active');
  });

  it('throws for an unknown adversary', () => {
    expect(() => applyAdversaryDelta(makeCombat(), 'nope', 'hate', -1)).toThrow('not found');
  });
});

describe('Skirmish stance (verified, Strider Mode p.15)', () => {
  it('ranged attacks from Skirmish lose one Success die — except the escape roll', () => {
    expect(attackDiceDelta('skirmish')).toBe(-1);
    expect(attackDiceDelta('skirmish', true)).toBe(0);
  });

  it('other stances carry no Strider-specific attack modifier', () => {
    expect(attackDiceDelta('forward')).toBe(0);
    expect(attackDiceDelta('open')).toBe(0);
    expect(attackDiceDelta('defensive')).toBe(0);
    expect(attackDiceDelta('rearward')).toBe(0);
  });

  it('melee attackers against a Skirmish hero lose one die; ranged do not', () => {
    expect(incomingAttackDiceDelta('skirmish', 'melee')).toBe(-1);
    expect(incomingAttackDiceDelta('skirmish', 'ranged')).toBe(0);
    expect(incomingAttackDiceDelta('open', 'melee')).toBe(0);
  });

  it('Gain Ground grants one bonus die plus one per Success icon', () => {
    expect(gainGroundBonusDice(0)).toBe(1);
    expect(gainGroundBonusDice(2)).toBe(3);
  });
});

describe('wounds (F5.4)', () => {
  it('wound → treat → recover transitions', () => {
    let hero = createHero({ name: 'Idis' });
    expect(hero.wounded).toBe(false);

    hero = applyWound(hero);
    expect(hero.wounded).toBe(true);
    expect(hero.woundTreated).toBe(false);

    hero = treatWound(hero);
    expect(hero.wounded).toBe(true);
    expect(hero.woundTreated).toBe(true);

    hero = recoverFromWound(hero);
    expect(hero.wounded).toBe(false);
    expect(hero.woundTreated).toBe(false);
  });
});

describe('generateCombatSummary (D7 — log is the spine)', () => {
  it('builds the account from this combat’s log entries in order', () => {
    const orc = createAdversary({ name: 'Orc', endurance: 0 });
    let combat = addAdversary(makeCombat(), orc);
    combat = updateAdversary(combat, { ...orc, status: 'defeated' });
    combat = endCombat(combat, 'Victory');

    const log = [
      createLogEntry({ type: 'combat-event', prose: 'Combat begins: Ambush.', journeyId: combat.id }),
      createLogEntry({ type: 'roll', payload: { skillName: 'Axes', success: true }, journeyId: combat.id }),
      createLogEntry({ type: 'roll', payload: { skillName: 'Bows', success: false }, journeyId: 'other' }),
    ];

    const summary = generateCombatSummary(combat, log);
    expect(summary).toContain('# Ambush');
    expect(summary).toContain('Victory');
    expect(summary).toContain('Orc (defeated)');
    expect(summary).toContain('Combat begins');
    expect(summary).toContain('Rolled Axes: success');
    expect(summary).not.toContain('Bows');
  });
});
