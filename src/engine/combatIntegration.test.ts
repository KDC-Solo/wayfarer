import { describe, expect, it } from 'vitest';
import { defaultCombatStepTemplate } from '../data/combatStepTemplate.ts';
import { recordCombatEvent, recordWoundChange } from './actions.ts';
import { addHero } from './company.ts';
import { createChronicle } from './chronicle.ts';
import {
  addAdversary,
  applyAdversaryDelta,
  beginNextRound,
  completeHeroTurn,
  createAdversary,
  createCombat,
  endCombat,
  generateCombatSummary,
  setStance,
  updateAdversary,
} from './combat.ts';
import { createHero } from './hero.ts';
import { completeStep, currentStep } from './stepRunner.ts';
import type { LogEntry } from './types.ts';

// Walks the real default combat template (data/combatStepTemplate.ts)
// through a whole fight — an opening volley, then close-combat rounds for
// a two-hero company — simulating what CombatRunner does: per-hero turns
// via the shared interpreter, the between-rounds gate, adversary damage
// with a Piercing Blow wound, and a player-decided end. This is the
// Milestone-4 "combat without manual bookkeeping outside the app" check
// at engine level.

describe('running the default combat template end to end', () => {
  it('volleys, rounds, damage, a wound, and a player-decided end all hold together', () => {
    let chronicle = createChronicle();
    chronicle = addHero(chronicle, createHero({ name: 'Idis' }));
    chronicle = addHero(chronicle, createHero({ name: 'Berthild' }));
    const template = defaultCombatStepTemplate();

    const orc = createAdversary({ name: 'Orc Soldier', endurance: 12, hate: 2 });
    let combat = createCombat({
      name: 'Ambush at the ford',
      stepTemplateId: template.id,
      heroIds: chronicle.company.map((h) => h.id),
      openingVolleys: 1,
    });
    combat = addAdversary(combat, orc);
    combat = setStance(combat, chronicle.company[0].id, 'skirmish');

    const log: LogEntry[] = [];
    const visited: string[] = [];
    let safety = 0;

    // One volley + two close-combat rounds, ended by the player.
    let roundsFought = 0;
    while (combat.status === 'in-progress' && safety++ < 200) {
      if (combat.betweenRounds) {
        roundsFought++;
        if (roundsFought >= 3) {
          log.push(recordCombatEvent(combat.id, null, 'Combat ends: victory.'));
          combat = endCombat(combat, 'Victory');
          continue;
        }
        combat = beginNextRound(combat);
        continue;
      }

      const { position, step } = currentStep(combat, template);
      combat = position;

      if (!step) {
        combat = completeHeroTurn(combat);
        continue;
      }

      visited.push(step.type);
      if (step.type === 'attack') {
        // Simulate a successful hit for 4 damage, as AttackStepUI would apply it.
        const { combat: hit, from, to } = applyAdversaryDelta(combat, orc.id, 'endurance', -4);
        log.push(
          recordCombatEvent(combat.id, combat.heroOrder[combat.currentHeroIndex], 'Hit for 4.', {
            adversaryId: orc.id,
            from,
            to,
          }),
        );
        combat = completeStep(hit, 'success');
      } else {
        combat = completeStep(combat);
      }
    }

    expect(safety).toBeLessThan(200);
    expect(combat.status).toBe('completed');
    expect(combat.outcome).toBe('Victory');
    // 1 volley + 2 rounds, 2 heroes each, 3 steps per turn.
    expect(visited).toHaveLength(3 * 2 * 3);
    expect(visited.filter((t) => t === 'attack')).toHaveLength(6);
    // 6 hits × 4 damage on 12 Endurance, clamped at zero.
    const finalOrc = combat.adversaries[0];
    expect(finalOrc.endurance).toBe(0);

    // A Piercing Blow along the way wounded a hero and the adversary.
    const heroId = chronicle.company[1].id;
    const { chronicle: woundedChronicle, logEntry } = recordWoundChange(chronicle, heroId, 'wounded', combat.id);
    chronicle = woundedChronicle;
    log.push(logEntry);
    combat = updateAdversary(combat, { ...finalOrc, wounded: true, status: 'defeated' });
    expect(chronicle.company[1].wounded).toBe(true);

    // The chronicle's account of the fight falls out of the log (D7).
    const summary = generateCombatSummary(combat, log);
    expect(summary).toContain('# Ambush at the ford');
    expect(summary).toContain('Orc Soldier (defeated)');
    expect(summary).toContain('Combat ends: victory.');
    expect(summary).toContain('is Wounded');
  });

  it('session resumption (N4): a mid-fight combat re-enters at the same hero and step', () => {
    const template = defaultCombatStepTemplate();
    let combat = createCombat({ name: 'X', stepTemplateId: template.id, heroIds: ['h1', 'h2'] });

    // Play halfway through h1's turn…
    let { position, step } = currentStep(combat, template);
    combat = completeStep(position);
    ({ position, step } = currentStep(combat, template));
    expect(step?.type).toBe('attack');

    // …"restart the app": the persisted position re-derives the same step.
    const resumed = { ...position };
    const after = currentStep(resumed, template);
    expect(after.step?.type).toBe('attack');
    expect(after.position.currentHeroIndex).toBe(0);
  });
});
