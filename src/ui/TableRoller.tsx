import { useState } from 'react';
import type { FeatDieFace } from '../engine/dice.ts';
import { rollDiceExpression } from '../engine/diceExpression.ts';
import { rollOnTable, type OracleTable } from '../engine/oracleTable.ts';
import { FeatDiePicker } from './DicePickers.tsx';

interface Props {
  tables: OracleTable[];
  onLog: (params: {
    tableId: string;
    tableName: string;
    key: number | 'eye' | 'rune';
    text: string;
    prose: string;
  }) => void;
}

// F2.4/F2.6 — roll on any user-defined table by name; an empty table (or an
// unpopulated row) prompts for a manual result instead of blocking play.

export function TableRoller({ tables, onLog }: Props) {
  const [tableId, setTableId] = useState(tables[0]?.id ?? '');
  const table = tables.find((t) => t.id === tableId) ?? null;
  const usesFeatDie = table?.rows.some((r) => r.featFace !== undefined) ?? false;

  const [rolledKey, setRolledKey] = useState<number | 'eye' | 'rune' | null>(null);
  const [resultText, setResultText] = useState('');
  const [manualText, setManualText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prose, setProse] = useState('');

  function reset() {
    setRolledKey(null);
    setResultText('');
    setManualText('');
    setProse('');
    setError(null);
  }

  function rollExpression() {
    if (!table) return;
    setError(null);
    try {
      const { total } = rollDiceExpression(table.rollExpression);
      applyKey(total);
    } catch {
      setError(`Can't auto-roll "${table.rollExpression}" — pick a manual result below.`);
      setRolledKey(null);
    }
  }

  function applyKey(key: number | 'eye' | 'rune') {
    if (!table) return;
    setRolledKey(key);
    const { row, needsManualResult } = rollOnTable(table, key);
    setResultText(needsManualResult ? '' : row!.text);
  }

  function onFeatFace(face: FeatDieFace) {
    applyKey(face);
  }

  function logAndReset() {
    if (!table || rolledKey === null) return;
    const text = resultText || manualText;
    onLog({ tableId: table.id, tableName: table.name, key: rolledKey, text, prose });
    reset();
  }

  if (tables.length === 0) {
    return <p>No tables yet — create one below to roll on it.</p>;
  }

  return (
    <section className="roll-panel">
      <h3>Roll on a table</h3>
      <label>
        Table
        <select
          value={tableId}
          onChange={(e) => {
            setTableId(e.target.value);
            reset();
          }}
        >
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.rollExpression})
            </option>
          ))}
        </select>
      </label>

      {rolledKey === null && usesFeatDie && <FeatDiePicker label="Feat die" onSelect={onFeatFace} />}
      {rolledKey === null && !usesFeatDie && <button onClick={rollExpression}>Roll</button>}
      {error && <p role="status">{error}</p>}

      {rolledKey !== null && (
        <div>
          <p>Rolled: {String(rolledKey)}</p>
          {resultText ? (
            <p>{resultText}</p>
          ) : (
            <label>
              This row is empty — enter a result yourself (F2.6, play never blocks)
              <input value={manualText} onChange={(e) => setManualText(e.target.value)} />
            </label>
          )}
          <label>
            Interpretation (optional, attached to this result)
            <textarea value={prose} onChange={(e) => setProse(e.target.value)} rows={3} />
          </label>
          <button onClick={logAndReset}>Log it</button>
        </div>
      )}
    </section>
  );
}
