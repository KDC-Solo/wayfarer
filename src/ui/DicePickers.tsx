import type { FeatDieFace, SuccessDieFace } from '../engine/dice.ts';

// F1.12 — tap-selection rather than free text entry, including the two
// special Feat die faces.

export function FeatDiePicker({
  onSelect,
  label,
}: {
  onSelect: (face: FeatDieFace) => void;
  label: string;
}) {
  const numbers: FeatDieFace[] = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <fieldset>
      <legend>{label} — tap the Feat die (d12) face rolled</legend>
      <div className="die-grid">
        {numbers.map((n) => (
          <button key={n} onClick={() => onSelect(n)} aria-label={`Feat die ${n}`}>
            {n}
          </button>
        ))}
        <button onClick={() => onSelect('eye')} aria-label="Eye of Sauron">
          Eye
        </button>
        <button onClick={() => onSelect('rune')} aria-label="Gandalf rune">
          Rune
        </button>
      </div>
    </fieldset>
  );
}

export function SuccessDiePicker({
  index,
  onSelect,
}: {
  index: number;
  onSelect: (face: SuccessDieFace) => void;
}) {
  const faces: SuccessDieFace[] = [1, 2, 3, 4, 5, 6];
  return (
    <fieldset>
      <legend>Success die #{index + 1} (d6) — tap the face rolled</legend>
      <div className="die-grid">
        {faces.map((f) => (
          <button key={f} onClick={() => onSelect(f)} aria-label={`Success die ${f}`}>
            {f}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
