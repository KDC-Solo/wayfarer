import { describe, expect, it } from 'vitest';
import { defaultFellowshipStepTemplate } from '../data/fellowshipStepTemplate.ts';
import { createFellowshipPhase, completeHeroTurn } from './fellowshipPhase.ts';
import { currentStep, completeStep } from './stepRunner.ts';

// Walks the real default Fellowship template through a two-hero phase,
// same shape as journeyIntegration.test.ts — confirms the generic
// interpreter (stepRunner.ts) genuinely works for a non-Journey position
// type, which is the actual point of F4.6's "reuse the Phase 3 engine."

describe('running the default Fellowship template end to end', () => {
  it('walks every step for every hero and completes the phase', () => {
    const template = defaultFellowshipStepTemplate();
    let phase = createFellowshipPhase({
      year: 2954,
      location: 'Bree',
      stepTemplateId: template.id,
      heroIds: ['h1', 'h2'],
    });

    let safety = 0;
    const visited: { hero: number; type: string }[] = [];

    while (phase.status === 'in-progress' && safety++ < 100) {
      const { position, step } = currentStep(phase, template);
      phase = position;

      if (!step) {
        phase = completeHeroTurn(phase);
        continue;
      }

      visited.push({ hero: phase.currentHeroIndex, type: step.type });
      phase = completeStep(phase);
    }

    expect(safety).toBeLessThan(100);
    expect(phase.status).toBe('completed');
    expect(visited).toEqual([
      { hero: 0, type: 'prompt' },
      { hero: 0, type: 'resource-change' },
      { hero: 0, type: 'resource-change' },
      { hero: 0, type: 'prompt' },
      { hero: 1, type: 'prompt' },
      { hero: 1, type: 'resource-change' },
      { hero: 1, type: 'resource-change' },
      { hero: 1, type: 'prompt' },
    ]);
  });
});
