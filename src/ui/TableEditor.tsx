import { useRef, useState } from 'react';
import {
  addRow,
  createOracleTable,
  removeRow,
  renameTable,
  updateRow,
  type OracleTable,
  type OracleTableRow,
} from '../engine/oracleTable.ts';
import { applyBulkRows, type BulkImportMode } from '../engine/tableImport.ts';

interface Props {
  tables: OracleTable[];
  onCreate: (table: OracleTable) => void;
  onUpdate: (table: OracleTable) => void;
  onDelete: (id: string) => void;
}

// F2.5/C3 — define new tables and edit their rows without leaving the
// app, via both population paths: direct in-app row editing and bulk
// paste/file import (BulkImportPanel; format documented in SCHEMAS.md).

export function TableEditor({ tables, onCreate, onUpdate, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newExpr, setNewExpr] = useState('1d6');
  const [newSource, setNewSource] = useState('');

  const selected = tables.find((t) => t.id === selectedId) ?? null;

  function createTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const table = createOracleTable({
      name: newName.trim(),
      rollExpression: newExpr.trim(),
      sourceReference: newSource.trim(),
    });
    onCreate(table);
    setSelectedId(table.id);
    setNewName('');
    setNewExpr('1d6');
    setNewSource('');
  }

  return (
    <section className="roll-panel">
      <h3>Tables</h3>
      <ul>
        {tables.map((t) => (
          <li key={t.id}>
            <button onClick={() => setSelectedId(t.id)}>{t.name}</button>{' '}
            <button onClick={() => onDelete(t.id)} aria-label={`Delete ${t.name}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={createTable}>
        <label>
          New table name
          <input value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <label>
          Roll expression (e.g. "1d6", "2d6+1")
          <input value={newExpr} onChange={(e) => setNewExpr(e.target.value)} />
        </label>
        <label>
          Source reference
          <input value={newSource} onChange={(e) => setNewSource(e.target.value)} />
        </label>
        <button type="submit">Create table</button>
      </form>

      {selected && (
        <RowEditor
          table={selected}
          onChange={onUpdate}
          onRename={(name) => onUpdate(renameTable(selected, name))}
        />
      )}
    </section>
  );
}

function RowEditor({
  table,
  onChange,
  onRename,
}: {
  table: OracleTable;
  onChange: (table: OracleTable) => void;
  onRename: (name: string) => void;
}) {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(1);
  const [category, setCategory] = useState('');
  const [text, setText] = useState('');

  function addNewRow(e: React.FormEvent) {
    e.preventDefault();
    const row: OracleTableRow = { min, max, category: category || undefined, text };
    onChange(addRow(table, row));
    setCategory('');
    setText('');
  }

  return (
    <div>
      <label>
        Table name
        <input value={table.name} onChange={(e) => onRename(e.target.value)} />
      </label>
      <table>
        <thead>
          <tr>
            <th>Range</th>
            <th>Category</th>
            <th>Text</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              <td>{row.featFace ?? `${row.min}–${row.max}`}</td>
              <td>{row.category ?? ''}</td>
              <td>
                <input
                  value={row.text}
                  onChange={(e) => onChange(updateRow(table, i, { ...row, text: e.target.value }))}
                />
              </td>
              <td>
                <button onClick={() => onChange(removeRow(table, i))} aria-label={`Remove row ${i}`}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <BulkImportPanel table={table} onChange={onChange} />

      <form onSubmit={addNewRow}>
        <label>
          Min
          <input type="number" value={min} onChange={(e) => setMin(Number(e.target.value))} />
        </label>
        <label>
          Max
          <input type="number" value={max} onChange={(e) => setMax(Number(e.target.value))} />
        </label>
        <label>
          Category (optional)
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label>
          Text
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <button type="submit">Add row</button>
      </form>
    </div>
  );
}

/** C3(b) — the bulk population path: paste (or load a text file), one
 * result per line. Applying goes through applyBulkRows (tableImport.ts);
 * this panel only collects the text and shows what happened. */
function BulkImportPanel({ table, onChange }: { table: OracleTable; onChange: (table: OracleTable) => void }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<BulkImportMode>('auto');
  const [summary, setSummary] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function apply() {
    const result = applyBulkRows(table, text, mode);
    setErrors(result.errors);
    if (result.applied > 0) {
      onChange(result.table);
      setSummary(
        result.mode === 'keyed'
          ? `Applied ${result.applied} keyed ${result.applied === 1 ? 'line' : 'lines'}.`
          : `Filled ${result.applied} ${result.applied === 1 ? 'row' : 'rows'} in order.`,
      );
      setText('');
    } else {
      setSummary(null);
    }
  }

  async function loadFile(file: File) {
    setText(await file.text());
  }

  return (
    <fieldset>
      <legend>Bulk import</legend>
      <p>
        One result per line. Start lines with their range ("1-3 A grey rider", "eye Nothing stirs") to match or
        add rows, or paste bare text to fill the existing rows in order.
      </p>
      <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
      <label>
        Lines are
        <select value={mode} onChange={(e) => setMode(e.target.value as BulkImportMode)}>
          <option value="auto">Detect automatically</option>
          <option value="keyed">Range + text</option>
          <option value="fill">Text only, fill rows in order</option>
        </select>
      </label>
      <button onClick={apply} disabled={!text.trim()}>
        Apply to table
      </button>{' '}
      <button className="ghost" onClick={() => fileInputRef.current?.click()}>
        Load from file…
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.csv,.md,text/plain"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = '';
        }}
      />
      {summary && <p role="status">{summary}</p>}
      {errors.map((err, i) => (
        <p key={i} role="status">
          {err}
        </p>
      ))}
    </fieldset>
  );
}
