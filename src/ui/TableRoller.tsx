import { useState } from 'react';
import type { FeatDieFace } from '../engine/dice.ts';
import { rollDiceExpression } from '../engine/diceExpression.ts';
import {
  describeRowKey,
  matchRow,
  rollOnTable,
  setRowTextForKey,
  type OracleTable,
} from '../engine/oracleTable.ts';
import { FeatDiePicker } from './DicePickers.tsx';

interface Props {
  tables: OracleTable[];
  /** Lets a result typed from the player's own book be kept in the table
   * (F2.5/C3) — the table fills up through play instead of demanding a
   * transcription session before the app is useful. Optional so callers
   * that only roll (the journey/combat runners) need not supply it. */
  onUpdateTable?: (table: OracleTable) => void;
  onLog: (params: {
    tableId: string;
    tableName: string;
    key: number | 'eye' | 'rune';
    text: string;
    prose: string;
  }) => void;
}

// F2.4/F2.6 — roll on any user-defined table by name; an empty table (or
// an unpopulated row) points the player at the right line in their own
// book and offers to keep the answer, rather than just refusing to help.

function describeRowLabel(table: OracleTable, key: number | 'eye' | 'rune'): string {
  const row = matchRow(table, key);
  return (row && describeRowKey(row)) || String(key);
}

export function TableRoller({ tables, onLog, onUpdateTable }: Props) {
  const [tableId, setTableId] = useState(tables[0]?.id ?? '');
  const table = tables.find((t) => t.id === tableId) ?? null;
  const usesFeatDie = table?.rows.some((r) => r.featFace !== undefined) ?? false;

  const [rolledKey, setRolledKey] = useState<number | 'eye' | 'rune' | null>(null);
  const [resultText, setResultText] = useState('');
  const [manualText, setManualText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prose, setProse] = useState('');
  const [remember, setRemember] = useState(true);

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
    // Keep what the player read out of their book, so this row is filled
    // in for good after the first time it comes up.
    if (!resultText && manualText.trim() && remember && onUpdateTable) {
      onUpdateTable(setRowTextForKey(table, rolledKey, manualText.trim()));
    }
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
          <p className="roll-math">Rolled {String(rolledKey)}</p>
          {resultText ? (
            <p className="table-result">{resultText}</p>
          ) : (
            <div className="lookup">
              <p className="lookup-cue">
                Look up{' '}
                <strong>{describeRowLabel(table!, rolledKey)}</strong>
                {table!.sourceReference && <> in {table!.sourceReference}</>}
              </p>
              <p className="hint">
                Wayfarer ships no rulebook text, so this table starts empty. Read the result out once
                and it's yours from then on.
              </p>
              <label>
                What does your book say?
                <input
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Type or paste the result"
                  autoFocus
                />
              </label>
              {onUpdateTable && (
                <label>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Save it to this table so you only type it once
                </label>
              )}
            </div>
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
