/* =========================================================================
   XBRZKI — KUDA API 3D  (WebGL murni, tanpa library, tanpa bingkai)
   - Foto kuda dijadikan relief 3D (bagian terang timbul), bisa dimiringkan
     dengan mouse / sentuhan, dan melayang pelan saat didiamkan.
   - Api: lidah api bergoyang, kilau berdenyut, mata menyala, bara hijau naik.
   - Latar hitam foto otomatis transparan, jadi tidak ada kotak/bingkai.
   Foto dicari otomatis di assets/img/ (lihat daftar CANDIDATES).
   ========================================================================= */
(function () {
  'use strict';

  var root = document.getElementById('horse3d');
  if (!root) return;

  /* ---- Daftar nama file yang dicoba (urut). Taruh fotonya di assets/img/ ---- */
  var NAMES = ['kuda-api', 'kuda_api', 'kuda', 'horse', 'fire-horse', 'contact-preview'];
  var EXTS  = ['.jpg', '.jpeg', '.png', '.webp', '.jfif', '.avif'];
  var CANDIDATES = [];
  NAMES.forEach(function (n) { EXTS.forEach(function (e) { CANDIDATES.push('assets/img/' + n + e); }); });

  /* ---- Pengaturan (aman diubah) ---- */
  var CFG = {
    win: [0.20, 0.80],      // bagian foto yang dipakai (kiri, kanan) 0..1
    depth: 0.24,            // kedalaman relief 3D
    tilt: 0.36,             // sudut miring maksimum (radian)
    embers: 90,             // jumlah bara
    flame: 1.0              // kekuatan goyangan api
  };
  var EYE = [0.443, 0.335]; // posisi mata pada foto (0..1, y dari atas)

  var canvas = root.querySelector('canvas');
  var fallback = root.querySelector('.horse3d-fallback');
  var gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true }) ||
         canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: true });
  } catch (e) { gl = null; }

  /* ---------- muat foto (coba beberapa nama) ---------- */
  function loadImage(done) {
    var i = 0, img = new Image();
    img.onload = function () { done(img); };
    img.onerror = function () { i++; if (i < CANDIDATES.length) img.src = CANDIDATES[i]; else done(null); };
    img.src = CANDIDATES[0];
  }

  function showFallback(img) {
    root.classList.add('no-gl');
    if (img && fallback) { fallback.src = img.src; fallback.hidden = false; }
    else root.classList.add('no-img');
  }

  loadImage(function (img) {
    if (!img) { showFallback(null); return; }
    if (!gl) { showFallback(img); return; }
    try { start(img); } catch (err) { if (window.console) console.warn('[horse3d]', err); showFallback(img); }
  });

  /* ======================================================================= */
  function start(img) {
    var NOISE = [
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
      ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
      'float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(11.3,7.1);a*=.5;}return s;}'
    ].join('\n');

    var VS_MESH = [
      'precision highp float;',
      'attribute vec2 aP;',                 // -1..1
      'uniform mat4 uM; uniform sampler2D uTex; uniform vec2 uWin; uniform float uAsp, uDepth, uT;',
      'varying vec2 vT; varying vec2 vP;',
      NOISE,
      'void main(){',
      '  vec2 q = aP*.5+.5;',
      '  vT = vec2(mix(uWin.x,uWin.y,q.x), 1.-q.y);',
      '  float l = 0.;',                                              // rata-rata banyak titik = relief halus
      '  for(int i=-2;i<=2;i++){for(int j=-2;j<=2;j++){',
      '    l += dot(texture2D(uTex, vT + vec2(float(i),float(j))*.0075).rgb, vec3(.299,.587,.114));}}',
      '  l /= 25.;',
      '  float z = smoothstep(.04,.6,l)*uDepth + (fbm(vec2(vT.x*4.,vT.y*3.-uT*1.2))-.5)*.025*smoothstep(.1,.5,l);',
      '  vP = aP;',
      '  gl_Position = uM * vec4(aP.x*uAsp, aP.y, z, 1.);',
      '}'
    ].join('\n');

    var FS_MESH = [
      'precision highp float;',
      'varying vec2 vT; varying vec2 vP;',
      'uniform sampler2D uTex; uniform float uT, uFlame, uPulse; uniform vec2 uEye;',
      NOISE,
      'float lum(vec3 c){return dot(c, vec3(.299,.587,.114));}',
      'void main(){',
      '  vec3 b = texture2D(uTex, vT).rgb;',
      '  float m = smoothstep(.2,.7,lum(b));',                              // area api / terang
      '  float n = fbm(vec2(vT.x*10., vT.y*8. - uT*1.7));',
      '  float n2 = fbm(vec2(vT.x*16.+3., vT.y*12. - uT*2.6));',
      '  vec2 off = vec2((n-.5)*.020, (n2-.5)*.034 - .006) * m * uFlame;', // api goyang & naik
      '  vec3 c = texture2D(uTex, vT + off).rgb;',
      '  float fl = .78 + .5*fbm(vec2(vT.x*13., vT.y*9. - uT*2.9));',       // kerlip
      '  float mm = smoothstep(.18,.75,lum(c));',
      '  c *= mix(1., fl, mm);',
      '  c += vec3(.05,.62,.20) * mm * pow(fl,3.) * .30 * uPulse;',          // pijar
      '  float d = distance(vT, uEye);',
      '  c += vec3(.35,1.,.5) * exp(-d*d*1500.) * (.55 + .45*sin(uT*3.2)) * 1.1;', // mata menyala
      '  c *= 1.0 + .12*sin(uT*1.7)*uPulse;',
      '  vec2 e = abs(vP);',
      '  float edge = (1.-smoothstep(.80,1.,e.x)) * (1.-smoothstep(.82,1.,e.y));', // tanpa tepi tegas
      '  c = clamp(c, 0., 1.) * edge;',
      '  float a = max(c.r, max(c.g, c.b));',
      '  gl_FragColor = vec4(c, a);',
      '}'
    ].join('\n');

    var VS_EMB = [
      'precision highp float;',
      'attribute vec4 aE;',                  // x0, phase, speed, size
      'uniform mat4 uM; uniform float uT, uAsp, uDpr;',
      'varying float vA;',
      'void main(){',
      '  float life = fract(aE.y + uT*aE.z);',
      '  float x = aE.x*.62*uAsp + sin(uT*1.3 + aE.y*40.)*.06*life + (aE.x)*.10*life;',
      '  float y = -.62 + life*1.55;',
      '  float z = .22 + sin(aE.y*20.)*.15;',
      '  vA = smoothstep(0.,.12,life) * (1.-smoothstep(.55,1.,life));',
      '  gl_Position = uM * vec4(x, y, z, 1.);',
      '  gl_PointSize = aE.w * uDpr * (1.0 - .45*life);',
      '}'
    ].join('\n');

    var FS_EMB = [
      'precision mediump float;',
      'varying float vA;',
      'void main(){',
      '  float d = length(gl_PointCoord-.5)*2.;',
      '  float g = pow(max(1.-d,0.),2.2);',
      '  vec3 col = mix(vec3(.15,1.,.4), vec3(.85,1.,.9), g*g);',
      '  float a = g * vA;',
      '  gl_FragColor = vec4(col*a, a);',
      '}'
    ].join('\n');

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function prog(vs, fs) {
      var p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      return p;
    }

    /* vertex texture fetch tidak ada di sebagian HP lama -> relief dimatikan, api tetap jalan */
    var vtf = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0;
    var pm = prog(vtf ? VS_MESH : VS_MESH.replace('texture2D(uTex, vT).rgb', 'vec3(.4)'), FS_MESH);
    var pe = prog(VS_EMB, FS_EMB);

    /* ---- grid bidang ---- */
    var NX = 110, NY = 110, pos = [], idx = [];
    for (var y = 0; y <= NY; y++) for (var x = 0; x <= NX; x++) pos.push(x / NX * 2 - 1, y / NY * 2 - 1);
    for (y = 0; y < NY; y++) for (x = 0; x < NX; x++) {
      var a = y * (NX + 1) + x, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    var vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    var ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

    /* ---- bara ---- */
    var low = matchMedia('(pointer:coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
    var NE = low ? Math.round(CFG.embers * .6) : CFG.embers, em = [];
    for (var i = 0; i < NE; i++) em.push(Math.random() * 2 - 1, Math.random(), .07 + Math.random() * .16, 2 + Math.random() * (Math.random() < .2 ? 9 : 5));
    var ebo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ebo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(em), gl.STATIC_DRAW);

    /* ---- tekstur ---- */
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var asp = (img.naturalWidth * (CFG.win[1] - CFG.win[0])) / img.naturalHeight;   // lebar/tinggi bidang
    root.style.setProperty('--horse-aspect', asp.toFixed(3));

    var U = function (p, n) { return gl.getUniformLocation(p, n); };
    var um = { M: U(pm, 'uM'), Tex: U(pm, 'uTex'), Win: U(pm, 'uWin'), Asp: U(pm, 'uAsp'), Depth: U(pm, 'uDepth'), T: U(pm, 'uT'),
               Flame: U(pm, 'uFlame'), Pulse: U(pm, 'uPulse'), Eye: U(pm, 'uEye') };
    var ue = { M: U(pe, 'uM'), T: U(pe, 'uT'), Asp: U(pe, 'uAsp'), Dpr: U(pe, 'uDpr') };
    var aP = gl.getAttribLocation(pm, 'aP'), aE = gl.getAttribLocation(pe, 'aE');

    /* ---- matriks ---- */
    function persp(f, a, n, fr) { var t = 1 / Math.tan(f / 2), nf = 1 / (n - fr);
      return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fr + n) * nf, -1, 0, 0, 2 * fr * n * nf, 0]; }
    function mul(a, b) { var o = new Array(16);
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
    function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
    function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
    function trans(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; }

    /* ---- ukuran ---- */
    var dpr = 1, W = 1, H = 1;
    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
      W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    }
    var ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas); else addEventListener('resize', resize);
    resize();

    /* ---- gerak: pointer / sentuh / melayang ---- */
    var tx = 0, ty = 0, rx = 0, ry = 0, hover = false;
    function point(e) {
      var r = root.getBoundingClientRect();
      var nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      ty = Math.max(-1, Math.min(1, nx)) * CFG.tilt; tx = Math.max(-1, Math.min(1, ny)) * CFG.tilt * .7; hover = true;
    }
    root.addEventListener('pointermove', point);
    root.addEventListener('pointerdown', point);
    root.addEventListener('pointerleave', function () { hover = false; });
    root.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') hover = false; });

    var motion = true, visible = true, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    addEventListener('xbrzki:motion', function (e) { motion = !!e.detail; if (!motion) draw(0); else kick(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }, { threshold: .01 }).observe(root);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

    var raf = 0, t0 = performance.now(), last = t0, T = 0;
    function draw(dt) {
      T += dt;
      var idleY = Math.sin(T * .55) * .26, idleX = Math.sin(T * .41 + 1.3) * .08;
      if (!hover) { ty += (idleY - ty) * Math.min(1, dt * 1.2); tx += (idleX - tx) * Math.min(1, dt * 1.2); }
      ry += (ty - ry) * Math.min(1, dt * 6 + .02); rx += (tx - rx) * Math.min(1, dt * 6 + .02);
      var bob = Math.sin(T * .9) * .035;

      var P = persp(40 * Math.PI / 180, W / H, .1, 20);
      var M = mul(P, mul(trans(0, bob, -3.25), mul(rotX(rx), rotY(ry))));

      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(pm);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(um.Tex, 0); gl.uniformMatrix4fv(um.M, false, new Float32Array(M));
      gl.uniform2f(um.Win, CFG.win[0], CFG.win[1]); gl.uniform1f(um.Asp, asp); gl.uniform1f(um.Depth, vtf ? CFG.depth : 0);
      gl.uniform1f(um.T, T); gl.uniform1f(um.Flame, reduce ? .3 : CFG.flame);
      gl.uniform1f(um.Pulse, .75 + .25 * Math.sin(T * 2.1));
      var ex = (EYE[0] - CFG.win[0]) / (CFG.win[1] - CFG.win[0]);
      gl.uniform2f(um.Eye, CFG.win[0] + ex * (CFG.win[1] - CFG.win[0]), EYE[1]);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      gl.disableVertexAttribArray(aP);

      /* bara hijau naik (aditif) */
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(pe);
      gl.uniformMatrix4fv(ue.M, false, new Float32Array(M)); gl.uniform1f(ue.T, T); gl.uniform1f(ue.Asp, asp); gl.uniform1f(ue.Dpr, dpr);
      gl.bindBuffer(gl.ARRAY_BUFFER, ebo); gl.enableVertexAttribArray(aE); gl.vertexAttribPointer(aE, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, NE);
      gl.disableVertexAttribArray(aE);
    }

    function loop(now) {
      raf = 0;
      if (!motion || !visible || document.hidden) return;
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && motion && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }

    root.classList.add('ready');
    draw(0); if (reduce) { motion = false; draw(0); } else kick();
    root.__horse = { draw: draw };
  }
})();