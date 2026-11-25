/**
 * Level data contract (schema v1). Single source of truth for the game, the validator,
 * the level editor (phase 9) and backend functions. Pure data, no DOM.
 * Units: tiles. Origin top-left, +x right, +y down (flat plan coordinates; the view projects them).
 */
import { z } from "zod";

/** Tile legend used in `tiles` rows (one char per tile). */
export const TILE = {
  VOID: " ", //  outside the playable map, not walkable, not drawn
  FLOOR: ".", // indoor floor (room type/tint come from `rooms`)
  GRASS: ",", // yard, walkable
  WALL: "#", //  exterior wall, tall, blocks move + sight
  PARTITION: "=", // interior partition wall, drawn low, blocks move + sight
  WINDOW: "w", // wall segment with glass: blocks move, does NOT block sight
  HEDGE: "h", // yard hedge: blocks move + sight, drawn as a green block
} as const;
export type TileChar = (typeof TILE)[keyof typeof TILE];

const num = z.number().finite();
export const RectSchema = z.tuple([num, num, num.positive(), num.positive()]); // [x, y, w, h]
export type Rect = z.infer<typeof RectSchema>;

export const SurfaceSchema = z.enum(["wood", "carpet", "tile", "creaky", "grass", "concrete"]);
export type Surface = z.infer<typeof SurfaceSchema>;

export const RoomTypeSchema = z.enum([
  "hall", "living", "kitchen", "dining", "bedroom", "bathroom", "study", "nursery",
  "garage", "yard", "attic", "cellar", "gallery", "other",
]);

export const RoomSchema = z.object({
  id: z.string().min(1),
  type: RoomTypeSchema,
  /** One rect or several (non-rectangular rooms). */
  rects: z.array(RectSchema).min(1),
  /** Floor color for greybox/final tint. Hex string like "#c0392b". */
  floorTint: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  surface: SurfaceSchema.default("wood"),
});
export type Room = z.infer<typeof RoomSchema>;

export const ObjectTypeSchema = z.enum([
  "bed", "wardrobe", "closet", "sofa", "armchair", "chair", "table", "table_cloth", "desk",
  "nightstand", "dresser", "bookshelf", "fridge", "counter", "stove", "sink", "tub", "toilet",
  "plant", "rug", "chest", "box", "crate", "barrel", "painting", "lamp", "tv_unit", "piano",
  "car", "bench", "tree", "shed", "door", "other",
]);

export const DoorStateSchema = z.enum(["open", "closed"]); // locked etc. arrive in phase 3

export const ObjectSchema = z.object({
  id: z.string().min(1),
  type: ObjectTypeSchema,
  x: num, y: num, w: num.positive(), h: num.positive(), // footprint on the floor
  /** Visual height in tiles (0 for rugs). Default by type if omitted. */
  height: num.min(0).optional(),
  /** Does the footprint block walking? Default true except rug/painting/lamp. */
  blocksMove: z.boolean().optional(),
  /** Does it block sight lines? Default true when height >= 1.2. */
  blocksSight: z.boolean().optional(),
  /** Greybox color (hex). */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  /** Door state (only for type "door"). Closed doors block move + sight. */
  state: DoorStateSchema.optional(),
  /** Reserved for later phases, passed through untouched. */
  hide: z.record(z.string(), z.unknown()).optional(),
  search: z.record(z.string(), z.unknown()).optional(),
  contains: z.record(z.string(), z.unknown()).optional(),
});
export type LevelObject = z.infer<typeof ObjectSchema>;

export const SeekerTypeSchema = z.enum([
  "grandma", "uncle", "twin", "dog", "sprinter", "watcher", "guard", "other",
]);
export const WaypointSchema = z.object({
  x: num, y: num, wait: num.min(0).default(0), look: num.optional(), // look = degrees, 0 = +x, 90 = +y (down)
});
export const SeekerSchema = z.object({
  id: z.string().min(1),
  type: SeekerTypeSchema,
  x: num, y: num,
  facing: num.default(0), // degrees
  path: z.array(WaypointSchema).default([]),
  loop: z.enum(["loop", "pingpong", "once"]).default("loop"),
  mods: z.record(z.string(), z.number()).optional(),
});
export type LevelSeeker = z.infer<typeof SeekerSchema>;

export const LevelSchema = z.object({
  v: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  author: z.string().default("official"),
  /** Floor-plan archetype id from docs/17 (A-starter, B-terrace, C-lbungalow, ...). */
  archetype: z.string().optional(),
  seed: z.number().int().default(1),
  timeLimit: num.positive(),
  par: num.positive(),
  size: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }),
  /** `size.h` rows, each exactly `size.w` chars, using TILE chars. */
  tiles: z.array(z.string()).min(1),
  rooms: z.array(RoomSchema).default([]),
  objects: z.array(ObjectSchema).default([]),
  seekers: z.array(SeekerSchema).default([]),
  start: z.object({ x: num, y: num, facing: num.default(0) }),
  /** Home Base goal area. */
  home: RectSchema,
  camera: z
    .object({
      defaultZoom: num.positive().default(1),
      minZoom: num.positive().default(0.6),
      maxZoom: num.positive().default(1.8),
    })
    .default({ defaultZoom: 1, minZoom: 0.6, maxZoom: 1.8 }),
});
export type LevelData = z.infer<typeof LevelSchema>;

/** Parse + structural checks that need cross-field knowledge (row lengths, ids unique). */
export function parseLevel(json: unknown): LevelData {
  const lvl = LevelSchema.parse(json);
  if (lvl.tiles.length !== lvl.size.h) throw new Error(`tiles has ${lvl.tiles.length} rows, size.h is ${lvl.size.h}`);
  lvl.tiles.forEach((row, i) => {
    if (row.length !== lvl.size.w) throw new Error(`tiles row ${i} has length ${row.length}, size.w is ${lvl.size.w}`);
  });
  const ids = new Set<string>();
  for (const id of [...lvl.rooms.map((r) => r.id), ...lvl.objects.map((o) => o.id), ...lvl.seekers.map((s) => s.id)]) {
    if (ids.has(id)) throw new Error(`duplicate id ${id}`);
    ids.add(id);
  }
  return lvl;
}
