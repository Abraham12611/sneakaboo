import { describe, expect, it } from "vitest";
import {
  OCCLUDE_ALPHA, SILHOUETTE_MIN_COVER_ALPHA, makeProjection, objectRect, occludesPlayer, rectsOverlap, silhouetteStrength,
} from "../../src/game/view";
import { characterBounds } from "../../src/game/view/characters";
import { Scene } from "../../src/game/view/scene";
import type { Env } from "../../src/game/view/env";
import { FogMap } from "../../src/game/view/fog";
import type { LevelObject } from "../../src/game/sim/levelSchema";
import type { ObjectState } from "../../src/game/sim/types";
import { makeTestLevel, makeWorld } from "./helpers";

const objectState = (def: Partial<LevelObject> & { id: string; type: string; x: number; y: number; w: number; h: number }): ObjectState => ({
  id: def.id,
  def: def as LevelObject,
  height: def.height ?? 1,
  blocksMove: true,
  blocksSight: false,
  state: "static",
});

/** Scene + minimal env over the test level, with Pip at (px, py) and the given extra objects. */
function rig(projName: "oblique" | "topdown", pip: { x: number; y: number }, objects: ObjectState[]) {
  const level = makeTestLevel();
  const world = makeWorld(level);
  world.objects = objects;
  const proj = makeProjection(projName);
  const scene = new Scene();
  scene.setLevel({ ...level, objects: objects.map((o) => o.def) });
  const env = { proj, level, world, pip, fog: new FogMap(level, world.grid.roomIndex) } as unknown as Env;
  const run = (frames: number) => {
    for (let i = 0; i < frames; i++) scene.updateOcclusion(env, 1 / 60);
  };
  return { scene, env, run, proj };
}

// The L01 tree: footprint x 1..3, y 13..15, height 3. Pip starts at (1.5, 10.5): 2.5+ tiles north of it.
const tree = (id: string, x: number, y: number) => objectState({ id, type: "tree", x, y, w: 2, h: 2, height: 3 });

describe("occlusion by overlap, regardless of distance", () => {
  it("rect rules: only things that sort after the player and overlap count", () => {
    const a = { x0: 0, y0: 0, x1: 10, y1: 10 };
    expect(occludesPlayer(5, 4, a, { x0: 5, y0: 5, x1: 20, y1: 20 })).toBe(true);
    expect(occludesPlayer(4, 5, a, { x0: 5, y0: 5, x1: 20, y1: 20 })).toBe(false); // behind him
    expect(occludesPlayer(5, 4, a, { x0: 10, y0: 0, x1: 20, y1: 20 })).toBe(false); // touching only
  });

  it("a tree canopy 3 tiles south, whose sprite covers Pip, fades to ~35% (the old 2.2-tile rule would not)", () => {
    const pip = { x: 1.5, y: 10.5 };
    const t = tree("tree", 1, 13);
    const r = rig("oblique", pip, [t]);
    const dist = t.def.y - pip.y;
    expect(dist).toBeGreaterThan(2.2);
    const rect = objectRect(r.proj, t, { x0: 0, y0: 0, x1: 0, y1: 0 });
    const pr = characterBounds(r.proj, r.proj.px(pip.x), r.proj.py(pip.y), 1);
    expect(rectsOverlap(rect, pr)).toBe(true);
    r.run(90);
    expect(r.scene.objectAlpha(0)).toBeCloseTo(OCCLUDE_ALPHA, 2);
    expect(r.scene.playerCover).toBeGreaterThan(0.95);
  });

  it("fades smoothly: no pop on the first frame, monotonic, and restores when Pip walks away", () => {
    const pip = { x: 1.5, y: 10.5 };
    const r = rig("oblique", pip, [tree("tree", 1, 13)]);
    r.run(1);
    const first = r.scene.objectAlpha(0);
    expect(first).toBeGreaterThan(0.85);
    expect(first).toBeLessThan(1);
    let prev = first;
    for (let i = 0; i < 60; i++) {
      r.run(1);
      expect(r.scene.objectAlpha(0)).toBeLessThanOrEqual(prev);
      prev = r.scene.objectAlpha(0);
    }
    pip.x = 12; // far to the east: nothing overlaps any more
    r.run(90);
    expect(r.scene.objectAlpha(0)).toBe(1);
    expect(r.scene.playerCover).toBe(0);
  });

  it("does not fade objects that do not overlap him, near or far", () => {
    const pip = { x: 1.5, y: 10.5 };
    const far = tree("far", 30, 13); // same rows, far to the east
    const side = objectState({ id: "side", type: "bookshelf", x: 6, y: 11, w: 1, h: 1, height: 1.8 }); // in front but off to the side
    const behind = tree("behind", 1, 6); // north of him: sorts before him, never occludes
    const r = rig("oblique", pip, [far, side, behind]);
    r.run(90);
    expect(r.scene.objectAlpha(0)).toBe(1);
    expect(r.scene.objectAlpha(1)).toBe(1);
    expect(r.scene.objectAlpha(2)).toBe(1);
    expect(r.scene.playerCover).toBe(0);
  });

  it("a tall thing close in front fades too, and a low one whose rect misses him does not", () => {
    const pip = { x: 10.5, y: 8.5 };
    const wardrobe = objectState({ id: "w", type: "wardrobe", x: 10, y: 9, w: 1, h: 1, height: 2 }); // right in front
    const rug = objectState({ id: "bench", type: "bench", x: 10, y: 11, w: 1, h: 1, height: 0.3 }); // low: its rect stays below his feet
    const r = rig("oblique", pip, [wardrobe, rug]);
    r.run(90);
    expect(r.scene.objectAlpha(0)).toBeCloseTo(OCCLUDE_ALPHA, 2);
    expect(r.scene.objectAlpha(1)).toBe(1);
  });

  it("a tall wall in front fades; a wall that does not reach him does not", () => {
    // north wall of the test house is tile row 4 (tall from outside). Pip stands in the yard above it.
    const near = rig("oblique", { x: 15.5, y: 2.7 }, []);
    near.run(90);
    expect(near.scene.wallAlpha(15, 4)).toBeCloseTo(OCCLUDE_ALPHA, 2);
    const far = rig("oblique", { x: 15.5, y: 1.2 }, []);
    far.run(90);
    expect(far.scene.wallAlpha(15, 4)).toBe(1);
  });

  it("top-down: only canopies fade, ordinary things next to him never do", () => {
    const pip = { x: 1.5, y: 10.5 };
    const t = tree("tree", 1, 11); // canopy reaches over him in the plan view
    const table = objectState({ id: "table", type: "table", x: 1, y: 11, w: 1, h: 1, height: 0.7 });
    const withTree = rig("topdown", pip, [t]);
    withTree.run(90);
    expect(withTree.scene.objectAlpha(0)).toBeCloseTo(OCCLUDE_ALPHA, 2);
    const withTable = rig("topdown", pip, [table]);
    withTable.run(90);
    expect(withTable.scene.objectAlpha(0)).toBe(1);
    expect(withTable.scene.playerCover).toBe(0);
  });
});

describe("silhouette strength", () => {
  it("is off when nothing covers him, on while the cover rests at 35%, and off when the cover is almost invisible", () => {
    expect(silhouetteStrength(1)).toBe(0);
    expect(silhouetteStrength(OCCLUDE_ALPHA)).toBe(1);
    expect(silhouetteStrength(SILHOUETTE_MIN_COVER_ALPHA)).toBe(0);
    expect(silhouetteStrength(0.1)).toBe(0);
  });

  it("rises monotonically as the cover fades in", () => {
    let prev = 0;
    for (let a = 1; a >= OCCLUDE_ALPHA; a -= 0.05) {
      const s = silhouetteStrength(a);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});
