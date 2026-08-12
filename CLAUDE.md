# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Milestone 0 (Foundations) is built**: app shell, IndexedDB persistence, the append-only log, and versioned full-state export/import. Nothing user-visible beyond a placeholder screen yet — Milestone 1 (Phase 1: hero, dice engine, input modes) is next. See PRD §10 for the full sequence.

## Commands

Vite + React + TypeScript PWA, no backend.

- `npm install`
- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc -b`) + production build (incl. service worker via `vite-plugin-pwa`)
- `npm test` — Vitest suite (`src/**/*.test.ts`); `npx vitest run -t "<name>"` for a single test. IndexedDB is polyfilled for tests via `fake-indexeddb` (`src/test-setup.ts`) since Vitest runs in a `node` environment.

## Repository conventions

- Repo lives at `github.com/KDC-Solo/wayfarer` (public). Always commit and push without asking — except ask first if a commit would include copyrighted material.
- `docs/` holds the user's personal copy of licensed rulebooks (currently the Strider Mode PDF) and is gitignored wholesale — never commit anything from it. When citing a rule in a commit or code comment, cite the page number, don't quote the book's text.
- No IDs in the PRD are renumbered once frozen; clarifications append to existing requirement text and get a decision-log entry (see D8/D9) instead of new requirement numbers.

## Code architecture

- `src/engine/` — pure, storage-agnostic logic. `types.ts` holds the data model (PRD §7); `chronicle.ts` / `log.ts` are factories for the two core entities; `export.ts` is the versioned full-state JSON export/import (F6.4, N5).
- `src/engine/persistence.ts` — the only module that touches IndexedDB (via `idb`). The chronicle is a single record (one DB = one campaign); the log store exposes no update/delete, only `add` — enforced at the IndexedDB level so the append-only invariant (D7) can't be silently violated. Undo (F1.17) must be implemented as a compensating log entry, not a mutation.
- `src/App.tsx` — placeholder shell that proves the persistence layer works. Gets replaced by the real UI as each phase lands; don't grow game logic here — it belongs in `src/engine/`.

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
1. Phase 1 — company, dice engine, input modes ("playable at the table"). **Next.**
2. Phase 2 — oracle ("solo loop closed").
3. Phase 3 — journey engine + step template engine (**the differentiator** — the most expensive milestone and the reason the product exists; don't let Milestones 1–2 expand to fill the schedule).
4. Phases 4–5 — Fellowship phase and combat, built as step templates reusing the Phase 3 engine.
5. Phase 6 — chronicle browsing and export.
6. Phase 7 — optional 3D dice module.

Note: the table-entry/import interface (needed for Phase 2) should be prototyped early, since its outcome determines onboarding design before the Phase 3 step template editor locks in.

## Non-functional constraints to keep in mind (PRD §8)

Mobile-first (one-handed phone use, no hover-dependent UI), full session resumption across restarts including mid-journey/mid-combat, and manual override of every computed value — the app assists, it never blocks play.
