import type { WorldState } from "./types";

/** mulberry32 step on a raw state. Returns [value in 0..1) and the new state via the pair helpers below. */
export function nextRngState(state: number): number {
  return (state + 0x6d2b79f5) >>> 0;
}

export function rngValue(state: number): number {
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Advance the world RNG and return a float in [0, 1). The only randomness source in the sim. */
export function random(world: WorldState): number {
  world.rngState = nextRngState(world.rngState);
  return rngValue(world.rngState);
}
