import { describe, expect, it } from 'vitest';
import { defaultCombatStepTemplate } from './combatStepTemplate.ts';

describe('defaultCombatStepTemplate (F5.8)', () => {
  it('is a light skeleton: declare, attack, adversary actions', () => {
    const template = defaultCombatStepTemplate();
    expect(template.steps.map((s) => s.type)).toEqual(['prompt', 'attack', 'prompt']);
    expect(template.steps.every((s) => s.enabled)).toBe(true);
  });

  it('carries no core-rulebook numbers — the attack step is configuration-free', () => {
    const template = defaultCombatStepTemplate();
    const attack = template.steps.find((s) => s.type === 'attack')!;
    // Only identity/skeleton fields; TNs, damage, Injury ratings are all
    // live player input (D16).
    expect(Object.keys(attack).sort()).toEqual(['enabled', 'id', 'label', 'type']);
  });

  it('cites the supplement by page, not by quoting table text', () => {
    const template = defaultCombatStepTemplate();
    const prompts = template.steps.flatMap((s) => (s.type === 'prompt' ? [s.message] : []));
    expect(prompts.some((m) => m.includes('p.15'))).toBe(true);
  });

  it('gets fresh ids per call so re-seeding cannot collide', () => {
    const a = defaultCombatStepTemplate();
    const b = defaultCombatStepTemplate();
    expect(a.id).not.toBe(b.id);
    expect(a.steps[0].id).not.toBe(b.steps[0].id);
  });
});
