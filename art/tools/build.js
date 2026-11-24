// Build final test assets from raw generations (art/p0-test/raw) -> props/, characters/, walk/, composite
// usage: node build.js   (run from art/tools)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const T = path.join(__dirname, '..', 'p0-test');
const RAW = path.join(T, 'raw');
const OUT = (...p) => path.join(T, ...p);
const PNG = { palette: true, quality: 92, effort: 8, compressionLevel: 9 };

// id -> [raw file, on-screen width in px at zoom 1 (64px tile), anchor note]
const PROPS = {
  bed_double:     ['bed_double.v2.png', 128],
  wardrobe:       ['wardrobe.v1.png', 64],
  table_cloth:    ['table_cloth.v1.png', 128],
  sofa:           ['sofa.v1.png', 128],
  armchair:       ['armchair.v1.png', 72],
  nightstand:     ['nightstand.v1.png', 56],
  bookshelf:      ['bookshelf.v1.png', 72],
  rug_red:        ['rug_red.v1.png', 192],
  plant_large:    ['plant_large.v1.png', 64],
  chest_wood:     ['chest_wood.v1.png', 64],
  door_closed:    ['door_closed.v1.png', 64],
  painting_framed:['painting_framed.v1.png', 72],
};

async function trimmed(file) {
  return sharp(file).ensureAlpha().trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
}

async function buildProps() {
  const manifest = {};
  for (const [id, [file, w1x]] of Object.entries(PROPS)) {
    const { data } = await trimmed(path.join(RAW, file));
    const out = await sharp(data).resize({ width: w1x * 2, kernel: 'lanczos3' }).png(PNG).toBuffer({ resolveWithObject: true });
    fs.writeFileSync(OUT('props', id + '.png'), out.data);
    manifest[id] = { file: `props/${id}.png`, px2x: [out.info.width, out.info.height], screenW1x: w1x, screenH1x: Math.round(out.info.height / 2), anchor: [0.5, 1.0], scaleNote: 'file is stored at 2x; draw at 0.5 for zoom 1' };
  }
  fs.writeFileSync(OUT('props', 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

// split a sheet into n columns, apply ONE common scale, align feet on a common baseline, same canvas for every view
async function buildViews(sheet, n, names, outPrefix, outDir, heightPx, keepVertical) {
  const meta = await sharp(sheet).metadata();
  const cw = Math.floor(meta.width / n);
  const cells = [];
  for (let i = 0; i < n; i++) {
    const col = await sharp(sheet).extract({ left: i * cw, top: 0, width: cw, height: meta.height }).ensureAlpha().toBuffer();
    if (keepVertical) { cells.push({ data: col, w: cw, h: meta.height }); continue; }
    const t = await sharp(col).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    cells.push({ data: t.data, w: t.info.width, h: t.info.height });
  }
  const maxH = Math.max(...cells.map(c => c.h)), maxW = Math.max(...cells.map(c => c.w));
  const s = heightPx / maxH;
  const W = Math.ceil(maxW * s), H = Math.ceil(maxH * s);
  const files = [];
  for (let i = 0; i < n; i++) {
    const c = cells[i];
    const rw = Math.round(c.w * s), rh = Math.round(c.h * s);
    const img = await sharp(c.data).resize(rw, rh, { kernel: 'lanczos3' }).toBuffer();
    const canvas = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: img, left: Math.floor((W - rw) / 2), top: keepVertical ? 0 : H - rh }]).png(PNG).toBuffer();
    const f = path.join(outDir, `${outPrefix}${names[i]}.png`);
    fs.writeFileSync(f, canvas);
    files.push(f);
  }
  return { files, W, H };
}

async function main() {
  const props = await buildProps();
  console.log('props', Object.keys(props).length);

  const dirs = ['S', 'SE', 'E', 'NE', 'N'];
  const pip = await buildViews(path.join(RAW, 'pip_sheet.png'), 5, dirs, 'pip_', OUT('characters'), 288, false);
  const gus = await buildViews(path.join(RAW, 'gus_sheet.png'), 5, dirs, 'gus_', OUT('characters'), 288, false);
  console.log('chars', pip.W, pip.H, gus.W, gus.H);

  const names6 = [1, 2, 3, 4, 5, 6].map(i => 'walk_0' + i);
  const walk = await buildViews(path.join(RAW, 'walk_gpt_strip.png'), 6, names6, 'pip_S_', OUT('walk'), 288, true);
  // re-assemble a strip of the 6 cells (unaligned: keeps the generator's own vertical bounce)
  await sharp({ create: { width: walk.W * 6, height: walk.H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(walk.files.map((f, i) => ({ input: f, left: i * walk.W, top: 0 }))).png(PNG).toFile(OUT('walk', 'pip_S_walk_strip.png'));

  // technique B contact sheet (edit-model outputs) for the report
  const refs = ['pip_ref_S', 'pipB_gpt_SE', 'pipB_gpt_E', 'pipB_gpt_NE', 'pipB_gpt_N', 'pipB_nb_SE', 'pipB_nb_E', 'pipB_nb_NE', 'pipB_nb_N'];
  fs.mkdirSync(OUT('characters', 'techB'), { recursive: true });
  for (const r of refs) {
    await sharp(path.join(RAW, r + '.png')).resize({ height: 384 }).png(PNG).toFile(OUT('characters', 'techB', r + '.png'));
  }
  await sharp(path.join(RAW, 'walk_nb_strip.png')).resize({ width: 1600 }).png(PNG).toFile(OUT('walk', 'pip_S_walk_strip_nanobanana_whitebg.png'));

  await composite(props, pip, gus);
}

// ---------- composite room ----------
async function composite(props, pip, gus) {
  const W = 1088, H = 608, TILE = 64, K = 0.85, WALL_H = 104;
  const roomTilesW = 12, roomTilesD = 6;
  const ox = Math.round((W - roomTilesW * TILE) / 2), wallTop = 70;
  const floorTop = wallTop + WALL_H, floorH = Math.round(roomTilesD * TILE * K), floorW = roomTilesW * TILE;
  const sx = x => Math.round(ox + x * TILE);
  const sy = y => Math.round(floorTop + y * TILE * K);
  const layers = [];

  // background + floor + wall
  const floorTile = await sharp(path.join(RAW, 'floor_wood.png')).resize(256, Math.round(256 * K)).toBuffer();
  const floorTiles = [];
  for (let x = 0; x < floorW; x += 256) for (let y = 0; y < floorH; y += Math.round(256 * K)) floorTiles.push({ input: floorTile, left: ox + x, top: floorTop + y });
  const floorBuf = await sharp({ create: { width: floorW, height: floorH, channels: 4, background: '#c98d4f' } })
    .composite(floorTiles.map(t => ({ input: t.input, left: t.left - ox, top: t.top - floorTop }))).png().toBuffer();
  const wallTileW = Math.round(1536 * (WALL_H / 512));
  const wallTile = await sharp(path.join(RAW, 'wall_back.png')).resize(wallTileW, WALL_H).toBuffer();
  const wallComp = []; for (let x = 0; x < floorW; x += wallTileW) wallComp.push({ input: wallTile, left: x, top: 0 });
  const wallBuf = await sharp({ create: { width: floorW, height: WALL_H, channels: 4, background: '#f6e3c5' } }).composite(wallComp).png().toBuffer();
  // dark frame (outside / side walls) and a soft warm light gradient on the floor
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#1b2540"/>
    <rect x="${ox - 18}" y="${wallTop - 12}" width="${floorW + 36}" height="${WALL_H + floorH + 30}" rx="6" fill="#5a3a26" stroke="#3a2418" stroke-width="4"/>
  </svg>`;
  layers.push({ input: Buffer.from(svg), left: 0, top: 0 });
  layers.push({ input: wallBuf, left: ox, top: wallTop });
  layers.push({ input: floorBuf, left: ox, top: floorTop });
  const light = `<svg xmlns="http://www.w3.org/2000/svg" width="${floorW}" height="${WALL_H + floorH}">
    <defs><radialGradient id="g" cx="0.3" cy="0.1" r="0.9"><stop offset="0" stop-color="#ffe9b0" stop-opacity="0.28"/><stop offset="1" stop-color="#2a1608" stop-opacity="0.38"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect y="${WALL_H - 3}" width="100%" height="6" fill="#3a2418" opacity="0.8"/></svg>`;
  layers.push({ input: Buffer.from(light), left: ox, top: wallTop });

  // standing things, y-sorted by baseline
  const half = async (f, w1x) => { // load a 2x asset, scale to desired 1x width
    const buf = fs.readFileSync(f);
    const m = await sharp(buf).metadata();
    const w = w1x || Math.round(m.width / 2);
    const out = await sharp(buf).resize({ width: w, kernel: 'lanczos3' }).toBuffer({ resolveWithObject: true });
    return { buf: out.data, w: out.info.width, h: out.info.height };
  };
  const items = [
    { id: 'rug_red', x: 6.0, y: 3.9, floorDecal: true },
    { id: 'bookshelf', x: 1.1, y: 1.15 },
    { id: 'sofa', x: 4.1, y: 1.25 },
    { id: 'door_closed', x: 6.05, y: 1.05 },
    { id: 'nightstand', x: 7.3, y: 1.2 },
    { id: 'bed_double', x: 9.4, y: 3.45 },
    { id: 'wardrobe', x: 11.25, y: 1.2 },
    { id: 'armchair', x: 1.9, y: 3.4 },
    { id: 'table_cloth', x: 6.0, y: 4.35 },
    { id: 'chest_wood', x: 10.8, y: 5.75 },
    { id: 'plant_large', x: 0.7, y: 5.6 },
    { id: 'painting_framed', x: 4.1, y: 0, wallZ: 1.0, wall: true },
    { id: 'pip', file: path.join(T, 'characters', 'pip_S.png'), charH: 76, x: 8.2, y: 5.0, shadow: true },
    { id: 'gus', file: path.join(T, 'characters', 'gus_SE.png'), charH: 94, x: 3.4, y: 2.7, shadow: true },
  ];
  const draw = [];
  for (const it of items) {
    let a;
    if (it.charH) {
      const buf = fs.readFileSync(it.file); const m = await sharp(buf).metadata();
      const w = Math.round(m.width * it.charH / m.height);
      const out = await sharp(buf).resize({ width: w, height: it.charH, kernel: 'lanczos3' }).toBuffer({ resolveWithObject: true });
      a = { buf: out.data, w: out.info.width, h: out.info.height };
    } else a = await half(OUT('props', it.id + '.png'));
    let left = sx(it.x) - Math.round(a.w / 2), top, order;
    if (it.wall) { top = wallTop + 8; order = -1; }
    else { top = sy(it.y) - a.h; order = it.floorDecal ? -2 : it.y; }
    draw.push({ it, a, left, top, order });
  }
  draw.sort((p, q) => p.order - q.order);
  for (const d of draw) {
    if (!d.it.floorDecal && !d.it.wall) {
      const rx = Math.round(d.a.w * (d.it.shadow ? 0.38 : 0.42)), ry = Math.round(rxFor(rx));
      const sh = `<svg xmlns="http://www.w3.org/2000/svg" width="${rx * 2 + 8}" height="${ry * 2 + 8}"><ellipse cx="${rx + 4}" cy="${ry + 4}" rx="${rx}" ry="${ry}" fill="#1a0c04" opacity="0.30"/></svg>`;
      layers.push({ input: Buffer.from(sh), left: d.left + Math.round(d.a.w / 2) - rx - 4, top: d.top + d.a.h - ry - 6 });
    }
    layers.push({ input: d.a.buf, left: d.left, top: d.top });
  }
  const outFile = OUT('composite_test_room.png');
  await sharp({ create: { width: W, height: H, channels: 4, background: '#1b2540' } }).composite(layers).png(PNG).toFile(outFile);

  // side by side with mockup 04
  const mock = path.join(__dirname, '..', '..', 'mockups', '04-inspect-painting-key.png');
  const L = await sharp(mock).resize(W, H).toBuffer();
  const R = await sharp(outFile).toBuffer();
  await sharp({ create: { width: W * 2 + 8, height: H, channels: 3, background: '#000' } })
    .composite([{ input: L, left: 0, top: 0 }, { input: R, left: W + 8, top: 0 }]).jpeg({ quality: 82 }).toFile(OUT('compare_mockup04_vs_composite.jpg'));
  console.log('composite done');
}
function rxFor(rx) { return rx * 0.28; }

main().catch(e => { console.error(e); process.exit(1); });
