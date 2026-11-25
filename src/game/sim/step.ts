import { hasMoveIntent, updatePlayer } from "./player";
import { ageNoise } from "./noise";
import { updateRooms } from "./rooms";
import { SIM_DT } from "./types";
import type { InputState, SimEvent, WorldState } from "./types";

function inHome(world: WorldState): boolean {
  const [hx, hy, hw, hh] = world.level.home;
  const { x, y } = world.player;
  return x >= hx && x < hx + hw && y >= hy && y < hy + hh;
}

/** Advance exactly one fixed tick. */
export function stepWorld(world: WorldState, input: InputState, events: SimEvent[]): void {
  world.tick++;
  world.t += SIM_DT;
  ageNoise(world, SIM_DT);
  if (world.status === "won" || world.status === "timeout" || world.status === "found") return;

  const p = world.player;
  p.px = p.x; p.py = p.y;
  for (const s of world.seekers) { s.px = s.x; s.py = s.y; }

  if (world.status === "ready" && hasMoveIntent(input)) {
    world.status = "playing";
    world.timerStarted = true;
    events.push({ type: "timerStarted" });
  }

  updatePlayer(world, input, events);
  updateRooms(world, events);

  if (world.status === "playing") {
    if (inHome(world)) {
      world.status = "won";
      p.moving = false;
      events.push({ type: "won" });
      return;
    }
    world.timeLeft -= SIM_DT;
    if (world.timeLeft <= 0) {
      world.timeLeft = 0;
      world.status = "timeout";
      p.moving = false;
      events.push({ type: "timeout" });
    }
  }
}
