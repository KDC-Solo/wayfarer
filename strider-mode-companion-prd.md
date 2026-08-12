# Product Requirements Document
## Strider Mode Companion — a solo play assistant for The One Ring 2e

**Version:** 1.3 (development baseline)
**Status:** Approved for development
**Last updated:** 12 August 2026

**Changes since 0.2:** dice input modes added to Phase 1; optional 3D physics dice roller added as Phase 7; technical approach and development sequence sections added. **Requirement IDs have been renumbered and are now frozen** — this version is the reference baseline. Subsequent additions append; they do not renumber.

**Changes since 1.0:** F1.5 and F1.6 clarified with the concrete Target Number formulas (solo vs. standard); F2.3 clarified with the Telling Table's actual chance-band mechanism. Resolved against the primary source now that it's available for reference; no IDs added or renumbered, no table result content reproduced (still C1/C2-clean).

**Changes since 1.1:** F2.1 corrected to match F2.3/the primary source — the Telling Table is a binary yes/no with an extremity flag on rune/Eye, not the six-tier yes-and/yes-but/no-but/no-and scale it previously described (that wording predated checking the book, same root cause as the F2.3 fix).

**Changes since 1.2:** F3.5 clarified — roles are skipped entirely (not just de-emphasised) for a company of one, confirmed directly in Strider Mode rather than inferred from the general solo-adjustment pattern (D11). No numeric journey-procedure values (leg length, Fatigue accrual, roll frequency) were added to F3.3, since those live in the core rulebook, which isn't on file — see D12.

---

## 1. Summary

A local-first web application that supports solo play of *The One Ring, 2nd Edition* in Strider Mode. It handles the bookkeeping a Loremaster would normally carry — dice resolution, oracle questions, journey procedures, resource tracking, combat — and produces a readable chronicle of the campaign as a by-product of play.

Three design commitments shape the whole product:

- **Mechanics, not content.** No licensed text or artwork ships. Users supply table content from their own books.
- **Procedures as data.** Journeys, downtime and combat are configurable step templates, not hard-coded logic.
- **The app assists, it never insists.** Every computed value can be overridden, and the player can roll their own physical dice at any time.

The application supports a **company of one to four heroes** controlled by a single player.

---

## 2. Problem statement

Strider Mode replaces the Loremaster with tables and an oracle. In practice this means a solo player is simultaneously the characters, the referee, the dice roller, the bookkeeper, and the scribe. The mechanical overhead competes directly with the imaginative work that makes solo play worthwhile — and it scales with the size of the company.

Existing tooling does not address this:

- Free League provides no official app or VTT support; the Tolkien license does not cover it.
- Community Foundry VTT modules (tor2e system, Hero Builder, Workshop) target group play with a Loremaster present, and require a Foundry license and setup.
- Fan web tools handle character sheets and dice, but nothing handles journeys, the oracle loop, or chronicle capture.
- Solo-specific material circulates as PDFs of tables — the exact format that creates the overhead.

There is no incumbent product to displace.

---

## 3. Goals and non-goals

### Goals

- **G1.** Reduce the mechanical overhead of a Strider Mode session so play stays in the fiction.
- **G2.** Make journeys — the centre of solo TOR play — fast to run and easy to record.
- **G3.** Keep the overhead of running a company close to the overhead of running a single hero.
- **G4.** Produce a chronicle the player values enough to export, keep, and share.
- **G5.** Remain useful to a player who rolls physical dice for everything.
- **G6.** Remain legally clean and distributable without licensed content.
- **G7.** Work offline, on a phone or tablet, with a physical book open alongside.

### Non-goals

- **NG1.** Not a virtual tabletop. No multiplayer, no Loremaster mode, no shared sessions. Multiple heroes means one player controlling several characters.
- **NG2.** Not a rules teacher. The user owns and has read the books.
- **NG3.** Not a content library. No book text, tables, artwork, or map data shipped.
- **NG4.** Not a full rules engine. Ambiguity is resolved by the player, not automated away.
- **NG5.** No accounts, no server-side user data, no telemetry.

---

## 4. Target user

A solo tabletop roleplayer who owns *The One Ring 2e* core rules and *Strider Mode*, plays in sessions of 30–90 minutes, and keeps some form of written journal. Comfortable with JSON import/export or a paste-in editor. Likely also plays Ironsworn, Mythic GME, or similar oracle-driven systems, and has expectations set by those tools.

Users split along two axes, all combinations supported:

**Company size**
- *Lone hero* — straight Strider Mode as written, with the supplement's solo balancing adjustments applied.
- *Solo company* — two to four heroes, closer to standard TOR with an oracle in place of the Loremaster. Journey roles and stances become meaningful; solo balancing does not apply.

**Dice preference**
- *App rolls everything* — fastest, phone-only play.
- *Player rolls everything* — the app prompts and interprets, the dice stay on the table.
- *Hybrid* — the player rolls the Feat die for the drama, the app resolves the Success pool.

Secondary user: a player of another solo RPG who wants the journey and oracle engine with their own table content loaded.

---

## 5. Core design constraint: content separation

This is the governing architectural decision and it precedes all feature work.

**C1** — The application must contain no text, table content, artwork, symbols, or descriptive material originating from any Tolkien-licensed publication. This explicitly includes die face artwork.

**C2** — The application ships *table skeletons*: correct row counts, correct roll ranges, correct result categories, and a book/page reference per entry. All result text is empty on install.

**C3** — Users populate table content themselves. The application must provide at least two population paths: (a) direct in-app row editing, (b) bulk paste or file import.

**C4** — All user-supplied content schemas — tables, step templates, dice texture packs — must be documented and published as stable public contracts, so third parties can author compatible packs.

**C5** — User-authored content stays on the user's device. The application must not upload, sync, or transmit it anywhere.

**C6** — First-run messaging must state that the books are required to use the application.

**C7** — No monetisation of any kind.

---

## 6. Functional requirements

Each phase must be independently shippable and useful on its own.

### Phase 1 — Company, dice engine, input modes

**F1.1** Create, edit, and store a hero: name, culture, calling, attributes (Strength/Heart/Wits), the eighteen common skills with ranks, combat proficiencies, Valour, Wisdom, virtues, rewards, gear, patron.

**F1.2** Maintain a company of one to four heroes within a chronicle. Heroes may be added or removed mid-campaign, with the change recorded in the log.

**F1.3** Designate one hero as active. All rolls default to the active hero; switching takes one tap and the active hero is visible at a glance.

**F1.4** Present a company overview showing every hero's Endurance, Hope, Fatigue, Shadow, and derived states on a single screen, without scrolling at four heroes.

**F1.5** Apply the Strider Mode solo balancing adjustments only when the company contains exactly one hero. The switch is visible and manually overridable. The primary adjustment in scope for Phase 1 is the Target Number formula (see F1.6) — additional solo-only adjustments (e.g. previous-experience points, Fellowship score) belong to character creation and Fellowship phase and are out of scope until Phases 1/4 respectively touch them.

**F1.6** Resolve a skill roll: one Feat die (d12) plus N Success dice (d6) where N is the skill rank, summed against a Target Number (TN) derived from the relevant attribute. TN = 20 − Attribute in standard company play; when F1.5's solo adjustment is active (company of one), TN = 18 − Attribute instead, making the lone Player-hero more capable to offset the lack of a Company. The engine must support both formulas, selected by the F1.5 switch, not a single hard-coded constant.

**F1.7** Handle Feat die special faces: the rune face resolves as an automatic success regardless of total; the Eye face counts as zero and is flagged in the log for narrative consequence.

**F1.8** Count sixes on Success dice and report degrees of success (great, extraordinary).

**F1.9** Support roll modifiers: favoured rolls (two Feat dice, keep better), ill-favoured rolls (keep worse), Hope spend adding the attribute value, and weary status (dice showing 1–3 count as zero).

**F1.10** Provide a **dice input mode** setting, stored per chronicle and changeable mid-session, with three values:
- *App rolls* — the application generates all results.
- *Player rolls* — the application states what to roll and the target, then accepts entered die faces.
- *Hybrid* — the application rolls Success dice; the player enters the Feat die face.

**F1.11** In player-rolls and hybrid modes, present the roll requirement unambiguously before input: dice to roll, target number, and any active modifiers.

**F1.12** In player-rolls and hybrid modes, accept die faces by tap-selection rather than free text entry, including the two special Feat die faces.

**F1.13** Interpretation, degrees of success, resource effects, and logging behave identically regardless of input mode. Input mode affects only the source of the numbers.

**F1.14** Track live resources per hero: Endurance, Hope, Fatigue, Shadow, Shadow points, permanent Shadow scars.

**F1.15** Automatically flag derived states per hero — Weary (Fatigue at or above Endurance) and Miserable (Shadow at or above Hope) — and apply their mechanical effects to that hero's subsequent rolls.

**F1.16** Every roll and every resource change writes a timestamped log entry attributed to a specific hero, recording the input mode used.

**F1.17** Provide single-step undo on any resource change.

### Phase 2 — Oracle

**F2.1** Ask a yes/no question and receive a Telling Table result: yes or no, per the chance band's threshold (F2.3), with an "extreme result or twist" flag on the rune/Eye faces for the player to elaborate on (optionally using the Lore Table or F2.4's arbitrary tables). Not a six-tier yes-and/yes-but/no-but/no-and scale — the source table is a binary answer plus a single extremity flag.

**F2.2** Attach a free-text interpretation to any oracle result, stored with the log entry.

**F2.3** Support likelihood weighting where the user judges an outcome more or less probable, via named chance bands (e.g. certain, likely, middling, doubtful, unthinkable) that each map to a roll-under-or-equal threshold on the same Feat die used for skill rolls, defaulting to the middle band. This reuses F1.7's rune/Eye special-face handling: the rune face is always a yes-with-a-twist and the Eye face is always a no-with-a-twist, regardless of the chosen band. This is a single-roll banded mechanism, not a Mythic-GME-style Chaos Factor that drifts across scenes — no chaos/tension counter is in scope.

**F2.4** Roll on any arbitrary user-defined table by name, with results logged identically.

**F2.5** Allow the user to define new tables (name, roll expression, rows, categories) without leaving the application.

**F2.6** When a referenced table is empty, prompt the user for a manual result rather than blocking. Empty tables never prevent play.

### Phase 3 — Journey engine

The journey procedure is implemented as a **configurable step template**, not hard-coded logic. A journey type is an ordered sequence of steps; the engine executes whatever sequence is loaded. This survives supplements, errata, house rules, and reuse for non-TOR systems.

**F3.1** Define a journey: origin, destination, season, and an ordered list of waypoints with user-entered distances and terrain types.

**F3.2** Support a **step template** as a first-class, user-editable object. Each step declares its type (roll, table draw, resource change, prompt, conditional branch), its inputs, and its effects.

**F3.3** Ship default step templates matching the published journey procedure, with all parameters — leg length by terrain, roll frequency, Fatigue accrual, seasonal modifiers — exposed as editable configuration rather than embedded in code.

**F3.4** Allow the user to duplicate, edit, reorder, and disable steps within a template, and save the result as a named variant.

**F3.5** Assign journey roles (Guide, Scout, Hunter, Look-out) to heroes, and route each step's roll to the hero holding the relevant role, for a company of two to four. For a company of exactly one, roles are skipped entirely and every step routes to the sole Player-hero — confirmed in Strider Mode ("Journey roles are not used in Strider Mode"), not just implied by the general solo-adjustment pattern (F1.5).

**F3.6** Execute the journey one leg at a time, running the loaded template per leg and prompting only for what the template requires.

**F3.7** Draw journey events from user-loaded event tables, applying results to Fatigue and other resources for the affected hero or the whole company.

**F3.8** Track accumulated Fatigue per hero across legs and surface exhaustion thresholds as they are crossed.

**F3.9** Support abandoning, pausing, and resuming a journey mid-route, including across application restarts.

**F3.10** On arrival, generate a readable journey summary suitable for pasting into the chronicle.

**F3.11** Save routes as reusable templates for repeat travel.

### Phase 4 — Fellowship phase and patron

**F4.1** Advance the chronicle by one year and open a Fellowship phase.

**F4.2** Present available undertakings per hero, apply their effects, and record the choices.

**F4.3** Resolve Shadow recovery and Fatigue reset for each hero per the downtime rules.

**F4.4** Spend accumulated experience per hero on skill ranks, proficiencies, Valour, and Wisdom, with validation against current totals.

**F4.5** Prompt for the next patron errand to open the following adventuring phase.

**F4.6** Implement the Fellowship phase as a step template, reusing the Phase 3 engine.

### Phase 5 — Combat assist

**F5.1** Assign a stance (Forward, Open, Defensive, Rearward) per hero at the start of combat, and apply its effect on target numbers and incoming attacks.

**F5.2** Maintain a combat round structure across the company: opening volley, then per-round action resolution for each hero and adversary.

**F5.3** Resolve an attack, apply damage to Endurance, and detect a Piercing Blow.

**F5.4** On a Piercing Blow, prompt the Protection roll and resolve Wounded status, including wound treatment and the recovery track.

**F5.5** Track adversary Endurance, Hate, and status for user-entered adversaries, with multiple adversaries active simultaneously.

**F5.6** Present a combat overview showing every hero's and adversary's state without scrolling on a phone.

**F5.7** Allow any step to be resolved manually and any computed result to be overridden, with the override logged.

**F5.8** Implement the combat round as a step template, reusing the Phase 3 engine.

### Phase 6 — Chronicle and export

**F6.1** Present the full log as a browsable chronicle, filterable by session, journey, hero, and entry type.

**F6.2** Allow freeform prose entries interleaved with mechanical entries.

**F6.3** Export the chronicle to Markdown, preserving chronological order and prose formatting.

**F6.4** Export and import complete application state (company, chronicle, tables, step templates, dice packs) as a single JSON file.

### Phase 7 — 3D dice (optional module)

Polish, not function. Nothing in Phases 1–6 may depend on this module.

**F7.1** Render dice as physically simulated 3D objects: randomized throw, tumble, settle, and read the resting face. The result comes from the simulation, not from a pre-decided value with a faked animation.

**F7.2** Load the 3D module lazily, after first paint. The application must be fully usable before it finishes loading, and fully usable if it fails to load.

**F7.3** Ship generic dice only — blank d12 and numbered d6 with several material themes. No licensed symbols.

**F7.4** Support **user-supplied texture packs**: face images imported by the user and mapped to die faces, with the mapping saved as a named pack.

**F7.5** Provide a graphics quality setting (off / low / high) that adjusts shadow resolution, texture size, and physics step rate. Default to low on devices below a capability threshold.

**F7.6** Cache all 3D assets locally for offline use.

**F7.7** In hybrid input mode, render only the Feat die in 3D; resolve the Success pool numerically.

**F7.8** Allow any 3D roll to be skipped mid-animation, jumping straight to the result.

---

## 7. Data model

| Entity | Purpose | Key fields |
|---|---|---|
| **Chronicle** | The campaign container | current year, current location, phase count, company, dice input mode, session list |
| **Hero** | One player-character | attributes, skills, resources, virtues, rewards, gear, journey role, stance |
| **Journey** | One trip, in progress or complete | origin, destination, season, waypoints, step template ref, legs, per-leg results, status |
| **StepTemplate** | A configurable procedure | ordered steps, each with type, inputs, effects, conditions |
| **OracleTable** | User-supplied content unit | id, name, roll expression, rows, result categories, source reference |
| **DicePack** | User-supplied die face art | id, name, die type, face-to-image mapping, material settings |
| **LogEntry** | Atomic record of anything that happened | timestamp, type, hero ref, input mode, mechanical payload, user prose, links to journey/session |

Two entities carry the design:

`LogEntry` is the spine. Every mechanical action emits one, and any entry can carry attached prose. The chronicle is a view over the log, not a separate document — which makes journal-keeping a by-product of play rather than a chore after it.

`StepTemplate` is the extensibility mechanism. Once the journey procedure is data rather than code, the same machinery runs Fellowship phase undertakings and combat rounds. Build it once in Phase 3; Phases 4 and 5 become configuration work.

---

## 8. Non-functional requirements

**N1 Local-first.** All state persists in browser storage. Fully functional with no network connection after first load.

**N2 No accounts.** No sign-up, no authentication, no server-side identity.

**N3 Mobile-first.** Primary target is a phone or small tablet held in one hand with a book open. Touch targets sized accordingly; no hover-dependent interaction.

**N4 Session resumption.** Closing and reopening the browser returns the user to exactly where they were, including mid-journey and mid-combat.

**N5 Data portability.** Full state export and import in a documented JSON format. The user's data is never trapped.

**N6 Fast cold start.** Interactive within a few seconds on a mid-range phone, excluding the lazy-loaded 3D module.

**N7 Manual override everywhere.** Any computed value may be edited by hand. The application assists; it never blocks play.

**N8 Graceful degradation.** Missing table content, a failed 3D module, or a low-capability device reduces features, never function.

---

## 9. Technical approach

Recommendations, not mandates — revise if the build says otherwise.

**Application shell.** Single-page web application, installable as a PWA for offline use and home-screen launch. No backend.

**Persistence.** IndexedDB for chronicle and log data (volume grows unbounded over a campaign); localStorage only for small settings. Full-state export to a single JSON file for backup.

**State.** The log is append-only. Current hero state is derived from, or reconciled against, the log — this makes undo, audit, and the chronicle view fall out of one mechanism rather than three.

**Step template engine.** Data-driven interpreter over a declared step schema. Steps are typed, composable, and serialisable. Version the schema from day one; step templates are user data and will outlive the code that first read them.

**3D dice.** Evaluate `@3d-dice/dice-box` (BabylonJS + AmmoJS, web workers, offscreenCanvas, roughly 400 kb compressed, existing theme system for custom models and skins) before building on three.js + cannon-es directly. The decision hinges on whether its theme system accepts fully custom meshes — TOR's Feat die is a d12 with two symbol faces, which is custom geometry and custom UVs, not a colour swap.

**Visual quality over resolution.** For F7.5, quality comes from PBR materials, an HDRI environment map, and soft contact shadows — not texture resolution. Target 1K–2K textures. 4K per die exhausts mobile GPU memory to render an object a few hundred pixels wide.

---

## 10. Development sequence

**Milestone 0 — Foundations.** App shell, persistence layer, log entity, export/import. Nothing user-visible; everything depends on it.

**Milestone 1 — Playable at the table.** Phase 1 complete. A user can run a hero, roll in any input mode, and track resources. *Done when:* a full session can be played with the app plus the books, using no other tools.

**Milestone 2 — Solo loop closed.** Phase 2 complete. *Done when:* a session can be played without a Loremaster and without external oracle PDFs.

**Milestone 3 — The differentiator.** Phase 3 complete, including the step template engine. *Done when:* a Bree-to-Rivendell winter journey runs end to end and produces a summary worth pasting into a journal.

**Milestone 4 — Campaign length.** Phases 4 and 5, both built as step templates. *Done when:* a chronicle survives three Fellowship phases and a combat without manual bookkeeping outside the app.

**Milestone 5 — The artifact.** Phase 6. *Done when:* an exported chronicle is something a user would post publicly.

**Milestone 6 — Polish.** Phase 7. *Done when:* it can be turned off with no loss of function.

Two sequencing notes. Milestone 3 is the expensive one and the reason the product exists — do not let Milestones 1 and 2 expand to fill the schedule. And prototype the table-entry interface during Milestone 2, because its outcome determines the onboarding design before Milestone 3 locks it in.

---

## 11. Success metrics

No accounts and no telemetry, so measurement is indirect and qualitative:

- **M1.** Sessions per chronicle in exported files shared publicly — an app used once is a failed app.
- **M2.** Third-party table sets, step templates, and dice packs published against the schemas.
- **M3.** Adoption signal on solo RPG forums and the Free League community.
- **M4.** Qualitative: does the chronicle export get posted as play-report content?

---

## 12. Risks

**Onboarding cliff (high).** Content separation means tables must be populated before the journey engine is useful. If that means typing dozens of rows before first play, adoption fails at the door. *Mitigation:* F2.6 — empty tables degrade to a manual prompt rather than blocking. Prototype table entry during Milestone 2. Keep Phases 1 and 2 useful at near-zero content.

**Step template complexity (medium-high).** A configurable procedure engine is materially harder than hard-coded logic, and the editing interface is where that surfaces. Risk: it becomes a programming environment nobody wants to use. *Mitigation:* ship working defaults so the average user never opens the editor; treat template authoring as advanced; confirm Phases 4 and 5 genuinely reuse the engine before investing further.

**Multi-hero overhead (medium).** Four heroes means four sets of resources, roles, and stances. If the interface makes a company feel like data entry, users revert to one hero and the feature was wasted. *Mitigation:* company overview as default screen, one-tap switching, company-wide bulk operations.

**3D scope creep (medium).** Physics dice are the most fun part to build and the least important. *Mitigation:* Phase 7 is last, optional, and lazy-loaded. If Milestone 6 slips indefinitely, the product is still complete.

**Licensing exposure (medium, asymmetric).** Even a mechanics-only tool sits close to a carefully guarded license. *Mitigation:* strict adherence to Section 5, including die face artwork; no map data; explicit "books required" messaging; no monetisation.

**Narrow audience (medium).** Solo TOR players are a subset of a subset. *Mitigation:* the published schemas make the engine reusable for other oracle-driven solo systems.

---

## 13. Open question

**Minimum viable table content.** Largely defused by F2.6 — if every empty table degrades to a manual prompt, minimum viable content approaches zero and tables fill in as the user plays. What remains is an onboarding design question rather than a blocker: which tables should the first-run experience *encourage* populating, and how fast can that be made? Resolve during Milestone 2 by building the dependency map (which requirement reads which table), timing hand-entry of the critical set against the prototype, and treating anything over ten minutes from install to first roll as a failure.

---

## 14. Decision log

| # | Decision | Rationale |
|---|---|---|
| D1 | Ship mechanics, never licensed content | Legal necessity; also enables community table packs |
| D2 | Journey procedure as configurable step template | Survives supplements and house rules; reused by downtime and combat |
| D3 | Support one to four heroes per chronicle | Many solo players run a company rather than a lone hero |
| D4 | Build combat assist | In scope, Phase 5, full company and adversary tracking |
| D5 | Three dice input modes | Physical dice are a large part of why players bought the game |
| D6 | 3D dice as optional lazy-loaded module | Polish; must never be a dependency of core function |
| D7 | Log as append-only spine | Undo, audit, and chronicle all derive from one mechanism |
| D8 | Solo TN formula is 18 − Attribute, standard is 20 − Attribute, selected by company size | Confirmed against the Strider Mode source; was previously an unspecified "adjustment" in F1.5 |
| D9 | Oracle likelihood weighting (F2.3) is a single-roll five-band threshold on the Feat die, not a Mythic-style drifting Chaos Factor | Matches Strider Mode's actual Telling Table mechanic; avoids importing unrelated system complexity |
| D10 | Telling Table answer is binary yes/no with an extremity flag (F2.1), not a six-tier yes-and/yes-but/no-but/no-and scale | F2.1's original wording predated checking the book and didn't match the actual table (page 10); corrected to be consistent with D9/F2.3 |
| D11 | Journey roles (F3.5) are skipped entirely for a company of one, not just de-emphasised | Confirmed on p.3/p.16: "Journey roles are not used in Strider Mode" — the sole Player-hero handles everything. Company size 2-4 still uses roles per §4's "solo company" design |
| D12 | Default journey step template ships with blank skill/Fatigue-amount fields rather than guessed values | Strider Mode p.16 confirms the base numeric journey procedure lives in the core rulebook, which isn't on file — only the supplement is. What's verified and encoded instead: the Solo Journey Events + seven Event Detail table skeletons (p.17-19) and the Border/Wild/Dark Land → Favoured/normal/Ill-favoured Feat die mapping (p.17) |
