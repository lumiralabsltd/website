/* Closing section: the chrome LL mark, turning slowly. Drag it to spin it. */
import { THREE, reduced, makeRenderer, studioEnv, buildMark, addLoop, fit, clamp } from './kit.js?v=7';

export default async function (el) {
  const canvas = el.querySelector('canvas');
  const renderer = makeRenderer(canvas, { shadows: true });
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  const camera = new THREE.PerspectiveCamera(26, 1, 10, 4000);
  camera.position.set(0, 0, 620);

  const mark = buildMark({ depth: 30 });
  mark.left.castShadow = mark.right.castShadow = true;
  scene.add(mark);

  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.position.set(-60, 150, 560); key.castShadow = true;
  key.shadow.mapSize.set(512, 512); key.shadow.radius = 13; key.shadow.blurSamples = 24; key.shadow.bias = -0.0004;
  const sc = key.shadow.camera; sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.near = 50; sc.far = 1400; sc.updateProjectionMatrix();
  scene.add(key);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShadowMaterial({ color: 0x0a0c14, opacity: 0.16 }));
  wall.position.z = -70; wall.receiveShadow = true; scene.add(wall);

  // rests three-quarters on, swaying a little; a drag spins it and it winds back to rest
  const REST = 0.46, TAU = Math.PI * 2;
  let yaw = REST, vel = 0, pitch = -0.14, tp = -0.14, drag = null, clock = 0;
  canvas.style.touchAction = 'pan-y'; canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, t: performance.now() }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; loop.wake(); });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tp = -0.14 + ((e.clientY - r.top) / r.height - 0.5) * 0.3;
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - drag.x, dt = Math.max(8, now - drag.t) / 1000;
    yaw += dx * 0.011; vel = clamp(dx * 0.011 / dt, -16, 16);
    drag.x = e.clientX; drag.t = now;
  });
  const end = () => { drag = null; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  el.classList.add('gl-on');
  const loop = addLoop(el, (dt) => {
    if (fit(renderer, el)) { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); }
    clock += dt;
    if (!drag) {
      const goal = REST + (reduced ? 0 : Math.sin(clock * 0.45) * 0.3);
      const near = goal + TAU * Math.round((yaw - goal) / TAU);
      vel += ((near - yaw) * 5 - vel * 2.4) * dt;
      yaw += vel * dt;
    }
    pitch += (tp - pitch) * (1 - Math.exp(-dt * 5));
    mark.rotation.set(pitch, yaw, 0);
    mark.scale.setScalar(2);
    renderer.render(scene, camera);
  });
  if (/[?&]dbg=1/.test(location.search)) window.__mark = { render: () => { fit(renderer, el); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); mark.rotation.set(pitch, yaw, 0); mark.scale.setScalar(2); renderer.render(scene, camera); }, set: (y) => { yaw = y; } };
}
