// F6.1 — turning raw LogEntry records into the readable lines the
// chronicle view and the Markdown export (chronicleExport.ts) both show.
// One renderer for both keeps the on-screen chronicle and the exported one
// telling the same story (D7: the log is the spine; views derive from it).

import type { Combat } from './combat.ts';
import type { FellowshipPhase } from './fellowshipPhase.ts';
import type { Journey } from './journey.ts';
import type { Chronicle, LogEntry } from './types.ts';

export interface LogRenderContext {
  /** heroId → display name (fallbacks handled by describeLogEntry). */
  heroNames: Record<string, string>;
  /** LogEntry.journeyId → human label for the run that produced the entry
   * ("Journey: Bree → Rivendell", "Fellowship Phase — Year 2954", …). */
  runLabels: Record<string, string>;
}

export function buildRenderContext(input: {
  chronicle: Chronicle;
  journeys: Journey[];
  fellowshipPhases: FellowshipPhase[];
  combats: Combat[];
}): LogRenderContext {
  const heroNames: Record<string, string> = {};
  for (const hero of input.chronicle.company) heroNames[hero.id] = hero.name;

  const runLabels: Record<string, string> = {};
  for (const journey of input.journeys) {
    runLabels[journey.id] = `Journey: ${journey.origin} → ${journey.destination}`;
  }
  for (const phase of input.fellowshipPhases) {
    runLabels[phase.id] = `Fellowship Phase — Year ${phase.year}`;
  }
  for (const combat of input.combats) {
    runLabels[combat.id] = `Combat: ${combat.name}`;
  }
  return { heroNames, runLabels };
}

function heroName(entry: LogEntry, ctx: LogRenderContext): string {
  if (!entry.heroId) return 'The company';
  // Heroes removed from the company still appear in old entries — keep the
  // line readable rather than dangling an id.
  return ctx.heroNames[entry.heroId] ?? 'A former companion';
}

/**
 * One readable line per mechanical entry. Prose-only entries (type
 * 'prose', or event types whose whole content is their prose) return the
 * prose itself; attached prose on mechanical entries is *not* folded in
 * here — callers render it separately so its formatting survives (F6.3).
 */
export function describeLogEntry(entry: LogEntry, ctx: LogRenderContext): string {
  const p = entry.payload as Record<string, unknown>;

  switch (entry.type) {
    case 'roll': {
      const skill = (p.skillName as string) || 'a skill';
      const success = p.success as boolean | undefined;
      const degree = p.degreeOfSuccess as string | undefined;
      const detail =
        typeof p.total === 'number' && typeof p.targetNumber === 'number'
          ? ` (${p.total} vs TN ${p.targetNumber})`
          : '';
      const quality = success && degree && degree !== 'success' ? ` — ${degree}` : '';
      return `${heroName(entry, ctx)} rolled ${skill}: ${success ? 'success' : 'failure'}${quality}${detail}`;
    }

    case 'oracle': {
      if (typeof p.loreTableName === 'string') {
        const results = (p.results ?? {}) as Record<string, string>;
        const parts = Object.entries(results).map(
          ([column, text]) => `${column}: ${text.trim() || '(blank)'}`,
        );
        return `${p.loreTableName} (${String(p.featFace)}/${String(p.successDie)}) — ${parts.join(', ') || 'no columns'}`;
      }
      if (typeof p.tableName === 'string') {
        const row = p.row as { text?: string } | null | undefined;
        const text = row?.text?.trim();
        return `${p.tableName} (${String(p.key)}): ${text || '(no result text)'}`;
      }
      if (typeof p.answer === 'string') {
        const question = typeof p.question === 'string' && p.question.trim() ? ` — "${p.question}"` : '';
        return `The Telling Table${question}: ${p.answer}${p.extreme ? ' (extreme)' : ''}`;
      }
      return 'Oracle consulted';
    }

    case 'resource-change': {
      if (typeof p.field === 'string') {
        const undo = p.undoOf ? ' (undo)' : '';
        return `${heroName(entry, ctx)}: ${p.field} ${p.from} → ${p.to}${undo}`;
      }
      if (typeof p.milestone === 'string') {
        return `${heroName(entry, ctx)} reached a milestone: ${p.milestone} (+${p.adventurePoints} AP, +${p.skillPoints} SP)`;
      }
      if (typeof p.currency === 'string') {
        const target = p.target as { kind?: string; name?: string; newRank?: number } | undefined;
        const what = target?.name ? `${target.kind} ${target.name}` : (target?.kind ?? 'an advancement');
        const rank = target?.newRank !== undefined ? ` to rank ${target.newRank}` : '';
        return `${heroName(entry, ctx)} spent ${p.cost} ${p.currency === 'skill' ? 'Skill' : 'Adventure'} Points on ${what}${rank}`;
      }
      return `${heroName(entry, ctx)}: resources changed`;
    }

    case 'company-change': {
      const name = (p.heroName as string) ?? heroName(entry, ctx);
      return p.action === 'remove' ? `${name} left the company` : `${name} joined the company`;
    }

    // For these, the prose *is* the content; callers that already render
    // entry.prose separately should skip the description for them (see
    // isProseOnly).
    case 'prose':
    case 'journey-event':
    case 'fellowship-event':
    case 'combat-event':
    case 'system':
      return entry.prose ?? '';
  }
}

/** True when the entry has no mechanical line of its own — rendering its
 * prose is rendering the whole entry. */
export function isProseOnly(entry: LogEntry): boolean {
  return (
    entry.type === 'prose' ||
    entry.type === 'journey-event' ||
    entry.type === 'fellowship-event' ||
    entry.type === 'combat-event' ||
    entry.type === 'system'
  );
}

export const LOG_ENTRY_TYPE_LABEL: Record<LogEntry['type'], string> = {
  roll: 'Rolls',
  'resource-change': 'Resource changes',
  'company-change': 'Company changes',
  oracle: 'Oracle',
  prose: 'Prose',
  'journey-event': 'Journey events',
  'fellowship-event': 'Fellowship events',
  'combat-event': 'Combat events',
  system: 'System',
};
