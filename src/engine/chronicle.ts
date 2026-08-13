import { SCHEMA_VERSION, type Chronicle, type DiceInputMode } from './types.ts';

export function createChronicle(): Chronicle {
  return {
    id: crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    currentYear: 0,
    currentLocation: '',
    phaseCount: 0,
    company: [],
    activeHeroId: null,
    diceInputMode: 'app-rolls',
    sessionList: [],
  };
}

/**
 * F6.1 — sessions are boundaries in the log, not an entity of their own:
 * starting one appends a fresh id to the chronicle's session list, and
 * every log entry persisted from then on is stamped with it (App.tsx does
 * the stamping at its single persistence choke point, keeping the action
 * layer pure). Entries from before the first session keep a null
 * sessionId. There is deliberately no "end session" — the next start is
 * the boundary, matching how a play journal actually works.
 */
export function startSession(chronicle: Chronicle): { chronicle: Chronicle; sessionId: string } {
  const sessionId = crypto.randomUUID();
  return {
    chronicle: { ...chronicle, sessionList: [...chronicle.sessionList, sessionId] },
    sessionId,
  };
}

export function currentSessionId(chronicle: Chronicle): string | null {
  return chronicle.sessionList[chronicle.sessionList.length - 1] ?? null;
}

/** 1-based position of a session in the chronicle — "Session 3" beats a
 * UUID everywhere a human reads it. Null for unknown ids. */
export function sessionNumber(chronicle: Chronicle, sessionId: string): number | null {
  const index = chronicle.sessionList.indexOf(sessionId);
  return index === -1 ? null : index + 1;
}

/** F1.10 — changeable mid-session; stored per chronicle. */
export function setDiceInputMode(chronicle: Chronicle, mode: DiceInputMode): Chronicle {
  return { ...chronicle, diceInputMode: mode };
}

/** F4.1 — opening a Fellowship Phase advances the chronicle by one year. */
export function advanceYear(chronicle: Chronicle): Chronicle {
  return { ...chronicle, currentYear: chronicle.currentYear + 1, phaseCount: chronicle.phaseCount + 1 };
}
