import { describe, expect, it } from 'vitest';
import { DiceExpressionError, parseDiceExpression, rollDiceExpression } from './diceExpression.ts';

describe('parseDiceExpression', () => {
  it('parses a plain NdM expression', () => {
    expect(parseDiceExpression('1d12')).toEqual({ count: 1, sides: 12, modifier: 0 });
    expect(parseDiceExpression('2d6')).toEqual({ count: 2, sides: 6, modifier: 0 });
  });

  it('parses a modifier', () => {
    expect(parseDiceExpression('1d6+1')).toEqual({ count: 1, sides: 6, modifier: 1 });
    expect(parseDiceExpression('1d6-2')).toEqual({ count: 1, sides: 6, modifier: -2 });
  });

  it('rejects garbage', () => {
    expect(() => parseDiceExpression('not a dice expression')).toThrow(DiceExpressionError);
    expect(() => parseDiceExpression('d6')).toThrow(DiceExpressionError);
  });
});

describe('rollDiceExpression', () => {
  it('rolls the right number of dice within range and sums with the modifier', () => {
    for (let i = 0; i < 200; i++) {
      const { rolls, total } = rollDiceExpression('2d6+1');
      expect(rolls).toHaveLength(2);
      for (const r of rolls) {
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(6);
      }
      expect(total).toBe(rolls[0] + rolls[1] + 1);
    }
  });
});
