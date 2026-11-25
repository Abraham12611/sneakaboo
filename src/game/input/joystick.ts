/** Pure joystick and touch-layout math (no DOM). */
import type { Gait } from "../sim/types";

export const STICK_DEAD_ZONE = 0.12;
export const STICK_MAX_RADIUS = 60; // css px
export const STICK_REGION = 0.4; // fraction of the width

export interface StickOutput {
  x: number;
  y: number;
  /** 0..1, after dead-zone rescale. */
  magnitude: number;
}

/**
 * Raw displacement (dx, dy css px from the stick origin) -> analog output.
 * Below the dead zone the output is zero; above it, magnitude is rescaled so it ramps from 0 to 1.
 */
export function computeStick(
  dx: number,
  dy: number,
  maxRadius = STICK_MAX_RADIUS,
  deadZone = STICK_DEAD_ZONE,
): StickOutput {
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || maxRadius <= 0) return { x: 0, y: 0, magnitude: 0 };
  const raw = Math.min(1, dist / maxRadius);
  if (raw < deadZone) return { x: 0, y: 0, magnitude: 0 };
  const magnitude = Math.min(1, (raw - deadZone) / (1 - deadZone));
  return { x: (dx / dist) * magnitude, y: (dy / dist) * magnitude, magnitude };
}

/** Knob position clamped to the ring. */
export function clampKnob(dx: number, dy: number, maxRadius = STICK_MAX_RADIUS): { x: number; y: number } {
  const dist = Math.hypot(dx, dy);
  if (dist <= maxRadius || dist === 0) return { x: dx, y: dy };
  const k = maxRadius / dist;
  return { x: dx * k, y: dy * k };
}

/** Docs: below 40% sneak, 40 to 85% walk, above 85% run. */
export function gaitFromMagnitude(m: number): Gait {
  if (m < 0.4) return "sneak";
  if (m <= 0.85) return "walk";
  return "run";
}

/** Is a touch at clientX inside the joystick region (left 40%, or right 40% when left-handed)? */
export function inStickRegion(clientX: number, left: number, width: number, leftHanded: boolean): boolean {
  if (width <= 0) return false;
  const f = (clientX - left) / width;
  return leftHanded ? f >= 1 - STICK_REGION : f < STICK_REGION;
}

/** Touch UI is shown on touch-capable devices, or when forced with ?touch=1. */
export function shouldShowTouchUi(opts: { coarsePointer: boolean; maxTouchPoints: number; forced: boolean }): boolean {
  return opts.forced || opts.coarsePointer || opts.maxTouchPoints > 0;
}
