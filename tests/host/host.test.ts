import { describe, expect, it } from "vitest";
import type {
  CreateGameView, CreateInputController, GameView, InputController, ProjectionKind, SimApi,
} from "../../src/game/contracts";
import { Accumulator, clampFrameDt, MAX_STEPS_PER_FRAME } from "../../src/game/host/accumulator";
import { GameHost } from "../../src/game/host/GameHost";
import { BANNER_TEXT, formatTime } from "../../src/game/host/hud";
import type { BannerKind, HostUi, HostUiHandlers } from "../../src/game/host/hud";
import { buildRegistry } from "../../src/game/host/levelRegistry";
import { parseQueryFlags } from "../../src/game/host/queryFlags";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from "../../src/game/host/settings";
import type { StorageLike } from "../../src/game/host/settings";
import type { LevelData } from "../../src/game/sim/levelSchema";
import { NO_INPUT, SIM_DT } from "../../src/game/sim/types";
import type { InputState, SimEvent, ViewControls, WorldState } from "../../src/game/sim/types";

// ---- accumulator ---------------------------------------------------------------------------
function ticksFor(hz: number, frames: number, scale = 1): { ticks: number; seconds: number } {
  const acc = new Accumulator();
  let ticks = 0;
  let prev = 0;
  for (let i = 1; i <= frames; i++) {
    const now = (i * 1000) / hz;
    ticks += acc.advance(clampFrameDt((now - prev) / 1000) * scale);
    prev = now;
  }
  return { ticks, seconds: (frames * 1) / hz };
}

describe("accumulator", () => {
  it("runs 60 ticks per second at 144, 60 and 30 Hz with no drift", () => {
    for (const hz of [144, 60, 30]) {
      const { ticks, seconds } = ticksFor(hz, 1000);
      expect(Math.abs(ticks - seconds * 60)).toBeLessThanOrEqual(1);
    }
    const a = ticksFor(144, 1440).ticks; // exactly 10 s
    const b = ticksFor(60, 600).ticks;
    const c = ticksFor(30, 300).ticks;
    for (const t of [a, b, c]) expect(Math.abs(t - 600)).toBeLessThanOrEqual(1);
  });
  it("clamps long frames (spiral of death) and drops the backlog", () => {
    const acc = new Accumulator();
    expect(clampFrameDt(5)).toBe(0.1);
    expect(clampFrameDt(-1)).toBe(0);
    expect(acc.advance(10)).toBe(MAX_STEPS_PER_FRAME);
    expect(acc.alpha).toBeLessThan(1);
    expect(acc.advance(0)).toBe(0); // backlog dropped, not replayed
  });
  it("alpha is the leftover fraction of a step", () => {
    const acc = new Accumulator();
    expect(acc.advance(SIM_DT * 1.5)).toBe(1);
    expect(acc.alpha).toBeCloseTo(0.5);
  });
  it("time scale multiplies tick rate", () => {
    const { ticks } = ticksFor(60, 600, 2);
    expect(Math.abs(ticks - 1200)).toBeLessThanOrEqual(2);
  });
});

// ---- query flags / settings / registry ------------------------------------------------------
describe("parseQueryFlags", () => {
  it("defaults", () => {
    expect(parseQueryFlags("")).toEqual({
      level: "L01", debug: false, proj: undefined, touch: false, lefty: false, timescale: 1,
    });
  });
  it("parses all flags", () => {
    const f = parseQueryFlags("?level=L03&debug=1&proj=topdown&touch=1&timescale=0.5&lefty=1");
    expect(f).toEqual({ level: "L03", debug: true, proj: "topdown", touch: true, lefty: true, timescale: 0.5 });
  });
  it("clamps and sanitizes", () => {
    expect(parseQueryFlags("?timescale=100").timescale).toBe(4);
    expect(parseQueryFlags("?timescale=0.01").timescale).toBe(0.25);
    expect(parseQueryFlags("?timescale=abc").timescale).toBe(1);
    expect(parseQueryFlags("?proj=weird&debug=0&level=").proj).toBeUndefined();
    expect(parseQueryFlags("?level=").level).toBe("L01");
  });
});

function memStorage(initial?: string): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(SETTINGS_KEY, initial);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe("settings", () => {
  it("falls back to defaults on corrupt JSON", () => {
    expect(loadSettings(memStorage("{not json"))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memStorage("null"))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memStorage())).toEqual(DEFAULT_SETTINGS);
  });
  it("keeps valid fields and drops invalid ones", () => {
    const s = loadSettings(memStorage(JSON.stringify({ zoom: 1.4, leftHanded: "yes", projection: "topdown" })));
    expect(s).toEqual({ zoom: 1.4, leftHanded: false, projection: "topdown" });
    expect(loadSettings(memStorage(JSON.stringify({ zoom: "big" }))).zoom).toBeNull();
  });
  it("tolerates blocked storage", () => {
    const blocked: StorageLike = {
      getItem() { throw new Error("denied"); },
      setItem() { throw new Error("denied"); },
    };
    expect(loadSettings(blocked)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings(DEFAULT_SETTINGS, blocked)).toBe(false);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings(DEFAULT_SETTINGS, null)).toBe(false);
  });
  it("round-trips", () => {
    const st = memStorage();
    saveSettings({ zoom: 1.2, leftHanded: true, projection: "topdown" }, st);
    expect(loadSettings(st)).toEqual({ zoom: 1.2, leftHanded: true, projection: "topdown" });
  });
});

describe("level registry", () => {
  it("skips _ files and reports problems instead of throwing", () => {
    const r = buildRegistry({ "/levels/_template.json": {}, "/levels/bad.json": { nope: 1 } });
    expect(r.levels.size).toBe(0);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]?.file).toBe("bad.json");
    expect(r.problems[0]?.message.length).toBeGreaterThan(0);
  });
});

describe("hud helpers", () => {
  it("formats mm:ss rounding up", () => {
    expect(formatTime(90)).toBe("01:30");
    expect(formatTime(59.2)).toBe("01:00");
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(-3)).toBe("00:00");
  });
});

// ---- host with fakes -----------------------------------------------------------------------
interface Fakes {
  host: GameHost;
  world: () => WorldState;
  stepped: InputState[];
  frames: { alpha: number; dt: number; controls: ViewControls; events: SimEvent[] }[];
  ui: { banner: BannerKind | null; paused: boolean; rotate: boolean; timer: string; urgent: boolean; debug: string | null; handlers: HostUiHandlers | null };
  cmds: { pause: boolean; restart: boolean; toggleProjection: boolean; toggleDebug: boolean };
  worldsCreated: () => number;
  view: { projection: ProjectionKind; zoom: number; resizes: [number, number, number][]; setLevelCalls: number; debug: boolean };
  emit: { events: SimEvent[]; status: WorldState["status"] | null; timeLeft: number | null };
  env: { fire: () => void };
  pending: { pollSimCalls: number; pressed: boolean };
  storage: ReturnType<typeof memStorage>;
}

const LEVEL = { id: "T1", name: "Test House", timeLimit: 100, seed: 7 } as unknown as LevelData;

function setup(options: ConstructorParameters<typeof GameHost>[1] = {}): Fakes {
  let created = 0;
  let world = {} as WorldState;
  const stepped: InputState[] = [];
  const emit: Fakes["emit"] = { events: [], status: null, timeLeft: null };
  const sim: SimApi = {
    createWorld() {
      created++;
      world = { level: LEVEL, tick: 0, t: 0, status: "ready", timeLeft: 100, timerStarted: false } as unknown as WorldState;
      return world;
    },
    stepWorld(w, input, events) {
      stepped.push(input);
      w.tick++;
      if (emit.timeLeft !== null) w.timeLeft = emit.timeLeft;
      if (emit.events.length) { events.push(...emit.events); emit.events = []; }
      if (emit.status) w.status = emit.status;
    },
    roomIndexAt: () => -1,
    isWalkable: () => true,
  };
  const frames: Fakes["frames"] = [];
  const view = { projection: "oblique" as ProjectionKind, zoom: 1, resizes: [] as [number, number, number][], setLevelCalls: 0, debug: false };
  const createView: CreateGameView = (_c, opts) => {
    view.projection = opts.projection;
    const v: GameView = {
      setLevel() { view.setLevelCalls++; },
      resize: (w, h, d) => void view.resizes.push([w, h, d]),
      setProjection: (k) => { view.projection = k; },
      getProjection: () => view.projection,
      frame: (_w, alpha, dt, controls, events) => void frames.push({ alpha, dt, controls, events: [...events] }),
      getZoom: () => view.zoom,
      setZoom: (z) => { view.zoom = z; },
      screenToWorld: () => ({ x: 0, y: 0 }),
      setDebug: (on) => { view.debug = on; },
      dispose() {},
    };
    return v;
  };
  const cmds = { pause: false, restart: false, toggleProjection: false, toggleDebug: false };
  const pending = { pollSimCalls: 0, pressed: false };
  const createInput: CreateInputController = () => {
    const c: InputController = {
      pollSim() {
        pending.pollSimCalls++;
        const s = { ...NO_INPUT, interactPressed: pending.pressed };
        pending.pressed = false;
        return s;
      },
      pollView: () => ({ zoomDelta: 0, peek: false }),
      pollCommands() {
        const out = { ...cmds };
        cmds.pause = cmds.restart = cmds.toggleProjection = cmds.toggleDebug = false;
        return out;
      },
      setLeftHanded() {},
      dispose() {},
    };
    return c;
  };
  const ui: Fakes["ui"] = { banner: null, paused: false, rotate: false, timer: "", urgent: false, debug: null, handlers: null };
  const fakeUi: HostUi = {
    bind: (h) => { ui.handlers = h; },
    setLevelName() {},
    setTimer: (t, u) => { ui.timer = t; ui.urgent = u; },
    setBanner: (k) => { ui.banner = k; },
    setPaused: (on) => { ui.paused = on; },
    setRotateOverlay: (on) => { ui.rotate = on; },
    setDebugText: (t) => { ui.debug = t; },
    dispose() {},
  };
  const storage = memStorage();
  const host = new GameHost(
    {
      sim, createView, createInput, level: LEVEL, canvas: {} as HTMLCanvasElement, container: {} as HTMLElement,
      ui: fakeUi, env: null, storage,
    },
    options,
  );
  return {
    host, world: () => world, stepped, frames, ui, cmds, worldsCreated: () => created, view, emit,
    env: { fire() {} }, pending, storage,
  };
}

/** Drive `n` frames at 60 Hz starting after `startMs`; returns the last timestamp. */
function run(host: GameHost, startMs: number, n: number, stepMs = 1000 / 60): number {
  let t = startMs;
  for (let i = 0; i < n; i++) { t += stepMs; host.tick(t); }
  return t;
}

describe("GameHost", () => {
  it("runs the sim at a fixed 60 Hz and gives the view an alpha each frame", () => {
    const f = setup();
    host0(f);
    const t = run(f.host, 0, 120);
    expect(Math.abs(f.stepped.length - 120)).toBeLessThanOrEqual(1);
    expect(f.frames.length).toBe(121);
    for (const fr of f.frames) { expect(fr.alpha).toBeGreaterThanOrEqual(0); expect(fr.alpha).toBeLessThanOrEqual(1); }
    expect(t).toBeGreaterThan(0);
  });

  it("clamps a huge frame gap to at most 5 sim steps", () => {
    const f = setup();
    f.host.tick(0);
    f.host.tick(60_000);
    expect(f.stepped.length).toBeLessThanOrEqual(5);
  });

  it("passes sim events to the view once, then clears them", () => {
    const f = setup();
    f.host.tick(0);
    f.emit.events = [{ type: "timerStarted" }];
    f.host.tick(17);
    f.host.tick(34);
    expect(f.frames.some((fr) => fr.events.some((e) => e.type === "timerStarted"))).toBe(true);
    expect(f.frames.filter((fr) => fr.events.length > 0)).toHaveLength(1);
  });

  it("pause command freezes ticks but keeps drawing; resume continues", () => {
    const f = setup();
    let t = run(f.host, 0, 30);
    const before = f.stepped.length;
    f.cmds.pause = true;
    const framesBefore = f.frames.length;
    t = run(f.host, t, 30);
    expect(f.host.isPaused()).toBe(true);
    expect(f.ui.paused).toBe(true);
    expect(f.stepped.length).toBe(before);
    expect(f.frames.length).toBe(framesBefore + 30);
    f.cmds.pause = true;
    run(f.host, t, 30);
    expect(f.host.isPaused()).toBe(false);
    expect(f.ui.paused).toBe(false);
    expect(f.stepped.length).toBeGreaterThan(before + 25);
  });

  it("does not replay input pressed while paused", () => {
    const f = setup();
    let t = run(f.host, 0, 5);
    f.host.pause();
    f.pending.pressed = true;
    t = run(f.host, t, 5);
    f.host.resume();
    run(f.host, t, 5);
    expect(f.stepped.some((s) => s.interactPressed)).toBe(false);
  });

  it("auto-pauses on blur or hidden document", () => {
    const f = setup();
    const t = run(f.host, 0, 10);
    f.host.onHidden();
    const n = f.stepped.length;
    run(f.host, t, 20);
    expect(f.stepped.length).toBe(n);
    expect(f.host.isPaused()).toBe(true);
  });

  it("auto-pauses in portrait with the rotate overlay and resumes in landscape", () => {
    const f = setup();
    let t = run(f.host, 0, 10);
    f.host.setPortrait(true);
    expect(f.ui.rotate).toBe(true);
    expect(f.ui.paused).toBe(false); // rotate overlay replaces the pause card
    const n = f.stepped.length;
    t = run(f.host, t, 20);
    expect(f.stepped.length).toBe(n);
    f.host.setPortrait(false);
    expect(f.ui.rotate).toBe(false);
    run(f.host, t, 20);
    expect(f.stepped.length).toBeGreaterThan(n + 15);
  });

  it("portrait does not clear an explicit pause", () => {
    const f = setup();
    f.host.pause();
    f.host.setPortrait(true);
    f.host.setPortrait(false);
    expect(f.host.isPaused()).toBe(true);
    expect(f.ui.paused).toBe(true);
  });

  it("restart recreates the world, clears the banner and unpauses", () => {
    const f = setup();
    run(f.host, 0, 10);
    const first = f.world();
    f.emit.events = [{ type: "timeout" }];
    f.emit.status = "timeout";
    run(f.host, 200, 5);
    expect(f.host.getBanner()).toBe("timeout");
    f.emit.status = null;
    f.cmds.restart = true;
    run(f.host, 400, 1);
    expect(f.worldsCreated()).toBe(2);
    expect(f.world()).not.toBe(first);
    expect(f.world().status).toBe("ready");
    expect(f.host.getBanner()).toBeNull();
    expect(f.ui.banner).toBeNull();
    expect(f.view.setLevelCalls).toBe(2);
    const n = f.stepped.length;
    run(f.host, 450, 10);
    expect(f.stepped.length).toBeGreaterThan(n);
  });

  it("Retry button on the banner restarts", () => {
    const f = setup();
    f.emit.events = [{ type: "won" }];
    run(f.host, 0, 3);
    expect(f.ui.banner).toBe("won");
    f.ui.handlers?.retry();
    expect(f.ui.banner).toBeNull();
    expect(f.worldsCreated()).toBe(2);
  });

  it.each([
    ["won", "HOME BASE!"],
    ["timeout", "Time's up!"],
    ["found", "FOUND YOU!"],
  ] as const)("%s event shows its banner and stops the sim", (type, text) => {
    const f = setup();
    run(f.host, 0, 3);
    f.emit.events = type === "found" ? [{ type: "found", seekerId: "s1" }] : [{ type }];
    const t = run(f.host, 100, 3);
    expect(f.ui.banner).toBe(type);
    expect(BANNER_TEXT[type]).toBe(text);
    const n = f.stepped.length;
    run(f.host, t, 20);
    expect(f.stepped.length).toBe(n);
  });

  it("status change alone also raises the banner", () => {
    const f = setup();
    run(f.host, 0, 2);
    f.emit.status = "won";
    run(f.host, 50, 2);
    expect(f.ui.banner).toBe("won");
  });

  it("HUD timer turns red under 25% of the time limit", () => {
    const f = setup();
    f.emit.timeLeft = 40;
    run(f.host, 0, 3);
    expect(f.ui.timer).toBe("00:40");
    expect(f.ui.urgent).toBe(false);
    f.emit.timeLeft = 24;
    run(f.host, 100, 3);
    expect(f.ui.urgent).toBe(true);
  });

  it("toggles projection and persists it", () => {
    const f = setup();
    f.cmds.toggleProjection = true;
    f.host.tick(0);
    expect(f.view.projection).toBe("topdown");
    expect(loadSettings(f.storage).projection).toBe("topdown");
  });

  it("toggles debug and view debug flag", () => {
    const f = setup();
    f.cmds.toggleDebug = true;
    f.host.tick(0);
    expect(f.view.debug).toBe(true);
    expect(f.ui.debug).not.toBeNull();
    f.cmds.toggleDebug = true;
    f.host.tick(17);
    expect(f.ui.debug).toBeNull();
  });

  it("time scale: 2x doubles ticks; stepping through 0.25..4", () => {
    const f = setup({ timeScale: 2 });
    run(f.host, 0, 60);
    expect(Math.abs(f.stepped.length - 120)).toBeLessThanOrEqual(2);
    f.host.setTimeScale(1);
    f.host.stepTimeScale(1);
    expect(f.host.getTimeScale()).toBe(2);
    f.host.stepTimeScale(1);
    f.host.stepTimeScale(1);
    expect(f.host.getTimeScale()).toBe(4);
    f.host.stepTimeScale(-1);
    f.host.stepTimeScale(-1);
    f.host.stepTimeScale(-1);
    f.host.stepTimeScale(-1);
    f.host.stepTimeScale(-1);
    expect(f.host.getTimeScale()).toBe(0.25);
  });

  it("single-step advances exactly one tick while paused", () => {
    const f = setup({ debug: true });
    f.host.tick(0);
    f.host.pause();
    const n = f.stepped.length;
    f.host.stepOnce();
    expect(f.stepped.length).toBe(n + 1);
  });

  it("resize passes css size and caps dpr at 2", () => {
    const f = setup();
    f.host.resize(800, 400, 3);
    f.host.resize(800, 400, 1.5);
    expect(f.view.resizes).toEqual([[800, 400, 2], [800, 400, 1.5]]);
  });

  it("level hot reload restarts only for the matching id", () => {
    const f = setup();
    f.host.reloadLevel({ ...LEVEL, id: "other" } as LevelData);
    expect(f.worldsCreated()).toBe(1);
    const updated = { ...LEVEL, name: "Renamed" } as LevelData;
    f.host.reloadLevel(updated);
    expect(f.worldsCreated()).toBe(2);
    expect(f.host.getLevel()).toBe(updated);
  });

  it("persists a changed zoom, but not an unchanged level default", () => {
    const f = setup();
    run(f.host, 0, 40);
    expect(f.storage.data.has(SETTINGS_KEY)).toBe(false);
    f.view.zoom = 1.4;
    run(f.host, 1000, 40);
    expect(loadSettings(f.storage).zoom).toBe(1.4);
  });

  it("dispose stops ticking", () => {
    const f = setup();
    f.host.tick(0);
    f.host.dispose();
    const n = f.frames.length;
    f.host.tick(100);
    expect(f.frames.length).toBe(n);
  });
});

function host0(f: Fakes): void {
  f.host.tick(0);
}
