import { useState } from 'react';
import {
  recordExperienceSpend,
  recordFellowshipEvent,
  recordMilestoneAward,
  recordSkillRoll,
  recordTableRoll,
} from '../engine/actions.ts';
import { EXPERIENCE_MILESTONES, InsufficientExperienceError, type ExperienceCurrency } from '../engine/experience.ts';
import {
  completeHeroTurn,
  setPatronErrand,
  type FellowshipPhase,
} from '../engine/fellowshipPhase.ts';
import type { OracleTable } from '../engine/oracleTable.ts';
import { currentStep, completeStep } from '../engine/stepRunner.ts';
import type { StepTemplate, StepTemplateStep } from '../engine/stepTemplate.ts';
import type { Chronicle, Hero, LogEntry } from '../engine/types.ts';
import { ResourceChangeStepUI } from './ResourceChangeStepUI.tsx';
import { RollPanel } from './RollPanel.tsx';
import { TableRoller } from './TableRoller.tsx';

interface ApplyParams {
  chronicle: Chronicle;
  phase: FellowshipPhase;
  logEntries: LogEntry[];
}

interface Props {
  chronicle: Chronicle;
  phase: FellowshipPhase;
  template: StepTemplate;
  oracleTables: OracleTable[];
  onApply: (params: ApplyParams) => void;
  onDismiss: () => void;
}

// F4.6 — runs the Fellowship Phase's step template once per hero, reusing
// the same generic interpreter (stepRunner.ts) Journey uses, plus
// RollPanel/TableRoller/ResourceChangeStepUI for the interactive steps.
// Milestone awards and experience spends aren't template steps (F4.2/F4.4)
// — they're always-available actions during a hero's turn.

export function FellowshipRunner({ chronicle, phase, template, oracleTables, onApply, onDismiss }: Props) {
  if (phase.status === 'completed') {
    return <PatronErrandView chronicle={chronicle} phase={phase} onApply={onApply} onDismiss={onDismiss} />;
  }

  const { position: workingPhase, step } = currentStep(phase, template);
  const hero = chronicle.company.find((h) => h.id === workingPhase.heroOrder[workingPhase.currentHeroIndex]);

  if (!hero) {
    return (
      <section className="roll-panel">
        <p role="status">This hero is no longer in the company.</p>
        <button onClick={() => onApply({ chronicle, phase: completeHeroTurn(workingPhase), logEntries: [] })}>
          Skip
        </button>
      </section>
    );
  }

  if (!step) {
    return (
      <section className="roll-panel">
        <p>{hero.name}'s Fellowship turn is complete.</p>
        <button onClick={() => onApply({ chronicle, phase: completeHeroTurn(workingPhase), logEntries: [] })}>
          {workingPhase.currentHeroIndex + 1 >= workingPhase.heroOrder.length ? 'Finish phase' : 'Next hero'}
        </button>
      </section>
    );
  }

  return (
    <section className="roll-panel">
      <h3>Fellowship Phase — Year {phase.year}</h3>
      <p>
        Hero {workingPhase.currentHeroIndex + 1}/{workingPhase.heroOrder.length}: {hero.name}
      </p>

      <StepUI
        chronicle={chronicle}
        phase={workingPhase}
        hero={hero}
        step={step}
        oracleTables={oracleTables}
        onApply={onApply}
      />

      <ExperiencePanel chronicle={chronicle} phase={workingPhase} hero={hero} onApply={onApply} />
    </section>
  );
}

function StepUI({
  chronicle,
  phase,
  hero,
  step,
  oracleTables,
  onApply,
}: {
  chronicle: Chronicle;
  phase: FellowshipPhase;
  hero: Hero;
  step: StepTemplateStep;
  oracleTables: OracleTable[];
  onApply: (params: ApplyParams) => void;
}) {
  if (step.type === 'prompt') {
    return (
      <div key={step.id}>
        <p>{step.message}</p>
        <button
          onClick={() => {
            const entry = recordFellowshipEvent(phase.id, hero.id, step.message);
            onApply({ chronicle, phase: completeStep(phase), logEntries: [entry] });
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  if (step.type === 'resource-change') {
    return (
      <ResourceChangeStepUI
        key={step.id}
        chronicle={chronicle}
        step={step}
        affectedHeroIds={[hero.id]}
        runId={phase.id}
        onApplied={({ chronicle: nextChronicle, logEntries }) =>
          onApply({ chronicle: nextChronicle, phase: completeStep(phase), logEntries })
        }
      />
    );
  }

  if (step.type === 'table-draw') {
    const table = oracleTables.find((t) => t.id === step.tableId);
    if (!table) {
      return (
        <div key={step.id}>
          <p role="status">This step's table no longer exists.</p>
          <button onClick={() => onApply({ chronicle, phase: completeStep(phase), logEntries: [] })}>Skip</button>
        </div>
      );
    }
    return (
      <TableRoller
        key={step.id}
        tables={[table]}
        onLog={({ tableId, tableName, key, text, prose }) => {
          const entry = recordTableRoll(tableId, tableName, key, { text }, chronicle.diceInputMode, prose, phase.id);
          onApply({ chronicle, phase: completeStep(phase), logEntries: [entry] });
        }}
      />
    );
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
          const entry = recordSkillRoll(hero.id, skillName, result, inputMode, phase.id);
          onApply({
            chronicle,
            phase: completeStep(phase, result.success ? 'success' : 'failure'),
            logEntries: [entry],
          });
        }}
      />
    );
  }

  return null; // conditional-branch is auto-resolved before reaching StepUI
}

function ExperiencePanel({
  chronicle,
  phase,
  hero,
  onApply,
}: {
  chronicle: Chronicle;
  phase: FellowshipPhase;
  hero: Hero;
  onApply: (params: ApplyParams) => void;
}) {
  const [milestoneName, setMilestoneName] = useState(EXPERIENCE_MILESTONES[0].name);
  const [currency, setCurrency] = useState<ExperienceCurrency>('skill');
  const [targetKind, setTargetKind] = useState<'skill' | 'proficiency' | 'valour' | 'wisdom'>('skill');
  const [targetName, setTargetName] = useState('');
  const [newRank, setNewRank] = useState(1);
  const [cost, setCost] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function award() {
    const milestone = EXPERIENCE_MILESTONES.find((m) => m.name === milestoneName)!;
    const { chronicle: next, logEntry } = recordMilestoneAward(chronicle, hero.id, milestone, phase.id);
    onApply({ chronicle: next, phase, logEntries: [logEntry] });
  }

  function spend() {
    setError(null);
    try {
      const target =
        targetKind === 'skill' || targetKind === 'proficiency'
          ? { kind: targetKind, name: targetName, newRank }
          : { kind: targetKind, newRank };
      const { chronicle: next, logEntry } = recordExperienceSpend(chronicle, hero.id, currency, cost, target, phase.id);
      onApply({ chronicle: next, phase, logEntries: [logEntry] });
    } catch (err) {
      setError(err instanceof InsufficientExperienceError ? err.message : String(err));
    }
  }

  return (
    <div className="hero-form">
      <p>
        {hero.name}: {hero.adventurePoints} Adventure Points, {hero.skillPoints} Skill Points
      </p>

      <fieldset>
        <legend>Award milestone</legend>
        <select value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)}>
          {EXPERIENCE_MILESTONES.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name} (+{m.adventurePoints} AP, +{m.skillPoints} SP)
            </option>
          ))}
        </select>
        <button onClick={award}>Award</button>
      </fieldset>

      <fieldset>
        <legend>Spend experience</legend>
        <label>
          Currency
          <select value={currency} onChange={(e) => setCurrency(e.target.value as ExperienceCurrency)}>
            <option value="skill">Skill Points</option>
            <option value="adventure">Adventure Points</option>
          </select>
        </label>
        <label>
          On
          <select value={targetKind} onChange={(e) => setTargetKind(e.target.value as typeof targetKind)}>
            <option value="skill">Skill rank</option>
            <option value="proficiency">Combat proficiency</option>
            <option value="valour">Valour</option>
            <option value="wisdom">Wisdom</option>
          </select>
        </label>
        {(targetKind === 'skill' || targetKind === 'proficiency') && (
          <label>
            Name
            <input value={targetName} onChange={(e) => setTargetName(e.target.value)} />
          </label>
        )}
        <label>
          New rank
          <input type="number" value={newRank} onChange={(e) => setNewRank(Number(e.target.value))} />
        </label>
        <label>
          Cost
          <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
        </label>
        <button onClick={spend}>Spend</button>
        {error && <p role="status">{error}</p>}
      </fieldset>
    </div>
  );
}

function PatronErrandView({
  chronicle,
  phase,
  onApply,
  onDismiss,
}: {
  chronicle: Chronicle;
  phase: FellowshipPhase;
  onApply: (params: ApplyParams) => void;
  onDismiss: () => void;
}) {
  const [errand, setErrand] = useState('');

  function save() {
    const entry = recordFellowshipEvent(phase.id, null, `Patron errand: ${errand}`);
    onApply({ chronicle, phase: setPatronErrand(phase, errand), logEntries: errand.trim() ? [entry] : [] });
    onDismiss();
  }

  return (
    <section className="roll-panel">
      <h3>Fellowship Phase complete — Year {phase.year}</h3>
      <label>
        Next patron errand
        <input value={errand} onChange={(e) => setErrand(e.target.value)} />
      </label>
      <button className="primary" onClick={save}>
        Save &amp; done
      </button>
    </section>
  );
}
