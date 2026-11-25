import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseLevel, type LevelData } from "../../src/game/sim/levelSchema";
import { loadAndValidate } from "../../tools/validate-levels/load";
import { renderPreview } from "../../tools/validate-levels/preview";
import { checkArchetypeSequence, computeRoute, makeRoomLookup, validateLevel } from "../../tools/validate-levels/validate";

const read = (name: string): unknown => JSON.parse(readFileSync(fileURLToPath(new URL(`../../levels/${name}`, import.meta.url)), "utf8"));
const l01 = (): LevelData => parseLevel(read("L01.json"));
/** Fresh mutable raw JSON of L01 for fixtures. */
const raw = (): Record<string, unknown> & { tiles: string[]; objects: Array<Record<string, unknown>>; rooms: Array<Record<string, unknown>> } =>
  structuredClone(read("L01.json")) as never;
const setTile = (tiles: string[], x: number, y: number, ch: string) => {
  const row = tiles[y] as string;
  tiles[y] = row.slice(0, x) + ch + row.slice(x + 1);
};
const errs = (j: unknown) => validateLevel(parseLevel(j)).errors.join(" | ");

describe("official files", () => {
  it("L01.json validates with zero errors", () => {
    const rep = validateLevel(l01());
    expect(rep.errors).toEqual([]);
    expect(rep.ok).toBe(true);
    expect(rep.info.rooms).toBeGreaterThanOrEqual(4);
    expect(rep.info.hideSpots.total).toBeGreaterThanOrEqual(2);
    expect(rep.info.routeLength).not.toBeNull();
  });

  it("_test_room.json parses and validates with zero errors (relaxed)", () => {
    const level = parseLevel(read("_test_room.json"));
    const rep = validateLevel(level);
    expect(rep.relaxed).toBe(true);
    expect(rep.errors).toEqual([]);
  });

  it("loadAndValidate finds both files and none fail", () => {
    const all = loadAndValidate();
    expect(all.map((a) => a.file)).toEqual(expect.arrayContaining(["L01.json", "_test_room.json"]));
    expect(all.filter((a) => !a.report.ok)).toEqual([]);
  });

  it("L01 follows the brief", () => {
    const l = l01();
    expect(l.archetype).toBe("A-starter");
    expect(l.timeLimit).toBe(90);
    expect(l.par).toBe(45);
    expect(l.camera).toEqual({ defaultZoom: 1, minZoom: 0.7, maxZoom: 1.6 });
    expect(l.seekers.map((s) => s.type).sort()).toEqual(["grandma", "uncle"]);
    expect(renderPreview(l)).toContain("S");
  });

  it("L01 route crosses living, hall and kitchen (the yard is no shortcut)", () => {
    const l = l01();
    const route = computeRoute(l, true);
    const lookup = makeRoomLookup(l);
    const ids = new Set(route.path.map((c) => lookup(c.x, c.y)?.id));
    for (const id of ["living", "hall", "kitchen"]) expect(ids.has(id)).toBe(true);
  });
});

describe("broken fixtures", () => {
  it("row length mismatch fails parseLevel", () => {
    const j = raw();
    j.tiles[3] = (j.tiles[3] as string).slice(1);
    expect(() => parseLevel(j)).toThrow(/row 3/);
  });

  it("unreachable home", () => {
    const j = raw();
    setTile(j.tiles, 13, 10, "=");
    setTile(j.tiles, 13, 11, "=");
    j.objects = j.objects.filter((o) => o.id !== "door_kitchen");
    expect(errs(j)).toMatch(/home is not reachable/);
  });

  it("door-less sealed room", () => {
    const j = raw();
    setTile(j.tiles, 10, 4, "=");
    setTile(j.tiles, 10, 5, "=");
    j.objects = j.objects.filter((o) => o.id !== "door_bath");
    expect(errs(j)).toMatch(/room bath is not reachable/);
  });

  it("start in a wall", () => {
    const j = raw();
    j.start = { x: 5.5, y: 7.5, facing: 0 };
    expect(errs(j)).toMatch(/start .* not on a walkable tile/);
  });

  it("tiny room", () => {
    const j = raw();
    const bath = j.rooms.find((r) => r.id === "bath") as Record<string, unknown>;
    bath.rects = [[4, 3, 2, 2]];
    expect(errs(j)).toMatch(/room bath area 4 is under 8/);
  });

  it("tight timeLimit", () => {
    const j = raw();
    j.timeLimit = 8;
    j.par = 4;
    expect(errs(j)).toMatch(/timeLimit 8s is under/);
  });

  it("par outside 40-70% only warns", () => {
    const j = raw();
    j.par = 80;
    const rep = validateLevel(parseLevel(j));
    expect(rep.warnings.join(" ")).toMatch(/par 80s/);
    expect(rep.ok).toBe(true);
  });

  it("doorway wider than 2 tiles", () => {
    const j = raw();
    setTile(j.tiles, 10, 6, ".");
    expect(errs(j)).toMatch(/3 tiles wide/);
  });

  it("seeker inside the 4 tile safe zone", () => {
    const j = raw();
    (j.seekers as Array<Record<string, unknown>>)[0] = { id: "grandma_gus", type: "grandma", x: 4.5, y: 10.5, path: [] };
    expect(errs(j)).toMatch(/within 4 tiles of start/);
  });

  it("object overlapping a wall", () => {
    const j = raw();
    j.objects.push({ id: "bad", type: "crate", x: 10, y: 7, w: 1, h: 1 });
    expect(errs(j)).toMatch(/object bad .* overlaps a wall/);
  });

  it("level 3+ needs a loop", () => {
    const j = raw();
    j.id = "L03";
    j.archetype = "B-terrace";
    expect(errs(j)).toMatch(/no loop/);
  });

  it("consecutive levels may not share an archetype", () => {
    const a = l01();
    const b = { ...l01(), id: "L02" };
    const entries = [a, b].map((level) => ({ level, report: validateLevel(level) }));
    checkArchetypeSequence(entries);
    expect(entries[0]?.report.errors).toEqual([]);
    expect(entries[1]?.report.errors.join(" ")).toMatch(/archetype A-starter repeats/);
  });
});

describe("door handling in the route search", () => {
  const withDoor = (state: "open" | "closed"): LevelData => {
    const j = raw();
    for (const o of j.objects) if (o.id === "door_kitchen") o.state = state;
    return parseLevel(j);
  };

  it("ignores open doors", () => {
    const open = computeRoute(withDoor("open"), true);
    const j = raw();
    j.objects = j.objects.filter((o) => o.id !== "door_kitchen");
    const none = computeRoute(parseLevel(j), true);
    expect(open.found).toBe(true);
    expect(open.length).toBeCloseTo(none.length, 6);
  });

  it("respects closed doors", () => {
    const closed = withDoor("closed");
    expect(computeRoute(closed, true).found).toBe(false);
    expect(computeRoute(closed, false).found).toBe(true);
    const rep = validateLevel(closed);
    expect(rep.errors.join(" ")).toMatch(/closed door/);
  });
});


