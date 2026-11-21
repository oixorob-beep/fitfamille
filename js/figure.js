/* FitFamille — mannequin 3D (rendu canvas maison, sans bibliothèque, fonctionne hors ligne).
   Les poses sont décrites par des angles dans le plan du mouvement ; on les convertit en 3D
   (membres gauche/droit décalés en profondeur), puis on projette en perspective. */
window.FF = window.FF || {};
FF.Fig = (() => {
  const L = { torso: 52, neck: 14, head: 10, ua: 26, fa: 24, th: 36, sh: 36 };
  const GY = 172, FLOOR = 176, AX = 150;
  const SW = 11, HW = 7;                         // demi-largeur épaules / hanches
  const RD = { hip: 7.2, chest: 8.6, shoulder: 5.2, hipbar: 6.2, thigh: 6, knee: 4.8, ankle: 3.6, arm: 4.2, fore: 3.4, neck: 3.4, hand: 3.8, foot: 5 };
  const rad = d => d * Math.PI / 180;
  const dir = a => [Math.sin(rad(a)), Math.cos(rad(a))];
  const D0 = { t: 180, h: 0, an: [0, 0], af: [0, 0], ln: [0, 0], lf: [0, 0] };
  const full = p => Object.assign({}, D0, p);
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Cinématique : angles -> points 2D du plan du mouvement ---------- */
  function mix(A, B, k) {
    A = full(A); B = full(B);
    const o = { t: lerp(A.t, B.t, k), h: lerp(A.h, B.h, k) };
    for (const key of ['an', 'af', 'ln', 'lf']) o[key] = [lerp(A[key][0], B[key][0], k), lerp(A[key][1], B[key][1], k)];
    return o;
  }
  function geo(ex, P) {
    const f = ex.fig;
    const add = (a, ang, len) => { const d = dir(ang); return [a[0] + d[0] * len, a[1] + d[1] * len]; };
    const p = [0, 0];
    const s = add(p, P.t, L.torso);
    const hd = add(s, P.t + P.h, L.neck);
    const en = add(s, P.an[0], L.ua), hn = add(en, P.an[1], L.fa);
    const ef = add(s, P.af[0], L.ua), hf = add(ef, P.af[1], L.fa);
    const kn = add(p, P.ln[0], L.th), fn = add(kn, P.ln[1], L.sh);
    const kf = add(p, P.lf[0], L.th), ff = add(kf, P.lf[1], L.sh);
    const pts = { p, s, hd, en, hn, ef, hf, kn, fn, kf, ff };
    const ground = f.ground || ['fn', 'ff'];
    const my = Math.max(...ground.map(k => pts[k][1]));
    const dx = (f.ax != null ? f.ax : AX) - pts[f.anchor || 'fn'][0];
    const dy = (f.gy != null ? f.gy : GY) - my;
    for (const k in pts) pts[k] = [pts[k][0] + dx, pts[k][1] + dy];
    return pts;
  }

  /* ---------- Couleurs (lues dans le thème CSS, clair ou sombre) ---------- */
  function cssColor(name, fb) {
    let v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) { }
    return parse(v || fb);
  }
  function parse(v) {
    if (v[0] === '#') {
      let h = v.slice(1); if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    const m = v.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
  }
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a == null ? 1 : a})`;
  function palette() {
    return {
      body: cssColor('--brand', '#0b8f64'), head: cssColor('--accent', '#e8590c'),
      floor: cssColor('--line', '#dbe3dd'), bg: cssColor('--surface2', '#ecf1ed'), ink: cssColor('--ink', '#17211b')
    };
  }
  const palKey = p => [p.body, p.head, p.floor, p.bg].map(c => c.join(',')).join('|');

  /* ---------- Scène : points 2D -> primitives 3D ---------- */
  function scene(ex, pts) {
    const front = !!ex.fig.front;
    const P3 = (q, z) => front ? [0, FLOOR - q[1], (q[0] - AX) + z] : [q[0] - AX, FLOOR - q[1], z];
    const caps = [], balls = [];
    const cap = (a, b, ra, rb, kind) => caps.push({ a, b, ra, rb, kind });
    const { p, s, hd } = pts;
    const tv = [P3(s, 0)[0] - P3(p, 0)[0], P3(s, 0)[1] - P3(p, 0)[1]];
    const tl = Math.hypot(tv[0], tv[1]) || 1;
    const face = [tv[1] / tl, -tv[0] / tl];                // direction « devant » du buste dans le plan XY
    cap(P3(p, 0), P3(s, 0), RD.hip, RD.chest, 'body');
    cap(P3(p, -HW), P3(p, HW), RD.hipbar, RD.hipbar, 'body');
    cap(P3(s, -SW), P3(s, SW), RD.shoulder, RD.shoulder, 'body');
    cap(P3(s, 0), P3(hd, 0), RD.neck, RD.neck, 'body');
    const limb = (names, z, r1, r2) => {
      const [a, b, c] = names;                              // racine, milieu, extrémité
      cap(P3(pts[a], z), P3(pts[b], z), r1[0], r1[1], 'body');
      cap(P3(pts[b], z), P3(pts[c], z), r2[0], r2[1], 'body');
    };
    limb(['s', 'ef', 'hf'], -SW, [RD.arm, RD.arm * .85], [RD.fore, RD.fore * .9]);
    limb(['p', 'kf', 'ff'], -HW, [RD.thigh, RD.knee], [RD.knee, RD.ankle]);
    balls.push({ c: P3(pts.hf, -SW), r: RD.hand, kind: 'body' }, { c: P3(pts.ff, -HW), r: RD.foot, kind: 'body' });
    limb(['s', 'en', 'hn'], SW, [RD.arm, RD.arm * .85], [RD.fore, RD.fore * .9]);
    limb(['p', 'kn', 'fn'], HW, [RD.thigh, RD.knee], [RD.knee, RD.ankle]);
    balls.push({ c: P3(pts.hn, SW), r: RD.hand, kind: 'body' }, { c: P3(pts.fn, HW), r: RD.foot, kind: 'body' });
    const hc = P3(hd, 0);
    balls.push({ c: hc, r: L.head, kind: 'head' });
    balls.push({ c: [hc[0] + face[0] * L.head * .82, hc[1] + face[1] * L.head * .82, hc[2]], r: 3.4, kind: 'visor' });
    return { caps, balls, hip: P3(p, 0) };
  }

  /* ---------- Caméra ---------- */
  function boundsOf(ex) {
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i <= 8; i++) {
      const sc = scene(ex, geo(ex, mix(ex.fig.A, ex.fig.B, i / 8)));
      sc.balls.concat(sc.caps.flatMap(c => [{ c: c.a, r: c.ra }, { c: c.b, r: c.rb }])).forEach(o => {
        for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], o.c[k] - o.r); mx[k] = Math.max(mx[k], o.c[k] + o.r); }
      });
    }
    (ex.fig.props3 || []).forEach(b => {
      mn = [Math.min(mn[0], b.box[0]), Math.min(mn[1], b.box[2]), Math.min(mn[2], b.box[4])];
      mx = [Math.max(mx[0], b.box[1]), Math.max(mx[1], b.box[3]), Math.max(mx[2], b.box[5])];
    });
    mn[1] = Math.min(mn[1], 0);
    const T = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    let Rh = 0; // rayon horizontal autour de la cible
    for (const x of [mn[0], mx[0]]) for (const z of [mn[2], mx[2]]) Rh = Math.max(Rh, Math.hypot(x - T[0], z - T[2]));
    return { T, Rh, Rv: (mx[1] - mn[1]) / 2 };
  }
  function makeCam(ex, W, H, yaw, pitch) {
    const b = ex.__bounds || (ex.__bounds = boundsOf(ex));
    const zoom = Math.min(W / (2 * (b.Rh + 6)), H / (2 * (b.Rv + 6))) * 1.0;
    const D = Math.max(b.Rh, b.Rv) * 5;
    return { T: b.T, yaw, pitch, D, zoom, cx: W / 2, cy: H / 2 + 6, Rh: b.Rh };
  }
  function proj(P, cam) {
    const x = P[0] - cam.T[0], y = P[1] - cam.T[1], z = P[2] - cam.T[2];
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const sx = x * cy - z * sy;
    const su = -x * sp * sy + y * cp - z * sp * cy;
    const dist = cam.D - (x * cp * sy + y * sp + z * cp * cy);
    const k = cam.D / dist * cam.zoom;
    return { x: cam.cx + sx * k, y: cam.cy - su * k, k, dist };
  }

  /* ---------- Dessin ---------- */
  const LIGHT = [-0.55, -0.83];                           // direction de la lumière à l'écran (haut-gauche)
  const LW = (() => { const v = [-0.4, 0.85, 0.5], n = Math.hypot(...v); return v.map(x => x / n); })();
  const FACES = [[0, 1, 3, 2, 0, 0, -1], [4, 5, 7, 6, 0, 0, 1], [0, 2, 6, 4, -1, 0, 0], [1, 3, 7, 5, 1, 0, 0], [0, 1, 5, 4, 0, -1, 0], [2, 3, 7, 6, 0, 1, 0]];

  function draw(ctx, W, H, ex, pose, cam, pal) {
    ctx.clearRect(0, 0, W, H);
    const sc = scene(ex, geo(ex, pose));
    const dmin = cam.D - cam.Rh * 1.4, dmax = cam.D + cam.Rh * 1.4;
    const fog = d => clamp((d - dmin) / (dmax - dmin), 0, 1) * 0.28;

    /* sol : disque + anneaux + ombre portée */
    const Rg = cam.Rh * 1.3, cT = [cam.T[0], 0, cam.T[2]];
    const ring = (r, c, cx, cz) => { ctx.beginPath(); for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, q = proj([cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r], cam); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); } ctx.closePath(); };
    ring(Rg, 0, cT[0], cT[2]); ctx.fillStyle = rgba(mixc(pal.floor, pal.bg, 0.15), 0.75); ctx.fill();
    ctx.strokeStyle = rgba(mixc(pal.floor, pal.ink, 0.15), 0.9); ctx.lineWidth = 1.5; ctx.stroke();
    ring(Rg * 0.55, 0, cT[0], cT[2]); ctx.strokeStyle = rgba(pal.floor, 0.9); ctx.lineWidth = 1; ctx.stroke();
    ring(Math.max(26, cam.Rh * 0.42), 0, sc.hip[0], sc.hip[2]); ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fill();

    /* primitives triées du plus loin au plus proche */
    const items = [];
    sc.caps.forEach(c => { const A = proj(c.a, cam), B = proj(c.b, cam); items.push({ t: 'cap', d: (A.dist + B.dist) / 2, A, B, ra: c.ra, rb: c.rb }); });
    sc.balls.forEach(b => { const A = proj(b.c, cam); items.push({ t: 'ball', d: A.dist, A, r: b.r, kind: b.kind }); });
    (ex.fig.props3 || []).forEach(pr => {
      const [x1, x2, y1, y2, z1, z2] = pr.box;
      const V = []; for (let i = 0; i < 8; i++) V.push(proj([i & 1 ? x2 : x1, i & 2 ? y2 : y1, i & 4 ? z2 : z1], cam));
      FACES.forEach(f => {
        const vs = f.slice(0, 4).map(i => V[i]), n = f.slice(4);
        items.push({ t: 'face', d: vs.reduce((a, v) => a + v.dist, 0) / 4, vs, b: 0.55 + 0.45 * Math.max(0, n[0] * LW[0] + n[1] * LW[1] + n[2] * LW[2]), alpha: pr.alpha || 1, col: pr.col || [150, 130, 105] });
      });
    });
    items.sort((a, b) => b.d - a.d);

    const white = [255, 255, 255], black = [0, 0, 0];
    items.forEach(it => {
      if (it.t === 'face') {
        ctx.beginPath(); it.vs.forEach((v, i) => i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)); ctx.closePath();
        ctx.fillStyle = rgba(mixc(black, it.col, it.b), it.alpha); ctx.fill();
        ctx.strokeStyle = rgba(mixc(black, it.col, it.b * 0.7), Math.min(1, it.alpha + 0.15)); ctx.lineWidth = 1; ctx.stroke();
      } else if (it.t === 'cap') {
        const base = mixc(pal.body, pal.bg, fog(it.d));
        const r1 = it.ra * it.A.k, r2 = it.rb * it.B.k;
        const dx = it.B.x - it.A.x, dy = it.B.y - it.A.y, len = Math.hypot(dx, dy);
        let nx = len > 0.01 ? -dy / len : LIGHT[0], ny = len > 0.01 ? dx / len : LIGHT[1];
        if (nx * LIGHT[0] + ny * LIGHT[1] < 0) { nx = -nx; ny = -ny; }
        const g = ctx.createLinearGradient(it.A.x + nx * r1, it.A.y + ny * r1, it.A.x - nx * r1, it.A.y - ny * r1);
        g.addColorStop(0, rgba(mixc(base, white, 0.42))); g.addColorStop(0.45, rgba(base)); g.addColorStop(1, rgba(mixc(base, black, 0.4)));
        ctx.fillStyle = g; ctx.beginPath();
        ctx.arc(it.A.x, it.A.y, r1, 0, Math.PI * 2); ctx.moveTo(it.B.x + r2, it.B.y); ctx.arc(it.B.x, it.B.y, r2, 0, Math.PI * 2);
        if (len > 0.01) { ctx.moveTo(it.A.x + nx * r1, it.A.y + ny * r1); ctx.lineTo(it.B.x + nx * r2, it.B.y + ny * r2); ctx.lineTo(it.B.x - nx * r2, it.B.y - ny * r2); ctx.lineTo(it.A.x - nx * r1, it.A.y - ny * r1); ctx.closePath(); }
        ctx.fill();
      } else {
        const r = it.r * it.A.k;
        const col = it.kind === 'head' ? pal.head : it.kind === 'visor' ? mixc(pal.head, black, 0.55) : pal.body;
        const base = mixc(col, pal.bg, fog(it.d));
        const g = ctx.createRadialGradient(it.A.x + LIGHT[0] * r * 0.4, it.A.y + LIGHT[1] * r * 0.4, r * 0.1, it.A.x, it.A.y, r * 1.05);
        g.addColorStop(0, rgba(mixc(base, white, 0.5))); g.addColorStop(0.55, rgba(base)); g.addColorStop(1, rgba(mixc(base, black, 0.42)));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(it.A.x, it.A.y, r, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  /* ---------- API publique ---------- */
  const baseYaw = ex => rad(ex.fig.front ? 90 : 28);

  const thumbCache = {};
  /* Miniature statique (pose d'effort, vue 3/4) sous forme d'image */
  function thumb(ex) {
    const pal = palette(), key = ex.id + '|' + palKey(pal);
    if (!thumbCache[key]) {
      const W = 300, H = 200, S = 2, cv = document.createElement('canvas');
      cv.width = W * S; cv.height = H * S;
      const ctx = cv.getContext('2d'); ctx.scale(S, S);
      draw(ctx, W, H, ex, mix(ex.fig.A, ex.fig.B, 1), makeCam(ex, W, H, baseYaw(ex) + rad(ex.fig.front ? 0 : 6), 0.3), pal);
      thumbCache[key] = cv.toDataURL('image/png');
    }
    return `<img class="th3d" src="${thumbCache[key]}" alt="" draggable="false">`;
  }

  /* Modèle 3D animé et orientable (glisser = tourner, double-clic = recentrer) */
  function mount(el, ex, opts) {
    opts = opts || {};
    el.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.className = 'fig3d'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Modèle 3D : ' + ex.nom + ' (glisse pour tourner)');
    el.appendChild(cv);
    const ctx = cv.getContext('2d');
    const token = {}; el.__fig = token;
    const still = reduced();
    const period = opts.period || ex.fig.period || 2400;
    const st = { manual: null, pitch: 0.28, drag: null, W: 0, H: 0 };
    let pal = palette(), t0 = performance.now();

    function size() {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w !== st.W || h !== st.H) { st.W = w; st.H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      return true;
    }
    function paint(now) {
      if (!size()) return;
      const k = still ? 1 : (1 - Math.cos(((now - t0) % period) / period * 2 * Math.PI)) / 2;
      const yaw = st.manual != null ? st.manual : baseYaw(ex) + (still ? 0 : rad(40) * Math.sin((now - t0) / 7000 * Math.PI * 2));
      draw(ctx, st.W, st.H, ex, mix(ex.fig.A, ex.fig.B, k), makeCam(ex, st.W, st.H, yaw, st.pitch), pal);
    }
    function frame(now) {
      if (!el.isConnected || el.__fig !== token) return;
      paint(now);
      requestAnimationFrame(frame);
    }
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      const now = performance.now();
      const cur = st.manual != null ? st.manual : baseYaw(ex) + (still ? 0 : rad(40) * Math.sin((now - t0) / 7000 * Math.PI * 2));
      st.drag = { x: e.clientX, y: e.clientY, yaw: cur, pitch: st.pitch };
      st.manual = cur;
    });
    cv.addEventListener('pointermove', e => {
      if (!st.drag) return;
      st.manual = st.drag.yaw + (e.clientX - st.drag.x) * 0.012;
      st.pitch = clamp(st.drag.pitch + (e.clientY - st.drag.y) * 0.006, 0.02, 0.85);
      if (still) paint(performance.now());
    });
    const end = () => { st.drag = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('dblclick', () => { st.manual = null; st.pitch = 0.28; if (still) paint(performance.now()); });
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (!el.isConnected) ro.disconnect(); else if (still) paint(performance.now()); }); ro.observe(el); }
    paint(performance.now());
    if (!still) requestAnimationFrame(frame);
  }

  return { thumb, mount, geo, mix };
})();
