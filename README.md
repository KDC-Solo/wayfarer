# Wayfarer

A local-first solo companion for *The One Ring, 2nd Edition* (Strider Mode) — dice, oracle,
journeys, resource tracking, and a chronicle of the campaign, without any licensed content
shipping in the app. See [`strider-mode-companion-prd.md`](strider-mode-companion-prd.md) for
the full product requirements and design rationale.

**Status: Phase 4 of 7.** Create a company of up to four heroes, roll skills in any of the
three dice input modes, track live resources with Weary/Miserable and single-step undo, ask
the Telling Table a yes/no question, roll on (or define your own) oracle tables, run full
journeys (waypoints, a configurable step-by-step template per leg, pause/resume/abandon,
a pasteable summary on arrival), and now run Fellowship Phases too: advance the year,
step through each hero's downtime (Strider Mode's verified three-tier Spiritual Recovery,
a Fatigue reset, undertakings), award Adventure/Skill Points from the verified Experience
Milestones list, spend them on skill ranks/proficiencies/Valour/Wisdom, and set the next
patron errand. Fellowship and journeys share the same underlying step-template engine — a
concrete demonstration of the PRD's "build it once, reuse it" design. The UI is plain, not
polished. Phase 5 (combat) is next — the last piece before Milestone 4's own bar ("a
chronicle survives three Fellowship phases and a combat without manual bookkeeping outside
the app") is met.

## Design commitments

- **No licensed content ships.** The app contains no Tolkien-licensed text, tables, or
  artwork — you supply table content from your own books.
- **Everything is local.** No accounts, no server, no telemetry. Your data never leaves
  your device unless you export it yourself.
- **The app assists, it never insists.** Every computed value can be overridden.

## Development

Vite + React + TypeScript, installable as a PWA, no backend.

- `npm install`
- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc -b`) + production build (incl. service worker)
- `npm test` — Vitest suite; `npx vitest run -t "<name>"` for a single test

## Architecture

- `src/engine/` — pure, storage-agnostic logic: `types.ts` (data model, PRD §7),
  `chronicle.ts` / `log.ts` (factories for the two core entities), `export.ts`
  (versioned full-state JSON export/import).
- `src/engine/persistence.ts` — the only place that touches IndexedDB. The chronicle
  is a single record; the log is an append-only store (no update/delete exposed —
  undo is implemented as a compensating entry, not a mutation).
- `src/App.tsx` — placeholder shell; will be replaced by the real UI as each phase lands.

See `CLAUDE.md` for more detail on working in this repo.
