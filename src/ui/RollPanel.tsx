import { useState } from 'react';
import {
  describeRollRequirement,
  resolveSkillRoll,
  rollFeatDie,
  rollSuccessDie,
  type FavourMode,
  type FeatDieFace,
  type RollRequirement,
  type SkillRollResult,
  type SuccessDieFace,
} from '../engine/dice.ts';
import { deriveHeroStates } from '../engine/hero.ts';
import type { DiceInputMode, Hero } from '../engine/types.ts';

type AttributeName = keyof Hero['attributes'];
import { FeatDiePicker, SuccessDiePicker } from './DicePickers.tsx';

interface Props {
  hero: Hero;
  companySize: number;
  diceInputMode: DiceInputMode;
  onResolved: (params: {
    skillName: string;
    result: SkillRollResult;
    inputMode: DiceInputMode;
  }) => void;
  /** Used by JourneyRunner to pre-fill the event's called-for skill and the
   * land-danger-derived favour (Strider Mode p.17) — still user-overridable (N7). */
  initialSkillName?: string;
  initialFavourMode?: FavourMode;
}

type Phase =
  | { kind: 'setup' }
  | { kind: 'collecting'; requirement: RollRequirement; featDice: FeatDieFace[]; successDice: SuccessDieFace[] }
  | { kind: 'resolved'; result: SkillRollResult; skillName: string };

export function RollPanel({
  hero,
  companySize,
  diceInputMode,
  onResolved,
  initialSkillName,
  initialFavourMode,
}: Props) {
  const [skillName, setSkillName] = useState<string>(
    initialSkillName && initialSkillName in hero.skills
      ? initialSkillName
      : (Object.keys(hero.skills)[0] ?? ''),
  );
  const [attribute, setAttribute] = useState<AttributeName>('heart');
  const [favourMode, setFavourMode] = useState<FavourMode>(initialFavourMode ?? 'normal');
  const [hopeSpent, setHopeSpent] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });

  const { weary } = deriveHeroStates(hero);
  const skillRank = hero.skills[skillName] ?? 0;
  const attributeValue = hero.attributes[attribute];

  function beginRoll() {
    const requirement = describeRollRequirement({
      skillRank,
      attributeValue,
      companySize,
      favourMode,
      weary,
    });

    if (diceInputMode === 'app-rolls') {
      const featDice = Array.from({ length: requirement.featDiceCount }, rollFeatDie);
      const successDice = Array.from({ length: requirement.successDiceCount }, rollSuccessDie);
      finish(requirement, featDice, successDice);
      return;
    }

    // hybrid: engine pre-rolls the Success pool, player only taps the Feat die.
    const successDice =
      diceInputMode === 'hybrid'
        ? Array.from({ length: requirement.successDiceCount }, rollSuccessDie)
        : [];
    setPhase({ kind: 'collecting', requirement, featDice: [], successDice });
  }

  function finish(requirement: RollRequirement, featDice: FeatDieFace[], successDice: SuccessDieFace[]) {
    const result = resolveSkillRoll({
      featDice,
      favourMode,
      successDice,
      targetNumber: requirement.targetNumber,
      weary,
      hopeSpent,
      attributeValue,
    });
    setPhase({ kind: 'resolved', result, skillName });
    onResolved({ skillName, result, inputMode: diceInputMode });
  }

  function addFeatDie(face: FeatDieFace) {
    if (phase.kind !== 'collecting') return;
    const featDice = [...phase.featDice, face];
    if (featDice.length >= phase.requirement.featDiceCount) {
      if (diceInputMode === 'hybrid') {
        finish(phase.requirement, featDice, phase.successDice);
      } else if (phase.requirement.successDiceCount === 0) {
        finish(phase.requirement, featDice, []);
      } else {
        setPhase({ ...phase, featDice });
      }
    } else {
      setPhase({ ...phase, featDice });
    }
  }

  function addSuccessDie(face: SuccessDieFace) {
    if (phase.kind !== 'collecting') return;
    const successDice = [...phase.successDice, face];
    if (successDice.length >= phase.requirement.successDiceCount) {
      finish(phase.requirement, phase.featDice, successDice);
    } else {
      setPhase({ ...phase, successDice });
    }
  }

  function reset() {
    setPhase({ kind: 'setup' });
  }

  return (
    <section className="roll-panel">
      <h3>Roll for {hero.name}</h3>

      {phase.kind === 'setup' && (
        <>
          <label>
            Skill
            <select value={skillName} onChange={(e) => setSkillName(e.target.value)}>
              {Object.keys(hero.skills).map((s) => (
                <option key={s} value={s}>
                  {s} (rank {hero.skills[s]})
                </option>
              ))}
            </select>
          </label>
          <label>
            Attribute
            <select value={attribute} onChange={(e) => setAttribute(e.target.value as AttributeName)}>
              <option value="strength">Strength</option>
              <option value="heart">Heart</option>
              <option value="wits">Wits</option>
            </select>
          </label>
          <label>
            Favour
            <select value={favourMode} onChange={(e) => setFavourMode(e.target.value as FavourMode)}>
              <option value="normal">Normal</option>
              <option value="favoured">Favoured</option>
              <option value="ill-favoured">Ill-favoured</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={hopeSpent} onChange={(e) => setHopeSpent(e.target.checked)} />
            Spend Hope (+{attributeValue})
          </label>
          {weary && <p role="status">Weary — Success dice showing 1–3 will count as zero.</p>}
          <button onClick={beginRoll}>Roll</button>
        </>
      )}

      {phase.kind === 'collecting' && (
        <>
          {/* F1.11 — the requirement, stated unambiguously before input. */}
          <p>
            Roll {phase.requirement.featDiceCount} Feat die
            {phase.requirement.featDiceCount > 1 ? 'e' : ''} and{' '}
            {diceInputMode === 'hybrid' ? 0 : phase.requirement.successDiceCount} Success{' '}
            {diceInputMode === 'hybrid' ? '(handled automatically)' : 'die'}. Target Number{' '}
            {phase.requirement.targetNumber}.
            {phase.requirement.favourMode !== 'normal' && ` (${phase.requirement.favourMode})`}
          </p>
          {phase.featDice.length < phase.requirement.featDiceCount && (
            <FeatDiePicker label={`Feat die ${phase.featDice.length + 1}`} onSelect={addFeatDie} />
          )}
          {diceInputMode === 'player-rolls' &&
            phase.featDice.length >= phase.requirement.featDiceCount &&
            phase.successDice.length < phase.requirement.successDiceCount && (
              <SuccessDiePicker index={phase.successDice.length} onSelect={addSuccessDie} />
            )}
        </>
      )}

      {phase.kind === 'resolved' && (
        <div>
          <p>
            <strong>{phase.result.success ? 'Success' : 'Failure'}</strong>
            {phase.result.success && phase.result.degreeOfSuccess !== 'success' &&
              ` (${phase.result.degreeOfSuccess})`}
            {' — total '}
            {phase.result.total} vs TN {phase.result.targetNumber}
          </p>
          {phase.result.rune && <p>Gandalf rune — automatic success.</p>}
          {phase.result.eye && <p>Eye of Sauron — flagged for narrative consequence.</p>}
          <button onClick={reset}>Roll again</button>
        </div>
      )}
    </section>
  );
}
