// Phase 7 — the optional 3D dice module. Polish, never function: nothing
// in Phases 1-6 may depend on this (PRD §6 Phase 7 preamble), so every
// entry point here is failure-tolerant and the caller always has a
// numeric path that works when this module is off, still loading, or
// broken.
//
// Evaluation outcome (the PRD asked for one before building on
// @3d-dice/dice-box): its theme system does accept custom meshes, but we
// don't need them. F7.3 mandates *generic* dice only, and the library
// ships a numbered d12 and d6 — so the Feat die is a plain d12 whose
// faces 11 and 12 we read as the Eye and the rune in our own code. No
// custom geometry, no licensed symbols, ~620 KB of assets (well under
// the ~400 KB compressed estimate in PRD §9 once gzipped), and the
// library stays a lazy import rather than a dependency of the roll path.

import type { FeatDieFace, SuccessDieFace } from './dice.ts';

export type DiceQuality = 'off' | 'low' | 'high';

export const DICE_QUALITY_KEY = 'wayfarer.dice3d.quality';

/**
 * F7.5 — quality is a small setting, so localStorage per PRD §9.
 *
 * The default is always 'off': the module is several megabytes and Phase
 * 7 is explicitly polish, so it's opt-in rather than something every
 * visitor downloads on their first roll (N1/N6). F7.5's "default to low
 * below a capability threshold" governs *which* level to suggest once the
 * player opts in — see `recommendedQuality`.
 */
export function loadDiceQuality(): DiceQuality {
  if (typeof localStorage === 'undefined') return 'off';
  const stored = localStorage.getItem(DICE_QUALITY_KEY);
  if (stored === 'off' || stored === 'low' || stored === 'high') return stored;
  return 'off';
}

export function saveDiceQuality(quality: DiceQuality): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(DICE_QUALITY_KEY, quality);
}

/**
 * F7.5's capability threshold: which level to recommend when the player
 * turns 3D on, and 'off' where the simulation can't run at all (no WebGL,
 * or no DOM as in unit tests).
 */
export function recommendedQuality(): DiceQuality {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return 'off';
  const canvas = document.createElement('canvas');
  const webgl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!webgl) return 'off';
  const cores = navigator.hardwareConcurrency ?? 2;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 2;
  return cores >= 8 && memory >= 8 ? 'high' : 'low';
}

interface QualityProfile {
  shadowQuality: 'high' | 'medium' | 'none';
  scale: number;
  enableShadows: boolean;
}

const QUALITY_PROFILES: Record<Exclude<DiceQuality, 'off'>, QualityProfile> = {
  low: { shadowQuality: 'none', scale: 5, enableShadows: false },
  high: { shadowQuality: 'high', scale: 6, enableShadows: true },
};

/** The subset of dice-box's surface we rely on — kept narrow so a library
 * change breaks compilation here rather than at every call site. */
interface DiceBoxLike {
  init(): Promise<unknown>;
  roll(notation: string): Promise<Array<{ sides: number; value: number }>>;
  clear(): void;
  hide?: () => void;
  show?: () => void;
}

let boxPromise: Promise<DiceBoxLike | null> | null = null;
let loadFailed = false;

/**
 * F7.2 — lazy: the dynamic import doesn't even start until someone rolls
 * with 3D enabled, which is necessarily after first paint. Returns null
 * (never throws) when the module can't load, so callers fall back to the
 * numeric path.
 */
export async function getDiceBox(quality: DiceQuality, container: string): Promise<DiceBoxLike | null> {
  if (quality === 'off' || loadFailed) return null;
  if (!boxPromise) {
    boxPromise = (async () => {
      try {
        const { default: DiceBox } = (await import('@3d-dice/dice-box')) as {
          default: new (config: Record<string, unknown>) => DiceBoxLike;
        };
        const profile = QUALITY_PROFILES[quality];
        // Single-config constructor — the (selector, config) form is
        // deprecated in dice-box 1.1.x and only survives via a compat shim.
        const box = new DiceBox({
          container,
          assetPath: `${import.meta.env.BASE_URL}assets/dice-box/`,
          theme: 'default',
          scale: profile.scale,
          shadowQuality: profile.shadowQuality,
          enableShadows: profile.enableShadows,
          throwForce: 6,
          gravity: 1,
        });
        await box.init();
        return box;
      } catch {
        // A missing WebGL context, a blocked worker, a failed asset fetch —
        // all the same to the caller: no 3D this session (F7.2).
        loadFailed = true;
        return null;
      }
    })();
  }
  return boxPromise;
}

/** Test seam / "start over" after a failure — never called in normal flow. */
export function resetDiceBox(): void {
  boxPromise = null;
  loadFailed = false;
}

/**
 * F7.3/F7.1 — the Feat die is a generic numbered d12; 11 and 12 are read
 * as the Eye and the rune. This mapping lives here (not in the roller) so
 * `dice.ts` stays the single owner of what a Feat face *means*.
 */
export function featFaceFromD12(value: number): FeatDieFace {
  if (value === 11) return 'eye';
  if (value === 12) return 'rune';
  return value;
}

export interface Dice3dRoll {
  featDice: FeatDieFace[];
  successDice: SuccessDieFace[];
}

/**
 * How long the simulation gets before the caller gives up on it. F7.2's
 * "fully usable if it fails to load" has to cover *hanging* too, not just
 * throwing: a stalled asset fetch or a wedged worker would otherwise
 * leave the roll button dead forever. Generous enough for a first-run
 * fetch of the assets on a slow connection, short enough that a broken
 * install costs one roll's patience, once.
 */
export const DICE_3D_TIMEOUT_MS = 12000;

/** Resolves to `null` if the promise hasn't settled in time. */
export function withTimeout<T>(promise: Promise<T>, ms = DICE_3D_TIMEOUT_MS): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Rolls in the simulation and reads the resting faces — F7.1's "the result
 * comes from the simulation, not from a pre-decided value with a faked
 * animation." Returns null if 3D isn't available, and the caller then
 * rolls numerically instead.
 *
 * F7.7 — in hybrid mode callers pass successCount 0: only the Feat die is
 * thrown; the Success pool is resolved numerically.
 */
export async function rollIn3d(
  box: DiceBoxLike | null,
  featCount: number,
  successCount: number,
): Promise<Dice3dRoll | null> {
  if (!box) return null;
  const parts: string[] = [];
  if (featCount > 0) parts.push(`${featCount}d12`);
  if (successCount > 0) parts.push(`${successCount}d6`);
  if (parts.length === 0) return { featDice: [], successDice: [] };

  try {
    const results = await box.roll(parts.join('+'));
    const featDice = results.filter((r) => r.sides === 12).map((r) => featFaceFromD12(r.value));
    const successDice = results.filter((r) => r.sides === 6).map((r) => r.value as SuccessDieFace);
    if (featDice.length !== featCount || successDice.length !== successCount) return null;
    return { featDice, successDice };
  } catch {
    return null;
  }
}
