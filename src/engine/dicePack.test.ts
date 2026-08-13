import { describe, expect, it } from 'vitest';
import {
  clearPackFace,
  createDicePack,
  DICE_FACE_KEYS,
  DicePackError,
  faceArt,
  featFaceKey,
  isSupportedImageDataUrl,
  packCoverage,
  renameDicePack,
  setPackFace,
  successFaceKey,
  validateDicePack,
} from './dicePack.ts';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const SVG = 'data:image/svg+xml,%3Csvg%2F%3E';

describe('createDicePack (F7.4)', () => {
  it('starts named and empty — every face falls back to a plain numeral', () => {
    const pack = createDicePack('Hand-inked');
    expect(pack.name).toBe('Hand-inked');
    expect(pack.faces).toEqual({});
    expect(packCoverage(pack)).toEqual({ mapped: 0, total: 18, complete: false });
  });

  it('covers all twelve Feat faces and six Success faces', () => {
    expect(DICE_FACE_KEYS).toHaveLength(18);
    expect(DICE_FACE_KEYS).toContain('feat-eye');
    expect(DICE_FACE_KEYS).toContain('feat-rune');
    expect(DICE_FACE_KEYS).toContain('feat-10');
    expect(DICE_FACE_KEYS).toContain('success-6');
  });
});

describe('editing faces', () => {
  it('sets, clears, and renames without disturbing the rest', () => {
    let pack = createDicePack('P');
    pack = setPackFace(pack, 'feat-eye', PNG);
    pack = setPackFace(pack, 'success-3', SVG);
    expect(packCoverage(pack).mapped).toBe(2);

    pack = clearPackFace(pack, 'feat-eye');
    expect(pack.faces['feat-eye']).toBeUndefined();
    expect(pack.faces['success-3']).toBe(SVG);

    pack = renameDicePack(pack, 'Renamed');
    expect(pack.name).toBe('Renamed');
    expect(pack.faces['success-3']).toBe(SVG);
  });

  it('reports completion only when every face is mapped', () => {
    let pack = createDicePack('Full');
    for (const face of DICE_FACE_KEYS) pack = setPackFace(pack, face, PNG);
    expect(packCoverage(pack)).toEqual({ mapped: 18, total: 18, complete: true });
  });
});

describe('face lookup (decoration must never break rolling)', () => {
  it('maps rolled Feat/Success values to their face keys', () => {
    expect(featFaceKey(7)).toBe('feat-7');
    expect(featFaceKey('eye')).toBe('feat-eye');
    expect(featFaceKey('rune')).toBe('feat-rune');
    expect(successFaceKey(4)).toBe('success-4');
  });

  it('returns null for no pack, and for a face the pack does not cover', () => {
    const pack = setPackFace(createDicePack('P'), 'feat-1', PNG);
    expect(faceArt(null, 'feat-1')).toBeNull();
    expect(faceArt(pack, 'feat-1')).toBe(PNG);
    expect(faceArt(pack, 'feat-2')).toBeNull();
  });
});

describe('validateDicePack (C4 — the boundary for third-party packs)', () => {
  it('accepts a well-formed pack', () => {
    const pack = setPackFace(createDicePack('Good'), 'feat-rune', PNG);
    expect(validateDicePack(JSON.parse(JSON.stringify(pack)))).toEqual(pack);
  });

  it('rejects non-objects, missing id, and blank names', () => {
    expect(() => validateDicePack(null)).toThrow(DicePackError);
    expect(() => validateDicePack({ name: 'x', faces: {} })).toThrow(/id/);
    expect(() => validateDicePack({ id: 'a', name: '  ', faces: {} })).toThrow(/name/);
    expect(() => validateDicePack({ id: 'a', name: 'x' })).toThrow(/faces/);
  });

  it('rejects unknown face keys rather than silently dropping them', () => {
    expect(() => validateDicePack({ id: 'a', name: 'x', faces: { 'feat-13': PNG } })).toThrow(
      /Unknown die face/,
    );
  });

  it('rejects payloads that are not supported image data URLs', () => {
    expect(() => validateDicePack({ id: 'a', name: 'x', faces: { 'feat-1': 'https://evil/x.png' } })).toThrow(
      /data URL/,
    );
    expect(() =>
      validateDicePack({ id: 'a', name: 'x', faces: { 'feat-1': 'data:text/html,<script>' } }),
    ).toThrow(/data URL/);
  });

  it('accepts every image type the editor offers', () => {
    expect(isSupportedImageDataUrl(PNG)).toBe(true);
    expect(isSupportedImageDataUrl(SVG)).toBe(true);
    expect(isSupportedImageDataUrl('data:image/jpeg;base64,/9j/')).toBe(true);
    expect(isSupportedImageDataUrl('data:image/webp;base64,UklGR')).toBe(true);
    expect(isSupportedImageDataUrl('data:application/json,{}')).toBe(false);
  });
});
