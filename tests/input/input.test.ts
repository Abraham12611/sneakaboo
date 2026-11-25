import { describe, expect, it } from "vitest";
import { GamepadState } from "../../src/game/input/gamepad";
import { mergeInputs } from "../../src/game/input";
import {
  clampKnob, computeStick, gaitFromMagnitude, inStickRegion, shouldShowTouchUi, STICK_MAX_RADIUS,
} from "../../src/game/input/joystick";
import { actionForKey, isEditableTarget, KeyboardState, wheelToNotches } from "../../src/game/input/keyboard";
import { pinchNotches, PinchTracker } from "../../src/game/input/pinch";
import { NO_INPUT } from "../../src/game/sim/types";

describe("keyboard mapping", () => {
  const table: [string, string][] = [
    ["KeyW", "up"], ["ArrowUp", "up"], ["KeyA", "left"], ["ArrowLeft", "left"], ["KeyS", "down"],
    ["ArrowDown", "down"], ["KeyD", "right"], ["ArrowRight", "right"], ["ShiftLeft", "sneak"],
    ["ShiftRight", "sneak"], ["Space", "run"], ["KeyE", "interact"], ["KeyF", "interact"],
    ["Digit1", "slot1"], ["Digit4", "slot4"], ["Tab", "peek"], ["Equal", "zoomIn"], ["Minus", "zoomOut"],
    ["NumpadAdd", "zoomIn"], ["NumpadSubtract", "zoomOut"], ["KeyP", "toggleProjection"],
    ["KeyR", "restart"], ["Escape", "pause"], ["Backquote", "toggleDebug"],
  ];
  it.each(table)("%s -> %s", (code, action) => {
    expect(actionForKey(code)).toBe(action);
  });
  it("ignores unknown keys", () => {
    const kb = new KeyboardState();
    expect(kb.keyDown("KeyZ")).toBe(false);
  });

  it("builds a normalized digital move vector", () => {
    const kb = new KeyboardState();
    kb.keyDown("KeyW");
    kb.keyDown("KeyD");
    const s = kb.pollSim();
    expect(s.analog).toBe(false);
    expect(Math.hypot(s.move.x, s.move.y)).toBeCloseTo(1);
    expect(s.move.y).toBeLessThan(0);
    kb.keyUp("KeyW");
    kb.keyUp("KeyD");
    expect(kb.pollSim().move).toEqual({ x: 0, y: 0 });
  });

  it("opposite keys cancel", () => {
    const kb = new KeyboardState();
    kb.keyDown("KeyA");
    kb.keyDown("KeyD");
    expect(kb.pollSim().move).toEqual({ x: 0, y: 0 });
  });

  it("interact is an edge plus held; edge is consumed", () => {
    const kb = new KeyboardState();
    kb.keyDown("KeyE");
    const a = kb.pollSim();
    expect(a.interactPressed).toBe(true);
    expect(a.interactHeld).toBe(true);
    const b = kb.pollSim();
    expect(b.interactPressed).toBe(false);
    expect(b.interactHeld).toBe(true);
    kb.keyUp("KeyE");
    expect(kb.pollSim().interactHeld).toBe(false);
  });

  it("a tap shorter than one tick still produces one pressed edge", () => {
    const kb = new KeyboardState();
    kb.keyDown("KeyF");
    kb.keyUp("KeyF");
    const s = kb.pollSim();
    expect(s.interactPressed).toBe(true);
    expect(s.interactHeld).toBe(true);
  });

  it("auto-repeat does not retrigger edges", () => {
    const kb = new KeyboardState();
    kb.keyDown("KeyE");
    kb.pollSim();
    expect(kb.keyDown("KeyE", true)).toBe(true);
    expect(kb.pollSim().interactPressed).toBe(false);
  });

  it("slots, sneak and run", () => {
    const kb = new KeyboardState();
    kb.keyDown("Digit3");
    kb.keyDown("ShiftLeft");
    kb.keyDown("Space");
    const s = kb.pollSim();
    expect(s.useSlot).toBe(2);
    expect(s.sneak).toBe(true);
    expect(s.run).toBe(true);
    expect(kb.pollSim().useSlot).toBeNull();
  });

  it("view controls: zoom notches accumulate and reset, peek is held", () => {
    const kb = new KeyboardState();
    kb.keyDown("Equal");
    kb.keyDown("Equal", true);
    kb.keyUp("Equal");
    kb.keyDown("Equal");
    kb.addZoom(-0.5);
    kb.keyDown("Tab");
    expect(kb.pollView()).toEqual({ zoomDelta: 1.5, peek: true });
    expect(kb.pollView()).toEqual({ zoomDelta: 0, peek: true });
    kb.keyUp("Tab");
    expect(kb.pollView().peek).toBe(false);
  });

  it("commands are one-shot flags", () => {
    const kb = new KeyboardState();
    kb.keyDown("Escape");
    kb.keyDown("KeyR");
    kb.keyDown("KeyP");
    kb.keyDown("Backquote");
    expect(kb.pollCommands()).toEqual({ pause: true, restart: true, toggleProjection: true, toggleDebug: true });
    expect(kb.pollCommands()).toEqual({ pause: false, restart: false, toggleProjection: false, toggleDebug: false });
  });

  it("releaseAll clears held keys", () => {
    const kb = new KeyboardState();
    kb.keyDown("KeyD");
    kb.releaseAll();
    expect(kb.pollSim().move.x).toBe(0);
  });

  it("wheel: scroll up zooms in, clamped to one notch per event", () => {
    expect(wheelToNotches(-100)).toBe(1);
    expect(wheelToNotches(100)).toBe(-1);
    expect(wheelToNotches(-30)).toBeCloseTo(0.3);
    expect(wheelToNotches(-1000)).toBe(1);
    expect(wheelToNotches(-3, 1)).toBe(1);
  });

  it("detects editable focus targets", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "textarea" })).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isEditableTarget({ tagName: "CANVAS" })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("joystick math", () => {
  const R = STICK_MAX_RADIUS;
  it("is zero inside the 12% dead zone", () => {
    expect(computeStick(R * 0.11, 0)).toEqual({ x: 0, y: 0, magnitude: 0 });
    expect(computeStick(0, 0).magnitude).toBe(0);
  });
  it("ramps from 0 at the dead-zone edge to 1 at full push", () => {
    expect(computeStick(R * 0.12, 0).magnitude).toBeCloseTo(0);
    expect(computeStick(R, 0).magnitude).toBeCloseTo(1);
    expect(computeStick(R * 3, 0).magnitude).toBeCloseTo(1);
    const mid = computeStick(R * 0.56, 0);
    expect(mid.magnitude).toBeCloseTo(0.5);
    expect(mid.x).toBeCloseTo(0.5);
  });
  it("keeps direction and never exceeds magnitude 1", () => {
    const o = computeStick(R, R);
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(1);
    expect(o.x).toBeCloseTo(o.y);
    const n = computeStick(-R, 0);
    expect(n.x).toBeCloseTo(-1);
  });
  it("clamps the knob to the ring", () => {
    const k = clampKnob(R * 2, 0);
    expect(k.x).toBeCloseTo(R);
    expect(clampKnob(10, 5)).toEqual({ x: 10, y: 5 });
  });
  it("gait bands: <40% sneak, 40-85% walk, >85% run", () => {
    expect(gaitFromMagnitude(0.1)).toBe("sneak");
    expect(gaitFromMagnitude(0.39)).toBe("sneak");
    expect(gaitFromMagnitude(0.4)).toBe("walk");
    expect(gaitFromMagnitude(0.85)).toBe("walk");
    expect(gaitFromMagnitude(0.86)).toBe("run");
    expect(gaitFromMagnitude(1)).toBe("run");
  });
  it("stick region is the left 40% (right 40% when left-handed)", () => {
    expect(inStickRegion(100, 0, 1000, false)).toBe(true);
    expect(inStickRegion(399, 0, 1000, false)).toBe(true);
    expect(inStickRegion(400, 0, 1000, false)).toBe(false);
    expect(inStickRegion(900, 0, 1000, true)).toBe(true);
    expect(inStickRegion(500, 0, 1000, true)).toBe(false);
    expect(inStickRegion(150, 50, 1000, false)).toBe(true);
    expect(inStickRegion(5, 0, 0, false)).toBe(false);
  });
  it("touch UI detection and force flag", () => {
    expect(shouldShowTouchUi({ coarsePointer: false, maxTouchPoints: 0, forced: false })).toBe(false);
    expect(shouldShowTouchUi({ coarsePointer: true, maxTouchPoints: 0, forced: false })).toBe(true);
    expect(shouldShowTouchUi({ coarsePointer: false, maxTouchPoints: 5, forced: false })).toBe(true);
    expect(shouldShowTouchUi({ coarsePointer: false, maxTouchPoints: 0, forced: true })).toBe(true);
  });
  it("an analog stick output gives the sim analog: true with magnitude <= 1", () => {
    const o = computeStick(R * 0.5, 0);
    const state = { ...NO_INPUT, move: { x: o.x, y: o.y }, analog: true };
    expect(state.analog).toBe(true);
    expect(Math.hypot(state.move.x, state.move.y)).toBeLessThanOrEqual(1);
  });
});

describe("pinch math", () => {
  it("spread zooms in, pinch zooms out, symmetric", () => {
    expect(pinchNotches(100, 120)).toBeCloseTo(1);
    expect(pinchNotches(120, 100)).toBeCloseTo(-1);
    expect(pinchNotches(100, 100.4)).toBe(0);
    expect(pinchNotches(0, 50)).toBe(0);
  });
  it("tracker sums to the overall ratio and ignores jitter", () => {
    const t = new PinchTracker();
    t.start(100);
    let total = 0;
    for (const d of [110, 120, 130, 144]) total += t.update(d);
    expect(total).toBeCloseTo(pinchNotches(100, 144));
    expect(t.update(144.2)).toBe(0);
    t.end();
    expect(t.update(300)).toBe(0);
    expect(t.isActive).toBe(false);
  });
});

describe("merge and gamepad", () => {
  it("merge: strongest move wins, buttons OR, first slot wins", () => {
    const kb = { ...NO_INPUT, move: { x: 1, y: 0 }, interactPressed: true, useSlot: 1 };
    const touch = { ...NO_INPUT, move: { x: 0, y: 0.5 }, analog: true, run: true, useSlot: 2 };
    const m = mergeInputs([touch, kb]);
    expect(m.move).toEqual({ x: 1, y: 0 });
    expect(m.analog).toBe(false);
    expect(m.run).toBe(true);
    expect(m.interactPressed).toBe(true);
    expect(m.useSlot).toBe(2);
    expect(mergeInputs([]).move).toEqual({ x: 0, y: 0 });
  });
  it("gamepad: stick, A edge, B run, Start pause edge", () => {
    const g = new GamepadState();
    const pad = (a: boolean, start = false) => ({
      axes: [1, 0],
      buttons: Array.from({ length: 10 }, (_, i) => ({ pressed: (i === 0 && a) || (i === 1) || (i === 9 && start) })),
    });
    const r1 = g.read(pad(true, true));
    expect(r1.input.analog).toBe(true);
    expect(r1.input.run).toBe(true);
    expect(r1.input.interactPressed).toBe(true);
    expect(r1.pause).toBe(true);
    const r2 = g.read(pad(true, true));
    expect(r2.input.interactPressed).toBe(false);
    expect(r2.input.interactHeld).toBe(true);
    expect(r2.pause).toBe(false);
    expect(g.read(null).input.move).toEqual({ x: 0, y: 0 });
  });
});
