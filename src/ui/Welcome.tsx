import { useState } from 'react';
import { BrandMark } from './BrandMark.tsx';

interface Props {
  onQuickStart: (name: string) => void;
  onFullSheet: () => void;
}

// The first thing a stranger sees, and its job is to answer three
// questions before they'll type anything: what is this, is it for me,
// and what do I need to use it.
//
// The last one matters most and used to be buried in a single line about
// "bring your own books". Wayfarer ships no licensed content by design
// (PRD §5), which means the result tables start empty — so a visitor who
// doesn't own the books needs to know that *before* investing time, and a
// visitor who does own them needs to know how much works immediately.

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
        Play <em>The One Ring 2e</em> on your own — no group, no Loremaster. Wayfarer rolls the dice,
        answers the questions a gamemaster normally would, runs your journeys, and writes the whole
        campaign down as you go.
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
          Starts with sample stats so you can roll straight away — edit them later, or{' '}
          <button type="button" className="linklike" onClick={onFullSheet}>
            enter your character sheet now
          </button>
          .
        </p>
      </form>

      <div className="welcome-split">
        <div>
          <strong>Works right away</strong>
          <ul>
            <li>Dice rolls, read and totalled for you</li>
            <li>A yes/no oracle for "is the bridge guarded?"</li>
            <li>Journeys, combat and downtime, step by step</li>
            <li>A chronicle of every roll, written as you play</li>
          </ul>
        </div>
        <div>
          <strong>Needs your rulebook</strong>
          <ul>
            <li>The result tables ship empty — no licensed text here</li>
            <li>Fill them by playing: it asks, you read it out once</li>
            <li>Or paste a whole table in at a time</li>
            <li>You'll want <em>The One Ring 2e</em> and <em>Strider Mode</em></li>
          </ul>
        </div>
      </div>

      <p className="welcome-fineprint">
        New to solo roleplaying? You play the hero; the app plays everything else — asking the oracle
        instead of a gamemaster, and rolling on tables to see what the world does back.
      </p>
      <p className="welcome-fineprint">
        Free · Works offline · Nothing leaves your device · No account, ever
      </p>
    </div>
  );
}
