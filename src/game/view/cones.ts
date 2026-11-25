/** Placeholder vision cone: DDA raycast against `grid.blocksSight` so wedges never cross walls (phase 2 owns real cones). */
import type { Grid } from "../sim/types";

/**
 * Distance from (ox, oy) along `angle` to the first sight-blocking tile, capped at `maxDist`.
 * The tile the ray starts in is ignored.
 */
export function castRay(grid: Grid, ox: number, oy: number, angle: number, maxDist: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let tx = Math.floor(ox);
  let ty = Math.floor(oy);
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
  let tMaxX = dx === 0 ? Infinity : ((dx > 0 ? tx + 1 - ox : ox - tx)) * tDeltaX;
  let tMaxY = dy === 0 ? Infinity : ((dy > 0 ? ty + 1 - oy : oy - ty)) * tDeltaY;
  let t = 0;
  while (t < maxDist) {
    if (tMaxX < tMaxY) {
      t = tMaxX;
      tMaxX += tDeltaX;
      tx += stepX;
    } else {
      t = tMaxY;
      tMaxY += tDeltaY;
      ty += stepY;
    }
    if (t >= maxDist) return maxDist;
    if (tx < 0 || ty < 0 || tx >= grid.w || ty >= grid.h) return t;
    if (grid.blocksSight[ty * grid.w + tx]) return t;
  }
  return maxDist;
}

/**
 * Fan polygon of a cone, flat world coordinates. Writes [x0,y0,x1,y1,...] into `out` (origin first)
 * and returns the number of points. `coneAngle` is the full opening angle in radians.
 */
export function conePolygon(
  grid: Grid,
  ox: number,
  oy: number,
  facing: number,
  range: number,
  coneAngle: number,
  out: number[],
  rays = 28,
): number {
  out.length = 0;
  out.push(ox, oy);
  const a0 = facing - coneAngle / 2;
  for (let i = 0; i <= rays; i++) {
    const a = a0 + (coneAngle * i) / rays;
    const d = castRay(grid, ox, oy, a, range);
    out.push(ox + Math.cos(a) * d, oy + Math.sin(a) * d);
  }
  return out.length / 2;
}
