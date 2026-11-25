import type { ProjectionKind } from "../contracts";

export const MIN_TIME_SCALE = 0.25;
export const MAX_TIME_SCALE = 4;

export interface QueryFlags {
  /** Level id, default "L01". */
  level: string;
  debug: boolean;
  /** Undefined when not given (fall back to saved settings). */
  proj: ProjectionKind | undefined;
  /** Force the touch UI. */
  touch: boolean;
  /** Force left-handed layout (and save it). */
  lefty: boolean;
  timescale: number;
}

export function clampTimeScale(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(MAX_TIME_SCALE, Math.max(MIN_TIME_SCALE, v));
}

/** Parse `?level=L01&debug=1&proj=topdown&touch=1&timescale=0.5`. Never throws. */
export function parseQueryFlags(search: string): QueryFlags {
  const p = new URLSearchParams(search);
  const on = (k: string) => {
    const v = p.get(k);
    return v === "1" || v === "true";
  };
  const proj = p.get("proj");
  const ts = p.get("timescale");
  const level = (p.get("level") ?? "").trim();
  return {
    level: level || "L01",
    debug: on("debug"),
    proj: proj === "topdown" || proj === "oblique" ? proj : undefined,
    touch: on("touch"),
    lefty: on("lefty"),
    timescale: ts === null || ts.trim() === "" ? 1 : clampTimeScale(Number(ts)),
  };
}
