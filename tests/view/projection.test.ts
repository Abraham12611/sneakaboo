import { describe, expect, it } from "vitest";
import { ObliqueProjection, TILE_PX, TopDownProjection, cssToWorld, computeViewport, worldToCss, type Projection, worldUiScale } from "../../src/game/view";

const zooms = [0.6, 0.85, 1, 1.4, 1.8];
const pts: [number, number][] = [[0, 0], [3.5, 7.25], [39.9, 23.1], [12, 0.001]];

describe("projection", () => {
  it("uses 64 px tiles and K=0.85 for oblique", () => {
    const p = new ObliqueProjection();
    expect(TILE_PX).toBe(64);
    expect(p.worldToScreen(2, 3)).toEqual({ sx: 128, sy: 3 * 64 * 0.85 });
    expect(p.worldToScreen(2, 3, 1).sy).toBeCloseTo(3 * 64 * 0.85 - 64, 9);
    expect(p.tileScreenH).toBeCloseTo(54.4, 9);
    expect(p.wallHeightPx).toBeGreaterThan(0);
  });

  it("top-down ignores z and has no wall extrusion", () => {
    const p: Projection = new TopDownProjection();
    expect(p.worldToScreen(2, 3, 5)).toEqual({ sx: 128, sy: 192 });
    expect(p.wallHeightPx).toBe(0);
    expect(p.heightPx).toBe(0);
  });

  for (const P of [new ObliqueProjection(), new TopDownProjection()]) {
    it(`${P.name}: world <-> projected round trip < 1e-6`, () => {
      for (const [x, y] of pts) {
        const s = P.worldToScreen(x, y);
        const w = P.screenToWorld(s.sx, s.sy);
        expect(Math.abs(w.x - x)).toBeLessThan(1e-6);
        expect(Math.abs(w.y - y)).toBeLessThan(1e-6);
      }
    });

    it(`${P.name}: world <-> CSS px round trip through camera + letterbox at several zooms`, () => {
      const vps = [computeViewport(1280, 720, 1), computeViewport(1000, 900, 2), computeViewport(1920, 800, 1.5)];
      for (const vp of vps)
        for (const zoom of zooms)
          for (const [x, y] of pts) {
            const cam = { x: 10.3, y: 7.7, zoom };
            const c = worldToCss(P, cam, vp, x, y);
            const w = cssToWorld(P, cam, vp, c.x, c.y);
            expect(Math.abs(w.x - x)).toBeLessThan(1e-6);
            expect(Math.abs(w.y - y)).toBeLessThan(1e-6);
          }
    });
  }

  it("camera centre maps to the middle of the letterboxed viewport", () => {
    const vp = computeViewport(1000, 900, 1);
    const c = worldToCss(new ObliqueProjection(), { x: 5, y: 5, zoom: 1.3 }, vp, 5, 5);
    expect(c.x).toBeCloseTo(500, 6);
    expect(c.y).toBeCloseTo(450, 6);
  });
});

describe("viewport", () => {
  it("letterboxes to 16:9 and centres", () => {
    const vp = computeViewport(1000, 900, 1);
    expect(vp.scale).toBeCloseTo(1000 / 1280, 9);
    expect(vp.offX).toBeCloseTo(0, 9);
    expect(vp.offY).toBeCloseTo((900 - 720 * vp.scale) / 2, 9);
    const wide = computeViewport(2000, 720, 1);
    expect(wide.scale).toBe(1);
    expect(wide.offX).toBeCloseTo(360, 9);
  });
  it("caps dpr at 2", () => {
    expect(computeViewport(800, 600, 3).dpr).toBe(2);
    expect(computeViewport(800, 600, 0.5).dpr).toBe(1);
  });
  it("world UI counter-scale keeps on-screen size within 0.8..1.4", () => {
    for (const z of [0.6, 0.7, 0.8, 1, 1.4, 1.8]) {
      const eff = z * worldUiScale(z);
      expect(eff).toBeGreaterThanOrEqual(0.8 - 1e-9);
      expect(eff).toBeLessThanOrEqual(1.4 + 1e-9);
    }
    expect(worldUiScale(1)).toBe(1);
  });
});
