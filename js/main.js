(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const navLinks = $$('.main-nav a');

  // 1. Progress bar scroll
  const bar = $('#progressBar');
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
  };
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();

  // 2. Menu aktif sesuai bagian yang terlihat
  if ('IntersectionObserver' in window) {
    const navObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        navLinks.forEach(l =>
          l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`)
        );
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    $$('.section[id]').forEach(s => navObs.observe(s));
  }

  // 3. Animasi muncul saat scroll
  const revealTargets = $$(
    '.section-head, .project-card, .credential-row, .about-heading, .panel, .career-item, .contact-grid > *'
  );
  if ('IntersectionObserver' in window && !reduceMotion) {
    revealTargets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${(i % 3) * 80}ms`);
    });
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting));
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach(el => revealObs.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('visible'));
  }

  // 4. Tombol motion on/off
  const techTrack = $('#techTrack');
  const motionToggle = $('#motionToggle');
  const motionLabel = $('#motionLabel');

  const setMotion = off => {
    body.classList.toggle('motion-off', off);
    if (motionLabel) motionLabel.textContent = off ? 'Motion off' : 'Motion on';
    const mark = motionToggle?.querySelector('.pause-mark');
    if (mark) mark.textContent = off ? '▶' : 'Ⅱ';
    techTrack?.classList.toggle('paused', off);
    if (off) {
      const pw = $('.hero-portrait-wrap');
      if (pw) pw.style.translate = '0px 0px';
    }
  };
  motionToggle?.addEventListener('click', () =>
    setMotion(!body.classList.contains('motion-off'))
  );
  if (reduceMotion) setMotion(true);

  // 5. Menu mobile
  const menuToggle = $('#menuToggle');
  const mainNav = $('.main-nav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const open = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.forEach(l => l.addEventListener('click', () => {
      mainNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  // 6. Filter dan pencarian proyek
  let activeFilter = 'all';
  const search = $('#projectSearch');
  const noResults = $('#noResults');

  const applyProjects = () => {
    const q = search?.value.trim().toLowerCase() || '';
    let visible = 0;
    $$('.project-card').forEach(card => {
      const show =
        (activeFilter === 'all' || card.dataset.category === activeFilter) &&
        (card.dataset.title || '').toLowerCase().includes(q);
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    if (noResults) noResults.style.display = visible ? 'none' : 'block';
  };

  $$('.filter').forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter || 'all';
    $$('.filter').forEach(f => f.classList.toggle('active', f === btn));
    applyProjects();
  }));
  search?.addEventListener('input', applyProjects);

  // 7. Carousel teknologi
  $('#pauseTech')?.addEventListener('click', () => techTrack?.classList.toggle('paused'));
  $('#techPrev')?.addEventListener('click', () => {
    techTrack?.classList.add('paused');
    techTrack?.scrollBy({ left: -180, behavior: 'smooth' });
  });
  $('#techNext')?.addEventListener('click', () => {
    if (!techTrack) return;
    techTrack.classList.add('paused');
    techTrack.style.animation = 'none';
    techTrack.style.transform = 'translateX(-100px)';
  });
  $('#viewTech')?.addEventListener('click', () => {
    if (!techTrack) return;
    const open = techTrack.classList.toggle('expanded');
    techTrack.classList.toggle('paused', open);
    techTrack.style.flexWrap = open ? 'wrap' : 'nowrap';
    techTrack.style.minWidth = open ? '0' : '800px';
  });

  // 8. Slider perbandingan kode dan preview
  const frameEl = $('#compareFrame');
  const divider = $('#compareDivider');
  const live = $('.compare-live');
  if (frameEl && divider && live) {
    let dragging = false;
    const setCompare = x => {
      const r = frameEl.getBoundingClientRect();
      if (!r.width) return;
      const px = Math.min(r.width - 24, Math.max(24, x - r.left));
      const pct = (px / r.width) * 100;
      live.style.width = `${100 - pct}%`;
      divider.style.left = `${pct}%`;
    };
    divider.addEventListener('pointerdown', e => {
      dragging = true;
      divider.setPointerCapture(e.pointerId);
    });
    divider.addEventListener('pointermove', e => { if (dragging) setCompare(e.clientX); });
    const stop = () => { dragging = false; };
    divider.addEventListener('pointerup', stop);
    divider.addEventListener('pointercancel', stop);
    frameEl.addEventListener('click', e => {
      if (e.target === frameEl || e.target.classList.contains('compare-live')) {
        setCompare(e.clientX);
      }
    });
  }

  // 9. Accordion pengalaman kerja
  $$('.career-toggle').forEach(btn => btn.addEventListener('click', () => {
    const item = btn.closest('.career-item');
    if (!item) return;
    const wasOpen = item.classList.contains('open');
    $$('.career-item').forEach(row => {
      row.classList.remove('open');
      const t = row.querySelector('.career-toggle');
      t?.setAttribute('aria-expanded', 'false');
      const i = t?.querySelector('i');
      if (i) i.textContent = '＋';
    });
    if (!wasOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      const i = btn.querySelector('i');
      if (i) i.textContent = '−';
    }
  }));

  // 10. Modal preview proyek
  const modal = $('#projectModal');
  const closeModal = () => {
    modal?.classList.remove('show');
    modal?.setAttribute('aria-hidden', 'true');
  };
  $$('.project-image').forEach(link => link.addEventListener('click', e => {
    e.preventDefault();
    const title = link.closest('.project-card')?.dataset.title || '';
    const t = $('#modalTitle');
    if (t) t.textContent = title.toUpperCase();
    modal?.classList.add('show');
    modal?.setAttribute('aria-hidden', 'false');
  }));
  $('#modalClose')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // 11. Form proyek (membuka draf email)
  $('#briefToggle')?.addEventListener('click', () => {
    const brief = $('.project-brief');
    const toggle = $('#briefToggle');
    if (!brief || !toggle) return;
    const open = brief.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    const i = toggle.querySelector('b');
    if (i) i.textContent = open ? '−' : '＋';
  });
  $('#briefForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#briefName')?.value.trim() || '';
    const type = $('#briefType')?.value.trim() || '';
    const message = $('#briefMessage')?.value.trim() || '';
    const subject = `Project inquiry — ${type}`;
    const text = `Hello Iskiie,\n\nMy name is ${name}.\nProject: ${type}\n\n${message}\n\nThank you.`;
    location.href =
      `mailto:mail@iskiie.id?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(text)}`;
  });

  // 12. Foto hero mengikuti kursor
  const hero = $('.hero');
  const portraitWrap = $('.hero-portrait-wrap');
  if (hero && portraitWrap && finePointer && !reduceMotion) {
    let raf = null, mx = 0, my = 0;
    hero.addEventListener('pointermove', e => {
      if (body.classList.contains('motion-off')) {
        portraitWrap.style.translate = '0px 0px';
        return;
      }
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 12;
      my = ((e.clientY - r.top) / r.height - 0.5) * 8;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        portraitWrap.style.translate = `${mx.toFixed(2)}px ${my.toFixed(2)}px`;
        raf = null;
      });
    });
    hero.addEventListener('pointerleave', () => {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      portraitWrap.style.translate = '0px 0px';
    });
  }

  // 13. Efek nama: klik KIKI → partikel menyusun "M. RIZKY ANJANI",
  //     kursor dijauhkan / diklik lagi → kembali ke "KIKI."
  const h1 = $('.hero-intro h1');
  if (h1 && !reduceMotion) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '50'
    });
    body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H;
    const resize = () => {
      W = innerWidth; H = innerHeight;
      const d = devicePixelRatio || 1;
      canvas.width = W * d; canvas.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    const NAME_TEXT = 'M. RIZKY ANJANI';
    const BASE_TEXT = 'KIKI.';
    let particles = [];
    let showingName = false;
    let timer = null;

    h1.style.transition = 'opacity .2s';
    h1.style.cursor = 'pointer';

    // Ambil titik-titik dari bentuk tulisan
    const samplePoints = (text, maxWidth) => {
      const rect = h1.getBoundingClientRect();
      const cs = getComputedStyle(h1);
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const o = off.getContext('2d');
      let size = parseFloat(cs.fontSize);
      o.letterSpacing = cs.letterSpacing;
      o.font = `${size}px Anton, Impact, sans-serif`;
      const w = o.measureText(text).width;
      if (w > maxWidth) {
        size *= maxWidth / w;
        o.font = `${size}px Anton, Impact, sans-serif`;
      }
      o.fillStyle = '#fff';
      o.textBaseline = 'middle';
      o.fillText(text, rect.left, rect.top + rect.height / 2);

      const data = o.getImageData(0, 0, W, H).data;
      const pts = [];
      const step = 4;
      for (let y = 0; y < H; y += step)
        for (let x = 0; x < W; x += step)
          if (data[(y * W + x) * 4 + 3] > 128) pts.push({ x, y });

      if (pts.length > 1400) {
        const k = Math.ceil(pts.length / 1400);
        return pts.filter((_, i) => i % k === 0);
      }
      return pts;
    };

    // Partikel bergerak ke titik baru; yang berlebih memudar
    const morphTo = points => {
      while (particles.length < points.length) {
        particles.push({
          x: W / 2 + (Math.random() - 0.5) * 200,
          y: H / 2 + (Math.random() - 0.5) * 200,
          tx: 0, ty: 0, a: 0, dead: false,
          ch: Math.random() < 0.5 ? '0' : '1'
        });
      }
      particles.forEach((p, i) => {
        if (i < points.length) {
          p.tx = points[i].x; p.ty = points[i].y; p.dead = false;
        } else {
          p.tx = p.x + (Math.random() - 0.5) * 300;
          p.ty = p.y + Math.random() * 200;
          p.dead = true;
        }
      });
    };

    const showName = () => {
      showingName = true;
      clearTimeout(timer);
      h1.style.opacity = '0';
      morphTo(samplePoints(NAME_TEXT, 560));
    };

    const showBase = () => {
      showingName = false;
      morphTo(samplePoints(BASE_TEXT, 2000));
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (showingName) return;
        h1.style.opacity = '1';
        morphTo([]);
      }, 900);
    };

    h1.addEventListener('click', () => (showingName ? showBase() : showName()));
    h1.addEventListener('mouseleave', () => { if (showingName) showBase(); });

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.font = '11px "Courier New", monospace';
      particles = particles.filter(p => !(p.dead && p.a <= 0));
      for (const p of particles) {
        p.x += (p.tx - p.x) * 0.1;
        p.y += (p.ty - p.y) * 0.1;
        const settled = Math.hypot(p.tx - p.x, p.ty - p.y) < 2;
        if (!settled) p.ch = Math.random() < 0.5 ? '0' : '1';
        p.a = p.dead ? p.a - 0.05 : Math.min(1, p.a + 0.08);
        ctx.fillStyle = `rgba(22,198,93,${Math.max(0, p.a)})`;
        ctx.fillText(p.ch, p.x, p.y);
      }
      requestAnimationFrame(loop);
    };
    loop();
  }
})();