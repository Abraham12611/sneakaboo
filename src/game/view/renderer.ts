/** Canvas 2D renderer + view orchestration (`GameViewExt`). Reads the sim, never writes it. */
import type { GameView, ProjectionKind, ViewOptions } from "../contracts";
import type { LevelData } from "../sim/levelSchema";
import type { SimEvent, ViewControls, WorldState } from "../sim/types";
import { Camera, clampZoom, DEFAULT_MAX_ZOOM, DEFAULT_MIN_ZOOM } from "./camera";
import { cacheScaleStep, CHUNK, chunkRange, type CanvasFactory, FloorChunks } from "./chunks";
import { countingContext, drawDebugText, drawDebugWorld } from "./debug";
import type { Env } from "./env";
import { lerp } from "./env";
import { drawCones, drawFloorFog, drawHomeBase, drawNoise, drawRugs, drawWorldUi } from "./floorLayer";
import { FogMap } from "./fog";
import { drawThreatArrows, Minimap, minimapOrigin } from "./hud";
import { makeProjection, type Projection } from "./projection";
import { Scene } from "./scene";
import type { Ctx } from "./shapes";
import { cssToWorld, visibleRect } from "./transform";
import { computeViewport, LOGICAL_H, LOGICAL_W, type Viewport, worldUiScale } from "./viewport";

/** View-only extras on top of the `GameView` contract. */
export interface GameViewExt extends GameView {
  /** Skip the Home Base -> start intro pan (also triggered by any key/pointer press on the page). */
  skipIntro(): void;
  isIntroActive(): boolean;
  setThreatArrows(on: boolean): void;
  setMinimap(on: boolean): void;
  setReduceMotion(on: boolean): void;
  /** Seconds left of the peek cooldown (0 = ready). For the HUD. */
  getPeekCooldown(): number;
  /** Stats of the last frame. */
  getStats(): { fps: number; frameMs: number; drawOps: number };
}

const settings = { threatArrows: true, minimap: true };
/** Threat arrows toggle (default on). Applies to all views. */
export function setThreatArrows(on: boolean): void {
  settings.threatArrows = on;
}
/** Minimap toggle (default on). Applies to all views. */
export function setMinimap(on: boolean): void {
  settings.minimap = on;
}
export const getViewSettings = () => ({ ...settings });

export interface ViewDeps {
  createCanvas?: CanvasFactory;
  now?: () => number;
}

function defaultFactory(canvas: HTMLCanvasElement): CanvasFactory {
  return (w, h) => {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    const c = (canvas.ownerDocument ?? document).createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
}
export class GameViewImpl implements GameViewExt {
  private ctxRaw: Ctx;
  private ctx: Ctx;
  private counter = { ops: 0 };
  private proj: Projection;
  private readonly cam = new Camera();
  private vp: Viewport;
  private level: LevelData | null = null;
  private world: WorldState | null = null;
  private fog: FogMap | null = null;
  private chunks: FloorChunks | null = null;
  private readonly scene = new Scene();
  private readonly minimap: Minimap;
  private readonly factory: CanvasFactory;
  private readonly now: () => number;
  private debug: boolean;
  private reduceMotion = false;
  private shake = 0;
  private introGrace = 0;
  private fps = 60;
  private frameMs = 0;
  private lastOps = 0;
  private lastPip = { x: 0, y: 0 };
  private readonly onSkip = (e: Event) => {
    if ((e as KeyboardEvent).repeat) return;
    if (this.introGrace > 0.25) this.cam.skipIntro();
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opts: ViewOptions,
    deps: ViewDeps = {},
  ) {
    const c = canvas.getContext("2d", { alpha: false });
    if (!c) throw new Error("Canvas 2D context unavailable");
    this.ctxRaw = c;
    this.ctx = c;
    this.proj = makeProjection(opts.projection);
    this.debug = !!opts.debug;
    this.factory = deps.createCanvas ?? defaultFactory(canvas);
    this.now = deps.now ?? (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));
    this.minimap = new Minimap(this.factory);
    const cssW = canvas.clientWidth || canvas.width || LOGICAL_W;
    const cssH = canvas.clientHeight || canvas.height || LOGICAL_H;
    this.vp = computeViewport(cssW, cssH, 1);
    if (opts.initialZoom !== undefined) this.cam.setZoomTarget(opts.initialZoom);
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("keydown", this.onSkip);
      window.addEventListener("pointerdown", this.onSkip);
    }
  }

  /* ---------------------------- GameView API ---------------------------- */

  setLevel(level: LevelData, world: WorldState): void {
    this.level = level;
    this.world = world;
    this.fog = new FogMap(level, world.grid.roomIndex);
    this.chunks = new FloorChunks(level, world.grid, this.factory);
    this.scene.setLevel(level);
    this.minimap.invalidate();
    const cam = this.cam;
    cam.setLimits(level.camera.minZoom ?? DEFAULT_MIN_ZOOM, level.camera.maxZoom ?? DEFAULT_MAX_ZOOM);
    cam.setZoomTarget(this.opts.initialZoom ?? level.camera.defaultZoom);
    cam.peekActive = false;
    cam.peekCooldown = 0;
    cam.peekTime = 0;
    cam.snap(world.player.x, world.player.y, level.size.w, level.size.h, this.proj);
    const [hx, hy, hw, hh] = level.home;
    cam.startIntro({ x: hx + hw / 2, y: hy + hh / 2 }, { x: world.player.x, y: world.player.y });
    this.introGrace = 0;
    this.shake = 0;
    this.lastPip = { x: world.player.x, y: world.player.y };
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.vp = computeViewport(cssW, cssH, dpr);
    const c = this.canvas;
    c.width = Math.max(1, Math.round(this.vp.cssW * this.vp.dpr));
    c.height = Math.max(1, Math.round(this.vp.cssH * this.vp.dpr));
    if (c.style) {
      c.style.width = `${this.vp.cssW}px`;
      c.style.height = `${this.vp.cssH}px`;
    }
    this.minimap.invalidate();
    this.chunks?.clear();
  }

  setProjection(kind: ProjectionKind): void {
    if (kind === this.proj.name) return;
    this.proj = makeProjection(kind);
    this.chunks?.clear();
    if (this.level) this.cam.clamp(this.level.size.w, this.level.size.h, this.proj);
  }

  getProjection(): ProjectionKind {
    return this.proj.name;
  }

  getZoom(): number {
    return this.cam.zoomTarget;
  }

  setZoom(z: number): void {
    this.cam.setZoomTarget(z);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return cssToWorld(this.proj, this.cam, this.vp, sx, sy);
  }

  setDebug(on: boolean): void {
    this.debug = on;
    if (!on) this.ctx = this.ctxRaw;
  }

  skipIntro(): void {
    this.cam.skipIntro();
  }
  isIntroActive(): boolean {
    return this.cam.introActive;
  }
  setThreatArrows(on: boolean): void {
    setThreatArrows(on);
  }
  setMinimap(on: boolean): void {
    setMinimap(on);
  }
  setReduceMotion(on: boolean): void {
    this.reduceMotion = on;
  }
  getPeekCooldown(): number {
    return this.cam.peekCooldown;
  }
  getStats() {
    return { fps: this.fps, frameMs: this.frameMs, drawOps: this.lastOps };
  }

  dispose(): void {
    if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
      window.removeEventListener("keydown", this.onSkip);
      window.removeEventListener("pointerdown", this.onSkip);
    }
    this.chunks?.clear();
    this.level = null;
    this.world = null;
  }

  /* ------------------------------- frame ------------------------------- */

  frame(world: WorldState, alpha: number, dtSeconds: number, controls: ViewControls, events: readonly SimEvent[]): void {
    const level = this.level;
    const fog = this.fog;
    const chunks = this.chunks;
    if (!level || !fog || !chunks) return;
    if (world.level !== level) {
      this.setLevel(world.level, world);
      return this.frame(world, alpha, dtSeconds, controls, events);
    }
    const t0 = this.now();
    const dt = Math.max(0, Math.min(0.1, dtSeconds));
    const a = Math.max(0, Math.min(1, alpha));
    const cam = this.cam;
    const proj = this.proj;
    const pl = world.player;
    for (const e of events) if (e.type === "found" && !this.reduceMotion) this.shake = 0.4;
    this.shake = Math.max(0, this.shake - dt);
    if (cam.introActive) this.introGrace += dt;

    cam.zoomBy(controls.zoomDelta);
    cam.updatePeek(dt, controls.peek);
    if (fog.update(world)) this.minimap.invalidate();

    const pip = { x: lerp(pl.px, pl.x, a), y: lerp(pl.py, pl.y, a) };
    let mx = 0;
    let my = 0;
    if (pl.moving) {
      const dx = pl.x - pl.px;
      const dy = pl.y - pl.py;
      const d = Math.hypot(dx, dy);
      if (d > 1e-6) {
        mx = dx / d;
        my = dy / d;
      } else {
        mx = Math.cos(pl.facing);
        my = Math.sin(pl.facing);
      }
    }
    cam.update(dt, pip.x, pip.y, mx, my, level.size.w, level.size.h, proj);
    this.lastPip = pip;

    this.ctx = this.debug ? countingContext(this.ctxRaw, this.counter) : this.ctxRaw;
    this.counter.ops = 0;
    this.render(world, level, fog, chunks, a, dt, pip);
    this.lastOps = this.counter.ops;

    const ms = this.now() - t0;
    this.frameMs = this.frameMs * 0.9 + ms * 0.1;
    if (dt > 0) this.fps = this.fps * 0.92 + (1 / dt) * 0.08;
  }

  /** True when the level (plus its floor) fills the whole viewport, so no background fill is needed. */
  private coversViewport(level: LevelData): boolean {
    const v = visibleRect(this.proj, this.cam);
    return v.x0 >= 0 && v.y0 >= 0 && v.x1 <= level.size.w * this.proj.tileScreenW && v.y1 <= level.size.h * this.proj.tileScreenH;
  }

  private render(world: WorldState, level: LevelData, fog: FogMap, chunks: FloorChunks, alpha: number, dt: number, pip: { x: number; y: number }): void {
    const { ctx, proj, cam, vp } = this;
    const dpr = vp.dpr;
    const s = vp.scale * dpr;
    const z = cam.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // letterbox bars only (a full-canvas clear would repaint every pixel twice)
    const barX = Math.round(vp.offX * dpr);
    const barY = Math.round(vp.offY * dpr);
    if (barX > 0 || barY > 0) {
      ctx.fillStyle = "#040509";
      ctx.fillRect(0, 0, this.canvas.width, barY);
      ctx.fillRect(0, this.canvas.height - barY, this.canvas.width, barY);
      ctx.fillRect(0, barY, barX, this.canvas.height - 2 * barY);
      ctx.fillRect(this.canvas.width - barX, barY, barX, this.canvas.height - 2 * barY);
    }
    ctx.save();
    ctx.setTransform(s, 0, 0, s, vp.offX * dpr, vp.offY * dpr);
    ctx.beginPath();
    ctx.rect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.clip();
    if (!this.coversViewport(level)) {
      ctx.fillStyle = "#0a0c12";
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    const shk = this.shake > 0 ? (this.shake / 0.4) * 7 : 0;
    const shx = shk ? Math.sin(world.t * 63) * shk : 0;
    const shy = shk ? Math.cos(world.t * 71) * shk : 0;
    ctx.setTransform(
      s * z,
      0,
      0,
      s * z,
      // snap the translation to whole device pixels: keeps cached floor chunks 1:1 (fast blit, no shimmer)
      Math.round(vp.offX * dpr + s * (LOGICAL_W / 2 + shx) - s * z * proj.px(cam.x)),
      Math.round(vp.offY * dpr + s * (LOGICAL_H / 2 + shy) - s * z * proj.py(cam.y)),
    );
    const view = visibleRect(proj, cam, 8);
    const env: Env = {
      ctx,
      proj,
      world,
      level,
      fog,
      zoom: z,
      uiScale: worldUiScale(z),
      t: world.t + alpha / 60,
      alpha,
      view,
      pip,
    };

    // 1. floor chunks (cached)
    // While the zoom is animating use a coarse step (few rebuilds); once settled cache at the exact scale so the blit is 1:1.
    const settled = Math.abs(z - cam.effectiveZoomTarget()) < 0.002;
    const step = settled ? Math.round(s * z * 1000) / 1000 : cacheScaleStep(s * z);
    chunks.prune(proj.name, step);
    const tw = proj.tileScreenW;
    const th = proj.tileScreenH;
    const r = chunkRange(Math.floor(view.x0 / tw), Math.floor(view.y0 / th), Math.floor(view.x1 / tw), Math.floor(view.y1 / th), level.size.w, level.size.h);
    const sz = s * z;
    for (let cy = r.cy0; cy <= r.cy1; cy++) {
      for (let cx = r.cx0; cx <= r.cx1; cx++) {
        const img = chunks.get(cx, cy, proj, step) as CanvasImageSource & { width: number; height: number };
        // Align the blit to whole device pixels so it is a 1:1 copy when the cache step equals the scale.
        const ox = Math.round(proj.px(cx * CHUNK) * sz) / sz;
        const oy = Math.round(proj.py(cy * CHUNK) * sz) / sz;
        ctx.drawImage(img, ox, oy, img.width / step, img.height / step);
      }
    }
    // 2. floor-plane layers
    drawFloorFog(env);
    drawHomeBase(env);
    drawRugs(env);
    drawCones(env);
    drawNoise(env);
    // 3. occlusion tween, then the y-sorted standers
    this.scene.updateOcclusion(env, dt);
    this.scene.draw(env, dt);
    // 4. world-space UI
    drawWorldUi(env);
    if (this.debug) drawDebugWorld(env);

    // 5. screen-space overlays (still clipped to the letterbox)
    ctx.setTransform(s, 0, 0, s, vp.offX * dpr, vp.offY * dpr);
    if (settings.threatArrows) drawThreatArrows(ctx, proj, cam, world, fog, pip, alpha);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (settings.minimap) {
      const o = minimapOrigin(vp);
      this.minimap.draw(ctx, o.x, o.y, dpr, level, fog, world.grid.roomIndex, pip, env.t);
    }
    if (this.debug) {
      drawDebugText(ctx, vp.offX + 8, vp.offY + 8, {
        fps: this.fps,
        frameMs: this.frameMs,
        drawOps: this.lastOps,
        projection: proj.name,
        zoom: cam.zoom,
        items: this.scene.stats.items,
        chunks: chunks.size,
        chunkBuilds: chunks.builds,
      });
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

export { clampZoom };
