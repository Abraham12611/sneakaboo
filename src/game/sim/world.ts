import { PLAYER_RADIUS, SEEKER_CONE } from "./defaults";
import { buildGrid, resolveObject } from "./grid";
import type { LevelData } from "./levelSchema";
import { updateRooms } from "./rooms";
import type { SeekerState, WorldState } from "./types";

const DEG = Math.PI / 180;

export function createWorld(level: LevelData): WorldState {
  const objects = level.objects.map(resolveObject);
  const { grid } = buildGrid(level, objects);
  const seekers: SeekerState[] = level.seekers.map((s) => {
    const cone = SEEKER_CONE[s.type] ?? SEEKER_CONE.other!;
    return {
      id: s.id, type: s.type, x: s.x, y: s.y, px: s.x, py: s.y,
      facing: s.facing * DEG, state: "patrol",
      coneRange: cone.range, coneAngle: cone.angleDeg * DEG, detection: 0,
    };
  });
  const roomVis: WorldState["roomVis"] = {};
  for (const r of level.rooms) roomVis[r.id] = "unknown";
  const world: WorldState = {
    level, grid, tick: 0, t: 0, status: "ready",
    timeLeft: level.timeLimit, timerStarted: false,
    player: {
      x: level.start.x, y: level.start.y, px: level.start.x, py: level.start.y,
      facing: level.start.facing * DEG, gait: "walk", moving: false, radius: PLAYER_RADIUS,
      hidden: false, footTimer: 0,
    },
    seekers, objects, noise: [], roomVis, currentRoom: null,
    rngState: level.seed >>> 0, nextNoiseId: 1,
  };
  // Set currentRoom without emitting; visibility stays "unknown" until the first step.
  const first = world.grid.roomIndex[Math.floor(level.start.y) * grid.w + Math.floor(level.start.x)] ?? -1;
  world.currentRoom = first >= 0 ? level.rooms[first]!.id : null;
  return world;
}

/** Fresh world for a retry of the same level (same seed). */
export function cloneWorldForRetry(world: WorldState): WorldState {
  return createWorld(world.level);
}

export { updateRooms };
