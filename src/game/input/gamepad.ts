/** Minimal gamepad adapter: left stick = move, A = interact, B = run, Start = pause. */
import { NO_INPUT } from "../sim/types";
import type { InputState } from "../sim/types";
import { computeStick } from "./joystick";

export interface PadLike {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
}

export class GamepadState {
  private prevA = false;
  private prevStart = false;

  /** Read one pad. `pause` is true on the Start-button edge. */
  read(pad: PadLike | null | undefined): { input: InputState; pause: boolean } {
    if (!pad) {
      this.prevA = false;
      this.prevStart = false;
      return { input: { ...NO_INPUT, move: { x: 0, y: 0 } }, pause: false };
    }
    const s = computeStick(pad.axes[0] ?? 0, pad.axes[1] ?? 0, 1, 0.15);
    const a = pad.buttons[0]?.pressed === true;
    const b = pad.buttons[1]?.pressed === true;
    const start = pad.buttons[9]?.pressed === true;
    const pressed = a && !this.prevA;
    const pause = start && !this.prevStart;
    this.prevA = a;
    this.prevStart = start;
    return {
      input: {
        ...NO_INPUT,
        move: { x: s.x, y: s.y },
        analog: s.magnitude > 0,
        run: b,
        interactPressed: pressed,
        interactHeld: a,
      },
      pause,
    };
  }
}

export function firstPad(): PadLike | null {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return null;
  for (const p of navigator.getGamepads()) if (p && p.connected) return p;
  return null;
}
