/** Input controller: merges keyboard, touch and gamepad into the InputController contract. */
import type { CreateInputController, InputController } from "../contracts";
import { NO_INPUT } from "../sim/types";
import type { InputState, ViewControls } from "../sim/types";
import { firstPad, GamepadState } from "./gamepad";
import { shouldShowTouchUi } from "./joystick";
import { attachKeyboard, KeyboardState } from "./keyboard";
import type { CommandFlags } from "./keyboard";
import { TouchControls } from "./touch";

export { KeyboardState, KEY_ACTIONS, wheelToNotches } from "./keyboard";
export { computeStick, gaitFromMagnitude, shouldShowTouchUi } from "./joystick";
export { pinchNotches, PinchTracker } from "./pinch";

/** Combine several sources for one tick: strongest move vector wins, buttons are OR-ed. */
export function mergeInputs(states: readonly InputState[]): InputState {
  let best: InputState | null = null;
  let bestMag = 0;
  for (const s of states) {
    const m = Math.hypot(s.move.x, s.move.y);
    if (m > bestMag) { bestMag = m; best = s; }
  }
  return {
    ...NO_INPUT,
    move: best ? { x: best.move.x, y: best.move.y } : { x: 0, y: 0 },
    analog: best ? best.analog : false,
    sneak: states.some((s) => s.sneak),
    run: states.some((s) => s.run),
    interactPressed: states.some((s) => s.interactPressed),
    interactHeld: states.some((s) => s.interactHeld),
    useSlot: states.reduce<number | null>((acc, s) => (acc !== null ? acc : s.useSlot), null),
  };
}

export function mergeView(list: readonly ViewControls[]): ViewControls {
  return { zoomDelta: list.reduce((a, v) => a + v.zoomDelta, 0), peek: list.some((v) => v.peek) };
}

export function mergeCommands(list: readonly CommandFlags[]): CommandFlags {
  return {
    pause: list.some((c) => c.pause),
    restart: list.some((c) => c.restart),
    toggleProjection: list.some((c) => c.toggleProjection),
    toggleDebug: list.some((c) => c.toggleDebug),
  };
}

export const createInputController: CreateInputController = (target: HTMLElement): InputController => {
  const win = target.ownerDocument.defaultView ?? window;
  const params = new URLSearchParams(win.location.search);
  const forced = params.get("touch") === "1";
  const debug = params.get("debug") === "1";
  const nav = win.navigator;
  const coarse = typeof win.matchMedia === "function" && win.matchMedia("(pointer: coarse)").matches;

  const kb = new KeyboardState();
  const pad = new GamepadState();
  const detachKeyboard = attachKeyboard(kb, win, target);
  let padPause = false;
  let touch: TouchControls | null = null;
  if (shouldShowTouchUi({ coarsePointer: coarse, maxTouchPoints: nav.maxTouchPoints ?? 0, forced })) {
    touch = new TouchControls(target, { acceptMouse: forced, debugButtons: debug, leftHanded: false });
  }

  return {
    pollSim(): InputState {
      const g = pad.read(firstPad());
      if (g.pause) padPause = true;
      const list = [kb.pollSim(), g.input];
      if (touch) list.push(touch.pollSim());
      return mergeInputs(list);
    },
    pollView(): ViewControls {
      const list = [kb.pollView()];
      if (touch) list.push(touch.pollView());
      return mergeView(list);
    },
    pollCommands() {
      const list = [kb.pollCommands(), { pause: padPause, restart: false, toggleProjection: false, toggleDebug: false }];
      padPause = false;
      if (touch) list.push(touch.pollCommands());
      return mergeCommands(list);
    },
    setLeftHanded(on: boolean) {
      touch?.setLeftHanded(on);
    },
    dispose() {
      detachKeyboard();
      touch?.dispose();
      touch = null;
    },
  };
};
