// Phase 5 — combat assist (F5.1-F5.8). Same discipline as journeys and the
// Fellowship Phase: the *structure* is encoded (stances, opening volleys →
// rounds, per-hero turns over the shared step interpreter, adversary
// tracking), while numeric rules content that lives in the core rulebook —
// stance target numbers, weapon damage, Injury ratings, Protection dice —
// is entered by the player from their own book, never shipped (D16). What
// Strider Mode itself adds is verified on p.15 and encoded below: the
// Skirmish stance's dice modifiers, its escape roll, and the Gain Ground
// combat task.

import type { StepRunPosition } from './stepRunner.ts';
import type { LogEntry } from './types.ts';

/** F5.1's four core stances plus Skirmish, Strider Mode's solo addition
 * for bow-wielding lone Player-heroes (p.15). */
export type CombatStance = 'forward' | 'open' | 'defensive' | 'rearward' | 'skirmish';

export const COMBAT_STANCES: readonly CombatStance[] = [
  'forward',
  'open',
  'defensive',
  'rearward',
  'skirmish',
];

export const COMBAT_STANCE_LABEL: Record<CombatStance, string> = {
  forward: 'Forward',
  open: 'Open',
  defensive: 'Defensive',
  rearward: 'Rearward',
  skirmish: 'Skirmish (Strider Mode p.15)',
};

/** Stance → attack Target Number. The mapping itself is core-rulebook
 * content not on file, so it ships blank and the player fills it in from
 * their book (same reasoning as the journey template's blank fields, D12).
 * Null = not entered yet; the attack UI then asks for a TN directly. */
export type StanceTargetNumbers = Record<CombatStance, number | null>;

export function emptyStanceTargetNumbers(): StanceTargetNumbers {
  return { forward: null, open: null, defensive: null, rearward: null, skirmish: null };
}

export type AttackKind = 'melee' | 'ranged';

/**
 * Success-dice adjustment on the acting hero's own attack roll, by stance.
 * Verified (p.15): in Skirmish stance you may only attack with ranged
 * weapons and those rolls lose (1d) — except the escape roll, which is a
 * ranged attack roll made *without* losing the die. Other stances carry no
 * Strider-specific modifier; anything from the core book is the player's
 * to apply via the roll UI's overrides.
 */
export function attackDiceDelta(stance: CombatStance, escapeAttempt = false): number {
  if (stance === 'skirmish' && !escapeAttempt) return -1;
  return 0;
}

/**
 * Success-dice adjustment on an adversary's attack against a hero, by the
 * hero's stance. Verified (p.15): adversaries attacking a Skirmish-stance
 * hero with melee weapons lose (1d); ranged attackers suffer no penalty.
 */
export function incomingAttackDiceDelta(stance: CombatStance, attackKind: AttackKind): number {
  if (stance === 'skirmish' && attackKind === 'melee') return -1;
  return 0;
}

/** p.15, "Gain Ground — Skirmish Stance": the task is an Athletics or Scan
 * roll made as the round's main action. */
export const GAIN_GROUND_SKILLS: readonly string[] = ['Athletics', 'Scan'];

/** p.15: a successful Gain Ground roll grants (1d) on the next ranged
 * attack, plus another (1d) per Success icon rolled. The bonus dice may
 * also be spent on the escape roll. */
export function gainGroundBonusDice(sixCount: number): number {
  return 1 + sixCount;
}

export type AdversaryStatus = 'active' | 'defeated' | 'fled';

/**
 * F5.5 — a user-entered adversary. Every number comes from the player's
 * own bestiary (their book or their invention); the app ships none. There
 * is deliberately no "max Endurance"/Parry/Armour field set: the app
 * tracks what it needs for bookkeeping (current pools and status) and the
 * player consults their stat block for the rest, entering values (TNs,
 * Protection dice) at the point of use.
 */
export interface Adversary {
  id: string;
  name: string;
  endurance: number;
  hate: number;
  status: AdversaryStatus;
  /** F5.4 applies to adversaries too — a Piercing Blow against one prompts
   * its Protection roll; a failure marks it wounded. What being wounded
   * *does* to an adversary is core-rulebook content — the player acts on
   * it (e.g. via `status`) per their book. */
  wounded: boolean;
  /** Free text — stat-block numbers the player wants at hand (Parry,
   * Armour, weapon ratings…). Never interpreted by the app. */
  notes: string;
}

export function createAdversary(input: {
  name: string;
  endurance?: number;
  hate?: number;
  notes?: string;
}): Adversary {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    endurance: input.endurance ?? 0,
    hate: input.hate ?? 0,
    status: 'active',
    wounded: false,
    notes: input.notes ?? '',
  };
}

export type CombatPhaseKind = 'opening-volley' | 'round';
export type CombatStatus = 'in-progress' | 'completed';

/**
 * One combat, run as a step template (F5.8) once per hero per round —
 * the third consumer of the shared interpreter (stepRunner.ts), after
 * Journey (per waypoint leg) and FellowshipPhase (per hero, once). The
 * genuinely new targeting semantics here are the round loop: opening
 * volleys ("a number of opening volleys depending on the distance between
 * combatants", p.15) followed by close-combat rounds that repeat until the
 * player ends the fight — combat has no natural step-template end the way
 * a journey runs out of waypoints, so ending is always a player decision
 * (victory, escape, defeat… `endCombat`).
 */
export interface Combat extends StepRunPosition {
  id: string;
  name: string;
  stepTemplateId: string;
  phase: CombatPhaseKind;
  /** 1-based; meaningful while phase === 'opening-volley'. */
  volley: number;
  /** User-entered volley count (distance-dependent, p.15); 0 = straight to rounds. */
  openingVolleys: number;
  /** 1-based; meaningful while phase === 'round'. */
  round: number;
  /** Snapshot of the company at combat start, like FellowshipPhase.heroOrder. */
  heroOrder: string[];
  currentHeroIndex: number;
  /** True between rounds/volleys: the last hero's turn is done and the
   * player must choose to fight on (`beginNextRound`) or stop (`endCombat`). */
  betweenRounds: boolean;
  /** F5.1 — heroId → stance, changeable at any time from the overview. */
  stances: Record<string, CombatStance>;
  stanceTargetNumbers: StanceTargetNumbers;
  adversaries: Adversary[];
  status: CombatStatus;
  /** Free text set when the combat ends — how it ended. */
  outcome: string;
  createdAt: string;
}

export function createCombat(input: {
  name: string;
  stepTemplateId: string;
  heroIds: string[];
  adversaries?: Adversary[];
  openingVolleys?: number;
  stances?: Record<string, CombatStance>;
  stanceTargetNumbers?: StanceTargetNumbers;
}): Combat {
  const openingVolleys = Math.max(0, input.openingVolleys ?? 0);
  const stances: Record<string, CombatStance> = {};
  // 'open' is only the neutral middle of the list, not a rules claim.
  for (const id of input.heroIds) stances[id] = input.stances?.[id] ?? 'open';
  return {
    id: crypto.randomUUID(),
    name: input.name,
    stepTemplateId: input.stepTemplateId,
    phase: openingVolleys > 0 ? 'opening-volley' : 'round',
    volley: 1,
    openingVolleys,
    round: openingVolleys > 0 ? 0 : 1,
    heroOrder: input.heroIds,
    currentHeroIndex: 0,
    currentStepIndex: 0,
    lastOutcome: null,
    betweenRounds: false,
    stances,
    stanceTargetNumbers: input.stanceTargetNumbers ?? emptyStanceTargetNumbers(),
    adversaries: input.adversaries ?? [],
    status: input.heroIds.length === 0 ? 'completed' : 'in-progress',
    outcome: '',
    createdAt: new Date().toISOString(),
  };
}

export function setStance(combat: Combat, heroId: string, stance: CombatStance): Combat {
  return { ...combat, stances: { ...combat.stances, [heroId]: stance } };
}

export function setStanceTargetNumber(
  combat: Combat,
  stance: CombatStance,
  targetNumber: number | null,
): Combat {
  return {
    ...combat,
    stanceTargetNumbers: { ...combat.stanceTargetNumbers, [stance]: targetNumber },
  };
}

export function addAdversary(combat: Combat, adversary: Adversary): Combat {
  return { ...combat, adversaries: [...combat.adversaries, adversary] };
}

export function updateAdversary(combat: Combat, adversary: Adversary): Combat {
  return {
    ...combat,
    adversaries: combat.adversaries.map((a) => (a.id === adversary.id ? adversary : a)),
  };
}

export function removeAdversary(combat: Combat, adversaryId: string): Combat {
  return { ...combat, adversaries: combat.adversaries.filter((a) => a.id !== adversaryId) };
}

export interface AdversaryDeltaResult {
  combat: Combat;
  from: number;
  to: number;
}

/** F5.3/F5.5 — clamped-at-zero pool change, returning from/to so the caller
 * can log it (the same shape actions.ts uses for hero resources). Reaching 0
 * does not auto-set any status — what 0 Endurance means is the player's
 * book's call (N7: the app assists, it never blocks play). */
export function applyAdversaryDelta(
  combat: Combat,
  adversaryId: string,
  field: 'endurance' | 'hate',
  delta: number,
): AdversaryDeltaResult {
  const adversary = combat.adversaries.find((a) => a.id === adversaryId);
  if (!adversary) throw new Error(`Adversary ${adversaryId} not found in combat.`);
  const from = adversary[field];
  const to = Math.max(0, from + delta);
  return { combat: updateAdversary(combat, { ...adversary, [field]: to }), from, to };
}

/** Call when the step interpreter reports a null step for the current hero —
 * advances to the next hero, or opens the between-rounds gate after the last. */
export function completeHeroTurn(combat: Combat): Combat {
  const next = combat.currentHeroIndex + 1;
  if (next >= combat.heroOrder.length) {
    return { ...combat, betweenRounds: true };
  }
  return { ...combat, currentHeroIndex: next, currentStepIndex: 0, lastOutcome: null };
}

/** F5.2 — the round loop: remaining opening volleys first, then close-combat
 * rounds, repeating until `endCombat`. */
export function beginNextRound(combat: Combat): Combat {
  const reset = {
    ...combat,
    betweenRounds: false,
    currentHeroIndex: 0,
    currentStepIndex: 0,
    lastOutcome: null,
  };
  if (combat.phase === 'opening-volley') {
    if (combat.volley < combat.openingVolleys) {
      return { ...reset, volley: combat.volley + 1 };
    }
    return { ...reset, phase: 'round', round: 1 };
  }
  return { ...reset, round: combat.round + 1 };
}

/** Always a player decision — victory, flight (e.g. a successful Skirmish
 * escape roll, p.15), or defeat. */
export function endCombat(combat: Combat, outcome: string): Combat {
  return { ...combat, status: 'completed', outcome };
}

/** A one-line description of where the fight stands, for headers and logs. */
export function describeCombatPosition(combat: Combat): string {
  if (combat.phase === 'opening-volley') {
    return `Opening volley ${combat.volley}/${combat.openingVolleys}`;
  }
  return `Round ${combat.round}`;
}

/** A readable account of the fight, built from the log entries it produced
 * (LogEntry.journeyId) — the same "log is the spine" pattern as
 * generateJourneySummary (D7). */
export function generateCombatSummary(combat: Combat, log: LogEntry[]): string {
  const entries = log
    .filter((e) => e.journeyId === combat.id)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const lines: string[] = [];
  lines.push(`# ${combat.name || 'Combat'}`);
  lines.push('');
  lines.push(`Status: ${combat.status}${combat.outcome ? ` — ${combat.outcome}` : ''}`);
  if (combat.adversaries.length > 0) {
    lines.push(`Adversaries: ${combat.adversaries.map((a) => `${a.name} (${a.status})`).join(', ')}`);
  }
  lines.push('');

  for (const entry of entries) {
    if (entry.prose) {
      lines.push(`- ${entry.prose}`);
    } else if (entry.type === 'roll') {
      const p = entry.payload as { skillName?: string; success?: boolean };
      lines.push(`- Rolled ${p.skillName ?? 'a skill'}: ${p.success ? 'success' : 'failure'}`);
    } else if (entry.type === 'resource-change') {
      const p = entry.payload as { field?: string; from?: number; to?: number };
      lines.push(`- ${p.field}: ${p.from} → ${p.to}`);
    }
  }

  return lines.join('\n');
}
