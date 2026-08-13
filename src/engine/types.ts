// Core data model — PRD §7.

import type { EyeAwarenessState } from './eyeAwareness.ts';

export type DiceInputMode = 'app-rolls' | 'player-rolls' | 'hybrid';

export interface Attributes {
  strength: number;
  heart: number;
  wits: number;
}

/**
 * Live per-hero resources (F1.14). Endurance doubles as the Fatigue
 * threshold — a hero is Weary once Fatigue reaches current Endurance
 * (F1.15) — so there is deliberately no separate "max Endurance" field;
 * damage lowers Endurance directly, which is what makes a hurt hero grow
 * Weary sooner. Starting values are entered by the player from their own
 * character sheet; the app does not compute them.
 */
export interface Resources {
  endurance: number;
  hope: number;
  fatigue: number;
  shadow: number;
  shadowPoints: number;
  shadowScars: number;
}

/**
 * F1.1. Skill and combat-proficiency names are open string keys, not a
 * fixed union — `src/data/skills.ts` seeds the standard eighteen as a
 * starting point (NG2: the app is not a rules teacher; the player's own
 * book is authoritative, and every field here is editable per N7).
 */
export interface Hero {
  id: string;
  name: string;
  culture: string;
  calling: string;
  attributes: Attributes;
  /** skill name -> rank */
  skills: Record<string, number>;
  /** proficiency name -> rank */
  combatProficiencies: Record<string, number>;
  valour: number;
  wisdom: number;
  virtues: string[];
  rewards: string[];
  gear: string[];
  patron: string;
  resources: Resources;
  /**
   * F4.4's spend pools (Strider Mode p.21, "Experience Milestones"): two
   * separate currencies, not one generic "experience." Adventure Points and
   * Skill Points are earned by different milestones and — per the core
   * rulebook, not on file here — likely spend differently too; the engine
   * doesn't assume which currency pays for which advancement (see
   * fellowshipPhase.ts), matching NG2.
   */
  adventurePoints: number;
  skillPoints: number;
  /**
   * F5.4 — Wounded status and whether the wound has been treated. The
   * recovery mechanics themselves (treatment rolls, days on the recovery
   * track) are core-rulebook content, so these are player-advanced flags
   * (see hero.ts). Optional so pre-Phase-5 stored heroes load unchanged —
   * absent means false.
   */
  wounded?: boolean;
  woundTreated?: boolean;
}

export interface Chronicle {
  id: string;
  schemaVersion: number;
  createdAt: string; // ISO 8601
  currentYear: number;
  currentLocation: string;
  phaseCount: number;
  company: Hero[];
  /** F1.3 — all rolls default to this hero. Null only when the company is empty. */
  activeHeroId: string | null;
  diceInputMode: DiceInputMode;
  /** Session ids, most recent last. Sessions themselves aren't modeled yet. */
  sessionList: string[];
  /** The Eye of Mordor (Strider Mode p.13-14). Optional in the book, so
   * opt-in here; absent on chronicles created before it existed. */
  eyeAwareness?: EyeAwarenessState;
}

export type LogEntryType =
  | 'roll'
  | 'resource-change'
  | 'company-change'
  | 'oracle'
  | 'prose'
  | 'journey-event'
  | 'fellowship-event'
  | 'combat-event'
  | 'eye-awareness'
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
  /** The id of whatever step-template run (Journey, FellowshipPhase, or
   * Combat) produced this entry, if any — reused across all three rather
   * than adding more id fields, so chronicle filtering (F6.1) works
   * uniformly. */
  journeyId: string | null;
  sessionId: string | null;
}

// Bumped for the Eye of Mordor tracker (F8.x). Backwards compatible with
// versions 5-8: every field added since 5 is optional, and newer
// collections simply may be absent from older exports.
export const SCHEMA_VERSION = 9;
