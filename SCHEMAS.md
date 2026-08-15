# Wayfarer content schemas

**Contract version: 8** (matches `schemaVersion` in exports; source of truth: `src/engine/types.ts`)

This document is the stable public contract PRD requirement **C4** promises: everything a
third party needs to author content packs — oracle tables, step templates, or full state
files — that Wayfarer can import. Everything here is user-supplied content; per **C1/C5**,
packs must contain no licensed text and Wayfarer never uploads them anywhere.

## Stability policy

- Field names and meanings documented here do not change within a major contract version.
- New **optional** fields may appear at any time; readers must ignore fields they don't know.
- Wayfarer imports any envelope with `schemaVersion` ≤ its own and refuses newer ones.
- IDs are strings; Wayfarer generates UUIDs, but any unique string is accepted on import.

## Oracle table

```jsonc
{
  "id": "any-unique-string",
  "name": "Solo Journey Events",
  "rollExpression": "1d12",        // "NdM", "NdM+X", "NdM-X"; informational for Feat-face tables
  "sourceReference": "Strider Mode p.17",  // book/page pointer, never quoted content
  "rows": [
    // A row matches EITHER an inclusive numeric range…
    { "min": 1, "max": 3, "category": "optional grouping", "text": "user-entered result" },
    // …OR one of the Feat die's special faces (mutually exclusive with min/max):
    { "featFace": "eye", "text": "" },
    { "featFace": "rune", "text": "" }
  ]
}
```

Rows with empty `text` are legal — that is exactly what a shipped *skeleton* (C2) looks
like; the app reports "needs manual result" when one is rolled.

## Bulk row import (paste / text file)

Plain text, UTF-8, one result per line. Two shapes, per table:

- **Keyed** — each line starts with its range, then optional `:`, `.`, or `|`, then text.
  `1-3 A grey rider on the road`, `7: Wolves at dusk`, `eye Nothing stirs`, `rune …`
  (en/em dashes accepted in ranges). Keyed lines matching an existing row's exact range
  fill that row in place; others append new rows.
- **Fill** — bare text lines assigned to the table's existing rows in order. The import
  refuses (rather than guesses) if there are more lines than rows.

Auto-detection uses *keyed* only when every line parses as keyed.

## Lore table

The Lore Table (two-die oracle: Feat die section, Success die row, three columns) is its
own entity, not an oracle-table variant:

```jsonc
{
  "id": "any-unique-string",
  "name": "Lore Table",
  "sourceReference": "Strider Mode p.11-12",
  "sections": {
    // Keys: "eye", "1" … "10", "rune" — always all 12, each exactly 6 rows.
    "1": [
      { "action": "", "aspect": "", "focus": "" }
      // … 5 more rows
    ]
    // … 11 more sections
  }
}
```

All 216 cells ship empty (C2); users transcribe their own copy in the editor.

## Culture and Calling

Character creation is driven entirely by these; the app ships none, because every field is
rulebook content. Import them and guided creation appears, otherwise the app offers the
manual sheet instead.

```jsonc
{
  "id": "any-unique-string",
  "name": "Bardings",
  "attributeSets": [                 // the book's table; roll a d6 or choose
    { "roll": 1, "strength": 5, "heart": 7, "wits": 2 }
  ],
  "derived": { "endurance": 20, "hope": 8, "parry": 12 },  // added to STR/HEART/WITS
  "skills": { "Awe": 1, "Battle": 2 },                     // starting ranks
  "favouredSkillChoices": ["Awe", "Battle"],               // may be empty
  "blessingName": "Stout-hearted",
  "standardOfLiving": "Prosperous",
  "distinctiveFeatures": ["Bold", "Eager"],                // choose two
  "sourceReference": "core rules, p.36"
}
```

Derived stats are stored as the *addend*, not a finished number, because the constants
differ per culture — Endurance is `STRENGTH + derived.endurance`.

```jsonc
{
  "id": "any-unique-string",
  "name": "Warden",
  "favouredSkillChoices": ["Awareness", "Healing", "Insight"],  // the pool, choose two
  "additionalFeature": "Shadow-lore",
  "shadowPath": "Path of Despair",
  "sourceReference": "core rules, p.50"
}
```

Both are rejected on import if malformed: a culture needs at least one well-formed
attribute set, and both need an id and a name.

## Weapons, armour and bestiary

Reference libraries. All rulebook content, so the app ships none; combat works without
them (asking for damage and Injury by hand) and fills those in once they exist.

```jsonc
// weapons[]
{ "id": "w1", "name": "Sword", "damage": 4, "injury": "16", "load": 2,
  "proficiency": "Swords", "notes": "", "sourceReference": "core rules, p.52" }

// armour[] — `additive` marks a piece that adds to a suit (a helm) rather than replacing it
{ "id": "a1", "name": "Mail-shirt", "protection": 3, "additive": false, "load": 9,
  "type": "Mail armour", "sourceReference": "core rules, p.52" }

// bestiary[] (also accepted as "adversaries")
{ "id": "b1", "name": "Orc Soldier", "attributeLevel": 4, "endurance": 12, "might": 1,
  "hate": 2, "parry": 3, "armour": 2,
  "attacks": [{ "name": "Axe", "rating": 3, "damage": 5, "injury": 18, "special": "" }],
  "fellAbilities": "…", "sourceReference": "core rules, p.150" }
```

`injury` is free text because the book gives some weapons a grip-dependent rating
("16 (1h)/18 (2h)"). Total Protection is the best non-additive piece plus every additive
one. A bestiary entry is a *template*: spawning a foe copies it into the fight, so the
library is never mutated by combat.

## Step template

```jsonc
{
  "id": "any-unique-string",
  "name": "Standard Leg",
  "steps": [ /* ordered; executed top to bottom */ ]
}
```

Every step has `id` (string), `label` (string), `enabled` (boolean — disabled steps are
kept but skipped), and `type`, which selects one of:

| `type` | Extra fields | Meaning |
|---|---|---|
| `prompt` | `message: string` | Show text, wait for acknowledgement |
| `roll` | `skillName: string` (blank = chosen live), `role?: "guide"\|"scout"\|"hunter"\|"lookout"` | A skill roll; `role` routes to the hero holding it (ignored for a company of one) |
| `table-draw` | `tableId: string` | Roll on the referenced oracle table |
| `resource-change` | `field: "endurance"\|"hope"\|"fatigue"\|"shadow"\|"shadowPoints"\|"shadowScars"`, `amount: number`, `scope: "active-hero"\|"whole-company"\|role`, `mode?: "delta"\|"set"` | Adjust (default) or set a hero resource |
| `attack` | *(none)* | Combat attack; target, proficiency, TN, damage are all live input. Only meaningful in combat templates |
| `conditional-branch` | `when: "previous-roll-failed"\|"previous-roll-succeeded"`, `skipCount: number` | Skip the next N enabled steps when the last roll/draw outcome matches |

The same template schema drives journeys, Fellowship phases, and combat rounds; steps a
runner cannot express in its context (e.g. `attack` outside combat) are offered as a skip,
never an error.

## Full-state export envelope

The Export button writes one JSON document:

```jsonc
{
  "format": "wayfarer-export",     // required discriminator
  "schemaVersion": 7,
  "exportedAt": "ISO-8601",
  "chronicle": { /* campaign container incl. company */ },
  "log": [ /* append-only LogEntry records */ ],
  "oracleTables": [ /* as above */ ],
  "stepTemplates": [ /* as above */ ],
  "journeys": [],
  "routes": [],
  "fellowshipPhases": [],
  "combats": [],                    // absent in pre-6 exports; readers default to []
  "loreTables": [],                 // absent in pre-7 exports; readers default to []
  "cultures": [],                   // absent in pre-10 exports; readers default to []
  "callings": [],                   // absent in pre-10 exports; readers default to []
  "weapons": [],                    // absent in pre-11 exports; readers default to []
  "armour": [],                     // absent in pre-11 exports; readers default to []
  "bestiary": []                    // also accepted as "adversaries"
  "dicePacks": []                   // absent in pre-8 exports; readers default to []
}
```

Import replaces local state wholesale (never merges). For authoring a *content* pack, the
practical envelope is `oracleTables` + `stepTemplates`; the other collections may be empty
— but note that importing an envelope replaces those too, so distribute content packs as
tables/templates JSON for now and expect a dedicated pack-import path in a future version.

## Dice texture pack

A pack is the player's own face art (F7.4). It is a standalone JSON document — the editor
imports and exports one directly — and also travels inside the full-state envelope's
`dicePacks` collection.

```jsonc
{
  "id": "any-unique-string",
  "name": "Hand-inked",
  "createdAt": "ISO-8601",
  "faces": {
    // Sparse: every key optional. Unmapped faces render as plain numerals,
    // so a half-finished pack is perfectly valid.
    "feat-1": "data:image/png;base64,…",
    "feat-eye": "data:image/svg+xml,…",
    "feat-rune": "data:image/webp;base64,…",
    "success-6": "data:image/jpeg;base64,…"
  }
}
```

**Face keys** — exactly these 18, anything else is rejected on import:
`feat-1` … `feat-10`, `feat-eye`, `feat-rune`, `success-1` … `success-6`.
The Feat die is a d12; its 11th and 12th faces are addressed by name (`feat-eye`,
`feat-rune`) rather than by number, because the player is drawing *the Eye*, not "face 11."

**Values** must be `data:` URLs of type `image/png`, `image/jpeg`, `image/webp`, or
`image/svg+xml`. Remote URLs are rejected: a pack must be self-contained and must not make
the app fetch anything (C5). Keep faces under 512 KB — packs ride along in every full-state
export the player takes.

Packs are applied to the tap-selection dice used in player-rolls and hybrid mode. They are
**not** applied to the optional 3D dice: that renderer maps a single texture atlas over the
die mesh with an undocumented UV layout, so per-face images can't be routed to it without
reverse-engineering that layout. Authoring against this schema is nonetheless stable — if
3D face art lands later it will consume these same packs.
