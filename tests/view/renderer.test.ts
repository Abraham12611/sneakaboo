import { describe, expect, it } from "vitest";
import { GameViewImpl, createGameView, getViewSettings, setMinimap, setThreatArrows } from "../../src/game/view";
import type { ViewControls } from "../../src/game/sim/types";
import { makeFakeCanvas, makeTestLevel, makeWorld } from "./helpers";

const NO_CTRL: ViewControls = { zoomDelta: 0, peek: false };

function setup(opts: { projection?: "oblique" | "topdown"; debug?: boolean } = {}) {
  const fc = makeFakeCanvas();
  const view = new GameViewImpl(fc.canvas, { projection: opts.projection ?? "oblique", debug: opts.debug }, { createCanvas: fc.createCanvas, now: () => 0 });
  const level = makeTestLevel();
  const world = makeWorld(level);
  view.resize(1280, 720, 1);
  view.setLevel(level, world);
  return { fc, view, level, world };
}

describe("GameViewImpl (mock 2D context)", () => {
  it("is exported as createGameView and satisfies the contract", () => {
    expect(typeof createGameView).toBe("function");
  });

  it("draws a frame in both projections without throwing", () => {
    for (const p of ["oblique", "topdown"] as const) {
      const { fc, view, world } = setup({ projection: p });
      fc.main.reset();
      view.frame(world, 0.5, 1 / 60, NO_CTRL, []);
      expect(fc.main.drawOps()).toBeGreaterThan(20);
      expect(view.getProjection()).toBe(p);
    }
  });

  it("toggles the projection live and keeps the level", () => {
    const { fc, view, world } = setup();
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    const builds = fc.offscreen.length;
    view.setProjection("topdown");
    expect(view.getProjection()).toBe("topdown");
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(fc.offscreen.length).toBeGreaterThan(builds); // chunks rebuilt for the new projection
    view.setProjection("oblique");
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(view.getProjection()).toBe("oblique");
  });

  it("caches floor chunks and stand layers: once warm, later frames at the same zoom build nothing new", () => {
    const { fc, view, world } = setup();
    view.skipIntro();
    // layer pieces are painted on a per-frame budget, so give the cache a few frames to fill
    for (let i = 0; i < 30; i++) view.frame(world, 0, 1 / 60, NO_CTRL, []);
    const n = fc.offscreen.length;
    for (let i = 0; i < 20; i++) view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(fc.offscreen.length).toBe(n);
  });

  it("zoom: clamps to the level limits, applies notches, exposes the target", () => {
    const { view, world } = setup();
    expect(view.getZoom()).toBe(1);
    view.setZoom(9);
    expect(view.getZoom()).toBe(1.8);
    view.setZoom(0.1);
    expect(view.getZoom()).toBe(0.6);
    view.setZoom(1);
    view.frame(world, 0, 1 / 60, { zoomDelta: 1, peek: false }, []);
    expect(view.getZoom()).toBeCloseTo(1.12, 9);
  });

  it("initialZoom option is clamped and used by setLevel", () => {
    const fc = makeFakeCanvas();
    const view = new GameViewImpl(fc.canvas, { projection: "oblique", initialZoom: 3 }, { createCanvas: fc.createCanvas });
    const level = makeTestLevel();
    view.setLevel(level, makeWorld(level));
    expect(view.getZoom()).toBe(1.8);
  });

  it("starts with the intro pan and skipIntro ends it", () => {
    const { view, world } = setup();
    expect(view.isIntroActive()).toBe(true);
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(view.isIntroActive()).toBe(true);
    view.skipIntro();
    expect(view.isIntroActive()).toBe(false);
  });

  it("host-style skipIntro on the first key centres the camera on Pip at once (no pan left)", () => {
    const { view, world, level } = setup();
    world.player.x = world.player.px = 20;
    world.player.y = world.player.py = 12;
    view.setLevel(level, world);
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    const before = view.screenToWorld(640, 360);
    expect(Math.hypot(before.x - 20, before.y - 12)).toBeGreaterThan(3); // the pan starts at Home Base (1..4, 21..23)
    view.skipIntro(); // what the host does on the first key press
    expect(view.isIntroActive()).toBe(false);
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    const c = view.screenToWorld(640, 360);
    expect(Math.hypot(c.x - 20, c.y - 12)).toBeLessThan(0.05);
  });

  it("a key press on the page skips the intro (after a short grace so the starting click does not)", () => {
    const listeners = new Map<string, (e: Event) => void>();
    const g = globalThis as unknown as { window?: unknown };
    const had = "window" in g;
    const prev = g.window;
    g.window = { addEventListener: (k: string, fn: (e: Event) => void) => listeners.set(k, fn), removeEventListener: () => undefined };
    try {
      const { view, world } = setup();
      const key = listeners.get("keydown")!;
      expect(key).toBeTypeOf("function");
      view.frame(world, 0, 1 / 60, NO_CTRL, []);
      key({ repeat: false } as unknown as Event); // within the grace: ignored
      expect(view.isIntroActive()).toBe(true);
      for (let i = 0; i < 20; i++) view.frame(world, 0, 1 / 60, NO_CTRL, []);
      key({ repeat: true } as unknown as Event); // auto-repeat never skips
      expect(view.isIntroActive()).toBe(true);
      key({ repeat: false } as unknown as Event);
      expect(view.isIntroActive()).toBe(false);
      view.dispose();
    } finally {
      if (had) g.window = prev;
      else delete g.window;
    }
  });

  it("screenToWorld inverts the camera transform (Pip at the viewport centre after the intro)", () => {
    const { view, world, level } = setup();
    world.player.x = world.player.px = 20;
    world.player.y = world.player.py = 12;
    view.setLevel(level, world);
    view.skipIntro();
    for (let i = 0; i < 120; i++) view.frame(world, 0, 1 / 60, NO_CTRL, []);
    const c = view.screenToWorld(640, 360);
    expect(Math.hypot(c.x - world.player.x, c.y - world.player.y)).toBeLessThan(1.6);
  });

  it("resize sets the backing store with dpr capped at 2, and handles letterboxing", () => {
    const { fc, view } = setup();
    view.resize(1000, 900, 3);
    expect(fc.canvas.width).toBe(2000);
    expect(fc.canvas.height).toBe(1800);
    expect(fc.canvas.style.width).toBe("1000px");
  });

  it("debug overlay adds draw work only when on and counts ops", () => {
    const off = setup();
    off.fc.main.reset();
    off.view.frame(off.world, 0, 1 / 60, NO_CTRL, []);
    const opsOff = off.fc.main.drawOps();
    expect(off.view.getStats().drawOps).toBe(0);
    const on = setup({ debug: true });
    on.fc.main.reset();
    on.view.frame(on.world, 0, 1 / 60, NO_CTRL, []);
    expect(on.fc.main.drawOps()).toBeGreaterThan(opsOff);
    expect(on.view.getStats().drawOps).toBeGreaterThan(0);
    on.view.setDebug(false);
    on.fc.main.reset();
    on.view.frame(on.world, 0, 1 / 60, NO_CTRL, []);
    expect(on.fc.main.drawOps()).toBeLessThanOrEqual(opsOff + 2);
  });

  it("toggles for minimap and threat arrows default on and change draw work", () => {
    expect(getViewSettings()).toEqual({ threatArrows: true, minimap: true });
    const a = setup();
    a.view.skipIntro();
    a.world.seekers[0]!.x = 8;
    a.world.seekers[0]!.px = 8;
    a.world.seekers[0]!.y = 8;
    a.world.seekers[0]!.py = 8;
    a.fc.main.reset();
    a.view.frame(a.world, 0, 1 / 60, NO_CTRL, []);
    const withAll = a.fc.main.drawOps();
    setMinimap(false);
    setThreatArrows(false);
    a.fc.main.reset();
    a.view.frame(a.world, 0, 1 / 60, NO_CTRL, []);
    expect(a.fc.main.drawOps()).toBeLessThan(withAll);
    setMinimap(true);
    setThreatArrows(true);
  });

  it("seekers in unknown rooms are not drawn but fogged rooms still render", () => {
    const { fc, view, world, level } = setup();
    world.player.x = world.player.px = 22;
    world.player.y = world.player.py = 12;
    view.setLevel(level, world);
    view.skipIntro();
    world.seekers = world.seekers.filter((s) => s.id === "s1"); // s1 stands in the unknown living room
    fc.main.reset();
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    const hidden = fc.main.calls.get("ellipse") ?? 0;
    world.roomVis["living"] = "visible";
    fc.main.reset();
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(fc.main.calls.get("ellipse") ?? 0).toBeGreaterThan(hidden);
  });

  it("Pip standing behind a tree canopy gets the silhouette drawn on top of everything", () => {
    const { fc, view, world, level } = setup();
    world.player.x = world.player.px = 37.5; // test tree: x 37, y 10, height 2; its canopy reaches up over row 8
    world.player.y = world.player.py = 8.6;
    view.setLevel(level, world);
    view.skipIntro();
    const scene = (view as unknown as { scene: { playerCover: number } }).scene;
    for (let i = 0; i < 40; i++) view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(scene.playerCover).toBeGreaterThan(0.95);
    fc.main.reset();
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    const strokesCovered = fc.main.calls.get("stroke") ?? 0;
    const tree = world.objects.find((o) => o.id === "tree")!;
    tree.def = { ...tree.def, y: 2 }; // same camera, but the tree now stands north of Pip (behind him)
    for (let i = 0; i < 40; i++) view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(scene.playerCover).toBe(0);
    fc.main.reset();
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(strokesCovered).toBeGreaterThanOrEqual((fc.main.calls.get("stroke") ?? 0) + 2); // keyline + light outline
  });

  it("a seeker in a visible room standing behind a wardrobe gets the marker, which goes away when he steps out", () => {
    const { view, world, level } = setup();
    world.player.x = world.player.px = 10.5;
    world.player.y = world.player.py = 14.5;
    const dog = world.seekers.find((s) => s.id === "s3")!;
    dog.x = dog.px = 12.9; // just north of the wardrobe (x 12..14, y 13..14, height 1.7)
    dog.y = dog.py = 12.6;
    world.roomVis["bedroom"] = "visible";
    view.setLevel(level, world);
    view.skipIntro();
    const scene = (view as unknown as { scene: { seekerOcc: Map<string, number> } }).scene;
    for (let i = 0; i < 40; i++) view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(scene.seekerOcc.get("s3")).toBe(1);
    // not covered once he steps out in front of it
    dog.y = dog.py = 15.5;
    for (let i = 0; i < 40; i++) view.frame(world, 0, 1 / 60, NO_CTRL, []);
    expect(scene.seekerOcc.get("s3")).toBe(0);
  });

  it("dispose is safe and frame after dispose is a no-op", () => {
    const { view, world } = setup();
    view.dispose();
    expect(() => view.frame(world, 0, 1 / 60, NO_CTRL, [])).not.toThrow();
  });
});
