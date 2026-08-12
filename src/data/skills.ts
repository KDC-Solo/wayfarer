// Starting point for a new hero's skill list (F1.1's "eighteen common
// skills"). This is mechanical scaffolding, not licensed table content —
// every rank starts at 0 and every name is editable in the hero sheet, so
// if your book's list differs in naming or grouping, just rename/add/remove
// here per-hero. The app deliberately does not encode which attribute
// governs which skill (see Hero.skills in engine/types.ts) — that mapping
// is looked up in your own book at roll time (NG2).

export const DEFAULT_SKILL_NAMES: readonly string[] = [
  'Awe',
  'Athletics',
  'Awareness',
  'Battle',
  'Courtesy',
  'Craft',
  'Enhearten',
  'Explore',
  'Healing',
  'Hunting',
  'Insight',
  'Lore',
  'Persuade',
  'Riddle',
  'Scan',
  'Search',
  'Song',
  'Stealth',
];
