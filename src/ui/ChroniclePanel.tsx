import { useMemo, useState } from 'react';
import { sessionNumber } from '../engine/chronicle.ts';
import { exportChronicleMarkdown } from '../engine/chronicleExport.ts';
import type { Combat } from '../engine/combat.ts';
import type { FellowshipPhase } from '../engine/fellowshipPhase.ts';
import type { Journey } from '../engine/journey.ts';
import { filterLog, sortLogChronological, type LogFilter } from '../engine/log.ts';
import {
  buildRenderContext,
  describeLogEntry,
  isProseOnly,
  LOG_ENTRY_TYPE_LABEL,
} from '../engine/logView.ts';
import type { Chronicle, LogEntry, LogEntryType } from '../engine/types.ts';

interface Props {
  chronicle: Chronicle;
  log: LogEntry[];
  journeys: Journey[];
  fellowshipPhases: FellowshipPhase[];
  combats: Combat[];
  onAddProse: (prose: string) => void;
  onStartSession: () => void;
}

const PAGE_SIZE = 100;

// F6.1/F6.2/F6.3 — the chronicle as a readable, filterable account of the
// campaign, with the player's own prose interleaved and a Markdown export.
// Everything here derives from the log (D7); the panel never writes state
// beyond handing new prose / session starts up to App.tsx.

export function ChroniclePanel({
  chronicle,
  log,
  journeys,
  fellowshipPhases,
  combats,
  onAddProse,
  onStartSession,
}: Props) {
  const [sessionFilter, setSessionFilter] = useState('all');
  const [heroFilter, setHeroFilter] = useState('all');
  const [runFilter, setRunFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [prose, setProse] = useState('');

  const context = useMemo(
    () => buildRenderContext({ chronicle, journeys, fellowshipPhases, combats }),
    [chronicle, journeys, fellowshipPhases, combats],
  );

  const filter: LogFilter = {};
  if (sessionFilter !== 'all') filter.sessionId = sessionFilter === 'none' ? null : sessionFilter;
  if (heroFilter !== 'all') filter.heroId = heroFilter;
  if (runFilter !== 'all') filter.journeyId = runFilter;
  if (typeFilter !== 'all') filter.type = typeFilter as LogEntryType;

  const entries = sortLogChronological(filterLog(log, filter));
  const visible = entries.slice(Math.max(0, entries.length - visibleCount));
  const currentSession = chronicle.sessionList.length;

  function downloadMarkdown() {
    const markdown = exportChronicleMarkdown({ chronicle, log, context });
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronicle-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function submitProse() {
    if (!prose.trim()) return;
    onAddProse(prose);
    setProse('');
  }

  return (
    <section className="roll-panel">
      <div className="toolbar">
        <span>
          {currentSession > 0 ? `Session ${currentSession}` : 'No session started'} · {entries.length}{' '}
          {entries.length === 1 ? 'entry' : 'entries'}
        </span>
        <button onClick={onStartSession}>▶ Start session {currentSession + 1}</button>
        <button className="ghost" onClick={downloadMarkdown}>
          Export Markdown
        </button>
      </div>

      <div className="toolbar">
        <label>
          Session
          <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}>
            <option value="all">All</option>
            {chronicle.sessionList.map((id, i) => (
              <option key={id} value={id}>
                Session {i + 1}
              </option>
            ))}
            <option value="none">Before sessions</option>
          </select>
        </label>
        <label>
          Hero
          <select value={heroFilter} onChange={(e) => setHeroFilter(e.target.value)}>
            <option value="all">All</option>
            {chronicle.company.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Journey / phase / combat
          <select value={runFilter} onChange={(e) => setRunFilter(e.target.value)}>
            <option value="all">All</option>
            {Object.entries(context.runLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All</option>
            {Object.entries(LOG_ENTRY_TYPE_LABEL).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length < entries.length && (
        <button className="ghost" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
          Show {Math.min(PAGE_SIZE, entries.length - visible.length)} earlier entries
        </button>
      )}

      <ol className="chronicle-list">
        {visible.map((entry) => (
          <ChronicleEntry key={entry.id} entry={entry} chronicle={chronicle} context={context} />
        ))}
        {visible.length === 0 && <li>Nothing here yet — play, or write something below.</li>}
      </ol>

      <fieldset>
        <legend>Write in the chronicle</legend>
        <textarea
          rows={3}
          value={prose}
          onChange={(e) => setProse(e.target.value)}
          placeholder="What happened, in your own words…"
        />
        <button className="primary" onClick={submitProse} disabled={!prose.trim()}>
          Add entry
        </button>
      </fieldset>
    </section>
  );
}

function ChronicleEntry({
  entry,
  chronicle,
  context,
}: {
  entry: LogEntry;
  chronicle: Chronicle;
  context: ReturnType<typeof buildRenderContext>;
}) {
  const proseOnly = isProseOnly(entry);
  const description = describeLogEntry(entry, context);
  const runLabel = entry.journeyId ? context.runLabels[entry.journeyId] : undefined;
  const session = entry.sessionId ? sessionNumber(chronicle, entry.sessionId) : null;
  const stamp = `${entry.timestamp.slice(0, 10)} ${entry.timestamp.slice(11, 16)}`;

  return (
    <li className={`chronicle-entry${entry.type === 'prose' ? ' prose' : ''}`} title={entry.timestamp}>
      <span className="entry-meta">
        {stamp}
        {session !== null && ` · S${session}`}
        {runLabel && ` · ${runLabel}`}
      </span>
      {entry.type === 'prose' ? (
        <p className="entry-prose">{entry.prose}</p>
      ) : (
        <>
          <span>{description}</span>
          {!proseOnly && entry.prose?.trim() && <p className="entry-prose">{entry.prose}</p>}
        </>
      )}
    </li>
  );
}
