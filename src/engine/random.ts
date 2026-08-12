/** Uniform integer in [0, exclusiveMax). Shared by dice.ts and diceExpression.ts. */
export function randomInt(exclusiveMax: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % exclusiveMax;
}
