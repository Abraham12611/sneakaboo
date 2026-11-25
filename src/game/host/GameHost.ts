/**
 * GameHost wires sim, view and input together: fixed-timestep loop, pause/restart commands,
 * HUD, banners and debug tools. Everything DOM-ish is injected (`ui`, `env`) so the host runs
 * under Node with fakes; in a browser the defaults are created automatically.
 */
import type {
  CreateGameView, CreateInputController, GameView, InputController, ProjectionKind, SimApi,
} from "../contracts";
import type { LevelData } from "../sim/levelSchema";
import { SIM_DT } from "../sim/types";
import type { SimEvent, WorldState } from "../sim/types";
import { Accumulator, clampFrameDt } from "./accumulator";
import { createDomEnv } from "./domEnv";
import type { HostEnv } from "./domEnv";
import { createDomHud, formatTime } from "./hud";
import type { BannerKind, HostUi } from "./hud";
import { clampTimeScale, MAX_TIME_SCALE, MIN_TIME_SCALE } from "./queryFlags";
import { defaultStorage, loadSettings, saveSettings } from "./settings";
import type { Settings, StorageLike } from "./settings";

export interface GameHostDeps {
  sim: SimApi;
  createView: CreateGameView;
  createInput: CreateInputController;
  level: LevelData;
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  /** Override the DOM HUD (tests). */
  ui?: HostUi;
  /** Override the browser environment hooks (tests). `null` disables them. */
  env?: HostEnv | null;
  /** Override localStorage (tests). `null` disables persistence. */
  storage?: StorageLike | null;
}

export interface GameHostOptions {
  projection?: ProjectionKind;
  debug?: boolean;
  timeScale?: number;
  /** Touch UI forced on (?touch=1); makes the portrait overlay apply on desktop too. */
  touch?: boolean;
  leftHanded?: boolean;
}

export const TIME_SCALE_STEPS = [0.25, 0.5, 1, 2, 4] as const;
const SETTINGS_SAVE_INTERVAL = 0.5;

const NULL_UI: HostUi = {
  bind() {}, setLevelName() {}, setTimer() {}, setBanner() {}, setPaused() {},
  setRotateOverlay() {}, setDebugText() {}, dispose() {},
};

export class GameHost {
  readonly sim: SimApi;
  private level: LevelData;
  private view: GameView;
  private input: InputController;
  private ui: HostUi;
  private env: HostEnv | null;
  private storage: StorageLike | null;
  private settings: Settings;

  private world: WorldState;
  private events: SimEvent[] = [];
  private acc = new Accumulator();
  private lastMs: number | null = null;
  private userPaused = false;
  private portrait = false;
  private ended = false;
  private banner: BannerKind | null = null;
  private debug: boolean;
  private timeScale: number;
  private projection: ProjectionKind;

  private ticks = 0;
  private fps = 60;
  private debugClock = 0;
  private saveClock = 0;
  private lastZoom = 0;
  private lastTimerText = "";
  private lastUrgent = false;
  private lastSize: { w: number; h: number; dpr: number } | null = null;

  private raf: number | null = null;
  private stopEnv: (() => void) | null = null;
  private disposed = false;

  constructor(private deps: GameHostDeps, options: GameHostOptions = {}) {
    this.sim = deps.sim;
    this.level = deps.level;
    this.storage = deps.storage === undefined ? defaultStorage() : deps.storage;
    this.settings = loadSettings(this.storage);
    if (options.leftHanded !== undefined && options.leftHanded !== this.settings.leftHanded) {
      this.settings.leftHanded = options.leftHanded;
      saveSettings(this.settings, this.storage);
    }
    this.projection = options.projection ?? this.settings.projection;
    this.debug = options.debug ?? false;
    this.timeScale = clampTimeScale(options.timeScale ?? 1);

    const hasDom = typeof document !== "undefined";
    this.ui = deps.ui ?? (hasDom ? createDomHud(deps.container) : NULL_UI);
    this.env = deps.env === undefined ? (hasDom ? createDomEnv(deps.container, options.touch === true) : null) : deps.env;

    this.world = this.sim.createWorld(this.level);
    this.view = deps.createView(deps.canvas, {
      projection: this.projection,
      initialZoom: this.settings.zoom ?? undefined,
      debug: this.debug,
    });
    this.view.setLevel(this.level, this.world);
    this.lastZoom = this.view.getZoom();
    this.input = deps.createInput(deps.container);
    this.input.setLeftHanded(this.settings.leftHanded);

    this.ui.bind({ retry: () => this.restart(), resume: () => this.resume() });
    this.ui.setLevelName(this.level.name);
    this.ui.setBanner(null);
    this.ui.setPaused(false);
    this.ui.setRotateOverlay(false);
    this.refreshHud(true);
  }

  // ---- accessors -------------------------------------------------------------------------
  getWorld(): WorldState { return this.world; }
  getView(): GameView { return this.view; }
  getLevel(): LevelData { return this.level; }
  getBanner(): BannerKind | null { return this.banner; }
  getTimeScale(): number { return this.timeScale; }
  isDebug(): boolean { return this.debug; }
  isPaused(): boolean { return this.userPaused || this.portrait; }
  getTickCount(): number { return this.ticks; }

  // ---- lifecycle -------------------------------------------------------------------------
  /** Subscribe to browser events and start the requestAnimationFrame loop. */
  start(): void {
    if (this.disposed) return;
    this.stopEnv = this.env?.start({
      onResize: (w, h, dpr) => this.resize(w, h, dpr),
      onHidden: () => this.onHidden(),
      onPortrait: (p) => this.setPortrait(p),
      onKey: (code) => this.onDebugKey(code),
      onLevelReloaded: (lvl) => this.reloadLevel(lvl),
    }) ?? null;
    if (typeof requestAnimationFrame === "function" && this.raf === null) {
      const loop = (t: number) => {
        if (this.disposed) return;
        this.tick(t);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.raf !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.raf);
    this.raf = null;
    this.stopEnv?.();
    this.stopEnv = null;
    this.persistZoom();
    this.input.dispose();
    this.view.dispose();
    this.ui.dispose();
  }

  // ---- the loop --------------------------------------------------------------------------
  /** One animation frame. Called by the rAF loop; tests call it directly with a fake clock. */
  tick(nowMs: number): void {
    if (this.disposed) return;
    const raw = this.lastMs === null ? 0 : (nowMs - this.lastMs) / 1000;
    this.lastMs = nowMs;
    const dt = clampFrameDt(raw);

    this.handleCommands();

    if (!this.isPaused() && !this.ended) {
      const steps = this.acc.advance(dt * this.timeScale);
      for (let i = 0; i < steps && !this.ended; i++) this.stepOnce();
    }

    const controls = this.input.pollView();
    this.view.frame(this.world, this.acc.alpha, dt, controls, this.events);
    this.events.length = 0;

    if (dt > 0) this.fps = this.fps * 0.9 + (1 / dt) * 0.1;
    this.debugClock += dt;
    this.saveClock += dt;
    this.refreshHud(false);
    if (this.saveClock >= SETTINGS_SAVE_INTERVAL) this.persistZoom();
  }

  /** Run exactly one sim tick (also used by the debug single-step key). */
  stepOnce(): void {
    if (this.ended) return;
    const before = this.events.length;
    this.sim.stepWorld(this.world, this.input.pollSim(), this.events);
    this.ticks++;
    for (let i = before; i < this.events.length; i++) {
      const e = this.events[i];
      if (e) this.applyEvent(e);
    }
    this.applyStatus();
  }

  private applyEvent(e: SimEvent): void {
    if (e.type === "won") this.endWith("won");
    else if (e.type === "timeout") this.endWith("timeout");
    else if (e.type === "found") this.endWith("found");
  }

  private applyStatus(): void {
    const s = this.world.status;
    if (s === "won" || s === "timeout" || s === "found") this.endWith(s);
  }

  private endWith(kind: BannerKind): void {
    if (this.ended) return;
    this.ended = true;
    this.banner = kind;
    this.ui.setBanner(kind);
  }

  // ---- commands --------------------------------------------------------------------------
  private handleCommands(): void {
    const c = this.input.pollCommands();
    if (c.restart) this.restart();
    if (c.pause) this.togglePause();
    if (c.toggleProjection) this.toggleProjection();
    if (c.toggleDebug) this.toggleDebug();
  }

  pause(): void {
    this.userPaused = true;
    this.syncPauseUi();
  }

  resume(): void {
    const wasPaused = this.isPaused();
    this.userPaused = false;
    this.syncPauseUi();
    if (wasPaused && !this.isPaused()) this.flushInput();
  }

  togglePause(): void {
    if (this.ended) return;
    if (this.userPaused) this.resume();
    else this.pause();
  }

  /** Window blurred or document hidden: pause until the player resumes. */
  onHidden(): void {
    if (!this.ended) this.pause();
  }

  /** Portrait phones get a rotate overlay and an automatic pause; landscape resumes. */
  setPortrait(on: boolean): void {
    if (on === this.portrait) return;
    const wasPaused = this.isPaused();
    this.portrait = on;
    this.syncPauseUi();
    if (wasPaused && !this.isPaused()) this.flushInput();
  }

  private syncPauseUi(): void {
    this.ui.setPaused(this.userPaused && !this.portrait && !this.ended);
    this.ui.setRotateOverlay(this.portrait);
    // Do not accumulate time across a pause.
    this.lastMs = null;
  }

  /** Drop edge presses queued while paused so they do not fire on resume. */
  private flushInput(): void {
    this.input.pollSim();
    this.acc.reset();
  }

  restart(): void {
    this.world = this.sim.createWorld(this.level);
    this.view.setLevel(this.level, this.world);
    this.lastZoom = this.view.getZoom();
    this.events.length = 0;
    this.acc.reset();
    this.ended = false;
    this.banner = null;
    this.userPaused = false;
    this.ticks = 0;
    this.ui.setBanner(null);
    this.ui.setLevelName(this.level.name);
    this.syncPauseUi();
    this.input.pollSim(); // discard stale edges
    this.refreshHud(true);
  }

  toggleProjection(): void {
    this.projection = this.view.getProjection() === "oblique" ? "topdown" : "oblique";
    this.view.setProjection(this.projection);
    this.settings.projection = this.projection;
    saveSettings(this.settings, this.storage);
  }

  toggleDebug(): void {
    this.debug = !this.debug;
    this.view.setDebug(this.debug);
    if (!this.debug) this.ui.setDebugText(null);
    else this.refreshHud(true);
  }

  // ---- debug tools (P1.8) ----------------------------------------------------------------
  setTimeScale(v: number): void {
    this.timeScale = clampTimeScale(v);
  }

  /** `[` slows down, `]` speeds up, along 0.25 / 0.5 / 1 / 2 / 4. */
  stepTimeScale(dir: 1 | -1): void {
    const cur = this.timeScale;
    if (dir > 0) {
      this.timeScale = TIME_SCALE_STEPS.find((s) => s > cur + 1e-9) ?? MAX_TIME_SCALE;
    } else {
      this.timeScale = [...TIME_SCALE_STEPS].reverse().find((s) => s < cur - 1e-9) ?? MIN_TIME_SCALE;
    }
  }

  private onDebugKey(code: string): void {
    if (!this.debug) return;
    if (code === "BracketLeft") this.stepTimeScale(-1);
    else if (code === "BracketRight") this.stepTimeScale(1);
    else if (code === "Period" && this.isPaused()) this.stepOnce();
  }

  /** Hot reload: replace the level data and restart on it (ignored for other level ids). */
  reloadLevel(level: LevelData): void {
    if (level.id !== this.level.id) return;
    this.level = level;
    this.restart();
  }

  // ---- view / HUD ------------------------------------------------------------------------
  resize(cssW: number, cssH: number, dpr: number): void {
    const d = Math.min(2, Math.max(1, dpr || 1));
    this.lastSize = { w: cssW, h: cssH, dpr: d };
    this.view.resize(cssW, cssH, d);
  }

  getLastSize(): { w: number; h: number; dpr: number } | null {
    return this.lastSize;
  }

  private refreshHud(force: boolean): void {
    const w = this.world;
    const text = formatTime(w.timeLeft);
    const urgent = w.timeLeft < 0.25 * this.level.timeLimit;
    if (force || text !== this.lastTimerText || urgent !== this.lastUrgent) {
      this.lastTimerText = text;
      this.lastUrgent = urgent;
      this.ui.setTimer(text, urgent);
    }
    if (this.debug && (force || this.debugClock >= 0.25)) {
      this.debugClock = 0;
      this.ui.setDebugText(
        `${this.timeScale}x  tick ${w.tick}  ${Math.round(this.fps)} fps  seed ${this.level.seed}${this.isPaused() ? "  PAUSED" : ""}  (${SIM_DT.toFixed(4)}s)`,
      );
    }
  }

  /** Save the zoom only when it changed since the last time we looked (so level defaults are not pinned). */
  private persistZoom(): void {
    this.saveClock = 0;
    const z = this.view.getZoom();
    if (!Number.isFinite(z) || Math.abs(z - this.lastZoom) <= 1e-3) return;
    this.lastZoom = z;
    this.settings.zoom = z;
    saveSettings(this.settings, this.storage);
  }
}