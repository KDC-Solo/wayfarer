import { describe, expect, it } from 'vitest';
import { addHero } from './company.ts';
import { createChronicle, startSession } from './chronicle.ts';
import { exportChronicleMarkdown } from './chronicleExport.ts';
import { createHero } from './hero.ts';
import { createLogEntry } from './log.ts';
import { buildRenderContext } from './logView.ts';
import type { Chronicle, LogEntry } from './types.ts';

function contextFor(chronicle: Chronicle) {
  return buildRenderContext({ chronicle, journeys: [], fellowshipPhases: [], combats: [] });
}

function at(entry: LogEntry, iso: string): LogEntry {
  return { ...entry, timestamp: iso };
}

describe('exportChronicleMarkdown (F6.3)', () => {
  it('orders chronologically regardless of input order and groups by session', () => {
    let chronicle = createChronicle();
    const hero = createHero({ name: 'Idis' });
    chronicle = addHero(chronicle, hero);
    const s1 = startSession(chronicle);
    chronicle = s1.chronicle;

    const early = at(
      createLogEntry({ type: 'roll', heroId: hero.id, payload: { skillName: 'Hunting', success: true, total: 15, targetNumber: 14 } }),
      '2026-08-10T10:00:00.000Z',
    );
    const preSession = at(createLogEntry({ type: 'system', prose: 'Chronicle created.' }), '2026-08-09T09:00:00.000Z');
    const inSession = at(
      { ...createLogEntry({ type: 'prose', prose: 'We set out at dawn.' }), sessionId: s1.sessionId },
      '2026-08-12T18:00:00.000Z',
    );

    const markdown = exportChronicleMarkdown({
      chronicle,
      log: [inSession, early, preSession], // deliberately shuffled
      context: contextFor(chronicle),
    });

    const created = markdown.indexOf('Chronicle created.');
    const rolled = markdown.indexOf('Idis rolled Hunting');
    const dawn = markdown.indexOf('We set out at dawn.');
    expect(created).toBeGreaterThan(-1);
    expect(created).toBeLessThan(rolled);
    expect(rolled).toBeLessThan(dawn);

    // Session heading appears once, dated, before the in-session entry only.
    expect(markdown).toContain('## Session 1 — 2026-08-12');
    expect(markdown.indexOf('## Session 1')).toBeGreaterThan(rolled);
  });

  it('keeps standalone prose verbatim as paragraphs, not list items', () => {
    const chronicle = createChronicle();
    const prose = createLogEntry({ type: 'prose', prose: 'The night was cold.\n\n*And long.*' });
    const markdown = exportChronicleMarkdown({ chronicle, log: [prose], context: contextFor(chronicle) });
    expect(markdown).toContain('The night was cold.\n\n*And long.*');
    expect(markdown).not.toContain('- The night was cold.');
  });

  it('renders attached prose as a blockquote under its mechanical entry', () => {
    const chronicle = createChronicle();
    const entry = createLogEntry({
      type: 'oracle',
      payload: { question: 'Guarded?', answer: 'no', extreme: false },
      prose: 'The way is clear.\nFor now.',
    });
    const markdown = exportChronicleMarkdown({ chronicle, log: [entry], context: contextFor(chronicle) });
    expect(markdown).toContain('- The Telling Table — "Guarded?": no');
    expect(markdown).toContain('  > The way is clear.\n  > For now.');
  });

  it('labels entries with the run that produced them', () => {
    const chronicle = createChronicle();
    const context = contextFor(chronicle);
    context.runLabels['j1'] = 'Journey: Bree → Rivendell';
    const entry = createLogEntry({ type: 'journey-event', prose: 'A storm breaks.', journeyId: 'j1' });
    const markdown = exportChronicleMarkdown({ chronicle, log: [entry], context });
    expect(markdown).toContain('- A storm breaks. *(Journey: Bree → Rivendell)*');
  });

  it('opens with the chronicle facts when present', () => {
    let chronicle = { ...createChronicle(), currentYear: 2954, currentLocation: 'Bree' };
    chronicle = addHero(chronicle, createHero({ name: 'Idis' }));
    const markdown = exportChronicleMarkdown({ chronicle, log: [], context: contextFor(chronicle) });
    expect(markdown.startsWith('# Chronicle\n')).toBe(true);
    expect(markdown).toContain('Year 2954 · Bree · Idis');
  });
});
