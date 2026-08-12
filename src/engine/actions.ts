// Orchestration that ties dice/resource/company logic to the log (F1.16 —
// every roll and every resource change writes a log entry). Pure: callers
// (App.tsx) are responsible for persisting the returned chronicle and entry.

import { replaceHero } from './company.ts';
import { createLogEntry } from './log.ts';
import { applyResourceDelta, setResourceValue, type ResourceField } from './resources.ts';
import type { SkillRollResult } from './dice.ts';
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
): LogEntry {
  return createLogEntry({
    type: 'roll',
    heroId,
    inputMode,
    payload: { skillName, ...result },
  });
}
