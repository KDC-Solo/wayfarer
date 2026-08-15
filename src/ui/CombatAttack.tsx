import { useState } from 'react';
import { changeResource, recordCombatEvent, recordSkillRoll, recordWoundChange } from '../engine/actions.ts';
import {
  applyAdversaryDelta,
  attackDiceDelta,
  endCombat,
  incomingAttackDiceDelta,
  updateAdversary,
  type Adversary,
  type AttackKind,
  type Combat,
} from '../engine/combat.ts';
import {
  resolveSkillRoll,
  rollFeatDie,
  rollSuccessDie,
  type FavourMode,
  type SkillRollResult,
} from '../engine/dice.ts';
import { completeStep } from '../engine/stepRunner.ts';
import { injuryOptions, totalProtection, type Weapon } from '../engine/gear.ts';
import type { Chronicle, Hero, LogEntry } from '../engine/types.ts';
import { RollPanel } from './RollPanel.tsx';

export interface CombatApplyParams {
  chronicle: Chronicle;
  combat: Combat;
  logEntries: LogEntry[];
}

/** One-shot check rolled entirely by the app — used for Protection rolls
 * and adversary attacks, where the "skill rank" is a number read off a stat
 * block rather than a hero sheet. Like generic table rolls (TableRoller),
 * these always auto-roll instead of honouring the chronicle's dice input
 * mode — the same deliberate scope cut, not a spec requirement. */
function autoRollCheck(diceCount: number, targetNumber: number, favourMode: FavourMode): SkillRollResult {
  const featDice = favourMode === 'normal' ? [rollFeatDie()] : [rollFeatDie(), rollFeatDie()];
  const successDice = Array.from({ length: Math.max(0, diceCount) }, rollSuccessDie);
  return resolveSkillRoll({ featDice, favourMode, successDice, targetNumber });
}

/**
 * F5.4 — the Protection roll prompted by a Piercing Blow, for a hero or an
 * adversary. Dice count (Armour) and TN (the weapon's Injury rating) are
 * read from the player's own book/stat block. A failure means Wounded.
 */
function ProtectionRollForm({
  targetName,
  defaultDice = 0,
  defaultTn = 0,
  onResolved,
}: {
  targetName: string;
  /** Filled from the wearer's armour and the attacking weapon's Injury
   * rating when those are known, so the player confirms rather than
   * looks them up mid-fight. */
  defaultDice?: number;
  defaultTn?: number;
  onResolved: (result: SkillRollResult) => void;
}) {
  const [dice, setDice] = useState(defaultDice);
  const [tn, setTn] = useState(defaultTn);

  return (
    <fieldset>
      <legend>Piercing Blow — Protection roll for {targetName}</legend>
      <label>
        Protection dice (Armour rating)
        <input type="number" min={0} value={dice} onChange={(e) => setDice(Number(e.target.value))} />
      </label>
      <label>
        Target number (weapon's Injury rating)
        <input type="number" value={tn} onChange={(e) => setTn(Number(e.target.value))} />
      </label>
      <button className="primary" onClick={() => onResolved(autoRollCheck(dice, tn, 'normal'))}>
        Roll Protection
      </button>
    </fieldset>
  );
}

type AttackStage =
  | { kind: 'rolling' }
  | { kind: 'aftermath'; result: SkillRollResult; skillName: string; rollEntry: LogEntry }
  | { kind: 'protection'; heldEntries: LogEntry[]; combat: Combat };

/**
 * F5.3/F5.4 — the attack step: proficiency roll (input modes respected via
 * RollPanel), damage to adversary Endurance, Piercing Blow detection, and
 * the follow-up Protection roll. The Piercing trigger itself (which Feat
 * die results qualify) is core-rulebook/weapon content, so the player
 * enters an optional threshold to pre-check the box and always has the
 * final say (F5.7). Also carries the verified Skirmish rules (p.15):
 * ranged-only attacks at −1d, and the escape roll made without that
 * penalty — success leaves the battlefield instead of dealing damage.
 */
export function AttackStepUI({
  chronicle,
  combat,
  hero,
  onApply,
}: {
  chronicle: Chronicle;
  combat: Combat;
  hero: Hero;
  onApply: (params: CombatApplyParams) => void;
}) {
  const stance = combat.stances[hero.id] ?? 'open';
  const activeAdversaries = combat.adversaries.filter((a) => a.status === 'active');
  const [targetId, setTargetId] = useState(activeAdversaries[0]?.id ?? '');
  const [escapeAttempt, setEscapeAttempt] = useState(false);
  const [bonusDice, setBonusDice] = useState(0);
  const [pierceThreshold, setPierceThreshold] = useState('');
  const [damage, setDamage] = useState(0);
  const [piercing, setPiercing] = useState(false);
  const [stage, setStage] = useState<AttackStage>({ kind: 'rolling' });
  const heroWeapons = hero.weapons ?? [];
  const [weaponId, setWeaponId] = useState(heroWeapons[0]?.id ?? '');
  const weapon: Weapon | undefined = heroWeapons.find((w) => w.id === weaponId);

  const target = combat.adversaries.find((a) => a.id === targetId);
  const proficiencies = Object.keys(hero.combatProficiencies).length > 0 ? hero.combatProficiencies : null;
  const diceDelta = attackDiceDelta(stance, escapeAttempt) + bonusDice;
  const stanceTn = combat.stanceTargetNumbers[stance];

  function skip() {
    onApply({ chronicle, combat: completeStep(combat), logEntries: [] });
  }

  if (stage.kind === 'rolling') {
    return (
      <div>
        <h4>Attack{escapeAttempt ? ' — escape roll' : ''}</h4>
        <label>
          Target
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {activeAdversaries.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (Endurance {a.endurance})
              </option>
            ))}
          </select>
        </label>
        {stance === 'skirmish' && (
          <>
            <p role="status">Skirmish stance: ranged attacks only, at −1 Success die (Strider Mode p.15).</p>
            <label>
              <input
                type="checkbox"
                checked={escapeAttempt}
                onChange={(e) => setEscapeAttempt(e.target.checked)}
              />
              Escape roll — no die lost; success leaves the battlefield instead of dealing damage
            </label>
          </>
        )}
        {heroWeapons.length > 0 && (
          <label>
            Weapon
            <select
              value={weaponId}
              onChange={(e) => {
                setWeaponId(e.target.value);
                const picked = heroWeapons.find((w) => w.id === e.target.value);
                if (picked) {
                  setDamage(picked.damage);
                  const injuries = injuryOptions(picked);
                  if (injuries.length > 0) setPierceThreshold(injuries[0]);
                }
              }}
            >
              {heroWeapons.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — damage {w.damage}, Injury {w.injury}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Bonus Success dice (e.g. from Gain Ground)
          <input
            type="number"
            min={0}
            value={bonusDice}
            onChange={(e) => setBonusDice(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <label>
          Piercing Blow on Feat die of at least (your weapon's Injury rating; blank = decide yourself)
          <input
            type="number"
            value={pierceThreshold}
            onChange={(e) => setPierceThreshold(e.target.value)}
          />
        </label>
        {activeAdversaries.length === 0 && (
          <p role="status">No active adversaries — add one in the overview, or skip this step.</p>
        )}
        <RollPanel
          hero={hero}
          companySize={chronicle.company.length}
          diceInputMode={chronicle.diceInputMode}
          skillOptions={proficiencies ?? undefined}
          skillLabel={proficiencies ? 'Proficiency' : 'Skill'}
          initialSkillName={weapon?.proficiency}
          initialTargetNumber={stanceTn ?? undefined}
          successDiceDelta={diceDelta}
          onResolved={({ skillName, result, inputMode }) => {
            const rollEntry = recordSkillRoll(hero.id, skillName, result, inputMode, combat.id);
            const threshold = Number(pierceThreshold);
            setPiercing(
              pierceThreshold.trim() !== '' &&
                Number.isFinite(threshold) &&
                typeof result.featDieUsed === 'number' &&
                result.featDieUsed >= threshold,
            );
            setStage({ kind: 'aftermath', result, skillName, rollEntry });
          }}
        />
        <button className="ghost" onClick={skip}>
          Skip attack
        </button>
      </div>
    );
  }

  if (stage.kind === 'aftermath') {
    const { result, rollEntry } = stage;

    if (escapeAttempt && result.success) {
      return (
        <div>
          <p>The escape roll succeeds — {hero.name} can leave the battlefield without dealing damage.</p>
          <button
            className="primary"
            onClick={() => {
              const escaped = recordCombatEvent(combat.id, hero.id, `${hero.name} escaped the combat.`);
              onApply({
                chronicle,
                combat: endCombat(combat, `${hero.name} escaped (Skirmish escape roll).`),
                logEntries: [rollEntry, escaped],
              });
            }}
          >
            Escaped — end combat
          </button>{' '}
          <button
            onClick={() =>
              onApply({ chronicle, combat: completeStep(combat, 'success'), logEntries: [rollEntry] })
            }
          >
            Stay in the fight
          </button>
        </div>
      );
    }

    if (!result.success) {
      return (
        <div>
          <p>The attack misses.</p>
          <button
            className="primary"
            onClick={() =>
              onApply({ chronicle, combat: completeStep(combat, 'failure'), logEntries: [rollEntry] })
            }
          >
            Continue
          </button>
        </div>
      );
    }

    return (
      <div>
        <p>
          Hit{target ? ` on ${target.name}` : ''}! Feat die: {String(result.featDieUsed)}.
        </p>
        <label>
          Damage{weapon ? ` (${weapon.name})` : " (from your weapon's stats)"}
          <input type="number" min={0} value={damage} onChange={(e) => setDamage(Number(e.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={piercing} onChange={(e) => setPiercing(e.target.checked)} />
          Piercing Blow
        </label>
        <button
          className="primary"
          onClick={() => {
            const entries: LogEntry[] = [rollEntry];
            let nextCombat = combat;
            if (target && damage > 0) {
              const { combat: updated, from, to } = applyAdversaryDelta(combat, target.id, 'endurance', -damage);
              nextCombat = updated;
              entries.push(
                recordCombatEvent(combat.id, hero.id, `${hero.name} deals ${damage} damage to ${target.name}.`, {
                  adversaryId: target.id,
                  field: 'endurance',
                  from,
                  to,
                }),
              );
            }
            if (piercing && target) {
              entries.push(
                recordCombatEvent(combat.id, hero.id, `Piercing Blow against ${target.name}!`, {
                  adversaryId: target.id,
                }),
              );
              setStage({ kind: 'protection', heldEntries: entries, combat: nextCombat });
            } else {
              onApply({ chronicle, combat: completeStep(nextCombat, 'success'), logEntries: entries });
            }
          }}
        >
          Apply
        </button>
      </div>
    );
  }

  // stage.kind === 'protection' — the target adversary's Protection roll.
  const heldTarget = stage.combat.adversaries.find((a) => a.id === targetId);
  return (
    <ProtectionRollForm
      targetName={heldTarget?.name ?? 'the adversary'}
      defaultDice={heldTarget?.armourRating ?? 0}
      defaultTn={Number(injuryOptions(weapon ?? ({ injury: '' } as Weapon))[0] ?? 0)}
      onResolved={(result) => {
        const entries = [...stage.heldEntries];
        let nextCombat = stage.combat;
        if (result.success) {
          entries.push(
            recordCombatEvent(combat.id, hero.id, `${heldTarget?.name ?? 'The adversary'} resists the Piercing Blow (Protection ${result.total} vs TN ${result.targetNumber}).`),
          );
        } else if (heldTarget) {
          nextCombat = updateAdversary(nextCombat, { ...heldTarget, wounded: true });
          entries.push(
            recordCombatEvent(combat.id, hero.id, `${heldTarget.name} is Wounded (Protection ${result.total} vs TN ${result.targetNumber}).`, {
              adversaryId: heldTarget.id,
              woundChange: 'wounded',
            }),
          );
        }
        onApply({ chronicle, combat: completeStep(nextCombat, 'success'), logEntries: entries });
      }}
    />
  );
}

type IncomingStage =
  | { kind: 'setup' }
  | { kind: 'hit'; result: SkillRollResult; rollEntry: LogEntry }
  | { kind: 'protection'; heldEntries: LogEntry[]; chronicle: Chronicle };

/**
 * F5.2/F5.3/F5.4 for the other direction — an adversary attacking a hero.
 * Always available during combat (not a template step): the solo player
 * runs both sides (p.15, "Adversary Actions"), so this stays a tool they
 * reach for whenever an adversary acts. Applies the verified Skirmish
 * incoming-melee −1d (p.15) and the stance TN if entered; damage goes to
 * the hero's Endurance and a failed Protection roll marks them Wounded.
 */
export function AdversaryAttackPanel({
  chronicle,
  combat,
  defaultHeroId,
  onApply,
}: {
  chronicle: Chronicle;
  combat: Combat;
  defaultHeroId: string | null;
  onApply: (params: CombatApplyParams) => void;
}) {
  const activeAdversaries = combat.adversaries.filter((a) => a.status === 'active');
  const [adversaryId, setAdversaryId] = useState(activeAdversaries[0]?.id ?? '');
  const [heroId, setHeroId] = useState(defaultHeroId ?? chronicle.company[0]?.id ?? '');
  const [attackKind, setAttackKind] = useState<AttackKind>('melee');
  const [dice, setDice] = useState(0);
  const [tn, setTn] = useState('');
  const [favourMode, setFavourMode] = useState<FavourMode>('normal');
  const [damage, setDamage] = useState(0);
  const [piercing, setPiercing] = useState(false);
  const [pierceThreshold, setPierceThreshold] = useState('');
  const [stage, setStage] = useState<IncomingStage>({ kind: 'setup' });

  const adversary: Adversary | undefined = combat.adversaries.find((a) => a.id === adversaryId);
  const hero = chronicle.company.find((h) => h.id === heroId);
  const stance = hero ? (combat.stances[hero.id] ?? 'open') : 'open';
  const delta = incomingAttackDiceDelta(stance, attackKind);
  const stanceTn = combat.stanceTargetNumbers[stance];
  const effectiveTn = tn.trim() === '' ? (stanceTn ?? 0) : Number(tn);

  function reset() {
    setStage({ kind: 'setup' });
    setDamage(0);
    setPiercing(false);
  }

  if (!adversary || !hero) {
    return null;
  }

  if (stage.kind === 'setup') {
    return (
      <fieldset>
        <legend>Adversary attack</legend>
        <label>
          Adversary
          <select value={adversaryId} onChange={(e) => setAdversaryId(e.target.value)}>
            {activeAdversaries.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target hero
          <select value={heroId} onChange={(e) => setHeroId(e.target.value)}>
            {chronicle.company.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Weapon
          <select value={attackKind} onChange={(e) => setAttackKind(e.target.value as AttackKind)}>
            <option value="melee">Melee</option>
            <option value="ranged">Ranged</option>
          </select>
        </label>
        {delta !== 0 && (
          <p role="status">
            {hero.name} fights in Skirmish stance — melee attackers lose 1 Success die (p.15).
          </p>
        )}
        <label>
          Attack dice (from the stat block)
          <input type="number" min={0} value={dice} onChange={(e) => setDice(Number(e.target.value))} />
        </label>
        <label>
          Target number{stanceTn != null ? ` (blank = stance TN ${stanceTn})` : ''}
          <input type="number" value={tn} onChange={(e) => setTn(e.target.value)} />
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
          Piercing Blow on Feat die of at least (blank = decide yourself)
          <input
            type="number"
            value={pierceThreshold}
            onChange={(e) => setPierceThreshold(e.target.value)}
          />
        </label>
        <button
          className="primary"
          onClick={() => {
            const result = autoRollCheck(Math.max(0, dice + delta), effectiveTn, favourMode);
            const rollEntry = recordCombatEvent(
              combat.id,
              hero.id,
              `${adversary.name} attacks ${hero.name}: ${result.success ? 'hit' : 'miss'} (${result.total} vs TN ${result.targetNumber}).`,
              { adversaryId: adversary.id, roll: { ...result } },
            );
            const threshold = Number(pierceThreshold);
            setPiercing(
              result.success &&
                pierceThreshold.trim() !== '' &&
                Number.isFinite(threshold) &&
                typeof result.featDieUsed === 'number' &&
                result.featDieUsed >= threshold,
            );
            setStage({ kind: 'hit', result, rollEntry });
          }}
        >
          Roll adversary attack
        </button>
      </fieldset>
    );
  }

  if (stage.kind === 'hit') {
    const { result, rollEntry } = stage;
    if (!result.success) {
      return (
        <fieldset>
          <legend>Adversary attack</legend>
          <p>
            {adversary.name} misses {hero.name} ({result.total} vs TN {result.targetNumber}).
          </p>
          <button
            className="primary"
            onClick={() => {
              onApply({ chronicle, combat, logEntries: [rollEntry] });
              reset();
            }}
          >
            Continue
          </button>
        </fieldset>
      );
    }
    return (
      <fieldset>
        <legend>Adversary attack</legend>
        <p>
          {adversary.name} hits {hero.name} ({result.total} vs TN {result.targetNumber}; Feat die{' '}
          {String(result.featDieUsed)}).
        </p>
        <label>
          Damage (from the stat block)
          <input type="number" min={0} value={damage} onChange={(e) => setDamage(Number(e.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={piercing} onChange={(e) => setPiercing(e.target.checked)} />
          Piercing Blow
        </label>
        <button
          className="primary"
          onClick={() => {
            const entries: LogEntry[] = [rollEntry];
            let nextChronicle = chronicle;
            if (damage > 0) {
              const { chronicle: updated, logEntry } = changeResource(
                chronicle,
                hero.id,
                'endurance',
                -damage,
                chronicle.diceInputMode,
                combat.id,
              );
              nextChronicle = updated;
              entries.push(logEntry);
            }
            if (piercing) {
              setStage({ kind: 'protection', heldEntries: entries, chronicle: nextChronicle });
            } else {
              onApply({ chronicle: nextChronicle, combat, logEntries: entries });
              reset();
            }
          }}
        >
          Apply
        </button>
      </fieldset>
    );
  }

  // stage.kind === 'protection' — the hero's Protection roll.
  return (
    <ProtectionRollForm
      targetName={hero.name}
      defaultDice={totalProtection(hero.armour ?? [])}
      onResolved={(result) => {
        const entries = [...stage.heldEntries];
        let nextChronicle = stage.chronicle;
        if (result.success) {
          entries.push(
            recordCombatEvent(combat.id, hero.id, `${hero.name} resists the Piercing Blow (Protection ${result.total} vs TN ${result.targetNumber}).`),
          );
        } else {
          const { chronicle: updated, logEntry } = recordWoundChange(nextChronicle, hero.id, 'wounded', combat.id);
          nextChronicle = updated;
          entries.push(logEntry);
        }
        onApply({ chronicle: nextChronicle, combat, logEntries: entries });
        reset();
      }}
    />
  );
}
