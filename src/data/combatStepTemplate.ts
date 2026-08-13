// Default combat-round template (F5.8). Same reasoning as the journey and
// Fellowship defaults: the base combat procedure (initiative-free stance
// play, attack resolution numbers, Protection tests) lives in the core
// rulebook, which isn't on file — Strider Mode p.15 confirms "combat in
// Strider Mode operates much the same as in The One Ring core rules" and
// adds the solo-specific pieces that ARE encoded in engine/combat.ts
// (Skirmish stance, Gain Ground, adversary-action guidance). So the
// template stays a light skeleton — declare, attack, adversaries respond —
// and the player runs their book's details through the live inputs. The
// stance itself isn't a step: it's set in the combat overview (F5.1) and
// changeable any round.

import { createStepTemplate, type StepTemplate } from '../engine/stepTemplate.ts';

export function defaultCombatStepTemplate(): StepTemplate {
  return createStepTemplate('Standard Combat Round', [
    {
      id: crypto.randomUUID(),
      type: 'prompt',
      label: 'Declare action',
      enabled: true,
      message:
        "Check this hero's stance in the overview and declare their action for the round — an attack, or a combat task (in Skirmish stance, the Gain Ground task is an Athletics or Scan roll; see Strider Mode p.15).",
    },
    {
      id: crypto.randomUUID(),
      type: 'attack',
      label: 'Attack',
      enabled: true,
    },
    {
      id: crypto.randomUUID(),
      type: 'prompt',
      label: 'Adversary actions',
      enabled: true,
      message:
        "Resolve the adversaries' actions per Strider Mode p.15: each uses whichever weapon best suits the hero's stance; risky Fell Abilities can be put to the Telling Table. Apply damage and Hate spends in the overview.",
    },
  ]);
}
