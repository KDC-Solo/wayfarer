import { describe, expect, it } from 'vitest';
import { DEFAULT_SKILL_NAMES } from './skills.ts';

describe('DEFAULT_SKILL_NAMES (verified against the core rules)', () => {
  it('is the eighteen common skills', () => {
    expect(DEFAULT_SKILL_NAMES).toHaveLength(18);
    expect(new Set(DEFAULT_SKILL_NAMES).size).toBe(18);
  });

  it('includes TRAVEL, which Strider Mode p.16 calls for by name', () => {
    expect(DEFAULT_SKILL_NAMES).toContain('Travel');
  });

  it('does not include "Search", which was a guess and is not a skill', () => {
    expect(DEFAULT_SKILL_NAMES).not.toContain('Search');
  });

  it('follows the book\'s column order rather than alphabetical, for sheet copying', () => {
    expect(DEFAULT_SKILL_NAMES[0]).toBe('Awe');
    expect(DEFAULT_SKILL_NAMES[6]).toBe('Enhearten');
    expect(DEFAULT_SKILL_NAMES[12]).toBe('Persuade');
  });
});
