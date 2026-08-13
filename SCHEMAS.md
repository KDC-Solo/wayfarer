# Wayfarer content schemas

**Contract version: 6** (matches `schemaVersion` in exports; source of truth: `src/engine/types.ts`)

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
  "schemaVersion": 6,
  "exportedAt": "ISO-8601",
  "chronicle": { /* campaign container incl. company */ },
  "log": [ /* append-only LogEntry records */ ],
  "oracleTables": [ /* as above */ ],
  "stepTemplates": [ /* as above */ ],
  "journeys": [],
  "routes": [],
  "fellowshipPhases": [],
  "combats": []                     // absent in pre-6 exports; readers default to []
}
```

Import replaces local state wholesale (never merges). For authoring a *content* pack, the
practical envelope is `oracleTables` + `stepTemplates`; the other collections may be empty
— but note that importing an envelope replaces those too, so distribute content packs as
tables/templates JSON for now and expect a dedicated pack-import path in a future version.

## Dice texture packs

Reserved for the optional 3D dice module (PRD Phase 7); no schema is published yet. The
envelope will gain an optional `dicePacks` collection rather than changing existing fields.
