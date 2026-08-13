// Polyfills IndexedDB for the vitest 'node' environment so the persistence
// layer can be tested without a browser.
import 'fake-indexeddb/auto';

// localStorage is used for small settings (PRD §9) — the 3D dice quality
// setting, the default-content seed markers. A minimal in-memory stand-in
// keeps those testable without pulling in a full DOM environment.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}
