/* Tracelob: a padel court with a simulated rally, drawn the way the tracker sees a match:
   four player boxes, one small ball and the path it has just taken. Units are metres. */
import { THREE, reduced, makeRenderer, addLoop, fit, clamp, lerp, fontsReady } from './kit.js?v=7';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const G = 9.81, R = 0.1, HALF_W = 5, HALF_L = 10;
const BOX = 0x6f86ff, BALL = 0xe9ff57;

export default async function (el) {
  const canvas = el.querySelector('canvas');
  const hudFrame = document.getElementById('hud-frame'), hudBall = document.getElementById('hud-ball');
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 200);
  await fontsReady(1500);

  /* ── court ── */
  const flat = (w, l, color, y, opacity = 1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1 }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; scene.add(m); return m;
  };
  flat(10, 20, 0x0f1a66, 0);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8ebf5 });
  const stripe = (x0, z0, x1, z1, w = 0.055) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), lineMat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(x1 - x0, z1 - z0);
    m.position.set((x0 + x1) / 2, 0.006, (z0 + z1) / 2); scene.add(m);
  };
  stripe(-5, -10, 5, -10); stripe(-5, 10, 5, 10); stripe(-5, -10, -5, 10); stripe(5, -10, 5, 10);
  stripe(-5, -6.95, 5, -6.95); stripe(-5, 6.95, 5, 6.95); stripe(0, -6.95, 0, 6.95);

  // net
  const nc = document.createElement('canvas'); nc.width = 512; nc.height = 64;
  const ng = nc.getContext('2d'); ng.strokeStyle = 'rgba(232,235,245,.55)'; ng.lineWidth = 1;
  for (let x = 0; x <= 512; x += 8) { ng.beginPath(); ng.moveTo(x, 0); ng.lineTo(x, 64); ng.stroke(); }
  for (let y = 0; y <= 64; y += 8) { ng.beginPath(); ng.moveTo(0, y); ng.lineTo(512, y); ng.stroke(); }
  ng.fillStyle = '#e8ebf5'; ng.fillRect(0, 0, 512, 5);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(nc), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  net.position.set(0, 0.45, 0); scene.add(net);

  // glass and fence, as outlines with the faintest fill
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x9fb0ff, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xcfd6ff, transparent: true, opacity: 0.34 });
  const fenceMat = new THREE.LineBasicMaterial({ color: 0xcfd6ff, transparent: true, opacity: 0.13 });
  const pane = (w, h, x, y, z, ry) => {
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Mesh(g, glassMat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat); e.position.copy(m.position); e.rotation.y = ry; scene.add(e);
  };
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) pane(2, 3, -4 + i * 2, 1.5, s * HALF_L, 0);
    for (const sx of [-1, 1]) { pane(2, 3, sx * HALF_W, 1.5, s * 9, Math.PI / 2); pane(2, 3, sx * HALF_W, 1.5, s * 7, Math.PI / 2); }
  }
  const fp = [];
  for (const sx of [-1, 1]) {
    for (let z = -6; z <= 6; z += 2) fp.push(sx * HALF_W, 0, z, sx * HALF_W, 3, z);
    for (let y = 1; y <= 3; y += 1) fp.push(sx * HALF_W, y, -6, sx * HALF_W, y, 6);
  }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  scene.add(new THREE.LineSegments(fg, fenceMat));

  /* ── labels ── */
  const label = (text, color = '#cfd6ff') => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    const draw = (t) => { g.clearRect(0, 0, 256, 64); g.font = '500 30px "JetBrains Mono", ui-monospace, monospace'; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(t, 4, 34); tex.needsUpdate = true; };
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.scale.set(1.9, 0.475, 1); s.center.set(0, 0); s.renderOrder = 5; draw(text);
    s.set = draw; return s;
  };

  /* ── players ── */
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0xdfe4f7 });
  const boxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 1.9, 0.8));
  const boxMat = new THREE.LineBasicMaterial({ color: BOX });
  const ringMat = new THREE.MeshBasicMaterial({ color: BOX, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const homes = [[-2.4, 7.2], [2.4, 6.4], [-2.4, -6.4], [2.4, -7.2]];
  const players = homes.map(([x, z], i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.1, 4, 12), bodyMat); body.position.y = 0.76;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), bodyMat); head.position.y = 1.63;
    const box = new THREE.LineSegments(boxGeo, boxMat); box.position.y = 0.95;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.52, 40), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012;
    const tag = label('P' + (i + 1) + ' 0.99');
    if (z > 0) tag.position.set(0.62, 0.02, 0.3); else tag.position.set(-0.4, 1.98, 0);   // near-side tags sit on the floor, clear of the net
    g.add(body, head, box, ring, tag); g.position.set(x, 0, z); scene.add(g);
    return { g, home: new THREE.Vector3(x, 0, z), goal: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), tag, side: z > 0 ? 1 : -1, conf: 0.99 };
  });

  /* ── ball, its path and its bounces ── */
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 20, 14), new THREE.MeshBasicMaterial({ color: BALL }));
  scene.add(ball);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ color: 0x02030a, transparent: true, opacity: 0.5, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; scene.add(shadow);
  const rc = document.createElement('canvas'); rc.width = rc.height = 96;
  const rg = rc.getContext('2d'); rg.strokeStyle = '#e9ff57'; rg.lineWidth = 5;
  for (const [x, y, dx, dy] of [[8, 8, 1, 1], [88, 8, -1, 1], [8, 88, 1, -1], [88, 88, -1, -1]]) { rg.beginPath(); rg.moveTo(x + dx * 22, y); rg.lineTo(x, y); rg.lineTo(x, y + dy * 22); rg.stroke(); }
  const reticle = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(rc), transparent: true, depthTest: false }));
  reticle.scale.set(0.62, 0.62, 1); reticle.renderOrder = 6; scene.add(reticle);
  const ballTag = label('ball 0.93', '#e9ff57'); ballTag.scale.set(1.5, 0.375, 1); scene.add(ballTag);

  const N = 46, trail = new Float32Array(N * 3), cols = new Float32Array(N * 3);
  const bc = new THREE.Color(BALL);
  for (let i = 0; i < N; i++) { const k = Math.pow(1 - i / (N - 1), 1.7); cols[i * 3] = bc.r * k; cols[i * 3 + 1] = bc.g * k; cols[i * 3 + 2] = bc.b * k; }
  const tGeo = new LineGeometry();
  tGeo.setPositions(trail); tGeo.setColors(cols);
  // setPositions() allocates a new GPU buffer on every call, so after the first one the trail is
  // written straight into the existing buffer
  const tBuf = tGeo.attributes.instanceStart.data; tBuf.setUsage(THREE.DynamicDrawUsage);
  const writeTrail = () => {
    const a = tBuf.array;
    for (let i = 0; i < N - 1; i++) { const s = i * 3, d = i * 6; a[d] = trail[s]; a[d + 1] = trail[s + 1]; a[d + 2] = trail[s + 2]; a[d + 3] = trail[s + 3]; a[d + 4] = trail[s + 4]; a[d + 5] = trail[s + 5]; }
    tBuf.needsUpdate = true;
  };
  const tMat = new LineMaterial({ vertexColors: true, linewidth: 2.6, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, worldUnits: false });
  const tLine = new Line2(tGeo, tMat); tLine.frustumCulled = false; scene.add(tLine);

  const rings = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.235, 40), new THREE.MeshBasicMaterial({ color: BALL, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.014; scene.add(m); return { m, t: 9 };
  });
  let ringI = 0;
  const bounceAt = (x, z) => { const r = rings[ringI++ % rings.length]; r.m.position.x = x; r.m.position.z = z; r.t = 0; };

  /* ── the rally ── */
  let seed = 4127; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (seed / 2147483647) * (b - a); };
  const p = new THREE.Vector3(-2, 1.1, 7.4), v = new THREE.Vector3();
  let clock = 0, hitAt = 0, hitter = 0, conf = 0.93, confGoal = 0.93;

  function strike() {
    const from = players[hitter], side = -from.side;
    p.y = clamp(p.y, 0.55, 2.2);
    const tx = rnd(-3.8, 3.8), tz = side * rnd(3.4, 8.6);
    let T = rnd() < 0.22 ? rnd(1.9, 2.3) : rnd(0.95, 1.4), vy = 0;
    for (let k = 0; k < 6; k++) {
      vy = (R - p.y) / T + 0.5 * G * T;
      const tn = -p.z / ((tz - p.z) / T), yn = p.y + vy * tn - 0.5 * G * tn * tn;
      if (yn > 1.2) break; T += 0.18;
    }
    v.set((tx - p.x) / T, vy, (tz - p.z) / T);
    // who takes it, and where the ball will be when they do
    const wait = rnd(0.3, 0.46), vyLand = vy - G * T;
    const hx = clamp(tx + v.x * 0.8 * wait, -4.5, 4.5);
    let hz = tz + v.z * 0.8 * wait; if (Math.abs(hz) > 9.7) hz = Math.sign(hz) * (19.4 - Math.abs(hz));
    const cands = players.map((q, i) => i).filter((i) => players[i].side === side);
    const next = cands.reduce((a, b) => (Math.abs(players[a].home.x - hx) < Math.abs(players[b].home.x - hx) ? a : b));
    players.forEach((q, i) => { if (i === next) q.goal.set(clamp(hx - 0.25, -4.4, 4.4), 0, clamp(hz + side * 0.35, -9.4, 9.4)); else q.goal.copy(q.home).x += rnd(-0.6, 0.6); });
    hitAt = clock + T + wait; hitter = next;
    void vyLand;
  }

  function step(dt) {
    clock += dt;
    if (clock >= hitAt) strike();
    v.y -= G * dt; p.addScaledVector(v, dt);
    if (p.y < R && v.y < 0) { p.y = R; v.y *= -0.74; v.x *= 0.8; v.z *= 0.8; bounceAt(p.x, p.z); }
    if (Math.abs(p.z) > HALF_L - R) { p.z = Math.sign(p.z) * (HALF_L - R); v.z *= -0.62; }
    if (Math.abs(p.x) > HALF_W - R) { p.x = Math.sign(p.x) * (HALF_W - R); v.x *= -0.62; }
    for (const q of players) {
      // critically damped chase towards where they need to be
      const k = 26, c = 9.5, pos = q.g.position;
      q.vel.x += ((q.goal.x - pos.x) * k - q.vel.x * c) * dt; q.vel.z += ((q.goal.z - pos.z) * k - q.vel.z * c) * dt;
      pos.x += q.vel.x * dt; pos.z += q.vel.z * dt;
    }
    trail.copyWithin(3, 0, (N - 1) * 3); trail[0] = p.x; trail[1] = p.y; trail[2] = p.z;
  }

  for (let i = 0; i < N; i++) { trail[i * 3] = p.x; trail[i * 3 + 1] = p.y; trail[i * 3 + 2] = p.z; }
  strike();
  for (let i = 0; i < 240; i++) step(1 / 120);   // start mid-rally

  /* ── view ── */
  const ptr = { x: 0.5, y: 0.5 };
  window.addEventListener('pointermove', (e) => { ptr.x = e.clientX / window.innerWidth; ptr.y = e.clientY / window.innerHeight; }, { passive: true });
  let az = 0.2, el2 = 0, hudT = 0, acc = 0;
  const size = new THREE.Vector2();

  function view(t) {
    const w = el.clientWidth, h = el.clientHeight, wide = w / h > 1.25;
    if (fit(renderer, el) || view.w !== w) {
      view.w = w; camera.aspect = w / h; camera.fov = wide ? 31 : 40;
      if (wide) camera.setViewOffset(w, h, -w * 0.235, h * 0.04, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      tMat.resolution.set(w, h);
    }
    const ta = Math.sin(t * 0.11) * 0.34 + (ptr.x - 0.5) * 0.3, te = (ptr.y - 0.5) * 0.08;
    az += (ta - az) * 0.04; el2 += (te - el2) * 0.04;
    const d = wide ? 30 : 23, hgt = (wide ? 8.6 : 10) + el2 * 20;
    camera.position.set(Math.sin(az) * d, hgt, Math.cos(az) * d);
    camera.lookAt(0, 0.4, -0.6);
  }

  function draw(dt, t) {
    ball.position.copy(p);
    shadow.position.x = p.x; shadow.position.z = p.z; shadow.material.opacity = clamp(0.55 - p.y * 0.1, 0.12, 0.55);
    reticle.position.copy(p); ballTag.position.set(p.x + 0.38, p.y + 0.2, p.z);
    writeTrail();
    for (const r of rings) { r.t += dt; const k = clamp(r.t / 0.9, 0, 1); r.m.scale.setScalar(1 + k * 5); r.m.material.opacity = (1 - k) * 0.85; }
    hudT += dt;
    if (hudT > 0.12) {
      hudT = 0;
      // the ball is hardest to see when it passes in front of a player
      const near = players.some((q) => Math.hypot(q.g.position.x - p.x, q.g.position.z - p.z) < 0.9 && p.y < 2);
      confGoal = near ? 0.58 + rnd(0, 0.1) : 0.9 + rnd(0, 0.08);
      conf = lerp(conf, confGoal, 0.5);
      const c = conf.toFixed(2);
      ballTag.set('ball ' + c);
      if (hudBall) hudBall.textContent = 'ball ' + c;
      if (hudFrame) hudFrame.textContent = 'frame ' + String(28800 + Math.floor(clock * 59.94) % 7218).padStart(5, '0');
    }
    view(t);
    renderer.render(scene, camera);
  }

  view(0);
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  if (reduced) { draw(0.016, 0); return; }
  addLoop(el, (dt, t) => {
    acc += dt; let n = 0;
    while (acc >= 1 / 120 && n < 8) { step(1 / 120); acc -= 1 / 120; n++; }
    if (n === 8) acc = 0;
    draw(dt, t);
  });
  if (/[?&]dbg=1/.test(location.search)) window.__court = { run: (sec) => { for (let i = 0; i < sec * 120; i++) step(1 / 120); draw(0.5, clock); }, renderer, size };
}
