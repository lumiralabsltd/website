/* Hero scene: the chrome LL mark and two founder passes on elastic lanyards.
   Physics lives in lanyard.js; this file draws it and connects the pointer. World units are CSS pixels. */
import { THREE, BLUE, reduced, small, webglOK, makeRenderer, studioEnv, buildMark, addLoop, ease, clamp, lerp, loadImage, fontsReady } from './kit.js';
import { Badge, jostle } from './lanyard.js';

const root = document.documentElement;
const hero = document.querySelector('.hero');
const canvas = document.getElementById('hero-gl');
const stageEl = hero.querySelector('.hero-stage');
const dbg = /[?&]dbg=1/.test(location.search);
const wantIntro = root.classList.contains('is-intro');

const FOUNDERS = [
  { id: 'su', first: 'SUKHPINDER', last: 'UBHI', no: 'LL-0001', img: 'assets/founder-su.webp', focus: [0.54, 0.4] },
  { id: 'ne', first: 'NIKOLAOS', last: 'EFTHYMIOPOULOS', no: 'LL-0002', img: 'assets/founder-ne.webp', focus: [0.55, 0.4] },
];
const FOV = 28, FLICK = 1450, POP = 2.3, RESPAWN = 1.9;

function endIntro() {
  root.classList.remove('is-intro');
  try { sessionStorage.setItem('ll-intro', '1'); } catch (e) { /* private mode */ }
}

if (!webglOK()) endIntro();
else init().catch((e) => { console.error(e); endIntro(); canvas.style.display = 'none'; root.classList.remove('gl'); });

/* ───────────── drawing the printed parts ───────────── */

const INK = '#101216', BLUE_CSS = '#1F3DFF', CARD = '#FBFBF8';

function condensed(g) {
  // Archivo's narrow width: use the canvas property where it works, otherwise squeeze the glyphs.
  if (condensed.k !== undefined) return condensed.k;
  g.save(); g.font = '900 100px Archivo, sans-serif';
  const a = g.measureText('LUMIRA').width; let k = 0.62;
  if ('fontStretch' in g) { g.fontStretch = 'extra-condensed'; if (g.measureText('LUMIRA').width < a * 0.85) k = 1; }
  g.restore();
  return (condensed.k = k);
}
function disp(g, text, x, y, size, { weight = 900, maxW = 0, align = 'left', color = INK, track = 0 } = {}) {
  g.save();
  g.font = `${weight} ${size}px Archivo, "Arial Narrow", sans-serif`;
  let k = condensed(g);
  if (k === 1) g.fontStretch = 'extra-condensed';
  if (track && 'letterSpacing' in g) g.letterSpacing = track + 'px';
  let w = g.measureText(text).width * k;
  if (maxW && w > maxW) { k *= maxW / w; w = maxW; }
  g.fillStyle = color; g.textBaseline = 'alphabetic';
  g.translate(align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y);
  g.scale(k, 1); g.fillText(text, 0, 0); g.restore();
  return w;
}
function mono(g, text, x, y, size, { color = INK, align = 'left', weight = 500, track = 0.6 } = {}) {
  g.save();
  g.font = `${weight} ${size}px "JetBrains Mono", ui-monospace, Menlo, monospace`;
  if ('letterSpacing' in g) g.letterSpacing = track + 'px';
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(text, x, y); g.restore();
}
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function drawMark(g, cx, cy, height, colL, colR) {
  const k = height / 96;
  const poly = (pts, col) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(cx + p[0] * k, cy + p[1] * k) : g.moveTo(cx + p[0] * k, cy + p[1] * k))); g.closePath(); g.fillStyle = col; g.fill(); };
  poly([[-58, -48], [-34, -48], [-34, 24], [14, 24], [14, 48], [-58, 48]], colL);
  poly([[58, 48], [34, 48], [34, -24], [-14, -24], [-14, -48], [58, -48]], colR);
}
function sheet(K) {
  const c = document.createElement('canvas'); c.width = 600 * K; c.height = 900 * K;
  const g = c.getContext('2d'); g.scale(K, K);
  return [c, g];
}

function drawFront(f, img, K) {
  const [c, g] = sheet(K);
  g.fillStyle = CARD; g.fillRect(0, 0, 600, 900);
  // slot for the clip
  g.fillStyle = '#17191D'; rrect(g, 236, 26, 128, 24, 12); g.fill();
  // header
  drawMark(g, 62, 100, 34, INK, BLUE_CSS);
  disp(g, 'LUMIRA LABS', 96, 113, 37, { weight: 800 });
  mono(g, 'STUDIO PASS', 560, 111, 15.5, { align: 'right', color: '#5B5F67' });
  g.fillStyle = 'rgba(16,18,22,.16)'; g.fillRect(40, 136, 520, 1.5);
  // portrait, cropped around the face
  const px = 40, py = 158, pw = 520, ph = 420;
  g.save(); rrect(g, px, py, pw, ph, 8); g.clip();
  const sc = Math.max(pw / img.width, ph / img.height) * 1.08, dw = img.width * sc, dh = img.height * sc;
  const dx = clamp(px + pw / 2 - f.focus[0] * dw, px + pw - dw, px), dy = clamp(py + ph * 0.46 - f.focus[1] * dh, py + ph - dh, py);
  g.drawImage(img, dx, dy, dw, dh);
  g.restore();
  // role tag, set into the corner of the portrait
  g.fillStyle = BLUE_CSS; g.fillRect(px, py + ph - 46, 196, 46);
  mono(g, 'CO-FOUNDER', px + 98, py + ph - 16, 18, { align: 'center', color: '#fff', track: 1.4 });
  // name
  const size = f.last.length > 11 ? 92 : 110;
  disp(g, f.first, 38, 578 + size * 0.86 + 14, size, { maxW: 522 });
  disp(g, f.last, 38, 578 + size * 1.72 + 12, size, { maxW: 522 });
  // details
  g.fillStyle = 'rgba(16,18,22,.16)'; g.fillRect(40, 806, 520, 1.5);
  const col = (label, value, x) => { mono(g, label, x, 832, 12.5, { color: '#7A7E86' }); mono(g, value, x, 856, 17, { weight: 500 }); };
  col('ID', f.no, 40); col('ISSUED', '07.04.26', 172); col('ACCESS', 'ALL AREAS', 304);
  // barcode
  let bx = 452, seed = f.no.charCodeAt(6) * 131 + 17;
  g.fillStyle = INK;
  while (bx < 558) { seed = (seed * 16807) % 2147483647; const w = 1.5 + (seed % 4) * 1.5; g.fillRect(bx, 820, w, 38); seed = (seed * 16807) % 2147483647; bx += w + 2 + (seed % 3) * 1.5; }
  g.fillStyle = BLUE_CSS; g.fillRect(0, 880, 600, 20);
  return c;
}

function drawBack(f, K) {
  const [c, g] = sheet(K);
  g.fillStyle = INK; g.fillRect(0, 0, 600, 900);
  g.fillStyle = '#17191D'; rrect(g, 236, 26, 128, 24, 12); g.fill();
  g.fillStyle = '#050608'; g.fillRect(0, 96, 600, 92);
  drawMark(g, 300, 430, 250, '#F5F4F0', BLUE_CSS);
  mono(g, f.no, 40, 250, 16, { color: 'rgba(245,244,240,.7)' });
  mono(g, 'NOT TRANSFERABLE', 560, 250, 16, { color: 'rgba(245,244,240,.7)', align: 'right' });
  g.fillStyle = 'rgba(245,244,240,.2)'; g.fillRect(40, 690, 520, 1.5);
  mono(g, 'LUMIRA LABS LTD · LONDON', 40, 730, 17, { color: '#F5F4F0' });
  mono(g, 'COMPANY NO. 17138788', 40, 760, 17, { color: 'rgba(245,244,240,.7)' });
  mono(g, 'IF FOUND: TEAM@LUMIRALABS.CO.UK', 40, 790, 17, { color: 'rgba(245,244,240,.7)' });
  g.fillStyle = BLUE_CSS; g.fillRect(0, 880, 600, 20);
  return c;
}

function drawStrap() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = BLUE_CSS; g.fillRect(0, 0, 128, 1024);
  // woven edge and a faint weave
  const e = g.createLinearGradient(0, 0, 128, 0);
  e.addColorStop(0, 'rgba(0,0,40,.42)'); e.addColorStop(0.09, 'rgba(0,0,40,0)'); e.addColorStop(0.91, 'rgba(0,0,40,0)'); e.addColorStop(1, 'rgba(0,0,40,.42)');
  g.fillStyle = e; g.fillRect(0, 0, 128, 1024);
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < 1024; y += 4) g.fillRect(0, y, 128, 1.4);
  for (let i = 0; i < 2; i++) {
    g.save(); g.translate(64, 512 * i + 256); g.rotate(-Math.PI / 2);
    const w = disp(g, 'LUMIRA LABS', 0, 21, 62, { weight: 800, color: '#fff', align: 'center', track: 2 });
    drawMark(g, -w / 2 - 44, 0, 38, '#fff', '#0B1466');
    g.restore();
  }
  return c;
}

/* ───────────── scene ───────────── */

async function init() {
  const renderer = makeRenderer(canvas, { shadows: true });
  root.classList.add('gl');
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 20, 8000);
  const tanF = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d6cc, 1.5));
  // shading comes from an oblique light; the shadow comes from a near head-on one, so it sits close under each object
  const shade = new THREE.DirectionalLight(0xffffff, 2.1);
  shade.position.set(-700, 900, 1300); scene.add(shade);
  const key = new THREE.DirectionalLight(0xffffff, 0.02);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.radius = 9; key.shadow.blurSamples = 22; key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: 0x0a0c14, opacity: 0.2 }));
  floor.receiveShadow = true; floor.position.z = -130;
  scene.add(floor);

  const mark = buildMark({ depth: 26 });
  mark.left.castShadow = mark.right.castShadow = true;
  scene.add(mark);

  /* printed textures */
  const K = small() ? 1.5 : 2;
  const [imgs] = await Promise.all([Promise.all(FOUNDERS.map((f) => loadImage(f.img))), fontsReady()]);
  const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const strapTex = tex(drawStrap()); strapTex.wrapT = THREE.RepeatWrapping;
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f8, metalness: 1, roughness: 0.16, envMapIntensity: 1.1 });
  const strapMat = new THREE.MeshStandardMaterial({ map: strapTex, roughness: 0.82, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.5 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf1f0ea, roughness: 0.5, envMapIntensity: 0.6 });

  let W = 1, H = 1, camZ = 1, L = null;
  const sims = [], views = [];

  function measure() {
    W = hero.clientWidth; H = hero.clientHeight;
    const sx = stageEl.offsetLeft, sy = stageEl.offsetTop, sw = stageEl.offsetWidth, sh = stageEl.offsetHeight;
    const X = (px) => px - W / 2, Y = (py) => H / 2 - py;
    const m = small();
    const cw = m ? clamp(sw * 0.38, 116, 168) : clamp(sw * 0.212, 132, 204), ch = cw * 1.5;
    const top = H / 2 + 60;                                   // straps are fixed just above the hero
    const b = m
      ? [{ x: X(sx + sw * 0.27), cy: Y(sy + sh * 0.5) }, { x: X(sx + sw * 0.73), cy: Y(sy + sh * 0.59) }]
      : [{ x: X(sx + sw * 0.565), cy: Y(sy + sh * 0.46) }, { x: X(sx + sw * 0.81), cy: Y(sy + sh * 0.58) }];
    const markW = m ? sw * 0.34 : Math.min(sw * 0.4, sh * 0.6);
    const vh = Math.min(window.innerHeight, H);
    return {
      cw, ch, top, b, m,
      mark: m ? { x: X(sx + sw * 0.5), y: Y(sy + sh * 0.3), s: markW / 116 } : { x: X(sx + sw * 0.22), y: Y(sy + sh * 0.5), s: markW / 116 },
      intro: { x: 0, y: H / 2 - vh / 2, s: Math.min(W * 0.4, vh * 0.42) / 116 },
    };
  }

  function buildBadges() {
    views.splice(0).forEach((v) => { scene.remove(v.card, v.strap); v.dispose(); });
    sims.length = 0;
    FOUNDERS.forEach((f, i) => {
      const cs = L.cw / 190, clipUp = 34 * cs;
      const len = L.top - (L.b[i].cy + L.ch / 2 + clipUp);
      const sim = new Badge({ w: L.cw, h: L.ch, ax: L.b[i].x, ay: L.top, len, z: i * 22 });
      sim.founder = f; sims.push(sim);
      views.push(makeView(sim, i));
    });
  }

  function makeView(sim, i) {
    const { w, h } = sim, cs = sim.s, t = 3.4 * cs, r = w * 0.062;
    const shape = new THREE.Shape();
    const x0 = -w / 2, y0 = -h / 2;
    shape.moveTo(x0 + r, y0); shape.lineTo(x0 + w - r, y0); shape.absarc(x0 + w - r, y0 + r, r, -Math.PI / 2, 0);
    shape.lineTo(x0 + w, y0 + h - r); shape.absarc(x0 + w - r, y0 + h - r, r, 0, Math.PI / 2);
    shape.lineTo(x0 + r, y0 + h); shape.absarc(x0 + r, y0 + h - r, r, Math.PI / 2, Math.PI);
    shape.lineTo(x0, y0 + r); shape.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5);
    const card = new THREE.Group(); card.matrixAutoUpdate = false;
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: true, bevelThickness: 0.7 * cs, bevelSize: 0.7 * cs, bevelOffset: -0.7 * cs, bevelSegments: 2, curveSegments: 8 }).translate(0, 0, -t / 2);
    const body = new THREE.Mesh(bodyGeo, edgeMat); body.castShadow = true;
    const faceGeo = new THREE.ShapeGeometry(shape, 8);
    const uv = faceGeo.attributes.uv, pos = faceGeo.attributes.position;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (pos.getX(k) + w / 2) / w, (pos.getY(k) + h / 2) / h);
    const fT = tex(drawFront(sim.founder, imgs[i], K)), bT = tex(drawBack(sim.founder, K));
    const lam = { roughness: 0.46, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.62 };
    const fM = new THREE.MeshPhysicalMaterial({ map: fT, ...lam }), bM = new THREE.MeshPhysicalMaterial({ map: bT, ...lam });
    const front = new THREE.Mesh(faceGeo, fM); front.position.z = t / 2 + 0.8 * cs; front.scale.setScalar(0.994);
    const back = new THREE.Mesh(faceGeo, bM); back.rotation.y = Math.PI; back.position.z = -(t / 2 + 0.8 * cs); back.scale.setScalar(0.994);
    // clip hardware: jaw on the card, a ring, and the crimp the strap is sewn into
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(40 * cs, 22 * cs, 9 * cs, 1, 1, 1), chrome); jaw.position.set(0, h / 2 - 4 * cs, 0); jaw.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8.5 * cs, 1.7 * cs, 10, 28), chrome); ring.position.set(0, h / 2 + 15 * cs, 0);
    const crimp = new THREE.Mesh(new THREE.BoxGeometry(24 * cs, 12 * cs, 5 * cs), chrome); crimp.position.set(0, h / 2 + 29 * cs, 0); crimp.castShadow = true;
    card.add(body, front, back, jaw, ring, crimp);

    const SEG = 44, sw = (small() ? 15 : 19) * cs;
    const geo = new THREE.BufferGeometry();
    const P = new Float32Array((SEG + 1) * 6), UV = new Float32Array((SEG + 1) * 4), idx = [];
    for (let k = 0; k < SEG; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    const strap = new THREE.Mesh(geo, strapMat); strap.castShadow = true; strap.frustumCulled = false;
    const pts = Array.from({ length: sim.C + 1 }, () => new THREE.Vector3());
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    scene.add(card, strap);

    const fr = {}, p = new THREE.Vector3(), tg = new THREE.Vector3(), wd = new THREE.Vector3(), last = new THREE.Vector3(1, 0, 0), cx = new THREE.Vector3();
    const tile = sw * 8;   // strap art is 1:8
    return {
      card, strap, body, sim,
      sync() {
        const vis = sim.state !== 'gone';
        card.visible = strap.visible = vis;
        if (!vis) return;
        sim.frame(fr);
        card.matrix.set(fr.Xx, fr.Yx, fr.Zx, fr.x, fr.Xy, fr.Yy, fr.Zy, fr.y, fr.Xz, fr.Yz, fr.Zz, fr.z, 0, 0, 0, 1);
        card.matrixWorldNeedsUpdate = true;
        for (let k = 0; k <= sim.C; k++) pts[k].set(sim.x[k], sim.y[k], sim.z[k]);
        // the last point is the crimp on the card, so the strap always meets its hardware
        pts[sim.C].set(fr.x + fr.Yx * (h / 2 + 33 * cs), fr.y + fr.Yy * (h / 2 + 33 * cs), fr.z + fr.Yz * (h / 2 + 33 * cs));
        cx.set(fr.Xx, fr.Xy, fr.Xz);
        let run = 0; const prev = p.clone();
        for (let k = 0; k <= SEG; k++) {
          const u = k / SEG;
          curve.getPoint(u, p); curve.getTangent(u, tg);
          wd.set(-tg.y, tg.x, 0);                         // ẑ × tangent: flat to the viewer
          if (wd.lengthSq() < 1e-6) wd.copy(last); else wd.normalize();
          if (wd.dot(last) < 0 && k > 0) wd.negate();
          const mix = THREE.MathUtils.smoothstep(u, 0.62, 1);
          if (mix > 0) { if (wd.dot(cx) < 0) cx.negate(); wd.lerp(cx, mix).normalize(); }
          last.copy(wd);
          if (k) run += p.distanceTo(prev); prev.copy(p);
          const a = k * 6, b = k * 4, hw = sw / 2;
          P[a] = p.x - wd.x * hw; P[a + 1] = p.y - wd.y * hw; P[a + 2] = p.z - wd.z * hw;
          P[a + 3] = p.x + wd.x * hw; P[a + 4] = p.y + wd.y * hw; P[a + 5] = p.z + wd.z * hw;
          UV[b] = 0; UV[b + 1] = -run / tile; UV[b + 2] = 1; UV[b + 3] = -run / tile;   // canvas rows run downwards, like the strap
        }
        last.set(1, 0, 0);
        geo.attributes.position.needsUpdate = true; geo.attributes.uv.needsUpdate = true;
        geo.computeVertexNormals();
      },
      dispose() { bodyGeo.dispose(); faceGeo.dispose(); geo.dispose(); fT.dispose(); bT.dispose(); fM.dispose(); bM.dispose(); },
    };
  }

  function resize(force) {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!force && w === W && h === H) return;
    const prev = L;
    L = measure();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    camZ = H / 2 / tanF;
    camera.aspect = W / H; camera.position.set(0, 0, camZ); camera.updateProjectionMatrix();
    key.position.set(-190, 400, 1500); key.target.position.set(0, 0, 0);
    const sc = key.shadow.camera, R = Math.hypot(W, H) / 2 + 240;
    sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 100; sc.far = 4200; sc.updateProjectionMatrix();
    floor.scale.set(W * 2.4, H * 2.4, 1); floor.position.z = L.m ? -46 : -98;
    if (!prev || Math.abs(prev.cw - L.cw) > 0.5 || prev.m !== L.m) {
      buildBadges();
      if (started) sims.forEach((s) => s.hang());
    } else {
      sims.forEach((s, i) => {
        const len = L.top - (L.b[i].cy + L.ch / 2 + s.clipUp);
        s.setAnchor(L.b[i].x, L.top, len);
      });
    }
  }

  /* ───────────── pointer ───────────── */

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), inv = new THREE.Matrix4(), hitP = new THREE.Vector3();
  const ptr = { x: 0.5, y: 0.5, id: null, grab: -1, moved: 0, t0: 0, sx: 0, sy: 0 };

  function toNdc(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1));
    return r;
  }
  function worldAt(cx, cy, z) {
    toNdc(cx, cy);
    const d = camZ - z;
    return [ndc.x * d * tanF * camera.aspect, ndc.y * d * tanF];
  }
  function hit(cx, cy) {
    if (!sims.length) return null;
    const r = toNdc(cx, cy);
    if (cy < r.top || cy > r.bottom) return null;
    ray.setFromCamera(ndc, camera);
    const live = views.filter((v) => v.sim.state !== 'gone');
    const found = ray.intersectObjects(live.map((v) => v.body), false)[0];
    if (!found) return null;
    const i = views.findIndex((v) => v.body === found.object), s = sims[i];
    inv.copy(views[i].card.matrix).invert(); hitP.copy(found.point).applyMatrix4(inv);
    return { i, u: clamp(hitP.x / s.w + 0.5, 0.04, 0.96), v: clamp(hitP.y / s.h + 0.5, 0.04, 0.96) };
  }
  const bioOpen = () => { const b = document.getElementById('bio'); return !!(b && b.open); };
  const swallow = (e) => { e.preventDefault(); e.stopPropagation(); };

  window.addEventListener('pointermove', (e) => {
    ptr.x = e.clientX / window.innerWidth; ptr.y = e.clientY / window.innerHeight;
    if (ptr.grab >= 0 && e.pointerId === ptr.id) {
      const s = sims[ptr.grab], [wx, wy] = worldAt(e.clientX, e.clientY, s.zL);
      s.drag(wx, wy);
      ptr.moved = Math.max(ptr.moved, Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy));
      loop.wake();
    } else if (e.pointerType === 'mouse' && !bioOpen()) {
      const h = hit(e.clientX, e.clientY);
      canvas.style.pointerEvents = h ? 'auto' : 'none';
      canvas.classList.toggle('grab', !!h);
    }
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || ptr.grab >= 0 || bioOpen() || !started) return;
    const h = hit(e.clientX, e.clientY);
    if (!h) return;
    e.preventDefault();
    const s = sims[h.i], [wx, wy] = worldAt(e.clientX, e.clientY, s.zL);
    s.grab(h.u, h.v, wx, wy);
    Object.assign(ptr, { id: e.pointerId, grab: h.i, moved: 0, t0: performance.now(), sx: e.clientX, sy: e.clientY });
    canvas.classList.add('grabbing');
    window.addEventListener('click', swallow, { capture: true, once: true });
    loop.wake();
  }, { capture: true });

  function up(e) {
    if (ptr.grab < 0 || (e.pointerId !== undefined && e.pointerId !== ptr.id)) return;
    const i = ptr.grab, s = sims[i];
    const speed = s.release();
    const click = ptr.moved < 7 && performance.now() - ptr.t0 < 320;
    ptr.grab = -1; canvas.classList.remove('grabbing');
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 60);
    if (click && !s.free) { s.nudge(0, 0, 420 * s.s); if (window.LL) window.LL.openBio(s.founder.id); }
    else if (!s.free && speed > FLICK * s.s) s.detach();
  }
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);
  // a finger that lands on a pass drags the pass, not the page
  window.addEventListener('touchstart', (e) => { if (ptr.grab >= 0 && e.cancelable) e.preventDefault(); }, { passive: false, capture: true });
  window.addEventListener('touchmove', (e) => { if (ptr.grab >= 0 && e.cancelable) e.preventDefault(); }, { passive: false, capture: true });

  /* ───────────── timeline ───────────── */

  let started = false, t0 = 0, lastScroll = window.scrollY, introDone = !wantIntro;
  const drops = [];            // [time, index]
  const respawn = [0, 0];
  const mrot = { x: -0.16, y: 0.44, vx: 0, vy: 0 };
  let seed = 20260407; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  resize(true);
  new ResizeObserver(() => resize(false)).observe(hero);
  window.addEventListener('ll:fonts', () => resize(true));

  function begin(t) {
    started = true; t0 = t;
    if (reduced) { sims.forEach((s) => s.hang()); endIntro(); return; }
    const d = wantIntro ? 1.7 : 0.3;
    drops.push([d, 0], [d + 0.26, 1]);
  }

  function placeMark(t) {
    const R = L.mark, I = L.intro;
    let x = R.x, y = R.y, s = R.s, open = 0, wig = 0, turn = 0;
    mark.visible = !(L.m && introDone);
    if (!mark.visible) return;
    if (wantIntro && !introDone) {
      const a = clamp(t / 0.82, 0, 1), g = ease.inOutCubic(clamp((t - 1.18) / 1.05, 0, 1));
      open = (1 - ease.outCubic(a)) * W * 0.75 / I.s;
      turn = (1 - ease.outCubic(a)) * 0.9;
      if (t > 0.8) wig = Math.sin((t - 0.8) * 34) * 0.085 * Math.exp(-(t - 0.8) * 8);
      x = lerp(I.x, R.x, g); y = lerp(I.y, R.y, g); s = lerp(I.s, L.m ? 0.001 : R.s, g);
      if (t > 1.1 && root.classList.contains('is-intro')) endIntro();
      if (t > 2.3) introDone = true;
    }
    // ease towards the pointer, with a slow idle turn underneath
    const tx = -0.16 + (ptr.y - 0.5) * 0.36 + Math.sin(t * 0.5) * 0.04, ty = 0.44 + (ptr.x - 0.5) * 0.7 + Math.sin(t * 0.37) * 0.1;
    mrot.vx += ((tx - mrot.x) * 26 - mrot.vx * 8) * 0.016; mrot.vy += ((ty - mrot.y) * 26 - mrot.vy * 8) * 0.016;
    mrot.x += mrot.vx * 0.016; mrot.y += mrot.vy * 0.016;
    const k = introDone ? 1 : ease.inOutCubic(clamp((t - 1.0) / 1.2, 0, 1));
    mark.position.set(x, y, -40);
    mark.scale.setScalar(s);
    mark.rotation.set(mrot.x * k, mrot.y * k + turn, wig);
    mark.left.position.x = -open; mark.right.position.x = open;
  }

  const c0 = {};
  const frame = (dt, now) => {
    if (!started) begin(now);
    const t = now - t0;
    while (drops.length && t >= drops[0][0]) { const d = drops.shift(); sims[d[1]].drop(rnd); }

    // the page moving under a hanging pass makes it sway
    const sy = window.scrollY, dy = sy - lastScroll; lastScroll = sy;
    if (dy && Math.abs(dy) < 400) sims.forEach((s, i) => { if (s.state === 'hang') s.nudge(clamp(dy * 1.3, -160, 160) * (i ? 1 : -1) * s.s, clamp(-dy * 7, -620, 620) * s.s); });

    for (let i = 0; i < sims.length; i++) {
      const s = sims[i];
      if (s.state === 'gone') { if (respawn[i] && t >= respawn[i]) { respawn[i] = 0; s.drop(rnd); } continue; }
      if (ptr.grab === i && !s.free && s.stretch() > POP) s.detach();
      s.step(dt);
      if (s.free && ptr.grab !== i) {
        s.centre(c0);
        if (c0.y < -H / 2 - s.h * 1.2 || Math.abs(c0.x) > W / 2 + s.w * 2.5 || c0.y > H / 2 + 2400 || s.freeAge > 6) { s.state = 'gone'; respawn[i] = t + RESPAWN; }
      }
    }
    if (sims.length === 2) jostle(sims[0], sims[1]);
    views.forEach((v) => v.sync());
    placeMark(t);
    renderer.render(scene, camera);
    if (dbg) window.__badges.frames++;
  };
  const loop = addLoop(hero, frame, { margin: '80px' });

  if (dbg) {
    window.__badges = {
      frames: 0, sims,
      info: () => sims.map((s) => { const c = s.centre(); return { state: s.state, x: Math.round(c.x), y: Math.round(c.y), speed: Math.round(s.speed()), stretch: +s.stretch().toFixed(2), facing: +s.frame({}).Zz.toFixed(2) }; }),
      layout: () => ({ W, H, L, introDone, started }),
      fling: (i, vx, vy) => { sims[i].nudge(vx, vy); if (Math.hypot(vx, vy) > FLICK * sims[i].s) sims[i].detach(); },
      // the preview pane throttles animation frames, so tests drive the clock themselves
      run: (sec) => { loop.paused = true; let now = (window.__badges.clock || 0); for (let k = 0; k < sec * 60; k++) { now += 1 / 60; frame(1 / 60, now); } window.__badges.clock = now; },
      ptr,
      settle: () => { loop.paused = true; if (!started) begin(0); drops.length = 0; sims.forEach((s) => s.hang()); introDone = true; endIntro(); frame(0.001, t0 + 50); },
      hit,
    };
  }
}
