import { BrandMark } from './BrandMark.tsx';

interface Props {
  onCreateHero: () => void;
}

// The first thing a new visitor sees. One job: get them rolling dice in
// under a minute, not staring at an empty company grid.
export function Welcome({ onCreateHero }: Props) {
  return (
    <div className="welcome">
      <BrandMark className="brand-mark" />
      <h1>The road goes ever on.</h1>
      <p className="lede">
        Wayfarer runs the bookkeeping for solo <em>The One Ring 2e</em> play — dice, oracle,
        journeys, downtime — so you spend your time in the story, not the spreadsheet.
      </p>
      <p>No licensed content ships here. Bring your own books; the tables are yours to fill in.</p>
      <div className="welcome-actions">
        <button className="primary big" onClick={onCreateHero}>
          Create your first hero →
        </button>
      </div>
      <div className="welcome-facts">
        <div>
          <strong>Roll your way</strong>
          <span>App rolls everything, you roll everything, or a hybrid of both.</span>
        </div>
        <div>
          <strong>Ask the Telling Table</strong>
          <span>A yes/no oracle for when there's no Loremaster to ask.</span>
        </div>
        <div>
          <strong>Journeys that write themselves</strong>
          <span>Run a route leg by leg and get a summary worth keeping.</span>
        </div>
      </div>
    </div>
  );
}
