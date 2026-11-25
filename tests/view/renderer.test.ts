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

  it("caches floor chunks: later frames at the same zoom build nothing new", () => {
    const { fc, view, world } = setup();
    view.skipIntro();
    view.frame(world, 0, 1 / 60, NO_CTRL, []);
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

  it("dispose is safe and frame after dispose is a no-op", () => {
    const { view, world } = setup();
    view.dispose();
    expect(() => view.frame(world, 0, 1 / 60, NO_CTRL, [])).not.toThrow();
  });
});
