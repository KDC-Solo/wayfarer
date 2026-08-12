import { describe, expect, it } from 'vitest';
import { defaultJourneyContent } from '../data/journeyStepTemplates.ts';
import { addHero } from './company.ts';
import { createChronicle } from './chronicle.ts';
import { createHero } from './hero.ts';
import { createJourney } from './journey.ts';
import { completeLeg, completeStep, currentStep, resolveRoleHero } from './journeyEngine.ts';

// Walks the real default template (data/journeyStepTemplates.ts) through a
// full two-leg journey, simulating what JourneyRunner does step by step.
// This is the integration check the isolated unit tests don't cover: that
// the whole sequence actually terminates, transitions legs correctly, and
// reaches 'completed' without an infinite loop or an off-by-one leaving a
// dangling step.

describe('running the default journey template end to end', () => {
  it('walks every step of every leg and completes the journey', () => {
    let chronicle = createChronicle();
    chronicle = addHero(chronicle, createHero({ name: 'Idis' }));
    const { template } = defaultJourneyContent();

    let journey = createJourney({
      origin: 'Bree',
      destination: 'Rivendell',
      season: 'winter',
      waypoints: [
        { name: 'Weathertop', distance: 3, terrain: 'hills', landDanger: 'wild' },
        { name: 'Last Bridge', distance: 4, terrain: 'road', landDanger: 'border' },
      ],
      stepTemplateId: template.id,
    });

    let safety = 0;
    const visitedTypes: string[] = [];

    while (journey.status === 'in-progress' && safety++ < 100) {
      const { journey: advanced, step } = currentStep(journey, template);
      journey = advanced;

      if (!step) {
        journey = completeLeg(journey);
        continue;
      }

      visitedTypes.push(step.type);

      if (step.type === 'roll') {
        // Sanity-check role routing resolves to the sole hero (solo company).
        expect(resolveRoleHero(journey, chronicle, step.role)).toBe(chronicle.company[0].id);
        journey = completeStep(journey, 'success');
      } else {
        journey = completeStep(journey);
      }
    }

    expect(safety).toBeLessThan(100); // didn't hit the safety cap — genuinely terminated
    expect(journey.status).toBe('completed');
    // Every leg runs the same 5-step template: prompt, table-draw, prompt, roll, resource-change.
    expect(visitedTypes).toEqual([
      'prompt',
      'table-draw',
      'prompt',
      'roll',
      'resource-change',
      'prompt',
      'table-draw',
      'prompt',
      'roll',
      'resource-change',
    ]);
  });

  it('a template with only a disabled step completes the leg with no interactive steps', () => {
    let template = defaultJourneyContent().template;
    template = { ...template, steps: template.steps.map((s) => ({ ...s, enabled: false })) };
    let journey = createJourney({
      origin: 'A',
      destination: 'B',
      season: 'spring',
      waypoints: [{ name: 'Only leg', distance: 1, terrain: 'plain' }],
      stepTemplateId: template.id,
    });

    const { step } = currentStep(journey, template);
    expect(step).toBeNull();
    journey = completeLeg(journey);
    expect(journey.status).toBe('completed');
  });
});
