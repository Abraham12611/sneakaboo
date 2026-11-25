/** Occlusion fade: things in front of the player that overlap him fade to ~35% within ~2.2 tiles. */
export const OCCLUDE_ALPHA = 0.35;
export const OCCLUDE_RADIUS = 2.2;
/** Time constant of the alpha tween (s). About 0.2 s to settle, so nothing pops. */
export const OCCLUDE_TIME_CONST = 0.07;

export interface Rect4 {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function rectsOverlap(a: Rect4, b: Rect4): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/**
 * Target alpha for a standing thing.
 * @param dist distance (tiles) between the thing and the player
 * @param inFront true when the thing is drawn after the player (baseline greater than his)
 * @param overlaps true when the screen rects overlap
 */
export function occlusionTarget(dist: number, inFront: boolean, overlaps: boolean): number {
  return inFront && overlaps && dist <= OCCLUDE_RADIUS ? OCCLUDE_ALPHA : 1;
}

/** Exponential tween toward `target`, frame-rate independent. */
export function tweenAlpha(current: number, target: number, dt: number): number {
  const k = 1 - Math.exp(-dt / OCCLUDE_TIME_CONST);
  const v = current + (target - current) * k;
  return Math.abs(v - target) < 0.004 ? target : v;
}
