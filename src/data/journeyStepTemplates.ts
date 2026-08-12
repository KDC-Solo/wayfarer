// The default journey template (F3.3). Strider Mode p.16 says journeys are
// "resolved mostly as described in The One Ring core rulebook (page 108),
// with a few changes" — the base numeric journey procedure (leg length by
// terrain, roll frequency, seasonal modifiers) lives in the core rulebook,
// which isn't on file here (only the Strider Mode supplement is), so this
// template does not invent those numbers. What *is* verified from Strider
// Mode itself: the event-draw sequence below, and that Fatigue comes from
// the event tables rather than a flat per-leg constant — so the
// resource-change step ships with amount 0, for the player to set from
// what they read in the (now-filled-in) event tables. Skill and Fatigue
// amount are genuinely event-dependent, not fixed per leg, which is why
// they're left blank/zero rather than guessed.

import type { OracleTable } from '../engine/oracleTable.ts';
import { createStepTemplate, type StepTemplate } from '../engine/stepTemplate.ts';
import { createEventDetailTables, createSoloJourneyEventsTable } from './journeyEventTables.ts';

export function defaultJourneyContent(): { tables: OracleTable[]; template: StepTemplate } {
  const eventsTable = createSoloJourneyEventsTable();
  const detailTables = createEventDetailTables();

  const template = createStepTemplate('Standard Journey Leg', [
    {
      id: crypto.randomUUID(),
      type: 'prompt',
      label: 'Set the scene',
      enabled: true,
      message: 'Describe the terrain, weather, and surroundings for this leg.',
    },
    {
      id: crypto.randomUUID(),
      type: 'table-draw',
      label: 'Solo Journey Event',
      enabled: true,
      tableId: eventsTable.id,
    },
    {
      id: crypto.randomUUID(),
      type: 'prompt',
      label: 'Event detail (optional)',
      enabled: true,
      message:
        'For more detail, roll on the matching Event Detail table below (table roller), and note which skill it calls for.',
    },
    {
      id: crypto.randomUUID(),
      type: 'roll',
      label: 'Test the called-for skill',
      enabled: true,
      skillName: '', // determined by the event just drawn — pick it when this step runs
      role: 'guide',
    },
    {
      id: crypto.randomUUID(),
      type: 'resource-change',
      label: 'Fatigue',
      enabled: true,
      field: 'fatigue',
      amount: 0, // read "Fatigue Points Gained" off the table you just consulted
      scope: 'whole-company',
    },
  ]);

  return { tables: [eventsTable, ...detailTables], template };
}
