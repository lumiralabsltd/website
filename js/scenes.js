/* Builds each 3D scene once. They are set up one at a time while the page is idle after load, so
   nothing has to compile in the middle of a scroll; a section that comes into view first jumps the queue. */
import { webglOK, small, activity } from './kit.js';

if (webglOK()) {
  const jobs = [];
  const start = (j) => {
    if (j.p) return j.p;
    j.io.disconnect();
    return (j.p = j.load().then((m) => m.default(j.el)).catch((e) => console.error(e)));
  };
  const add = (sel, load) => {
    document.querySelectorAll(sel).forEach((el) => {
      const j = { el, load, p: null };
      j.io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) start(j); }, { rootMargin: '500px' });
      j.io.observe(el);
      jobs.push(j);
    });
  };
  if (!small()) add('#pitch', () => import('./pitch.js'));   // phones and the pitch stay as images on small screens
  if (!small()) add('.devices', () => import('./devices.js'));
  add('#court', () => import('./court.js'));
  add('#endmark', () => import('./mark.js'));

  const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 1200 }) : setTimeout(r, 250)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const warm = async () => {
    await wait(document.documentElement.classList.contains('is-intro') ? 5200 : 2600);   // after the passes have dropped
    for (const j of jobs) {
      // not while a pass is swinging or being dragged: setting a scene up can cost a frame or two
      for (let n = 0; n < 60 && performance.now() - activity.hero < 400; n++) await wait(250);
      await idle(); await start(j); await wait(120);
    }
  };
  if (document.readyState === 'complete') warm(); else window.addEventListener('load', warm, { once: true });
}
