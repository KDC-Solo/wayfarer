import { useState } from 'react';
import { createJourney, createJourneyFromRoute, type Journey, type Route, type Waypoint } from '../engine/journey.ts';
import { JOURNEY_ROLES, type JourneyRole, type StepTemplate } from '../engine/stepTemplate.ts';
import type { Hero } from '../engine/types.ts';

interface Props {
  company: Hero[];
  stepTemplates: StepTemplate[];
  routes: Route[];
  onBegin: (journey: Journey) => void;
}

// F3.1 (define a journey) / F3.5 (assign roles, multi-hero only) / F3.11
// (start from a saved route).

export function JourneyPlanner({ company, stepTemplates, routes, onBegin }: Props) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [season, setSeason] = useState('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [templateId, setTemplateId] = useState(stepTemplates[0]?.id ?? '');
  const [roles, setRoles] = useState<Partial<Record<JourneyRole, string>>>({});

  function addWaypoint() {
    setWaypoints((w) => [...w, { name: '', distance: 0, terrain: '' }]);
  }

  function updateWaypoint(index: number, patch: Partial<Waypoint>) {
    setWaypoints((w) => w.map((wp, i) => (i === index ? { ...wp, ...patch } : wp)));
  }

  function removeWaypoint(index: number) {
    setWaypoints((w) => w.filter((_, i) => i !== index));
  }

  function begin() {
    if (!templateId || waypoints.length === 0) return;
    const journey = createJourney({ origin, destination, season, waypoints, stepTemplateId: templateId, roles });
    onBegin(journey);
  }

  function beginFromRoute(route: Route) {
    if (!templateId) return;
    onBegin(createJourneyFromRoute(route, season, templateId));
  }

  return (
    <section className="roll-panel">
      <h3>Plan a journey</h3>

      {routes.length > 0 && (
        <div>
          <p>Start from a saved route:</p>
          {routes.map((r) => (
            <button key={r.id} onClick={() => beginFromRoute(r)}>
              {r.name}
            </button>
          ))}
        </div>
      )}

      <label>
        Origin
        <input value={origin} onChange={(e) => setOrigin(e.target.value)} />
      </label>
      <label>
        Destination
        <input value={destination} onChange={(e) => setDestination(e.target.value)} />
      </label>
      <label>
        Season
        <input value={season} onChange={(e) => setSeason(e.target.value)} />
      </label>

      <fieldset>
        <legend>Waypoints (F3.1)</legend>
        {waypoints.map((wp, i) => (
          <div key={i}>
            <input placeholder="Name" value={wp.name} onChange={(e) => updateWaypoint(i, { name: e.target.value })} />
            <input
              type="number"
              placeholder="Distance"
              value={wp.distance}
              onChange={(e) => updateWaypoint(i, { distance: Number(e.target.value) })}
            />
            <input
              placeholder="Terrain"
              value={wp.terrain}
              onChange={(e) => updateWaypoint(i, { terrain: e.target.value })}
            />
            <select
              value={wp.landDanger ?? 'wild'}
              onChange={(e) => updateWaypoint(i, { landDanger: e.target.value as Waypoint['landDanger'] })}
            >
              <option value="border">Border Land</option>
              <option value="wild">Wild Land</option>
              <option value="dark">Dark Land</option>
            </select>
            <button onClick={() => removeWaypoint(i)} aria-label={`Remove waypoint ${i}`}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={addWaypoint}>
          Add waypoint
        </button>
      </fieldset>

      <label>
        Step template (F3.2)
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {stepTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {company.length > 1 && (
        <fieldset>
          <legend>Roles (F3.5 — multi-hero company)</legend>
          {JOURNEY_ROLES.map((role) => (
            <label key={role}>
              {role}
              <select
                value={roles[role] ?? ''}
                onChange={(e) => setRoles((r) => ({ ...r, [role]: e.target.value || undefined }))}
              >
                <option value="">(unassigned)</option>
                {company.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      )}

      <button onClick={begin} disabled={waypoints.length === 0 || !templateId}>
        Begin journey
      </button>
    </section>
  );
}
