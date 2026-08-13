export type TabId = 'company' | 'oracle' | 'journey' | 'combat' | 'fellowship' | 'templates';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'company', label: 'Company', icon: '🧑‍🤝‍🧑' },
  { id: 'oracle', label: 'Oracle', icon: '🔮' },
  { id: 'journey', label: 'Journey', icon: '🗺️' },
  { id: 'combat', label: 'Combat', icon: '⚔️' },
  { id: 'fellowship', label: 'Fellowship', icon: '🏕️' },
  { id: 'templates', label: 'Templates', icon: '⚙️' },
];

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
  liveJourney: boolean;
  liveCombat: boolean;
  liveFellowship: boolean;
}

export function Nav({ active, onChange, liveJourney, liveCombat, liveFellowship }: Props) {
  return (
    <nav className="nav" aria-label="Sections">
      {TABS.map((tab) => {
        const live =
          (tab.id === 'journey' && liveJourney) ||
          (tab.id === 'combat' && liveCombat) ||
          (tab.id === 'fellowship' && liveFellowship);
        return (
          <button
            key={tab.id}
            className={tab.id === active ? 'active' : ''}
            onClick={() => onChange(tab.id)}
            aria-current={tab.id === active ? 'page' : undefined}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
            {live && <span className="count" title="In progress">●</span>}
          </button>
        );
      })}
    </nav>
  );
}
