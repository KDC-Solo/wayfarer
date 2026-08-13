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
import { DiceQualityControl, DiceTray, useDice3d } from './DiceTray.tsx';

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
  /** Combat (F5.8): roll on a different rank pool than hero.skills — e.g.
   * combat proficiencies for an attack. Defaults to hero.skills. */
  skillOptions?: Record<string, number>;
  /** Label for the rank-pool select — "Proficiency" in combat. */
  skillLabel?: string;
  /** Pre-fills the Target Number override — e.g. a stance TN (F5.1). The
   * player can still edit or clear it (F5.7/N7). */
  initialTargetNumber?: number;
  /** Success-dice adjustment from circumstances — e.g. Skirmish stance's
   * lost (1d) on ranged attacks (Strider Mode p.15). */
  successDiceDelta?: number;
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
  skillOptions,
  skillLabel,
  initialTargetNumber,
  successDiceDelta,
}: Props) {
  const rankPool = skillOptions ?? hero.skills;
  const [skillName, setSkillName] = useState<string>(
    initialSkillName && initialSkillName in rankPool
      ? initialSkillName
      : (Object.keys(rankPool)[0] ?? ''),
  );
  const [attribute, setAttribute] = useState<AttributeName>('heart');
  const [favourMode, setFavourMode] = useState<FavourMode>(initialFavourMode ?? 'normal');
  const [hopeSpent, setHopeSpent] = useState(false);
  /** N7/F5.7 — every computed value is overridable; blank = computed TN. */
  const [tnOverride, setTnOverride] = useState<string>(
    initialTargetNumber !== undefined ? String(initialTargetNumber) : '',
  );
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });
  // Phase 7 — optional polish; every path below still works with it off.
  const dice3d = useDice3d();

  const { weary } = deriveHeroStates(hero);
  const skillRank = rankPool[skillName] ?? 0;
  const attributeValue = hero.attributes[attribute];

  function beginRoll() {
    const tn = tnOverride.trim() === '' ? undefined : Number(tnOverride);
    const requirement = describeRollRequirement({
      skillRank,
      attributeValue,
      companySize,
      favourMode,
      weary,
      successDiceDelta,
      targetNumberOverride: tn !== undefined && Number.isFinite(tn) ? tn : undefined,
    });

    if (diceInputMode === 'app-rolls') {
      // F7.1 — when 3D is on, the faces come from the simulation; a null
      // result (off, still loading, failed, or skipped) falls back to the
      // numeric roll, so this path never depends on the module (F7.2).
      void dice3d.roll(requirement.featDiceCount, requirement.successDiceCount).then((simulated) => {
        const featDice =
          simulated?.featDice ?? Array.from({ length: requirement.featDiceCount }, rollFeatDie);
        const successDice =
          simulated?.successDice ?? Array.from({ length: requirement.successDiceCount }, rollSuccessDie);
        finish(requirement, featDice, successDice);
      });
      return;
    }

    // hybrid: engine pre-rolls the Success pool, player only taps the Feat
    // die. F7.7 — nothing is thrown in 3D here; the Feat die the player
    // taps is theirs, and the Success pool resolves numerically.
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

      {/* Mounted for the panel's whole life, not just the setup phase: the
          simulation initialises against this container once and keeps
          rendering into it while the dice tumble (the phase flips to
          'resolved' as soon as faces are read). Collapsed to zero height
          when idle, so an off/absent 3D module costs no layout. */}
      <DiceTray rolling={dice3d.rolling} onSkip={dice3d.skip} />

      {phase.kind === 'setup' && (
        <>
          <label>
            {skillLabel ?? 'Skill'}
            <select value={skillName} onChange={(e) => setSkillName(e.target.value)}>
              {Object.keys(rankPool).map((s) => (
                <option key={s} value={s}>
                  {s} (rank {rankPool[s]})
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
          <label>
            Target number (blank = computed)
            <input
              type="number"
              value={tnOverride}
              onChange={(e) => setTnOverride(e.target.value)}
            />
          </label>
          {(successDiceDelta ?? 0) !== 0 && (
            <p role="status">
              {(successDiceDelta ?? 0) > 0 ? '+' : ''}
              {successDiceDelta} Success {Math.abs(successDiceDelta ?? 0) === 1 ? 'die' : 'dice'} from
              circumstances.
            </p>
          )}
          {weary && <p role="status">Weary — Success dice showing 1–3 will count as zero.</p>}
          {diceInputMode === 'app-rolls' && (
            <DiceQualityControl quality={dice3d.quality} onChange={dice3d.changeQuality} />
          )}
          <button className="primary big" onClick={beginRoll} disabled={dice3d.rolling}>
            🎲 Roll
          </button>
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
