/* The founders' badges: DOM cards on SVG straps, moved by the lanyard solver in lanyard.js.
   The page already holds their resting pose, so without this script (or with reduced motion) they
   are plain buttons that open the bios. With it they hang on real elastic: drag one to the strap's
   limit and let go, and it springs back. They fall in from above the screen when the page opens at the
   top. The loop sleeps once both cards have been still for 500ms. */
import { Badge, jostle } from './lanyard.js?v=22';

const root = document.getElementById('badges');
const W = 200, H = 316;                                   // card size in the layout, before scaling

if (root) init();

function init() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...root.querySelectorAll('.badge')];
  const paths = cards.map((_, i) => document.getElementById('strap-path-' + i));
  const F = {};
  let sims = [], conf = null, raf = 0, last = 0, still = 0, visible = true, live = false;
  let drag = null, suppress = false;
  const nudged = [false, false];

  /* The straps hang from the top of the page, over the menu bar. Desktop: beside the headline.
     Tablet and phone: above it, smaller, clear of the brand on the left. `strap` is the distance from
     the top of the page to the top of each card. These match the CSS resting pose and media queries. */
  const mq = q => matchMedia(`(max-width: ${q}px)`);
  const mqTab = mq(1080), mqMid = mq(1279), mqMob = mq(760), mqTiny = mq(359);
  const mqL = mq(1535), mqXL = mq(1799), mqShort = matchMedia('(max-height: 760px)');
  function config() {
    if (!mqTab.matches) {
      // desktop: bigger cards on bigger screens (the same steps as the CSS resting pose)
      const k = mqMid.matches || mqShort.matches ? 0.95 : mqL.matches ? 1.12 : mqXL.matches ? 1.25 : 1.4;
      return { side: true, k, at: [0.66, 0.88], strap: [210 * k, 264 * k] };
    }
    if (!mqMob.matches) return { side: false, k: 0.8, at: [0.45, 0.72], strap: [90, 120] };
    // phones: one lanyard either side of the centred logo, hanging low so there's plenty of strap to pull
    const k = mqTiny.matches ? 0.52 : 0.6, low = root.clientHeight - H * k - 16;
    return { side: false, k, at: mqTiny.matches ? [0.26, 0.74] : [0.28, 0.72], strap: [low - 26, low] };
  }

  function walls() {
    const r = root.getBoundingClientRect();
    return { l: -r.left + 4, r: document.documentElement.clientWidth - r.left - 4, t: 0 };
  }

  function build() {
    conf = config();
    const cw = root.clientWidth, wl = walls();
    sims = cards.map((_, i) => {
      const w = W * conf.k, h = H * conf.k, clipUp = 34 * (w / 190);
      return new Badge({ w, h, ax: conf.at[i] * cw, ay: 0, len: conf.strap[i] - clipUp, walls: wl, air: 2.4, maxStretch: 2.4 });
    });
    root.dataset.key = key();
  }
  const key = () => { const c = config(); return [c.side, c.k, root.clientWidth, c.strap[1] | 0].join('|'); };

  /* screen = orthographic view of the card's frame; y flips because the solver's y points up */
  function render() {
    for (let i = 0; i < sims.length; i++) {
      const b = sims[i], f = b.frame(F), k = b.w / W;
      const m = [k * f.Xx, -k * f.Xy, -k * f.Yx, k * f.Yy, f.x - W / 2, -f.y - H / 2].map(v => +v.toFixed(3));
      cards[i].style.transform = `matrix(${m.join(',')})`;
      const { x, y, C } = b;
      let d = `M${x[0].toFixed(1)} ${(-y[0]).toFixed(1)}`;
      for (let j = 1; j < C; j++) {
        const mx = (x[j] + x[j + 1]) / 2, my = -(y[j] + y[j + 1]) / 2;
        d += `Q${x[j].toFixed(1)} ${(-y[j]).toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      }
      d += `L${x[C].toFixed(1)} ${(-y[C]).toFixed(1)}`;
      paths[i].setAttribute('d', d);
    }
  }

  function moving(b) {
    let m = 0;
    for (const i of [b.C, b.TL, b.TR, b.BR, b.BL]) m = Math.max(m, Math.hypot(b.vx[i], b.vy[i], b.vz[i]));
    return m;
  }

  function tick(t) {
    raf = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
    last = t;
    for (const b of sims) b.step(dt);
    if (sims.length === 2) jostle(sims[0], sims[1]);
    render();
    const busy = drag || sims.some(b => moving(b) > 8);
    still = busy ? 0 : still + dt;
    if (still < 0.5 && visible) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  function wake() {
    still = 0;
    if (!raf && visible && live) { last = 0; raf = requestAnimationFrame(tick); }
  }

  function toWorld(e) {
    const r = root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: -(e.clientY - r.top) };
  }

  cards.forEach((el, i) => {
    el.addEventListener('pointerdown', e => {
      if (!live || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;   // one card, one pointer at a time
      suppress = false;
      const b = sims[i], p = toWorld(e), f = b.frame(F);
      // which point of the face is under the pointer: invert the card's projected axes
      const dx = p.x - f.x, dy = p.y - f.y, det = f.Xx * f.Yy - f.Yx * f.Xy || 1e-6;
      const lu = (dx * f.Yy - dy * f.Yx) / det, lv = (f.Xx * dy - f.Xy * dx) / det;
      const u = Math.min(1, Math.max(0, lu / b.w + 0.5)), v = Math.min(1, Math.max(0, lv / b.h + 0.5));
      b.grab(u, v, p.x, p.y);
      drag = { i, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: 0 };
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* a synthetic event has no capture */ }
      el.classList.add('grabbing');
      wake();
    });
    el.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
      const p = toWorld(e);
      sims[drag.i].drag(p.x, p.y);
      wake();
    });
    const end = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const click = drag.moved < 4;
      sims[drag.i].release();
      cards[drag.i].classList.remove('grabbing');
      suppress = !click;
      drag = null;
      wake();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    // the first time a mouse comes over a card it gives a small swing, away from the side it came in
    el.addEventListener('pointerenter', e => {
      if (!live || drag || nudged[i] || e.pointerType !== 'mouse') return;
      nudged[i] = true;
      const b = sims[i], r = el.getBoundingClientRect();
      b.nudge((e.clientX < r.left + r.width / 2 ? 1 : -1) * 90 * b.s, 0);
      wake();
    });
  });
  // a drag ends in a click on the card; only a press that barely moved should open the bio
  root.addEventListener('click', e => {
    const armed = suppress;
    suppress = false;
    if (!armed || e.detail === 0) return;   // keyboard and assistive-tech clicks always go through
    e.preventDefault();
    e.stopPropagation();
  }, true);

  function start() {
    if (live || reduce.matches) return;
    build();
    live = true;
    root.classList.add('live');
    // opened at the top of the page: they fall in from above the screen. Opened further down
    // (a restored scroll position), they're already hanging, with a small swing.
    if (window.scrollY < 120) sims.forEach(dropIn);
    else sims.forEach((b, i) => { b.hang(); b.nudge((i ? -1 : 1) * 70 * b.s, 0); });
    render();
    wake();
  }
  /* a calmer version of the solver's drop: little roll or turn, the second card a beat behind */
  function dropIn(b, i) {
    const dir = i ? -1 : 1;
    b.state = 'hang'; b.grabW = null; b.iw[0] = 0; b.age = 0; b.inside = false;
    b.place(b.ax - dir * 10 * b.s, b.ay + b.h * 0.62, dir * 0.1, dir * 0.22);
    for (let j = b.C; j < b.n; j++) { b.vx[j] = dir * 50 * b.s; b.vy[j] = -480 * b.s; }
    if (i) { b.state = 'gone'; setTimeout(() => { if (b.state === 'gone') { b.state = 'hang'; wake(); } }, 180); }
  }
  function stop() {
    live = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0; drag = null; suppress = false;
    root.classList.remove('live');
    cards.forEach(c => { c.style.transform = ''; c.classList.remove('grabbing'); });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => {
      visible = es[es.length - 1].isIntersecting;
      if (visible) wake(); else if (raf) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    }).observe(root);
  }

  let rz = 0;
  addEventListener('resize', () => {
    if (rz) return;
    rz = requestAnimationFrame(() => {
      rz = 0;
      if (!live) return;
      if (key() !== root.dataset.key) { build(); sims.forEach(b => b.hang()); render(); wake(); }
      else { const wl = walls(); sims.forEach(b => { b.walls = wl; }); }
    });
  });
  reduce.addEventListener('change', () => { if (reduce.matches) stop(); else start(); });

  // the drop waits for a quiet moment after the page has painted (the cards are hidden until then)
  if ('requestIdleCallback' in window) requestIdleCallback(() => start(), { timeout: 400 });
  else setTimeout(start, 120);

  if (/[?&]dbg=1/.test(location.search)) {
    window.__badges = {
      get sims() { return sims; },
      get asleep() { return !raf; },
      conf: () => conf,
      /* step the solver by hand, for checks in a browser that throttles animation frames */
      run(sec = 1, dt = 1 / 60) { for (let t = 0; t < sec; t += dt) { sims.forEach(b => b.step(dt)); jostle(sims[0], sims[1]); } render(); return this.info(); },
      info() {
        return sims.map((b, i) => {
          const f = b.frame({}), r = cards[i].getBoundingClientRect();
          return { cx: +f.x.toFixed(1), cy: +f.y.toFixed(1), roll: +(Math.atan2(f.Xy, f.Xx) * 57.3).toFixed(2), speed: +moving(b).toFixed(2), stretch: +b.stretch().toFixed(3), rect: [r.left, r.top, r.width, r.height].map(Math.round) };
        });
      },
    };
  }
}
