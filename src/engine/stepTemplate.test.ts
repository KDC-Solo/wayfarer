import { describe, expect, it } from 'vitest';
import {
  addStep,
  createStepTemplate,
  duplicateStep,
  duplicateStepTemplate,
  moveStep,
  removeStep,
  renameStepTemplate,
  toggleStepEnabled,
  updateStep,
  type PromptStep,
} from './stepTemplate.ts';

function prompt(label: string): PromptStep {
  return { id: crypto.randomUUID(), type: 'prompt', label, enabled: true, message: label };
}

describe('createStepTemplate', () => {
  it('starts with no steps by default', () => {
    const t = createStepTemplate('Empty');
    expect(t.steps).toEqual([]);
    expect(t.name).toBe('Empty');
  });
});

describe('addStep / updateStep / removeStep', () => {
  it('appends, replaces by id, and deletes by id', () => {
    let t = createStepTemplate('T');
    const a = prompt('A');
    const b = prompt('B');
    t = addStep(t, a);
    t = addStep(t, b);
    expect(t.steps.map((s) => s.label)).toEqual(['A', 'B']);

    t = updateStep(t, a.id, { ...a, label: 'A-edited' });
    expect(t.steps[0].label).toBe('A-edited');

    t = removeStep(t, a.id);
    expect(t.steps).toHaveLength(1);
    expect(t.steps[0].label).toBe('B');
  });
});

describe('duplicateStep (F3.4)', () => {
  it('inserts a copy with a new id right after the original', () => {
    let t = createStepTemplate('T');
    const a = prompt('A');
    const b = prompt('B');
    t = addStep(t, a);
    t = addStep(t, b);
    t = duplicateStep(t, a.id);
    expect(t.steps.map((s) => s.label)).toEqual(['A', 'A', 'B']);
    expect(t.steps[0].id).not.toBe(t.steps[1].id);
  });
});

describe('toggleStepEnabled (F3.4)', () => {
  it('flips enabled without touching other steps', () => {
    let t = createStepTemplate('T');
    const a = prompt('A');
    t = addStep(t, a);
    t = toggleStepEnabled(t, a.id);
    expect(t.steps[0].enabled).toBe(false);
    t = toggleStepEnabled(t, a.id);
    expect(t.steps[0].enabled).toBe(true);
  });
});

describe('moveStep (F3.4 reorder)', () => {
  it('swaps with the previous/next step', () => {
    let t = createStepTemplate('T');
    const a = prompt('A');
    const b = prompt('B');
    const c = prompt('C');
    t = addStep(addStep(addStep(t, a), b), c);

    t = moveStep(t, c.id, 'up');
    expect(t.steps.map((s) => s.label)).toEqual(['A', 'C', 'B']);

    t = moveStep(t, a.id, 'up'); // already first — no-op
    expect(t.steps.map((s) => s.label)).toEqual(['A', 'C', 'B']);

    t = moveStep(t, a.id, 'down');
    expect(t.steps.map((s) => s.label)).toEqual(['C', 'A', 'B']);
  });
});

describe('duplicateStepTemplate / renameStepTemplate (F3.4 named variant)', () => {
  it('duplicate creates a fresh id and fresh step ids, leaving the original untouched', () => {
    let t = createStepTemplate('Original');
    t = addStep(t, prompt('A'));
    const copy = duplicateStepTemplate(t, 'Variant');
    expect(copy.id).not.toBe(t.id);
    expect(copy.name).toBe('Variant');
    expect(copy.steps[0].id).not.toBe(t.steps[0].id);
    expect(copy.steps[0].label).toBe('A');
    expect(t.name).toBe('Original'); // unchanged
  });

  it('rename only changes the name', () => {
    const t = createStepTemplate('Old');
    const renamed = renameStepTemplate(t, 'New');
    expect(renamed.name).toBe('New');
    expect(renamed.id).toBe(t.id);
  });
});
