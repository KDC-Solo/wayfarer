import { SCHEMA_VERSION, type Chronicle } from './types.ts';

export function createChronicle(): Chronicle {
  return {
    id: crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    currentYear: 0,
    currentLocation: '',
    phaseCount: 0,
    company: [],
    diceInputMode: 'app-rolls',
    sessionList: [],
  };
}
