import { useEffect, useRef, useState } from 'react';
import { addHero, getActiveHero, removeHero, setActiveHero } from './engine/company.ts';
import { createQuickStartHero } from './engine/hero.ts';
import { advanceYear, createChronicle, currentSessionId, setDiceInputMode, startSession } from './engine/chronicle.ts';
import {
  changeResource,
  recordLoreRoll,
  recordOracleAnswer,
  recordSkillRoll,
  recordTableRoll,
  undoResourceChange,
} from './engine/actions.ts';
import { createFellowshipPhase, type FellowshipPhase } from './engine/fellowshipPhase.ts';
import type { Combat } from './engine/combat.ts';
import { createLoreTable, type LoreRollResult, type LoreTable } from './engine/loreTable.ts';
import type { DicePack } from './engine/dicePack.ts';
import { createLogEntry } from './engine/log.ts';
import {
  appendLogEntry,
  deleteOracleTable,
  deleteStepTemplate,
  getAllCombats,
  getAllFellowshipPhases,
  getAllJourneys,
  getAllLogEntries,
  getAllDicePacks,
  getAllLoreTables,
  getAllOracleTables,
  getAllRoutes,
  getAllStepTemplates,
  getChronicle,
  putChronicle,
  putCombat,
  putFellowshipPhase,
  putJourney,
  deleteDicePack,
  putDicePack,
  putLoreTable,
  putOracleTable,
  putRoute,
  putStepTemplate,
} from './engine/persistence.ts';
import { exportState, importContentPack, importState, serializeState } from './engine/export.ts';
import type { SkillRollResult } from './engine/dice.ts';
import type { TellingTableResult } from './engine/tellingTable.ts';
import type { OracleTable } from './engine/oracleTable.ts';
import type { Journey, Route } from './engine/journey.ts';
import type { StepTemplate } from './engine/stepTemplate.ts';
import type { ResourceField } from './engine/resources.ts';
import type { Chronicle, DiceInputMode, Hero, LogEntry } from './engine/types.ts';
import { defaultOracleTables } from './data/oracleTables.ts';
import { defaultJourneyContent } from './data/journeyStepTemplates.ts';
import { defaultFellowshipStepTemplate } from './data/fellowshipStepTemplate.ts';
import { defaultCombatStepTemplate } from './data/combatStepTemplate.ts';
import { CompanyOverview } from './ui/CompanyOverview.tsx';
import { HeroForm } from './ui/HeroForm.tsx';
import { RollPanel } from './ui/RollPanel.tsx';
import { OraclePanel } from './ui/OraclePanel.tsx';
import { TableRoller } from './ui/TableRoller.tsx';
import { TableEditor } from './ui/TableEditor.tsx';
import { JourneyPlanner } from './ui/JourneyPlanner.tsx';
import { JourneyRunner } from './ui/JourneyRunner.tsx';
import { StepTemplateEditor } from './ui/StepTemplateEditor.tsx';
import { FellowshipPlanner } from './ui/FellowshipPlanner.tsx';
import { FellowshipRunner } from './ui/FellowshipRunner.tsx';
import { CombatPlanner } from './ui/CombatPlanner.tsx';
import { CombatRunner } from './ui/CombatRunner.tsx';
import { ChroniclePanel } from './ui/ChroniclePanel.tsx';
import { LorePanel } from './ui/LorePanel.tsx';
import { DicePackEditor } from './ui/DicePackEditor.tsx';
import { Nav, type TabId } from './ui/Nav.tsx';
import { BrandMark } from './ui/BrandMark.tsx';
import { Welcome } from './ui/Welcome.tsx';
import { Toast, type ToastMessage } from './ui/Toast.tsx';
import { requestPersistence } from './engine/storage.ts';

const COMBAT_TEMPLATE_SEEDED_KEY = 'wayfarer.seeded.combat-template';
const LORE_TABLE_SEEDED_KEY = 'wayfarer.seeded.lore-table';
const INITIAL_SEED_KEY = 'wayfarer.seeded.initial';

/**
 * Claims the right to seed default content, synchronously and exactly
 * once per browser. `refresh()` used to gate on `tables.length === 0`,
 * which is an *async* read: React's StrictMode double-invokes the mount
 * effect, both passes saw an empty store, and both seeded — leaving two
 * of every default table. localStorage is synchronous, so the second
 * caller loses the race before it can write anything.
 */
function claimInitialSeed(): boolean {
  if (localStorage.getItem(INITIAL_SEED_KEY)) return false;
  localStorage.setItem(INITIAL_SEED_KEY, '1');
  return true;
}
// Which pack is active is a small setting, so localStorage (PRD §9); the
// packs themselves are user content and live in IndexedDB.
const ACTIVE_DICE_PACK_KEY = 'wayfarer.dicePack.active';

export default function App() {
  const [tab, setTab] = useState<TabId>('company');
  const [chronicle, setChronicle] = useState<Chronicle | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [oracleTables, setOracleTables] = useState<OracleTable[]>([]);
  const [loreTables, setLoreTables] = useState<LoreTable[]>([]);
  const [dicePacks, setDicePacks] = useState<DicePack[]>([]);
  const [activeDicePackId, setActiveDicePackId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_DICE_PACK_KEY),
  );
  const [stepTemplates, setStepTemplates] = useState<StepTemplate[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [fellowshipPhases, setFellowshipPhases] = useState<FellowshipPhase[]>([]);
  const [activeFellowshipPhaseId, setActiveFellowshipPhaseId] = useState<string | null>(null);
  const [combats, setCombats] = useState<Combat[]>([]);
  const [activeCombatId, setActiveCombatId] = useState<string | null>(null);
  const [status, setStatus] = useState<ToastMessage | null>(null);
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
    let templates = await getAllStepTemplates();
    if (tables.length === 0 && claimInitialSeed()) {
      const { tables: journeyTables, template: journeyTemplate } = defaultJourneyContent();
      tables = [...defaultOracleTables(), ...journeyTables];
      for (const t of tables) await putOracleTable(t);
      const fellowshipTemplate = defaultFellowshipStepTemplate();
      templates = [journeyTemplate, fellowshipTemplate, defaultCombatStepTemplate()];
      for (const t of templates) await putStepTemplate(t);
    } else if (tables.length > 0 && !localStorage.getItem(COMBAT_TEMPLATE_SEEDED_KEY)) {
      // Campaigns started before Phase 5 shipped already pass the first-run
      // check above, so the combat template gets its own one-time seed. The
      // marker (localStorage is for small settings, PRD §9) rather than a
      // "does one exist" scan means deleting the template is respected.
      const combatTemplate = defaultCombatStepTemplate();
      await putStepTemplate(combatTemplate);
      templates = [...templates, combatTemplate];
    }
    localStorage.setItem(COMBAT_TEMPLATE_SEEDED_KEY, '1');
    if (tables.length === 0) {
      // Lost the seed race — re-read what the winning pass wrote.
      tables = await getAllOracleTables();
      templates = await getAllStepTemplates();
    }
    setOracleTables(tables);
    setStepTemplates(templates);

    // Same upgrade-seed pattern as the combat template: the Lore Table
    // skeleton appears once for campaigns that predate it.
    let loadedLoreTables = await getAllLoreTables();
    if (loadedLoreTables.length === 0 && !localStorage.getItem(LORE_TABLE_SEEDED_KEY)) {
      localStorage.setItem(LORE_TABLE_SEEDED_KEY, '1');
      const loreTable = createLoreTable();
      await putLoreTable(loreTable);
      loadedLoreTables = [loreTable];
    } else if (loadedLoreTables.length === 0) {
      loadedLoreTables = await getAllLoreTables();
    }
    setLoreTables(loadedLoreTables);

    setDicePacks(await getAllDicePacks());

    const loadedJourneys = await getAllJourneys();
    setJourneys(loadedJourneys);
    setActiveJourneyId(
      loadedJourneys.find((j) => j.status === 'in-progress' || j.status === 'paused')?.id ?? null,
    );
    setRoutes(await getAllRoutes());

    const loadedFellowshipPhases = await getAllFellowshipPhases();
    setFellowshipPhases(loadedFellowshipPhases);
    setActiveFellowshipPhaseId(
      loadedFellowshipPhases.find((p) => p.status === 'in-progress')?.id ?? null,
    );

    const loadedCombats = await getAllCombats();
    setCombats(loadedCombats);
    setActiveCombatId(loadedCombats.find((c) => c.status === 'in-progress')?.id ?? null);
  }

  useEffect(() => {
    refresh().catch((err) => setStatus({ tone: 'error', text: `Failed to load: ${String(err)}` }));
    // Ask the browser not to evict this origin. Everything the player
    // owns is local, so eviction is data loss (see engine/storage.ts).
    void requestPersistence();
  }, []);

  /** F6.1 — every entry persisted while a session is open is stamped with
   * it here, at the single persistence choke point, so the pure action
   * layer never needs to know about sessions. */
  function stampSession(entry: LogEntry, c: Chronicle): LogEntry {
    const sessionId = currentSessionId(c);
    return entry.sessionId || !sessionId ? entry : { ...entry, sessionId };
  }

  async function persist(next: Chronicle, entry?: LogEntry) {
    await putChronicle(next);
    if (entry) {
      const stamped = stampSession(entry, next);
      await appendLogEntry(stamped);
      setLog((l) => [...l, stamped]);
    }
    setChronicle(next);
  }

  /** The activation path: name in, playable hero out, straight to the
   * Company tab with a roll ready. */
  async function handleQuickStart(name: string) {
    await handleAddHero(createQuickStartHero(name));
    setTab('company');
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

  async function handleUpdateLoreTable(table: LoreTable) {
    await putLoreTable(table);
    setLoreTables((t) => t.map((existing) => (existing.id === table.id ? table : existing)));
  }

  async function handleLoreRollLog(params: { table: LoreTable; result: LoreRollResult; prose: string }) {
    if (!chronicle) return;
    const entry = recordLoreRoll(
      params.result,
      params.table.id,
      params.table.name,
      chronicle.diceInputMode,
      params.prose || undefined,
    );
    await persist(chronicle, entry);
  }

  async function handleCreateDicePack(pack: DicePack) {
    await putDicePack(pack);
    setDicePacks((p) => [...p, pack]);
  }

  async function handleUpdateDicePack(pack: DicePack) {
    await putDicePack(pack);
    setDicePacks((p) => p.map((existing) => (existing.id === pack.id ? pack : existing)));
  }

  async function handleDeleteDicePack(id: string) {
    await deleteDicePack(id);
    setDicePacks((p) => p.filter((pack) => pack.id !== id));
    if (activeDicePackId === id) handleSetActiveDicePack(null);
  }

  function handleSetActiveDicePack(id: string | null) {
    setActiveDicePackId(id);
    if (id) localStorage.setItem(ACTIVE_DICE_PACK_KEY, id);
    else localStorage.removeItem(ACTIVE_DICE_PACK_KEY);
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

  async function handleCreateStepTemplate(template: StepTemplate) {
    await putStepTemplate(template);
    setStepTemplates((t) => [...t, template]);
  }

  async function handleUpdateStepTemplate(template: StepTemplate) {
    await putStepTemplate(template);
    setStepTemplates((t) => t.map((existing) => (existing.id === template.id ? template : existing)));
  }

  async function handleDeleteStepTemplate(id: string) {
    await deleteStepTemplate(id);
    setStepTemplates((t) => t.filter((template) => template.id !== id));
  }

  async function handleBeginJourney(journey: Journey) {
    await putJourney(journey);
    setJourneys((j) => [...j, journey]);
    setActiveJourneyId(journey.id);
    setTab('journey');
  }

  async function handleJourneyApply(params: { chronicle: Chronicle; journey: Journey; logEntries: LogEntry[] }) {
    await putChronicle(params.chronicle);
    await putJourney(params.journey);
    const stamped = params.logEntries.map((e) => stampSession(e, params.chronicle));
    for (const entry of stamped) {
      await appendLogEntry(entry);
    }
    setChronicle(params.chronicle);
    setJourneys((j) => j.map((existing) => (existing.id === params.journey.id ? params.journey : existing)));
    if (stamped.length > 0) {
      setLog((l) => [...l, ...stamped]);
    }
  }

  async function handleSaveRoute(route: Route) {
    await putRoute(route);
    setRoutes((r) => [...r, route]);
  }

  async function handleBeginCombat(combat: Combat) {
    if (!chronicle) return;
    await putCombat(combat);
    const entry = stampSession(
      createLogEntry({
        type: 'combat-event',
        prose: `Combat begins: ${combat.name}.`,
        journeyId: combat.id,
      }),
      chronicle,
    );
    await appendLogEntry(entry);
    setLog((l) => [...l, entry]);
    setCombats((c) => [...c, combat]);
    setActiveCombatId(combat.id);
    setTab('combat');
  }

  async function handleCombatApply(params: { chronicle: Chronicle; combat: Combat; logEntries: LogEntry[] }) {
    await putChronicle(params.chronicle);
    await putCombat(params.combat);
    const stamped = params.logEntries.map((e) => stampSession(e, params.chronicle));
    for (const entry of stamped) {
      await appendLogEntry(entry);
    }
    setChronicle(params.chronicle);
    setCombats((c) => c.map((existing) => (existing.id === params.combat.id ? params.combat : existing)));
    if (stamped.length > 0) {
      setLog((l) => [...l, ...stamped]);
    }
  }

  async function handleBeginFellowshipPhase(stepTemplateId: string) {
    if (!chronicle) return;
    const nextChronicle = advanceYear(chronicle);
    const phase = createFellowshipPhase({
      year: nextChronicle.currentYear,
      location: nextChronicle.currentLocation,
      stepTemplateId,
      heroIds: nextChronicle.company.map((h) => h.id),
    });
    await putChronicle(nextChronicle);
    await putFellowshipPhase(phase);
    setChronicle(nextChronicle);
    setFellowshipPhases((p) => [...p, phase]);
    setActiveFellowshipPhaseId(phase.id);
    setTab('fellowship');
  }

  async function handleFellowshipApply(params: {
    chronicle: Chronicle;
    phase: FellowshipPhase;
    logEntries: LogEntry[];
  }) {
    await putChronicle(params.chronicle);
    await putFellowshipPhase(params.phase);
    const stamped = params.logEntries.map((e) => stampSession(e, params.chronicle));
    for (const entry of stamped) {
      await appendLogEntry(entry);
    }
    setChronicle(params.chronicle);
    setFellowshipPhases((p) => p.map((existing) => (existing.id === params.phase.id ? params.phase : existing)));
    if (stamped.length > 0) {
      setLog((l) => [...l, ...stamped]);
    }
  }

  async function handleStartSession() {
    if (!chronicle) return;
    const { chronicle: next, sessionId } = startSession(chronicle);
    const entry = createLogEntry({
      type: 'system',
      prose: `Session ${next.sessionList.length} begins.`,
      sessionId,
    });
    await persist(next, entry);
  }

  async function handleAddProse(prose: string) {
    if (!chronicle) return;
    await persist(chronicle, createLogEntry({ type: 'prose', prose }));
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

  async function handleImportPack(file: File) {
    try {
      const r = await importContentPack(await file.text());
      await refresh();
      const bits = [
        r.tablesFilled && `filled ${r.tablesFilled} tables`,
        r.tablesAdded && `added ${r.tablesAdded}`,
        r.loreTablesFilled && 'filled the Lore Table',
      ].filter(Boolean);
      setStatus({ tone: 'success', text: `Table content imported — ${bits.join(', ')}. Saved to this browser.` });
    } catch (err) {
      setStatus({ tone: 'error', text: `Import failed: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  async function handleImportFile(file: File) {
    try {
      await importState(await file.text());
      await refresh();
      setStatus({ tone: 'success', text: 'Everything restored from your backup file.' });
    } catch (err) {
      setStatus({ tone: 'error', text: `Import failed: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  if (!chronicle) return <p>Loading…</p>;

  const activeHero = getActiveHero(chronicle);
  const activeJourney = journeys.find((j) => j.id === activeJourneyId) ?? null;
  const activeJourneyTemplate = activeJourney
    ? (stepTemplates.find((t) => t.id === activeJourney.stepTemplateId) ?? null)
    : null;
  const activeFellowshipPhase = fellowshipPhases.find((p) => p.id === activeFellowshipPhaseId) ?? null;
  const activeFellowshipTemplate = activeFellowshipPhase
    ? (stepTemplates.find((t) => t.id === activeFellowshipPhase.stepTemplateId) ?? null)
    : null;
  const activeCombat = combats.find((c) => c.id === activeCombatId) ?? null;
  const activeCombatTemplate = activeCombat
    ? (stepTemplates.find((t) => t.id === activeCombat.stepTemplateId) ?? null)
    : null;

  const activeDicePack = dicePacks.find((p) => p.id === activeDicePackId) ?? null;
  const hasCompany = chronicle.company.length > 0;

  const importControl = (
    <>
      <button className="ghost" onClick={handleExport}>
        Export
      </button>
      <button className="ghost" onClick={() => fileInputRef.current?.click()}>
        Import
      </button>
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
    </>
  );

  return (
    <>
      <Toast message={status} onDismiss={() => setStatus(null)} />
      <header className="app-header">
        <div className="brand">
          <BrandMark className="brand-mark" />
          <span>Wayfarer</span>
        </div>
        {hasCompany && (
          <Nav
            active={tab}
            onChange={setTab}
            liveJourney={activeJourney?.status === 'in-progress'}
            liveCombat={activeCombat?.status === 'in-progress'}
            liveFellowship={activeFellowshipPhase?.status === 'in-progress'}
          />
        )}
      </header>

      <main>
        {!hasCompany ? (
          <>
            {showHeroForm ? (
              <HeroForm onCreate={handleAddHero} onCancel={() => setShowHeroForm(false)} />
            ) : (
              <Welcome onQuickStart={handleQuickStart} onFullSheet={() => setShowHeroForm(true)} />
            )}
          </>
        ) : (
          <div className="view">
            {tab === 'company' && (
              <>
                {/* The roll comes first: it is the action a player takes
                    dozens of times a session, and it used to sit below a
                    settings toolbar and the roster. */}
                {activeHero && (
                  <RollPanel
                    hero={activeHero}
                    companySize={chronicle.company.length}
                    diceInputMode={chronicle.diceInputMode}
                    dicePack={activeDicePack}
                    onResolved={handleRollResolved}
                  />
                )}
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
              </>
            )}

            {tab === 'oracle' && (
              <>
                <div className="view-intro">
                  <h2>Oracle</h2>
                  <p>Ask a yes/no question, or roll on any table — yours or the shipped skeletons.</p>
                </div>
                <OraclePanel diceInputMode={chronicle.diceInputMode} onLog={handleOracleLog} />
                <LorePanel loreTables={loreTables} onUpdate={handleUpdateLoreTable} onLog={handleLoreRollLog} />
                <TableRoller
                  tables={oracleTables}
                  onLog={handleTableRollLog}
                  onUpdateTable={handleUpdateTable}
                />
                <TableEditor
                  tables={oracleTables}
                  onCreate={handleCreateTable}
                  onUpdate={handleUpdateTable}
                  onDelete={handleDeleteTable}
                  onImportPack={handleImportPack}
                />
              </>
            )}

            {tab === 'journey' &&
              (activeJourney && activeJourneyTemplate ? (
                <JourneyRunner
                  chronicle={chronicle}
                  journey={activeJourney}
                  template={activeJourneyTemplate}
                  oracleTables={oracleTables}
                  log={log}
                  onApply={handleJourneyApply}
                  onSaveRoute={handleSaveRoute}
                  onDismiss={() => setActiveJourneyId(null)}
                />
              ) : (
                <JourneyPlanner
                  company={chronicle.company}
                  stepTemplates={stepTemplates}
                  routes={routes}
                  onBegin={handleBeginJourney}
                />
              ))}

            {tab === 'combat' &&
              (activeCombat && activeCombatTemplate ? (
                <CombatRunner
                  chronicle={chronicle}
                  combat={activeCombat}
                  template={activeCombatTemplate}
                  oracleTables={oracleTables}
                  log={log}
                  onApply={handleCombatApply}
                  onDismiss={() => setActiveCombatId(null)}
                />
              ) : (
                <CombatPlanner
                  company={chronicle.company}
                  stepTemplates={stepTemplates}
                  onBegin={handleBeginCombat}
                />
              ))}

            {tab === 'fellowship' &&
              (activeFellowshipPhase && activeFellowshipTemplate ? (
                <FellowshipRunner
                  chronicle={chronicle}
                  phase={activeFellowshipPhase}
                  template={activeFellowshipTemplate}
                  oracleTables={oracleTables}
                  onApply={handleFellowshipApply}
                  onDismiss={() => setActiveFellowshipPhaseId(null)}
                />
              ) : (
                <FellowshipPlanner
                  companySize={chronicle.company.length}
                  stepTemplates={stepTemplates}
                  onBegin={handleBeginFellowshipPhase}
                />
              ))}

            {tab === 'chronicle' && (
              <>
                <div className="view-intro">
                  <h2>Chronicle</h2>
                  <p>The campaign as it happened — filter it, write in it, take it with you.</p>
                </div>
                <ChroniclePanel
                  chronicle={chronicle}
                  log={log}
                  journeys={journeys}
                  fellowshipPhases={fellowshipPhases}
                  combats={combats}
                  onAddProse={handleAddProse}
                  onStartSession={handleStartSession}
                />
              </>
            )}

            {tab === 'templates' && (
              <>
                <div className="view-intro">
                  <h2>Step templates</h2>
                  <p>The same engine drives journeys, combats, and Fellowship phases — edit any of them here.</p>
                </div>
                <StepTemplateEditor
                  templates={stepTemplates}
                  oracleTables={oracleTables}
                  onCreate={handleCreateStepTemplate}
                  onUpdate={handleUpdateStepTemplate}
                  onDelete={handleDeleteStepTemplate}
                />
                <DicePackEditor
                  packs={dicePacks}
                  activePackId={activeDicePackId}
                  onCreate={handleCreateDicePack}
                  onUpdate={handleUpdateDicePack}
                  onDelete={handleDeleteDicePack}
                  onSetActive={handleSetActiveDicePack}
                />
              </>
            )}
          </div>
        )}

        <footer className="app-footer">
          {importControl}
          <span>{log.length} log entries · saved in this browser</span>
        </footer>
      </main>
    </>
  );
}
