import type { DiceInputMode, LogEntry, LogEntryType } from './types.ts';

export interface NewLogEntryInput {
  type: LogEntryType;
  heroId?: string | null;
  inputMode?: DiceInputMode | null;
  payload?: Record<string, unknown>;
  prose?: string | null;
  journeyId?: string | null;
  sessionId?: string | null;
}

/** Pure factory — does not touch storage. Callers append via persistence.ts. */
export function createLogEntry(input: NewLogEntryInput): LogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type: input.type,
    heroId: input.heroId ?? null,
    inputMode: input.inputMode ?? null,
    payload: input.payload ?? {},
    prose: input.prose ?? null,
    journeyId: input.journeyId ?? null,
    sessionId: input.sessionId ?? null,
  };
}

export interface LogFilter {
  sessionId?: string;
  heroId?: string;
  journeyId?: string;
  type?: LogEntryType;
}

/** Filters a list of entries in memory — used for both querying and the
 * chronicle view (F6.1: filterable by session, journey, hero, and entry type). */
export function filterLog(entries: LogEntry[], filter: LogFilter): LogEntry[] {
  return entries.filter((e) => {
    if (filter.sessionId !== undefined && e.sessionId !== filter.sessionId) return false;
    if (filter.heroId !== undefined && e.heroId !== filter.heroId) return false;
    if (filter.journeyId !== undefined && e.journeyId !== filter.journeyId) return false;
    if (filter.type !== undefined && e.type !== filter.type) return false;
    return true;
  });
}

/** Chronological order, oldest first — the natural reading order for a chronicle. */
export function sortLogChronological(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
