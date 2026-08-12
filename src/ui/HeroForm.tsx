import { useState } from 'react';
import { createHero } from '../engine/hero.ts';
import type { Hero } from '../engine/types.ts';

// F1.1 — minimal chargen surface: name, culture, calling, attributes,
// starting resources, patron. Skills/proficiencies/virtues/rewards/gear are
// editable afterwards from the company overview; this form just gets a hero
// on the roster quickly.

export function HeroForm({ onCreate, onCancel }: { onCreate: (hero: Hero) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [culture, setCulture] = useState('');
  const [calling, setCalling] = useState('');
  const [patron, setPatron] = useState('');
  const [strength, setStrength] = useState(0);
  const [heart, setHeart] = useState(0);
  const [wits, setWits] = useState(0);
  const [endurance, setEndurance] = useState(0);
  const [hope, setHope] = useState(0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const hero: Hero = {
      ...createHero({ name: name.trim(), culture, calling, patron }),
      attributes: { strength, heart, wits },
      resources: { endurance, hope, fatigue: 0, shadow: 0, shadowPoints: 0, shadowScars: 0 },
    };
    onCreate(hero);
  }

  return (
    <form onSubmit={submit} className="hero-form">
      <h3>New hero</h3>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Culture
        <input value={culture} onChange={(e) => setCulture(e.target.value)} />
      </label>
      <label>
        Calling
        <input value={calling} onChange={(e) => setCalling(e.target.value)} />
      </label>
      <label>
        Patron
        <input value={patron} onChange={(e) => setPatron(e.target.value)} />
      </label>
      <fieldset>
        <legend>Attributes</legend>
        <label>
          Strength
          <input
            type="number"
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
          />
        </label>
        <label>
          Heart
          <input type="number" value={heart} onChange={(e) => setHeart(Number(e.target.value))} />
        </label>
        <label>
          Wits
          <input type="number" value={wits} onChange={(e) => setWits(Number(e.target.value))} />
        </label>
      </fieldset>
      <fieldset>
        <legend>Starting resources</legend>
        <label>
          Endurance
          <input
            type="number"
            value={endurance}
            onChange={(e) => setEndurance(Number(e.target.value))}
          />
        </label>
        <label>
          Hope
          <input type="number" value={hope} onChange={(e) => setHope(Number(e.target.value))} />
        </label>
      </fieldset>
      <button type="submit" className="primary">
        Add to company
      </button>{' '}
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
