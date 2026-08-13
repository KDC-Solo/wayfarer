import { useState } from 'react';
import {
  isLoreTableEmpty,
  LORE_COLUMN_LABEL,
  parseLoreSection,
  setLoreSection,
  LORE_COLUMNS,
  LORE_SECTION_KEYS,
  LORE_SECTION_LABEL,
  renameLoreTable,
  rollOnLoreTable,
  updateLoreCell,
  type LoreColumn,
  type LoreRollResult,
  type LoreSectionKey,
  type LoreTable,
} from '../engine/loreTable.ts';

interface Props {
  loreTables: LoreTable[];
  onUpdate: (table: LoreTable) => void;
  onLog: (params: { table: LoreTable; result: LoreRollResult; prose: string }) => void;
}

// The Lore Table oracle (Strider Mode p.11-12): pick one or more columns,
// roll a Feat die for the section and a Success die for the row. The
// editor transcribes the user's own copy, section by section — the shipped
// skeleton is all blanks (C1/C2), and a blank cell falls back to a manual
// prompt rather than blocking (F2.6).

export function LorePanel({ loreTables, onUpdate, onLog }: Props) {
  const [tableId, setTableId] = useState(loreTables[0]?.id ?? '');
  const [columns, setColumns] = useState<LoreColumn[]>(['action']);
  const [result, setResult] = useState<LoreRollResult | null>(null);
  const [prose, setProse] = useState('');
  /** Cells the player reads out of their book on a blank consult; saved
   * back into the table on "Log it" so each one is typed only once. */
  const [fills, setFills] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);

  const table = loreTables.find((t) => t.id === tableId) ?? loreTables[0] ?? null;
  if (!table) return null;

  function toggleColumn(column: LoreColumn) {
    setColumns((cs) => (cs.includes(column) ? cs.filter((c) => c !== column) : [...cs, column]));
  }

  function roll() {
    setResult(rollOnLoreTable(table!, columns));
    setProse('');
    setFills({});
  }

  function log() {
    if (!result) return;
    let saved = table!;
    const enriched = { ...result, results: { ...result.results } };
    for (const [column, text] of Object.entries(fills)) {
      if (!text.trim()) continue;
      saved = updateLoreCell(saved, result.section, result.successDie - 1, column as LoreColumn, text.trim());
      enriched.results[column as LoreColumn] = text.trim();
    }
    if (saved !== table) onUpdate(saved);
    onLog({ table: saved, result: enriched, prose });
    setResult(null);
    setProse('');
    setFills({});
  }

  return (
    <section className="roll-panel">
      <h3>Lore Table</h3>
      {loreTables.length > 1 && (
        <label>
          Table
          <select value={table.id} onChange={(e) => setTableId(e.target.value)}>
            {loreTables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="toolbar">
        {LORE_COLUMNS.map((column) => (
          <label key={column}>
            <input type="checkbox" checked={columns.includes(column)} onChange={() => toggleColumn(column)} />
            {LORE_COLUMN_LABEL[column]}
          </label>
        ))}
        <button className="primary" onClick={roll} disabled={columns.length === 0}>
          🎲 Consult
        </button>
        <button className="ghost" onClick={() => setEditing((e) => !e)}>
          {editing ? 'Close editor' : 'Edit table'}
        </button>
      </div>

      {isLoreTableEmpty(table) && !editing && (
        <p role="status">
          No rulebook text ships with Wayfarer, so this table starts empty ({table.sourceReference}).
          Consult it anyway — it tells you which row to read, and keeps whatever you type. Or paste a
          whole section in via "Edit table."
        </p>
      )}

      {result && (
        <div>
          <p>
            Feat die: <strong>{LORE_SECTION_LABEL[result.section]}</strong> · Success die:{' '}
            <strong>{result.successDie}</strong>
          </p>
          <ul>
            {Object.entries(result.results).map(([column, text]) => (
              <li key={column}>
                {LORE_COLUMN_LABEL[column as LoreColumn]}:{' '}
                {text.trim() ? (
                  <strong>{text}</strong>
                ) : (
                  <input
                    className="inline-fill"
                    value={fills[column] ?? ''}
                    placeholder={`Read ${LORE_COLUMN_LABEL[column as LoreColumn]} from your book`}
                    onChange={(e) => setFills((f) => ({ ...f, [column]: e.target.value }))}
                  />
                )}
              </li>
            ))}
          </ul>
          {result.needsManualResult && (
            <p className="lookup-cue">
              Section <strong>{LORE_SECTION_LABEL[result.section]}</strong>, row{' '}
              <strong>{result.successDie}</strong> in {table.sourceReference}. What you type is saved
              into the table.
            </p>
          )}
          <label>
            Interpretation (optional)
            <input value={prose} onChange={(e) => setProse(e.target.value)} />
          </label>
          <button onClick={log}>Log it</button>
        </div>
      )}

      {editing && <LoreEditor table={table} onUpdate={onUpdate} />}
    </section>
  );
}

function LoreEditor({ table, onUpdate }: { table: LoreTable; onUpdate: (table: LoreTable) => void }) {
  const [section, setSection] = useState<LoreSectionKey>('1');
  const rows = table.sections[section];

  return (
    <div>
      <label>
        Table name
        <input value={table.name} onChange={(e) => onUpdate(renameLoreTable(table, e.target.value))} />
      </label>
      <label>
        Feat die section
        <select value={section} onChange={(e) => setSection(e.target.value as LoreSectionKey)}>
          {LORE_SECTION_KEYS.map((key) => (
            <option key={key} value={key}>
              {LORE_SECTION_LABEL[key]}
            </option>
          ))}
        </select>
      </label>
      <SectionPaste table={table} section={section} onUpdate={onUpdate} />

      <table>
        <thead>
          <tr>
            <th></th>
            {LORE_COLUMNS.map((column) => (
              <th key={column}>{LORE_COLUMN_LABEL[column]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              {LORE_COLUMNS.map((column) => (
                <td key={column}>
                  <input
                    value={row[column]}
                    aria-label={`${LORE_SECTION_LABEL[section]} row ${i + 1} ${LORE_COLUMN_LABEL[column]}`}
                    onChange={(e) => onUpdate(updateLoreCell(table, section, i, column, e.target.value))}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Paste a whole section straight out of the book's PDF — twelve pastes
 * instead of 216 individual inputs. */
function SectionPaste({
  table,
  section,
  onUpdate,
}: {
  table: LoreTable;
  section: LoreSectionKey;
  onUpdate: (table: LoreTable) => void;
}) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);

  function apply() {
    const { rows, errors: problems, notes: hints } = parseLoreSection(text);
    setErrors(problems);
    setNotes(hints);
    const filled = rows.filter((r) => r.action || r.aspect || r.focus).length;
    if (filled === 0) {
      setStatus(null);
      return;
    }
    onUpdate(setLoreSection(table, section, rows));
    setStatus(`Filled ${filled} of 6 rows in ${LORE_SECTION_LABEL[section]}.`);
    setText('');
  }

  return (
    <fieldset>
      <legend>Paste this section</legend>
      <p>
        Copy the six rows for <strong>{LORE_SECTION_LABEL[section]}</strong> out of your book and paste
        them here — columns separated by tabs, pipes, or two or more spaces, with or without the row
        number.
      </p>
      <textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'1  Action  Aspect  Focus\n2  Action  Aspect  Focus'}
        aria-label={`Paste rows for ${LORE_SECTION_LABEL[section]}`}
      />
      <button onClick={apply} disabled={!text.trim()}>
        Fill {LORE_SECTION_LABEL[section]}
      </button>
      {status && <p role="status">{status}</p>}
      {notes.map((n, i) => (
        <p key={`n${i}`} role="status">
          {n}
        </p>
      ))}
      {errors.map((e, i) => (
        <p key={i} role="status">
          {e}
        </p>
      ))}
    </fieldset>
  );
}
