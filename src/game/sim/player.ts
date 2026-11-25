import { moveCircle } from "./collision";
import { updateFootsteps } from "./noise";
import { GAIT_SPEED, SIM_DT } from "./types";
import type { Gait, InputState, SimEvent, Vec, WorldState } from "./types";

const TURN_RATE = 18; // 1/s, exponential smoothing of facing
const tmp: Vec = { x: 0, y: 0 };

/** Gait for an input. Analog: by magnitude bands. Keyboard: run beats sneak beats default walk. */
export function selectGait(input: InputState): Gait {
  if (input.analog) {
    const m = Math.min(1, Math.hypot(input.move.x, input.move.y));
    return m < 0.4 ? "sneak" : m <= 0.85 ? "walk" : "run";
  }
  if (input.run) return "run";
  if (input.sneak) return "sneak";
  return "walk";
}

export function hasMoveIntent(input: InputState): boolean {
  return input.move.x * input.move.x + input.move.y * input.move.y > 1e-6;
}

function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Move the player for one tick and emit footsteps. Assumes px/py are already updated by the caller. */
export function updatePlayer(world: WorldState, input: InputState, events: SimEvent[]): void {
  const p = world.player;
  if (hasMoveIntent(input)) {
    const mx = input.move.x, my = input.move.y;
    const len = Math.hypot(mx, my);
    p.gait = selectGait(input);
    const step = GAIT_SPEED[p.gait] * SIM_DT;
    moveCircle(world.grid, p.x, p.y, (mx / len) * step, (my / len) * step, p.radius, tmp);
    const moved = Math.hypot(tmp.x - p.x, tmp.y - p.y);
    p.moving = moved > 1e-6;
    p.x = tmp.x;
    p.y = tmp.y;
    // Face the intent direction (also when pressed against a wall).
    const target = Math.atan2(my, mx);
    p.facing += angleDelta(p.facing, target) * (1 - Math.exp(-TURN_RATE * SIM_DT));
  } else {
    p.moving = false;
  }
  updateFootsteps(world, events, SIM_DT);
}
