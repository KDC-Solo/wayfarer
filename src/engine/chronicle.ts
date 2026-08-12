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

/** F1.10 — changeable mid-session; stored per chronicle. */
export function setDiceInputMode(chronicle: Chronicle, mode: DiceInputMode): Chronicle {
  return { ...chronicle, diceInputMode: mode };
}

/** F4.1 — opening a Fellowship Phase advances the chronicle by one year. */
export function advanceYear(chronicle: Chronicle): Chronicle {
  return { ...chronicle, currentYear: chronicle.currentYear + 1, phaseCount: chronicle.phaseCount + 1 };
}
