import { randomInt } from './random.ts';

export interface ParsedDiceExpression {
  count: number;
  sides: number;
  modifier: number;
}

export class DiceExpressionError extends Error {}

/** Accepts "NdM" or "NdM±X", e.g. "1d12", "2d6", "1d6+1". */
export function parseDiceExpression(expr: string): ParsedDiceExpression {
  const match = expr.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) throw new DiceExpressionError(`Unrecognized dice expression: "${expr}"`);
  const [, count, sides, modifier] = match;
  return { count: Number(count), sides: Number(sides), modifier: modifier ? Number(modifier) : 0 };
}

export interface DiceExpressionResult {
  rolls: number[];
  total: number;
}

export function rollDiceExpression(expr: string): DiceExpressionResult {
  const { count, sides, modifier } = parseDiceExpression(expr);
  const rolls = Array.from({ length: count }, () => randomInt(sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { rolls, total };
}
