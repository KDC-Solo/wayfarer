// F6.3 — export the chronicle to Markdown, chronological, with prose kept
// verbatim. Built on the same renderer as the on-screen chronicle
// (logView.ts) so the file reads like the app does. Mechanical entries
// become list items; prose stands alone as paragraphs so the player's own
// Markdown (emphasis, headings, line breaks) survives untouched.

import { sessionNumber } from './chronicle.ts';
import { sortLogChronological } from './log.ts';
import { describeLogEntry, isProseOnly, type LogRenderContext } from './logView.ts';
import type { Chronicle, LogEntry } from './types.ts';

export function exportChronicleMarkdown(input: {
  chronicle: Chronicle;
  log: LogEntry[];
  context: LogRenderContext;
}): string {
  const { chronicle, context } = input;
  const entries = sortLogChronological(input.log);

  const lines: string[] = [];
  lines.push('# Chronicle');
  lines.push('');
  const facts: string[] = [];
  if (chronicle.currentYear) facts.push(`Year ${chronicle.currentYear}`);
  if (chronicle.currentLocation) facts.push(chronicle.currentLocation);
  if (chronicle.company.length > 0) facts.push(chronicle.company.map((h) => h.name).join(', '));
  if (facts.length > 0) {
    lines.push(facts.join(' · '));
    lines.push('');
  }

  let currentSection: string | null | undefined; // undefined = nothing emitted yet
  for (const entry of entries) {
    if (entry.sessionId !== currentSection) {
      // A heading whenever the session boundary moves — entries from
      // before the first session fall under no heading at all.
      if (entry.sessionId !== null) {
        const number = sessionNumber(chronicle, entry.sessionId);
        lines.push('');
        lines.push(`## ${number !== null ? `Session ${number}` : 'Session'} — ${entry.timestamp.slice(0, 10)}`);
        lines.push('');
      }
      currentSection = entry.sessionId;
    }

    const runLabel = entry.journeyId ? context.runLabels[entry.journeyId] : undefined;

    if (isProseOnly(entry)) {
      const prose = entry.prose?.trim();
      if (!prose) continue;
      if (entry.type === 'prose') {
        // The player's own words — verbatim paragraphs, not list furniture.
        lines.push('');
        lines.push(prose);
        lines.push('');
      } else {
        lines.push(`- ${prose}${runLabel ? ` *(${runLabel})*` : ''}`);
      }
      continue;
    }

    lines.push(`- ${describeLogEntry(entry, context)}${runLabel ? ` *(${runLabel})*` : ''}`);
    if (entry.prose?.trim()) {
      // Attached interpretation (F2.2 etc.) — indented under its entry.
      lines.push(`  > ${entry.prose.trim().split('\n').join('\n  > ')}`);
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
