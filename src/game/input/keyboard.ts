/**
 * Keyboard mapping. `KeyboardState` is pure (no DOM): feed it key codes, poll it per tick.
 * `attachKeyboard` wires it to a window-like event target.
 */
import { NO_INPUT } from "../sim/types";
import type { InputState, ViewControls } from "../sim/types";

export type KeyAction =
  | "up" | "down" | "left" | "right"
  | "sneak" | "run" | "interact"
  | "slot1" | "slot2" | "slot3" | "slot4"
  | "peek" | "zoomIn" | "zoomOut"
  | "toggleProjection" | "restart" | "pause" | "toggleDebug";

/** KeyboardEvent.code -> action. */
export const KEY_ACTIONS: Readonly<Record<string, KeyAction>> = {
  KeyW: "up", ArrowUp: "up",
  KeyS: "down", ArrowDown: "down",
  KeyA: "left", ArrowLeft: "left",
  KeyD: "right", ArrowRight: "right",
  ShiftLeft: "sneak", ShiftRight: "sneak",
  Space: "run",
  KeyE: "interact", KeyF: "interact",
  Digit1: "slot1", Digit2: "slot2", Digit3: "slot3", Digit4: "slot4",
  Numpad1: "slot1", Numpad2: "slot2", Numpad3: "slot3", Numpad4: "slot4",
  Tab: "peek",
  Equal: "zoomIn", NumpadAdd: "zoomIn",
  Minus: "zoomOut", NumpadSubtract: "zoomOut",
  KeyP: "toggleProjection",
  KeyR: "restart",
  Escape: "pause",
  Backquote: "toggleDebug",
};

/** Browsers report "+" as Shift+Equal on many layouts, "_" as Shift+Minus; `code` covers both. */
export function actionForKey(code: string): KeyAction | undefined {
  return KEY_ACTIONS[code];
}

export interface CommandFlags { pause: boolean; restart: boolean; toggleProjection: boolean; toggleDebug: boolean }

export class KeyboardState {
  private down = new Set<KeyAction>();
  private interactEdge = false;
  private slot: number | null = null;
  private zoom = 0;
  private cmd: CommandFlags = { pause: false, restart: false, toggleProjection: false, toggleDebug: false };

  /** Returns true if the key is a game key (caller should preventDefault). */
  keyDown(code: string, repeat = false): boolean {
    const action = actionForKey(code);
    if (!action) return false;
    if (repeat) return true; // swallow auto-repeat, but keep default prevented
    const wasDown = this.down.has(action);
    this.down.add(action);
    if (wasDown) return true;
    switch (action) {
      case "interact": this.interactEdge = true; break;
      case "slot1": this.slot = 0; break;
      case "slot2": this.slot = 1; break;
      case "slot3": this.slot = 2; break;
      case "slot4": this.slot = 3; break;
      case "zoomIn": this.zoom += 1; break;
      case "zoomOut": this.zoom -= 1; break;
      case "toggleProjection": this.cmd.toggleProjection = true; break;
      case "restart": this.cmd.restart = true; break;
      case "pause": this.cmd.pause = true; break;
      case "toggleDebug": this.cmd.toggleDebug = true; break;
      default: break;
    }
    return true;
  }

  keyUp(code: string): boolean {
    const action = actionForKey(code);
    if (!action) return false;
    this.down.delete(action);
    return true;
  }

  /** Window lost focus: forget held keys so nothing sticks. */
  releaseAll(): void {
    this.down.clear();
  }

  addZoom(notches: number): void {
    this.zoom += notches;
  }

  pollSim(): InputState {
    const x = (this.down.has("right") ? 1 : 0) - (this.down.has("left") ? 1 : 0);
    const y = (this.down.has("down") ? 1 : 0) - (this.down.has("up") ? 1 : 0);
    const len = Math.hypot(x, y);
    const move = len > 1 ? { x: x / len, y: y / len } : { x, y };
    const interactHeld = this.down.has("interact");
    const state: InputState = {
      ...NO_INPUT,
      move,
      analog: false,
      sneak: this.down.has("sneak"),
      run: this.down.has("run"),
      interactPressed: this.interactEdge,
      interactHeld: interactHeld || this.interactEdge,
      useSlot: this.slot,
    };
    this.interactEdge = false;
    this.slot = null;
    return state;
  }

  pollView(): ViewControls {
    const z = this.zoom;
    this.zoom = 0;
    return { zoomDelta: z, peek: this.down.has("peek") };
  }

  pollCommands(): CommandFlags {
    const c = this.cmd;
    this.cmd = { pause: false, restart: false, toggleProjection: false, toggleDebug: false };
    return c;
  }
}

/** Mouse wheel -> zoom notches. Scroll up (negative deltaY) zooms in. */
export function wheelToNotches(deltaY: number, deltaMode = 0): number {
  const raw = deltaMode === 1 ? -deltaY / 3 : deltaMode === 2 ? -deltaY : -deltaY / 100;
  return Math.max(-1, Math.min(1, raw));
}

/** True when keyboard focus is in a text-entry element (we must not steal keys). */
export function isEditableTarget(t: unknown): boolean {
  const el = t as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true;
}

/** Wire a KeyboardState to window-like events. Returns a disposer. */
export function attachKeyboard(kb: KeyboardState, win: Window, wheelTarget: HTMLElement): () => void {
  const onDown = (e: KeyboardEvent) => {
    if (isEditableTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (kb.keyDown(e.code, e.repeat)) e.preventDefault();
  };
  const onUp = (e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) return;
    if (kb.keyUp(e.code)) e.preventDefault();
  };
  const onBlur = () => kb.releaseAll();
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    kb.addZoom(wheelToNotches(e.deltaY, e.deltaMode));
  };
  win.addEventListener("keydown", onDown);
  win.addEventListener("keyup", onUp);
  win.addEventListener("blur", onBlur);
  wheelTarget.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    win.removeEventListener("keydown", onDown);
    win.removeEventListener("keyup", onUp);
    win.removeEventListener("blur", onBlur);
    wheelTarget.removeEventListener("wheel", onWheel);
  };
}
