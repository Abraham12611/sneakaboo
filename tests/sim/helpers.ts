import { parseLevel } from "../../src/game/sim/levelSchema";
import type { LevelData } from "../../src/game/sim/levelSchema";
import { NO_INPUT } from "../../src/game/sim/types";
import type { InputState } from "../../src/game/sim/types";

export const W = 20;
export const H = 12;

/** Default 20x12 level: left room r1 (x1..9), right room r2 (x11..18), doorway at x=10, rows 5-6. */
export function makeTiles(opts: { doorway?: boolean } = {}): string[] {
  const doorway = opts.doorway ?? true;
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    if (y === 0 || y === H - 1) { rows.push("#".repeat(W)); continue; }
    const mid = doorway && (y === 5 || y === 6) ? "." : "=";
    rows.push("#" + ".".repeat(9) + mid + ".".repeat(8) + "#");
  }
  return rows;
}

export function makeLevelJson(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    v: 1, id: "test", name: "Test", seed: 7, timeLimit: 60, par: 30,
    size: { w: W, h: H },
    tiles: makeTiles(),
    rooms: [
      { id: "r1", type: "living", rects: [[1, 1, 9, 10], [10, 5, 1, 2]], floorTint: "#aa8866", surface: "wood" },
      { id: "r2", type: "kitchen", rects: [[11, 1, 8, 10]], floorTint: "#88aacc", surface: "tile" },
    ],
    objects: [],
    seekers: [],
    start: { x: 3.5, y: 5.5, facing: 0 },
    home: [17, 8, 1.5, 2],
    ...over,
  };
}

export function makeLevel(over: Record<string, unknown> = {}): LevelData {
  return parseLevel(makeLevelJson(over));
}

export function inp(p: Partial<InputState> = {}): InputState {
  return { ...NO_INPUT, move: { x: 0, y: 0 }, ...p };
}
