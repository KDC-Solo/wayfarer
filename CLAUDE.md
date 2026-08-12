# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository currently contains only the product requirements document (`strider-mode-companion-prd.md`). No code, build tooling, or dependency manifests exist yet. There are no build/lint/test commands to run until implementation begins — do not invent them. Once code is added, update this file with the actual commands.

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

1. **`LogEntry` is the spine.** State is derived from an append-only log, not stored as mutable truth directly. Every mechanical action (roll, resource change, oracle draw) emits one log entry; entries can carry attached freeform prose. The chronicle view, undo, and audit trail are all meant to fall out of this single append-only mechanism rather than being built separately.

2. **`StepTemplate` is the extensibility mechanism.** Journeys, Fellowship-phase downtime, and combat rounds are all "configurable step templates" — an ordered sequence of typed, data-driven steps (roll, table draw, resource change, prompt, conditional branch) — executed by one generic interpreter, not hard-coded per-phase logic. This engine is built once (Phase 3, journeys) and reused as configuration for Phases 4–5. When implementing later phases, check whether the need is actually a new step type or step configuration before writing bespoke logic.

Other data entities (`Chronicle`, `Hero`, `OracleTable`, `DicePack`) are described in PRD §7.

## Technical approach (recommendations, not mandates — PRD §9)

- Single-page PWA, installable for offline/home-screen use, no backend.
- Persistence: IndexedDB for chronicle/log data (unbounded growth over a campaign), localStorage only for small settings, full-state export to a single versioned JSON file.
- Step template schema should be versioned from the start — step templates are user data that will outlive the code that first reads them.
- Optional 3D dice module (Phase 7, `@3d-dice/dice-box` under evaluation) must lazy-load after first paint and never become a functional dependency — the app must be fully usable if it fails to load or is turned off.

## Development sequence (PRD §10)

Implementation is meant to proceed in this order; each milestone should be independently playable/useful:

0. Foundations — app shell, persistence layer, log entity, export/import.
1. Phase 1 — company, dice engine, input modes ("playable at the table").
2. Phase 2 — oracle ("solo loop closed").
3. Phase 3 — journey engine + step template engine (**the differentiator** — the most expensive milestone and the reason the product exists; don't let Milestones 1–2 expand to fill the schedule).
4. Phases 4–5 — Fellowship phase and combat, built as step templates reusing the Phase 3 engine.
5. Phase 6 — chronicle browsing and export.
6. Phase 7 — optional 3D dice module.

Note: the table-entry/import interface (needed for Phase 2) should be prototyped early, since its outcome determines onboarding design before the Phase 3 step template editor locks in.

## Non-functional constraints to keep in mind (PRD §8)

Mobile-first (one-handed phone use, no hover-dependent UI), full session resumption across restarts including mid-journey/mid-combat, and manual override of every computed value — the app assists, it never blocks play.
