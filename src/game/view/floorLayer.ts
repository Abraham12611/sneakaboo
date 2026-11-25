/** Floor-plane layers drawn before the y-sorted standers, plus world-space UI drawn after them. */
import { conePolygon } from "./cones";
import type { Env } from "./env";
import { lerp } from "./env";
import { FOG_OVERLAY, FOG_UNKNOWN, FOG_VISIBLE, type FogState } from "./fog";
import { tileAt } from "./levelStatic";
import { drawRug } from "./scene";
import { ellipse } from "./shapes";

/** Dim/darken non-visible tiles in the visible range: runs of equal state per tile row. */
export function drawFloorFog(env: Env): void {
  const { proj, level, view } = env;
  const tw = proj.tileScreenW;
  const th = proj.tileScreenH;
  drawFloorFogTiles(
    env,
    Math.max(0, Math.floor(view.x0 / tw)),
    Math.max(0, Math.floor(view.y0 / th)),
    Math.min(level.size.w - 1, Math.ceil(view.x1 / tw)),
    Math.min(level.size.h - 1, Math.ceil(view.y1 / th)),
  );
}

/** Fog overlay for the inclusive tile range. */
export function drawFloorFogTiles(env: Env, x0: number, y0: number, x1: number, y1: number): void {
  const { ctx, proj, fog, level } = env;
  const tw = proj.tileScreenW;
  const th = proj.tileScreenH;
  x0 = Math.max(0, x0);
  y0 = Math.max(0, y0);
  x1 = Math.min(level.size.w - 1, x1);
  y1 = Math.min(level.size.h - 1, y1);
  for (let y = y0; y <= y1; y++) {
    let x = x0;
    while (x <= x1) {
      const st = tileAt(level, x, y) === " " ? FOG_VISIBLE : fog.at(x, y);
      let e = x;
      while (e + 1 <= x1 && (tileAt(level, e + 1, y) === " " ? FOG_VISIBLE : fog.at(e + 1, y)) === st) e++;
      if (st !== FOG_VISIBLE) {
        const o = FOG_OVERLAY[st as FogState];
        ctx.globalAlpha = o.alpha;
        ctx.fillStyle = o.color;
        ctx.fillRect(proj.px(x), proj.py(y), (e - x + 1) * tw + 0.5, th + 0.5);
      }
      x = e + 1;
    }
  }
  ctx.globalAlpha = 1;
}
export function drawHomeBase(env: Env): void {
  const { ctx, proj, level, t } = env;
  const [hx, hy, hw, hh] = level.home;
  const x = proj.px(hx);
  const y = proj.py(hy);
  const w = hw * proj.tileScreenW;
  const h = hh * proj.tileScreenH;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  ctx.fillStyle = `rgba(70,220,120,${(0.16 + 0.1 * pulse).toFixed(3)})`;
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = `rgba(90,240,140,${(0.22 + 0.12 * pulse).toFixed(3)})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(160,255,190,0.9)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 7]);
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.setLineDash([]);
}

export function drawRugs(env: Env): void {
  drawRugsIn(env, -Infinity, -Infinity, Infinity, Infinity);
}

/** Rugs whose footprint overlaps the projected rect. */
export function drawRugsIn(env: Env, x0: number, y0: number, x1: number, y1: number): void {
  const { proj } = env;
  for (const o of env.world.objects) {
    if (o.height > 0.02 || o.def.type === "door") continue;
    const d = o.def;
    if (proj.px(d.x + d.w) <= x0 || proj.px(d.x) >= x1 || proj.py(d.y + d.h) <= y0 || proj.py(d.y) >= y1) continue;
    const st = env.fog.at(Math.floor(d.x + d.w / 2), Math.floor(d.y + d.h / 2));
    drawRug(env, o, st);
  }
}

interface ConeEntry {
  x: number;
  y: number;
  facing: number;
  range: number;
  angle: number;
  doors: number;
  grid: unknown;
  n: number;
  pts: number[];
}
/** Cone polygons per seeker, recast only when the seeker moved/turned or a door changed (raycasts are the costly part). */
const coneCache = new Map<string, ConeEntry>();

function doorSignature(env: Env): number {
  let h = 17;
  for (const o of env.world.objects) if (o.def.type === "door") h = (Math.imul(h, 31) + (o.state === "open" ? 1 : 2)) | 0;
  return h;
}

export function drawCones(env: Env): void {
  const { ctx, proj, world, alpha, fog } = env;
  let doors: number | null = null;
  for (const s of world.seekers) {
    if (s.state === "sleep" || s.coneRange <= 0 || s.coneAngle <= 0) continue;
    const x = lerp(s.px, s.x, alpha);
    const y = lerp(s.py, s.y, alpha);
    if (fog.at(Math.floor(x), Math.floor(y)) !== FOG_VISIBLE) continue;
    doors ??= doorSignature(env);
    let c = coneCache.get(s.id);
    if (!c) {
      c = { x: NaN, y: 0, facing: 0, range: 0, angle: 0, doors: 0, grid: null, n: 0, pts: [] };
      coneCache.set(s.id, c);
    }
    if (c.x !== x || c.y !== y || c.facing !== s.facing || c.range !== s.coneRange || c.angle !== s.coneAngle || c.doors !== doors || c.grid !== world.grid) {
      c.n = conePolygon(world.grid, x, y, s.facing, s.coneRange, s.coneAngle, c.pts);
      c.x = x;
      c.y = y;
      c.facing = s.facing;
      c.range = s.coneRange;
      c.angle = s.coneAngle;
      c.doors = doors;
      c.grid = world.grid;
    }
    const n = c.n;
    const polyBuf = c.pts;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const wx = polyBuf[i * 2]!;
      const wy = polyBuf[i * 2 + 1]!;
      if (i === 0) ctx.moveTo(proj.px(wx), proj.py(wy));
      else ctx.lineTo(proj.px(wx), proj.py(wy));
    }
    ctx.closePath();
    const alert = s.state === "chase" ? 1 : s.state === "investigate" || s.state === "search" || s.state === "curious" ? 0.5 : 0;
    ctx.fillStyle = alert >= 1 ? "rgba(255,60,50,0.26)" : alert > 0 ? "rgba(255,170,40,0.22)" : "rgba(255,230,90,0.18)";
    ctx.fill();
    ctx.strokeStyle = alert >= 1 ? "rgba(255,90,70,0.55)" : "rgba(255,235,120,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function drawNoise(env: Env): void {
  const { ctx, proj, world, fog } = env;
  for (const n of world.noise) {
    if (fog.at(Math.floor(n.x), Math.floor(n.y)) !== FOG_VISIBLE) continue;
    const p = Math.max(0, Math.min(1, n.age / Math.max(0.001, n.life)));
    const ease = 1 - (1 - p) * (1 - p);
    const r = n.radius * (0.2 + 0.8 * ease);
    const a = (1 - p) * 0.6;
    const cx = proj.px(n.x);
    const cy = proj.py(n.y);
    ellipse(ctx, cx, cy, r * proj.tileScreenW, r * proj.tileScreenH);
    ctx.fillStyle = n.source === "player" ? `rgba(255,255,255,${(a * 0.18).toFixed(3)})` : `rgba(255,176,74,${(a * 0.2).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = n.source === "player" ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(255,176,74,${a.toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

/** World-space UI: seeker alert bubbles/rings, HOME label, unknown-room name hints. Counter-scaled. */
export function drawWorldUi(env: Env): void {
  const { ctx, proj, world, level, fog, alpha, uiScale, t, labels } = env;
  const u = proj.tileScreenW / 64;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const s of world.seekers) {
    const x = lerp(s.px, s.x, alpha);
    const y = lerp(s.py, s.y, alpha);
    if (fog.at(Math.floor(x), Math.floor(y)) !== FOG_VISIBLE) continue;
    const showMark = s.state === "chase" || s.state === "curious" || s.state === "investigate" || s.state === "search";
    if (!showMark && s.detection <= 0.01) continue;
    const cx = proj.px(x);
    const cy = proj.py(y) - (proj.heightPx > 0 ? 78 * u : 30 * u);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(uiScale, uiScale);
    if (s.detection > 0.01) {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = s.detection > 0.7 ? "#ff4a3a" : "#ffc233";
      ctx.beginPath();
      ctx.arc(0, 0, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, s.detection));
      ctx.stroke();
    }
    if (showMark) {
      ctx.fillStyle = s.state === "chase" ? "#ff4a3a" : "#ffd24a";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(s.state === "chase" ? "!" : "?", 0, 1);
    }
    ctx.restore();
  }
  // HOME label (badge 52x18 label px, text 2 px above its centre)
  {
    const [hx, hy, hw] = level.home;
    const cx = proj.px(hx + hw / 2);
    const cy = proj.py(hy) - 6 - 11 * uiScale;
    if (labels) labels.draw(ctx, "HOME", "bold 12px sans-serif", "#c9ffd9", cx, cy + Math.sin(t * 2.4) * 0.6 * uiScale, uiScale, env.devScale, { color: "rgba(20,80,40,0.85)", w: 52, h: 18 });
    else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(uiScale, uiScale);
      ctx.fillStyle = "rgba(20,80,40,0.85)";
      ctx.fillRect(-26, -9, 52, 18);
      ctx.fillStyle = "#c9ffd9";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("HOME", 0, Math.sin(t * 2.4) * 0.6);
      ctx.restore();
    }
  }
  // unknown room hints
  for (const r of level.rooms) {
    if (world.roomVis[r.id] && world.roomVis[r.id] !== "unknown") continue;
    const rc = r.rects[0]!;
    const cx = rc[0] + rc[2] / 2;
    const cy = rc[1] + rc[3] / 2;
    if (fog.at(Math.floor(cx), Math.floor(cy)) !== FOG_UNKNOWN) continue;
    const sx = proj.px(cx);
    const sy = proj.py(cy);
    if (sx < env.view.x0 || sx > env.view.x1 || sy < env.view.y0 || sy > env.view.y1) continue;
    ctx.globalAlpha = 0.35;
    if (labels) labels.draw(ctx, r.id.toUpperCase(), "bold 14px sans-serif", "#8a91ad", sx, sy, uiScale, env.devScale);
    else {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(uiScale, uiScale);
      ctx.fillStyle = "#8a91ad";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(r.id.toUpperCase(), 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}
