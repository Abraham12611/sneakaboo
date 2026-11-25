import type { Surface } from "./levelSchema";
import type { LevelObject } from "./levelSchema";

export const PLAYER_RADIUS = 0.3;
export const NOISE_LIFE = 0.6;
export const FOOTSTEP_INTERVAL = { walk: 0.45, run: 0.28 } as const;
export const FOG_RANGE = 14;

export const DEFAULT_HEIGHT: Record<LevelObject["type"], number> = {
  bed: 0.6, wardrobe: 2.0, closet: 2.0, sofa: 0.8, armchair: 0.8, chair: 0.6, table: 0.7,
  table_cloth: 0.7, desk: 0.8, nightstand: 0.5, dresser: 0.9, bookshelf: 1.8, fridge: 1.8,
  counter: 0.9, stove: 0.9, sink: 0.9, tub: 0.5, toilet: 0.5, plant: 0.9, rug: 0, chest: 0.6,
  box: 0.5, crate: 0.7, barrel: 0.8, painting: 0, lamp: 0.4, tv_unit: 0.6, piano: 1.0, car: 1.0,
  bench: 0.5, tree: 2.5, shed: 2.0, door: 1.8, other: 0.8,
};

/** Object types that do not block walking by default. */
export const NON_BLOCKING_TYPES: ReadonlySet<LevelObject["type"]> = new Set(["rug", "painting", "lamp"]);

export const SIGHT_BLOCK_HEIGHT = 1.2;

export const SURFACE_CODE: Record<Surface, number> = {
  wood: 0, carpet: 1, tile: 2, creaky: 3, grass: 4, concrete: 5,
};

/** Seeker vision cone: range in tiles, full angle in degrees. */
export const SEEKER_CONE: Record<string, { range: number; angleDeg: number }> = {
  grandma: { range: 5, angleDeg: 70 },
  uncle: { range: 6, angleDeg: 60 },
  twin: { range: 5, angleDeg: 60 },
  dog: { range: 3, angleDeg: 120 },
  sprinter: { range: 7, angleDeg: 35 },
  watcher: { range: 7, angleDeg: 25 },
  guard: { range: 6, angleDeg: 90 },
  other: { range: 5, angleDeg: 60 },
};
