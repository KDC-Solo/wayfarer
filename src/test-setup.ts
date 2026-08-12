// Polyfills IndexedDB for the vitest 'node' environment so the persistence
// layer can be tested without a browser.
import 'fake-indexeddb/auto';
