/* Page behaviour: Finball tabs, bio and method dialogs, Calendly popup. No framework. */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Finball tabs: click or arrow keys, with a short crossfade. Panels are divs holding the screenshots. */
  var list = $('.tabs[role=tablist]');
  if (list) {
    var tabs = $$('[role=tab]', list);
    var select = function (t, focus) {
      tabs.forEach(function (b) {
        var on = b === t, panel = doc.getElementById(b.getAttribute('aria-controls'));
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        if (panel) {
          var im = panel.querySelector('img');
          if (on && im) im.loading = 'eager';
          panel.classList.toggle('on', on);
          panel.tabIndex = on ? 0 : -1;
        }
      });
      if (focus) t.focus();
    };
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b, false); });
      b.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
        if (j === null) return;
        e.preventDefault();
        select(tabs[(j + tabs.length) % tabs.length], true);
      });
    });
    // fetch the other screens once the panel is close, so a switch never shows a gap
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        $$('img', list.parentNode).forEach(function (im) { im.loading = 'eager'; });
        io.disconnect();
      }, { rootMargin: '400px' });
      io.observe(list);
    }
  }

  /* dialogs: open with a short rise and close the same way, Escape and backdrop clicks included */
  var lastFocus = null;
  function shut(d) {
    if (!d.open || d.classList.contains('closing')) return;
    if (reduce.matches) { d.close(); return; }
    d.classList.add('closing');
    var finished = false;
    var done = function () {
      if (finished) return;
      finished = true;
      d.removeEventListener('animationend', onEnd);
      d.classList.remove('closing');
      d.close();
    };
    var onEnd = function (e) { if (e.target === d) done(); };
    d.addEventListener('animationend', onEnd);
    setTimeout(done, 240);
  }
  function open(d) {
    if (!d || d.open) return;
    lastFocus = doc.activeElement;
    d.showModal();
    var c = $('.dlg-close', d);
    if (c) c.focus();
  }
  $$('dialog.dlg').forEach(function (d) {
    // close on the backdrop only when the press and the release both land outside the box,
    // so selecting text in a bio and letting go outside doesn't shut it
    var outside = function (e) {
      var r = d.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    var downOut = false;
    d.addEventListener('pointerdown', function (e) { downOut = e.target === d && outside(e); });
    d.addEventListener('click', function (e) {
      if (downOut && e.target === d && outside(e)) shut(d);
      downOut = false;
    });
    d.addEventListener('cancel', function (e) { e.preventDefault(); shut(d); });
    d.addEventListener('close', function () {
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    });
    var f = $('form[method=dialog]', d);
    if (f) f.addEventListener('submit', function (e) { e.preventDefault(); shut(d); });
  });

  /* founder bios: the text lives once, in the founders section */
  var bio = $('#bio');
  function openBio(id) {
    var p = doc.getElementById('founder-' + id);
    if (!p || !bio) return;
    var img = $('img', p), bi = $('#bio-img', bio);
    $('#bio-id', bio).textContent = $('.mono', p).textContent;
    $('#bio-name', bio).textContent = $('.h3', p).textContent;
    $('#bio-text', bio).textContent = $('.person-bio', p).textContent;
    bi.loading = 'eager';
    bi.src = img.currentSrc || img.src;
    open(bio);
  }
  doc.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-bio],[data-open]');
    if (!t) return;
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (t.hasAttribute('data-bio')) openBio(t.getAttribute('data-bio'));
    else open(doc.getElementById(t.getAttribute('data-open')));
  });
  // the badges are links (so they work without JS); once JS runs they act as buttons, Space included
  $$('[data-bio]').forEach(function (a) {
    a.setAttribute('role', 'button');
    a.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); a.click(); } });
  });
  window.LL = { openBio: openBio };

  /* booking: Calendly's popup, with the plain link as the fallback */
  var calReady = null;
  function loadCalendly() {
    if (calReady) return calReady;
    calReady = new Promise(function (res, rej) {
      var l = doc.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://assets.calendly.com/assets/external/widget.css';
      doc.head.appendChild(l);
      var s = doc.createElement('script');
      s.src = 'https://assets.calendly.com/assets/external/widget.js';
      s.async = true;
      s.onload = res;
      s.onerror = rej;
      doc.head.appendChild(s);
    });
    calReady.catch(function () {});
    return calReady;
  }
  $$('[data-book]').forEach(function (a) {
    a.addEventListener('pointerenter', loadCalendly, { once: true });
    a.addEventListener('focus', loadCalendly, { once: true });
    a.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (window.Calendly && window.Calendly.initPopupWidget) {
        e.preventDefault();
        window.Calendly.initPopupWidget({ url: a.href });
      }
    });
  });
})();
