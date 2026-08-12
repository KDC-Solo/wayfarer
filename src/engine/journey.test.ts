import { describe, expect, it } from 'vitest';
import { createLogEntry } from './log.ts';
import {
  abandonJourney,
  assignRole,
  createJourney,
  createJourneyFromRoute,
  generateJourneySummary,
  pauseJourney,
  resumeJourney,
  saveAsRoute,
} from './journey.ts';

function makeJourney() {
  return createJourney({
    origin: 'Bree',
    destination: 'Rivendell',
    season: 'winter',
    waypoints: [
      { name: 'Weathertop', distance: 3, terrain: 'hills' },
      { name: 'Last Bridge', distance: 4, terrain: 'road' },
    ],
    stepTemplateId: 'template-1',
  });
}

describe('createJourney', () => {
  it('starts in-progress at the first leg/step with no roles assigned', () => {
    const j = makeJourney();
    expect(j.status).toBe('in-progress');
    expect(j.currentLegIndex).toBe(0);
    expect(j.currentStepIndex).toBe(0);
    expect(j.roles).toEqual({});
  });
});

describe('assignRole', () => {
  it('sets a role without touching others', () => {
    let j = makeJourney();
    j = assignRole(j, 'guide', 'hero-1');
    j = assignRole(j, 'scout', 'hero-2');
    expect(j.roles).toEqual({ guide: 'hero-1', scout: 'hero-2' });
  });
});

describe('pause/resume/abandon (F3.9)', () => {
  it('transitions status without touching position', () => {
    let j = makeJourney();
    j = { ...j, currentLegIndex: 1, currentStepIndex: 2 };
    j = pauseJourney(j);
    expect(j.status).toBe('paused');
    expect(j.currentLegIndex).toBe(1);
    expect(j.currentStepIndex).toBe(2);
    j = resumeJourney(j);
    expect(j.status).toBe('in-progress');
  });

  it('abandon sets status without clearing history', () => {
    const j = abandonJourney(makeJourney());
    expect(j.status).toBe('abandoned');
  });
});

describe('generateJourneySummary (F3.10)', () => {
  it('includes route, status, and chronological prose/roll/oracle/resource entries for this journey only', () => {
    const j = makeJourney();
    const log = [
      createLogEntry({
        type: 'prose',
        journeyId: j.id,
        prose: 'A cold wind picks up.',
        payload: {},
      }),
      createLogEntry({ type: 'roll', journeyId: j.id, payload: { skillName: 'Explore', success: true } }),
      createLogEntry({ type: 'system', journeyId: 'other-journey', prose: 'unrelated' }),
    ];
    const summary = generateJourneySummary(j, log);
    expect(summary).toContain('Bree to Rivendell');
    expect(summary).toContain('Weathertop → Last Bridge');
    expect(summary).toContain('A cold wind picks up.');
    expect(summary).toContain('Explore');
    expect(summary).not.toContain('unrelated');
  });
});

describe('saveAsRoute / createJourneyFromRoute (F3.11)', () => {
  it('captures the route shape and can seed a fresh journey from it', () => {
    const j = makeJourney();
    const route = saveAsRoute(j, 'Bree to Rivendell (winter path)');
    expect(route.waypoints).toEqual(j.waypoints);

    const fresh = createJourneyFromRoute(route, 'summer', 'template-2');
    expect(fresh.id).not.toBe(j.id);
    expect(fresh.waypoints).toEqual(j.waypoints);
    expect(fresh.season).toBe('summer');
    expect(fresh.status).toBe('in-progress');
  });
});
