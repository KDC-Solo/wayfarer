# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Milestones 0, 1, and 2 are built.** Foundations, Phase 1 (hero/company/dice engine/input modes), and Phase 2 (the oracle: Telling Table yes/no, arbitrary user-defined tables, in-app table/row editing). The UI is functional but plain throughout — the bar through Milestone 2 is "playable at the table with the books," not visual polish. Milestone 3 (Phase 3: journeys + the step template engine — "the differentiator," PRD §10) is next and is explicitly the expensive one; don't let it get shortchanged by polishing 0–2 further first.

Known gaps worth knowing about before extending further:
- No Playwright e2e coverage yet (sibling KDC-Solo repos have it; this repo only has Vitest unit tests over `src/engine/` and `src/data/`). Add `e2e/` + `@playwright/test` when the UI stabilizes enough to be worth locking down.
- `src/data/skills.ts`'s eighteen skill names are a best-effort seed, not verified against the core rulebook (Wayfarer only has the Strider Mode supplement on file, not core rules) — every hero's skill list is freely editable, so this isn't load-bearing, but don't treat the names as authoritative in code or comments.
- The engine doesn't assert which Attribute governs which skill — the roll UI lets the player pick per roll (deliberate, see `RollPanel.tsx` comment; keeps NG2 — the app isn't a rules teacher).
- The Lore Table (p.11-12 — three columns, Action/Aspect/Focus, across twelve Feat-die sections) isn't seeded as a default table: it doesn't fit the single-column `OracleTableRow` model in `oracleTable.ts`. Users can still build an equivalent manually via the generic table editor. See the comment in `src/data/oracleTables.ts` before deciding whether to generalize the row model or add a second table shape.
- C3's second population path (bulk paste/file import for table rows) isn't built — only in-app row-by-row editing (`TableEditor.tsx`) is. Worth doing before Phase 3 locks in the onboarding pattern, per the PRD's own note in §10/§13.
- Generic table rolls (`TableRoller.tsx`, F2.4) always auto-roll rather than respecting the chronicle's dice input mode the way skill rolls (F1.10-13) and the Telling Table do — a deliberate scope cut for this pass, not a spec requirement either way.

## Commands

Vite + React + TypeScript PWA, no backend.

- `npm install`
- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc -b`) + production build (incl. service worker via `vite-plugin-pwa`)
- `npm test` — Vitest suite (`src/**/*.test.ts`); `npx vitest run -t "<name>"` for a single test. IndexedDB is polyfilled for tests via `fake-indexeddb` (`src/test-setup.ts`) since Vitest runs in a `node` environment.

## Repository conventions

- Repo lives at `github.com/KDC-Solo/wayfarer` (public). Always commit and push without asking — except ask first if a commit would include copyrighted material.
- `docs/` holds the user's personal copy of licensed rulebooks (currently the Strider Mode PDF) and is gitignored wholesale — never commit anything from it. When citing a rule in a commit or code comment, cite the page number, don't quote the book's text.
- No IDs in the PRD are renumbered once frozen; clarifications append to existing requirement text and get a decision-log entry (see D8–D10) instead of new requirement numbers.

## Code architecture

- `src/engine/` — pure, storage-agnostic logic; nothing here touches the DOM or IndexedDB directly except `persistence.ts`.
  - `types.ts` — the data model (PRD §7).
  - `chronicle.ts`, `hero.ts`, `log.ts` — factories for the core entities, plus `deriveHeroStates` (Weary/Miserable, F1.15).
  - `company.ts` — add/remove/activate a hero in a chronicle's company (F1.2/F1.3), enforcing the 1–4 cap.
  - `dice.ts` — the skill-roll engine (F1.6–F1.9). `resolveSkillRoll` is a pure function over *already-known* face values — it doesn't roll dice itself. That split is what makes F1.13 hold (interpretation/logging is identical across input modes; only where the face values come from differs): `rollFeatDie`/`rollSuccessDie` generate them for app-rolls mode, while `RollPanel.tsx` collects them via tap-selection for player-rolls/hybrid. `describeRollRequirement` is what F1.11 renders before any input is taken.
  - `resources.ts`, `actions.ts` — resource deltas and the action layer that ties dice/resource/company/oracle changes to a `LogEntry` (F1.16, F2.1/F2.2/F2.4). `actions.ts` functions are pure (chronicle/args in, `{chronicle, logEntry}` or just `logEntry` out) — callers persist the result; this is what keeps the engine unit-testable without a fake IndexedDB in most tests (only `persistence.test.ts`/`export.test.ts` need `fake-indexeddb`).
  - `random.ts` — the one shared RNG primitive (`crypto.getRandomValues`-backed `randomInt`); `dice.ts` and `diceExpression.ts` both build on it rather than duplicating.
  - `diceExpression.ts` — parses/rolls generic "NdM±X" strings (used by user-defined tables' `rollExpression`, F2.4/F2.5).
  - `tellingTable.ts` — the Telling Table yes/no mechanic (F2.1, F2.3). Implemented directly as a formula (chance band → Feat die threshold), the same reasoning as the TN formula in `dice.ts` — see D9/D10 before changing this to a user-editable table.
  - `oracleTable.ts` — the generic user-defined table engine (F2.4, F2.5, F2.6): `OracleTable`/`OracleTableRow` (rows match either a numeric range or, for Feat-die-indexed tables like Fortune/Ill-Fortune, an `eye`/`rune` `featFace`), `rollOnTable`/`matchRow`, `isTableEmpty`, and CRUD helpers. `isTableEmpty` and `RollResult.needsManualResult` are what F2.6 hangs off — a table with rows but blank text still reports "needs manual result."
  - `export.ts` — versioned full-state JSON export/import (F6.4, N5), including oracle tables.
- `src/engine/persistence.ts` — the only module that touches IndexedDB (via `idb`). The chronicle is a single record (one DB = one campaign); the log store exposes no update/delete, only `add` — enforced at the IndexedDB level so the append-only invariant (D7) can't be silently violated. Undo (F1.17) is `actions.ts`'s `undoResourceChange`, which appends a compensating entry rather than mutating history; `App.tsx` only remembers the *single* most recent resource-change entry, matching "single-step undo," not a full undo stack. Oracle tables are a separate object store, upserted by id.
- `src/data/` — seed/default data that ships as an editable starting point, not authoritative content (see `skills.ts`, `oracleTables.ts`).
- `src/ui/` — presentational components (`CompanyOverview`, `HeroForm`, `RollPanel`, `DicePickers`, `OraclePanel`, `TableRoller`, `TableEditor`). `App.tsx` is the only place that talks to `engine/persistence.ts`; UI components take data + callbacks as props and stay logic-free otherwise.

## What this project is

**Strider Mode Companion** is a local-first, offline-capable web app that acts as a bookkeeping/oracle assistant for solo play of *The One Ring 2nd Edition* (Strider Mode). It handles dice resolution, oracle questions, journey procedures, resource tracking, and combat, and produces a readable campaign chronicle as a by-product of play. It supports a company of one to four player-controlled heroes (no Loremaster, no multiplayer).

Full detail lives in `strider-mode-companion-prd.md` — read it before starting any feature work. The sections below are the load-bearing decisions that should shape any implementation.

## Governing constraint: content separation (PRD §5)

This precedes all feature work and is non-negotiable:

- **No licensed content ships.** No Tolkien-licensed text, tables, artwork, or die-face symbols. The app ships *table skeletons* only — correct row counts, roll ranges, result categories, and a book/page reference — with all result text empty on install.
- Users populate table content themselves, via in-app row editing or bulk paste/file import.
- All user-content schemas (tables, step templates, dice texture packs) must be documented as stable public contracts so third parties can author compatible packs.
- User-authored content never leaves the device — no upload, no sync, no telemetry, no accounts, no monetisation.

Any feature touching tables, step templates, or dice art must respect this boundary.

## Core architectural mechanisms

Two entities carry the design (PRD §7); prefer extending these over adding parallel mechanisms:

1. **`LogEntry` is the spine** (implemented, `src/engine/log.ts` + `persistence.ts`). State is derived from an append-only log, not stored as mutable truth directly. Every mechanical action (roll, resource change, oracle draw) emits one log entry; entries can carry attached freeform prose. The chronicle view, undo, and audit trail are all meant to fall out of this single append-only mechanism rather than being built separately.

2. **`StepTemplate` is the extensibility mechanism** (not yet built — lands with Phase 3). Journeys, Fellowship-phase downtime, and combat rounds are all "configurable step templates" — an ordered sequence of typed, data-driven steps (roll, table draw, resource change, prompt, conditional branch) — executed by one generic interpreter, not hard-coded per-phase logic. This engine is built once (Phase 3, journeys) and reused as configuration for Phases 4–5. When implementing later phases, check whether the need is actually a new step type or step configuration before writing bespoke logic.

Other data entities (`Chronicle`, `Hero`, `OracleTable`, `DicePack`) are described in PRD §7.

## Technical approach (recommendations, not mandates — PRD §9)

- Single-page PWA, installable for offline/home-screen use, no backend.
- Persistence: IndexedDB for chronicle/log data (unbounded growth over a campaign), localStorage only for small settings, full-state export to a single versioned JSON file.
- Step template schema should be versioned from the start — step templates are user data that will outlive the code that first reads them.
- Optional 3D dice module (Phase 7, `@3d-dice/dice-box` under evaluation) must lazy-load after first paint and never become a functional dependency — the app must be fully usable if it fails to load or is turned off.

## Development sequence (PRD §10)

Implementation is meant to proceed in this order; each milestone should be independently playable/useful:

0. Foundations — app shell, persistence layer, log entity, export/import. **Done.**
1. Phase 1 — company, dice engine, input modes ("playable at the table"). **Done.**
2. Phase 2 — oracle ("solo loop closed"). **Done.**
3. Phase 3 — journey engine + step template engine (**the differentiator** — the most expensive milestone and the reason the product exists; don't let Milestones 1–2 expand to fill the schedule). **Next.**
4. Phases 4–5 — Fellowship phase and combat, built as step templates reusing the Phase 3 engine.
5. Phase 6 — chronicle browsing and export.
6. Phase 7 — optional 3D dice module.

Note: the table-entry/import interface (needed for Phase 2) should be prototyped early, since its outcome determines onboarding design before the Phase 3 step template editor locks in.

## Non-functional constraints to keep in mind (PRD §8)

Mobile-first (one-handed phone use, no hover-dependent UI), full session resumption across restarts including mid-journey/mid-combat, and manual override of every computed value — the app assists, it never blocks play.
