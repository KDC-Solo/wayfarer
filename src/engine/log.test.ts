import { describe, expect, it } from 'vitest';
import { createLogEntry, filterLog, sortLogChronological } from './log.ts';

describe('createLogEntry', () => {
  it('fills in defaults for an optional-free input', () => {
    const entry = createLogEntry({ type: 'system' });
    expect(entry.id).toBeTruthy();
    expect(entry.type).toBe('system');
    expect(entry.heroId).toBeNull();
    expect(entry.inputMode).toBeNull();
    expect(entry.payload).toEqual({});
    expect(entry.prose).toBeNull();
    expect(new Date(entry.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('carries through provided fields', () => {
    const entry = createLogEntry({
      type: 'roll',
      heroId: 'hero-1',
      inputMode: 'hybrid',
      payload: { skill: 'Awareness' },
      prose: 'A tense moment.',
      sessionId: 'session-1',
    });
    expect(entry.heroId).toBe('hero-1');
    expect(entry.inputMode).toBe('hybrid');
    expect(entry.payload).toEqual({ skill: 'Awareness' });
    expect(entry.prose).toBe('A tense moment.');
    expect(entry.sessionId).toBe('session-1');
  });

  it('gives every entry a unique id', () => {
    const a = createLogEntry({ type: 'system' });
    const b = createLogEntry({ type: 'system' });
    expect(a.id).not.toBe(b.id);
  });
});

describe('filterLog', () => {
  const entries = [
    createLogEntry({ type: 'roll', heroId: 'h1', sessionId: 's1' }),
    createLogEntry({ type: 'oracle', heroId: 'h2', sessionId: 's1' }),
    createLogEntry({ type: 'roll', heroId: 'h1', sessionId: 's2' }),
  ];

  it('filters by a single field', () => {
    expect(filterLog(entries, { type: 'roll' })).toHaveLength(2);
    expect(filterLog(entries, { heroId: 'h2' })).toHaveLength(1);
  });

  it('combines multiple filter fields with AND semantics', () => {
    expect(filterLog(entries, { type: 'roll', sessionId: 's2' })).toHaveLength(1);
    expect(filterLog(entries, { type: 'oracle', sessionId: 's2' })).toHaveLength(0);
  });

  it('returns everything when no filter fields are set', () => {
    expect(filterLog(entries, {})).toHaveLength(3);
  });
});

describe('sortLogChronological', () => {
  it('orders entries oldest first without mutating the input', () => {
    const newer = { ...createLogEntry({ type: 'system' }), timestamp: '2026-01-02T00:00:00.000Z' };
    const older = { ...createLogEntry({ type: 'system' }), timestamp: '2026-01-01T00:00:00.000Z' };
    const input = [newer, older];
    const sorted = sortLogChronological(input);
    expect(sorted).toEqual([older, newer]);
    expect(input).toEqual([newer, older]); // unchanged
  });
});
