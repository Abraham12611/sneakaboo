/**
 * Occlusion fade: anything drawn after the player (baseline further south) whose projected screen rect
 * overlaps the player's screen rect fades to ~35%, however far away it is. A tall tree canopy three tiles
 * south can still cover him, so distance plays no part.
 */
export const OCCLUDE_ALPHA = 0.35;
/** Time constant of the alpha tween (s). About 0.2 s to settle, so nothing pops. */
export const OCCLUDE_TIME_CONST = 0.07;
/** A covering thing only counts as hiding the character while it is more opaque than this. */
export const SILHOUETTE_MIN_COVER_ALPHA = 0.25;

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
 * @param inFront true when the thing is drawn after the player (its baseline is greater than his)
 * @param overlaps true when its screen rect overlaps the player's screen rect
 */
export function occlusionTarget(inFront: boolean, overlaps: boolean): number {
  return inFront && overlaps ? OCCLUDE_ALPHA : 1;
}

/** Convenience for rect-based callers: `baseline` is the y (in tiles) where the thing stands. */
export function occludesPlayer(thingBase: number, playerBase: number, thingRect: Rect4, playerRect: Rect4): boolean {
  return thingBase > playerBase && rectsOverlap(thingRect, playerRect);
}

/** Exponential tween toward `target`, frame-rate independent. */
export function tweenAlpha(current: number, target: number, dt: number): number {
  const k = 1 - Math.exp(-dt / OCCLUDE_TIME_CONST);
  const v = current + (target - current) * k;
  return Math.abs(v - target) < 0.004 ? target : v;
}

/**
 * 0..1 strength of the character silhouette given the lowest alpha among the things covering him
 * (1 = nothing covers him). Rises while the cover fades in, stays at 1 while the cover rests at
 * `OCCLUDE_ALPHA` (still above `SILHOUETTE_MIN_COVER_ALPHA`, so he stays marked), and is 0 when uncovered.
 */
export function silhouetteStrength(minCoverAlpha: number): number {
  if (minCoverAlpha >= 1 || minCoverAlpha <= SILHOUETTE_MIN_COVER_ALPHA) return 0;
  return Math.max(0, Math.min(1, (1 - minCoverAlpha) / (1 - OCCLUDE_ALPHA)));
}
