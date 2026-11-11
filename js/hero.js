/* =========================================================
   HERO ENGINE
   1. Fit teks "PORTFOLIO" persis mengisi kotaknya (font apa pun)
   2. Parallax berlapis: teks raksasa, foto, dan UI bergerak
      dengan kecepatan berbeda saat scroll & saat mouse bergerak
   3. Gerakan dihaluskan (lerp) supaya terasa "berat" dan mulus
   ========================================================= */
(() => {
  'use strict';

  /* -------------------------------------------------------
     0. NAMA SITUS: isi semua elemen [data-site-name]
        dari window.SITE.name (diatur di index.html)
     ------------------------------------------------------- */
  const siteName = window.SITE && window.SITE.name;
  if (siteName) {
    document.querySelectorAll('[data-site-name]').forEach((el) => {
      el.textContent = siteName;
    });
  }

  /* Tulisan di samping logo: "xbrzki.id" -> "xbrzki" putih + ".id" hijau */
  const domain = window.SITE && window.SITE.domain;
  if (domain) {
    document.querySelectorAll('[data-site-domain]').forEach((el) => {
      const dot = domain.lastIndexOf('.');
      el.textContent = dot > 0 ? domain.slice(0, dot) : domain;

      if (dot > 0) {
        const tld = document.createElement('i');
        tld.textContent = domain.slice(dot);
        el.appendChild(tld);
      }
    });
  }

  const hero = document.querySelector('.hero');
  if (!hero) return;

  const body = document.body;
  const svg = hero.querySelector('.hero-word svg');
  const text = svg && svg.querySelector('text');
  const grad = svg && svg.querySelector('linearGradient');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const motionOff = () => reduceMotion || body.classList.contains('motion-off');

  /* -------------------------------------------------------
     1. FIT: ukur tinta huruf lalu sesuaikan viewBox SVG
        sehingga huruf PERSIS memenuhi kotak .hero-word.
        Rasio kotak diatur di CSS (aspect-ratio).
     ------------------------------------------------------- */
  const FONT_PX = 200; // harus sama dengan font-size di CSS (.hero-word text)
  const ctx = document.createElement('canvas').getContext('2d');

  const fitWord = () => {
    if (!svg || !text) return;

    const cs = getComputedStyle(text);
    ctx.font = `${cs.fontWeight} ${FONT_PX}px ${cs.fontFamily}`;

    const m = ctx.measureText(text.textContent.trim());
    const ascent = m.actualBoundingBoxAscent;
    const descent = Math.max(m.actualBoundingBoxDescent, 0);
    const box = text.getBBox(); // lebar sudah termasuk letter-spacing

    if (!box.width || !(ascent + descent)) return;

    svg.setAttribute('viewBox', `${box.x} ${-ascent} ${box.width} ${ascent + descent}`);

    if (grad) {
      grad.setAttribute('y1', -ascent);
      grad.setAttribute('y2', descent);
    }
  };

  /* -------------------------------------------------------
     2. PARALLAX
     ------------------------------------------------------- */
  const target = { mx: 0, my: 0, p: 0 }; // tujuan
  const cur = { mx: 0, my: 0, p: 0 };    // posisi tampil (dihaluskan)

  let heroH = 1;
  let raf = 0;

  const measure = () => {
    heroH = hero.offsetHeight || 1;
  };

  const setVars = () => {
    const { mx, my, p } = cur;
    const s = hero.style;

    s.setProperty('--p', p.toFixed(4));

    // Teks raksasa: lawan arah mouse, tertinggal saat scroll (lebih lambat dari halaman)
    s.setProperty('--word-x', `${(-mx * 18).toFixed(2)}px`);
    s.setProperty('--word-y', `${(-my * 9 + p * heroH * 0.24).toFixed(2)}px`);
    s.setProperty('--word-s', (1 + p * 0.07).toFixed(4));

    // Foto: ikut arah mouse, naik sedikit lebih lambat dari halaman
    s.setProperty('--port-x', `${(mx * 22).toFixed(2)}px`);
    s.setProperty('--port-y', `${(my * 10 + p * heroH * 0.11).toFixed(2)}px`);
    s.setProperty('--port-s', (1 + p * 0.06).toFixed(4));

    // UI (teks kiri & kolom kanan): terangkat dan memudar
    s.setProperty('--ui-y', `${(-p * 70).toFixed(2)}px`);
    s.setProperty('--ui-o', clamp(1 - p * 1.35).toFixed(4));
  };

  const tick = () => {
    raf = 0;

    if (motionOff()) {
      target.mx = target.my = target.p = 0;
      cur.mx = cur.my = cur.p = 0;
      setVars();
      return;
    }

    const k = 0.085; // makin kecil = makin "berat/lambat"
    cur.mx += (target.mx - cur.mx) * k;
    cur.my += (target.my - cur.my) * k;
    cur.p += (target.p - cur.p) * 0.14;

    setVars();

    const settled =
      Math.abs(target.mx - cur.mx) < 0.0005 &&
      Math.abs(target.my - cur.my) < 0.0005 &&
      Math.abs(target.p - cur.p) < 0.0005;

    if (!settled) schedule();
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const onScroll = () => {
    target.p = clamp(window.scrollY / heroH);
    schedule();
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  window.addEventListener('resize', () => {
    measure();
    onScroll();
  });

  if (finePointer && !reduceMotion) {
    hero.addEventListener('pointermove', (e) => {
      if (motionOff()) return;
      const r = hero.getBoundingClientRect();
      target.mx = ((e.clientX - r.left) / r.width - 0.5) * 2; // -1..1
      target.my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      schedule();
    });

    hero.addEventListener('pointerleave', () => {
      target.mx = 0;
      target.my = 0;
      schedule();
    });
  }

  // Tombol "Motion on/off" di header mengubah class body -> perbarui
  new MutationObserver(schedule).observe(body, {
    attributes: true,
    attributeFilter: ['class']
  });

  /* -------------------------------------------------------
     3. START: tunggu font siap, baru tampilkan hero
     ------------------------------------------------------- */
  const waitFonts = Promise.race([
    document.fonts
      ? document.fonts.load(`${FONT_PX}px Anton`).then(() => document.fonts.ready)
      : Promise.resolve(),
    new Promise((resolve) => setTimeout(resolve, 1800)) // jangan menunggu selamanya
  ]).catch(() => {});

  waitFonts.then(() => {
    fitWord();
    measure();
    onScroll();
    hero.classList.remove('is-loading');
  });

  // Kalau font datang terlambat (lewat timeout), fit ulang
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitWord);
  }
})();