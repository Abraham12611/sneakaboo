import type { Grid, Vec } from "./types";

const EPS = 1e-9;
const MAX_STEP = 0.1;

/** True when a circle at (x, y) does not overlap any blocking tile (out of bounds counts as blocking). */
export function circleFits(grid: Grid, x: number, y: number, r: number): boolean {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
  const y0 = Math.floor(y - r), y1 = Math.floor(y + r);
  const lim = r * r - EPS;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const oob = tx < 0 || ty < 0 || tx >= grid.w || ty >= grid.h;
      if (!oob && grid.blocksMove[ty * grid.w + tx] === 0) continue;
      const cx = x < tx ? tx : x > tx + 1 ? tx + 1 : x;
      const cy = y < ty ? ty : y > ty + 1 ? ty + 1 : y;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < lim) return false;
    }
  }
  return true;
}

/**
 * Move a circle by (dx, dy) with axis-separated sliding. Sub-steps keep each step <= 0.1 tile so
 * nothing tunnels through 1-tile walls. A blocked axis is bisected to sit flush against the obstacle.
 * Writes the result into `out` (no allocation).
 */
export function moveCircle(grid: Grid, x: number, y: number, dx: number, dy: number, r: number, out: Vec): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_STEP));
  const sx = dx / n, sy = dy / n;
  for (let i = 0; i < n; i++) {
    if (sx !== 0) {
      if (circleFits(grid, x + sx, y, r)) x += sx;
      else {
        let lo = 0, hi = 1;
        for (let k = 0; k < 8; k++) {
          const mid = (lo + hi) / 2;
          if (circleFits(grid, x + sx * mid, y, r)) lo = mid; else hi = mid;
        }
        x += sx * lo;
      }
    }
    if (sy !== 0) {
      if (circleFits(grid, x, y + sy, r)) y += sy;
      else {
        let lo = 0, hi = 1;
        for (let k = 0; k < 8; k++) {
          const mid = (lo + hi) / 2;
          if (circleFits(grid, x, y + sy * mid, r)) lo = mid; else hi = mid;
        }
        y += sy * lo;
      }
    }
  }
  out.x = x;
  out.y = y;
}
