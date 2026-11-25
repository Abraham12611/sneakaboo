/** Fog of war: room visibility -> look, and a per-tile state map derived from `world.roomVis`. */
import type { LevelData } from "../sim/levelSchema";
import type { RoomVisibility, WorldState } from "../sim/types";
import { mixHex, parseHex } from "./palette";

/** 0 unknown, 1 remembered, 2 visible. Numeric so tile maps are typed arrays. */
export const FOG_UNKNOWN = 0;
export const FOG_REMEMBERED = 1;
export const FOG_VISIBLE = 2;
export type FogState = 0 | 1 | 2;

export function fogStateOf(v: RoomVisibility | undefined): FogState {
  return v === "visible" ? FOG_VISIBLE : v === "remembered" ? FOG_REMEMBERED : FOG_UNKNOWN;
}

/** Overlay colour + alpha per state. Remembered: dimmed to ~45% and desaturated. Unknown: near black. */
export const FOG_OVERLAY: Record<FogState, { color: string; alpha: number }> = {
  0: { color: "#07080d", alpha: 0.94 },
  1: { color: "#464852", alpha: 0.55 },
  2: { color: "#000000", alpha: 0 },
};

/** Alpha of the dark overlay for a state (0 visible .. ~0.94 unknown). */
export function fogOverlayAlpha(state: FogState): number {
  return FOG_OVERLAY[state].alpha;
}

const fogColorCache = new Map<string, string>();
/** The colour a surface of `hex` shows with the given fog state (same maths as the overlay). */
export function fogColor(hex: string, state: FogState): string {
  if (state === FOG_VISIBLE) return hex;
  const key = `${hex}|${state}`;
  const hit = fogColorCache.get(key);
  if (hit) return hit;
  const o = FOG_OVERLAY[state];
  const out = mixHex(hex, o.color, o.alpha);
  fogColorCache.set(key, out);
  return out;
}

export function luma(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

const isSolidChar = (c: string) => c === "#" || c === "=" || c === "w" || c === "h" || c === " ";

/**
 * Per-tile fog states. Floor tiles take their room's state. Tiles outside any room: grass is visible,
 * other floor follows the nearest room (within 3 tiles) else is visible. Solid tiles take the best state
 * of their neighbours, so walls between a visible and a hidden room read as visible.
 */
export class FogMap {
  readonly w: number;
  readonly h: number;
  readonly state: Uint8Array;
  version = 0;
  private sig = "";
  private readonly nearest: Int16Array; // room index of nearest room for unroomed floor, -1 none

  constructor(readonly level: LevelData, roomIndex: Int16Array) {
    this.w = level.size.w;
    this.h = level.size.h;
    this.state = new Uint8Array(this.w * this.h).fill(FOG_VISIBLE);
    this.nearest = this.buildNearest(roomIndex);
    this.roomIndex = roomIndex;
  }
  private readonly roomIndex: Int16Array;

  private charAt(x: number, y: number): string {
    return this.level.tiles[y]?.charAt(x) ?? " ";
  }

  private buildNearest(roomIndex: Int16Array): Int16Array {
    const { w, h } = this;
    const out = new Int16Array(w * h).fill(-1);
    const dist = new Int16Array(w * h).fill(-1);
    const queue: number[] = [];
    for (let i = 0; i < w * h; i++) {
      const r = roomIndex[i] ?? -1;
      if (r >= 0) {
        out[i] = r;
        dist[i] = 0;
        queue.push(i);
      }
    }
    for (let qi = 0; qi < queue.length; qi++) {
      const i = queue[qi]!;
      const d = dist[i]!;
      if (d >= 3) continue;
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (dist[j] !== -1) continue;
        if (isSolidChar(this.charAt(nx, ny))) continue;
        dist[j] = d + 1;
        out[j] = out[i]!;
        queue.push(j);
      }
    }
    return out;
  }

  /** Recompute when the room visibilities changed. Returns true if anything changed. */
  update(world: WorldState): boolean {
    const rooms = this.level.rooms;
    let sig = "";
    for (const r of rooms) sig += fogStateOf(world.roomVis[r.id]);
    if (sig === this.sig && this.version > 0) return false;
    this.sig = sig;
    this.version++;
    const { w, h, state } = this;
    const roomState = (ri: number): FogState => fogStateOf(world.roomVis[rooms[ri]?.id ?? ""]);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const c = this.charAt(x, y);
        if (isSolidChar(c)) continue;
        const own = this.roomIndex[i] ?? -1;
        if (own >= 0) state[i] = roomState(own);
        else if (c === ",") state[i] = FOG_VISIBLE;
        else {
          const n = this.nearest[i] ?? -1;
          state[i] = n >= 0 ? roomState(n) : FOG_VISIBLE;
        }
      }
    }
    // solid tiles: best of the four neighbours (non-solid), else best of any neighbour, else visible
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!isSolidChar(this.charAt(x, y))) continue;
        let best = -1;
        let any = -1;
        for (let k = 0; k < 8; k++) {
          const dx = k < 4 ? [1, -1, 0, 0][k]! : [1, -1, 1, -1][k - 4]!;
          const dy = k < 4 ? [0, 0, 1, -1][k]! : [1, 1, -1, -1][k - 4]!;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (this.charAt(nx, ny) === " ") continue;
          const solid = isSolidChar(this.charAt(nx, ny));
          const s = state[ny * w + nx]!;
          if (!solid && k < 4) best = Math.max(best, s);
          else if (!solid) any = Math.max(any, s);
        }
        const v = best >= 0 ? best : any >= 0 ? any : FOG_VISIBLE;
        state[y * w + x] = v;
      }
    }
    return true;
  }

  at(tx: number, ty: number): FogState {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return FOG_VISIBLE;
    return (this.state[ty * this.w + tx] ?? FOG_VISIBLE) as FogState;
  }
}
