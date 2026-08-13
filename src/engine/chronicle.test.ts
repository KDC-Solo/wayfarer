import { describe, expect, it } from 'vitest';
import {
  advanceYear,
  createChronicle,
  currentSessionId,
  sessionNumber,
  setDiceInputMode,
  startSession,
} from './chronicle.ts';

describe('createChronicle', () => {
  it('starts at year 0 with no phases and an empty company', () => {
    const c = createChronicle();
    expect(c.currentYear).toBe(0);
    expect(c.phaseCount).toBe(0);
    expect(c.company).toEqual([]);
    expect(c.diceInputMode).toBe('app-rolls');
  });
});

describe('setDiceInputMode (F1.10)', () => {
  it('changes only the dice input mode', () => {
    const c = setDiceInputMode(createChronicle(), 'hybrid');
    expect(c.diceInputMode).toBe('hybrid');
  });
});

describe('sessions (F6.1)', () => {
  it('there is no session until one is started', () => {
    expect(currentSessionId(createChronicle())).toBeNull();
  });

  it('startSession appends and becomes current; numbering is 1-based', () => {
    const first = startSession(createChronicle());
    expect(currentSessionId(first.chronicle)).toBe(first.sessionId);
    expect(sessionNumber(first.chronicle, first.sessionId)).toBe(1);

    const second = startSession(first.chronicle);
    expect(currentSessionId(second.chronicle)).toBe(second.sessionId);
    expect(sessionNumber(second.chronicle, first.sessionId)).toBe(1);
    expect(sessionNumber(second.chronicle, second.sessionId)).toBe(2);
    expect(second.chronicle.sessionList).toEqual([first.sessionId, second.sessionId]);
  });

  it('sessionNumber is null for an unknown id', () => {
    expect(sessionNumber(createChronicle(), 'nope')).toBeNull();
  });
});

describe('advanceYear (F4.1)', () => {
  it('increments both the year and the phase count', () => {
    let c = createChronicle();
    c = advanceYear(c);
    expect(c.currentYear).toBe(1);
    expect(c.phaseCount).toBe(1);
    c = advanceYear(c);
    expect(c.currentYear).toBe(2);
    expect(c.phaseCount).toBe(2);
  });
});
