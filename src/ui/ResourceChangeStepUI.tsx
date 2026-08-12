import { useState } from 'react';
import { changeResource, setResource } from '../engine/actions.ts';
import type { StepTemplateStep } from '../engine/stepTemplate.ts';
import type { Chronicle, LogEntry } from '../engine/types.ts';

interface Props {
  chronicle: Chronicle;
  step: Extract<StepTemplateStep, { type: 'resource-change' }>;
  /** Who this applies to — the caller resolves scope/role (Journey) or
   * "this turn's hero" (Fellowship phase); this component doesn't know
   * which kind of run it's in. */
  affectedHeroIds: string[];
  /** Tags the resulting log entries — a Journey or FellowshipPhase id. */
  runId?: string;
  onApplied: (result: { chronicle: Chronicle; logEntries: LogEntry[] }) => void;
}

/** Shared by JourneyRunner and FellowshipRunner (F3.6/F4.6). Respects
 * step.mode: 'delta' (default) adds the amount; 'set' assigns it directly
 * (e.g. a Fellowship-phase Fatigue reset). */
export function ResourceChangeStepUI({ chronicle, step, affectedHeroIds, runId, onApplied }: Props) {
  const [amount, setAmount] = useState(step.amount);

  function apply() {
    let current = chronicle;
    const entries: LogEntry[] = [];
    for (const heroId of affectedHeroIds) {
      const { chronicle: next, logEntry } =
        step.mode === 'set'
          ? setResource(current, heroId, step.field, amount, chronicle.diceInputMode, runId)
          : changeResource(current, heroId, step.field, amount, chronicle.diceInputMode, runId);
      current = next;
      entries.push(logEntry);
    }
    onApplied({ chronicle: current, logEntries: entries });
  }

  return (
    <div>
      <label>
        {step.label || step.field} ({step.mode === 'set' ? 'set to' : 'change by'})
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </label>
      <button onClick={apply}>Apply &amp; continue</button>
    </div>
  );
}
