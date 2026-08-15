import { useState } from 'react';
import type { AttributeSet, Calling, Culture } from '../engine/culture.ts';
import { deriveEndurance, deriveHope, deriveParry } from '../engine/culture.ts';
import { createHeroFromChoices } from '../engine/hero.ts';
import { rollSuccessDie } from '../engine/dice.ts';
import type { Hero } from '../engine/types.ts';

interface Props {
  cultures: Culture[];
  callings: Calling[];
  onCreate: (hero: Hero) => void;
  onCancel: () => void;
}

// F1.1 — guided character creation, driven entirely by the culture and
// calling data the player imported from their own rulebook. The app
// ships none of it (C1), so with nothing loaded this degrades to a
// pointer at the manual sheet rather than pretending to know the game.

export function CharacterCreation({ cultures, callings, onCreate, onCancel }: Props) {
  const [name, setName] = useState('');
  const [cultureId, setCultureId] = useState(cultures[0]?.id ?? '');
  const [callingId, setCallingId] = useState('');
  const [setIndex, setSetIndex] = useState(0);
  const [favoured, setFavoured] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);

  const culture = cultures.find((c) => c.id === cultureId) ?? null;
  const calling = callings.find((c) => c.id === callingId) ?? null;
  const attributeSet: AttributeSet | null = culture?.attributeSets[setIndex] ?? null;

  if (cultures.length === 0) {
    return (
      <section className="roll-panel">
        <h3>Create a character</h3>
        <p>
          Guided creation needs your rulebook's cultures, which don't ship with Wayfarer. Import a pack
          under Setup to unlock it — or build a hero by hand instead, which works just as well.
        </p>
        <button onClick={onCancel}>Back</button>
      </section>
    );
  }

  function toggle(list: string[], value: string, max: number): string[] {
    if (list.includes(value)) return list.filter((v) => v !== value);
    if (list.length >= max) return [...list.slice(1), value];
    return [...list, value];
  }

  function submit() {
    if (!culture || !attributeSet) return;
    onCreate(
      createHeroFromChoices({
        name: name.trim() || 'The Wayfarer',
        culture,
        calling,
        attributeSet,
        favouredSkills: favoured,
        distinctiveFeatures: features,
      }),
    );
  }

  // The book lets you roll a Success die for your attribute row.
  function rollAttributes() {
    if (!culture) return;
    const roll = rollSuccessDie();
    const index = culture.attributeSets.findIndex((s) => s.roll === roll);
    setSetIndex(index === -1 ? 0 : index);
  }

  const skillPool = [
    ...(culture?.favouredSkillChoices ?? []),
    ...(calling?.favouredSkillChoices ?? []),
  ];
  const uniquePool = Array.from(new Set(skillPool));

  return (
    <section className="roll-panel">
      <div className="sheet-head">
        <h3>Create a character</h3>
        <button className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className="roll-fields">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Beran of Bree" autoFocus />
        </label>
        <label>
          Culture
          <select
            value={cultureId}
            onChange={(e) => {
              setCultureId(e.target.value);
              setSetIndex(0);
              setFeatures([]);
              setFavoured([]);
            }}
          >
            {cultures.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Calling
          <select value={callingId} onChange={(e) => setCallingId(e.target.value)}>
            <option value="">(none yet)</option>
            {callings.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {culture && attributeSet && (
        <fieldset>
          <legend>Attributes</legend>
          <div className="toolbar">
            <label>
              Set
              <select value={setIndex} onChange={(e) => setSetIndex(Number(e.target.value))}>
                {culture.attributeSets.map((s, i) => (
                  <option key={s.roll} value={i}>
                    {s.roll}: Strength {s.strength} · Heart {s.heart} · Wits {s.wits}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={rollAttributes}>🎲 Roll for it</button>
          </div>
          <p className="hint">
            Endurance {deriveEndurance(culture, attributeSet.strength)} · Hope{' '}
            {deriveHope(culture, attributeSet.heart)} · Parry {deriveParry(culture, attributeSet.wits)}
            {culture.blessingName && ` · Blessing: ${culture.blessingName}`}
          </p>
        </fieldset>
      )}

      {uniquePool.length > 0 && (
        <fieldset>
          <legend>Favoured skills</legend>
          <p className="hint">Your book underlines the choices; pick the ones you marked.</p>
          <div className="chip-choices">
            {uniquePool.map((skill) => (
              <button
                key={skill}
                className={favoured.includes(skill) ? 'chip is-active' : 'chip'}
                onClick={() => setFavoured((f) => toggle(f, skill, 3))}
              >
                {skill}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {culture && culture.distinctiveFeatures.length > 0 && (
        <fieldset>
          <legend>Distinctive features — choose two</legend>
          <div className="chip-choices">
            {culture.distinctiveFeatures.map((feature) => (
              <button
                key={feature}
                className={features.includes(feature) ? 'chip is-active' : 'chip'}
                onClick={() => setFeatures((f) => toggle(f, feature, 2))}
              >
                {feature}
              </button>
            ))}
          </div>
          {calling?.additionalFeature && (
            <p className="hint">Your calling also grants {calling.additionalFeature}.</p>
          )}
        </fieldset>
      )}

      <button className="primary big" onClick={submit} disabled={!culture || !attributeSet}>
        Create {name.trim() || 'this hero'}
      </button>
    </section>
  );
}
