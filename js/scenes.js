/* Loads each 3D scene only when its section is about to scroll into view. */
import { webglOK, small } from './kit.js';

if (webglOK()) {
  const lazy = (sel, load) => {
    document.querySelectorAll(sel).forEach((el) => {
      const io = new IntersectionObserver((es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        load().then((m) => m.default(el)).catch((e) => console.error(e));
      }, { rootMargin: '700px' });
      io.observe(el);
    });
  };
  lazy('#court', () => import('./court.js'));
  lazy('#endmark', () => import('./mark.js'));
  if (!small()) {
    // phones and the pitch stay as images on small screens
    lazy('.devices', () => import('./devices.js'));
    lazy('#pitch', () => import('./pitch.js'));
  }
}
