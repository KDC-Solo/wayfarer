import { useState } from 'react';
import { recordJourneyEvent, recordSkillRoll, recordTableRoll } from '../engine/actions.ts';
import type { OracleTable } from '../engine/oracleTable.ts';
import {
  abandonJourney,
  generateJourneySummary,
  pauseJourney,
  resumeJourney,
  saveAsRoute,
  type Journey,
  type Route,
} from '../engine/journey.ts';
import { completeLeg, completeStep, currentStep, favourModeForLandDanger, resolveRoleHero } from '../engine/journeyEngine.ts';
import type { JourneyRole, StepTemplate, StepTemplateStep } from '../engine/stepTemplate.ts';
import type { Chronicle, LogEntry } from '../engine/types.ts';
import { RollPanel } from './RollPanel.tsx';
import { TableRoller } from './TableRoller.tsx';
import { ResourceChangeStepUI } from './ResourceChangeStepUI.tsx';

interface ApplyParams {
  chronicle: Chronicle;
  journey: Journey;
  logEntries: LogEntry[];
}

interface Props {
  chronicle: Chronicle;
  journey: Journey;
  template: StepTemplate;
  oracleTables: OracleTable[];
  log: LogEntry[];
  onApply: (params: ApplyParams) => void;
  onSaveRoute: (route: Route) => void;
  onDismiss: () => void;
}

// F3.6 — execute the loaded step template one leg at a time, prompting only
// for what the template requires. Interactive steps reuse RollPanel/
// TableRoller rather than re-implementing dice collection.

export function JourneyRunner({ chronicle, journey, template, oracleTables, log, onApply, onSaveRoute, onDismiss }: Props) {
  const { journey: workingJourney, step } = currentStep(journey, template);
  const waypoint = workingJourney.waypoints[workingJourney.currentLegIndex];

  if (workingJourney.status === 'completed') {
    return <JourneySummaryView journey={workingJourney} log={log} onSaveRoute={onSaveRoute} onDismiss={onDismiss} />;
  }

  if (workingJourney.status === 'paused') {
    return (
      <section className="roll-panel">
        <p>Journey to {workingJourney.destination} is paused.</p>
        <button onClick={() => onApply({ chronicle, journey: resumeJourney(workingJourney), logEntries: [] })}>
          Resume
        </button>
      </section>
    );
  }

  if (workingJourney.status === 'abandoned') {
    return (
      <section className="roll-panel">
        <p>Journey to {workingJourney.destination} was abandoned.</p>
        <button onClick={onDismiss}>Dismiss</button>
      </section>
    );
  }

  if (!step) {
    return (
      <section className="roll-panel">
        <p>Leg complete: {waypoint.name}.</p>
        <button onClick={() => onApply({ chronicle, journey: completeLeg(workingJourney), logEntries: [] })}>
          {workingJourney.currentLegIndex + 1 >= workingJourney.waypoints.length
            ? 'Arrive'
            : 'Continue to next leg'}
        </button>
      </section>
    );
  }

  return (
    <section className="roll-panel">
      <h3>
        Journey: {journey.origin} → {journey.destination}
      </h3>
      <p>
        Leg {workingJourney.currentLegIndex + 1}/{workingJourney.waypoints.length}: {waypoint.name}
        {waypoint.terrain && ` (${waypoint.terrain})`}
      </p>

      <StepUI
        chronicle={chronicle}
        journey={workingJourney}
        step={step}
        waypoint={waypoint}
        oracleTables={oracleTables}
        onApply={onApply}
      />

      <div>
        <button onClick={() => onApply({ chronicle, journey: pauseJourney(workingJourney), logEntries: [] })}>
          Pause
        </button>{' '}
        <button onClick={() => onApply({ chronicle, journey: abandonJourney(workingJourney), logEntries: [] })}>
          Abandon journey
        </button>
      </div>
    </section>
  );
}

function StepUI({
  chronicle,
  journey,
  step,
  waypoint,
  oracleTables,
  onApply,
}: {
  chronicle: Chronicle;
  journey: Journey;
  step: StepTemplateStep;
  waypoint: Journey['waypoints'][number];
  oracleTables: OracleTable[];
  onApply: (params: ApplyParams) => void;
}) {
  if (step.type === 'prompt') {
    return (
      <div key={step.id}>
        <p>{step.message}</p>
        <button
          onClick={() => {
            const entry = recordJourneyEvent(journey.id, chronicle.activeHeroId, step.message);
            onApply({ chronicle, journey: completeStep(journey), logEntries: [entry] });
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  if (step.type === 'table-draw') {
    const table = oracleTables.find((t) => t.id === step.tableId);
    if (!table) {
      return (
        <div key={step.id}>
          <p role="status">This step's table no longer exists.</p>
          <button onClick={() => onApply({ chronicle, journey: completeStep(journey), logEntries: [] })}>
            Skip
          </button>
        </div>
      );
    }
    return (
      <div key={step.id}>
        <TableRoller
          tables={[table]}
          onLog={({ tableId, tableName, key, text, prose }) => {
            const entry = recordTableRoll(
              tableId,
              tableName,
              key,
              { text },
              chronicle.diceInputMode,
              prose,
              journey.id,
            );
            onApply({ chronicle, journey: completeStep(journey), logEntries: [entry] });
          }}
        />
      </div>
    );
  }

  if (step.type === 'roll') {
    const heroId = resolveRoleHero(journey, chronicle, step.role);
    const hero = chronicle.company.find((h) => h.id === heroId);
    if (!hero) {
      return (
        <div key={step.id}>
          <p role="status">No hero available for this role.</p>
          <button onClick={() => onApply({ chronicle, journey: completeStep(journey), logEntries: [] })}>
            Skip
          </button>
        </div>
      );
    }
    return (
      <RollPanel
        key={step.id}
        hero={hero}
        companySize={chronicle.company.length}
        diceInputMode={chronicle.diceInputMode}
        initialSkillName={step.skillName}
        initialFavourMode={favourModeForLandDanger(waypoint.landDanger)}
        onResolved={({ skillName, result, inputMode }) => {
          const entry = recordSkillRoll(hero.id, skillName, result, inputMode, journey.id);
          const updated = completeStep(journey, result.success ? 'success' : 'failure');
          onApply({ chronicle, journey: updated, logEntries: [entry] });
        }}
      />
    );
  }

  if (step.type === 'resource-change') {
    const affectedHeroIds =
      step.scope === 'whole-company'
        ? chronicle.company.map((h) => h.id)
        : step.scope === 'active-hero'
          ? chronicle.activeHeroId
            ? [chronicle.activeHeroId]
            : []
          : (() => {
              const heroId = resolveRoleHero(journey, chronicle, step.scope as JourneyRole);
              return heroId ? [heroId] : [];
            })();
    return (
      <ResourceChangeStepUI
        key={step.id}
        chronicle={chronicle}
        step={step}
        affectedHeroIds={affectedHeroIds}
        runId={journey.id}
        onApplied={({ chronicle: nextChronicle, logEntries }) =>
          onApply({ chronicle: nextChronicle, journey: completeStep(journey), logEntries })
        }
      />
    );
  }

  return null; // conditional-branch is auto-resolved before reaching StepUI
}

function JourneySummaryView({
  journey,
  log,
  onSaveRoute,
  onDismiss,
}: {
  journey: Journey;
  log: LogEntry[];
  onSaveRoute: (route: Route) => void;
  onDismiss: () => void;
}) {
  const [routeName, setRouteName] = useState(`${journey.origin} to ${journey.destination}`);
  const summary = generateJourneySummary(journey, log);

  return (
    <section className="roll-panel">
      <h3>Journey complete (F3.10)</h3>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{summary}</pre>
      <label>
        Save route as
        <input value={routeName} onChange={(e) => setRouteName(e.target.value)} />
      </label>
      <button onClick={() => onSaveRoute(saveAsRoute(journey, routeName))}>Save as route (F3.11)</button>{' '}
      <button onClick={onDismiss}>Done</button>
    </section>
  );
}
