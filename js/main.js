/* Page behaviour that doesn't need WebGL: nav, reveals, index preview, bio panel, booking. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ── Nav ── */
  var nav = $('#nav'), lab = $('#lab');
  function onScroll() {
    var y = window.scrollY || 0;
    nav.classList.toggle('scrolled', y > 24);
    if (lab) {
      var r = lab.getBoundingClientRect();
      nav.classList.toggle('on-dark', r.top < 30 && r.bottom > 30);
    }
    scan();
  }

  /* ── Reveals: observer plus a rect scan, so nothing can stay hidden ── */
  var pending = $$('.rv');
  function show(el) { el.classList.add('in'); }
  function scan() {
    if (!pending.length) return;
    var vh = window.innerHeight;
    pending = pending.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > -200) { show(el); return false; }
      return true;
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    pending.forEach(function (el) { io.observe(el); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
  setTimeout(scan, 600);
  onScroll();

  /* ── Hero headline: set in one line, fitted to the measure ── */
  var h = $('#hero-h');
  function fit() {
    if (!h) return;
    if (window.innerWidth <= 760) { h.style.fontSize = ''; return; }
    h.style.fontSize = '100px';
    var avail = h.parentNode.clientWidth - parseFloat(getComputedStyle(h.parentNode).paddingLeft) * 2;
    var rg = doc.createRange(); rg.selectNodeContents(h);
    var w = rg.getBoundingClientRect().width;
    if (w > 0) h.style.fontSize = (100 * avail / w).toFixed(2) + 'px';
  }
  fit();
  // the fallback face is far wider than condensed Archivo, so refit whenever a font finishes loading
  if (doc.fonts) {
    var refit = function () { fit(); window.dispatchEvent(new Event('ll:fonts')); };
    if (doc.fonts.load) doc.fonts.load('900 100px Archivo', 'WE BUILD COMPANIES.').then(refit, refit);
    if (doc.fonts.addEventListener) doc.fonts.addEventListener('loadingdone', refit);
    if (doc.fonts.ready) doc.fonts.ready.then(refit);
  }
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);

  /* ── Index: a preview that follows the pointer ── */
  var idx = $('#idx'), pv = $('#idx-preview');
  if (idx && pv && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var img = $('img', pv), tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false;
    var tick = function () {
      x += (tx - x) * 0.16; y += (ty - y) * 0.16;
      var tilt = Math.max(-7, Math.min(7, (tx - x) * 0.08));
      pv.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + tilt.toFixed(2) + 'deg)';
      raf = on || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    $$('a', idx).forEach(function (a) {
      var src = a.getAttribute('data-preview');
      if (src) { var pre = new Image(); pre.src = src; }
      a.addEventListener('pointerenter', function (e) {
        if (!src) { pv.classList.remove('on'); on = false; return; }
        img.src = src; pv.classList.toggle('wide', a.hasAttribute('data-wide'));
        tx = x = e.clientX + 28; ty = y = e.clientY - 60;
        pv.classList.add('on'); on = true; if (!raf) raf = requestAnimationFrame(tick);
      });
      a.addEventListener('pointermove', function (e) {
        var w = pv.offsetWidth, hh = pv.offsetHeight;
        tx = Math.min(e.clientX + 28, window.innerWidth - w - 16);
        ty = Math.max(70, Math.min(e.clientY - hh * 0.4, window.innerHeight - hh - 16));
      });
      a.addEventListener('pointerleave', function () { pv.classList.remove('on'); on = false; });
    });
  }

  /* ── Founder bio panel ── */
  var FOUNDERS = {
    su: { el: '#founder-su', mail: 'mailto:team@lumiralabs.co.uk?subject=For%20Sukhpinder' },
    ne: { el: '#founder-ne', mail: 'mailto:team@lumiralabs.co.uk?subject=For%20Nikolaos' }
  };
  var bio = $('#bio'), lastFocus = null;
  function openBio(id) {
    var f = FOUNDERS[id]; if (!f || !bio) return;
    var card = $(f.el);
    var photo = $(f.el + '-img');
    $('#bio-img').src = photo.getAttribute('src');
    $('#bio-img').alt = photo.alt;
    $('#bio-id').textContent = $('.mono', card).textContent;
    $('#bio-name').textContent = $('h3', card).textContent;
    $('#bio-text').textContent = $('p:not(.mono)', card).textContent;
    $('#bio-mail').href = f.mail;
    lastFocus = doc.activeElement;
    if (!bio.open) { if (bio.showModal) bio.showModal(); else bio.setAttribute('open', ''); }
    void bio.offsetWidth;   // commit the closed position first, so the slide always runs
    bio.classList.add('in');
    root.dispatchEvent(new CustomEvent('ll:bio', { detail: { open: true, id: id } }));
  }
  function closeBio() {
    if (!bio || !bio.open) return;
    bio.classList.remove('in');
    setTimeout(function () { if (bio.close) bio.close(); else bio.removeAttribute('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }, 420);
    root.dispatchEvent(new CustomEvent('ll:bio', { detail: { open: false } }));
  }
  if (bio) {
    bio.addEventListener('cancel', function (e) { e.preventDefault(); closeBio(); });
    bio.addEventListener('click', function (e) { if (e.target === bio) closeBio(); });
    $$('[data-bio-close]').forEach(function (b) { b.addEventListener('click', closeBio); });
  }
  $$('[data-bio]').forEach(function (b) { b.addEventListener('click', function () { openBio(b.getAttribute('data-bio')); }); });
  window.LL = { openBio: openBio, closeBio: closeBio };

  /* ── Booking: Calendly popup, with the plain link as the fallback ── */
  var calReady = null;
  function loadCalendly() {
    if (calReady) return calReady;
    calReady = new Promise(function (res, rej) {
      var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://assets.calendly.com/assets/external/widget.css'; doc.head.appendChild(l);
      var s = doc.createElement('script'); s.src = 'https://assets.calendly.com/assets/external/widget.js'; s.async = true;
      s.onload = res; s.onerror = rej; doc.head.appendChild(s);
    });
    return calReady;
  }
  $$('[data-book]').forEach(function (a) {
    a.addEventListener('pointerenter', loadCalendly, { once: true });
    a.addEventListener('click', function (e) {
      if (window.Calendly && window.Calendly.initPopupWidget) {
        e.preventDefault();
        window.Calendly.initPopupWidget({ url: a.href });
      }
    });
  });
})();
