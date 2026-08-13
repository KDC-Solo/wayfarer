// Durability for local-first data (N5/C5). Everything the player owns —
// their chronicle, and the table text they transcribed from their own
// book — lives in IndexedDB, which browsers are free to evict under
// storage pressure unless the origin is marked persistent.
//
// Asking is cheap and silent in Chromium (granted on engagement
// heuristics); Firefox may prompt. A refusal is not an error: the data
// is still saved, just evictable, so nothing here throws or blocks.

export type PersistenceState = 'persisted' | 'best-effort' | 'unsupported';

export async function currentPersistence(): Promise<PersistenceState> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return 'unsupported';
  try {
    return (await navigator.storage.persisted()) ? 'persisted' : 'best-effort';
  } catch {
    return 'unsupported';
  }
}

/**
 * Ask the browser to keep this origin's storage. Call it after the
 * player has something worth keeping — the request is judged on
 * engagement, so asking before they've done anything tends to be denied.
 */
export async function requestPersistence(): Promise<PersistenceState> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return 'unsupported';
  try {
    if (await navigator.storage.persisted()) return 'persisted';
    return (await navigator.storage.persist()) ? 'persisted' : 'best-effort';
  } catch {
    return 'unsupported';
  }
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

/** For an honest "where does my data live" readout. */
export async function storageUsage(): Promise<StorageUsage | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usedBytes: usage ?? 0, quotaBytes: quota ?? 0 };
  } catch {
    return null;
  }
}
