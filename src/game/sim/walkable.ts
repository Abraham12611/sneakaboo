import { circleFits } from "./collision";
import type { WorldState } from "./types";

/** True if a circle of `radius` at (x, y) fits (does not overlap blocking tiles). */
export function isWalkable(world: WorldState, x: number, y: number, radius: number): boolean {
  return circleFits(world.grid, x, y, radius);
}
