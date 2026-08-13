import { beforeEach, describe, expect, it } from 'vitest';
import {
  diceAssetPath,
  featFaceFromD12,
  getDiceBox,
  markDiceBoxUnavailable,
  resetDiceBox,
  loadDiceQuality,
  recommendedQuality,
  rollIn3d,
  saveDiceQuality,
  withTimeout,
  DICE_QUALITY_KEY,
} from './dice3d.ts';

// Note: the module itself is never imported here — these cover the pure
// seams (face mapping, settings, failure tolerance) that decide whether
// Phases 1-6 stay independent of Phase 7.

describe('featFaceFromD12 (F7.3 — generic dice, no licensed symbols)', () => {
  it('reads 11 as the Eye and 12 as the rune, leaving 1-10 numeric', () => {
    expect(featFaceFromD12(1)).toBe(1);
    expect(featFaceFromD12(10)).toBe(10);
    expect(featFaceFromD12(11)).toBe('eye');
    expect(featFaceFromD12(12)).toBe('rune');
  });

  it('covers every face of the die exactly once', () => {
    const faces = Array.from({ length: 12 }, (_, i) => featFaceFromD12(i + 1));
    expect(new Set(faces).size).toBe(12);
  });
});

describe('quality setting (F7.5)', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips through localStorage', () => {
    saveDiceQuality('high');
    expect(loadDiceQuality()).toBe('high');
    saveDiceQuality('off');
    expect(loadDiceQuality()).toBe('off');
  });

  it('defaults to off when unset or corrupt — 3D is opt-in, never a surprise download', () => {
    expect(loadDiceQuality()).toBe('off');
    localStorage.setItem(DICE_QUALITY_KEY, 'ludicrous');
    expect(loadDiceQuality()).toBe('off');
  });

  it('recommends off where the simulation cannot run at all (no WebGL/DOM here)', () => {
    expect(recommendedQuality()).toBe('off');
  });
});

describe('withTimeout (F7.2 — hanging counts as failing)', () => {
  it('passes a value through when it settles in time', async () => {
    expect(await withTimeout(Promise.resolve('ok'), 50)).toBe('ok');
  });

  it('resolves null for a rejection instead of throwing at the caller', async () => {
    expect(await withTimeout(Promise.reject(new Error('boom')), 50)).toBeNull();
  });

  it('resolves null when the promise never settles, so the roll is never stuck', async () => {
    expect(await withTimeout(new Promise(() => {}), 20)).toBeNull();
  });
});

describe('markDiceBoxUnavailable (F7.2 — a wedged module costs one roll, not every roll)', () => {
  it('short-circuits later loads until reset', async () => {
    resetDiceBox();
    markDiceBoxUnavailable();
    // 'low' would normally attempt a load; after the marker it must not.
    expect(await getDiceBox('low', '#nope')).toBeNull();
    resetDiceBox();
  });

  it('off always short-circuits regardless', async () => {
    resetDiceBox();
    expect(await getDiceBox('off', '#nope')).toBeNull();
  });
});

describe('rollIn3d (F7.1/F7.2 — simulation-sourced, failure-tolerant)', () => {
  it('returns null with no box so the caller rolls numerically', async () => {
    expect(await rollIn3d(null, 1, 3)).toBeNull();
  });

  it('reads the resting faces the simulation reports', async () => {
    const box = {
      init: async () => undefined,
      clear: () => {},
      roll: async () => [
        { sides: 12, value: 11 },
        { sides: 6, value: 4 },
        { sides: 6, value: 6 },
      ],
    };
    const result = await rollIn3d(box, 1, 2);
    expect(result).toEqual({ featDice: ['eye'], successDice: [4, 6] });
  });

  it('asks for only the Feat die when the Success pool is resolved numerically (F7.7)', async () => {
    let notation = '';
    const box = {
      init: async () => undefined,
      clear: () => {},
      roll: async (n: string) => {
        notation = n;
        return [{ sides: 12, value: 7 }];
      },
    };
    const result = await rollIn3d(box, 1, 0);
    expect(notation).toBe('1d12');
    expect(result).toEqual({ featDice: [7], successDice: [] });
  });

  it('returns null when the simulation throws or returns the wrong dice', async () => {
    const thrower = {
      init: async () => undefined,
      clear: () => {},
      roll: async () => {
        throw new Error('webgl context lost');
      },
    };
    expect(await rollIn3d(thrower, 1, 1)).toBeNull();

    const shortCount = {
      init: async () => undefined,
      clear: () => {},
      roll: async () => [{ sides: 12, value: 3 }],
    };
    expect(await rollIn3d(shortCount, 1, 2)).toBeNull();
  });
});

describe('diceAssetPath (production base-path resolution)', () => {
  it('resolves the build-time relative base to a root-relative path', () => {
    // Two bugs this guards, both production-build-only (dev has
    // BASE_URL='/'): './assets/...' reached dice-box's worker as the
    // malformed "http://host:5173./assets/...", and handing it a full
    // absolute URL instead produced "http://host:5173http://host:5173/...",
    // because dice-box prepends the origin itself. Either way the wasm
    // never loaded and every 3D roll fell back after the timeout.
    expect(diceAssetPath('./', 'http://example.com/')).toBe('/assets/dice-box/');
    expect(diceAssetPath('/', 'http://example.com/')).toBe('/assets/dice-box/');
  });

  it('honours sub-path hosting, which is why base is relative in the first place', () => {
    expect(diceAssetPath('./', 'http://example.com/wayfarer/')).toBe('/wayfarer/assets/dice-box/');
    expect(diceAssetPath('/wayfarer/', 'http://example.com/')).toBe('/wayfarer/assets/dice-box/');
  });
});
