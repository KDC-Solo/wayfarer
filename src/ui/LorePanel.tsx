import { useState } from 'react';
import {
  isLoreTableEmpty,
  LORE_COLUMN_LABEL,
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
  const [editing, setEditing] = useState(false);

  const table = loreTables.find((t) => t.id === tableId) ?? loreTables[0] ?? null;
  if (!table) return null;

  function toggleColumn(column: LoreColumn) {
    setColumns((cs) => (cs.includes(column) ? cs.filter((c) => c !== column) : [...cs, column]));
  }

  function roll() {
    setResult(rollOnLoreTable(table!, columns));
    setProse('');
  }

  function log() {
    if (!result) return;
    onLog({ table: table!, result, prose });
    setResult(null);
    setProse('');
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
          This is the empty skeleton ({table.sourceReference}) — transcribe your own copy via "Edit table."
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
                {LORE_COLUMN_LABEL[column as LoreColumn]}: <strong>{text.trim() || '— (blank; consult your book)'}</strong>
              </li>
            ))}
          </ul>
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
