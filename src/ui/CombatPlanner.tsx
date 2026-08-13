import { useState } from 'react';
import {
  COMBAT_STANCES,
  COMBAT_STANCE_LABEL,
  createAdversary,
  createCombat,
  emptyStanceTargetNumbers,
  type Adversary,
  type Combat,
  type CombatStance,
  type StanceTargetNumbers,
} from '../engine/combat.ts';
import type { StepTemplate } from '../engine/stepTemplate.ts';
import type { Hero } from '../engine/types.ts';

interface Props {
  company: Hero[];
  stepTemplates: StepTemplate[];
  onBegin: (combat: Combat) => void;
}

// F5.1/F5.5 — set up a combat: adversaries (all values from the player's
// own bestiary), starting stances, opening-volley count (distance-dependent,
// Strider Mode p.15), and the stance TN table (core-rulebook numbers the
// player enters once per fight; blank means the attack UI asks per roll).

export function CombatPlanner({ company, stepTemplates, onBegin }: Props) {
  const defaultTemplate =
    stepTemplates.find((t) => t.steps.some((s) => s.type === 'attack')) ?? stepTemplates[0];
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState(defaultTemplate?.id ?? '');
  const [openingVolleys, setOpeningVolleys] = useState(0);
  const [adversaries, setAdversaries] = useState<Adversary[]>([]);
  const [stances, setStances] = useState<Record<string, CombatStance>>({});
  const [stanceTNs, setStanceTNs] = useState<StanceTargetNumbers>(emptyStanceTargetNumbers());

  const [advName, setAdvName] = useState('');
  const [advEndurance, setAdvEndurance] = useState(0);
  const [advHate, setAdvHate] = useState(0);
  const [advNotes, setAdvNotes] = useState('');

  if (company.length === 0) {
    return (
      <section className="roll-panel">
        <h3>Combat</h3>
        <p>Add a hero to the company before starting a combat.</p>
      </section>
    );
  }

  function addAdversaryDraft() {
    if (!advName.trim()) return;
    setAdversaries((a) => [
      ...a,
      createAdversary({ name: advName.trim(), endurance: advEndurance, hate: advHate, notes: advNotes }),
    ]);
    setAdvName('');
    setAdvEndurance(0);
    setAdvHate(0);
    setAdvNotes('');
  }

  function begin() {
    onBegin(
      createCombat({
        name: name.trim() || 'Combat',
        stepTemplateId: templateId,
        heroIds: company.map((h) => h.id),
        adversaries,
        openingVolleys,
        stances,
        stanceTargetNumbers: stanceTNs,
      }),
    );
  }

  return (
    <section className="roll-panel">
      <h3>Combat</h3>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ambush at the ford" />
      </label>
      <label>
        Round template
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {stepTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Opening volleys (depends on the distance between combatants)
        <input
          type="number"
          min={0}
          value={openingVolleys}
          onChange={(e) => setOpeningVolleys(Math.max(0, Number(e.target.value)))}
        />
      </label>

      <fieldset>
        <legend>Adversaries</legend>
        <ul>
          {adversaries.map((a) => (
            <li key={a.id}>
              {a.name} — Endurance {a.endurance}, Hate {a.hate}
              {a.notes && ` (${a.notes})`}{' '}
              <button
                onClick={() => setAdversaries((list) => list.filter((x) => x.id !== a.id))}
                aria-label={`Remove ${a.name}`}
              >
                ✕
              </button>
            </li>
          ))}
          {adversaries.length === 0 && <li>None yet — add each foe from your own stat blocks.</li>}
        </ul>
        <label>
          Name
          <input value={advName} onChange={(e) => setAdvName(e.target.value)} />
        </label>
        <label>
          Endurance
          <input type="number" value={advEndurance} onChange={(e) => setAdvEndurance(Number(e.target.value))} />
        </label>
        <label>
          Hate
          <input type="number" value={advHate} onChange={(e) => setAdvHate(Number(e.target.value))} />
        </label>
        <label>
          Notes (Parry, Armour, weapons…)
          <input value={advNotes} onChange={(e) => setAdvNotes(e.target.value)} />
        </label>
        <button onClick={addAdversaryDraft} disabled={!advName.trim()}>
          Add adversary
        </button>
      </fieldset>

      <fieldset>
        <legend>Starting stances</legend>
        {company.map((hero) => (
          <label key={hero.id}>
            {hero.name}
            <select
              value={stances[hero.id] ?? 'open'}
              onChange={(e) => setStances((s) => ({ ...s, [hero.id]: e.target.value as CombatStance }))}
            >
              {COMBAT_STANCES.map((stance) => (
                <option key={stance} value={stance}>
                  {COMBAT_STANCE_LABEL[stance]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Stance target numbers (from your rulebook; blank = enter per roll)</legend>
        {COMBAT_STANCES.map((stance) => (
          <label key={stance}>
            {COMBAT_STANCE_LABEL[stance]}
            <input
              type="number"
              value={stanceTNs[stance] ?? ''}
              onChange={(e) =>
                setStanceTNs((tns) => ({
                  ...tns,
                  [stance]: e.target.value.trim() === '' ? null : Number(e.target.value),
                }))
              }
            />
          </label>
        ))}
      </fieldset>

      <button className="primary big" onClick={begin} disabled={!templateId}>
        ⚔️ Begin combat
      </button>
    </section>
  );
}
