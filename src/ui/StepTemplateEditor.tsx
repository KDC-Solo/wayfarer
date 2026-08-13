import { useState } from 'react';
import type { OracleTable } from '../engine/oracleTable.ts';
import type { ResourceField } from '../engine/resources.ts';
import {
  addStep,
  createStepTemplate,
  duplicateStep,
  duplicateStepTemplate,
  JOURNEY_ROLES,
  moveStep,
  removeStep,
  renameStepTemplate,
  toggleStepEnabled,
  type JourneyRole,
  type StepTemplate,
  type StepTemplateStep,
} from '../engine/stepTemplate.ts';

type StepType = StepTemplateStep['type'];

interface Props {
  templates: StepTemplate[];
  oracleTables: OracleTable[];
  onCreate: (template: StepTemplate) => void;
  onUpdate: (template: StepTemplate) => void;
  onDelete: (id: string) => void;
}

// F3.2/F3.4 — step templates are first-class, user-editable objects:
// create, duplicate/reorder/disable/edit steps, and save as a named variant.

export function StepTemplateEditor({ templates, oracleTables, onCreate, onUpdate, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = templates.find((t) => t.id === selectedId) ?? null;

  return (
    <section className="roll-panel">
      <h3>Step templates</h3>
      <ul>
        {templates.map((t) => (
          <li key={t.id}>
            <button onClick={() => setSelectedId(t.id)}>{t.name}</button>{' '}
            <button onClick={() => onCreate(duplicateStepTemplate(t, `${t.name} (copy)`))}>Duplicate</button>{' '}
            <button onClick={() => onDelete(t.id)} aria-label={`Delete ${t.name}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => onCreate(createStepTemplate('New template'))}>New blank template</button>

      {selected && (
        <StepListEditor
          template={selected}
          oracleTables={oracleTables}
          onChange={onUpdate}
          onRename={(name) => onUpdate(renameStepTemplate(selected, name))}
        />
      )}
    </section>
  );
}

function StepListEditor({
  template,
  oracleTables,
  onChange,
  onRename,
}: {
  template: StepTemplate;
  oracleTables: OracleTable[];
  onChange: (template: StepTemplate) => void;
  onRename: (name: string) => void;
}) {
  const [newType, setNewType] = useState<StepType>('prompt');

  function addNewStep() {
    const base = { id: crypto.randomUUID(), label: newType, enabled: true };
    let step: StepTemplateStep;
    switch (newType) {
      case 'prompt':
        step = { ...base, type: 'prompt', message: '' };
        break;
      case 'roll':
        step = { ...base, type: 'roll', skillName: '', role: 'guide' };
        break;
      case 'table-draw':
        step = { ...base, type: 'table-draw', tableId: oracleTables[0]?.id ?? '' };
        break;
      case 'resource-change':
        step = { ...base, type: 'resource-change', field: 'fatigue', amount: 0, scope: 'whole-company' };
        break;
      case 'attack':
        step = { ...base, type: 'attack' };
        break;
      case 'conditional-branch':
        step = { ...base, type: 'conditional-branch', when: 'previous-roll-failed', skipCount: 1 };
        break;
    }
    onChange(addStep(template, step));
  }

  return (
    <div>
      <label>
        Template name
        <input value={template.name} onChange={(e) => onRename(e.target.value)} />
      </label>

      <ol>
        {template.steps.map((step) => (
          <li key={step.id}>
            <StepRow
              step={step}
              oracleTables={oracleTables}
              onChange={(s) => onChange({ ...template, steps: template.steps.map((x) => (x.id === s.id ? s : x)) })}
              onToggle={() => onChange(toggleStepEnabled(template, step.id))}
              onDuplicate={() => onChange(duplicateStep(template, step.id))}
              onRemove={() => onChange(removeStep(template, step.id))}
              onMoveUp={() => onChange(moveStep(template, step.id, 'up'))}
              onMoveDown={() => onChange(moveStep(template, step.id, 'down'))}
            />
          </li>
        ))}
      </ol>

      <label>
        Add step
        <select value={newType} onChange={(e) => setNewType(e.target.value as StepType)}>
          <option value="prompt">Prompt</option>
          <option value="roll">Roll</option>
          <option value="table-draw">Table draw</option>
          <option value="resource-change">Resource change</option>
          <option value="attack">Attack (combat)</option>
          <option value="conditional-branch">Conditional branch</option>
        </select>
      </label>
      <button onClick={addNewStep}>Add</button>
    </div>
  );
}

function StepRow({
  step,
  oracleTables,
  onChange,
  onToggle,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: StepTemplateStep;
  oracleTables: OracleTable[];
  onChange: (step: StepTemplateStep) => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div style={{ opacity: step.enabled ? 1 : 0.5 }}>
      <strong>{step.type}</strong>{' '}
      <input value={step.label} onChange={(e) => onChange({ ...step, label: e.target.value })} />
      <button onClick={onMoveUp} aria-label="Move up">
        ↑
      </button>
      <button onClick={onMoveDown} aria-label="Move down">
        ↓
      </button>
      <button onClick={onToggle}>{step.enabled ? 'Disable' : 'Enable'}</button>
      <button onClick={onDuplicate}>Duplicate</button>
      <button onClick={onRemove} aria-label="Remove step">
        ✕
      </button>

      {step.type === 'prompt' && (
        <label>
          Message
          <input value={step.message} onChange={(e) => onChange({ ...step, message: e.target.value })} />
        </label>
      )}

      {step.type === 'roll' && (
        <>
          <label>
            Default skill (blank = choose at roll time)
            <input value={step.skillName} onChange={(e) => onChange({ ...step, skillName: e.target.value })} />
          </label>
          <label>
            Role
            <select
              value={step.role ?? ''}
              onChange={(e) => onChange({ ...step, role: (e.target.value || undefined) as JourneyRole | undefined })}
            >
              <option value="">(active hero)</option>
              {JOURNEY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {step.type === 'table-draw' && (
        <label>
          Table
          <select value={step.tableId} onChange={(e) => onChange({ ...step, tableId: e.target.value })}>
            {oracleTables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {step.type === 'resource-change' && (
        <>
          <label>
            Field
            <select
              value={step.field}
              onChange={(e) => onChange({ ...step, field: e.target.value as ResourceField })}
            >
              {(['endurance', 'hope', 'fatigue', 'shadow', 'shadowPoints', 'shadowScars'] as ResourceField[]).map(
                (f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              value={step.amount}
              onChange={(e) => onChange({ ...step, amount: Number(e.target.value) })}
            />
          </label>
          <label>
            Scope
            <select value={step.scope} onChange={(e) => onChange({ ...step, scope: e.target.value as typeof step.scope })}>
              <option value="active-hero">active hero</option>
              <option value="whole-company">whole company</option>
              {JOURNEY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {step.type === 'attack' && (
        <p>Proficiency, target, TN, damage, and Piercing Blows are all chosen live during combat.</p>
      )}

      {step.type === 'conditional-branch' && (
        <>
          <label>
            When
            <select
              value={step.when}
              onChange={(e) => onChange({ ...step, when: e.target.value as typeof step.when })}
            >
              <option value="previous-roll-failed">previous roll failed</option>
              <option value="previous-roll-succeeded">previous roll succeeded</option>
            </select>
          </label>
          <label>
            Skip count
            <input
              type="number"
              value={step.skipCount}
              onChange={(e) => onChange({ ...step, skipCount: Number(e.target.value) })}
            />
          </label>
        </>
      )}
    </div>
  );
}
