import { createWorld } from "./world";
import { stepWorld } from "./step";
import { NO_INPUT, SIM_DT } from "./types";
import type { Gait, GameStatus, InputState, SimEvent, WorldState } from "./types";
import type { LevelData } from "./levelSchema";

export interface ScriptSegment {
  /** Start and end, seconds. Active while t0 <= t < t1. Later segments override earlier ones. */
  t0: number;
  t1: number;
  input: Partial<InputState>;
}

export interface TraceSample {
  tick: number;
  t: number;
  x: number; y: number;
  facing: number;
  gait: Gait;
  moving: boolean;
  status: GameStatus;
  timeLeft: number;
  room: string | null;
  noiseCount: number;
}

export interface ScenarioOptions {
  /** Total seconds to run. Default: the largest t1 in the script. */
  duration?: number;
  /** Record a trace sample every N ticks (default 1). */
  traceEvery?: number;
  /** Start from an existing world instead of createWorld(level). */
  world?: WorldState;
}

export interface ScenarioResult {
  world: WorldState;
  events: SimEvent[];
  /** Tick on which each event in `events` was emitted (parallel array). */
  eventTicks: number[];
  trace: TraceSample[];
}

export function runScenario(level: LevelData, script: readonly ScriptSegment[], opts: ScenarioOptions = {}): ScenarioResult {
  const world = opts.world ?? createWorld(level);
  const duration = opts.duration ?? script.reduce((m, s) => Math.max(m, s.t1), 0);
  const ticks = Math.round(duration / SIM_DT);
  const every = Math.max(1, opts.traceEvery ?? 1);
  const events: SimEvent[] = [];
  const eventTicks: number[] = [];
  const trace: TraceSample[] = [];
  const input: InputState = { ...NO_INPUT, move: { x: 0, y: 0 } };
  const tickEvents: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    const t = i * SIM_DT + 1e-9;
    input.move.x = 0; input.move.y = 0; input.analog = false; input.sneak = false; input.run = false;
    input.interactPressed = false; input.interactHeld = false; input.useSlot = null;
    for (const seg of script) {
      if (t < seg.t0 || t >= seg.t1) continue;
      const s = seg.input;
      if (s.move) { input.move.x = s.move.x; input.move.y = s.move.y; }
      if (s.analog !== undefined) input.analog = s.analog;
      if (s.sneak !== undefined) input.sneak = s.sneak;
      if (s.run !== undefined) input.run = s.run;
      if (s.interactPressed !== undefined) input.interactPressed = s.interactPressed;
      if (s.interactHeld !== undefined) input.interactHeld = s.interactHeld;
      if (s.useSlot !== undefined) input.useSlot = s.useSlot;
    }
    tickEvents.length = 0;
    stepWorld(world, input, tickEvents);
    for (const e of tickEvents) { events.push({ ...e }); eventTicks.push(world.tick); }
    if (i % every === 0) {
      const p = world.player;
      trace.push({
        tick: world.tick, t: world.t, x: p.x, y: p.y, facing: p.facing, gait: p.gait, moving: p.moving,
        status: world.status, timeLeft: world.timeLeft, room: world.currentRoom, noiseCount: world.noise.length,
      });
    }
  }
  return { world, events, eventTicks, trace };
}
