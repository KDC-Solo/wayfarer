import { useState } from 'react';
import { rollFeatDie, type FeatDieFace } from '../engine/dice.ts';
import { CHANCE_BANDS, DEFAULT_CHANCE_BAND, resolveTellingTable, type ChanceBand, type TellingTableResult } from '../engine/tellingTable.ts';
import type { DiceInputMode } from '../engine/types.ts';
import { FeatDiePicker } from './DicePickers.tsx';

interface Props {
  diceInputMode: DiceInputMode;
  onLog: (result: TellingTableResult, prose: string) => void;
}

// F2.1/F2.2/F2.3 — ask a yes/no question, weighted by a named chance band,
// with an optional free-text interpretation attached before logging.

export function OraclePanel({ diceInputMode, onLog }: Props) {
  const [question, setQuestion] = useState('');
  const [chance, setChance] = useState<ChanceBand>(DEFAULT_CHANCE_BAND);
  const [awaitingFace, setAwaitingFace] = useState(false);
  const [result, setResult] = useState<TellingTableResult | null>(null);
  const [prose, setProse] = useState('');

  function ask() {
    if (diceInputMode === 'app-rolls') {
      setResult(resolveTellingTable(question, chance, rollFeatDie()));
    } else {
      setAwaitingFace(true);
    }
  }

  function onFace(face: FeatDieFace) {
    setAwaitingFace(false);
    setResult(resolveTellingTable(question, chance, face));
  }

  function logAndReset() {
    if (!result) return;
    onLog(result, prose);
    setResult(null);
    setProse('');
    setQuestion('');
  }

  return (
    <section className="roll-panel">
      <h3>Ask the Telling Table</h3>
      {!result && !awaitingFace && (
        <>
          <label>
            Question (phrase it so "yes" is the outcome you're calling favourable)
            <input value={question} onChange={(e) => setQuestion(e.target.value)} />
          </label>
          <label>
            Chance
            <select value={chance} onChange={(e) => setChance(e.target.value as ChanceBand)}>
              {CHANCE_BANDS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button className="primary big" onClick={ask} disabled={!question.trim()}>
            🔮 Ask
          </button>
        </>
      )}

      {awaitingFace && <FeatDiePicker label="Feat die" onSelect={onFace} />}

      {result && (
        <div>
          <p>
            <strong>{result.answer === 'yes' ? 'Yes' : 'No'}</strong>
            {result.extreme && ' — extreme result or twist'}
          </p>
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
