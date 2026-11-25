import { describe, expect, it } from "vitest";
import {
  CACHE_STEPS, CHUNK, FloorChunks, MINI_H, MINI_W, ObliqueProjection, TopDownProjection, THREAT_RANGE, buildWallRuns, cacheScaleStep,
  chunkKey, chunkRange, isDoorway, miniLayout, threatArrow, wallHeightAt,
} from "../../src/game/view";
import { makeFakeCanvas, makeTestLevel, makeWorld } from "./helpers";

describe("chunk cache keys", () => {
  it("quantises scale to the next step up, capped at 2", () => {
    expect(cacheScaleStep(0.3)).toBe(0.5);
    expect(cacheScaleStep(0.5)).toBe(0.5);
    expect(cacheScaleStep(0.51)).toBe(0.75);
    expect(cacheScaleStep(1)).toBe(1);
    expect(cacheScaleStep(1.01)).toBe(1.5);
    expect(cacheScaleStep(1.8)).toBe(2);
    expect(cacheScaleStep(5)).toBe(CACHE_STEPS[CACHE_STEPS.length - 1]);
  });

  it("keys differ by chunk, projection and step", () => {
    const k = chunkKey(1, 2, "oblique", 1);
    expect(k).not.toBe(chunkKey(2, 1, "oblique", 1));
    expect(k).not.toBe(chunkKey(1, 2, "topdown", 1));
    expect(k).not.toBe(chunkKey(1, 2, "oblique", 1.5));
    expect(k).toBe(chunkKey(1, 2, "oblique", 1));
  });

  it("chunk range clamps to the level", () => {
    expect(chunkRange(-5, -5, 3, 3, 40, 24)).toEqual({ cx0: 0, cy0: 0, cx1: 0, cy1: 0 });
    expect(chunkRange(0, 0, 100, 100, 40, 24)).toEqual({ cx0: 0, cy0: 0, cx1: 4, cy1: 2 });
    expect(chunkRange(7, 7, 8, 8, 40, 24)).toEqual({ cx0: 0, cy0: 0, cx1: 1, cy1: 1 });
    expect(CHUNK).toBe(8);
  });

  it("builds a chunk once per (projection, step) and only again after the key changes", () => {
    const level = makeTestLevel();
    const world = makeWorld(level);
    const fc = makeFakeCanvas();
    const chunks = new FloorChunks(level, world.grid, fc.createCanvas);
    const ob = new ObliqueProjection();
    chunks.get(0, 0, ob, 1);
    chunks.get(0, 0, ob, 1);
    chunks.get(1, 0, ob, 1);
    expect(chunks.builds).toBe(2);
    expect(fc.offscreen.length).toBe(2);
    chunks.get(0, 0, ob, 1.5); // zoom crossed a step
    expect(chunks.builds).toBe(3);
    chunks.get(0, 0, new TopDownProjection(), 1.5); // projection switched
    expect(chunks.builds).toBe(4);
    chunks.prune("topdown", 1.5);
    expect(chunks.size).toBe(1);
    chunks.get(0, 0, ob, 1); // rebuilt after prune
    expect(chunks.builds).toBe(5);
  });
});

describe("static level geometry", () => {
  it("merges wall tiles into horizontal runs and drops south-edge walls to low", () => {
    const level = makeTestLevel();
    const runs = buildWallRuns(level);
    expect(runs.length).toBeLessThan(120);
    const north = runs.find((r) => r.kind === "wall" && r.y === 4 && r.x === 4);
    expect(north?.len).toBe(4); // tiles 4..7 before the windows at x=8,9
    expect(north?.height).toBeCloseTo(1.6, 9);
    expect(wallHeightAt(level, 10, 19)).toBeLessThan(1); // south wall seen from behind: low
    expect(wallHeightAt(level, 4, 10)).toBeGreaterThan(1); // west wall: tall
    expect(wallHeightAt(level, 20, 6)).toBe(0.5); // partition
    expect(wallHeightAt(level, 2, 1)).toBe(0); // grass
    expect(wallHeightAt(level, 6, 1)).toBeCloseTo(0.9, 9); // hedge
  });

  it("finds doorway gaps", () => {
    const level = makeTestLevel();
    expect(isDoorway(level, 20, 8)).toBe(true);
    expect(isDoorway(level, 10, 12)).toBe(true);
    expect(isDoorway(level, 15, 8)).toBe(false);
  });
});

describe("threat arrows", () => {
  const out = { x: 0, y: 0, angle: 0, strength: 0 };
  it("none beyond 10 tiles", () => {
    expect(threatArrow(0, 0, THREAT_RANGE + 1, 0, false, 640, 360, out)).toBe(false);
  });
  it("none for a drawn on-screen seeker", () => {
    expect(threatArrow(0, 0, 3, 0, true, 700, 400, out)).toBe(false);
  });
  it("hidden on-screen seeker gets an arrow on the screen edge, pointing at it", () => {
    expect(threatArrow(0, 0, 4, 0, false, 900, 360, out)).toBe(true);
    expect(out.angle).toBeCloseTo(0, 6);
    expect(out.x).toBeGreaterThan(1000);
    expect(out.y).toBeCloseTo(360, 6);
  });
  it("off-screen drawn seeker gets an arrow, clamped inside the viewport", () => {
    expect(threatArrow(0, 0, 6, 6, true, 2000, 1500, out)).toBe(true);
    expect(out.x).toBeLessThanOrEqual(1280);
    expect(out.y).toBeLessThanOrEqual(720);
    expect(out.x).toBeGreaterThan(640);
    expect(out.y).toBeGreaterThan(360);
    const near = out.strength;
    threatArrow(0, 0, 1, 0, false, 2000, 360, out);
    expect(out.strength).toBeGreaterThan(near);
  });
});

describe("minimap layout", () => {
  it("is aspect-correct and fits the 160x100 box", () => {
    for (const [w, h] of [[40, 24], [30, 16], [20, 40], [12, 12]] as const) {
      const l = miniLayout(w, h);
      expect(l.ts * w).toBeLessThanOrEqual(MINI_W + 1e-9);
      expect(l.ts * h).toBeLessThanOrEqual(MINI_H + 1e-9);
      expect(l.ox).toBeGreaterThanOrEqual(0);
      expect(l.oy).toBeGreaterThanOrEqual(0);
      expect(l.ox * 2 + l.ts * w).toBeCloseTo(MINI_W, 6);
      expect(l.oy * 2 + l.ts * h).toBeCloseTo(MINI_H, 6);
    }
  });
});
