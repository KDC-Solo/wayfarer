import { useEffect, useRef, useState } from 'react';
import { createChronicle } from './engine/chronicle.ts';
import { createLogEntry } from './engine/log.ts';
import { appendLogEntry, getAllLogEntries, getChronicle, putChronicle } from './engine/persistence.ts';
import { exportState, importState, serializeState } from './engine/export.ts';
import type { Chronicle, LogEntry } from './engine/types.ts';

// Milestone 0 (Foundations): app shell, persistence layer, log entity,
// export/import. Deliberately not user-facing yet — this screen exists to
// prove the plumbing works. Phase 1 replaces it with the real hero/company UI.

export default function App() {
  const [chronicle, setChronicle] = useState<Chronicle | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    let c = await getChronicle();
    if (!c) {
      c = createChronicle();
      await putChronicle(c);
      await appendLogEntry(createLogEntry({ type: 'system', prose: 'Chronicle created.' }));
    }
    setChronicle(c);
    setLog(await getAllLogEntries());
  }

  useEffect(() => {
    refresh().catch((err) => setStatus(`Failed to load: ${String(err)}`));
  }, []);

  async function handleExport() {
    const envelope = await exportState();
    const blob = new Blob([serializeState(envelope)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wayfarer-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    try {
      await importState(await file.text());
      await refresh();
      setStatus('Import complete.');
    } catch (err) {
      setStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!chronicle) return <p>Loading…</p>;

  return (
    <main>
      <h1>Wayfarer</h1>
      <p>Strider Mode Companion — foundations laid, nothing to play yet.</p>

      <dl>
        <dt>Chronicle</dt>
        <dd>{chronicle.id}</dd>
        <dt>Created</dt>
        <dd>{new Date(chronicle.createdAt).toLocaleString()}</dd>
        <dt>Log entries</dt>
        <dd>{log.length}</dd>
      </dl>

      <button onClick={handleExport}>Export state</button>{' '}
      <button onClick={() => fileInputRef.current?.click()}>Import state</button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file);
          e.target.value = '';
        }}
      />

      {status && <p role="status">{status}</p>}
    </main>
  );
}
