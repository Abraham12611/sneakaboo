import type { LevelData } from "../sim/levelSchema";
import type { WorldState } from "../sim/types";
import type { FogMap } from "./fog";
import type { Rect4 } from "./occlusion";
import type { Projection } from "./projection";
import type { Ctx } from "./shapes";

/** Everything a draw module needs for one frame. World-space drawing happens in projected px (zoom 1 units). */
export interface Env {
  ctx: Ctx;
  proj: Projection;
  world: WorldState;
  level: LevelData;
  fog: FogMap;
  zoom: number;
  /** Counter-scale for world-space UI. */
  uiScale: number;
  /** Seconds of sim time (drives animation). */
  t: number;
  alpha: number;
  /** Visible rect in projected px (for culling). */
  view: Rect4;
  /** Interpolated player position (flat tiles). */
  pip: { x: number; y: number };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
