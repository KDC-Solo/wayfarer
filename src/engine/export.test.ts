import { beforeEach, describe, expect, it } from 'vitest';
import { createChronicle } from './chronicle.ts';
import { createLogEntry } from './log.ts';
import { appendLogEntry, clearAll, getAllLogEntries, getChronicle, putChronicle } from './persistence.ts';
import { exportState, importState, ImportError, parseStateEnvelope, serializeState } from './export.ts';

beforeEach(async () => {
  await clearAll();
});

describe('exportState', () => {
  it('refuses to export when nothing has been created yet', async () => {
    await expect(exportState()).rejects.toThrow('No chronicle to export');
  });

  it('bundles the current chronicle and log', async () => {
    const chronicle = createChronicle();
    await putChronicle(chronicle);
    const entry = createLogEntry({ type: 'system' });
    await appendLogEntry(entry);

    const envelope = await exportState();
    expect(envelope.format).toBe('wayfarer-export');
    expect(envelope.chronicle).toEqual(chronicle);
    expect(envelope.log).toEqual([entry]);
  });
});

describe('parseStateEnvelope', () => {
  it('rejects invalid JSON', () => {
    expect(() => parseStateEnvelope('not json')).toThrow(ImportError);
  });

  it('rejects a file that is not a Wayfarer export', () => {
    expect(() => parseStateEnvelope(JSON.stringify({ hello: 'world' }))).toThrow(ImportError);
  });

  it('rejects a schema version newer than this app supports', () => {
    const future = { format: 'wayfarer-export', schemaVersion: 999, chronicle: {}, log: [] };
    expect(() => parseStateEnvelope(JSON.stringify(future))).toThrow(/newer version/);
  });
});

describe('export/import round trip', () => {
  it('restores an identical chronicle and log after export → import', async () => {
    const chronicle = { ...createChronicle(), currentYear: 2953, currentLocation: 'Bree' };
    await putChronicle(chronicle);
    const entries = [
      createLogEntry({ type: 'roll', heroId: 'h1' }),
      createLogEntry({ type: 'prose', prose: 'The road goes ever on.' }),
    ];
    for (const e of entries) await appendLogEntry(e);

    const json = serializeState(await exportState());

    await clearAll();
    expect(await getChronicle()).toBeUndefined();

    await importState(json);

    expect(await getChronicle()).toEqual(chronicle);
    const restoredLog = await getAllLogEntries();
    expect(restoredLog.map((e) => e.id).sort()).toEqual(entries.map((e) => e.id).sort());
  });

  it('replaces existing state rather than merging with it', async () => {
    await putChronicle(createChronicle());
    await appendLogEntry(createLogEntry({ type: 'system' }));
    const json = serializeState(await exportState());

    // Simulate a different local campaign in progress...
    await clearAll();
    const other = createChronicle();
    await putChronicle(other);
    await appendLogEntry(createLogEntry({ type: 'system' }));
    await appendLogEntry(createLogEntry({ type: 'system' }));

    // ...importing replaces it wholesale, not merges.
    await importState(json);
    expect(await getChronicle()).not.toEqual(other);
    expect(await getAllLogEntries()).toHaveLength(1);
  });
});
