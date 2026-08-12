import { useState } from 'react';
import {
  addRow,
  createOracleTable,
  removeRow,
  renameTable,
  updateRow,
  type OracleTable,
  type OracleTableRow,
} from '../engine/oracleTable.ts';

interface Props {
  tables: OracleTable[];
  onCreate: (table: OracleTable) => void;
  onUpdate: (table: OracleTable) => void;
  onDelete: (id: string) => void;
}

// F2.5 — define new tables and edit their rows without leaving the app.
// Row population is direct in-app editing only (C3's other path, bulk
// paste/file import, isn't built yet — see CLAUDE.md).

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
