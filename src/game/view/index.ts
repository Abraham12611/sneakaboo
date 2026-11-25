import type { CreateGameView, ViewOptions } from "../contracts";
import { GameViewImpl, type GameViewExt } from "./renderer";

/** Create the Canvas 2D game view. Returns a `GameViewExt` (a `GameView` plus `skipIntro()` and toggles). */
export function createGameView(canvas: HTMLCanvasElement, opts: ViewOptions): GameViewExt {
  return new GameViewImpl(canvas, opts);
}
/** Compile-time check that the factory satisfies the shared contract. */
export const _contractCheck: CreateGameView = createGameView;

export { GameViewImpl, getViewSettings, setMinimap, setThreatArrows } from "./renderer";
export type { GameViewExt, ViewDeps } from "./renderer";
export * from "./projection";
export * from "./viewport";
export * from "./camera";
export * from "./transform";
export * from "./occlusion";
export * from "./bounds";
export { PieceCache, PIECE_DEV } from "./layers";
export * from "./fog";
export * from "./cones";
export * from "./chunks";
export { threatArrow, miniLayout, THREAT_RANGE, MINI_W, MINI_H } from "./hud";
export { buildWallRuns, isDoorway, wallHeightAt } from "./levelStatic";
