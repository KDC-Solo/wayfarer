import { describe, expect, it } from 'vitest';
import { resolveTellingTable } from './tellingTable.ts';

describe('resolveTellingTable', () => {
  it('answers yes when the Feat die meets the band threshold', () => {
    const r = resolveTellingTable('Is there light ahead?', 'doubtful', 8);
    expect(r.answer).toBe('yes');
    expect(r.extreme).toBe(false);
  });

  it('answers no when the Feat die is below the band threshold', () => {
    const r = resolveTellingTable('Is there light ahead?', 'doubtful', 7);
    expect(r.answer).toBe('no');
  });

  it('certain is yes on almost anything (threshold 1)', () => {
    expect(resolveTellingTable('q', 'certain', 1).answer).toBe('yes');
  });

  it('unthinkable requires the maximum roll (threshold 10)', () => {
    expect(resolveTellingTable('q', 'unthinkable', 9).answer).toBe('no');
    expect(resolveTellingTable('q', 'unthinkable', 10).answer).toBe('yes');
  });

  it('rune is always yes with an extreme flag, regardless of band', () => {
    const r = resolveTellingTable('q', 'unthinkable', 'rune');
    expect(r.answer).toBe('yes');
    expect(r.extreme).toBe(true);
  });

  it('eye is always no with an extreme flag, regardless of band', () => {
    const r = resolveTellingTable('q', 'certain', 'eye');
    expect(r.answer).toBe('no');
    expect(r.extreme).toBe(true);
  });
});
