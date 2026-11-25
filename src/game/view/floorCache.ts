/**
 * Floor composites: the cached floor chunks with the fog overlay and the rugs baked in, in pieces of
 * COMP_TILES x COMP_TILES tiles. Repainted only when the fog changes (or the projection / scale), so a
 * normal frame costs one blit per visible composite instead of chunk blits + fog rects + rug rects.
 */
import { CHUNK, type FloorChunks } from "./chunks";
import { debugWorldStatic } from "./debug";
import type { Env } from "./env";
import { drawFloorFogTiles, drawRugsIn } from "./floorLayer";
import { HASH_SEED, mixHash, type PieceCache } from "./layers";

export const COMP_TILES = 16;

interface Region {
  tx0: number;
  ty0: number;
  tx1: number;
  ty1: number;
}

/** Base chunks + fog + rugs for the tile region, in projected px on `env.ctx`. */
function paintFloorRegion(env: Env, chunks: FloorChunks, step: number, r: Region, devScale: number): void {
  const { ctx, proj } = env;
  const cx0 = Math.floor(r.tx0 / CHUNK);
  const cy0 = Math.floor(r.ty0 / CHUNK);
  const cx1 = Math.floor((r.tx1 - 1) / CHUNK);
  const cy1 = Math.floor((r.ty1 - 1) / CHUNK);
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const img = chunks.get(cx, cy, proj, step) as CanvasImageSource & { width: number; height: number };
      // whole device pixels, so the blit is a 1:1 copy when the cache step equals the scale
      const ox = Math.round(proj.px(cx * CHUNK) * devScale) / devScale;
      const oy = Math.round(proj.py(cy * CHUNK) * devScale) / devScale;
      ctx.drawImage(img, ox, oy, img.width / step, img.height / step);
    }
  }
  drawFloorFogTiles(env, r.tx0, r.ty0, r.tx1 - 1, r.ty1 - 1);
  drawRugsIn(env, proj.px(r.tx0), proj.py(r.ty0), proj.px(r.tx1), proj.py(r.ty1));
}

/** Debug overlay for the region (grid, collision, sight blockers, room labels). */
function paintDebugRegion(env: Env, r: Region): void {
  debugWorldStatic(env, r.tx0, r.ty0, r.tx1, r.ty1);
}

const region: Region = { tx0: 0, ty0: 0, tx1: 0, ty1: 0 };

/**
 * Draw the floor (or, with `debugOverlay`, the static debug overlay) for the visible tile range using cached
 * composites. Over the paint budget a composite is drawn directly, clipped to its region.
 */
export function drawCachedRegions(
  env: Env,
  cache: PieceCache,
  sig: number,
  tx0: number,
  ty0: number,
  tx1: number,
  ty1: number,
  devScale: number,
  floor: { chunks: FloorChunks; step: number } | null,
): number {
  const { ctx, proj, level } = env;
  const W = level.size.w;
  const H = level.size.h;
  let blits = 0;
  const qx0 = Math.max(0, Math.floor(tx0 / COMP_TILES));
  const qy0 = Math.max(0, Math.floor(ty0 / COMP_TILES));
  const qx1 = Math.min(Math.ceil(W / COMP_TILES) - 1, Math.floor(tx1 / COMP_TILES));
  const qy1 = Math.min(Math.ceil(H / COMP_TILES) - 1, Math.floor(ty1 / COMP_TILES));
  for (let qy = qy0; qy <= qy1; qy++) {
    for (let qx = qx0; qx <= qx1; qx++) {
      region.tx0 = qx * COMP_TILES;
      region.ty0 = qy * COMP_TILES;
      region.tx1 = Math.min(W, region.tx0 + COMP_TILES);
      region.ty1 = Math.min(H, region.ty0 + COMP_TILES);
      const x0 = proj.px(region.tx0);
      const y0 = proj.py(region.ty0);
      const x1 = proj.px(region.tx1);
      const y1 = proj.py(region.ty1);
      const key = qy * 4096 + qx;
      const s = mixHash(HASH_SEED, sig);
      let p = cache.ready(key, s, x0, y0, x1, y1);
      if (!p && cache.canPaint()) {
        const r = { ...region };
        p = cache.paint(key, s, x0, y0, x1, y1, (c) => {
          const e = { ...env, ctx: c };
          if (floor) paintFloorRegion(e, floor.chunks, floor.step, r, cache.step);
          else paintDebugRegion(e, r);
        });
      }
      if (p) {
        ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
        blits++;
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.clip();
        if (floor) paintFloorRegion(env, floor.chunks, floor.step, region, devScale);
        else paintDebugRegion(env, region);
        ctx.restore();
      }
    }
  }
  return blits;
}
