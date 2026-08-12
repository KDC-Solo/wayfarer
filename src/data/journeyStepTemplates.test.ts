import { describe, expect, it } from 'vitest';
import { defaultJourneyContent } from './journeyStepTemplates.ts';

describe('defaultJourneyContent', () => {
  it('ships eight tables (Solo Journey Events + seven Event Detail tables)', () => {
    const { tables } = defaultJourneyContent();
    expect(tables).toHaveLength(8);
    expect(tables[0].name).toBe('Solo Journey Events');
  });

  it("the table-draw step's tableId matches the seeded Solo Journey Events table", () => {
    const { tables, template } = defaultJourneyContent();
    const drawStep = template.steps.find((s) => s.type === 'table-draw');
    expect(drawStep).toBeDefined();
    expect(drawStep && 'tableId' in drawStep && drawStep.tableId).toBe(tables[0].id);
  });

  it('includes a roll step and a fatigue resource-change step, both left for the player to fill in', () => {
    const { template } = defaultJourneyContent();
    const roll = template.steps.find((s) => s.type === 'roll');
    const resourceChange = template.steps.find((s) => s.type === 'resource-change');
    expect(roll).toMatchObject({ skillName: '', role: 'guide' });
    expect(resourceChange).toMatchObject({ field: 'fatigue', amount: 0 });
  });

  it('every step is enabled by default', () => {
    const { template } = defaultJourneyContent();
    expect(template.steps.every((s) => s.enabled)).toBe(true);
  });
});
