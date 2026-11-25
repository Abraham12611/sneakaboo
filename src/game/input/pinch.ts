/** Two-finger pinch -> fractional zoom notches (no DOM). */

/** One zoom notch corresponds to this scale ratio between finger distances. */
export const PINCH_NOTCH_RATIO = 1.2;
/** Ignore jitter smaller than this many css px of distance change. */
export const PINCH_MIN_DELTA_PX = 1;

export function pinchNotches(prevDist: number, nextDist: number): number {
  if (prevDist <= 0 || nextDist <= 0) return 0;
  if (Math.abs(nextDist - prevDist) < PINCH_MIN_DELTA_PX) return 0;
  return Math.log(nextDist / prevDist) / Math.log(PINCH_NOTCH_RATIO);
}

export class PinchTracker {
  private last = 0;
  private active = false;

  get isActive(): boolean {
    return this.active;
  }

  start(dist: number): void {
    this.last = dist;
    this.active = dist > 0;
  }

  /** Returns the notches to add for this move (positive = spread = zoom in). */
  update(dist: number): number {
    if (!this.active) return 0;
    const n = pinchNotches(this.last, dist);
    if (n !== 0) this.last = dist;
    return n;
  }

  end(): void {
    this.active = false;
    this.last = 0;
  }
}
