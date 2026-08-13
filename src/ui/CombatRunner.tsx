import { useState } from 'react';
import { changeResource, recordCombatEvent, recordSkillRoll, recordTableRoll, recordWoundChange } from '../engine/actions.ts';
import {
  applyAdversaryDelta,
  beginNextRound,
  COMBAT_STANCES,
  COMBAT_STANCE_LABEL,
  completeHeroTurn,
  describeCombatPosition,
  endCombat,
  generateCombatSummary,
  setStance,
  updateAdversary,
  type Adversary,
  type Combat,
  type CombatStance,
} from '../engine/combat.ts';
import type { OracleTable } from '../engine/oracleTable.ts';
import { completeStep, currentStep } from '../engine/stepRunner.ts';
import type { StepTemplate, StepTemplateStep } from '../engine/stepTemplate.ts';
import type { Chronicle, Hero, LogEntry } from '../engine/types.ts';
import { AdversaryAttackPanel, AttackStepUI, type CombatApplyParams } from './CombatAttack.tsx';
import { ResourceChangeStepUI } from './ResourceChangeStepUI.tsx';
import { RollPanel } from './RollPanel.tsx';
import { TableRoller } from './TableRoller.tsx';

interface Props {
  chronicle: Chronicle;
  combat: Combat;
  template: StepTemplate;
  oracleTables: OracleTable[];
  log: LogEntry[];
  onApply: (params: CombatApplyParams) => void;
  onDismiss: () => void;
}

// F5.2/F5.6/F5.8 — runs the combat-round step template once per hero per
// round (opening volleys first, then close combat), reusing the same
// generic interpreter (stepRunner.ts) as Journey and FellowshipPhase. The
// overview keeps every hero's and adversary's state one glance (and one
// tap) away throughout, and the adversary-attack panel is always available
// since the solo player runs both sides (Strider Mode p.15).

export function CombatRunner({ chronicle, combat, template, oracleTables, log, onApply, onDismiss }: Props) {
  if (combat.status === 'completed') {
    return (
      <section className="roll-panel">
        <h3>Combat over — {combat.name}</h3>
        {combat.outcome && <p>{combat.outcome}</p>}
        <pre style={{ whiteSpace: 'pre-wrap' }}>{generateCombatSummary(combat, log)}</pre>
        <button className="primary" onClick={onDismiss}>
          Done
        </button>
      </section>
    );
  }

  const { position: workingCombat, step } = currentStep(combat, template);
  const hero = chronicle.company.find((h) => h.id === workingCombat.heroOrder[workingCombat.currentHeroIndex]);

  return (
    <section className="roll-panel">
      <h3>
        ⚔️ {combat.name} — {describeCombatPosition(workingCombat)}
      </h3>

      <CombatOverview chronicle={chronicle} combat={workingCombat} onApply={onApply} />

      {workingCombat.betweenRounds ? (
        <RoundGate chronicle={chronicle} combat={workingCombat} onApply={onApply} />
      ) : !hero ? (
        <div>
          <p role="status">This hero is no longer in the company.</p>
          <button onClick={() => onApply({ chronicle, combat: completeHeroTurn(workingCombat), logEntries: [] })}>
            Skip
          </button>
        </div>
      ) : !step ? (
        <div>
          <p>{hero.name}'s turn is complete.</p>
          <button
            className="primary"
            onClick={() => onApply({ chronicle, combat: completeHeroTurn(workingCombat), logEntries: [] })}
          >
            {workingCombat.currentHeroIndex + 1 >= workingCombat.heroOrder.length ? 'Finish round' : 'Next hero'}
          </button>
        </div>
      ) : (
        <>
          <p>
            Acting: <strong>{hero.name}</strong> ({COMBAT_STANCE_LABEL[workingCombat.stances[hero.id] ?? 'open']})
          </p>
          <StepUI
            chronicle={chronicle}
            combat={workingCombat}
            hero={hero}
            step={step}
            oracleTables={oracleTables}
            onApply={onApply}
          />
        </>
      )}

      <AdversaryAttackPanel
        chronicle={chronicle}
        combat={workingCombat}
        defaultHeroId={hero?.id ?? null}
        onApply={onApply}
      />

      <EndCombatForm chronicle={chronicle} combat={workingCombat} onApply={onApply} />
    </section>
  );
}

function RoundGate({
  chronicle,
  combat,
  onApply,
}: {
  chronicle: Chronicle;
  combat: Combat;
  onApply: (params: CombatApplyParams) => void;
}) {
  const next = beginNextRound(combat);
  const label =
    combat.phase === 'opening-volley'
      ? combat.volley < combat.openingVolleys
        ? `Begin opening volley ${combat.volley + 1}`
        : 'Close to melee — begin round 1'
      : `Begin round ${combat.round + 1}`;

  return (
    <div>
      <p>{describeCombatPosition(combat)} complete. Fight on, or end the combat below.</p>
      <button
        className="primary"
        onClick={() =>
          onApply({
            chronicle,
            combat: next,
            logEntries: [recordCombatEvent(combat.id, null, `${describeCombatPosition(next)} begins.`)],
          })
        }
      >
        {label}
      </button>
    </div>
  );
}

function StepUI({
  chronicle,
  combat,
  hero,
  step,
  oracleTables,
  onApply,
}: {
  chronicle: Chronicle;
  combat: Combat;
  hero: Hero;
  step: StepTemplateStep;
  oracleTables: OracleTable[];
  onApply: (params: CombatApplyParams) => void;
}) {
  if (step.type === 'prompt') {
    return (
      <div key={step.id}>
        <p>{step.message}</p>
        <button
          onClick={() => {
            const entry = recordCombatEvent(combat.id, hero.id, step.message);
            onApply({ chronicle, combat: completeStep(combat), logEntries: [entry] });
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  if (step.type === 'attack') {
    return <AttackStepUI key={step.id} chronicle={chronicle} combat={combat} hero={hero} onApply={onApply} />;
  }

  if (step.type === 'roll') {
    return (
      <RollPanel
        key={step.id}
        hero={hero}
        companySize={chronicle.company.length}
        diceInputMode={chronicle.diceInputMode}
        initialSkillName={step.skillName}
        onResolved={({ skillName, result, inputMode }) => {
          const entry = recordSkillRoll(hero.id, skillName, result, inputMode, combat.id);
          onApply({
            chronicle,
            combat: completeStep(combat, result.success ? 'success' : 'failure'),
            logEntries: [entry],
          });
        }}
      />
    );
  }

  if (step.type === 'table-draw') {
    const table = oracleTables.find((t) => t.id === step.tableId);
    if (!table) {
      return (
        <div key={step.id}>
          <p role="status">This step's table no longer exists.</p>
          <button onClick={() => onApply({ chronicle, combat: completeStep(combat), logEntries: [] })}>Skip</button>
        </div>
      );
    }
    return (
      <TableRoller
        key={step.id}
        tables={[table]}
        onLog={({ tableId, tableName, key, text, prose }) => {
          const entry = recordTableRoll(tableId, tableName, key, { text }, chronicle.diceInputMode, prose, combat.id);
          onApply({ chronicle, combat: completeStep(combat), logEntries: [entry] });
        }}
      />
    );
  }

  if (step.type === 'resource-change') {
    return (
      <ResourceChangeStepUI
        key={step.id}
        chronicle={chronicle}
        step={step}
        affectedHeroIds={[hero.id]}
        runId={combat.id}
        onApplied={({ chronicle: nextChronicle, logEntries }) =>
          onApply({ chronicle: nextChronicle, combat: completeStep(combat), logEntries })
        }
      />
    );
  }

  return null; // conditional-branch is auto-resolved before reaching StepUI
}

/** F5.6 — every hero's and adversary's state, glanceable and tappable on a
 * phone. All values stay manually adjustable mid-fight (F5.7/N7). */
function CombatOverview({
  chronicle,
  combat,
  onApply,
}: {
  chronicle: Chronicle;
  combat: Combat;
  onApply: (params: CombatApplyParams) => void;
}) {
  function heroDelta(hero: Hero, field: 'endurance' | 'hope', delta: number) {
    const { chronicle: next, logEntry } = changeResource(
      chronicle,
      hero.id,
      field,
      delta,
      chronicle.diceInputMode,
      combat.id,
    );
    onApply({ chronicle: next, combat, logEntries: [logEntry] });
  }

  function adversaryDelta(adversary: Adversary, field: 'endurance' | 'hate', delta: number) {
    const { combat: next, from, to } = applyAdversaryDelta(combat, adversary.id, field, delta);
    const entry = recordCombatEvent(combat.id, null, `${adversary.name} ${field}: ${from} → ${to}.`, {
      adversaryId: adversary.id,
      field,
      from,
      to,
    });
    onApply({ chronicle, combat: next, logEntries: [entry] });
  }

  return (
    <div className="combat-overview">
      {combat.heroOrder.map((heroId) => {
        const hero = chronicle.company.find((h) => h.id === heroId);
        if (!hero) return null;
        const stance = combat.stances[hero.id] ?? 'open';
        return (
          <article key={hero.id} className="combatant">
            <header>
              <h4>{hero.name}</h4>
              {hero.wounded && <span className="badge">{hero.woundTreated ? 'Wounded (treated)' : 'Wounded'}</span>}
            </header>
            <label>
              Stance
              <select
                value={stance}
                onChange={(e) => {
                  const nextStance = e.target.value as CombatStance;
                  const entry = recordCombatEvent(
                    combat.id,
                    hero.id,
                    `${hero.name} takes the ${COMBAT_STANCE_LABEL[nextStance]} stance.`,
                  );
                  onApply({ chronicle, combat: setStance(combat, hero.id, nextStance), logEntries: [entry] });
                }}
              >
                {COMBAT_STANCES.map((s) => (
                  <option key={s} value={s}>
                    {COMBAT_STANCE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Endurance {hero.resources.endurance}{' '}
              <button onClick={() => heroDelta(hero, 'endurance', -1)} aria-label={`Decrease ${hero.name} endurance`}>
                −
              </button>
              <button onClick={() => heroDelta(hero, 'endurance', 1)} aria-label={`Increase ${hero.name} endurance`}>
                +
              </button>{' '}
              · Hope {hero.resources.hope}{' '}
              <button onClick={() => heroDelta(hero, 'hope', -1)} aria-label={`Decrease ${hero.name} hope`}>
                −
              </button>
              <button onClick={() => heroDelta(hero, 'hope', 1)} aria-label={`Increase ${hero.name} hope`}>
                +
              </button>
            </p>
            <p>
              {!hero.wounded && (
                <WoundButton chronicle={chronicle} combat={combat} heroId={hero.id} change="wounded" onApply={onApply} />
              )}
              {hero.wounded && !hero.woundTreated && (
                <WoundButton chronicle={chronicle} combat={combat} heroId={hero.id} change="treated" onApply={onApply} />
              )}
              {hero.wounded && (
                <WoundButton chronicle={chronicle} combat={combat} heroId={hero.id} change="recovered" onApply={onApply} />
              )}
            </p>
          </article>
        );
      })}

      {combat.adversaries.map((adversary) => (
        <article key={adversary.id} className={`combatant adversary${adversary.status !== 'active' ? ' out' : ''}`}>
          <header>
            <h4>{adversary.name}</h4>
            {adversary.wounded && <span className="badge">Wounded</span>}
          </header>
          <p>
            Endurance {adversary.endurance}{' '}
            <button onClick={() => adversaryDelta(adversary, 'endurance', -1)} aria-label={`Decrease ${adversary.name} endurance`}>
              −
            </button>
            <button onClick={() => adversaryDelta(adversary, 'endurance', 1)} aria-label={`Increase ${adversary.name} endurance`}>
              +
            </button>{' '}
            · Hate {adversary.hate}{' '}
            <button onClick={() => adversaryDelta(adversary, 'hate', -1)} aria-label={`Decrease ${adversary.name} hate`}>
              −
            </button>
            <button onClick={() => adversaryDelta(adversary, 'hate', 1)} aria-label={`Increase ${adversary.name} hate`}>
              +
            </button>
          </p>
          <label>
            Status
            <select
              value={adversary.status}
              onChange={(e) => {
                const status = e.target.value as Adversary['status'];
                const entry = recordCombatEvent(combat.id, null, `${adversary.name} is ${status}.`, {
                  adversaryId: adversary.id,
                  status,
                });
                onApply({ chronicle, combat: updateAdversary(combat, { ...adversary, status }), logEntries: [entry] });
              }}
            >
              <option value="active">Active</option>
              <option value="defeated">Defeated</option>
              <option value="fled">Fled</option>
            </select>
          </label>
          {adversary.notes && <p>{adversary.notes}</p>}
        </article>
      ))}
    </div>
  );
}

function WoundButton({
  chronicle,
  combat,
  heroId,
  change,
  onApply,
}: {
  chronicle: Chronicle;
  combat: Combat;
  heroId: string;
  change: 'wounded' | 'treated' | 'recovered';
  onApply: (params: CombatApplyParams) => void;
}) {
  const label = change === 'wounded' ? 'Mark wounded' : change === 'treated' ? 'Treat wound' : 'Recovered';
  return (
    <button
      className="ghost"
      onClick={() => {
        const { chronicle: next, logEntry } = recordWoundChange(chronicle, heroId, change, combat.id);
        onApply({ chronicle: next, combat, logEntries: [logEntry] });
      }}
    >
      {label}
    </button>
  );
}

function EndCombatForm({
  chronicle,
  combat,
  onApply,
}: {
  chronicle: Chronicle;
  combat: Combat;
  onApply: (params: CombatApplyParams) => void;
}) {
  const [outcome, setOutcome] = useState('');
  return (
    <fieldset>
      <legend>End combat</legend>
      <label>
        How did it end?
        <input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Victory / fled / …" />
      </label>
      <button
        onClick={() => {
          const entry = recordCombatEvent(combat.id, null, `Combat ends: ${outcome.trim() || 'no outcome recorded'}.`);
          onApply({ chronicle, combat: endCombat(combat, outcome.trim()), logEntries: [entry] });
        }}
      >
        End combat
      </button>
    </fieldset>
  );
}
