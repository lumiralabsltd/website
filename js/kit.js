/* Shared three.js pieces: renderer, studio lighting environment, the LL mark, and a loop that only
   runs scenes while they are on screen. */
import * as THREE from 'three';
export { THREE };

export const BLUE = 0x1f3dff;
export const INK = 0x101216;
export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const small = () => window.innerWidth <= 760;

export function webglOK() {
  if (/[?&]nogl=1/.test(location.search)) return false;   // lets the static fallback be checked in any browser
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

export function makeRenderer(canvas, { shadows = false, alpha = true } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance' });
  r.setPixelRatio(1);   // fit() sets the real ratio from the element's size
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NoToneMapping;
  if (shadows) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap; }
  return r;
}

/* Resolution is the main cost. Each canvas gets a pixel budget, so a full-screen scene on a retina
   display renders at about 1.5× and small ones stay at 2×. `quality.scale` is lowered by the loop
   below when a device can't hold the frame rate. */
const BUDGET = 3.0e6;
export const quality = { scale: 1 };
export const activity = { hero: 0 };   // when the hero last had something moving, so other work can wait for a quiet moment
export function pixelRatioFor(w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pr = Math.min(dpr, Math.sqrt(BUDGET / Math.max(1, w * h))) * quality.scale;
  return Math.round(clamp(pr, Math.min(0.8, dpr), dpr) * 100) / 100;
}

/* Keep the drawing buffer the size of the element. Returns true when it changed. */
export function fit(renderer, el) {
  const w = Math.max(1, Math.round(el.clientWidth)), h = Math.max(1, Math.round(el.clientHeight));
  const c = renderer.domElement, pr = pixelRatioFor(w, h);
  if (renderer.getPixelRatio() === pr && c.width === Math.floor(w * pr) && c.height === Math.floor(h * pr)) return false;
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  return true;
}

/* A photo studio for chrome to reflect, painted as a 360° panorama: bright sky, a hard dark horizon,
   softboxes with black flags between them, and one blue card low down. Flat chrome faces only read as
   chrome when sharp edges like these slide across them as the object turns. */
export function studioEnv(renderer, scale = 1) {
  const W = 2048 * scale, H = 1024 * scale;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H * 0.5);
  sky.addColorStop(0, '#ffffff'); sky.addColorStop(0.55, '#e4e6ea'); sky.addColorStop(1, '#b3b7c0');
  g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.5);
  const floor = g.createLinearGradient(0, H * 0.5, 0, H);
  floor.addColorStop(0, '#050608'); floor.addColorStop(0.07, '#0b0c10'); floor.addColorStop(0.3, '#2b2e35'); floor.addColorStop(1, '#6c7079');
  g.fillStyle = floor; g.fillRect(0, H * 0.5, W, H * 0.5);
  const box = (u0, u1, v0, v1, col) => { g.fillStyle = col; g.fillRect(u0 * W, v0 * H, (u1 - u0) * W, (v1 - v0) * H); };
  // black flags: tall dark bars that cut the sky into panels
  [[0.03, 0.05], [0.14, 0.155], [0.27, 0.3], [0.405, 0.42], [0.49, 0.535], [0.6, 0.612], [0.665, 0.7], [0.775, 0.79], [0.86, 0.9], [0.955, 0.965]]
    .forEach(([a, b]) => box(a, b, 0.1, 0.5, '#08090c'));
  // softboxes: pure white, brighter than the sky around them
  [[0.06, 0.13, 0.14, 0.47], [0.31, 0.4, 0.06, 0.44], [0.54, 0.595, 0.16, 0.48], [0.705, 0.77, 0.04, 0.46], [0.905, 0.95, 0.2, 0.47]]
    .forEach(([a, b, v0, v1]) => box(a, b, v0, v1, '#ffffff'));
  // blue cards, on the floor side so they show up in downward-facing bevels and the lower half of a face
  box(0.56, 0.69, 0.56, 0.74, '#1F3DFF'); box(0.2, 0.26, 0.6, 0.72, '#1F3DFF'); box(0.8, 0.84, 0.3, 0.5, '#2d4bff');
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  pm.dispose(); tex.dispose();
  return env;
}

/* The LL mark from the logo path, 116 × 96 units, centred. Returns a group with `left` and `right` meshes. */
export function buildMark({ depth = 24, bevel = 3.6, chrome = null, tint = null } = {}) {
  const shape = (pts) => { const s = new THREE.Shape(); pts.forEach((q, i) => (i ? s.lineTo(q[0], q[1]) : s.moveTo(q[0], q[1]))); s.closePath(); return s; };
  const L1 = shape([[-58, 48], [-34, 48], [-34, -24], [14, -24], [14, -48], [-58, -48]]);
  const L2 = shape([[58, -48], [34, -48], [34, 24], [-14, 24], [-14, 48], [58, 48]]);
  const opt = { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 10, curveSegments: 2 };
  const g1 = new THREE.ExtrudeGeometry(L1, opt).translate(0, 0, -depth / 2);
  const g2 = new THREE.ExtrudeGeometry(L2, opt).translate(0, 0, -depth / 2);
  const mA = chrome || new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.035, envMapIntensity: 1.05 });
  const mB = tint || new THREE.MeshPhysicalMaterial({ color: 0x3350ff, metalness: 1, roughness: 0.06, envMapIntensity: 1.35 });
  const g = new THREE.Group();
  g.left = new THREE.Mesh(g1, mA); g.right = new THREE.Mesh(g2, mB);
  g.add(g.left, g.right);
  return g;
}

/* One requestAnimationFrame for every scene; each scene only ticks while its element is near the viewport. */
const tasks = new Set();
let queued = false, last = 0, slow = 0, tick = 0;
function frame(t) {
  queued = false;
  const raw = t - last;
  const dt = Math.min(0.05, Math.max(0.001, raw / 1000)); last = t;
  // Sustained frames slower than about 40 a second: render fewer pixels. Gaps over 100ms are a
  // hidden or throttled tab, not a slow device, so they don't count.
  if (raw > 25 && raw < 100) slow += 1; else if (raw <= 20) slow = Math.max(0, slow - 1);
  if (slow > 36 && quality.scale > 0.5) { quality.scale = Math.max(0.5, quality.scale * 0.8); slow = -90; }
  // Two large canvases drawing in the same frame is what drops frames mid-scroll. The scene with
  // the most pixels on screen runs every frame; any other visible scene runs every third.
  let any = false, lead = null;
  tasks.forEach((k) => { if (k.visible && !k.paused && (!lead || k.area > lead.area)) lead = k; });
  tick += 1;
  tasks.forEach((k) => {
    if (!k.visible || k.paused) return;
    any = true; k.acc += dt;
    if (k !== lead && tick % 3 !== 0) return;
    const d = Math.min(0.05, k.acc); k.acc = 0;
    try { k.fn(d, t / 1000); } catch (e) { console.error(e); k.paused = true; }
  });
  if (any) kick();
}
function kick() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
export function addLoop(el, fn, { margin = '160px' } = {}) {
  const k = { fn, visible: false, paused: false, area: 0, acc: 0 };
  tasks.add(k);
  new IntersectionObserver((es) => {
    const e = es[es.length - 1];
    const was = k.visible;
    k.visible = e.isIntersecting;
    k.area = e.intersectionRect.width * e.intersectionRect.height;
    if (k.visible && !was) { k.acc = 0; last = performance.now(); kick(); }
  }, { rootMargin: margin, threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] }).observe(el);
  k.wake = () => { last = performance.now(); kick(); };
  return k;
}

export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
export function fontsReady(ms = 2500) {
  const want = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('900 40px Archivo', 'LUMIRA'), document.fonts.load('500 16px "JetBrains Mono"', 'LL-0001')]).then(() => document.fonts.ready)
    : Promise.resolve();
  return Promise.race([want, new Promise((r) => setTimeout(r, ms))]);
}
