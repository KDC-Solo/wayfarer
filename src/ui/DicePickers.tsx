import type { FeatDieFace, SuccessDieFace } from '../engine/dice.ts';
import { faceArt, featFaceKey, successFaceKey, type DicePack } from '../engine/dicePack.ts';

// F1.12 — tap-selection rather than free text entry, including the two
// special Feat die faces.
//
// F7.4 — when the player has a dice pack active, their own face art
// appears on these buttons. It is decoration only: the label stays on
// the button for accessibility and for any face they haven't drawn, so
// an absent or half-finished pack changes nothing functionally.

function FaceButton({
  pack,
  faceKey,
  label,
  ariaLabel,
  onClick,
}: {
  pack: DicePack | null;
  faceKey: ReturnType<typeof featFaceKey>;
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  const art = faceArt(pack, faceKey);
  return (
    <button onClick={onClick} aria-label={ariaLabel} className={art ? 'die-face art' : 'die-face'}>
      {art && <img src={art} alt="" aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}

export function FeatDiePicker({
  onSelect,
  label,
  dicePack = null,
}: {
  onSelect: (face: FeatDieFace) => void;
  label: string;
  dicePack?: DicePack | null;
}) {
  const numbers: FeatDieFace[] = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <fieldset>
      <legend>{label} — tap the Feat die (d12) face rolled</legend>
      <div className="die-grid">
        {numbers.map((n) => (
          <FaceButton
            key={n}
            pack={dicePack}
            faceKey={featFaceKey(n as number)}
            label={String(n)}
            ariaLabel={`Feat die ${n}`}
            onClick={() => onSelect(n)}
          />
        ))}
        <FaceButton
          pack={dicePack}
          faceKey={featFaceKey('eye')}
          label="Eye"
          ariaLabel="Eye of Sauron"
          onClick={() => onSelect('eye')}
        />
        <FaceButton
          pack={dicePack}
          faceKey={featFaceKey('rune')}
          label="Rune"
          ariaLabel="Gandalf rune"
          onClick={() => onSelect('rune')}
        />
      </div>
    </fieldset>
  );
}

export function SuccessDiePicker({
  index,
  onSelect,
  dicePack = null,
}: {
  index: number;
  onSelect: (face: SuccessDieFace) => void;
  dicePack?: DicePack | null;
}) {
  const faces: SuccessDieFace[] = [1, 2, 3, 4, 5, 6];
  return (
    <fieldset>
      <legend>Success die #{index + 1} (d6) — tap the face rolled</legend>
      <div className="die-grid">
        {faces.map((f) => (
          <FaceButton
            key={f}
            pack={dicePack}
            faceKey={successFaceKey(f)}
            label={String(f)}
            ariaLabel={`Success die ${f}`}
            onClick={() => onSelect(f)}
          />
        ))}
      </div>
    </fieldset>
  );
}
