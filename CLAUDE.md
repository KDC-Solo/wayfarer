# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Milestones 0 through 5 are built.** Foundations, Phase 1 (hero/company/dice engine/input modes), Phase 2 (the oracle), Phase 3 (the step template engine + journey execution — "the differentiator," PRD §10), Phase 4 (Fellowship Phase: year advance, per-hero downtime steps, Adventure/Skill Point milestones and spending, patron errand), Phase 5 (combat: stances incl. the verified Skirmish stance, opening volleys → rounds, attacks with Piercing Blow → Protection → Wounded flow, adversary tracking — see D15/D16), and Phase 6 (chronicle: sessions, filterable log view, interleaved prose, Markdown export — see D17). Phase 7 (optional 3D dice) is the only PRD milestone left.

The UI got a real visual pass (dark-first design system in `src/ui/theme.css`, tab navigation, a first-run welcome screen) — it's no longer "functional but plain." See "UI/design system" below before adding new screens or components.

Known gaps worth knowing about before extending further:
- No Playwright e2e coverage yet (sibling KDC-Solo repos have it; this repo only has Vitest unit tests). The journey interpreter does have an end-to-end test (`journeyIntegration.test.ts`) walking the real default template through a full two-leg journey — that's engine-level, not a browser-driven UI test.
- `src/data/skills.ts`'s eighteen skill names are a best-effort seed, not verified against the core rulebook (Wayfarer only has the Strider Mode supplement on file, not core rules) — every hero's skill list is freely editable, so this isn't load-bearing, but don't treat the names as authoritative in code or comments.
- The engine doesn't assert which Attribute governs which skill — the roll UI lets the player pick per roll (deliberate, see `RollPanel.tsx` comment; keeps NG2 — the app isn't a rules teacher).
- The Lore Table (p.11-12 — three columns, Action/Aspect/Focus, across twelve Feat-die sections) isn't seeded as a default table: it doesn't fit the single-column `OracleTableRow` model in `oracleTable.ts`. Users can still build an equivalent manually via the generic table editor. See the comment in `src/data/oracleTables.ts` before deciding whether to generalize the row model or add a second table shape.
- Generic table rolls (`TableRoller.tsx`, F2.4) always auto-roll rather than respecting the chronicle's dice input mode the way skill rolls (F1.10-13) and the Telling Table do — a deliberate scope cut for this pass, not a spec requirement either way. Combat's Protection rolls and adversary attacks (`CombatAttack.tsx`'s `autoRollCheck`) make the same cut for the same reason; the hero's own attack roll goes through `RollPanel` and fully respects input modes.
- **The default journey step template (`data/journeyStepTemplates.ts`) leaves its skill and Fatigue-amount fields blank/zero on purpose.** Strider Mode p.16 confirms the base journey procedure (leg length, roll frequency, Fatigue accrual) lives in the *core* rulebook, which isn't on file here — only the Strider Mode supplement is. What *is* verified from the supplement (p.17-19) and encoded: the Solo Journey Events + seven Event Detail table skeletons (exact row counts/ranges), that a journey event's called-for skill is genuinely event-dependent (not fixed per leg — hence the roll step lets the player pick it live), and the land-danger → Favoured/Ill-favoured Feat die mapping (`favourModeForLandDanger`). Don't backfill the blank numbers with a guess; get the core rulebook on file first if that's ever wanted.
- The p.17 hard-terrain (−1d) / road (+1d) event-roll modifier is now encoded (`successDiceDeltaForTerrain` in `journeyEngine.ts`, driven by the optional `Waypoint.terrainModifier` flag — a manual per-waypoint flag, since which hexes qualify is the player's map-reading). Nothing verified from the supplement remains unencoded.
- Conditional-branch steps only support "skip N steps if the previous roll succeeded/failed" — not a general expression language. That's a deliberate scope limit (see `stepTemplate.ts`), not an oversight; revisit only if a real template design needs more.
- `JourneyRunner.tsx`/`FellowshipRunner.tsx` recompute `currentStep()` fresh every render rather than caching branch-resolution in an effect — this is intentional (branch evaluation is a pure, idempotent function of `lastOutcome`, so there's nothing to cache), not a missed optimization.
- **The default Fellowship template (`data/fellowshipStepTemplate.ts`) is deliberately light**, for the same reason as the journey template: the base Fellowship Phase procedure is confirmed unchanged from the core rulebook (Strider Mode p.20), which isn't on file. What *is* verified and encoded: "Spiritual Recovery for Solo Player-heroes" (p.20 — a judged three-tier Shadow recovery, `fellowshipPhase.ts`'s `SHADOW_RECOVERY_AMOUNT`) and the Experience Milestones table (p.21, `experience.ts`'s `EXPERIENCE_MILESTONES`) — the latter is mechanical/procedural (trigger → reward), not narrative content, hence encoded directly rather than left blank, same reasoning as D8/D9. The Fatigue-reset amount (0) is the common downtime pattern, not confirmed on a specific page — worth a second look if the core rulebook ever gets added.
- **Two Adventure/Skill Point currencies, not one generic "experience."** F4.4's original PRD wording ("spend accumulated experience") undersold this — Strider Mode p.21 confirms two separate pools with different earn triggers. The engine doesn't assume which currency pays for which advancement (skill rank vs. Valour vs. Wisdom vs. proficiency) — that mapping is core-rulebook content not on file, so the spend UI lets the player pick the currency and enter the cost themselves.
- `stepRunner.ts` is the generalized interpreter that `journeyEngine.ts` (Journey), `fellowshipPhase.ts`/`FellowshipRunner.tsx` (FellowshipPhase), and `combat.ts`/`CombatRunner.tsx` (Combat) all build on — three consumers, one branch-resolution algorithm. A fourth consumer should follow the same pattern (own entity extending `StepRunPosition`, shared interpreter), per D14/D15.
- **Combat's numbers follow the D12 pattern**: stance TNs ship blank (`emptyStanceTargetNumbers`) and damage/Injury/Protection values are player-entered at the point of use — only Strider Mode p.15 content is encoded (`attackDiceDelta`, `incomingAttackDiceDelta`, `gainGroundBonusDice`, the escape-roll flow). Piercing-Blow detection is assisted (optional player-entered Feat-die threshold pre-checks the box) but always player-confirmed (D16). Don't backfill core-book combat numbers without the core rulebook on file.
- The chronicle view (`ChroniclePanel.tsx`) renders the newest 100 entries with a "show earlier" expander rather than the whole log — the log grows unbounded (PRD §9) and a full render would eventually crawl; if that pagination ever feels wrong, fix it there, it's purely presentational.
- The default combat template seeds for pre-existing campaigns via a one-time localStorage marker (`wayfarer.seeded.combat-template` in `App.tsx`) since such campaigns already fail the `tables.length === 0` first-run check; deleting the template afterwards is respected. An import of a pre-Phase-5 export on a browser that already has the marker won't re-seed it — users can rebuild one in the template editor (the `attack` step type is in the add-step menu).

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
  - `chronicle.ts`, `hero.ts`, `log.ts` — factories for the core entities, plus `deriveHeroStates` (Weary/Miserable, F1.15). `chronicle.ts` also owns sessions (F6.1, D17): `startSession`/`currentSessionId`/`sessionNumber` — sessions are log boundaries, not an entity; `App.tsx` stamps `LogEntry.sessionId` at its single persistence choke point (`stampSession`) so the pure action layer never knows about them. `log.ts`'s `LogFilter.sessionId` accepts `null` to mean "before the first session."
  - `logView.ts` — F6.1's shared entry renderer: `buildRenderContext` (hero names + run labels for journeys/fellowship phases/combats) and `describeLogEntry` (one readable line per mechanical entry; `isProseOnly` marks the types whose prose *is* the content). Used by both the on-screen chronicle and the Markdown export so they tell the same story.
  - `chronicleExport.ts` — F6.3: Markdown export, chronological, grouped by session headings, with standalone prose kept verbatim as paragraphs and attached prose as blockquotes. (F6.4's JSON export was already `export.ts`, since Milestone 0.)
  - `company.ts` — add/remove/activate a hero in a chronicle's company (F1.2/F1.3), enforcing the 1–4 cap.
  - `dice.ts` — the skill-roll engine (F1.6–F1.9). `resolveSkillRoll` is a pure function over *already-known* face values — it doesn't roll dice itself. That split is what makes F1.13 hold (interpretation/logging is identical across input modes; only where the face values come from differs): `rollFeatDie`/`rollSuccessDie` generate them for app-rolls mode, while `RollPanel.tsx` collects them via tap-selection for player-rolls/hybrid. `describeRollRequirement` is what F1.11 renders before any input is taken.
  - `resources.ts`, `actions.ts` — resource deltas and the action layer that ties dice/resource/company/oracle changes to a `LogEntry` (F1.16, F2.1/F2.2/F2.4). `actions.ts` functions are pure (chronicle/args in, `{chronicle, logEntry}` or just `logEntry` out) — callers persist the result; this is what keeps the engine unit-testable without a fake IndexedDB in most tests (only `persistence.test.ts`/`export.test.ts` need `fake-indexeddb`).
  - `random.ts` — the one shared RNG primitive (`crypto.getRandomValues`-backed `randomInt`); `dice.ts` and `diceExpression.ts` both build on it rather than duplicating.
  - `diceExpression.ts` — parses/rolls generic "NdM±X" strings (used by user-defined tables' `rollExpression`, F2.4/F2.5).
  - `tellingTable.ts` — the Telling Table yes/no mechanic (F2.1, F2.3). Implemented directly as a formula (chance band → Feat die threshold), the same reasoning as the TN formula in `dice.ts` — see D9/D10 before changing this to a user-editable table.
  - `tableImport.ts` — C3(b), the second population path: bulk paste/file import (`applyBulkRows`). Keyed lines ("1-3 text", "eye text") fill matching skeleton rows in place or append; bare lines fill existing rows in order; auto-detection goes keyed only when *every* line parses as keyed, so prose starting with a number can't be silently eaten. Format is a public contract (SCHEMAS.md).
  - `oracleTable.ts` — the generic user-defined table engine (F2.4, F2.5, F2.6): `OracleTable`/`OracleTableRow` (rows match either a numeric range or, for Feat-die-indexed tables like Fortune/Ill-Fortune, an `eye`/`rune` `featFace`), `rollOnTable`/`matchRow`, `isTableEmpty`, and CRUD helpers. `isTableEmpty` and `RollResult.needsManualResult` are what F2.6 hangs off — a table with rows but blank text still reports "needs manual result."
  - `stepTemplate.ts` — the step template engine's data model and editing operations (F3.2, F3.4): `StepTemplate`/`StepTemplateStep` as a discriminated union (`roll` | `table-draw` | `resource-change` | `prompt` | `attack` | `conditional-branch` — `attack` is combat's configuration-free step type, D15; Journey/Fellowship runners skip it gracefully), plus `addStep`/`updateStep`/`removeStep`/`duplicateStep`/`moveStep`/`toggleStepEnabled`/`duplicateStepTemplate` (the last is F3.4's "save as a named variant"). `ResourceChangeStep.mode` (`'delta'` default | `'set'`) was added for F4.3's Fatigue reset — a "set to 0," not a relative change.
  - `stepRunner.ts` — the *generic* step interpreter (F3.6, reused per F4.6): `currentStep`/`completeStep` operate on anything satisfying `StepRunPosition` (`{currentStepIndex, lastOutcome}`), auto-resolving `conditional-branch` steps. This is the actual reuse D2/F4.6 ask for — `journeyEngine.ts` wraps it for `Journey` (keeping that module's existing field names so nothing else had to change), and `fellowshipPhase.ts`/`FellowshipRunner.tsx` call it directly for `FellowshipPhase`. A future combat round (Phase 5) should very likely use this too rather than a third interpreter.
  - `journey.ts` — the `Journey`/`Waypoint`/`Route` data model and lifecycle (`createJourney`, `assignRole`, `pauseJourney`/`resumeJourney`/`abandonJourney` for F3.9, `generateJourneySummary` for F3.10, `saveAsRoute`/`createJourneyFromRoute` for F3.11). `generateJourneySummary` builds the summary by filtering the global log on `LogEntry.journeyId` and sorting chronologically — no separate "per-leg results" array; this follows the same "log is the spine" principle as the chronicle view (D7), applied to journeys specifically.
  - `journeyEngine.ts` — the Journey-specific wrapper around `stepRunner.ts`, plus `completeLeg` (advances to the next waypoint or completes the journey), `resolveRoleHero` (F3.5's role routing, skipped entirely for a company of one — confirmed on Strider Mode p.3/p.16, not just inferred), and `favourModeForLandDanger` (the p.17-confirmed Border/Wild/Dark Land → Favoured/normal/Ill-favoured mapping).
  - `combat.ts` — Phase 5 (F5.1-F5.8): the `Combat`/`Adversary` data model, stances (incl. Skirmish, p.15-verified), the volley/round loop (`completeHeroTurn`/`beginNextRound`/`endCombat` — combat has no natural end; ending is always a player decision), `applyAdversaryDelta` (clamped, from/to for logging), `generateCombatSummary` (log-derived, like journeys), and the verified Skirmish/Gain Ground helpers. `hero.ts` holds the wound-state transitions (`applyWound`/`treatWound`/`recoverFromWound`); `Hero.wounded`/`woundTreated` are optional fields so pre-Phase-5 data loads unchanged.
  - `fellowshipPhase.ts` — the `FellowshipPhase` data model (F4.1-F4.6): iterates per hero turn (`currentHeroIndex`, not a waypoint list — genuinely different targeting semantics from Journey, which is why this isn't a Journey reuse despite both using `stepRunner.ts`), `completeHeroTurn`, `setPatronErrand` (F4.5), and the verified Spiritual Recovery tiers (`SHADOW_RECOVERY_AMOUNT`, p.20).
  - `experience.ts` — F4.4: `EXPERIENCE_MILESTONES` (verified, p.21) plus `awardMilestone`/`applyExperienceSpend` (validates cost against the hero's current Adventure/Skill Point pool, throwing `InsufficientExperienceError` rather than silently clamping).
  - `export.ts` — versioned full-state JSON export/import (F6.4, N5), including oracle tables, step templates, journeys, routes, and Fellowship phases.
- `src/engine/persistence.ts` — the only module that touches IndexedDB (via `idb`). The chronicle is a single record (one DB = one campaign); the log store exposes no update/delete, only `add` — enforced at the IndexedDB level so the append-only invariant (D7) can't be silently violated. Undo (F1.17) is `actions.ts`'s `undoResourceChange`, which appends a compensating entry rather than mutating history; `App.tsx` only remembers the *single* most recent resource-change entry, matching "single-step undo," not a full undo stack. Oracle tables, step templates, journeys, routes, and Fellowship phases are each their own object store, upserted by id.
- `src/data/` — seed/default data that ships as an editable starting point, not authoritative content (see `skills.ts`, `oracleTables.ts`, `journeyEventTables.ts`, `journeyStepTemplates.ts`, `fellowshipStepTemplate.ts`). `journeyStepTemplates.ts`'s `defaultJourneyContent()` seeds the events tables and the default template together in one call specifically so the template's `table-draw` step can reference the real seeded table id — don't seed these independently elsewhere without preserving that link. Both default step templates are seeded together in `App.tsx`'s `refresh()`, guarded by the same "tables.length === 0" first-run check.
- `src/ui/` — presentational components. `App.tsx` is the only place that talks to `engine/persistence.ts`; UI components take data + callbacks as props and stay logic-free otherwise. `JourneyRunner.tsx`, `FellowshipRunner.tsx`, and `CombatRunner.tsx` all reuse `RollPanel`/`TableRoller`/`ResourceChangeStepUI.tsx` for their interactive steps rather than re-implementing dice collection — if you change any of those three components' props, check all three runners' usage. `RollPanel` grew combat-driven optional props (`skillOptions` for rolling on proficiencies, `initialTargetNumber`, `successDiceDelta`, plus an always-visible TN-override input per N7/F5.7) that default to the original behavior. `CombatAttack.tsx` holds the attack step UI and the always-available adversary-attack panel (the solo player runs both sides, p.15); both hold pending log entries in state and apply them in one `onApply` so a mid-flow abandon logs nothing. `ResourceChangeStepUI` doesn't know about Journey or FellowshipPhase at all; callers resolve `affectedHeroIds` themselves (Journey: scope/role logic; Fellowship: always "this turn's hero") and pass a `runId` for log tagging.

## UI/design system

- `src/ui/theme.css` is the whole visual system: CSS custom properties for color/spacing/radius/shadow (dark-first — `:root` is the dark palette, `@media (prefers-color-scheme: light)` overrides it, not the other way around), typography (`--font-serif` for headings, `--font-sans` for body — both system stacks, no web fonts, so it stays offline-first/fast-cold-start per N1/N6), and shared element styles (`button`, `input`/`select`/`textarea`, `fieldset`). Most components get their look "for free" through generic classnames (`.roll-panel`, `.hero-card`, `.hero-form`, `.badge`, `.die-grid`) rather than per-component CSS — change a rule in `theme.css` once, every screen picks it up.
- **`button.primary`** marks the one action per screen you actually want pressed (Roll, Ask, Begin journey, Add hero, …) — reach for it on new screens' main CTA, not on every button. `button.ghost` is for de-emphasized secondary actions (Undo, Export/Import). Plain `<button>` (no class) is the default/neutral look.
- `App.tsx` is tab-based (`Nav.tsx`, `TabId` = company/oracle/journey/combat/fellowship/chronicle/templates), not a flat vertical stack of every panel — company management + rolling live under "Company," oracle + tables under "Oracle," and so on. When a journey or Fellowship phase begins, `App.tsx` auto-switches to that tab (see `handleBeginJourney`/`handleBeginCombat`/`handleBeginFellowshipPhase`) since that's where the user needs to be next.
- Before a company exists, `App.tsx` renders `Welcome.tsx` instead of the tab shell — a dedicated first-run screen with one CTA (create a hero), not the empty states of five different panels stacked on top of each other. Don't reintroduce those empty-state stacks; extend `Welcome.tsx` instead if onboarding needs more.
- `BrandMark.tsx` is the header logo — an inline SVG (not the `public/favicon.svg` file) so it can pick up `--accent`/`--bg` via CSS `currentColor`-style `var()` fills and re-theme with the rest of the app; keep both in sync if the mark ever changes, they're deliberately the same shape.
- User-facing copy should never show internal requirement IDs (`F3.10`, `(F4.2)`, etc.) — those belong in code comments only. A pass already removed the ones that had leaked into labels/legends/headings; don't reintroduce the habit when adding new panels.
- No browser tool is available in this sandbox, so UI changes here were verified via typecheck/build/dev-server-module-resolution, not an actual rendered screenshot — worth an honest look in a real browser (or `/run-skill-generator` to capture a working screenshot recipe for this repo) before trusting the visual design further.

## What this project is

**Strider Mode Companion** is a local-first, offline-capable web app that acts as a bookkeeping/oracle assistant for solo play of *The One Ring 2nd Edition* (Strider Mode). It handles dice resolution, oracle questions, journey procedures, resource tracking, and combat, and produces a readable campaign chronicle as a by-product of play. It supports a company of one to four player-controlled heroes (no Loremaster, no multiplayer).

Full detail lives in `strider-mode-companion-prd.md` — read it before starting any feature work. The sections below are the load-bearing decisions that should shape any implementation.

## Governing constraint: content separation (PRD §5)

This precedes all feature work and is non-negotiable:

- **No licensed content ships.** No Tolkien-licensed text, tables, artwork, or die-face symbols. The app ships *table skeletons* only — correct row counts, roll ranges, result categories, and a book/page reference — with all result text empty on install.
- Users populate table content themselves, via in-app row editing or bulk paste/file import.
- All user-content schemas (tables, step templates, dice texture packs) must be documented as stable public contracts so third parties can author compatible packs — that document is `SCHEMAS.md` at the repo root (C4); keep it in sync when touching `oracleTable.ts`, `stepTemplate.ts`, `tableImport.ts`, or the export envelope.
- User-authored content never leaves the device — no upload, no sync, no telemetry, no accounts, no monetisation.

Any feature touching tables, step templates, or dice art must respect this boundary.

## Core architectural mechanisms

Two entities carry the design (PRD §7); prefer extending these over adding parallel mechanisms:

1. **`LogEntry` is the spine** (implemented, `src/engine/log.ts` + `persistence.ts`). State is derived from an append-only log, not stored as mutable truth directly. Every mechanical action (roll, resource change, oracle draw) emits one log entry; entries can carry attached freeform prose. The chronicle view, undo, and audit trail are all meant to fall out of this single append-only mechanism rather than being built separately.

2. **`StepTemplate` is the extensibility mechanism** (implemented: `src/engine/stepTemplate.ts` for the data model, `stepRunner.ts` for the generic interpreter). Journeys, Fellowship-phase downtime, and combat rounds are all "configurable step templates" — an ordered sequence of typed, data-driven steps (roll, table draw, resource change, prompt, conditional branch) — executed by one generic interpreter, not hard-coded per-phase logic. Built for Phase 3 (journeys), reused as-is for Phase 4 (Fellowship — `journeyEngine.ts` and `fellowshipPhase.ts` both wrap `stepRunner.ts` rather than duplicating the branch-resolution algorithm). Phase 5 (combat) is next and should reuse the same interpreter. Before writing new phase logic, check whether the need is actually a new step type (add to the `StepTemplateStep` union) or just step *configuration* (a new default template) — reach for the latter first.

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
3. Phase 3 — journey engine + step template engine (**the differentiator** — the most expensive milestone and the reason the product exists; don't let Milestones 1–2 expand to fill the schedule). **Done.**
4. Phases 4–5 — Fellowship phase and combat, built as step templates reusing the Phase 3 engine. **Both done.**
5. Phase 6 — chronicle browsing and export. **Done.**
6. Phase 7 — optional 3D dice module. **Next (optional).**

Note: the table-entry/import interface (needed for Phase 2) should be prototyped early, since its outcome determines onboarding design before the Phase 3 step template editor locks in.

## Non-functional constraints to keep in mind (PRD §8)

Mobile-first (one-handed phone use, no hover-dependent UI), full session resumption across restarts including mid-journey/mid-combat, and manual override of every computed value — the app assists, it never blocks play.
