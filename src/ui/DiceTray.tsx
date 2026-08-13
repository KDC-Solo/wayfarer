import { useRef, useState } from 'react';
import {
  getDiceBox,
  loadDiceQuality,
  recommendedQuality,
  rollIn3d,
  saveDiceQuality,
  withTimeout,
  type Dice3dRoll,
  type DiceQuality,
} from '../engine/dice3d.ts';

const CONTAINER_ID = 'dice-tray';

/**
 * Phase 7's canvas host and quality control. The tray mounts an empty
 * container immediately; the heavy module only loads when a 3D roll is
 * actually requested (F7.2), and every failure path just returns nothing
 * so the caller rolls numerically instead.
 */
export function useDice3d() {
  const [quality, setQuality] = useState<DiceQuality>(() => loadDiceQuality());
  const [rolling, setRolling] = useState(false);
  /** F7.8 — set when the player skips; the in-flight roll is discarded. */
  const skippedRef = useRef(false);

  function changeQuality(next: DiceQuality) {
    setQuality(next);
    saveDiceQuality(next);
  }

  /** Resolves to simulated faces, or null to mean "use the numeric path."
   * Never rejects and never hangs — a stalled load or a skip both come
   * back as null, and the caller rolls numerically (F7.2/F7.8). */
  async function roll(featCount: number, successCount: number): Promise<Dice3dRoll | null> {
    if (quality === 'off') return null;
    skippedRef.current = false;
    setRolling(true);
    try {
      const box = await withTimeout(getDiceBox(quality, `#${CONTAINER_ID}`));
      if (!box) return null;
      const result = await withTimeout(rollIn3d(box, featCount, successCount));
      return skippedRef.current ? null : result;
    } finally {
      setRolling(false);
    }
  }

  function skip() {
    skippedRef.current = true;
    setRolling(false);
  }

  return { quality, changeQuality, roll, rolling, skip };
}

export function DiceTray({ rolling, onSkip }: { rolling: boolean; onSkip: () => void }) {
  return (
    <div className={`dice-tray${rolling ? ' rolling' : ''}`}>
      <div id={CONTAINER_ID} aria-hidden="true" />
      {rolling && (
        <button className="ghost dice-skip" onClick={onSkip}>
          Skip animation
        </button>
      )}
    </div>
  );
}

export function DiceQualityControl({
  quality,
  onChange,
}: {
  quality: DiceQuality;
  onChange: (quality: DiceQuality) => void;
}) {
  // F7.5's capability threshold, surfaced as a suggestion rather than
  // imposed: the player picks, the app just says which level suits the
  // device. Computed once per render of the setup phase; cheap.
  const recommended = recommendedQuality();
  return (
    <label>
      3D dice
      <select value={quality} onChange={(e) => onChange(e.target.value as DiceQuality)}>
        <option value="off">Off — roll numerically</option>
        <option value="low">On — low detail{recommended === 'low' ? ' (suggested)' : ''}</option>
        <option value="high">On — high detail{recommended === 'high' ? ' (suggested)' : ''}</option>
      </select>
    </label>
  );
}
