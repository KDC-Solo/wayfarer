import { useRef, useState } from 'react';
import {
  clearPackFace,
  createDicePack,
  DICE_FACE_LABEL,
  DicePackError,
  FEAT_FACE_KEYS,
  packCoverage,
  renameDicePack,
  setPackFace,
  SUCCESS_FACE_KEYS,
  SUPPORTED_IMAGE_TYPES,
  validateDicePack,
  type DiceFaceKey,
  type DicePack,
} from '../engine/dicePack.ts';

interface Props {
  packs: DicePack[];
  activePackId: string | null;
  onCreate: (pack: DicePack) => void;
  onUpdate: (pack: DicePack) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string | null) => void;
}

// F7.4 — author a dice pack: import a face image per die face, name it,
// and make it active. Applied to the tap-selection dice faces used in
// player-rolls/hybrid mode. Everything stays on the device (C5), and no
// face art ships with the app (C1) — these are the player's own files.

const MAX_FACE_BYTES = 512 * 1024;

export function DicePackEditor({ packs, activePackId, onCreate, onUpdate, onDelete, onSetActive }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(packs[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const selected = packs.find((p) => p.id === selectedId) ?? null;

  function create() {
    if (!newName.trim()) return;
    const pack = createDicePack(newName.trim());
    onCreate(pack);
    setSelectedId(pack.id);
    setNewName('');
  }

  async function importPack(file: File) {
    setError(null);
    try {
      onCreate(validateDicePack(JSON.parse(await file.text())));
    } catch (err) {
      setError(err instanceof DicePackError || err instanceof Error ? err.message : String(err));
    }
  }

  function exportPack(pack: DicePack) {
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pack.name.replace(/[^\w-]+/g, '-').toLowerCase()}-dice-pack.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="roll-panel">
      <h3>Dice packs</h3>
      <p>
        Your own art for the die faces, used on the tap-selection dice. Nothing here ships with the app and
        nothing leaves this device.
      </p>

      <div className="toolbar">
        <label>
          Active pack
          <select value={activePackId ?? ''} onChange={(e) => onSetActive(e.target.value || null)}>
            <option value="">None — plain numerals</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button className="ghost" onClick={() => importRef.current?.click()}>
          Import pack…
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importPack(file);
            e.target.value = '';
          }}
        />
      </div>

      {error && <p role="status">{error}</p>}

      <ul>
        {packs.map((pack) => {
          const { mapped, total } = packCoverage(pack);
          return (
            <li key={pack.id}>
              <button onClick={() => setSelectedId(pack.id)}>{pack.name}</button>{' '}
              <span>
                {mapped}/{total} faces
              </span>{' '}
              <button onClick={() => exportPack(pack)}>Export</button>{' '}
              <button onClick={() => onDelete(pack.id)} aria-label={`Delete ${pack.name}`}>
                ✕
              </button>
            </li>
          );
        })}
        {packs.length === 0 && <li>No packs yet.</li>}
      </ul>

      <label>
        New pack name
        <input value={newName} onChange={(e) => setNewName(e.target.value)} />
      </label>
      <button onClick={create} disabled={!newName.trim()}>
        Create pack
      </button>

      {selected && <FaceGrid pack={selected} onUpdate={onUpdate} />}
    </section>
  );
}

function FaceGrid({ pack, onUpdate }: { pack: DicePack; onUpdate: (pack: DicePack) => void }) {
  const [error, setError] = useState<string | null>(null);

  async function pickImage(face: DiceFaceKey, file: File) {
    setError(null);
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setError(`${file.name}: unsupported type ${file.type || '(unknown)'}.`);
      return;
    }
    if (file.size > MAX_FACE_BYTES) {
      // Packs live in the export file; a few huge images would bloat every
      // backup the player ever takes.
      setError(`${file.name} is ${(file.size / 1024).toFixed(0)} KB — keep faces under 512 KB.`);
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    onUpdate(setPackFace(pack, face, dataUrl));
  }

  return (
    <div>
      <label>
        Pack name
        <input value={pack.name} onChange={(e) => onUpdate(renameDicePack(pack, e.target.value))} />
      </label>
      {error && <p role="status">{error}</p>}

      <fieldset>
        <legend>Feat die (d12)</legend>
        <div className="face-grid">
          {FEAT_FACE_KEYS.map((face) => (
            <FaceSlot key={face} pack={pack} face={face} onPick={pickImage} onUpdate={onUpdate} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Success die (d6)</legend>
        <div className="face-grid">
          {SUCCESS_FACE_KEYS.map((face) => (
            <FaceSlot key={face} pack={pack} face={face} onPick={pickImage} onUpdate={onUpdate} />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function FaceSlot({
  pack,
  face,
  onPick,
  onUpdate,
}: {
  pack: DicePack;
  face: DiceFaceKey;
  onPick: (face: DiceFaceKey, file: File) => void;
  onUpdate: (pack: DicePack) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const art = pack.faces[face];

  return (
    <div className="face-slot">
      <button
        onClick={() => inputRef.current?.click()}
        aria-label={`Set image for ${DICE_FACE_LABEL[face]}`}
        className={art ? 'die-face art' : 'die-face'}
      >
        {art ? <img src={art} alt="" aria-hidden="true" /> : <span>+</span>}
      </button>
      <span>{DICE_FACE_LABEL[face]}</span>
      {art && (
        <button className="ghost" onClick={() => onUpdate(clearPackFace(pack, face))}>
          Clear
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_IMAGE_TYPES.join(',')}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(face, file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
