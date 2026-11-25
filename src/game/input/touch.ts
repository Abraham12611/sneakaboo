/**
 * Touch controls: floating joystick, pinch zoom and on-screen buttons.
 * DOM elements are created inside `target` and removed on dispose.
 * The joystick uses the first touch that lands in its region. Every other touch is "free";
 * two free touches form a pinch, so a pinch never disturbs the stick.
 */
import { NO_INPUT } from "../sim/types";
import type { InputState, ViewControls } from "../sim/types";
import {
  clampKnob, computeStick, gaitFromMagnitude, inStickRegion, STICK_MAX_RADIUS,
} from "./joystick";
import { PinchTracker } from "./pinch";
import type { CommandFlags } from "./keyboard";

export interface TouchOptions {
  /** Accept mouse pointers too (for ?touch=1 testing on a desktop). */
  acceptMouse: boolean;
  /** Show the P (projection) and debug buttons. */
  debugButtons: boolean;
  leftHanded: boolean;
}

const STYLE_ID = "sk-touch-style";
const CSS = `
.sk-touch{position:absolute;inset:0;pointer-events:none;z-index:10;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;font-family:system-ui,sans-serif}
.sk-ring{position:absolute;width:${STICK_MAX_RADIUS * 2}px;height:${STICK_MAX_RADIUS * 2}px;margin:-${STICK_MAX_RADIUS}px 0 0 -${STICK_MAX_RADIUS}px;border-radius:50%;border:3px solid rgba(255,255,255,.45);background:rgba(255,255,255,.08);display:none}
.sk-knob{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(255,201,51,.85);box-shadow:0 2px 8px rgba(0,0,0,.4)}
.sk-gait{position:absolute;transform:translate(-50%,0);color:#fff;font-size:14px;font-weight:600;text-shadow:0 1px 3px #000;white-space:nowrap;display:none}
.sk-btn{position:absolute;pointer-events:auto;touch-action:none;border:2px solid rgba(255,255,255,.55);background:rgba(20,24,40,.55);color:#fff;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;font-size:14px;-webkit-tap-highlight-color:transparent}
.sk-btn.sk-down{background:rgba(255,201,51,.8);color:#222}
.sk-inspect{width:96px;height:96px;font-size:16px}
.sk-run{width:64px;height:64px}
.sk-small{width:44px;height:44px;font-size:20px}
`;

function ensureStyle(doc: Document): HTMLStyleElement | null {
  if (doc.getElementById(STYLE_ID)) return null;
  const s = doc.createElement("style");
  s.id = STYLE_ID;
  s.textContent = CSS;
  doc.head.appendChild(s);
  return s;
}

interface Pt { x: number; y: number }

export class TouchControls {
  private root: HTMLDivElement;
  private ring: HTMLDivElement;
  private knob: HTMLDivElement;
  private gait: HTMLDivElement;
  private style: HTMLStyleElement | null;
  private buttons: { el: HTMLButtonElement; side: "left" | "right"; css: Record<string, string> }[] = [];
  private prevTouchAction: string;
  private leftHanded: boolean;

  private stickId: number | null = null;
  private stickOrigin: Pt = { x: 0, y: 0 };
  private stickOut = { x: 0, y: 0 };
  private free = new Map<number, Pt>();
  private pinch = new PinchTracker();
  private zoom = 0;
  private interactEdge = false;
  private interactHeld = false;
  private runHeld = false;
  private cmd: CommandFlags = { pause: false, restart: false, toggleProjection: false, toggleDebug: false };
  private cleanups: (() => void)[] = [];

  constructor(private target: HTMLElement, private opts: TouchOptions) {
    const doc = target.ownerDocument;
    this.leftHanded = opts.leftHanded;
    this.style = ensureStyle(doc);
    this.prevTouchAction = target.style.touchAction;
    target.style.touchAction = "none";
    if (target.ownerDocument.defaultView?.getComputedStyle(target).position === "static") {
      target.style.position = "relative";
    }

    this.root = doc.createElement("div");
    this.root.className = "sk-touch";
    this.ring = doc.createElement("div");
    this.ring.className = "sk-ring";
    this.knob = doc.createElement("div");
    this.knob.className = "sk-knob";
    this.ring.appendChild(this.knob);
    this.gait = doc.createElement("div");
    this.gait.className = "sk-gait";
    this.root.append(this.ring, this.gait);
    target.appendChild(this.root);

    this.makeButton("INSPECT", "sk-inspect", "right", { bottom: "28px", right: "28px" }, {
      down: () => { this.interactEdge = true; this.interactHeld = true; },
      up: () => { this.interactHeld = false; },
    });
    this.makeButton("RUN", "sk-run", "right", { bottom: "136px", right: "40px" }, {
      down: () => { this.runHeld = true; },
      up: () => { this.runHeld = false; },
    });
    this.makeButton("II", "sk-small", "left", { top: "calc(12px + env(safe-area-inset-top))", left: "calc(12px + env(safe-area-inset-left))" }, {
      down: () => { this.cmd.pause = true; },
    }, true);
    this.makeButton("+", "sk-small", "right", { top: "calc(50% - 52px)", right: "12px" }, { down: () => { this.zoom += 1; } });
    this.makeButton("\u2212", "sk-small", "right", { top: "calc(50% + 8px)", right: "12px" }, { down: () => { this.zoom -= 1; } });
    if (opts.debugButtons) {
      this.makeButton("P", "sk-small", "right", { top: "calc(12px + env(safe-area-inset-top))", right: "12px" }, {
        down: () => { this.cmd.toggleProjection = true; },
      });
      this.makeButton("D", "sk-small", "right", { top: "calc(68px + env(safe-area-inset-top))", right: "12px" }, {
        down: () => { this.cmd.toggleDebug = true; },
      });
    }
    this.applyLayout();

    this.listen(target, "pointerdown", (e) => this.onDown(e as PointerEvent));
    this.listen(target, "pointermove", (e) => this.onMove(e as PointerEvent));
    this.listen(target, "pointerup", (e) => this.onUp(e as PointerEvent));
    this.listen(target, "pointercancel", (e) => this.onUp(e as PointerEvent));
    // Block browser gestures: scroll, pull-to-refresh, double-tap zoom, iOS pinch, context menu.
    for (const type of ["touchstart", "touchmove"]) {
      this.listen(target, type, (e) => { if (e.cancelable) e.preventDefault(); });
    }
    for (const type of ["gesturestart", "gesturechange", "gestureend", "contextmenu", "dblclick"]) {
      this.listen(target, type, (e) => e.preventDefault());
    }
  }

  private listen(el: EventTarget, type: string, fn: (e: Event) => void): void {
    el.addEventListener(type, fn, { passive: false });
    this.cleanups.push(() => el.removeEventListener(type, fn));
  }

  private makeButton(
    label: string, cls: string, side: "left" | "right", css: Record<string, string>,
    h: { down: () => void; up?: () => void }, isPause = false,
  ): void {
    const el = this.target.ownerDocument.createElement("button");
    el.type = "button";
    el.className = `sk-btn ${cls}`;
    el.textContent = label;
    el.setAttribute("aria-label", label);
    Object.assign(el.style, css);
    const release = (e: Event) => {
      e.stopPropagation();
      el.classList.remove("sk-down");
      h.up?.();
    };
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      el.classList.add("sk-down");
      h.down();
    });
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", release);
    this.root.appendChild(el);
    // The pause button keeps its corner in left-handed mode; everything else mirrors.
    this.buttons.push({ el, side: isPause ? "left" : side, css: isPause ? { ...css, __fixed: "1" } : css });
  }

  private applyLayout(): void {
    for (const b of this.buttons) {
      if (b.css.__fixed) continue;
      const mirrored = this.leftHanded;
      const from = b.side;
      const to = mirrored ? (from === "left" ? "right" : "left") : from;
      const value = b.css[from];
      const s = b.el.style;
      s.left = "";
      s.right = "";
      if (value !== undefined) s[to] = value;
    }
  }

  setLeftHanded(on: boolean): void {
    this.leftHanded = on;
    this.applyLayout();
  }

  private rel(e: PointerEvent): Pt {
    const r = this.target.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private accepts(e: PointerEvent): boolean {
    return e.pointerType === "touch" || e.pointerType === "pen" || this.opts.acceptMouse;
  }

  private onDown(e: PointerEvent): void {
    if (!this.accepts(e)) return;
    e.preventDefault();
    try { this.target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const p = this.rel(e);
    const r = this.target.getBoundingClientRect();
    if (this.stickId === null && inStickRegion(e.clientX, r.left, r.width, this.leftHanded)) {
      this.stickId = e.pointerId;
      this.stickOrigin = p;
      this.stickOut = { x: 0, y: 0 };
      this.ring.style.display = "block";
      this.ring.style.left = `${p.x}px`;
      this.ring.style.top = `${p.y}px`;
      this.knob.style.transform = "translate(0px,0px)";
      this.gait.style.display = "block";
      this.gait.style.left = `${p.x}px`;
      this.gait.style.top = `${p.y + STICK_MAX_RADIUS + 8}px`;
      this.gait.textContent = gaitText("sneak");
      return;
    }
    this.free.set(e.pointerId, p);
    this.maybeStartPinch();
  }

  private freePair(): [Pt, Pt] | null {
    const it = this.free.values();
    const a = it.next();
    const b = it.next();
    return a.done || b.done ? null : [a.value, b.value];
  }

  private maybeStartPinch(): void {
    const pair = this.freePair();
    if (pair && !this.pinch.isActive) this.pinch.start(Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y));
  }

  private onMove(e: PointerEvent): void {
    if (e.pointerId === this.stickId) {
      e.preventDefault();
      const p = this.rel(e);
      const dx = p.x - this.stickOrigin.x;
      const dy = p.y - this.stickOrigin.y;
      const out = computeStick(dx, dy);
      this.stickOut = { x: out.x, y: out.y };
      const k = clampKnob(dx, dy);
      this.knob.style.transform = `translate(${k.x}px,${k.y}px)`;
      this.gait.textContent = gaitText(out.magnitude === 0 ? "sneak" : gaitFromMagnitude(out.magnitude), out.magnitude === 0);
    } else if (this.free.has(e.pointerId)) {
      e.preventDefault();
      this.free.set(e.pointerId, this.rel(e));
      const pair = this.freePair();
      if (pair && this.pinch.isActive) this.zoom += this.pinch.update(Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y));
    }
  }

  private onUp(e: PointerEvent): void {
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.stickOut = { x: 0, y: 0 };
      this.ring.style.display = "none";
      this.gait.style.display = "none";
    } else if (this.free.delete(e.pointerId)) {
      if (this.free.size < 2) this.pinch.end();
      else { this.pinch.end(); this.maybeStartPinch(); }
    }
  }

  pollSim(): InputState {
    const analog = this.stickId !== null && (this.stickOut.x !== 0 || this.stickOut.y !== 0);
    const state: InputState = {
      ...NO_INPUT,
      move: { x: this.stickOut.x, y: this.stickOut.y },
      analog,
      run: this.runHeld,
      interactPressed: this.interactEdge,
      interactHeld: this.interactHeld || this.interactEdge,
    };
    this.interactEdge = false;
    return state;
  }

  pollView(): ViewControls {
    const z = this.zoom;
    this.zoom = 0;
    return { zoomDelta: z, peek: false };
  }

  pollCommands(): CommandFlags {
    const c = this.cmd;
    this.cmd = { pause: false, restart: false, toggleProjection: false, toggleDebug: false };
    return c;
  }

  dispose(): void {
    for (const c of this.cleanups) c();
    this.cleanups = [];
    this.root.remove();
    this.style?.remove();
    this.target.style.touchAction = this.prevTouchAction;
  }
}

function gaitText(g: "sneak" | "walk" | "run", idle = false): string {
  if (idle) return "\u{1F463} sneak";
  return g === "sneak" ? "\u{1F463} sneak" : g === "walk" ? "\u{1F45F} walk" : "\u{1F680} run";
}
