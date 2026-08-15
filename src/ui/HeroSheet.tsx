import { useState } from 'react';
import type { Hero } from '../engine/types.ts';

interface Props {
  hero: Hero;
  onChange: (hero: Hero) => void;
  onClose: () => void;
}

// F1.1's other half. HeroForm gets a hero onto the roster quickly; this
// is where the player copies in their actual character sheet — skill
// ranks, combat proficiencies, Valour, Wisdom, and the free-text lists.
// Without it every roll used whatever placeholder rank the quick start
// invented, and combat had no proficiencies at all.
//
// Names are open strings throughout (NG2): the eighteen seeded skills are
// a starting point, and proficiency names come from the player's own book.

export function HeroSheet({ hero, onChange, onClose }: Props) {
  const [newProficiency, setNewProficiency] = useState('');
  const [newSkill, setNewSkill] = useState('');

  function setField<K extends keyof Hero>(key: K, value: Hero[K]) {
    onChange({ ...hero, [key]: value });
  }

  function setSkill(name: string, rank: number) {
    onChange({ ...hero, skills: { ...hero.skills, [name]: clamp(rank) } });
  }

  function removeSkill(name: string) {
    const next = { ...hero.skills };
    delete next[name];
    setField('skills', next);
  }

  function addSkill() {
    const name = newSkill.trim();
    if (!name || name in hero.skills) return;
    setSkill(name, 0);
    setNewSkill('');
  }

  function setProficiency(name: string, rank: number) {
    onChange({ ...hero, combatProficiencies: { ...hero.combatProficiencies, [name]: clamp(rank) } });
  }

  function removeProficiency(name: string) {
    const next = { ...hero.combatProficiencies };
    delete next[name];
    setField('combatProficiencies', next);
  }

  function addProficiency() {
    const name = newProficiency.trim();
    if (!name || name in hero.combatProficiencies) return;
    setProficiency(name, 1);
    setNewProficiency('');
  }

  return (
    <section className="roll-panel hero-sheet">
      <div className="sheet-head">
        <h3>{hero.name}'s sheet</h3>
        <button className="ghost" onClick={onClose}>
          Done
        </button>
      </div>

      <div className="roll-fields">
        <label>
          Name
          <input value={hero.name} onChange={(e) => setField('name', e.target.value)} />
        </label>
        <label>
          Culture
          <input value={hero.culture} onChange={(e) => setField('culture', e.target.value)} />
        </label>
        <label>
          Calling
          <input value={hero.calling} onChange={(e) => setField('calling', e.target.value)} />
        </label>
      </div>

      <fieldset>
        <legend>Attributes</legend>
        <div className="stat-row">
          {(['strength', 'heart', 'wits'] as const).map((attr) => (
            <Stepper
              key={attr}
              label={attr[0].toUpperCase() + attr.slice(1)}
              value={hero.attributes[attr]}
              onChange={(v) => setField('attributes', { ...hero.attributes, [attr]: clamp(v) })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Standard of living &amp; standing</legend>
        <div className="stat-row">
          <Stepper label="Valour" value={hero.valour} onChange={(v) => setField('valour', clamp(v))} />
          <Stepper label="Wisdom" value={hero.wisdom} onChange={(v) => setField('wisdom', clamp(v))} />
        </div>
        <label>
          Patron
          <input value={hero.patron} onChange={(e) => setField('patron', e.target.value)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Skills</legend>
        {/* Book order, not alphabetical: you copy a character sheet
            straight down, and hunting for each name would be worse. */}
        <div className="skill-grid">
          {Object.keys(hero.skills).map((name) => (
            <Stepper
              key={name}
              label={name}
              value={hero.skills[name]}
              onChange={(v) => setSkill(name, v)}
              onRemove={() => removeSkill(name)}
            />
          ))}
        </div>
        <div className="quickstart-row">
          <input
            value={newSkill}
            placeholder="Add a skill"
            aria-label="New skill"
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <button onClick={addSkill} disabled={!newSkill.trim()}>
            Add
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Combat proficiencies</legend>
        {Object.keys(hero.combatProficiencies).length === 0 && (
          <p>None yet — add the weapon skills from your sheet so attacks can roll against them.</p>
        )}
        <div className="skill-grid">
          {Object.keys(hero.combatProficiencies)
            .sort((a, b) => a.localeCompare(b))
            .map((name) => (
              <Stepper
                key={name}
                label={name}
                value={hero.combatProficiencies[name]}
                onChange={(v) => setProficiency(name, v)}
                onRemove={() => removeProficiency(name)}
              />
            ))}
        </div>
        <div className="quickstart-row">
          <input
            value={newProficiency}
            placeholder="Swords, Bows, Axes…"
            aria-label="New combat proficiency"
            onChange={(e) => setNewProficiency(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addProficiency();
              }
            }}
          />
          <button onClick={addProficiency} disabled={!newProficiency.trim()}>
            Add
          </button>
        </div>
      </fieldset>

      <ListField label="Virtues" values={hero.virtues} onChange={(v) => setField('virtues', v)} />
      <ListField label="Rewards" values={hero.rewards} onChange={(v) => setField('rewards', v)} />
      <ListField label="Gear" values={hero.gear} onChange={(v) => setField('gear', v)} />
    </section>
  );
}

function clamp(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function Stepper({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="sheet-stat">
      <span className="sheet-stat-label">{label}</span>
      <span className="stepper">
        <button onClick={() => onChange(value - 1)} aria-label={`Decrease ${label}`}>
          −
        </button>
        <b>{value}</b>
        <button onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}>
          +
        </button>
        {onRemove && (
          <button className="ghost" onClick={onRemove} aria-label={`Remove ${label}`}>
            ✕
          </button>
        )}
      </span>
    </div>
  );
}

/** Virtues, rewards and gear are free-text lists — one line each, since
 * their content is core-rulebook material the app doesn't ship. */
function ListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft('');
  }

  return (
    <fieldset>
      <legend>{label}</legend>
      <ul className="chip-list">
        {values.map((v, i) => (
          <li key={`${v}-${i}`}>
            <span>{v}</span>
            <button
              className="ghost"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              aria-label={`Remove ${v}`}
            >
              ✕
            </button>
          </li>
        ))}
        {values.length === 0 && <li className="empty">None</li>}
      </ul>
      <div className="quickstart-row">
        <input
          value={draft}
          aria-label={`New ${label.toLowerCase()} entry`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </fieldset>
  );
}
