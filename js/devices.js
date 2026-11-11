/* Phones for the app sections. One realistic iPhone body, reused, each showing a real app screen.
   Units are millimetres, so the proportions are the real ones. */
import { THREE, reduced, makeRenderer, studioEnv, addLoop, fit, clamp, ease } from './kit.js';

const BW = 71.5, BH = 149.6, BR = 12, DEPTH = 7.6, BEV = 1.1;
const SW = 65.9, SH = 144, SR = 9.2;

const LAYOUT = {
  'dev-daysout': { frame: 192, tone: 'natural', island: false, wall: 0.2,
    phones: [{ p: [24, 2, 22], r: [-0.03, -0.4, 0.03], s: 1 }, { p: [-48, -17, -34], r: [-0.02, 0.38, -0.035], s: 0.95 }] },
  'dev-bhabhi': { frame: 214, tone: 'dark', island: true, wall: 0.26,
    phones: [{ p: [50, -20, 26], r: [0, -0.1, 0], s: 1 }, { p: [-30, -32, -24], r: [0, 0.52, -0.045], s: 0.95 }, { p: [124, -32, -28], r: [0, -0.56, 0.045], s: 0.95 }] },
};

function rounded(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
function face(w, h, r) {
  const g = new THREE.ShapeGeometry(rounded(w, h, r), 12), uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}

let parts = null;
function shared() {
  if (parts) return parts;
  const body = new THREE.ExtrudeGeometry(rounded(BW, BH, BR), { depth: DEPTH, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelOffset: -BEV, bevelSegments: 6, curveSegments: 14 }).translate(0, 0, -DEPTH / 2);
  parts = {
    body, glass: face(BW - BEV * 2, BH - BEV * 2, BR - BEV), screen: face(SW, SH, SR), island: face(19.6, 5.7, 2.85),
    button: new THREE.BoxGeometry(1.3, 1, 3.1),
    black: new THREE.MeshBasicMaterial({ color: 0x040405 }),
    sheen: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.03, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false }),
    frame: {
      natural: new THREE.MeshPhysicalMaterial({ color: 0xbdb9b0, metalness: 1, roughness: 0.3, envMapIntensity: 1.05 }),
      dark: new THREE.MeshPhysicalMaterial({ color: 0x3a3b40, metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }),
    },
  };
  return parts;
}

function phone(tex, tone, island) {
  const P = shared(), g = new THREE.Group(), z = DEPTH / 2 + BEV;
  const body = new THREE.Mesh(P.body, P.frame[tone]); body.castShadow = true;
  const glass = new THREE.Mesh(P.glass, P.black); glass.position.z = z + 0.02;
  // fit the screenshot to the display: full width, pinned to the top
  const k = (tex.image.width / tex.image.height) / (SW / SH);
  tex.repeat.y = k; tex.offset.y = 1 - k;
  const screen = new THREE.Mesh(P.screen, new THREE.MeshBasicMaterial({ map: tex })); screen.position.z = z + 0.05;
  const sheen = new THREE.Mesh(P.glass, P.sheen); sheen.position.z = z + 0.09;
  g.add(body, glass, screen, sheen);
  if (island) { const i = new THREE.Mesh(P.island, P.black); i.position.set(0, SH / 2 - 7.4, z + 0.07); g.add(i); }
  for (const [side, y, h] of [[1, 20, 15], [-1, 40, 6.5], [-1, 26, 9.5], [-1, 13, 9.5]]) {
    const b = new THREE.Mesh(P.button, P.frame[tone]); b.scale.y = h; b.position.set(side * (BW / 2 + 0.25), y, 0); g.add(b);
  }
  return g;
}

export default async function (el) {
  const cfg = LAYOUT[el.id]; if (!cfg) return;
  const canvas = el.querySelector('canvas');
  const loader = new THREE.TextureLoader();
  const texs = await Promise.all(el.dataset.screens.split(',').map((u) => loader.loadAsync(u.trim())));
  const renderer = makeRenderer(canvas, { shadows: true });
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  const camera = new THREE.PerspectiveCamera(20, 1, 50, 2000);
  const dist = cfg.frame / 2 / Math.tan(THREE.MathUtils.degToRad(10));
  camera.position.set(0, 0, dist);

  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.position.set(-50, 115, 520); key.castShadow = true;
  key.shadow.mapSize.set(512, 512); key.shadow.radius = 9; key.shadow.blurSamples = 22; key.shadow.bias = -0.0004;
  const sc = key.shadow.camera; sc.left = -300; sc.right = 300; sc.top = 260; sc.bottom = -260; sc.near = 50; sc.far = 1100; sc.updateProjectionMatrix();
  scene.add(key);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1400, 900), new THREE.ShadowMaterial({ color: 0x1a1206, opacity: cfg.wall }));
  wall.position.z = -78; wall.receiveShadow = true; scene.add(wall);

  const rig = new THREE.Group(); scene.add(rig);
  const maxA = renderer.capabilities.getMaxAnisotropy();
  const phones = cfg.phones.map((c, i) => {
    const t = texs[i]; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxA;
    const g = phone(t, cfg.tone, cfg.island);
    g.scale.setScalar(c.s); g.rotation.set(c.r[0], c.r[1], c.r[2]); rig.add(g);
    return { g, c };
  });

  const ptr = { x: 0.5, y: 0.5 };
  window.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    ptr.x = clamp((e.clientX - r.left) / r.width, -0.3, 1.3); ptr.y = clamp((e.clientY - r.top) / r.height, -0.3, 1.3);
  }, { passive: true });

  let age = reduced ? 9 : 0, rx = 0, ry = 0;
  const frame = (dt, t) => {
    if (fit(renderer, el)) { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); }
    age += dt;
    rx += ((ptr.y - 0.5) * -0.1 - rx) * (1 - Math.exp(-dt * 4)); ry += ((ptr.x - 0.5) * 0.26 - ry) * (1 - Math.exp(-dt * 4));
    rig.rotation.set(rx, ry, 0);
    phones.forEach(({ g, c }, i) => {
      const k = ease.outCubic(clamp((age - 0.15 - i * 0.14) / 1.2, 0, 1));
      const bob = reduced ? 0 : Math.sin(t * 0.7 + i * 1.9) * 1.4;
      g.position.set(c.p[0], c.p[1] - (1 - k) * 150 + bob, c.p[2]);
      g.rotation.set(c.r[0] + (1 - k) * 0.25, c.r[1] + ry * 0.35 * (i ? 1 : -0.4), c.r[2]);
    });
    renderer.render(scene, camera);
  };
  frame(0.016, 0);
  el.classList.add('gl-on');
  addLoop(el, frame, { margin: '0px' });
  if (/[?&]dbg=1/.test(location.search)) (window.__dev = window.__dev || {})[el.id] = { run: () => { age = 9; frame(0.5, 1); frame(0.5, 1); } };
}
