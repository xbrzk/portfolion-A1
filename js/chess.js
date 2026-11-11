/* ==========================================================================
   XBRZKI — 3D HOLOGRAPHIC CHESS (hero, sisi kanan)
   Three.js (visual) + chess.js (aturan). Modul mandiri: hanya mengisi
   <div id="chess-hero"></div>. Tidak menyentuh kode lain di website.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Chess } from 'chess.js';

/* ----------------------------- KONFIGURASI ------------------------------ */
const CFG = {
  // Puzzle: putih jalan, skak mat maksimal dalam 7 langkah putih (lawan membela dengan baik).
  fen: '8/8/K2k4/7Q/8/8/8/8 w - - 0 1', // Raja+Menteri vs Raja: mat paksa terpendek = 6 langkah (batas 7 -> hanya 1 langkah cadangan)
  maxMoves: 7,
  title: 'CHESS PUZZLE',
  subtitle: '7-MOVE CHALLENGE',
  quote: ['“Not just a move,', 'but a masterpiece.”'],
  author: '— Xbrzki',
  difficulty: 'Legendary',
  reward: 'Achievement',
  accent: 0x22e58a,
  boardYaw: 0.42,     // rotasi papan (rad) agar perspektif seperti desain
  camFit: 5.9,        // setengah lebar adegan yang harus muat (naikkan = papan lebih kecil; jangan di bawah ~5.7 agar sudut papan tidak terpotong)
  screenFx: true,     // partikel hijau melayang memenuhi layar
  camElevation: 0.5, // sudut kamera (rad)
  maxDpr: 1.75,
};

const S = 1;      // ukuran satu kotak
const T = 0.24;   // ketebalan papan
const BOARD_Y = 1.7;

const sqXZ = (sq) => [(sq.charCodeAt(0) - 97 - 3.5) * S, (3.5 - (+sq[1] - 1)) * S];
const xzSq = (x, z) => {
  const f = Math.round(x / S + 3.5), r = Math.round(3.5 - z / S);
  return f < 0 || f > 7 || r < 0 || r > 7 ? null : String.fromCharCode(97 + f) + (r + 1);
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/* ------------------------------ GEOMETRI -------------------------------- */
function buildGeometries(seg) {
  const lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const BASE = [[0, 0], [.36, 0], [.38, .04], [.36, .09], [.28, .14]];
  const sph = (r, x, y, z) => new THREE.SphereGeometry(r, 12, 8).translate(x, y, z);
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const G = {};

  G.p = lathe([...BASE, [.17, .22], [.13, .4], [.19, .47], [.19, .51], [.13, .56],
    [.2, .62], [.23, .74], [.2, .86], [.1, .93], [0, .95]]);

  const rookBody = lathe([...BASE, [.2, .26], [.19, .7], [.28, .78], [.3, .84], [.3, 1.0], [0, 1.0]]);
  const posts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) posts.push(box(.12, .14, .12, sx * .19, 1.07, sz * .19));
  G.r = mergeGeometries([rookBody, ...posts]);

  G.b = mergeGeometries([
    lathe([...BASE, [.19, .24], [.12, .5], [.2, .62], [.14, .68], [.26, .82], [.24, 1.0],
      [.14, 1.2], [.04, 1.28], [0, 1.28]]),
    sph(.07, 0, 1.33, 0),
  ]);

  const crown = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    crown.push(sph(.055, Math.cos(a) * .24, 1.38, Math.sin(a) * .24));
  }
  G.q = mergeGeometries([
    lathe([...BASE, [.2, .24], [.14, .55], [.2, .7], [.15, .78], [.27, .98], [.3, 1.12],
      [.27, 1.28], [.14, 1.34], [0, 1.34]]),
    ...crown, sph(.09, 0, 1.47, 0),
  ]);

  G.k = mergeGeometries([
    lathe([...BASE, [.2, .24], [.14, .55], [.22, .72], [.16, .8], [.28, 1.0], [.3, 1.14],
      [.26, 1.3], [.12, 1.36], [0, 1.36]]),
    box(.1, .36, .1, 0, 1.55, 0), box(.27, .09, .1, 0, 1.58, 0),
  ]);

  // Kuda: alas lathe + kepala hasil extrude (menghadap +x)
  const h = new THREE.Shape();
  h.moveTo(-.26, .34); h.lineTo(.26, .34); h.lineTo(.21, .6); h.lineTo(.1, .78);
  h.lineTo(.34, .86); h.lineTo(.47, .98); h.lineTo(.44, 1.07); h.lineTo(.2, 1.2);
  h.lineTo(.07, 1.4); h.lineTo(-.04, 1.22); h.lineTo(-.28, .95); h.lineTo(-.26, .34);
  const head = new THREE.ExtrudeGeometry(h, { depth: .24, bevelEnabled: true, bevelSize: .04,
    bevelThickness: .04, bevelSegments: 2, curveSegments: 4 }).translate(0, 0, -.12);
  // ExtrudeGeometry tidak ber-index, jadi alas lathe dijadikan non-indexed sebelum digabung
  G.n = mergeGeometries([lathe([...BASE, [.3, .2], [.26, .34], [0, .34]]).toNonIndexed(), head]);
  return G;
}

/* ------------------------------- TEKSTUR -------------------------------- */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function ringMesh(r, w, color, opacity, dashes) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { c: { value: new THREE.Color(color) }, o: { value: opacity }, k: { value: dashes }, t: { value: 0 } },
    vertexShader: 'varying vec2 p; void main(){p=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 c; uniform float o,k,t; varying vec2 p; void main(){float a=atan(p.y,p.x)/6.2831853+.5; float d=k>0.?step(.38,fract(a*k+t)):1.; gl_FragColor=vec4(c,o*d);}',
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(r, r + w, 160, 1), m);
  mesh.rotation.x = -Math.PI / 2; mesh.userData.mat = m; return mesh;
}

/* --------------------------- AI & HINT (chess.js) ----------------------- */
const VAL = { q: 9, r: 5, b: 3, n: 3, p: 1 };

function pickReply(g) {
  let best = null, bs = -1e9;
  for (const m of g.moves({ verbose: true })) {
    let s = (m.captured ? VAL[m.captured] * 10 : 0) + Math.random() * 0.01;
    if (m.piece === 'k') s -= Math.hypot(m.to.charCodeAt(0) - 97 - 3.5, +m.to[1] - 1 - 3.5); // kabur ke tengah
    g.move(m);
    if (!g.isGameOver() && mateIn(g, 1)) s -= 100; // jangan melangkah ke mat dalam 1 langkah bila ada pilihan lain
    g.undo();
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}

function mateIn(g, n) { // sisi yang jalan mencari mat paksa dalam n langkah
  for (const m of g.moves({ verbose: true })) {
    g.move(m);
    let ok = false;
    if (g.isCheckmate()) ok = true;
    else if (n > 1 && !g.isGameOver()) {
      ok = true;
      for (const r of g.moves({ verbose: true })) {
        g.move(r); const w = mateIn(g, n - 1); g.undo();
        if (!w) { ok = false; break; }
      }
    }
    g.undo();
    if (ok) return m;
  }
  return null;
}

const kingSq = (g, color) => {
  for (const row of g.board()) for (const c of row) if (c && c.type === 'k' && c.color === color) return c.square;
};
const kdist = (a, b) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(a.charCodeAt(1) - b.charCodeAt(1)));

function heuristicMove(g) { // kurangi ruang gerak raja lawan tanpa menggantung bidak
  let best = null, bs = -1e9;
  for (const m of g.moves({ verbose: true })) {
    g.move(m);
    let s;
    if (g.isStalemate() || g.isDraw()) s = -1e3;
    else {
      const rep = g.moves({ verbose: true });
      s = -rep.length * 3 + (g.isCheck() ? 2 : 0) - (rep.some((r) => r.captured) ? 60 : 0);
      s -= 0.01 * kdist(kingSq(g, 'w'), kingSq(g, 'b')); // dekatkan raja sendiri
    }
    g.undo();
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}

const getHint = (fen) => { const g = new Chess(fen); return mateIn(g, 1) || mateIn(g, 2) || heuristicMove(g); };


/* ------------------------ PARTIKEL LAYAR PENUH -------------------------- */
function createScreenFx(color, low, host) {
  host = host || document.body;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.style.overflow = 'hidden';
  const c = document.createElement('canvas');
  c.className = 'xc-fx'; c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none',
    zIndex: '5', mixBlendMode: 'screen', opacity: '0', transition: 'opacity .6s ease' });
  host.insertBefore(c, host.firstChild);
  const g = c.getContext('2d');

  const spr = document.createElement('canvas'); spr.width = spr.height = 64;
  const sg = spr.getContext('2d'), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
  const tint = document.createElement('canvas'); tint.width = tint.height = 64;
  const tg = tint.getContext('2d'); tg.drawImage(spr, 0, 0);
  tg.globalCompositeOperation = 'source-in'; tg.fillStyle = color; tg.fillRect(0, 0, 64, 64);

  let W = 0, H = 0; const P = [];
  const mk = (any) => {
    const big = Math.random() < 0.14;
    return { x: Math.random() * W, y: any ? Math.random() * H : H + 20,
      r: big ? 7 + Math.random() * 12 : 1.2 + Math.random() * 3.2,
      vy: big ? 8 + Math.random() * 14 : 14 + Math.random() * 46,
      ph: Math.random() * 6.283, sw: 6 + Math.random() * 26,
      a: big ? 0.1 + Math.random() * 0.12 : 0.35 + Math.random() * 0.55, tw: 0.6 + Math.random() * 1.8 };
  };
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = Math.max(1, host.clientWidth); H = Math.max(1, host.clientHeight);
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(low ? 60 : 150, Math.round(W * H / 11000));
    while (P.length < n) P.push(mk(true));
    P.length = n;
  }
  function step(dt, t) {
    g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (const p of P) {
      p.y -= p.vy * dt;
      if (p.y < -30) { Object.assign(p, mk(false)); p.x = Math.random() * W; }
      const x = p.x + Math.sin(t * 0.5 * p.tw + p.ph) * p.sw;
      const al = p.a * (0.65 + 0.35 * Math.sin(t * p.tw * 2 + p.ph));
      const fade = Math.max(0, Math.min(1, (H - p.y) / 120, (p.y + 30) / 160));
      g.globalAlpha = Math.max(0, al * fade);
      const s = p.r * 2.6; g.drawImage(tint, x - s, p.y - s, s * 2, s * 2);
      if (p.r < 5) { g.fillStyle = '#d9ffec'; g.beginPath(); g.arc(x, p.y, p.r * 0.28, 0, 6.283); g.fill(); }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  resize(); const hro = new ResizeObserver(resize); hro.observe(host);
  return { step, show(v) { c.style.opacity = v ? '1' : '0'; }, destroy() { hro.disconnect(); c.remove(); } };
}

/* ================================ MOUNT ================================== */
export function mountChessHero(root, opts = {}) {
  const cfg = { ...CFG, ...opts };
  const ACC = new THREE.Color(cfg.accent);
  const accentCss = '#' + ACC.getHexString();

  const low = matchMedia('(pointer:coarse)').matches || innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = cfg.screenFx ? createScreenFx(accentCss, low, root.closest('section') || root) : null;

  /* ---------- DOM ---------- */
  root.classList.add('xc-root');
  root.style.setProperty('--xc-accent', accentCss);
  root.innerHTML = `
  <div class="xc-card">
    <canvas data-xc="canvas" aria-label="Interactive 3D chess board"></canvas>
    <header class="xc-head">
      <div class="xc-title">
        <svg class="xc-ico" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor" stroke="currentColor" stroke-width=".6" stroke-linejoin="round"><polygon points="6.8,17.1 17.2,17.1 16.2,13.3 14,10.7 18.8,9.5 21.4,7.8 20.8,6.5 16,4.6 13.4,1.7 11.2,4.3 6.4,8.2"/><rect x="5" y="18" width="14" height="3.6" rx=".6"/></g><circle cx="15" cy="6.9" r=".8" fill="#040b08"/></svg>
        <div><b>${cfg.title}</b><span>${cfg.subtitle}</span></div>
      </div>
      <div class="xc-hr">
        <div class="xc-tools">
          <button type="button" data-xc="undo" class="xc-ib" aria-label="Undo" title="Undo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button type="button" data-xc="restart" class="xc-ib" aria-label="Restart" title="Restart"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 108-8 8 8 0 00-5.7 2.4L4 8M4 3v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
        <div class="xc-pill" data-xc="pill"><i></i><span data-xc="status">YOUR TURN</span></div>
      </div>
    </header>
    <div class="xc-body">
      <aside class="xc-info">
        <div class="xc-a"><div class="xc-obj">OBJECTIVE</div>
        <h3>Checkmate in<span class="xc-big"><em data-xc="big">${cfg.maxMoves}</em> Moves</span></h3></div>
        <blockquote>${cfg.quote.join('<br>')}<cite>${cfg.author}</cite></blockquote>
        <dl>
          <div><svg viewBox="0 0 24 24" aria-hidden="true" class="xc-si"><path fill="currentColor" d="M5 21h14v-2.5H5V21zm1.5-4h11l-.9-7.5H18V4h-2.4v2h-2.1V4h-3v2H8.4V4H6v6.5h1.4L6.5 17z"/></svg><dt>Moves Left</dt><dd data-xc="left">${cfg.maxMoves}</dd></div>
          <div><svg viewBox="0 0 24 24" aria-hidden="true" class="xc-si xc-g"><rect x="3" y="14" width="4" height="7" rx=".6" fill="currentColor"/><rect x="10" y="9" width="4" height="12" rx=".6" fill="currentColor"/><rect x="17" y="4" width="4" height="17" rx=".6" fill="currentColor"/></svg><dt>Difficulty</dt><dd>${cfg.difficulty}</dd></div>
          <div><svg viewBox="0 0 24 24" aria-hidden="true" class="xc-si xc-g"><polygon fill="currentColor" points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6"/></svg><dt>Reward</dt><dd>${cfg.reward}</dd></div>
        </dl>
      </aside>
      <div class="xc-stage" data-xc="stage">
        <div class="xc-overlay" data-xc="overlay" hidden>
          <b data-xc="ot"></b><span data-xc="os"></span>
          <button type="button" data-xc="again">Play Again</button>
        </div>
        <div class="xc-fallback" data-xc="fallback" hidden>WebGL tidak tersedia di perangkat ini.</div>
      </div>
    </div>
    <footer class="xc-foot">
      <div class="xc-dots" data-xc="dots">${'<i></i>'.repeat(cfg.maxMoves)}</div>
      <span class="xc-count" data-xc="count">1 / ${cfg.maxMoves}</span>
      <div class="xc-btns">
        <button type="button" data-xc="hint" class="xc-cta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>Make Your Move</button>
      </div>
    </footer>
  </div>`;
  const $ = (n) => root.querySelector(`[data-xc="${n}"]`);
  const stage = $('stage'), canvas = $('canvas'), card = root.querySelector('.xc-card');

  /* ---------- RENDERER ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { $('fallback').hidden = false; console.warn('[chess-hero] WebGL gagal:', e); return { destroy() {} }; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const camTarget = new THREE.Vector3(0, 1.25, 0);
  let camDist = 17, px = 0, py = 0, cx = 0, cy = 0;

  scene.add(new THREE.AmbientLight(0x88ffcc, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 10, 6); scene.add(key);
  const under = new THREE.PointLight(ACC, 60, 14, 2); under.position.set(0, 0.9, 0); scene.add(under);

  /* ---------- MATERIAL ---------- */
  const Mat = low ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
  const glass = (o) => new Mat({ transparent: true, roughness: 0.08, metalness: 0.05, envMapIntensity: 1.5,
    ...(low ? {} : { clearcoat: 1, clearcoatRoughness: 0.05 }), ...o });
  const matPiece = {
    w: glass({ color: 0x59635f, opacity: 0.93, envMapIntensity: 0.9, emissive: 0x0a1411, emissiveIntensity: 0.4 }),
    b: glass({ color: 0x07985a, opacity: 0.94, envMapIntensity: 0.9, emissive: 0x022a1a, emissiveIntensity: 0.7 }),
  };
  const matMirror = {
    w: new THREE.MeshBasicMaterial({ color: 0x7d8a85, transparent: true, opacity: 0.14, depthWrite: false }),
    b: new THREE.MeshBasicMaterial({ color: 0x07985a, transparent: true, opacity: 0.18, depthWrite: false }),
  };

  /* ---------- PROYEKTOR + HOLOGRAM ---------- */
  const glowTex = glowTexture();
  const world = new THREE.Group(); scene.add(world);

  const proj = new THREE.Group(); world.add(proj);
  const metal = new THREE.MeshStandardMaterial({ color: 0x0b1310, metalness: 0.85, roughness: 0.38 });
  const addDisc = (r0, r1, h, y) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 64), metal); m.position.y = y; proj.add(m);
  };
  addDisc(3.9, 4.0, 0.16, -0.08); addDisc(3.1, 3.4, 0.14, 0.07); addDisc(2.3, 2.6, 0.12, 0.2);
  const glowMat = (o) => new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: o,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const rim = (r, y, o, w) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, w, 8, 128), glowMat(o));
    t.rotation.x = Math.PI / 2; t.position.y = y; proj.add(t);
  };
  rim(4.0, 0.0, 0.75, 0.03); rim(3.4, 0.14, 0.9, 0.035); rim(2.6, 0.26, 1, 0.04);
  [[0.8, 0.8, 0], [1.4, 0.65, 40], [2.0, 0.55, 0]].forEach(([r, o, d]) => {
    const f = ringMesh(r, 0.035, ACC, o, d); f.position.y = 0.275; proj.add(f);
  });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48),
    new THREE.MeshBasicMaterial({ map: glowTex, color: ACC, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  lens.rotation.x = -Math.PI / 2; lens.position.y = 0.28; proj.add(lens);
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(18, 18),
    new THREE.MeshBasicMaterial({ map: glowTex, color: ACC, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = -0.2; proj.add(floorGlow);

  const mkBeam = (k) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { t: { value: 0 }, c: { value: ACC }, k: { value: k } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float t,k; uniform vec3 c; varying vec2 vUv; void main(){float h=1.-vUv.y; float s=.7+.3*sin(vUv.x*6.2831853*18.+t*.8); gl_FragColor=vec4(c,pow(h,1.3)*.38*s*k);}',
  });
  const beamMats = [mkBeam(1), mkBeam(1.9)];
  const BH = BOARD_Y - 0.45;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 1.1, BH, 48, 1, true), beamMats[0]);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.35, BH, 32, 1, true), beamMats[1]);
  beam.position.y = core.position.y = 0.3 + BH / 2; world.add(beam, core);

  const rings = [
    { m: ringMesh(5.5, 0.05, ACC, 0.9, 0), y: BOARD_Y - 0.1, spin: 0 },
    { m: ringMesh(6.1, 0.035, ACC, 0.55, 48), y: BOARD_Y + 0.15, spin: 0.05 },
  ];
  rings.forEach((r) => { r.m.position.y = r.y; world.add(r.m); });

  const PN = low ? 60 : 140;
  const pPos = new Float32Array(PN * 3), pSpd = new Float32Array(PN);
  const spawn = (i, anyY) => {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 4.6;
    pPos[i * 3] = Math.cos(a) * r; pPos[i * 3 + 1] = anyY ? Math.random() * 4.2 : 0.3; pPos[i * 3 + 2] = Math.sin(a) * r;
    pSpd[i] = 0.25 + Math.random() * 0.5;
  };
  for (let i = 0; i < PN; i++) spawn(i, true);
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: glowTex, color: ACC, size: 0.2, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
  points.frustumCulled = false; points.visible = !fx; world.add(points);

  /* ---------- PAPAN ---------- */
  const boardGroup = new THREE.Group(); boardGroup.position.y = BOARD_Y; boardGroup.rotation.y = cfg.boardYaw; world.add(boardGroup);

  const sqGeo = new THREE.BoxGeometry(S * 0.985, T, S * 0.985);
  const darkSq = new THREE.InstancedMesh(sqGeo, glass({ color: 0x1b2321, opacity: 0.88, envMapIntensity: 1.0, emissive: 0x020a07, emissiveIntensity: 1 }), 32);
  const lightSq = new THREE.InstancedMesh(sqGeo, glass({ color: 0x08844c, opacity: 0.85, envMapIntensity: 1.0, emissive: 0x032a1a, emissiveIntensity: 0.8 }), 32);
  const m4 = new THREE.Matrix4(); let di = 0, li = 0;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    m4.setPosition((f - 3.5) * S, -T / 2, (3.5 - r) * S);
    ((f + r) % 2 === 0 ? darkSq.setMatrixAt(di++, m4) : lightSq.setMatrixAt(li++, m4));
  }
  boardGroup.add(darkSq, lightSq);

  const bars = [];
  for (const s of [-1, 1]) {
    bars.push(new THREE.BoxGeometry(8.5, T + 0.08, 0.26).translate(0, -T / 2 + 0.0, s * 4.12));
    bars.push(new THREE.BoxGeometry(0.26, T + 0.08, 8).translate(s * 4.12, -T / 2, 0));
  }
  const frameGeo = mergeGeometries(bars);
  boardGroup.add(new THREE.Mesh(frameGeo, glass({ color: 0x1a2421, opacity: 0.85, emissive: 0x06241a, emissiveIntensity: 1 })));
  boardGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(frameGeo),
    new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: 0.95 })));
  const plate = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.05, 8.5),
    new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
  plate.position.y = -T - 0.03; boardGroup.add(plate);

  /* ---------- HIGHLIGHT ---------- */
  const hlMat = new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const hlWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const hlRed = new THREE.MeshBasicMaterial({ color: 0xff4a3d, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const flat = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.visible = false; boardGroup.add(m); return m; };
  const dotPool = Array.from({ length: 32 }, () => flat(new THREE.CircleGeometry(0.15, 20), hlMat));
  const ringPool = Array.from({ length: 16 }, () => flat(new THREE.RingGeometry(0.36, 0.45, 28), hlMat));
  const selMark = flat(new THREE.PlaneGeometry(0.96, 0.96), hlMat); selMark.material = hlMat.clone(); selMark.material.opacity = 0.32;
  const hintMark = flat(new THREE.RingGeometry(0.3, 0.47, 32), hlWhite);
  const checkMark = flat(new THREE.PlaneGeometry(0.96, 0.96), hlRed);

  /* ---------- BIDAK ---------- */
  const GEO = buildGeometries(low ? 14 : 24);
  let pieces = new Map();       // square -> obj
  let pickables = [];
  const setY = (o, y) => { o.g.position.y = y; o.mirror.position.y = -2 * T - 2 * y; };
  const setPos = (o, x, y, z) => { o.g.position.x = x; o.g.position.z = z; setY(o, y); };

  function makePiece(type, color, sq) {
    const g = new THREE.Group();
    const main = new THREE.Mesh(GEO[type], matPiece[color]);
    const mirror = new THREE.Mesh(GEO[type], matMirror[color]);
    mirror.scale.y = -1; mirror.position.y = -2 * T;
    g.add(main, mirror);
    if (type === 'n') g.rotation.y = color === 'w' ? Math.PI / 2 : -Math.PI / 2;
    const o = { g, main, mirror, type, color, sq, ty: 0, busy: 0, dragging: false };
    main.userData.o = o;
    const [x, z] = sqXZ(sq); setPos(o, x, 0, z);
    boardGroup.add(g);
    return o;
  }

  const tweens = [];
  let dirty = true;
  const requestRender = () => { dirty = true; };
  function tween(dur, fn, done) {
    if (reduced || dur <= 0) { fn(1); done && done(); requestRender(); return; }
    tweens.push({ t: 0, dur, fn, done });
  }
  function moveTo(o, tx, tz, animate) {
    const fx = o.g.position.x, fy = o.g.position.y, fz = o.g.position.z;
    const arc = o.type === 'n' ? 0.55 : 0.28;
    o.busy++; o.ty = 0;
    tween(animate ? 380 : 0, (k) => {
      const e = ease(k);
      setPos(o, fx + (tx - fx) * e, fy * (1 - e) + Math.sin(Math.PI * k) * arc, fz + (tz - fz) * e);
    }, () => { o.busy--; });
  }
  function popIn(o, animate) {
    o.busy++; o.g.scale.setScalar(0.001);
    tween(animate ? 380 : 0, (k) => o.g.scale.setScalar(Math.max(0.001, ease(k))), () => { o.busy--; });
  }
  function fadeOut(o, animate) {
    o.busy++;
    tween(animate ? 320 : 0, (k) => { o.g.scale.setScalar(Math.max(0.001, 1 - ease(k))); setY(o, k * 0.5); },
      () => { boardGroup.remove(o.g); });
  }

  function sync(animate = true) {
    const want = new Map();
    for (const row of game.board()) for (const c of row) if (c) want.set(c.square, c);
    const next = new Map(), gone = [];
    for (const [sq, o] of pieces) {
      const w = want.get(sq);
      if (w && w.type === o.type && w.color === o.color) { next.set(sq, o); want.delete(sq); } else gone.push(o);
    }
    for (const [sq, w] of want) {
      const [tx, tz] = sqXZ(sq);
      let idx = -1, best = 1e9;
      gone.forEach((o, i) => {
        if (o.type === w.type && o.color === w.color) {
          const d = (o.g.position.x - tx) ** 2 + (o.g.position.z - tz) ** 2;
          if (d < best) { best = d; idx = i; }
        }
      });
      if (idx >= 0) { const o = gone.splice(idx, 1)[0]; o.sq = sq; next.set(sq, o); moveTo(o, tx, tz, animate); }
      else { const o = makePiece(w.type, w.color, sq); next.set(sq, o); popIn(o, animate); }
    }
    gone.forEach((o) => fadeOut(o, animate));
    pieces = next;
    pickables = [...pieces.values()].map((o) => o.main);
    requestRender();
  }

  /* ---------- STATE GAME ---------- */
  let game = new Chess(cfg.fen);
  const ME = game.turn();
  let left = cfg.maxMoves, state = 'play', thinking = false, timer = 0;
  let history = [], sel = null, legal = [], hint = null;

  function hideHL() { [...dotPool, ...ringPool, selMark, hintMark, checkMark].forEach((m) => (m.visible = false)); }
  function showHL() {
    hideHL();
    if (sel) {
      let d = 0, r = 0;
      const [sx, sz] = sqXZ(sel); selMark.position.set(sx, 0.012, sz); selMark.visible = true;
      for (const m of legal) {
        const [x, z] = sqXZ(m.to);
        const mesh = m.captured ? ringPool[r++] : dotPool[d++];
        if (mesh) { mesh.position.set(x, 0.012, z); mesh.visible = true; }
      }
    }
    if (hint) { const [x, z] = sqXZ(hint.to); hintMark.position.set(x, 0.014, z); hintMark.visible = true; }
    if (game.isCheck()) {
      for (const row of game.board()) for (const c of row)
        if (c && c.type === 'k' && c.color === game.turn()) { const [x, z] = sqXZ(c.square); checkMark.position.set(x, 0.01, z); checkMark.visible = true; }
    }
    requestRender();
  }
  function clearSel() { if (sel) { const o = pieces.get(sel); if (o) o.ty = 0; } sel = null; legal = []; hint = null; showHL(); }
  function select(sq) {
    clearSel(); sel = sq; legal = game.moves({ square: sq, verbose: true });
    const o = pieces.get(sq); if (o) o.ty = 0.22;
    showHL();
  }

  const dots = [...root.querySelectorAll('[data-xc="dots"] i')];
  function setStatus(txt, mode) { $('status').textContent = txt; $('pill').dataset.mode = mode || ''; }
  function hud() {
    const used = cfg.maxMoves - left;
    $('left').textContent = left;
    dots.forEach((d, i) => { d.className = i < used ? 'on' : i === used && state === 'play' ? 'cur' : ''; });
    $('count').textContent = `${Math.min(used + (state === 'play' ? 1 : 0), cfg.maxMoves)} / ${cfg.maxMoves}`;
    if (state === 'play') {
      if (thinking) setStatus('OPPONENT…', 'wait');
      else setStatus(game.isCheck() ? 'CHECK!' : 'YOUR TURN', game.isCheck() ? 'warn' : '');
    }
  }
  function end(kind) {
    state = kind === 'won' ? 'won' : 'lost'; thinking = false;
    const used = cfg.maxMoves - left;
    $('ot').textContent = kind === 'won' ? 'CHECKMATE' : kind === 'draw' ? 'DRAW' : 'OUT OF MOVES';
    $('os').textContent = kind === 'won' ? `Achievement unlocked — mate in ${used} move${used > 1 ? 's' : ''}`
      : kind === 'draw' ? 'Stalemate / drawn position. Try again.' : 'Checkmate not reached in time. Try again.';
    $('overlay').dataset.kind = kind === 'won' ? 'won' : 'lost'; $('overlay').hidden = false;
    setStatus(kind === 'won' ? 'CHECKMATE' : 'FAILED', kind === 'won' ? 'win' : 'lose');
    hud(); showHL();
  }

  function commit(mv) {
    const o = pieces.get(mv.from); if (o) o.dragging = false;
    history.push({ fen: game.fen(), left });
    clearSel();
    game.move({ from: mv.from, to: mv.to, promotion: 'q' });
    left--; sync(true);
    if (game.isCheckmate()) return end('won');
    if (game.isGameOver()) return end('draw');
    if (left <= 0) return end('lost');
    thinking = true; hud(); showHL();
    timer = setTimeout(() => {
      thinking = false;
      const r = pickReply(game);
      if (!r) return end('draw');
      game.move({ from: r.from, to: r.to, promotion: 'q' });
      sync(true);
      if (game.isGameOver()) return end('draw');
      hud(); showHL();
    }, reduced ? 120 : 650);
  }

  function reset(fen, l, h) {
    clearTimeout(timer); thinking = false; state = 'play'; $('overlay').hidden = true;
    game = new Chess(fen); left = l; history = h; clearSel(); sync(true); hud(); showHL();
  }
  const undo = () => { if (!history.length) return; const h = history.pop(); reset(h.fen, h.left, history); };
  const restart = () => reset(cfg.fen, cfg.maxMoves, []);
  function doHint() {
    if (state !== 'play' || thinking) return;
    const m = getHint(game.fen()); if (!m) return;
    select(m.from); hint = m; showHL();
  }
  $('undo').onclick = undo; $('restart').onclick = restart; $('again').onclick = restart; $('hint').onclick = doHint;

  /* ---------- INPUT ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hitP = new THREE.Vector3();
  function setRay(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  function planeLocal(e, lift) { // titik pada bidang horizontal, dalam koordinat lokal papan
    setRay(e); boardGroup.updateMatrixWorld();
    plane.set(new THREE.Vector3(0, 1, 0), -(boardGroup.position.y + lift));
    if (!ray.ray.intersectPlane(plane, hitP)) return null;
    return boardGroup.worldToLocal(hitP.clone());
  }
  function pickSquare(e) {
    setRay(e);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) return hit.object.userData.o.sq;
    const p = planeLocal(e, 0); return p ? xzSq(p.x, p.z) : null;
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'play' || thinking) return;
    const sq = pickSquare(e);
    if (!sq) { clearSel(); return; }
    const mv = sel && legal.find((m) => m.to === sq);
    if (mv) { commit(mv); return; }
    const p = game.get(sq);
    if (p && p.color === ME && game.turn() === ME) {
      select(sq); drag = { sq, id: e.pointerId, x: e.clientX, y: e.clientY, active: false };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    } else clearSel();
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    px = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1); py = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    requestRender();
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.active && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7) {
      drag.active = true; const o = pieces.get(drag.sq); if (o) o.dragging = true;
    }
    if (drag.active) {
      const o = pieces.get(drag.sq), p = planeLocal(e, 0.7);
      if (o && p) setPos(o, p.x, 0.7, p.z);
    }
  });
  const endDrag = (e, cancelled) => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag; drag = null;
    if (!d.active) return;
    const o = pieces.get(d.sq); if (o) o.dragging = false;
    const p = !cancelled && planeLocal(e, 0), tsq = p ? xzSq(p.x, p.z) : null;
    const mv = tsq && legal.find((m) => m.to === tsq);
    if (mv) commit(mv);
    else if (o) { const [x, z] = sqXZ(d.sq); moveTo(o, x, z, true); o.ty = 0.22; }
  };
  canvas.addEventListener('pointerup', (e) => endDrag(e, false));
  canvas.addEventListener('pointercancel', (e) => endDrag(e, true));
  canvas.addEventListener('pointerleave', () => { px = 0; py = 0; requestRender(); });

  /* ---------- RESIZE & LOOP ---------- */
  // Canvas menutupi SELURUH kartu (tanpa sambungan/gradasi). Papan diposisikan di area .xc-stage
  // lewat view offset kamera, sehingga tetap di tempat yang sama walau kartu mengecil.
  function resize() {
    const cr = card.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const W = Math.max(1, Math.round(cr.width)), H = Math.max(1, Math.round(cr.height));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1.25 : cfg.maxDpr));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const rw = Math.max(1, sr.width), rh = Math.max(1, sr.height);
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camDist = Math.max(cfg.camFit / (tanH * rw / H), 2.9 / (tanH * rh / H)) * 1.04;
    const dx = sr.left - cr.left + rw / 2 - W / 2, dy = sr.top - cr.top + rh / 2 - H / 2;
    camera.setViewOffset(W, H, -dx, -dy, W, H);
    camera.updateProjectionMatrix(); requestRender();
  }
  const ro = new ResizeObserver(resize); ro.observe(stage); ro.observe(card);

  let visible = true;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; requestRender(); }, { threshold: 0.01 });
  io.observe(root);

  let last = performance.now(), time = 0, raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (fx) fx.show(visible && !document.hidden);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;

    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; tw.t += dt * 1000;
      const k = Math.min(1, tw.t / tw.dur); tw.fn(k);
      if (k >= 1) { tweens.splice(i, 1); tw.done && tw.done(); }
      dirty = true;
    }
    for (const o of pieces.values()) {
      if (o.busy || o.dragging) continue;
      const dy = o.ty - o.g.position.y;
      if (Math.abs(dy) > 0.002) { setY(o, o.g.position.y + dy * Math.min(1, dt * 14)); dirty = true; }
    }

    if (!reduced) {
      time += dt;
      boardGroup.position.y = BOARD_Y + Math.sin(time * 1.1) * 0.05;
      beamMats.forEach((m) => (m.uniforms.t.value = time));
      rings.forEach((r) => { if (r.spin) r.m.userData.mat.uniforms.t.value += r.spin * dt; });
      lens.material.opacity = 0.85 + Math.sin(time * 2) * 0.15;
      const a = pGeo.attributes.position;
      for (let i = 0; i < PN; i++) {
        pPos[i * 3 + 1] += pSpd[i] * dt;
        if (pPos[i * 3 + 1] > 4.4) spawn(i, false);
      }
      a.needsUpdate = true; dirty = true;
      if (fx) fx.step(dt, time);
    }
    if (dirty) {
      cx += (px - cx) * Math.min(1, dt * 4); cy += (py - cy) * Math.min(1, dt * 4);
      const yaw = cx * 0.14, el = cfg.camElevation + cy * 0.05;
      camera.position.set(Math.sin(yaw) * Math.cos(el) * camDist, camTarget.y + Math.sin(el) * camDist, Math.cos(yaw) * Math.cos(el) * camDist);
      camera.lookAt(camTarget);
      renderer.render(scene, camera);
      dirty = reduced ? Math.abs(px - cx) + Math.abs(py - cy) > 0.002 : false;
    }
  }

  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = () => setMotion(!mq.matches);
  mq.addEventListener?.('change', onMq);
  const onEvt = (e) => setMotion(!!e.detail);
  window.addEventListener('xbrzki:motion', onEvt);
  function setMotion(on) { reduced = !on; requestRender(); }

  resize(); sync(false); hud(); showHL();
  if (fx) fx.step(0, 0);
  raf = requestAnimationFrame(frame);

  return {
    setMotion, restart, undo,
    destroy() {
      cancelAnimationFrame(raf); clearTimeout(timer); ro.disconnect(); io.disconnect(); if (fx) fx.destroy();
      mq.removeEventListener?.('change', onMq); window.removeEventListener('xbrzki:motion', onEvt);
      renderer.dispose(); pmrem.dispose(); envTex.dispose(); root.innerHTML = '';
    },
  };
}

/* Auto-mount */
const host = document.getElementById('chess-hero');
if (host) window.XbrzkiChess = mountChessHero(host);