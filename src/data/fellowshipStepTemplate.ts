// Default Fellowship Phase template (F4.6). The base procedure is
// confirmed unchanged from the core rulebook (Strider Mode p.20), which
// isn't on file here, so this stays deliberately light — a prompt for
// rest/recovery, the two Strider-specific recovery beats (Spiritual
// Recovery p.20, and a Fatigue reset — the common downtime pattern; verify
// against your book), and a prompt for undertakings. Milestone awards and
// experience spends aren't template steps: they're always-available
// actions in the Fellowship UI, since they don't happen at a fixed point
// in every hero's turn. The patron-errand prompt (F4.5) likewise isn't a
// per-hero step — it happens once, after every hero's turn, so it's
// handled by the Fellowship UI when the phase completes, not the template.

import { createStepTemplate, type StepTemplate } from '../engine/stepTemplate.ts';

export function defaultFellowshipStepTemplate(): StepTemplate {
  return createStepTemplate('Standard Fellowship Phase', [
    {
      id: crypto.randomUUID(),
      type: 'prompt',
      label: 'Rest and recover',
      enabled: true,
      message: "Describe this hero's rest, recovery, and personal projects during the Fellowship Phase.",
    },
    {
      id: crypto.randomUUID(),
      type: 'resource-change',
      label: 'Spiritual Recovery (Strider Mode p.20)',
      enabled: true,
      field: 'shadow',
      amount: -1,
      mode: 'delta',
      scope: 'active-hero',
    },
    {
      id: crypto.randomUUID(),
      type: 'resource-change',
      label: 'Fatigue reset',
      enabled: true,
      field: 'fatigue',
      amount: 0,
      mode: 'set',
      scope: 'active-hero',
    },
    {
      id: crypto.randomUUID(),
      type: 'prompt',
      label: 'Undertaking',
      enabled: true,
      message: "Choose one or more Undertakings for this hero and describe their effects.",
    },
  ]);
}
