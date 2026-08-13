import { useState } from 'react';
import { BrandMark } from './BrandMark.tsx';

interface Props {
  onQuickStart: (name: string) => void;
  onFullSheet: () => void;
}

// The first thing a new visitor sees, and the only screen whose job is
// conversion: get them rolling dice in seconds, not filling in a form.
//
// The one input is the name, because that's the only thing the app can't
// pick for them. Everything else starts from playable defaults they can
// overwrite later (createQuickStartHero) — the old path opened a nine
// field form defaulted to zeros, which made a new player's very first
// roll mathematically impossible to succeed.

export function Welcome({ onQuickStart, onFullSheet }: Props) {
  const [name, setName] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onQuickStart(name.trim() || 'The Wayfarer');
  }

  return (
    <div className="welcome">
      <BrandMark className="brand-mark" />
      <h1>The road goes ever on.</h1>
      <p className="lede">
        A solo companion for <em>The One Ring 2e</em> — dice, oracle, journeys and downtime handled, so
        your table time stays in the story.
      </p>

      <form className="quickstart" onSubmit={submit}>
        <label htmlFor="quickstart-name">Name your hero</label>
        <div className="quickstart-row">
          <input
            id="quickstart-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Beran of Bree"
            autoFocus
            autoComplete="off"
          />
          <button type="submit" className="primary big">
            Start playing →
          </button>
        </div>
        <p className="quickstart-note">
          Starts with sample stats so you can roll immediately — edit them, or{' '}
          <button type="button" className="linklike" onClick={onFullSheet}>
            enter your character sheet now
          </button>
          .
        </p>
      </form>

      <div className="welcome-facts">
        <div>
          <strong>Roll your way</strong>
          <span>The app rolls, you roll, or a hybrid — your physical dice still count.</span>
        </div>
        <div>
          <strong>No Loremaster needed</strong>
          <span>Ask the oracle yes/no questions and let the tables answer back.</span>
        </div>
        <div>
          <strong>Your chronicle writes itself</strong>
          <span>Every roll and journey becomes a campaign log worth keeping.</span>
        </div>
      </div>

      <p className="welcome-fineprint">
        Works offline · Nothing leaves your device · No account, ever · Bring your own books — no
        licensed content ships here
      </p>
    </div>
  );
}
