# Wayfarer

A local-first solo companion for *The One Ring, 2nd Edition* (Strider Mode) — dice, oracle,
journeys, resource tracking, and a chronicle of the campaign, without any licensed content
shipping in the app. See [`strider-mode-companion-prd.md`](strider-mode-companion-prd.md) for
the full product requirements and design rationale.

**Status: Milestone 2.** Create a company of up to four heroes, roll skills in any of the
three dice input modes (app rolls / player rolls / hybrid), track live resources with
Weary/Miserable and single-step undo, ask the Telling Table a yes/no question, and roll on
(or define your own) oracle tables — with Fortune/Ill-Fortune shipped as empty skeletons for
you to fill in from your own book. The UI is plain, not polished — the bar through this
milestone is "playable at the table with the books," not visual design. Milestone 3 (the
journey engine) is next.

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
