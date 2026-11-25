import { FOOTSTEP_INTERVAL, NOISE_LIFE } from "./defaults";
import { GAIT_NOISE, SURFACE_NOISE } from "./types";
import type { Gait, SimEvent, WorldState } from "./types";

export function surfaceAt(world: WorldState, x: number, y: number): number {
  const g = world.grid;
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) return 0;
  return g.surface[ty * g.w + tx] ?? 0;
}

export function footstepRadius(gait: Gait, surface: number): number {
  return GAIT_NOISE[gait] * (SURFACE_NOISE[surface] ?? 1);
}

/** Age noise events and drop expired ones in place. */
export function ageNoise(world: WorldState, dt: number): void {
  const list = world.noise;
  let j = 0;
  for (let i = 0; i < list.length; i++) {
    const n = list[i]!;
    n.age += dt;
    if (n.age < n.life) list[j++] = n;
  }
  list.length = j;
}

export function emitNoise(world: WorldState, events: SimEvent[], x: number, y: number, radius: number, source: "player" | "world"): void {
  world.noise.push({ id: world.nextNoiseId++, x, y, radius, age: 0, life: NOISE_LIFE, source });
  events.push({ type: "noise", x, y, radius, source });
}

/** Footstep cadence. Sneaking and standing still are silent. */
export function updateFootsteps(world: WorldState, events: SimEvent[], dt: number): void {
  const p = world.player;
  if (!p.moving || p.gait === "sneak") {
    p.footTimer = 0;
    return;
  }
  const timer = (p.footTimer ?? 0) - dt;
  if (timer <= 0) {
    emitNoise(world, events, p.x, p.y, footstepRadius(p.gait, surfaceAt(world, p.x, p.y)), "player");
    p.footTimer = timer + FOOTSTEP_INTERVAL[p.gait];
  } else {
    p.footTimer = timer;
  }
}
