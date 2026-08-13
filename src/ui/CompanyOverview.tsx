import { deriveHeroStates } from '../engine/hero.ts';
import type { ResourceField } from '../engine/resources.ts';
import type { Chronicle, DiceInputMode, Hero } from '../engine/types.ts';

export const RESOURCE_FIELD_LABEL: Record<ResourceField, string> = {
  endurance: 'Endurance',
  hope: 'Hope',
  fatigue: 'Fatigue',
  shadow: 'Shadow',
  shadowPoints: 'Shadow points',
  shadowScars: 'Shadow scars',
};

interface Props {
  chronicle: Chronicle;
  onEditSheet: (heroId: string) => void;
  onSetActive: (heroId: string) => void;
  onRemove: (heroId: string) => void;
  onResourceDelta: (heroId: string, field: ResourceField, delta: number) => void;
  onUndo: () => void;
  canUndo: boolean;
  onDiceModeChange: (mode: DiceInputMode) => void;
  onAddHero: () => void;
}

export function CompanyOverview({
  chronicle,
  onEditSheet,
  onSetActive,
  onRemove,
  onResourceDelta,
  onUndo,
  canUndo,
  onDiceModeChange,
  onAddHero,
}: Props) {
  const soloAdjustment = chronicle.company.length === 1;

  return (
    <section>
      <div className="company-grid">
        {chronicle.company.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            isActive={hero.id === chronicle.activeHeroId}
            onSetActive={() => onSetActive(hero.id)}
            onEditSheet={() => onEditSheet(hero.id)}
            onRemove={() => onRemove(hero.id)}
            onResourceDelta={(field, delta) => onResourceDelta(hero.id, field, delta)}
          />
        ))}
        {chronicle.company.length === 0 && <p>No heroes yet — add one to begin.</p>}
      </div>

      {/* Settings, not actions: the roll is what this screen is for, so
          these sit under the company rather than above it. */}
      <div className="toolbar subtle">
        <label>
          Dice input mode
          <select
            value={chronicle.diceInputMode}
            onChange={(e) => onDiceModeChange(e.target.value as DiceInputMode)}
          >
            <option value="app-rolls">App rolls everything</option>
            <option value="player-rolls">I roll my own dice</option>
            <option value="hybrid">Hybrid — I roll the Feat die</option>
          </select>
        </label>
        <span title="Solo play uses TN 18 − Attribute; a company of 2+ uses 20 − Attribute.">
          Solo balancing {soloAdjustment ? 'on' : 'off'}
        </span>
        <button className="ghost" onClick={onUndo} disabled={!canUndo}>
          ↩ Undo
        </button>
        {chronicle.company.length < 4 && <button onClick={onAddHero}>+ Add hero</button>}
      </div>
    </section>
  );
}

function HeroCard({
  hero,
  isActive,
  onSetActive,
  onEditSheet,
  onRemove,
  onResourceDelta,
}: {
  hero: Hero;
  isActive: boolean;
  onSetActive: () => void;
  onEditSheet: () => void;
  onRemove: () => void;
  onResourceDelta: (field: ResourceField, delta: number) => void;
}) {
  const { weary, miserable } = deriveHeroStates(hero);
  const descriptor = [hero.culture, hero.calling].filter(Boolean).join(' · ');

  return (
    <article className={`hero-card${isActive ? ' active' : ''}`}>
      <header>
        <h4>{hero.name}</h4>
        <button
          className={isActive ? 'chip is-active' : 'chip'}
          onClick={onSetActive}
          aria-pressed={isActive}
          title={isActive ? 'Rolls default to this hero' : 'Make this hero active'}
        >
          {isActive ? '● Active' : 'Set active'}
        </button>
        <button className="chip" onClick={onEditSheet}>
          Sheet
        </button>
        <button className="ghost icon" onClick={onRemove} aria-label={`Remove ${hero.name}`}>
          ✕
        </button>
      </header>

      {descriptor && <p className="hero-descriptor">{descriptor}</p>}

      <div className="hero-badges">
        {weary && <span className="badge">Weary</span>}
        {miserable && <span className="badge">Miserable</span>}
        {hero.wounded && <span className="badge">{hero.woundTreated ? 'Wounded · treated' : 'Wounded'}</span>}
      </div>

      {/* Endurance and Hope are the two the player watches all session, so
          they get gauges; the Shadow/Fatigue counters sit below as plain
          steppers. Fatigue reads against Endurance and Shadow against Hope
          because that's what turns a hero Weary or Miserable (F1.15). */}
      <Gauge
        label="Endurance"
        value={hero.resources.endurance}
        against={hero.resources.fatigue}
        againstLabel="Fatigue"
        tone="endurance"
        onDelta={(d) => onResourceDelta('endurance', d)}
        onAgainstDelta={(d) => onResourceDelta('fatigue', d)}
      />
      <Gauge
        label="Hope"
        value={hero.resources.hope}
        against={hero.resources.shadow}
        againstLabel="Shadow"
        tone="hope"
        onDelta={(d) => onResourceDelta('hope', d)}
        onAgainstDelta={(d) => onResourceDelta('shadow', d)}
      />

      <div className="hero-minor">
        {(['shadowPoints', 'shadowScars'] as ResourceField[]).map((field) => (
          <span key={field} className="stepper">
            <button onClick={() => onResourceDelta(field, -1)} aria-label={`Decrease ${RESOURCE_FIELD_LABEL[field]}`}>
              −
            </button>
            <b>{hero.resources[field]}</b>
            <button onClick={() => onResourceDelta(field, 1)} aria-label={`Increase ${RESOURCE_FIELD_LABEL[field]}`}>
              +
            </button>
            {RESOURCE_FIELD_LABEL[field]}
          </span>
        ))}
      </div>
    </article>
  );
}

function Gauge({
  label,
  value,
  against,
  againstLabel,
  tone,
  onDelta,
  onAgainstDelta,
}: {
  label: string;
  value: number;
  against: number;
  againstLabel: string;
  tone: 'endurance' | 'hope';
  onDelta: (delta: number) => void;
  onAgainstDelta: (delta: number) => void;
}) {
  const pct = value > 0 ? Math.min(100, (Math.max(0, value - against) / value) * 100) : 0;
  return (
    <div className={`gauge tone-${tone}`}>
      <div className="gauge-head">
        <span className="gauge-label">{label}</span>
        <span className="stepper">
          <button onClick={() => onDelta(-1)} aria-label={`Decrease ${label}`}>
            −
          </button>
          <b>{value}</b>
          <button onClick={() => onDelta(1)} aria-label={`Increase ${label}`}>
            +
          </button>
        </span>
      </div>
      <div className="gauge-track" role="presentation">
        <div className="gauge-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="gauge-foot">
        <span className="stepper subtle">
          <button onClick={() => onAgainstDelta(-1)} aria-label={`Decrease ${againstLabel}`}>
            −
          </button>
          <b>{against}</b>
          <button onClick={() => onAgainstDelta(1)} aria-label={`Increase ${againstLabel}`}>
            +
          </button>
          {againstLabel}
        </span>
      </div>
    </div>
  );
}
