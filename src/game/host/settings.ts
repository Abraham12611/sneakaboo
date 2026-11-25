import type { ProjectionKind } from "../contracts";

export const SETTINGS_KEY = "sneakaboo.settings.v1";

export interface Settings {
  /** Saved zoom (0.6-1.8) or null to use the level default. */
  zoom: number | null;
  leftHanded: boolean;
  projection: ProjectionKind;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { zoom: null, leftHanded: false, projection: "oblique" };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** localStorage, or null when unavailable or blocked (privacy mode, sandboxed iframe). */
export function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Parse stored JSON field by field; anything invalid falls back to the default. */
export function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (typeof raw !== "object" || raw === null) return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.zoom === "number" && Number.isFinite(r.zoom) && r.zoom >= 0.3 && r.zoom <= 3) out.zoom = r.zoom;
  if (typeof r.leftHanded === "boolean") out.leftHanded = r.leftHanded;
  if (r.projection === "oblique" || r.projection === "topdown") out.projection = r.projection;
  return out;
}

export function loadSettings(storage: StorageLike | null = defaultStorage()): Settings {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const text = storage.getItem(SETTINGS_KEY);
    if (!text) return { ...DEFAULT_SETTINGS };
    return sanitizeSettings(JSON.parse(text));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Returns false if the write failed (quota, blocked). */
export function saveSettings(settings: Settings, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
