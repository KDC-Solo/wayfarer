// Orchestration that ties dice/resource/company logic to the log (F1.16 —
// every roll and every resource change writes a log entry). Pure: callers
// (App.tsx) are responsible for persisting the returned chronicle and entry.

import { replaceHero } from './company.ts';
import { applyExperienceSpend, awardMilestone, type ExperienceCurrency, type ExperienceMilestone, type ExperienceTarget } from './experience.ts';
import { applyWound, recoverFromWound, treatWound } from './hero.ts';
import { createLogEntry } from './log.ts';
import { applyResourceDelta, setResourceValue, type ResourceField } from './resources.ts';
import type { SkillRollResult } from './dice.ts';
import type { LoreRollResult } from './loreTable.ts';
import type { TellingTableResult } from './tellingTable.ts';
import type { OracleTableRow } from './oracleTable.ts';
import type { Chronicle, DiceInputMode, LogEntry } from './types.ts';

export interface ActionResult {
  chronicle: Chronicle;
  logEntry: LogEntry;
}

function requireHero(chronicle: Chronicle, heroId: string) {
  const hero = chronicle.company.find((h) => h.id === heroId);
  if (!hero) throw new Error(`Hero ${heroId} not found in company.`);
  return hero;
}

export function changeResource(
  chronicle: Chronicle,
  heroId: string,
  field: ResourceField,
  delta: number,
  inputMode: DiceInputMode,
  journeyId?: string,
): ActionResult {
  const hero = requireHero(chronicle, heroId);
  const from = hero.resources[field];
  const updatedHero = applyResourceDelta(hero, field, delta);
  const to = updatedHero.resources[field];
  const logEntry = createLogEntry({
    type: 'resource-change',
    heroId,
    inputMode,
    payload: { field, from, to },
    journeyId: journeyId ?? null,
  });
  return { chronicle: replaceHero(chronicle, updatedHero), logEntry };
}

/** Like changeResource, but assigns `value` directly instead of adding a
 * delta — used for Fellowship-phase Fatigue resets (F4.3). */
export function setResource(
  chronicle: Chronicle,
  heroId: string,
  field: ResourceField,
  value: number,
  inputMode: DiceInputMode,
  journeyId?: string,
): ActionResult {
  const hero = requireHero(chronicle, heroId);
  const from = hero.resources[field];
  const updatedHero = setResourceValue(hero, field, value);
  const to = updatedHero.resources[field];
  const logEntry = createLogEntry({
    type: 'resource-change',
    heroId,
    inputMode,
    payload: { field, from, to },
    journeyId: journeyId ?? null,
  });
  return { chronicle: replaceHero(chronicle, updatedHero), logEntry };
}

/** F1.17 — single-step undo. Takes the most recent resource-change entry and
 * appends its inverse; it never mutates or removes the original entry. */
export function undoResourceChange(chronicle: Chronicle, entry: LogEntry): ActionResult {
  if (entry.type !== 'resource-change') {
    throw new Error('Only resource-change entries can be undone.');
  }
  if (!entry.heroId) throw new Error('Entry has no associated hero.');
  const hero = requireHero(chronicle, entry.heroId);
  const { field, from } = entry.payload as { field: ResourceField; from: number };
  const to = hero.resources[field];
  const updatedHero = setResourceValue(hero, field, from);
  const logEntry = createLogEntry({
    type: 'resource-change',
    heroId: entry.heroId,
    inputMode: entry.inputMode,
    payload: { field, from: to, to: from, undoOf: entry.id },
  });
  return { chronicle: replaceHero(chronicle, updatedHero), logEntry };
}

export function recordSkillRoll(
  heroId: string,
  skillName: string,
  result: SkillRollResult,
  inputMode: DiceInputMode,
  journeyId?: string,
): LogEntry {
  return createLogEntry({
    type: 'roll',
    heroId,
    inputMode,
    payload: { skillName, ...result },
    journeyId: journeyId ?? null,
  });
}

/** F2.1/F2.2 — the Telling Table answer, with an optional free-text
 * interpretation stored on the same entry (F2.2 asks for "attached", not a
 * separate record). */
export function recordOracleAnswer(
  result: TellingTableResult,
  inputMode: DiceInputMode,
  prose?: string,
  journeyId?: string,
): LogEntry {
  return createLogEntry({
    type: 'oracle',
    inputMode,
    payload: { ...result },
    prose: prose ?? null,
    journeyId: journeyId ?? null,
  });
}

/** F2.4 — logged identically to any other roll, regardless of which table. */
export function recordTableRoll(
  tableId: string,
  tableName: string,
  key: number | 'eye' | 'rune',
  row: OracleTableRow | null,
  inputMode: DiceInputMode,
  prose?: string,
  journeyId?: string,
): LogEntry {
  return createLogEntry({
    type: 'oracle',
    inputMode,
    payload: { tableId, tableName, key, row },
    prose: prose ?? null,
    journeyId: journeyId ?? null,
  });
}

/** The Lore Table's two-die draw (p.11-12) — logged as an oracle entry
 * like any other table consultation. */
export function recordLoreRoll(
  result: LoreRollResult,
  loreTableId: string,
  loreTableName: string,
  inputMode: DiceInputMode,
  prose?: string,
  journeyId?: string,
): LogEntry {
  return createLogEntry({
    type: 'oracle',
    inputMode,
    payload: { loreTableId, loreTableName, ...result },
    prose: prose ?? null,
    journeyId: journeyId ?? null,
  });
}

/** F3.7 — a journey event that isn't itself a roll or table draw (e.g. a
 * prompt step's narrative beat). */
export function recordJourneyEvent(
  journeyId: string,
  heroId: string | null,
  message: string,
): LogEntry {
  return createLogEntry({
    type: 'journey-event',
    heroId,
    prose: message,
    journeyId,
  });
}

/** F5.2/F5.3 — combat happenings that aren't themselves skill rolls or
 * chronicle-state changes: adversary damage/Hate spends, round markers,
 * escapes, overrides (F5.7). `payload` carries the structured detail. */
export function recordCombatEvent(
  combatId: string,
  heroId: string | null,
  message: string,
  payload?: Record<string, unknown>,
): LogEntry {
  return createLogEntry({
    type: 'combat-event',
    heroId,
    prose: message,
    payload,
    journeyId: combatId,
  });
}

/** F5.4 — Wounded status transitions on a hero, logged like any other
 * mechanical change. Usable outside combat too (treatment and recovery
 * mostly happen after the fight), hence the optional combatId. */
export function recordWoundChange(
  chronicle: Chronicle,
  heroId: string,
  change: 'wounded' | 'treated' | 'recovered',
  combatId?: string,
): ActionResult {
  const hero = requireHero(chronicle, heroId);
  const updatedHero =
    change === 'wounded' ? applyWound(hero) : change === 'treated' ? treatWound(hero) : recoverFromWound(hero);
  const logEntry = createLogEntry({
    type: 'combat-event',
    heroId,
    prose:
      change === 'wounded'
        ? `${hero.name} is Wounded.`
        : change === 'treated'
          ? `${hero.name}'s wound has been treated.`
          : `${hero.name} has recovered from their wound.`,
    payload: { woundChange: change },
    journeyId: combatId ?? null,
  });
  return { chronicle: replaceHero(chronicle, updatedHero), logEntry };
}

/** F3.7-equivalent for a Fellowship phase (F4.2's prompt/undertaking beats). */
export function recordFellowshipEvent(
  fellowshipPhaseId: string,
  heroId: string | null,
  message: string,
): LogEntry {
  return createLogEntry({
    type: 'fellowship-event',
    heroId,
    prose: message,
    journeyId: fellowshipPhaseId,
  });
}

/** F4.2/experience milestones (p.21) — awards AP/SP and logs it. */
export function recordMilestoneAward(
  chronicle: Chronicle,
  heroId: string,
  milestone: ExperienceMilestone,
  fellowshipPhaseId?: string,
): ActionResult {
  const hero = requireHero(chronicle, heroId);
  const updatedHero = awardMilestone(hero, milestone);
  const logEntry = createLogEntry({
    type: 'resource-change',
    heroId,
    payload: { milestone: milestone.name, adventurePoints: milestone.adventurePoints, skillPoints: milestone.skillPoints },
    journeyId: fellowshipPhaseId ?? null,
  });
  return { chronicle: replaceHero(chronicle, updatedHero), logEntry };
}

/** F4.4 — spend Adventure/Skill Points on a skill rank, proficiency, Valour,
 * or Wisdom, validated against the hero's current pool (throws otherwise). */
export function recordExperienceSpend(
  chronicle: Chronicle,
  heroId: string,
  currency: ExperienceCurrency,
  cost: number,
  target: ExperienceTarget,
  fellowshipPhaseId?: string,
): ActionResult {
  const hero = requireHero(chronicle, heroId);
  const updatedHero = applyExperienceSpend(hero, currency, cost, target);
  const logEntry = createLogEntry({
    type: 'resource-change',
    heroId,
    payload: { currency, cost, target },
    journeyId: fellowshipPhaseId ?? null,
  });
  return { chronicle: replaceHero(chronicle, updatedHero), logEntry };
}
