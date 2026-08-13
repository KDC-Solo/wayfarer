// The step template engine (F3.2, F3.4; PRD's "StepTemplate is the
// extensibility mechanism" — D2). A journey type — and likewise Fellowship
// downtime and combat rounds (Phases 4-5) — is an ordered sequence of
// typed, user-editable steps executed by one generic interpreter
// (stepRunner.ts), not hard-coded per-phase logic.

import type { ResourceField } from './resources.ts';

export type JourneyRole = 'guide' | 'scout' | 'hunter' | 'lookout';

export const JOURNEY_ROLES: readonly JourneyRole[] = ['guide', 'scout', 'hunter', 'lookout'];

interface BaseStep {
  id: string;
  label: string;
  /** F3.4 — disabled steps are skipped by the interpreter but kept in the template. */
  enabled: boolean;
}

export interface RollStep extends BaseStep {
  type: 'roll';
  skillName: string;
  /** F3.5 — routes to the hero holding this role; ignored for a solo company
   * (Strider Mode p.3: no roles are assigned when travelling alone). */
  role?: JourneyRole;
}

export interface TableDrawStep extends BaseStep {
  type: 'table-draw';
  tableId: string;
}

export type ResourceChangeScope = 'active-hero' | 'whole-company' | JourneyRole;

export interface ResourceChangeStep extends BaseStep {
  type: 'resource-change';
  field: ResourceField;
  amount: number;
  scope: ResourceChangeScope;
  /** 'delta' (default, backward compatible) adds `amount`; 'set' assigns it
   * directly — needed for things like a Fellowship-phase Fatigue reset,
   * which is "set to 0," not a relative change. */
  mode?: 'delta' | 'set';
}

export interface PromptStep extends BaseStep {
  type: 'prompt';
  message: string;
}

/**
 * F5.3/F5.8 — a combat attack. Deliberately configuration-free: the
 * proficiency, target adversary, Target Number, damage, and Piercing-Blow
 * call are all live input at run time (they depend on the moment and on
 * core-rulebook numbers the app doesn't ship), the same way RollStep's
 * skill is picked live when blank. Only the combat runner renders this
 * step type; the journey/Fellowship runners offer a skip.
 */
export interface AttackStep extends BaseStep {
  type: 'attack';
}

export interface ConditionalBranchStep extends BaseStep {
  type: 'conditional-branch';
  /** Skips the next `skipCount` enabled steps when the immediately
   * preceding roll/table-draw step's outcome matches. A minimal branch
   * model, not a general expression language — enough for "skip the
   * next step if that roll failed." */
  when: 'previous-roll-failed' | 'previous-roll-succeeded';
  skipCount: number;
}

export type StepTemplateStep =
  | RollStep
  | TableDrawStep
  | ResourceChangeStep
  | PromptStep
  | AttackStep
  | ConditionalBranchStep;

export interface StepTemplate {
  id: string;
  name: string;
  steps: StepTemplateStep[];
}

export function createStepTemplate(name: string, steps: StepTemplateStep[] = []): StepTemplate {
  return { id: crypto.randomUUID(), name, steps };
}

export function renameStepTemplate(template: StepTemplate, name: string): StepTemplate {
  return { ...template, name };
}

/** F3.4 — "save the result as a named variant": a full copy under a new
 * identity, leaving the original untouched. */
export function duplicateStepTemplate(template: StepTemplate, name: string): StepTemplate {
  return {
    id: crypto.randomUUID(),
    name,
    steps: template.steps.map((s) => ({ ...s, id: crypto.randomUUID() })),
  };
}

export function addStep(template: StepTemplate, step: StepTemplateStep): StepTemplate {
  return { ...template, steps: [...template.steps, step] };
}

export function updateStep(template: StepTemplate, stepId: string, step: StepTemplateStep): StepTemplate {
  return { ...template, steps: template.steps.map((s) => (s.id === stepId ? step : s)) };
}

export function removeStep(template: StepTemplate, stepId: string): StepTemplate {
  return { ...template, steps: template.steps.filter((s) => s.id !== stepId) };
}

/** F3.4 — duplicate a single step in place, right after the original. */
export function duplicateStep(template: StepTemplate, stepId: string): StepTemplate {
  const index = template.steps.findIndex((s) => s.id === stepId);
  if (index === -1) return template;
  const copy = { ...template.steps[index], id: crypto.randomUUID() };
  const steps = [...template.steps];
  steps.splice(index + 1, 0, copy);
  return { ...template, steps };
}

export function toggleStepEnabled(template: StepTemplate, stepId: string): StepTemplate {
  return {
    ...template,
    steps: template.steps.map((s) => (s.id === stepId ? { ...s, enabled: !s.enabled } : s)),
  };
}

/** F3.4 — reorder by moving a step earlier/later in the sequence. */
export function moveStep(template: StepTemplate, stepId: string, direction: 'up' | 'down'): StepTemplate {
  const index = template.steps.findIndex((s) => s.id === stepId);
  if (index === -1) return template;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= template.steps.length) return template;
  const steps = [...template.steps];
  [steps[index], steps[target]] = [steps[target], steps[index]];
  return { ...template, steps };
}
