import { useState } from 'react';

interface Props {
  onExport: () => void;
  onConfirm: (options: { keepContent: boolean }) => void;
}

// The "start a new campaign" flow persistence.ts has referred to since
// Milestone 0. Destructive and irreversible, so it is deliberately
// two-step, offers the backup first, and defaults to keeping the
// content the player transcribed from their own books — that work
// applies to every campaign they will ever run, while a chronicle
// belongs to one.

export function NewCampaign({ onExport, onConfirm }: Props) {
  const [arming, setArming] = useState(false);
  const [keepContent, setKeepContent] = useState(true);

  if (!arming) {
    return (
      <section className="roll-panel">
        <h3>Start a new campaign</h3>
        <p>
          Clears your heroes, chronicle, journeys and combats so you can begin again. Your tables,
          templates and dice packs are kept unless you say otherwise.
        </p>
        <button onClick={() => setArming(true)}>Start a new campaign…</button>
      </section>
    );
  }

  return (
    <section className="roll-panel danger-zone">
      <h3>Start a new campaign</h3>
      <p>
        <strong>This cannot be undone.</strong> Everything below is stored only in this browser, so
        export a backup first if there is any chance you want this campaign again.
      </p>

      <button className="primary" onClick={onExport}>
        Export a backup first
      </button>

      <ul>
        <li>Heroes, chronicle and log — removed</li>
        <li>Journeys, combats and Fellowship phases — removed</li>
        <li>Tables, Lore Table, templates and dice packs — {keepContent ? 'kept' : 'removed'}</li>
      </ul>

      <label>
        <input type="checkbox" checked={keepContent} onChange={(e) => setKeepContent(e.target.checked)} />
        Keep the table content I transcribed from my books
      </label>

      <div className="toolbar">
        <button onClick={() => setArming(false)}>Cancel</button>
        <button className="destructive" onClick={() => onConfirm({ keepContent })}>
          {keepContent ? 'Clear campaign, keep my tables' : 'Clear everything'}
        </button>
      </div>
    </section>
  );
}
