import { parseLevel } from "../sim/levelSchema";
import type { LevelData } from "../sim/levelSchema";

export interface LevelProblem {
  file: string;
  message: string;
}

export interface LevelRegistry {
  levels: Map<string, LevelData>;
  problems: LevelProblem[];
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function describe(err: unknown): string {
  const issues = (err as { issues?: { path?: (string | number)[]; message?: string }[] } | null)?.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    return issues
      .slice(0, 5)
      .map((i) => `${(i.path ?? []).join(".") || "(root)"}: ${i.message ?? "invalid"}`)
      .join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Validate every level file. Files whose name starts with `_` (templates) are skipped.
 * Bad files are reported in `problems`, never thrown.
 */
export function buildRegistry(files: Record<string, unknown>): LevelRegistry {
  const levels = new Map<string, LevelData>();
  const problems: LevelProblem[] = [];
  for (const [path, json] of Object.entries(files)) {
    const name = fileName(path);
    if (name.startsWith("_")) continue;
    try {
      const level = parseLevel(json);
      if (levels.has(level.id)) throw new Error(`duplicate level id ${level.id}`);
      levels.set(level.id, level);
    } catch (err) {
      problems.push({ file: name, message: describe(err) });
    }
  }
  return { levels, problems };
}
