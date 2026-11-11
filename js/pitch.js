/* Finball: a model football pitch, the kind an architect would put on a table.
   Paper white, ink lines, chrome goals, and a passing move played out by the blue side. Units are metres. */
import { THREE, BLUE, reduced, makeRenderer, studioEnv, addLoop, fit, clamp, ease } from './kit.js?v=6';

const L = 105, W = 68;

export default async function (el) {
  const canvas = el.querySelector('canvas');
  const renderer = makeRenderer(canvas, { shadows: true });
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer, 0.5);
  const camera = new THREE.PerspectiveCamera(24, 1.6, 10, 800);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfccc2, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-70, 120, 60); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 5; key.shadow.blurSamples = 14; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.3;
  const sc = key.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 70; sc.bottom = -70; sc.near = 20; sc.far = 320; sc.updateProjectionMatrix();
  scene.add(key);

  const table = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ color: 0x0a0c14, opacity: 0.2 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -2.6; table.receiveShadow = true; scene.add(table);

  const model = new THREE.Group(); scene.add(model);
  const paper = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.9, envMapIntensity: 0.35 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(L + 9, 2.6, W + 9), paper);
  plinth.position.y = -1.3; plinth.castShadow = true; plinth.receiveShadow = true; model.add(plinth);

  // mown stripes, two near-whites
  const sA = new THREE.MeshStandardMaterial({ color: 0xebe8df, roughness: 0.95, envMapIntensity: 0.3 });
  const sB = new THREE.MeshStandardMaterial({ color: 0xe0dcd0, roughness: 0.95, envMapIntensity: 0.3 });
  const N = 14, sg = new THREE.PlaneGeometry(L / N, W);
  for (let i = 0; i < N; i++) { const m = new THREE.Mesh(sg, i % 2 ? sA : sB); m.rotation.x = -Math.PI / 2; m.position.set(-L / 2 + (i + 0.5) * L / N, 0.01, 0); m.receiveShadow = true; model.add(m); }

  // markings
  const ink = new THREE.MeshBasicMaterial({ color: 0x15171c }), T = 0.26, Y = 0.03;
  const bar = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0) + T;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(T, len), ink);
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(x1 - x0, z1 - z0); m.position.set((x0 + x1) / 2, Y, (z0 + z1) / 2); model.add(m);
  };
  const box = (x0, z0, x1, z1) => { bar(x0, z0, x1, z0); bar(x1, z0, x1, z1); bar(x1, z1, x0, z1); bar(x0, z1, x0, z0); };
  const arc = (x, z, r, a0, len) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - T / 2, r + T / 2, 72, 1, a0, len), ink); m.rotation.x = -Math.PI / 2; m.position.set(x, Y, z); model.add(m); };
  const spot = (x, z) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.38, 20), ink); m.rotation.x = -Math.PI / 2; m.position.set(x, Y, z); model.add(m); };
  box(-L / 2, -W / 2, L / 2, W / 2); bar(0, -W / 2, 0, W / 2); arc(0, 0, 9.15, 0, Math.PI * 2); spot(0, 0);
  const th = Math.acos(5.5 / 9.15);
  for (const s of [-1, 1]) {
    const gx = s * L / 2;
    box(gx, -20.16, gx - s * 16.5, 20.16); box(gx, -9.16, gx - s * 5.5, 9.16); spot(gx - s * 11, 0);
    arc(gx - s * 11, 0, 9.15, s > 0 ? Math.PI - th : -th, th * 2);
    for (const zz of [-1, 1]) arc(gx, zz * W / 2, 1, s > 0 ? (zz > 0 ? Math.PI / 2 : Math.PI) : (zz > 0 ? 0 : -Math.PI / 2), Math.PI / 2);
  }

  // goals
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12 });
  const netMat = new THREE.LineBasicMaterial({ color: 0x15171c, transparent: true, opacity: 0.28 });
  for (const s of [-1, 1]) {
    const gx = s * L / 2, g = new THREE.Group();
    const post = (h) => new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, h, 12), steel);
    const a = post(2.44), b = post(2.44), c = post(7.32 + 0.32);
    a.position.set(0, 1.22, -3.66); b.position.set(0, 1.22, 3.66); c.rotation.x = Math.PI / 2; c.position.set(0, 2.44, 0);
    [a, b, c].forEach((m) => { m.castShadow = true; g.add(m); });
    const pts = [];
    for (let i = 0; i <= 8; i++) { const z = -3.66 + i * 0.915; pts.push(0, 2.44, z, s * 2, 0, z); }
    for (let i = 0; i <= 3; i++) { const k = i / 3; pts.push(s * 2 * k, 2.44 * (1 - k), -3.66, s * 2 * k, 2.44 * (1 - k), 3.66); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(ng, netMat)); g.position.x = gx; model.add(g);
  }

  // two sides as tactics-board discs
  const discGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.55, 32);
  const home = new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.35, envMapIntensity: 0.9 });
  const away = new THREE.MeshStandardMaterial({ color: 0x1a1c21, roughness: 0.4, envMapIntensity: 0.9 });
  const peg = (x, z, mat) => { const m = new THREE.Mesh(discGeo, mat); m.position.set(x, 0.29, z); m.castShadow = true; model.add(m); return m; };
  const H = [[-47, 0], [-33, -22], [-35, -8], [-35, 8], [-33, 22], [-16, -14], [-19, 0], [-14, 15], [8, -24], [16, 2], [9, 24]];
  const A = [[47, 0], [32, -21], [34, -7], [34, 7], [32, 21], [20, -24], [22, -8], [23, 9], [20, 25], [-2, -6], [-4, 9]];
  H.forEach(([x, z]) => peg(x, z, home)); A.forEach(([x, z]) => peg(x, z, away));

  // the ball, passed round the blue side
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  ball.castShadow = true; model.add(ball);
  const move = [2, 6, 5, 8, 9, 10, 7, 3].map((i) => H[i]);
  const PASS = 1.15;

  const ptr = { x: 0.5, y: 0.5 };
  window.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); ptr.x = clamp((e.clientX - r.left) / r.width, -0.4, 1.4); ptr.y = clamp((e.clientY - r.top) / r.height, -0.4, 1.4); }, { passive: true });
  let yaw = -0.3, tilt = 0;

  const frame = (dt, t) => {
    if (fit(renderer, canvas)) { camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix(); }
    const ty = -0.3 + (ptr.x - 0.5) * 0.4 + (reduced ? 0 : Math.sin(t * 0.16) * 0.08), tt = (ptr.y - 0.5) * 0.12;
    yaw += (ty - yaw) * (1 - Math.exp(-dt * 3)); tilt += (tt - tilt) * (1 - Math.exp(-dt * 3));
    model.rotation.y = yaw;
    camera.position.set(0, 119 + tilt * 70, 188); camera.lookAt(0, -5, 4);
    const u = reduced ? 0 : t / PASS, i = Math.floor(u) % move.length, f = ease.inOutCubic(u - Math.floor(u));
    const a = move[i], b = move[(i + 1) % move.length];
    ball.position.set(a[0] + (b[0] - a[0]) * f + 1.9, 0.62 + Math.sin(f * Math.PI) * 1.6, a[1] + (b[1] - a[1]) * f + 1.2);
    renderer.render(scene, camera);
  };
  el.classList.add('gl-on');
  camera.position.set(0, 119, 188); camera.lookAt(0, -5, 4);
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  frame(0.016, 0);
  addLoop(el, frame, { margin: '0px' });
  if (/[?&]dbg=1/.test(location.search)) window.__pitch = { run: () => { frame(0.5, 2.6); frame(0.5, 2.6); } };
}
