import { describe, expect, it } from 'vitest';
import { advanceYear, createChronicle, setDiceInputMode } from './chronicle.ts';

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
