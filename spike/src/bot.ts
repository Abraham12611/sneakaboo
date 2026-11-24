import type { Sim, SimInput } from './sim/sim';

const ROUTE: Array<[number, number]> = [
  [4.5, 4.5], [11, 4.5], [14.5, 6.5], [19, 7], [22, 8.5], [30, 8.5], [30, 4], [20, 4], [18.5, 7], [14.5, 7], [11, 9.5], [7, 9.5], [4.5, 8],
];

/** Walks a fixed route through both rooms (used for benchmarks / screenshots with ?bot=1). */
export class Bot {
  private i = 0;
  constructor(private sim: Sim) { sim.god = true; }
  read(): SimInput {
    const p = this.sim.pip;
    const [tx, ty] = ROUTE[this.i];
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    if (d < 0.35) { this.i = (this.i + 1) % ROUTE.length; return { dx: 0, dy: 0, gait: 'walk' }; }
    return { dx: dx / d, dy: dy / d, gait: 'walk' };
  }
}
