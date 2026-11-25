import { describe, expect, it } from "vitest";
import {
  FOG_REMEMBERED, FOG_UNKNOWN, FOG_VISIBLE, FogMap, OCCLUDE_ALPHA, castRay, conePolygon, fogColor, fogOverlayAlpha,
  fogStateOf, occlusionTarget, rectsOverlap, tweenAlpha,
} from "../../src/game/view";
import { makeTestLevel, makeWorld } from "./helpers";

describe("occlusion alpha", () => {
  it("fades things in front that overlap, at any distance; leaves the rest", () => {
    expect(occlusionTarget(true, true)).toBe(OCCLUDE_ALPHA);
    expect(occlusionTarget(false, true)).toBe(1);
    expect(occlusionTarget(true, false)).toBe(1);
    expect(occlusionTarget(false, false)).toBe(1);
    expect(OCCLUDE_ALPHA).toBeCloseTo(0.35, 9);
  });
  it("tweens smoothly (no pop) and monotonically", () => {
    let a = 1;
    const seq: number[] = [];
    for (let i = 0; i < 30; i++) {
      a = tweenAlpha(a, 0.35, 1 / 60);
      seq.push(a);
    }
    expect(seq[0]).toBeGreaterThan(0.8); // first frame moves only a little
    for (let i = 1; i < seq.length; i++) expect(seq[i]!).toBeLessThanOrEqual(seq[i - 1]!);
    expect(seq[seq.length - 1]).toBeCloseTo(0.35, 2);
    let b = 0.35;
    for (let i = 0; i < 60; i++) b = tweenAlpha(b, 1, 1 / 60);
    expect(b).toBe(1);
  });

  it("is frame-rate independent", () => {
    let a = 1;
    let b = 1;
    for (let i = 0; i < 30; i++) a = tweenAlpha(a, 0.35, 1 / 60);
    for (let i = 0; i < 15; i++) b = tweenAlpha(b, 0.35, 1 / 30);
    expect(Math.abs(a - b)).toBeLessThan(0.01);
  });

  it("rect overlap is strict", () => {
    expect(rectsOverlap({ x0: 0, y0: 0, x1: 2, y1: 2 }, { x0: 1, y0: 1, x1: 3, y1: 3 })).toBe(true);
    expect(rectsOverlap({ x0: 0, y0: 0, x1: 1, y1: 1 }, { x0: 1, y0: 0, x1: 2, y1: 1 })).toBe(false);
  });
});

describe("fog", () => {
  it("maps room visibility to states and overlay alpha", () => {
    expect(fogStateOf("visible")).toBe(FOG_VISIBLE);
    expect(fogStateOf("remembered")).toBe(FOG_REMEMBERED);
    expect(fogStateOf("unknown")).toBe(FOG_UNKNOWN);
    expect(fogStateOf(undefined)).toBe(FOG_UNKNOWN);
    expect(fogOverlayAlpha(FOG_VISIBLE)).toBe(0);
    expect(fogOverlayAlpha(FOG_REMEMBERED)).toBeCloseTo(0.55, 9); // ~45% brightness left
    expect(fogOverlayAlpha(FOG_UNKNOWN)).toBeGreaterThan(0.9);
    expect(fogOverlayAlpha(FOG_UNKNOWN)).toBeLessThan(1);
  });

  it("colours: visible unchanged, remembered dimmer and less saturated, unknown near black", () => {
    const hex = "#ff4020";
    expect(fogColor(hex, FOG_VISIBLE)).toBe(hex);
    const rem = fogColor(hex, FOG_REMEMBERED);
    const unk = fogColor(hex, FOG_UNKNOWN);
    const ch = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const [r, g, b] = ch(rem) as [number, number, number];
    const [or, og, ob] = ch(hex) as [number, number, number];
    expect(r).toBeLessThan(or);
    expect(r - Math.min(g, b)).toBeLessThan(or - Math.min(og, ob)); // desaturated
    const [ur, ug, ub] = ch(unk) as [number, number, number];
    expect(Math.max(ur, ug, ub)).toBeLessThan(40);
  });

  it("FogMap assigns per-tile states from roomVis; yard stays visible; walls take the best neighbour", () => {
    const level = makeTestLevel();
    const world = makeWorld(level);
    const fog = new FogMap(level, world.grid.roomIndex);
    expect(fog.update(world)).toBe(true);
    expect(fog.update(world)).toBe(false); // unchanged
    expect(fog.at(8, 8)).toBe(FOG_VISIBLE); // hall
    expect(fog.at(8, 15)).toBe(FOG_REMEMBERED); // bedroom
    expect(fog.at(28, 10)).toBe(FOG_UNKNOWN); // living
    expect(fog.at(1, 10)).toBe(FOG_VISIBLE); // yard (grass, no room)
    expect(fog.at(8, 4)).toBe(FOG_VISIBLE); // window facing yard + hall
    world.roomVis["living"] = "visible";
    const v = fog.version;
    expect(fog.update(world)).toBe(true);
    expect(fog.version).toBe(v + 1);
    expect(fog.at(28, 10)).toBe(FOG_VISIBLE);
    // doorway tile (no room) follows the nearest room
    expect(fog.at(20, 8)).toBeGreaterThanOrEqual(FOG_REMEMBERED);
  });
});

describe("cone raycast", () => {
  it("stops at walls and never exceeds range", () => {
    const level = makeTestLevel();
    const world = makeWorld(level);
    // from (10.5, 8.5) cast +x: partition at x=20 blocks (tile 20,7). row 8 is a doorway (door1 at y=10 only), so use y=6.5
    const d = castRay(world.grid, 10.5, 6.5, 0, 50);
    expect(d).toBeCloseTo(20 - 10.5, 6);
    expect(castRay(world.grid, 10.5, 6.5, 0, 3)).toBe(3);
    expect(castRay(world.grid, 10.5, 6.5, Math.PI, 50)).toBeCloseTo(10.5 - 5, 6); // west wall x=4 -> hits at x=5
  });

  it("every cone polygon vertex lies on the seeker's side of a blocking tile", () => {
    const level = makeTestLevel();
    const world = makeWorld(level);
    const out: number[] = [];
    const n = conePolygon(world.grid, 18.5, 6.5, 0, 6, 1.4, out);
    expect(n).toBe(2 + 28);
    for (let i = 1; i < n; i++) {
      const x = out[i * 2]!;
      const y = out[i * 2 + 1]!;
      expect(Math.hypot(x - 18.5, y - 6.5)).toBeLessThanOrEqual(6 + 1e-6);
      expect(x).toBeLessThanOrEqual(20 + 1e-6); // partition at x=20
    }
  });

  it("a closed door tile (blocksSight) clips the cone", () => {
    const level = makeTestLevel();
    const world = makeWorld(level);
    expect(castRay(world.grid, 15.5, 10.5, 0, 30)).toBeCloseTo(20 - 15.5, 6);
    expect(castRay(world.grid, 15.5, 8.5, 0, 30)).toBeGreaterThan(8); // doorway gap passes
  });
});
