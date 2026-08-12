import type { JourneyRole } from './stepTemplate.ts';
import type { LogEntry } from './types.ts';

export interface Waypoint {
  name: string;
  /** User-entered (F3.1) — units are whatever the player's book uses; not fixed here. */
  distance: number;
  /** Free text (F3.1) — terrain taxonomy is core-rulebook content, not hardcoded. */
  terrain: string;
  /** Strider Mode p.17: the Solo Journey Events roll is Favoured in a
   * Border Land, plain in a Wild Land, Ill-favoured in a Dark Land. */
  landDanger?: 'border' | 'wild' | 'dark';
}

export type JourneyStatus = 'in-progress' | 'paused' | 'completed' | 'abandoned';

export interface Journey {
  id: string;
  origin: string;
  destination: string;
  season: string;
  waypoints: Waypoint[];
  stepTemplateId: string;
  /** F3.5 — role -> heroId. Ignored when the company is solo (see stepTemplate.ts). */
  roles: Partial<Record<JourneyRole, string>>;
  /** Index into waypoints — which leg is currently running. */
  currentLegIndex: number;
  /** Index into the step template's steps array for the current leg. */
  currentStepIndex: number;
  /** Outcome of the most recent roll/table-draw step this leg, for conditional-branch steps. */
  lastOutcome: 'success' | 'failure' | null;
  status: JourneyStatus;
  createdAt: string;
}

export function createJourney(input: {
  origin: string;
  destination: string;
  season: string;
  waypoints: Waypoint[];
  stepTemplateId: string;
  roles?: Partial<Record<JourneyRole, string>>;
}): Journey {
  return {
    id: crypto.randomUUID(),
    origin: input.origin,
    destination: input.destination,
    season: input.season,
    waypoints: input.waypoints,
    stepTemplateId: input.stepTemplateId,
    roles: input.roles ?? {},
    currentLegIndex: 0,
    currentStepIndex: 0,
    lastOutcome: null,
    status: 'in-progress',
    createdAt: new Date().toISOString(),
  };
}

export function assignRole(journey: Journey, role: JourneyRole, heroId: string): Journey {
  return { ...journey, roles: { ...journey.roles, [role]: heroId } };
}

/** F3.9 — pause/resume/abandon. Position (leg/step) is preserved as-is;
 * resuming just continues execution, including across app restarts since
 * Journey is persisted like everything else. */
export function pauseJourney(journey: Journey): Journey {
  return { ...journey, status: 'paused' };
}

export function resumeJourney(journey: Journey): Journey {
  return { ...journey, status: 'in-progress' };
}

export function abandonJourney(journey: Journey): Journey {
  return { ...journey, status: 'abandoned' };
}

/** F3.10 — a readable summary suitable for pasting into the chronicle,
 * built from the log entries this journey produced (LogEntry.journeyId). */
export function generateJourneySummary(journey: Journey, log: LogEntry[]): string {
  const entries = log
    .filter((e) => e.journeyId === journey.id)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const lines: string[] = [];
  lines.push(`# ${journey.origin} to ${journey.destination} (${journey.season})`);
  lines.push('');
  lines.push(`Status: ${journey.status}`);
  lines.push(`Route: ${journey.waypoints.map((w) => w.name).join(' → ')}`);
  lines.push('');

  for (const entry of entries) {
    if (entry.prose) {
      lines.push(`- ${entry.prose}`);
    } else if (entry.type === 'roll') {
      const p = entry.payload as { skillName?: string; success?: boolean };
      lines.push(`- Rolled ${p.skillName ?? 'a skill'}: ${p.success ? 'success' : 'failure'}`);
    } else if (entry.type === 'oracle') {
      const p = entry.payload as { tableName?: string; row?: { text?: string } };
      if (p.tableName) lines.push(`- ${p.tableName}: ${p.row?.text ?? '(no result)'}`);
    } else if (entry.type === 'resource-change') {
      const p = entry.payload as { field?: string; from?: number; to?: number };
      lines.push(`- ${p.field}: ${p.from} → ${p.to}`);
    }
  }

  return lines.join('\n');
}

/** F3.11 — a route is a journey's shape without its live execution state,
 * saved for repeat travel. */
export interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  waypoints: Waypoint[];
}

export function saveAsRoute(journey: Journey, name: string): Route {
  return {
    id: crypto.randomUUID(),
    name,
    origin: journey.origin,
    destination: journey.destination,
    waypoints: journey.waypoints,
  };
}

export function createJourneyFromRoute(
  route: Route,
  season: string,
  stepTemplateId: string,
): Journey {
  return createJourney({
    origin: route.origin,
    destination: route.destination,
    season,
    waypoints: route.waypoints,
    stepTemplateId,
  });
}
