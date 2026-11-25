import { describe, expect, it } from "vitest";
import {
  Camera, INTRO_S, LOGICAL_H, LOGICAL_W, ObliqueProjection, PEEK_COOLDOWN_S, PEEK_MAX_S, TopDownProjection,
  ZOOM_NOTCH, cameraBounds, type Projection,
} from "../../src/game/view";

const oblique = new ObliqueProjection();
const W = 40;
const H = 24;

function run(cam: Camera, secs: number, tx: number, ty: number, mx = 0, my = 0, proj: Projection = oblique, w = W, h = H) {
  const dt = 1 / 60;
  for (let t = 0; t < secs; t += dt) cam.update(dt, tx, ty, mx, my, w, h, proj);
}

describe("camera follow", () => {
  it("converges to a stationary target (deadzone leaves at most 1.5 tiles of offset)", () => {
    const cam = new Camera();
    cam.snap(10, 10, W, H, oblique);
    run(cam, 4, 20, 14);
    expect(Math.hypot(cam.x - 20, cam.y - 14)).toBeLessThanOrEqual(1.5 + 1e-3);
    expect(Math.hypot(cam.x - 20, cam.y - 14)).toBeGreaterThan(1.4);
  });

  it("does not move while the target stays inside the deadzone", () => {
    const cam = new Camera();
    cam.snap(20, 12, W, H, oblique);
    const x0 = cam.x;
    const y0 = cam.y;
    run(cam, 1, 20.8, 12.5);
    expect(cam.x).toBeCloseTo(x0, 6);
    expect(cam.y).toBeCloseTo(y0, 6);
  });

  it("is damped: reaches ~63% of a step in about 0.15 s once outside the deadzone", () => {
    const cam = new Camera();
    cam.snap(10, 12, W, H, oblique);
    const dist0 = 8 - 1.5; // effective step beyond the deadzone
    run(cam, 0.15, 18, 12);
    const moved = cam.x - 10;
    expect(moved / dist0).toBeGreaterThan(0.5);
    expect(moved / dist0).toBeLessThan(0.75);
  });

  it("looks ahead: while walking east the camera sits further east than without look-ahead", () => {
    const a = new Camera();
    const b = new Camera();
    a.snap(10, 12, W, H, oblique);
    b.snap(10, 12, W, H, oblique);
    const dt = 1 / 60;
    for (let i = 0; i < 180; i++) {
      const tx = 10 + (i * 3) / 60;
      a.update(dt, tx, 12, 1, 0, W, H, oblique);
      b.update(dt, tx, 12, 0, 0, W, H, oblique);
    }
    expect(a.x).toBeGreaterThan(b.x + 0.5);
  });
});
describe("camera clamping", () => {
  it("never shows outside bounds (+1 tile margin) at any zoom, both projections", () => {
    for (const proj of [oblique, new TopDownProjection()]) {
      for (const zoom of [0.6, 1, 1.8]) {
        for (const [tx, ty] of [[-50, -50], [100, 100], [0, 24], [40, 0], [20, 12]] as const) {
          const cam = new Camera();
          cam.zoomTarget = zoom;
          cam.snap(tx, ty, W, H, proj);
          run(cam, 3, tx, ty, 0, 0, proj);
          const hw = LOGICAL_W / 2 / (proj.tileScreenW * cam.zoom);
          const hh = LOGICAL_H / 2 / (proj.tileScreenH * cam.zoom);
          const b = cameraBounds(W, H, proj, cam.zoom);
          const top = Math.max(1, proj.wallHeightPx / proj.tileScreenH);
          if (!b.fitX) {
            expect(cam.x - hw).toBeGreaterThanOrEqual(-1 - 1e-9);
            expect(cam.x + hw).toBeLessThanOrEqual(W + 1 + 1e-9);
          }
          if (!b.fitY) {
            expect(cam.y - hh).toBeGreaterThanOrEqual(-top - 1e-9);
            expect(cam.y + hh).toBeLessThanOrEqual(H + 1 + 1e-9);
          }
        }
      }
    }
  });

  it("centres a level that fits the view", () => {
    const cam = new Camera();
    cam.snap(0, 0, 10, 6, new TopDownProjection());
    expect(cam.x).toBe(5);
    cam.update(0.1, 2, 2, 0, 0, 10, 6, new TopDownProjection());
    expect(cam.x).toBe(5);
  });
});

describe("zoom", () => {
  it("clamps to the level limits", () => {
    const cam = new Camera();
    cam.setLimits(0.8, 1.4);
    cam.setZoomTarget(5);
    expect(cam.zoomTarget).toBe(1.4);
    cam.setZoomTarget(0.1);
    expect(cam.zoomTarget).toBe(0.8);
    cam.setLimits(0.6, 1.8);
    cam.setZoomTarget(NaN);
    expect(cam.zoomTarget).toBe(1);
  });

  it("one notch multiplies by 1.12, fractions interpolate, repeated notches stop at the limit", () => {
    const cam = new Camera();
    cam.zoomBy(1);
    expect(cam.zoomTarget).toBeCloseTo(ZOOM_NOTCH, 9);
    cam.zoomBy(-1);
    expect(cam.zoomTarget).toBeCloseTo(1, 9);
    cam.zoomBy(0.5);
    expect(cam.zoomTarget).toBeCloseTo(Math.sqrt(ZOOM_NOTCH), 9);
    cam.zoomBy(100);
    expect(cam.zoomTarget).toBe(1.8);
    cam.zoomBy(-100);
    expect(cam.zoomTarget).toBe(0.6);
  });

  it("settles in about 0.2-0.3 s", () => {
    const cam = new Camera();
    cam.snap(20, 12, W, H, oblique);
    cam.setZoomTarget(1.5);
    run(cam, 0.1, 20, 12);
    expect(cam.zoom).toBeLessThan(1.45);
    run(cam, 0.3, 20, 12);
    expect(Math.abs(cam.zoom - 1.5)).toBeLessThan(0.03);
  });
});

describe("peek", () => {
  it("zooms to 0.75x of the current zoom, clamped to minZoom", () => {
    const cam = new Camera();
    cam.setZoomTarget(1.2);
    cam.updatePeek(0.016, true);
    expect(cam.effectiveZoomTarget()).toBeCloseTo(0.9, 9);
    const c2 = new Camera();
    c2.setZoomTarget(0.7);
    c2.updatePeek(0.016, true);
    expect(c2.effectiveZoomTarget()).toBe(0.6);
  });

  it("lasts at most 1 s, then a 4 s cooldown that ignores the held button", () => {
    const cam = new Camera();
    let active = 0;
    const dt = 1 / 60;
    for (let t = 0; t < PEEK_MAX_S + 0.5; t += dt) {
      cam.updatePeek(dt, true);
      if (cam.peekActive) active += dt;
    }
    expect(active).toBeLessThanOrEqual(PEEK_MAX_S + dt);
    expect(active).toBeGreaterThan(PEEK_MAX_S - 0.1);
    expect(cam.peekCooldown).toBeGreaterThan(0);
    // still holding during the cooldown: no peek
    let t = 0;
    while (cam.peekCooldown > 0 && t < 10) {
      cam.updatePeek(dt, true);
      expect(cam.peekActive).toBe(false);
      t += dt;
    }
    expect(t).toBeGreaterThan(PEEK_COOLDOWN_S - 1.0);
    expect(t).toBeLessThan(PEEK_COOLDOWN_S + 0.1);
    cam.updatePeek(dt, true);
    expect(cam.peekActive).toBe(true);
  });

  it("releasing early also starts the cooldown", () => {
    const cam = new Camera();
    cam.updatePeek(0.2, true);
    cam.updatePeek(0.016, false);
    expect(cam.peekActive).toBe(false);
    expect(cam.peekCooldown).toBe(PEEK_COOLDOWN_S);
    cam.updatePeek(0.016, true);
    expect(cam.peekActive).toBe(false);
  });
});

describe("intro pan", () => {
  it("pans from Home Base to the start in 1.5 s and then follows", () => {
    const cam = new Camera();
    cam.snap(10, 10, W, H, oblique);
    cam.startIntro({ x: 30, y: 20 }, { x: 10, y: 10 });
    expect(cam.introActive).toBe(true);
    run(cam, INTRO_S / 2, 10, 10);
    expect(cam.introActive).toBe(true);
    expect(cam.x).toBeGreaterThan(15);
    expect(cam.x).toBeLessThan(25);
    run(cam, INTRO_S, 10, 10);
    expect(cam.introActive).toBe(false);
    expect(cam.x).toBeCloseTo(10, 1);
  });

  it("can be skipped", () => {
    const cam = new Camera();
    cam.startIntro({ x: 30, y: 20 }, { x: 10, y: 10 });
    cam.skipIntro();
    expect(cam.introActive).toBe(false);
    expect(cam.x).toBe(10);
    expect(cam.y).toBe(10);
  });
});
