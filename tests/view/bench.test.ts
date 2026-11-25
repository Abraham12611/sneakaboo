import { describe, expect, it } from "vitest";
import { GameViewImpl } from "../../src/game/view";
import type { ViewControls } from "../../src/game/sim/types";
import { makeFakeCanvas, makeTestLevel, makeWorld } from "./helpers";

/**
 * Micro-benchmark against a recording mock 2D context. It does not measure GPU/raster time,
 * it guards the number of draw operations (and JS time of the draw path) per frame.
 * Scenario: 40x24 level, 12 objects, 3 seekers, Pip walking, fog with one visible/remembered/unknown room.
 */
const FRAMES = 300;
const BUDGET_AVG_OPS = 450;
const BUDGET_MAX_OPS = 600;

function walk(projection: "oblique" | "topdown", zoom: number) {
  const fc = makeFakeCanvas();
  const view = new GameViewImpl(fc.canvas, { projection, initialZoom: zoom }, { createCanvas: fc.createCanvas });
  const level = makeTestLevel();
  const world = makeWorld(level);
  view.resize(1280, 720, 1);
  view.setLevel(level, world);
  view.skipIntro();
  const ctrl: ViewControls = { zoomDelta: 0, peek: false };
  const ops: number[] = [];
  const t0 = performance.now();
  for (let i = 0; i < FRAMES; i++) {
    // Pip walks east along row 8 then loops back; the sim is not involved, positions are scripted.
    const p = world.player;
    p.px = p.x;
    p.py = p.y;
    p.x = 7 + ((i * 0.05) % 22);
    p.y = 8 + Math.sin(i / 40);
    p.moving = true;
    p.facing = 0;
    world.t = i / 60;
    for (const s of world.seekers) {
      s.px = s.x;
      s.py = s.y;
      s.x += Math.sin(i / 30) * 0.02;
    }
    fc.main.reset();
    view.frame(world, 0.5, 1 / 60, ctrl, []);
    ops.push(fc.main.drawOps());
  }
  const ms = performance.now() - t0;
  return { ops, ms, builds: fc.offscreen.length };
}

describe("draw-op benchmark (mock context)", () => {
  for (const projection of ["oblique", "topdown"] as const) {
    for (const zoom of [0.6, 1, 1.8]) {
      it(`${projection} zoom ${zoom}: ${FRAMES} frames stay under the draw-op budget`, () => {
        const r = walk(projection, zoom);
        const avg = r.ops.reduce((a, b) => a + b, 0) / r.ops.length;
        const max = Math.max(...r.ops);
        console.log(`[bench] ${projection} z=${zoom}: avg ${avg.toFixed(0)} ops/frame, max ${max}, ${(r.ms / FRAMES).toFixed(3)} ms/frame JS (mock ctx), ${r.builds} chunk canvases`);
        expect(avg).toBeLessThan(BUDGET_AVG_OPS);
        expect(max).toBeLessThan(BUDGET_MAX_OPS);
        expect(r.builds).toBeLessThan(40); // chunk cache is not rebuilt every frame
      });
    }
  }
});
