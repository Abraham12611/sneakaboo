import { describe, expect, it } from "vitest";
import { createWorld, isWalkable, roomIndexAt, runScenario, selectGait, stepWorld, sim } from "../../src/game/sim";
import { parseLevel } from "../../src/game/sim/levelSchema";
import { GAIT_NOISE, SIM_DT, SURFACE_NOISE } from "../../src/game/sim/types";
import type { SimEvent, WorldState } from "../../src/game/sim/types";
import { inp, makeLevel, makeLevelJson, makeTiles } from "./helpers";

const right = { move: { x: 1, y: 0 } };

function steps(w: WorldState, n: number, input = inp(), ev: SimEvent[] = []): SimEvent[] {
  for (let i = 0; i < n; i++) stepWorld(w, input, ev);
  return ev;
}

describe("level load", () => {
  it("parses the inline level and builds the grid", () => {
    const lvl = makeLevel({
      objects: [
        { id: "bed", type: "bed", x: 2, y: 2, w: 2, h: 1 },
        { id: "rug", type: "rug", x: 5, y: 8, w: 2, h: 2 },
        { id: "wd", type: "wardrobe", x: 7, y: 1, w: 1, h: 1 },
        { id: "dc", type: "door", x: 10, y: 5, w: 1, h: 2, state: "closed" },
        { id: "do", type: "door", x: 4, y: 9, w: 1, h: 1 },
      ],
      seekers: [{ id: "g", type: "grandma", x: 15.5, y: 3.5, facing: 90 }],
    });
    const w = createWorld(lvl);
    const g = w.grid;
    const at = (x: number, y: number) => y * g.w + x;
    expect(g.blocksMove[at(0, 0)]).toBe(1);
    expect(g.blocksSight[at(10, 1)]).toBe(1);
    expect(g.blocksMove[at(2, 2)]).toBe(1); // bed blocks move
    expect(g.blocksSight[at(2, 2)]).toBe(0); // 0.6 high
    expect(g.blocksMove[at(5, 8)]).toBe(0); // rug
    expect(g.blocksSight[at(7, 1)]).toBe(1); // wardrobe
    expect(g.blocksMove[at(10, 5)]).toBe(1); // closed door
    expect(g.blocksSight[at(10, 6)]).toBe(1);
    expect(g.blocksMove[at(4, 9)]).toBe(0); // open door
    expect(w.objects.find((o) => o.id === "bed")?.height).toBe(0.6);
    expect(w.objects.find((o) => o.id === "do")?.state).toBe("open");
    expect(w.objects.find((o) => o.id === "bed")?.state).toBe("static");
    expect(g.roomIndex[at(3, 3)]).toBe(0);
    expect(g.roomIndex[at(12, 3)]).toBe(1);
    expect(g.roomIndex[at(10, 5)]).toBe(0);
    expect(g.surface[at(3, 3)]).toBe(0);
    expect(g.surface[at(12, 3)]).toBe(2);
    expect(roomIndexAt(w, 12.2, 3.1)).toBe(1);
    expect(roomIndexAt(w, -1, 3)).toBe(-1);
    expect(w.seekers[0]).toMatchObject({ state: "patrol", coneRange: 5 });
    expect(w.seekers[0]!.facing).toBeCloseTo(Math.PI / 2);
    expect(w.seekers[0]!.coneAngle).toBeCloseTo((70 * Math.PI) / 180);
    expect(w.player).toMatchObject({ x: 3.5, y: 5.5, radius: 0.3 });
    expect(w.status).toBe("ready");
    expect(w.timeLeft).toBe(60);
    expect(Object.values(w.roomVis).every((v) => v === "unknown")).toBe(true);
    expect(sim.createWorld(lvl).tick).toBe(0);
  });

  it("rejects malformed levels", () => {
    expect(() => parseLevel(makeLevelJson({ size: { w: 19, h: 12 } }))).toThrow();
  });

  it("maps grass tiles outside rooms to the grass surface", () => {
    const tiles = makeTiles();
    tiles[1] = "#" + ",".repeat(18) + "#";
    const w = createWorld(makeLevel({ tiles, rooms: [] }));
    expect(w.grid.surface[1 * 20 + 5]).toBe(4);
    expect(w.grid.surface[2 * 20 + 5]).toBe(0);
  });
});

describe("collision", () => {
  it("cannot enter walls and stops flush", () => {
    const w = createWorld(makeLevel({ start: { x: 1.5, y: 5.5 } }));
    steps(w, 60, inp({ move: { x: -1, y: 0 } }));
    expect(w.player.x).toBeGreaterThanOrEqual(1.3 - 1e-6);
    expect(w.player.x).toBeLessThan(1.31);
    expect(isWalkable(w, w.player.x, w.player.y, 0.3)).toBe(true);
    expect(isWalkable(w, 0.5, 5.5, 0.3)).toBe(false);
    expect(isWalkable(w, 1.29, 5.5, 0.3)).toBe(false);
    expect(isWalkable(w, 100, 5, 0.3)).toBe(false);
  });

  it("slides along walls", () => {
    const w = createWorld(makeLevel({ start: { x: 1.5, y: 5.5 } }));
    steps(w, 30, inp({ move: { x: -1, y: 1 } }));
    expect(w.player.x).toBeLessThan(1.31);
    expect(w.player.y).toBeGreaterThan(5.5 + 1);
  });

  it("does not tunnel at run speed, even diagonally into a corner", () => {
    for (const mv of [{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: -1 }, { x: 1, y: -1 }]) {
      const w = createWorld(makeLevel({ start: { x: 5.5, y: 5.5 } }));
      steps(w, 600, inp({ move: mv, run: true }));
      expect(w.player.x).toBeGreaterThan(1.29);
      expect(w.player.y).toBeGreaterThan(1.29);
      expect(w.player.x).toBeLessThan(10);
    }
  });

  it("is blocked by solid partition but passes the doorway", () => {
    const w = createWorld(makeLevel({ start: { x: 8.5, y: 3.5 } }));
    steps(w, 200, inp({ move: { x: 1, y: 0 } }));
    expect(w.player.x).toBeLessThan(9.71);
    const w2 = createWorld(makeLevel());
    steps(w2, 240, inp({ move: { x: 1, y: 0 } }));
    expect(w2.player.x).toBeGreaterThan(11);
  });

  it("blocks on objects, not on rugs", () => {
    const w = createWorld(makeLevel({ objects: [{ id: "c", type: "crate", x: 6, y: 5, w: 1, h: 1 }, { id: "r", type: "rug", x: 2, y: 8, w: 4, h: 1 }] }));
    steps(w, 200, inp({ move: { x: 1, y: 0 } }));
    expect(w.player.x).toBeLessThan(5.71);
    expect(isWalkable(w, 3, 8.5, 0.3)).toBe(true);
  });
});

describe("gait selection", () => {
  const kb = (o: object) => selectGait(inp({ move: { x: 1, y: 0 }, ...o }));
  const an = (m: number) => selectGait(inp({ move: { x: m, y: 0 }, analog: true }));
  it("keyboard", () => {
    expect(kb({})).toBe("walk");
    expect(kb({ sneak: true })).toBe("sneak");
    expect(kb({ run: true })).toBe("run");
    expect(kb({ run: true, sneak: true })).toBe("run");
  });
  it("analog bands", () => {
    expect(an(0.1)).toBe("sneak");
    expect(an(0.39)).toBe("sneak");
    expect(an(0.4)).toBe("walk");
    expect(an(0.85)).toBe("walk");
    expect(an(0.86)).toBe("run");
    expect(an(1)).toBe("run");
    expect(selectGait(inp({ move: { x: 1, y: 1 }, analog: true }))).toBe("run"); // clamped to 1
  });
});

describe("speed", () => {
  it.each([
    ["sneak", { sneak: true }, 1.8],
    ["walk", {}, 3.0],
    ["run", { run: true }, 4.6],
  ])("%s covers speed tiles in 1 s", (_n, flags, speed) => {
    const w = createWorld(makeLevel({ start: { x: 2.5, y: 8.5 } }));
    const x0 = w.player.x;
    steps(w, 60, inp({ ...right, ...flags }));
    expect(Math.abs((w.player.x - x0) / speed - 1)).toBeLessThan(0.02);
  });
  it("normalizes diagonals and scales analog only via bands", () => {
    const w = createWorld(makeLevel({ start: { x: 3.5, y: 3.5 } }));
    steps(w, 60, inp({ move: { x: 1, y: 1 } }));
    expect(Math.hypot(w.player.x - 3.5, w.player.y - 3.5)).toBeCloseTo(3, 1);
    const a = createWorld(makeLevel({ start: { x: 2.5, y: 8.5 } }));
    steps(a, 60, inp({ move: { x: 0.6, y: 0 }, analog: true }));
    expect(a.player.x - 2.5).toBeCloseTo(3, 1); // walk speed, not 0.6 * walk
  });
  it("stores previous position and smooths facing", () => {
    const w = createWorld(makeLevel());
    steps(w, 1, inp({ move: { x: 0, y: 1 } }));
    expect(w.player.py).toBe(5.5);
    expect(w.player.y).toBeGreaterThan(5.5);
    expect(w.player.facing).toBeGreaterThan(0);
    expect(w.player.facing).toBeLessThan(Math.PI / 2);
    steps(w, 60, inp({ move: { x: 0, y: 1 } }));
    expect(w.player.facing).toBeCloseTo(Math.PI / 2, 2);
  });
});

describe("noise", () => {
  const cases: [string, object, "sneak" | "walk" | "run"][] = [["walk", {}, "walk"], ["run", { run: true }, "run"], ["sneak", { sneak: true }, "sneak"]];
  const spots: [string, number, number, number][] = [["wood", 3.5, 8.5, 0], ["tile", 13.5, 8.5, 2]];
  for (const [name, flags, gait] of cases) {
    for (const [sname, x, y, code] of spots) {
      it(`${name} on ${sname}`, () => {
        const w = createWorld(makeLevel({ start: { x, y } }));
        const ev: SimEvent[] = [];
        steps(w, 5, inp({ move: { x: 0, y: -1 }, ...flags }), ev);
        const noises = ev.filter((e) => e.type === "noise");
        if (gait === "sneak") { expect(noises).toHaveLength(0); return; }
        expect(noises.length).toBeGreaterThan(0);
        const e = noises[0] as Extract<SimEvent, { type: "noise" }>;
        expect(e.radius).toBeCloseTo(GAIT_NOISE[gait] * SURFACE_NOISE[code]!);
        expect(e.source).toBe("player");
      });
    }
  }
  it("uses carpet and creaky multipliers", () => {
    for (const [surface, mult] of [["carpet", 0.5], ["creaky", 1.8]] as const) {
      const rooms = [{ id: "r1", type: "living", rects: [[1, 1, 18, 10]], floorTint: "#aa8866", surface }];
      const w = createWorld(makeLevel({ rooms }));
      const ev = steps(w, 2, inp({ ...right, run: true }));
      const e = ev.find((x) => x.type === "noise") as Extract<SimEvent, { type: "noise" }>;
      expect(e.radius).toBeCloseTo(6 * mult);
    }
  });
  it("walk cadence is 0.45 s, run 0.28 s, and events expire after 0.6 s", () => {
    const w = createWorld(makeLevel({ start: { x: 2.5, y: 8.5 } }));
    const ev = steps(w, 120, inp({ ...right }));
    const n = ev.filter((e) => e.type === "noise").length;
    expect(n).toBe(5); // t=0, .45, .9, 1.35, 1.8
    const r = createWorld(makeLevel({ start: { x: 2.5, y: 8.5 } }));
    const ev2 = steps(r, 60, inp({ ...right, run: true }));
    expect(ev2.filter((e) => e.type === "noise").length).toBe(4); // 0, .28, .56, .84
    steps(r, 36, inp());
    expect(r.noise.length).toBe(0);
    expect(r.noise.every((n2) => n2.age < n2.life)).toBe(true);
  });
  it("noise events age and carry ids", () => {
    const w = createWorld(makeLevel());
    steps(w, 1, inp({ ...right }));
    expect(w.noise).toHaveLength(1);
    expect(w.noise[0]!.life).toBe(0.6);
    steps(w, 10, inp());
    expect(w.noise[0]!.age).toBeCloseTo(10 * SIM_DT, 6);
  });
});

describe("timer and status", () => {
  it("starts on first move, not before", () => {
    const w = createWorld(makeLevel());
    const ev = steps(w, 120, inp());
    expect(w.status).toBe("ready");
    expect(w.timeLeft).toBe(60);
    expect(w.timerStarted).toBe(false);
    expect(ev.some((e) => e.type === "timerStarted")).toBe(false);
    const ev2 = steps(w, 60, inp({ move: { x: 0, y: 1 } }));
    expect(w.status).toBe("playing");
    expect(w.timerStarted).toBe(true);
    expect(ev2.filter((e) => e.type === "timerStarted")).toHaveLength(1);
    expect(w.timeLeft).toBeCloseTo(59, 3);
    steps(w, 60, inp()); // keeps counting while standing
    expect(w.timeLeft).toBeCloseTo(58, 3);
  });
  it("times out and then ignores input", () => {
    const w = createWorld(makeLevel({ timeLimit: 1 }));
    const ev = steps(w, 70, inp({ move: { x: 0, y: 1 } }));
    expect(w.status).toBe("timeout");
    expect(w.timeLeft).toBe(0);
    expect(ev.filter((e) => e.type === "timeout")).toHaveLength(1);
    const y = w.player.y;
    steps(w, 30, inp({ move: { x: 0, y: 1 } }));
    expect(w.player.y).toBe(y);
    expect(w.status).toBe("timeout");
  });
  it("wins on reaching home and ignores input afterwards", () => {
    const w = createWorld(makeLevel({ start: { x: 15.5, y: 8.5 } }));
    const ev = steps(w, 120, inp({ ...right }));
    expect(w.status).toBe("won");
    expect(ev.filter((e) => e.type === "won")).toHaveLength(1);
    expect(w.player.x).toBeGreaterThanOrEqual(17);
    const x = w.player.x;
    steps(w, 30, inp({ ...right }));
    expect(w.player.x).toBe(x);
  });
  it("still ages noise after the game ends", () => {
    const w = createWorld(makeLevel({ timeLimit: 0.1 }));
    steps(w, 20, inp({ ...right }));
    expect(w.status).toBe("timeout");
    steps(w, 60, inp());
    expect(w.noise).toHaveLength(0);
  });
});

describe("determinism and serialization", () => {
  const script = [
    { t0: 0.2, t1: 2, input: { move: { x: 1, y: 0 } } },
    { t0: 2, t1: 3, input: { move: { x: 0, y: 1 }, run: true } },
    { t0: 3, t1: 5, input: { move: { x: -0.5, y: -0.5 }, analog: true } },
  ];
  it("same script twice gives identical traces", () => {
    const a = runScenario(makeLevel(), script);
    const b = runScenario(makeLevel(), script);
    expect(a.trace.length).toBe(300);
    expect(JSON.stringify(a.trace)).toBe(JSON.stringify(b.trace));
    expect(a.events).toEqual(b.events);
    expect(a.world.rngState).toBe(b.world.rngState);
  });
  it("scenario reports events with ticks", () => {
    const r = runScenario(makeLevel(), script, { traceEvery: 10 });
    expect(r.trace.length).toBe(30);
    expect(r.events.length).toBe(r.eventTicks.length);
    expect(r.events.some((e) => e.type === "timerStarted")).toBe(true);
  });
  it("world is JSON-serializable apart from grid and level", () => {
    const r = runScenario(makeLevel(), script);
    const { grid: _g, level: _l, ...rest } = r.world;
    void _g; void _l;
    const json = JSON.stringify(rest);
    const back = JSON.parse(json) as typeof rest;
    expect(back.player.x).toBe(r.world.player.x);
    expect(back.tick).toBe(r.world.tick);
    expect(JSON.stringify(back)).toBe(json);
  });
  it("retry from the same level restarts identically", () => {
    const r = runScenario(makeLevel(), script);
    const r2 = runScenario(r.world.level, script);
    expect(r2.world.player.x).toBe(r.world.player.x);
  });
});

describe("rooms and fog", () => {
  it("starts with all rooms unknown, then the current room is visible", () => {
    const w = createWorld(makeLevel());
    expect(w.currentRoom).toBe("r1");
    expect(w.roomVis).toEqual({ r1: "unknown", r2: "unknown" });
    const ev = steps(w, 1);
    expect(w.roomVis.r1).toBe("visible");
    expect(ev.filter((e) => e.type === "roomRevealed").map((e) => (e as { roomId: string }).roomId)).toContain("r1");
  });
  it("sees the adjacent room through the doorway line of sight", () => {
    const w = createWorld(makeLevel());
    const ev = steps(w, 1);
    expect(w.roomVis.r2).toBe("visible");
    expect(ev).toContainEqual({ type: "roomRevealed", roomId: "r2" });
  });
  it("does not see the adjacent room through a solid wall", () => {
    const w = createWorld(makeLevel({ tiles: makeTiles({ doorway: false }) }));
    steps(w, 5);
    expect(w.roomVis.r1).toBe("visible");
    expect(w.roomVis.r2).toBe("unknown");
    // also from standing right next to the wall
    w.player.x = 9.6; w.player.y = 5.5;
    steps(w, 2);
    expect(w.roomVis.r2).toBe("unknown");
  });
  it("does not see through a closed door but does through an open one", () => {
    const door = (state: string) => ({ id: "d", type: "door", x: 10, y: 5, w: 1, h: 2, state });
    const closed = createWorld(makeLevel({ objects: [door("closed")] }));
    steps(closed, 2);
    expect(closed.roomVis.r2).toBe("unknown");
    const open = createWorld(makeLevel({ objects: [door("open")] }));
    steps(open, 2);
    expect(open.roomVis.r2).toBe("visible");
  });
  it("sees through a window tile", () => {
    const tiles = makeTiles({ doorway: false });
    tiles[5] = tiles[5]!.slice(0, 10) + "w" + tiles[5]!.slice(11);
    const w = createWorld(makeLevel({ tiles }));
    steps(w, 2);
    expect(w.roomVis.r2).toBe("visible");
    expect(w.grid.blocksMove[5 * 20 + 10]).toBe(1);
  });
  it("marks rooms remembered after they leave view and emits roomEntered", () => {
    const w = createWorld(makeLevel({ objects: [{ id: "d", type: "door", x: 10, y: 5, w: 1, h: 2, state: "open" }] }));
    const ev: SimEvent[] = [];
    steps(w, 1, inp(), ev);
    expect(w.roomVis.r2).toBe("visible");
    // close the door, which hides r2 from the player
    w.objects[0]!.blocksSight = true;
    for (const t of [[10, 5], [10, 6]]) w.grid.blocksSight[t[1]! * 20 + t[0]!] = 1;
    steps(w, 1, inp(), ev);
    expect(w.roomVis.r2).toBe("remembered");
    steps(w, 1, inp(), ev);
    expect(w.roomVis.r2).toBe("remembered");
    expect(ev.filter((e) => e.type === "roomRevealed" && (e as { roomId: string }).roomId === "r2")).toHaveLength(1);
  });
  it("walking through the doorway enters r2 and r1 becomes remembered when hidden", () => {
    const w = createWorld(makeLevel());
    const ev: SimEvent[] = [];
    steps(w, 200, inp({ ...right }), ev);
    expect(w.currentRoom).toBe("r2");
    expect(ev).toContainEqual({ type: "roomEntered", roomId: "r2" });
    // Teleport beside the wall where no ray reaches r1 through the doorway.
    w.player.x = 11.5; w.player.y = 1.5;
    steps(w, 1);
    expect(w.roomVis.r2).toBe("visible");
    expect(w.roomVis.r1).toBe("remembered");
  });
  it("respects the 14 tile range", () => {
    const wide = Array.from({ length: 12 }, (_, y) => (y === 0 || y === 11 ? "#".repeat(40) : "#" + ".".repeat(38) + "#"));
    const level = makeLevel({
      size: { w: 40, h: 12 }, tiles: wide, home: [37, 5, 1, 1],
      rooms: [
        { id: "a", type: "hall", rects: [[1, 1, 5, 10]], floorTint: "#aaaaaa" },
        { id: "b", type: "hall", rects: [[30, 1, 9, 10]], floorTint: "#aaaaaa" },
      ],
      start: { x: 3.5, y: 5.5 },
    });
    const w = createWorld(level);
    steps(w, 1);
    expect(w.roomVis.b).toBe("unknown");
  });
  it("yard counts as a room", () => {
    const rooms = [
      { id: "in", type: "living", rects: [[1, 1, 9, 10]], floorTint: "#aa8866" },
      { id: "yard", type: "yard", rects: [[11, 1, 8, 10]], floorTint: "#44aa44", surface: "grass" },
    ];
    const w = createWorld(makeLevel({ rooms, start: { x: 15.5, y: 5.5 } }));
    steps(w, 1);
    expect(w.currentRoom).toBe("yard");
    expect(w.grid.surface[5 * 20 + 15]).toBe(4);
  });
});

describe("perf", () => {
  it("steps a 40x24 level well under 1 ms", () => {
    const tiles = Array.from({ length: 24 }, (_, y) => (y === 0 || y === 23 ? "#".repeat(40) : "#" + (y % 6 === 0 ? "=" : ".").repeat(38) + "#"));
    const rooms = Array.from({ length: 8 }, (_, i) => ({ id: `r${i}`, type: "hall", rects: [[1 + (i % 4) * 9, 1 + Math.floor(i / 4) * 11, 9, 11]], floorTint: "#aaaaaa" }));
    const w = createWorld(makeLevel({ size: { w: 40, h: 24 }, tiles, rooms, home: [37, 20, 1, 1], start: { x: 2.5, y: 2.5 } }));
    const input = inp({ move: { x: 1, y: 0.3 }, run: true });
    const ev: SimEvent[] = [];
    for (let i = 0; i < 200; i++) { ev.length = 0; stepWorld(w, input, ev); }
    const t0 = performance.now();
    const n = 1000;
    for (let i = 0; i < n; i++) { ev.length = 0; stepWorld(w, i % 2 ? input : inp({ move: { x: -1, y: -0.3 }, run: true }), ev); }
    const per = (performance.now() - t0) / n;
    console.log(`step avg ${per.toFixed(4)} ms`);
    expect(per).toBeLessThan(1);
  });
});
