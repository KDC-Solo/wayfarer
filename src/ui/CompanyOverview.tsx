import { deriveHeroStates } from '../engine/hero.ts';
import type { ResourceField } from '../engine/resources.ts';
import type { Chronicle, DiceInputMode, Hero } from '../engine/types.ts';

const RESOURCE_FIELDS: ResourceField[] = [
  'endurance',
  'hope',
  'fatigue',
  'shadow',
  'shadowPoints',
  'shadowScars',
];

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
      <div className="toolbar">
        <label>
          Dice input mode
          <select
            value={chronicle.diceInputMode}
            onChange={(e) => onDiceModeChange(e.target.value as DiceInputMode)}
          >
            <option value="app-rolls">App rolls</option>
            <option value="player-rolls">Player rolls</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
        <span>
          Solo balancing (TN 18 − Attribute):{' '}
          <strong>{soloAdjustment ? 'active' : 'inactive'}</strong> — follows company size
        </span>
        <button className="ghost" onClick={onUndo} disabled={!canUndo}>
          ↩ Undo
        </button>
        {chronicle.company.length < 4 && (
          <button className="primary" onClick={onAddHero}>
            + Add hero
          </button>
        )}
      </div>

      <div className="company-grid">
        {chronicle.company.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            isActive={hero.id === chronicle.activeHeroId}
            onSetActive={() => onSetActive(hero.id)}
            onRemove={() => onRemove(hero.id)}
            onResourceDelta={(field, delta) => onResourceDelta(hero.id, field, delta)}
          />
        ))}
        {chronicle.company.length === 0 && <p>No heroes yet — add one to begin.</p>}
      </div>
    </section>
  );
}

function HeroCard({
  hero,
  isActive,
  onSetActive,
  onRemove,
  onResourceDelta,
}: {
  hero: Hero;
  isActive: boolean;
  onSetActive: () => void;
  onRemove: () => void;
  onResourceDelta: (field: ResourceField, delta: number) => void;
}) {
  const { weary, miserable } = deriveHeroStates(hero);
  return (
    <article className={`hero-card${isActive ? ' active' : ''}`}>
      <header>
        <button onClick={onSetActive} aria-pressed={isActive}>
          {isActive ? '● Active' : 'Set active'}
        </button>
        <h4>{hero.name}</h4>
        <button onClick={onRemove} aria-label={`Remove ${hero.name}`}>
          ✕
        </button>
      </header>
      <p>
        {hero.culture || '—'} · {hero.calling || '—'}
      </p>
      {weary && <span className="badge">Weary</span>}
      {miserable && <span className="badge">Miserable</span>}
      {hero.wounded && <span className="badge">{hero.woundTreated ? 'Wounded (treated)' : 'Wounded'}</span>}
      <table>
        <tbody>
          {RESOURCE_FIELDS.map((field) => (
            <tr key={field}>
              <td>{RESOURCE_FIELD_LABEL[field]}</td>
              <td>{hero.resources[field]}</td>
              <td>
                <button onClick={() => onResourceDelta(field, -1)} aria-label={`Decrease ${RESOURCE_FIELD_LABEL[field]}`}>
                  −
                </button>
                <button onClick={() => onResourceDelta(field, 1)} aria-label={`Increase ${RESOURCE_FIELD_LABEL[field]}`}>
                  +
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
