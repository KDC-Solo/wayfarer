import { useEffect, useRef, useState } from 'react';
import { addHero, getActiveHero, removeHero, setActiveHero } from './engine/company.ts';
import { createChronicle, setDiceInputMode } from './engine/chronicle.ts';
import {
  changeResource,
  recordOracleAnswer,
  recordSkillRoll,
  recordTableRoll,
  undoResourceChange,
} from './engine/actions.ts';
import { createLogEntry } from './engine/log.ts';
import {
  appendLogEntry,
  deleteOracleTable,
  getAllLogEntries,
  getAllOracleTables,
  getChronicle,
  putChronicle,
  putOracleTable,
} from './engine/persistence.ts';
import { exportState, importState, serializeState } from './engine/export.ts';
import type { SkillRollResult } from './engine/dice.ts';
import type { TellingTableResult } from './engine/tellingTable.ts';
import type { OracleTable } from './engine/oracleTable.ts';
import type { ResourceField } from './engine/resources.ts';
import type { Chronicle, DiceInputMode, Hero, LogEntry } from './engine/types.ts';
import { defaultOracleTables } from './data/oracleTables.ts';
import { CompanyOverview } from './ui/CompanyOverview.tsx';
import { HeroForm } from './ui/HeroForm.tsx';
import { RollPanel } from './ui/RollPanel.tsx';
import { OraclePanel } from './ui/OraclePanel.tsx';
import { TableRoller } from './ui/TableRoller.tsx';
import { TableEditor } from './ui/TableEditor.tsx';

export default function App() {
  const [chronicle, setChronicle] = useState<Chronicle | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [oracleTables, setOracleTables] = useState<OracleTable[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [showHeroForm, setShowHeroForm] = useState(false);
  const [lastResourceChange, setLastResourceChange] = useState<LogEntry | null>(null);
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

    let tables = await getAllOracleTables();
    if (tables.length === 0) {
      tables = defaultOracleTables();
      for (const t of tables) await putOracleTable(t);
    }
    setOracleTables(tables);
  }

  useEffect(() => {
    refresh().catch((err) => setStatus(`Failed to load: ${String(err)}`));
  }, []);

  async function persist(next: Chronicle, entry?: LogEntry) {
    await putChronicle(next);
    if (entry) {
      await appendLogEntry(entry);
      setLog((l) => [...l, entry]);
    }
    setChronicle(next);
  }

  async function handleAddHero(hero: Hero) {
    if (!chronicle) return;
    const next = addHero(chronicle, hero);
    const entry = createLogEntry({
      type: 'company-change',
      heroId: hero.id,
      payload: { action: 'add', heroName: hero.name },
    });
    await persist(next, entry);
    setShowHeroForm(false);
  }

  async function handleRemoveHero(heroId: string) {
    if (!chronicle) return;
    const hero = chronicle.company.find((h) => h.id === heroId);
    const next = removeHero(chronicle, heroId);
    const entry = createLogEntry({
      type: 'company-change',
      heroId,
      payload: { action: 'remove', heroName: hero?.name },
    });
    await persist(next, entry);
  }

  async function handleSetActive(heroId: string) {
    if (!chronicle) return;
    await persist(setActiveHero(chronicle, heroId));
  }

  async function handleResourceDelta(heroId: string, field: ResourceField, delta: number) {
    if (!chronicle) return;
    const { chronicle: next, logEntry } = changeResource(
      chronicle,
      heroId,
      field,
      delta,
      chronicle.diceInputMode,
    );
    await persist(next, logEntry);
    setLastResourceChange(logEntry);
  }

  async function handleUndo() {
    if (!chronicle || !lastResourceChange) return;
    const { chronicle: next, logEntry } = undoResourceChange(chronicle, lastResourceChange);
    await persist(next, logEntry);
    setLastResourceChange(null); // single-step (F1.17) — no redo/multi-level chain
  }

  async function handleDiceModeChange(mode: DiceInputMode) {
    if (!chronicle) return;
    await persist(setDiceInputMode(chronicle, mode));
  }

  async function handleRollResolved(params: {
    skillName: string;
    result: SkillRollResult;
    inputMode: DiceInputMode;
  }) {
    if (!chronicle) return;
    const activeHero = getActiveHero(chronicle);
    if (!activeHero) return;
    const entry = recordSkillRoll(activeHero.id, params.skillName, params.result, params.inputMode);
    await persist(chronicle, entry);
  }

  async function handleOracleLog(result: TellingTableResult, prose: string) {
    if (!chronicle) return;
    const entry = recordOracleAnswer(result, chronicle.diceInputMode, prose || undefined);
    await persist(chronicle, entry);
  }

  async function handleTableRollLog(params: {
    tableId: string;
    tableName: string;
    key: number | 'eye' | 'rune';
    text: string;
    prose: string;
  }) {
    if (!chronicle) return;
    const entry = recordTableRoll(
      params.tableId,
      params.tableName,
      params.key,
      { text: params.text },
      chronicle.diceInputMode,
      params.prose || undefined,
    );
    await persist(chronicle, entry);
  }

  async function handleCreateTable(table: OracleTable) {
    await putOracleTable(table);
    setOracleTables((t) => [...t, table]);
  }

  async function handleUpdateTable(table: OracleTable) {
    await putOracleTable(table);
    setOracleTables((t) => t.map((existing) => (existing.id === table.id ? table : existing)));
  }

  async function handleDeleteTable(id: string) {
    await deleteOracleTable(id);
    setOracleTables((t) => t.filter((table) => table.id !== id));
  }

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

  const activeHero = getActiveHero(chronicle);

  return (
    <main>
      <h1>Wayfarer</h1>
      <p>Strider Mode Companion.</p>

      <CompanyOverview
        chronicle={chronicle}
        onSetActive={handleSetActive}
        onRemove={handleRemoveHero}
        onResourceDelta={handleResourceDelta}
        onUndo={handleUndo}
        canUndo={lastResourceChange !== null}
        onDiceModeChange={handleDiceModeChange}
        onAddHero={() => setShowHeroForm(true)}
      />

      {showHeroForm && <HeroForm onCreate={handleAddHero} onCancel={() => setShowHeroForm(false)} />}

      {activeHero && (
        <RollPanel
          hero={activeHero}
          companySize={chronicle.company.length}
          diceInputMode={chronicle.diceInputMode}
          onResolved={handleRollResolved}
        />
      )}

      <OraclePanel diceInputMode={chronicle.diceInputMode} onLog={handleOracleLog} />

      <TableRoller tables={oracleTables} onLog={handleTableRollLog} />

      <TableEditor
        tables={oracleTables}
        onCreate={handleCreateTable}
        onUpdate={handleUpdateTable}
        onDelete={handleDeleteTable}
      />

      <footer>
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
        <p>{log.length} log entries.</p>
        {status && <p role="status">{status}</p>}
      </footer>
    </main>
  );
}
