import { SIM_DT } from "../sim/types";

export const MAX_FRAME_DT = 0.1;
export const MAX_STEPS_PER_FRAME = 5;
const EPS = 1e-9;

/** Clamp a raw frame delta (seconds) before time scaling. */
export function clampFrameDt(dt: number): number {
  return Math.min(Math.max(dt, 0), MAX_FRAME_DT);
}

/** Fixed-timestep accumulator. Pure, no clock. */
export class Accumulator {
  private acc = 0;

  constructor(
    private readonly step = SIM_DT,
    private readonly maxSteps = MAX_STEPS_PER_FRAME,
  ) {}

  /** Add `dt` seconds (already scaled); returns how many fixed steps to run now. */
  advance(dt: number): number {
    this.acc += Math.max(dt, 0);
    let steps = 0;
    while (this.acc >= this.step - EPS && steps < this.maxSteps) {
      this.acc -= this.step;
      steps++;
    }
    // Spiral-of-death guard: drop any backlog we could not run this frame.
    if (this.acc >= this.step - EPS) {
      this.acc %= this.step;
      if (this.acc >= this.step - EPS) this.acc = 0;
    }
    if (this.acc < 0) this.acc = 0;
    return steps;
  }

  /** Interpolation factor 0..1 between the previous and current tick. */
  get alpha(): number {
    return Math.min(1, Math.max(0, this.acc / this.step));
  }

  reset(): void {
    this.acc = 0;
  }
}
