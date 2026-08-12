import { useState } from 'react';
import type { StepTemplate } from '../engine/stepTemplate.ts';

interface Props {
  companySize: number;
  stepTemplates: StepTemplate[];
  onBegin: (stepTemplateId: string) => void;
}

// F4.1 — advancing to a Fellowship Phase; template choice mirrors
// JourneyPlanner's (F3.2).

export function FellowshipPlanner({ companySize, stepTemplates, onBegin }: Props) {
  const [templateId, setTemplateId] = useState(stepTemplates[0]?.id ?? '');

  if (companySize === 0) {
    return (
      <section className="roll-panel">
        <h3>Fellowship Phase</h3>
        <p>Add a hero to the company before opening a Fellowship Phase.</p>
      </section>
    );
  }

  return (
    <section className="roll-panel">
      <h3>Fellowship Phase</h3>
      <label>
        Step template
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {stepTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => onBegin(templateId)} disabled={!templateId}>
        Advance year &amp; open Fellowship Phase (F4.1)
      </button>
    </section>
  );
}
