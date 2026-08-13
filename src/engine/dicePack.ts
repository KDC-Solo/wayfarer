// F7.4 — user-supplied dice texture packs: face images the player imports
// and maps to die faces, saved under a name. Part of Phase 7 (optional
// polish), so nothing outside the 3D module may depend on this.
//
// C1/C5 both bear on this module. C1: we ship no face art at all — every
// image here is the user's own file, and a pack with the Eye and rune
// faces drawn in is *their* transcription, exactly like table text. C5:
// images never leave the device; they live in IndexedDB and travel only
// through the user's own export file.

/**
 * Die faces a pack can carry art for. The Feat die is a d12 whose 11th
 * and 12th faces are the Eye and the rune (see dice3d.ts), so packs
 * address them by name rather than by number — the player is painting
 * "the Eye," not "face 11."
 */
export type DiceFaceKey =
  | 'feat-1' | 'feat-2' | 'feat-3' | 'feat-4' | 'feat-5'
  | 'feat-6' | 'feat-7' | 'feat-8' | 'feat-9' | 'feat-10'
  | 'feat-eye' | 'feat-rune'
  | 'success-1' | 'success-2' | 'success-3' | 'success-4' | 'success-5' | 'success-6';

export const FEAT_FACE_KEYS: readonly DiceFaceKey[] = [
  'feat-1', 'feat-2', 'feat-3', 'feat-4', 'feat-5', 'feat-6',
  'feat-7', 'feat-8', 'feat-9', 'feat-10', 'feat-eye', 'feat-rune',
];

export const SUCCESS_FACE_KEYS: readonly DiceFaceKey[] = [
  'success-1', 'success-2', 'success-3', 'success-4', 'success-5', 'success-6',
];

export const DICE_FACE_KEYS: readonly DiceFaceKey[] = [...FEAT_FACE_KEYS, ...SUCCESS_FACE_KEYS];

export const DICE_FACE_LABEL: Record<DiceFaceKey, string> = {
  'feat-1': 'Feat 1', 'feat-2': 'Feat 2', 'feat-3': 'Feat 3', 'feat-4': 'Feat 4',
  'feat-5': 'Feat 5', 'feat-6': 'Feat 6', 'feat-7': 'Feat 7', 'feat-8': 'Feat 8',
  'feat-9': 'Feat 9', 'feat-10': 'Feat 10',
  'feat-eye': 'Feat — Eye', 'feat-rune': 'Feat — rune',
  'success-1': 'Success 1', 'success-2': 'Success 2', 'success-3': 'Success 3',
  'success-4': 'Success 4', 'success-5': 'Success 5', 'success-6': 'Success 6',
};

/** Only formats every target browser can decode into a texture. */
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/**
 * Face images are held as data URLs rather than Blobs so a pack is a
 * plain JSON value: it round-trips through the export envelope (F6.4)
 * and the documented pack schema (C4) with no binary side-channel.
 */
export interface DicePack {
  id: string;
  name: string;
  /** Face key → data URL. Sparse: unmapped faces fall back to the
   * generic shipped dice, so a half-finished pack is still usable. */
  faces: Partial<Record<DiceFaceKey, string>>;
  createdAt: string;
}

export function createDicePack(name: string): DicePack {
  return { id: crypto.randomUUID(), name, faces: {}, createdAt: new Date().toISOString() };
}

export function setPackFace(pack: DicePack, face: DiceFaceKey, dataUrl: string): DicePack {
  return { ...pack, faces: { ...pack.faces, [face]: dataUrl } };
}

export function clearPackFace(pack: DicePack, face: DiceFaceKey): DicePack {
  const faces = { ...pack.faces };
  delete faces[face];
  return { ...pack, faces };
}

export function renameDicePack(pack: DicePack, name: string): DicePack {
  return { ...pack, name };
}

/** How far along the player is — drives the editor's progress readout. */
export function packCoverage(pack: DicePack): { mapped: number; total: number; complete: boolean } {
  const mapped = DICE_FACE_KEYS.filter((k) => !!pack.faces[k]).length;
  return { mapped, total: DICE_FACE_KEYS.length, complete: mapped === DICE_FACE_KEYS.length };
}

export class DicePackError extends Error {}

/**
 * Validates an imported/authored pack before it's stored. Third parties
 * can author packs against the published schema (C4), so this is the
 * boundary that keeps a malformed one from reaching the renderer:
 * unknown face keys and non-image payloads are rejected rather than
 * silently ignored.
 */
export function validateDicePack(value: unknown): DicePack {
  if (typeof value !== 'object' || value === null) throw new DicePackError('Pack is not an object.');
  const pack = value as Partial<DicePack>;
  if (typeof pack.id !== 'string' || !pack.id) throw new DicePackError('Pack is missing an id.');
  if (typeof pack.name !== 'string' || !pack.name.trim()) throw new DicePackError('Pack is missing a name.');
  if (typeof pack.faces !== 'object' || pack.faces === null) throw new DicePackError('Pack has no faces map.');

  const faces: Partial<Record<DiceFaceKey, string>> = {};
  for (const [key, dataUrl] of Object.entries(pack.faces)) {
    if (!DICE_FACE_KEYS.includes(key as DiceFaceKey)) {
      throw new DicePackError(`Unknown die face "${key}".`);
    }
    if (typeof dataUrl !== 'string' || !isSupportedImageDataUrl(dataUrl)) {
      throw new DicePackError(`Face "${key}" is not an image data URL of a supported type.`);
    }
    faces[key as DiceFaceKey] = dataUrl;
  }
  return {
    id: pack.id,
    name: pack.name,
    faces,
    createdAt: typeof pack.createdAt === 'string' ? pack.createdAt : new Date().toISOString(),
  };
}

/** Face key for a rolled Feat die face — the bridge between `dice.ts`'s
 * face values and a pack's art. */
export function featFaceKey(face: number | 'eye' | 'rune'): DiceFaceKey {
  return `feat-${face}` as DiceFaceKey;
}

export function successFaceKey(face: number): DiceFaceKey {
  return `success-${face}` as DiceFaceKey;
}

/** The art for a face, or null to mean "draw the plain numeral." Always
 * null-tolerant: a pack is optional decoration, never required to roll. */
export function faceArt(pack: DicePack | null, face: DiceFaceKey): string | null {
  return pack?.faces[face] ?? null;
}

export function isSupportedImageDataUrl(value: string): boolean {
  const match = /^data:([^;,]+)[;,]/.exec(value);
  return !!match && SUPPORTED_IMAGE_TYPES.includes(match[1]);
}
