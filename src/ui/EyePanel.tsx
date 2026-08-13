import {
  adjustEyeScore,
  huntThreshold,
  LAND_REGION_LABEL,
  revelationDue,
  setStartingScore,
  type EyeAwarenessState,
  type LandRegion,
} from '../engine/eyeAwareness.ts';

interface Props {
  state: EyeAwarenessState;
  onChange: (state: EyeAwarenessState) => void;
  onRevelation: () => void;
}

// The Eye of Mordor (Strider Mode p.13-14). Optional in the book, so it
// stays switched off until the player turns it on — but once on, it does
// the bookkeeping the book asks for: rolls that show the Eye outside
// combat raise the score automatically (wired in App.tsx), and the panel
// says plainly when a Revelation Episode is due.

export function EyePanel({ state, onChange, onRevelation }: Props) {
  if (!state.enabled) {
    return (
      <div className="toolbar subtle">
        <span>Eye of Mordor tracking is off (optional rules, Strider Mode p.13).</span>
        <button onClick={() => onChange({ ...state, enabled: true })}>Turn on</button>
      </div>
    );
  }

  const threshold = huntThreshold(state);
  const due = revelationDue(state);
  const pct = threshold > 0 ? Math.min(100, (state.score / threshold) * 100) : 0;

  return (
    <section className={`roll-panel eye-panel${due ? ' is-due' : ''}`}>
      <div className="sheet-head">
        <h3>The Eye of Mordor</h3>
        <button className="ghost" onClick={() => onChange({ ...state, enabled: false })}>
          Turn off
        </button>
      </div>

      <div className="gauge tone-eye">
        <div className="gauge-head">
          <span className="gauge-label">Eye Awareness</span>
          <span className="stepper">
            <button onClick={() => onChange(adjustEyeScore(state, -1))} aria-label="Decrease Eye Awareness">
              −
            </button>
            <b>{state.score}</b>
            <button onClick={() => onChange(adjustEyeScore(state, 1))} aria-label="Increase Eye Awareness">
              +
            </button>
          </span>
        </div>
        <div className="gauge-track">
          <div className="gauge-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="gauge-foot">
          <span>Hunt threshold {threshold}</span>
        </div>
      </div>

      {due && (
        <div className="lookup">
          <p className="lookup-cue">
            <strong>A Revelation Episode is due.</strong> Roll on the Revelation Episode Table (Strider
            Mode p.14), then the score resets to its starting value.
          </p>
          <button className="primary" onClick={onRevelation}>
            Face the Revelation Episode
          </button>
        </div>
      )}

      <div className="roll-fields">
        <label>
          Region travelled
          <select
            value={state.region}
            onChange={(e) => onChange({ ...state, region: e.target.value as LandRegion })}
          >
            {(Object.keys(LAND_REGION_LABEL) as LandRegion[]).map((r) => (
              <option key={r} value={r}>
                {LAND_REGION_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hunt modifier
          <input
            type="number"
            value={state.huntModifier}
            onChange={(e) => onChange({ ...state, huntModifier: Number(e.target.value) || 0 })}
          />
        </label>
        <label>
          Starting score
          <input
            type="number"
            min={0}
            value={state.startingScore}
            onChange={(e) => onChange(setStartingScore(state, Number(e.target.value)))}
          />
        </label>
      </div>
      <p className="hint">
        Your starting score and Hunt modifiers are worked out from your own rulebook; the region
        threshold comes from Strider Mode p.13.
      </p>
    </section>
  );
}
