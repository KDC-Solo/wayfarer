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
import { faceArt, featFaceKey, successFaceKey, type DicePack } from '../engine/dicePack.ts';

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
  /** F7.4 — the player's own face art for the tap-selection dice. Purely
   * decorative; null (the default) draws plain numerals. */
  dicePack?: DicePack | null;
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
  dicePack = null,
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
    void dice3d.clear(); // sweep the last throw off the table first
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
    <section className="roll-panel roll-panel-main">
      <h3>Roll for {hero.name}</h3>

      {/* Mounted for the panel's whole life, not just the setup phase: the
          simulation initialises against this container once and keeps
          rendering into it while the dice tumble (the phase flips to
          'resolved' as soon as faces are read). Collapsed to zero height
          when idle, so an off/absent 3D module costs no layout. */}
      <DiceTray enabled={dice3d.quality !== 'off'} rolling={dice3d.rolling} onSkip={dice3d.skip} />

      {phase.kind === 'setup' && (
        <>
          {/* The three the player actually changes per roll, on one row.
              Everything else is an override and lives under Options — a
              roll happens dozens of times a session and shouldn't mean
              scrolling past five full-width selects to reach the button. */}
          <div className="roll-fields">
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
                <option value="strength">Strength {hero.attributes.strength}</option>
                <option value="heart">Heart {hero.attributes.heart}</option>
                <option value="wits">Wits {hero.attributes.wits}</option>
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
          </div>

          <label className="hope-toggle">
            <input type="checkbox" checked={hopeSpent} onChange={(e) => setHopeSpent(e.target.checked)} />
            Spend Hope (+{attributeValue})
          </label>

          {weary && <p role="status">Weary — Success dice showing 1–3 will count as zero.</p>}
          {(successDiceDelta ?? 0) !== 0 && (
            <p role="status">
              {(successDiceDelta ?? 0) > 0 ? '+' : ''}
              {successDiceDelta} Success {Math.abs(successDiceDelta ?? 0) === 1 ? 'die' : 'dice'} from
              circumstances.
            </p>
          )}

          <button className="primary big roll-cta" onClick={beginRoll} disabled={dice3d.rolling}>
            🎲 Roll
          </button>

          {/* A newcomer meets Feat die, Favour, TN and "sixes" with no
              way to find out what any of them mean. This is the cheapest
              possible answer: plain English, folded away once known. */}
          <details className="roll-options">
            <summary>What do these mean?</summary>
            <dl className="glossary">
              <dt>Skill</dt>
              <dd>What your hero is attempting. Its rank is how many six-sided dice you roll.</dd>
              <dt>Attribute</dt>
              <dd>Strength, Heart or Wits — whichever suits the attempt. It sets the number you need to beat.</dd>
              <dt>Favour</dt>
              <dd>
                Favoured rolls two Feat dice and keeps the better; Ill-favoured keeps the worse. Normal
                rolls one.
              </dd>
              <dt>Feat die</dt>
              <dd>
                The twelve-sided die. Two faces are special: the rune is an automatic success, the Eye is
                the worst result there is.
              </dd>
              <dt>Target Number</dt>
              <dd>What your total must reach to succeed. Leave the override blank and it's worked out for you.</dd>
              <dt>Sixes</dt>
              <dd>Each six is a stronger success — two make it a great success, three extraordinary.</dd>
            </dl>
          </details>

          <details className="roll-options">
            <summary>Options</summary>
            <label>
              Target number (blank = computed)
              <input type="number" value={tnOverride} onChange={(e) => setTnOverride(e.target.value)} />
            </label>
            {diceInputMode === 'app-rolls' && (
              <DiceQualityControl quality={dice3d.quality} onChange={dice3d.changeQuality} />
            )}
          </details>
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
            <FeatDiePicker
              label={`Feat die ${phase.featDice.length + 1}`}
              onSelect={addFeatDie}
              dicePack={dicePack}
            />
          )}
          {diceInputMode === 'player-rolls' &&
            phase.featDice.length >= phase.requirement.featDiceCount &&
            phase.successDice.length < phase.requirement.successDiceCount && (
              <SuccessDiePicker
                index={phase.successDice.length}
                onSelect={addSuccessDie}
                dicePack={dicePack}
              />
            )}
        </>
      )}

      {phase.kind === 'resolved' && (
        <RollResult result={phase.result} skillName={phase.skillName} dicePack={dicePack} onReset={reset} />
      )}
    </section>
  );
}

const DEGREE_LABEL: Record<string, string> = {
  success: 'Success',
  great: 'Great success',
  extraordinary: 'Extraordinary success',
};

/**
 * The result of a roll is the thing a player sees more than any other
 * screen in the app, so it gets the weight: the dice that produced it,
 * the verdict, and the arithmetic — in that order of prominence. The old
 * version was one sentence of prose, which made the app's central moment
 * feel like a status bar.
 */
function RollResult({
  result,
  skillName,
  dicePack,
  onReset,
}: {
  result: SkillRollResult;
  skillName: string;
  dicePack: DicePack | null;
  onReset: () => void;
}) {
  const verdict = result.success ? DEGREE_LABEL[result.degreeOfSuccess] ?? 'Success' : 'Failure';
  const featLabel =
    result.featDieUsed === 'eye' ? 'Eye' : result.featDieUsed === 'rune' ? 'Rune' : String(result.featDieUsed);
  const featArt = faceArt(dicePack, featFaceKey(result.featDieUsed));

  return (
    <div className={`roll-result ${result.success ? 'is-success' : 'is-failure'}`} role="status">
      <div className="roll-dice">
        <span className={`die-chip feat${result.rune ? ' rune' : ''}${result.eye ? ' eye' : ''}`}>
          {featArt && <img src={featArt} alt="" aria-hidden="true" />}
          <span>{featLabel}</span>
        </span>
        {result.successDiceRolled.map((face, i) => {
          const art = faceArt(dicePack, successFaceKey(face));
          // Weary turns 1-3 into zeros (F1.15) — show which dice were lost.
          const negated = result.effectiveSuccessValues[i] === 0;
          return (
            <span key={i} className={`die-chip success${negated ? ' negated' : ''}${face === 6 ? ' six' : ''}`}>
              {art && <img src={art} alt="" aria-hidden="true" />}
              <span>{face}</span>
            </span>
          );
        })}
      </div>

      <p className="roll-verdict">{verdict}</p>
      <p className="roll-math">
        {skillName} · total {result.total} vs TN {result.targetNumber}
        {result.sixCount > 0 && ` · ${result.sixCount} ${result.sixCount === 1 ? 'six' : 'sixes'}`}
      </p>

      {result.rune && <p className="roll-flag good">Gandalf rune — automatic success.</p>}
      {result.eye && <p className="roll-flag bad">Eye of Sauron — a consequence for the story.</p>}

      <button className="primary" onClick={onReset} autoFocus>
        Roll again
      </button>
    </div>
  );
}
