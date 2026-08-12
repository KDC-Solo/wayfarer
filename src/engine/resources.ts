import type { Hero, Resources } from './types.ts';

export type ResourceField = keyof Resources;

/** Resources never go negative; there's no tracked upper bound (see types.ts). */
export function applyResourceDelta(hero: Hero, field: ResourceField, delta: number): Hero {
  const to = Math.max(0, hero.resources[field] + delta);
  return { ...hero, resources: { ...hero.resources, [field]: to } };
}

export function setResourceValue(hero: Hero, field: ResourceField, value: number): Hero {
  return { ...hero, resources: { ...hero.resources, [field]: Math.max(0, value) } };
}
