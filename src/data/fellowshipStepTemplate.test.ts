import { describe, expect, it } from 'vitest';
import { defaultFellowshipStepTemplate } from './fellowshipStepTemplate.ts';

describe('defaultFellowshipStepTemplate', () => {
  it('has the four steps: prompt, two resource-changes, prompt', () => {
    const template = defaultFellowshipStepTemplate();
    expect(template.steps.map((s) => s.type)).toEqual([
      'prompt',
      'resource-change',
      'resource-change',
      'prompt',
    ]);
  });

  it('the Spiritual Recovery step targets shadow with delta mode', () => {
    const template = defaultFellowshipStepTemplate();
    const step = template.steps[1];
    expect(step).toMatchObject({ type: 'resource-change', field: 'shadow', mode: 'delta' });
  });

  it('the Fatigue reset step targets fatigue with set mode, amount 0', () => {
    const template = defaultFellowshipStepTemplate();
    const step = template.steps[2];
    expect(step).toMatchObject({ type: 'resource-change', field: 'fatigue', mode: 'set', amount: 0 });
  });

  it('every step is enabled by default', () => {
    expect(defaultFellowshipStepTemplate().steps.every((s) => s.enabled)).toBe(true);
  });
});
