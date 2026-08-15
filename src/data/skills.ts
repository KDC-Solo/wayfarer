// The eighteen common skills, verified against The One Ring core rules
// (the per-culture skill tables, e.g. p.35-40 of the 2401 printing).
//
// Listed in the book's own order — reading down its three columns — so a
// player copying their character sheet across goes top to bottom rather
// than hunting alphabetically. Skill names are an open string record on
// Hero, so this is a starting point, not a fixed set (NG2): house rules
// and supplements can add their own.
//
// Corrected 2026-08: this list previously shipped "Search", which is not
// a skill in the game, and omitted TRAVEL, which is — and which Strider
// Mode p.16 calls for by name. It was a guess made before the core rules
// were available to check against.
export const DEFAULT_SKILL_NAMES: readonly string[] = [
  'Awe',
  'Athletics',
  'Awareness',
  'Hunting',
  'Song',
  'Craft',
  'Enhearten',
  'Travel',
  'Insight',
  'Healing',
  'Courtesy',
  'Battle',
  'Persuade',
  'Stealth',
  'Scan',
  'Explore',
  'Riddle',
  'Lore',
];
