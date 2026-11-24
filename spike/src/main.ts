import { Bot } from './bot';
import { Input } from './input';
import { Sim, STEP, type SimInput } from './sim/sim';
import { Camera, ZOOM_MAX, ZOOM_MIN } from './view/camera';
import { LOGICAL_H, LOGICAL_W, type Renderer } from './view/cmds';
import { MANIFEST } from './view/manifest';
import { makeProjection } from './view/projection';
import { Scene } from './view/scene';

const q = new URLSearchParams(location.search);
const rendererName = q.get('renderer') === 'canvas' ? 'canvas' : 'pixi';
let projName = q.get('proj') === 'topdown' ? 'topdown' : 'oblique';
const stress = q.get('stress') === '1';
const useSprites = q.get('sprites') === '1';
const botOn = q.get('bot') === '1';
const paused = q.get('pause') === '1';

const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const zoomKey = `sneakaboo.zoom.${coarse ? 'touch' : 'desktop'}`;

async function main() {
  const stage = document.getElementById('stage')!;
  const dbg = document.getElementById('debug')!;

  const renderer: Renderer = rendererName === 'canvas'
    ? new (await import('./view/canvasRenderer')).CanvasRenderer()
    : new (await import('./view/pixiRenderer')).PixiRenderer();
  await renderer.init(stage);

  const sim = new Sim(stress);
  const scene = new Scene(makeProjection(projName));
  const cam = new Camera();
  const bot = botOn ? new Bot(sim) : null;

  const savedZoom = parseFloat(localStorage.getItem(zoomKey) ?? '');
  const startZoom = q.has('zoom') ? parseFloat(q.get('zoom')!) : Number.isFinite(savedZoom) ? savedZoom : coarse ? 1.15 : 1.0;
  cam.setZoom(startZoom);
  const snap = () => cam.snap(sim.pip.x, sim.pip.y, sim.level.w, sim.level.h, scene.proj);
  snap();

  const setZoom = (z: number) => { cam.setZoom(z); if (!q.has('zoom')) localStorage.setItem(zoomKey, String(cam.zoomTarget)); };
  const setProj = (name: string) => {
    projName = name; scene.proj = makeProjection(name); scene.occ.clear();
    const u = new URL(location.href); u.searchParams.set('proj', name); history.replaceState(null, '', u);
    cam.clamp(sim.level.w, sim.level.h, scene.proj);
  };
  let debugOn = q.get('debug') === '1';
  const retry = () => { sim.reset(); scene.occ.clear(); snap(); };

  const input = new Input(renderer.canvas, {
    zoomBy: (f) => setZoom(cam.zoomTarget * f),
    getZoom: () => cam.zoomTarget,
    setZoom,
    button: (id) => { if (id === 'zoomIn') setZoom(cam.zoomTarget * 1.2); else if (id === 'zoomOut') setZoom(cam.zoomTarget / 1.2); else if (id === 'proj') setProj(projName === 'oblique' ? 'topdown' : 'oblique'); },
    retry,
    toggleDebug: () => { debugOn = !debugOn; },
    toggleProj: () => setProj(projName === 'oblique' ? 'topdown' : 'oblique'),
    isFound: () => sim.status === 'found',
  });

  // letterboxed 16:9 fit, devicePixelRatio capped at 2
  const layout = () => {
    const iw = window.innerWidth, ih = window.innerHeight;
    const w = Math.min(iw, (ih * LOGICAL_W) / LOGICAL_H), h = (w * LOGICAL_H) / LOGICAL_W;
    renderer.resize(Math.floor(w), Math.floor(h), Math.min(window.devicePixelRatio || 1, 2));
  };
  layout();
  window.addEventListener('resize', layout);

  const notes: string[] = [];
  if (useSprites) await loadSprites(renderer, scene, notes);

  // ---- loop
  let last = performance.now(), acc = 0;
  let lastIn: SimInput = { dx: 0, dy: 0, gait: 'walk' };
  let buildMs = 0, renderMs = 0;
  let fpsFrames = 0, fpsT = 0, fps = 0, workAvg = 0, workAcc = 0;
  const rec = { on: false, frame: [] as number[], work: [] as number[], build: [] as number[], render: [] as number[] };
  const API = {
    sim, cam, scene, renderer, rec,
    setZoom, setProj, snap, retry,
    teleport(x: number, y: number) { sim.pip.x = sim.pip.px = x; sim.pip.y = sim.pip.py = y; snap(); },
    startRecord() { rec.frame = []; rec.work = []; rec.build = []; rec.render = []; rec.on = true; },
    stopRecord() { rec.on = false; return { frame: rec.frame, work: rec.work, build: rec.build, render: rec.render }; },
    god() { sim.god = true; },
    step(n = 1) { for (let i = 0; i < n; i++) sim.step(lastIn); },
    paused,
  };
  (window as unknown as { __spike: typeof API }).__spike = API;

  const frame = (t: number) => {
    requestAnimationFrame(frame);
    const w0 = performance.now();
    const rawDt = (t - last) / 1000; last = t;
    const dt = Math.min(rawDt, 0.1);
    if (!API.paused) {
      acc += dt;
      lastIn = bot ? bot.read() : input.read();
      let n = 0;
      while (acc >= STEP && n++ < 6) { sim.step(bot ? bot.read() : input.read()); acc -= STEP; }
      if (n >= 6) acc = 0;
    }
    const pip = sim.pip, a = acc / STEP;
    const ix = pip.px + (pip.x - pip.px) * a, iy = pip.py + (pip.y - pip.py) * a;
    cam.update(dt, ix, iy, pip.moving ? lastIn.dx : 0, pip.moving ? lastIn.dy : 0, sim.level.w, sim.level.h, scene.proj);
    const b0 = performance.now();
    const fr = scene.build(sim, cam, a, dt, { joy: input.joy, touch: coarse || input.touchSeen, showHints: true }, t);
    const b1 = performance.now();
    renderer.render(fr);
    buildMs = b1 - b0; renderMs = performance.now() - b1;
    const work = performance.now() - w0;

    if (rec.on) { rec.frame.push(rawDt * 1000); rec.work.push(work); rec.build.push(buildMs); rec.render.push(renderMs); }
    fpsFrames++; fpsT += rawDt; workAcc += work;
    if (fpsT >= 0.5) { fps = fpsFrames / fpsT; workAvg = workAcc / fpsFrames; fpsFrames = 0; fpsT = 0; workAcc = 0; }
    dbg.style.display = debugOn ? 'block' : 'none';
    if (debugOn) {
      const st = renderer.stats(), ss = scene.lastStats;
      dbg.textContent =
        `FPS ${fps.toFixed(1)}  (${(1000 / Math.max(fps, 1)).toFixed(1)} ms)  work ${workAvg.toFixed(2)} ms (last: build ${buildMs.toFixed(2)} + render ${renderMs.toFixed(2)})\n` +
        `renderer ${renderer.name}   projection ${scene.proj.name}   stress ${stress ? 'on' : 'off'}\n` +
        `${renderer.name === 'pixi' ? `pixi: graphics-build ${(renderer as any).fillMs.toFixed(1)} ms + gl ${(renderer as any).glMs.toFixed(1)} ms\n` : ''}seekers ${sim.seekers.length}  props ${sim.level.props.length}  noise rings ${sim.noise.length}\n` +
        `standers ${ss.drawn}/${ss.standers}  cmds ${ss.cmds}  covered ${ss.covered}\n` +
        `draw calls ${st.drawCalls ?? 'n/a'} (${renderer.name === 'pixi' ? 'GL' : 'canvas fill/stroke ops'})\n` +
        `zoom ${cam.zoom.toFixed(2)}  dpr ${Math.min(devicePixelRatio, 2)}  sim t ${sim.time.toFixed(1)}\n` +
        notes.join('\n');
    }
  };
  requestAnimationFrame((t) => { last = t; frame(t); });
}

async function loadSprites(renderer: Renderer, scene: Scene, notes: string[]) {
  let files: string[] = [];
  try { files = await (await fetch('/art-list')).json(); } catch { /* none */ }
  if (!files.length) { notes.push('sprites=1: no art/p0-test/props/*.png found, using placeholders'); return; }
  const loaded: string[] = [];
  const ALIAS: Record<string, string[]> = { crate: ['crate', 'chest'], box: ['box', 'nightstand'], stool: ['stool', 'armchair'], pot: ['pot', 'plant'] };
  await Promise.all(Object.keys(MANIFEST).map(async (kind) => {
    const f = files.find((n) => (ALIAS[kind] ?? [kind]).some((k) => n.toLowerCase().includes(k)));
    if (!f) return;
    const img = new Image();
    img.src = `/art/p0-test/props/${encodeURIComponent(f)}`;
    try { await img.decode(); } catch { return; }
    renderer.addImage(kind, img);
    scene.spriteInfo.set(kind, { w: img.naturalWidth, h: img.naturalHeight });
    loaded.push(kind);
  }));
  notes.push(`sprites loaded: ${loaded.join(', ') || 'none'}`);
}

void ZOOM_MIN; void ZOOM_MAX;
main().catch((e) => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;position:fixed;top:0">${String(e)}</pre>`); });
