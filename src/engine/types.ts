// Core data model — PRD §7. Milestone 0 (Foundations) needs Chronicle and
// LogEntry fully typed since everything else derives from them; Hero is a
// minimal stub here and gets its full shape in Phase 1 (F1.1).

export type DiceInputMode = 'app-rolls' | 'player-rolls' | 'hybrid';

/** Placeholder — Phase 1 (F1.1) adds attributes, skills, resources, etc. */
export interface Hero {
  id: string;
  name: string;
}

export interface Chronicle {
  id: string;
  schemaVersion: number;
  createdAt: string; // ISO 8601
  currentYear: number;
  currentLocation: string;
  phaseCount: number;
  company: Hero[];
  diceInputMode: DiceInputMode;
  /** Session ids, most recent last. Sessions themselves aren't modeled yet. */
  sessionList: string[];
}

export type LogEntryType =
  | 'roll'
  | 'resource-change'
  | 'oracle'
  | 'prose'
  | 'journey-event'
  | 'system';

/**
 * Atomic record of anything that happened (PRD §7, D7). The log is
 * append-only; current state is derived from or reconciled against it, and
 * undo/audit/chronicle-view all fall out of this one mechanism rather than
 * being tracked separately.
 */
export interface LogEntry {
  id: string;
  timestamp: string; // ISO 8601
  type: LogEntryType;
  heroId: string | null;
  inputMode: DiceInputMode | null;
  /** Free-form structured payload; shape depends on `type`. */
  payload: Record<string, unknown>;
  prose: string | null;
  journeyId: string | null;
  sessionId: string | null;
}

export const SCHEMA_VERSION = 1;
