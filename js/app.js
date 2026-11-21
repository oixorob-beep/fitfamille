/* FitFamille — application (profils, 5 onglets, feuilles de détail) */
(() => {
  'use strict';
  const { EXOS, SESSIONS, WEEK, SLOTS, SLOT_OFFSET, MEALS, FAST, FAST_STAGES, TIPS, EXT_KINDS, GROUP_NAMES } = FF.data;
  const PL = FF.Plan;
  const U = FF.U, C = FF.calc, St = FF.Store, esc = U.esc;
  const $ = (s, el = document) => el.querySelector(s);
  const UI = { tab: 'today', mealDate: U.ds(), exCat: 'Tous', exQ: '', suivi: 'eau', sheet: null, iv: null, mealTab: 'menu', shopDays: 7, pantryQ: '' };
  const P = () => St.active();
  const today = () => U.ds();
  const COLORS = ['#0b8f64', '#1c6fdc', '#e8590c', '#8e44ad', '#d6336c', '#0f8b8d', '#a16207'];
  const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const exo = id => EXOS.find(e => e.id === id);

  const ICONS = {
    today: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>',
    meals: '<path d="M4 3v7a3 3 0 0 0 3 3v8M7 3v7M10 3v7a3 3 0 0 1-3 3M18 21V3c-2.5 1.5-4 4.5-4 8h4"/>',
    ex: '<path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/>',
    fast: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2h5M12 2v3"/>',
    suivi: '<path d="M12 3s6.5 6.6 6.5 11a6.5 6.5 0 0 1-13 0C5.5 9.6 12 3 12 3z"/><path d="M9.5 14.5a2.7 2.7 0 0 0 2.5 2.7"/>'
  };
  const TABS = [['today', 'Aujourd\'hui'], ['meals', 'Repas'], ['ex', 'Exercices'], ['fast', 'Jeûne'], ['suivi', 'Suivi']];

  /* ---------- Utilitaires ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }
  const saveOrWarn = () => { if (!St.save()) toast('Stockage du navigateur indisponible : données non enregistrées.'); };
  const ring = (pct, cls, inner, extra) => {
    const c = 2 * Math.PI * 36, k = U.clamp(pct, 0, 1);
    return `<div class="ring ${cls || ''} ${extra || ''}"><svg viewBox="0 0 84 84" aria-hidden="true"><circle class="bg" cx="42" cy="42" r="36"/><circle class="fg" cx="42" cy="42" r="36" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - k)).toFixed(1)}"/></svg><div>${inner}</div></div>`;
  };
  const bar = (pct, cls) => `<div class="bar ${cls || ''}"><i style="width:${Math.round(U.clamp(pct, 0, 1) * 100)}%"></i></div>`;
  const ico = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
  const kg = v => U.n1(v) + ' kg';

  /* ---------- Accès aux journaux ---------- */
  const waterList = (p, d) => p.log.water[d] || [];
  const waterTotal = (p, d) => waterList(p, d).reduce((a, e) => a + e.ml, 0);
  const mealLog = (p, d, create) => {
    if (!p.log.meals[d] && create) p.log.meals[d] = { sw: {}, eaten: {}, custom: {}, extras: [], pick: {} };
    return p.log.meals[d];
  };
  const dayPlan = (p, d) => PL.dayFor(p, d);
  const eveningExt = (p, d) => PL.extFor(p, d).find(e => U.toMin(e.start) >= 17 * 60);
  const GCLS = { jambes: 'brand', haut: 'accent', dos: 'water', abdos: 'warn', cardio: '' };
  const chipsHtml = L => PL.chips(L).map(g => `<span class="badge ${GCLS[g]}">${esc(GROUP_NAMES[g])}</span>`).join(' ');

  /* Journal des séances : une journée peut contenir plusieurs parties (séance, cours, marche…) */
  function recalc(s) {
    s.min = s.parts.reduce((a, x) => a + x.min, 0); s.kcal = s.parts.reduce((a, x) => a + x.kcal, 0);
    s.titles = s.parts.map(x => x.titre);
    s.load = s.parts.reduce((a, x) => PL.maxL(a, x.load || PL.zero()), PL.zero());
    s.done = s.parts.length > 0;
  }
  function sessionOf(p, d) {
    const s = p.log.sessions[d]; if (!s) return null;
    if (!s.parts) s.parts = [{ titre: (s.titles || []).join(' + ') || 'Séance', min: s.min || 0, kcal: s.kcal || 0 }];
    return s;
  }

  /* Créneaux de repas selon le jeûne choisi */
  function slotPlan(p, d) {
    const w = C.fastCfg(p, FAST, d);
    let plan;
    if (!w) plan = SLOTS.map(s => ({ id: s.id, time: s.time }));
    else {
      let ids = SLOTS.map(s => s.id);
      if (w.start >= 630) ids = ids.filter(i => i !== 'petitdej');
      const last = w.end - 90, n = ids.length;
      plan = ids.map((id, i) => ({ id, time: Math.round((w.start + (last - w.start) * (n === 1 ? 0 : i / (n - 1))) / 15) * 15 }));
    }
    /* Cours le soir : dîner léger avant, collation protéinée de récupération après */
    const ev = eveningExt(p, d);
    if (ev) {
      const st = U.toMin(ev.start), en = U.toMin(ev.end);
      plan.forEach(x => {
        if (x.id === 'diner') { x.time = Math.min(x.time, st - 90); x.nom = 'Dîner léger (avant le cours)'; }
        if (x.id === 'collation') { x.time = en + 15; x.nom = 'Collation de récupération'; x.pool = 'recup'; x.ico = '💪'; }
      });
      plan.sort((a, b) => a.time - b.time);
    }
    return plan;
  }
  function menuFor(p, d) {
    const log = mealLog(p, d) || { sw: {}, eaten: {}, custom: {}, extras: [] };
    const dn = U.dayNum(d);
    const items = slotPlan(p, d).map(pl => {
      const lib = FF.Pantry.pool(p, pl.pool || pl.id);
      const picked = log.pick && log.pick[pl.id] ? lib.find(r => r.id === log.pick[pl.id]) : null;
      /* Menu automatique : on privilégie les recettes les mieux couvertes par le garde-manger.
         Le jour fait tourner dans le groupe de tête ; « Autre idée » descend ensuite dans le classement. */
      const rk = FF.Pantry.ranked(p, lib), sw = log.sw[pl.id] || 0;
      const idx = rk.active
        ? ((((dn + SLOT_OFFSET[pl.id]) % rk.top) + sw) % lib.length + lib.length) % lib.length
        : (((dn + SLOT_OFFSET[pl.id] + sw) % lib.length) + lib.length) % lib.length;
      const frozen = !!(log.fz && log.fz[pl.id]);
      return Object.assign({}, pl, { meta: Object.assign({}, SLOTS.find(s => s.id === pl.id), pl.nom ? { nom: pl.nom } : {}, pl.ico ? { ico: pl.ico } : {}), meal: picked || rk.list[idx], picked: !!picked && !frozen, auto: rk.active && !picked && sw === 0 });
    });
    const base = items.reduce((a, i) => a + i.meal.kcal, 0);
    const target = C.kcal(p).target;
    const scale = U.clamp(Math.round(target / base * 20) / 20, 0.75, 1.6);
    let eatenK = 0, eatenP = 0;
    items.forEach(it => {
      it.kcal = Math.round(it.meal.kcal * scale / 5) * 5; it.prot = Math.round(it.meal.p * scale);
      it.eaten = !!log.eaten[it.id]; it.custom = log.custom[it.id] || null;
      if (it.eaten) { eatenK += it.custom ? it.custom.kcal : it.kcal; eatenP += it.custom ? (it.custom.p || 0) : it.prot; }
    });
    (log.extras || []).forEach(x => { eatenK += x.kcal; eatenP += x.p || 0; });
    return { items, scale, target, eatenK, eatenP, extras: log.extras || [] };
  }

  /* Jeûne : état courant */
  function fastStatus(p) {
    const w = C.fastCfg(p, FAST, today()); if (!w) return null;
    const n = new Date(), m = n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
    const d = (((m - w.start) % 1440) + 1440) % 1440, eatMin = w.eat * 60;
    if (d < eatMin) return { state: 'eat', w, elapsed: d, remaining: eatMin - d, pct: d / eatMin };
    const fe = d - eatMin;
    return { state: 'fast', w, elapsed: fe, remaining: w.fast * 60 - fe, pct: fe / (w.fast * 60) };
  }
  const fastWindowText = w => `Repas de ${U.hm(w.start)} à ${U.hm(w.end)} · jeûne de ${U.hm(w.end)} à ${U.hm(w.start)}`;
  function fastStreak(p) {
    let d = today(), n = 0;
    if (!p.log.fastDone[d]) d = U.addDays(d, -1);
    while (p.log.fastDone[d]) { n++; d = U.addDays(d, -1); }
    return n;
  }

  /* ---------- Feuilles (modales) ---------- */
  function openSheet(html, opts) {
    opts = opts || {};
    UI.sheet = opts;
    $('#sheet-root').innerHTML = `<div class="scrim" ${opts.lock ? '' : 'data-act="closeSheet"'}></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    document.body.classList.add('lock');
    const f = $('#sheet-root input:not([type=hidden]), #sheet-root select');
    if (f && opts.focus) f.focus();
  }
  function closeSheet() {
    $('#sheet-root').innerHTML = ''; UI.sheet = null;
    if (!FF.Player.isOpen()) document.body.classList.remove('lock');
  }
  const sheetHead = (title, closable = true) => `<div class="sheet-head"><h2>${title}</h2>${closable ? '<button class="icon-btn" data-act="closeSheet" aria-label="Fermer">✕</button>' : ''}</div>`;

  /* ---------- Rendu général ---------- */
  function renderHeader() {
    const p = P();
    $('#hdr').innerHTML = `<div class="app-name"><i aria-hidden="true">💪</i>FitFamille</div>` + (p
      ? `<button class="who" data-act="profiles" aria-label="Changer de profil"><span class="avatar" style="background:${p.color}">${esc(p.name.charAt(0).toUpperCase())}</span><span>${esc(p.name)}</span></button>` : '');
  }
  function renderNav() {
    $('#nav').innerHTML = `<div class="nav-in">` + TABS.map(([k, n]) => `<button data-act="tab" data-t="${k}" ${UI.tab === k ? 'aria-current="page"' : ''}>${ico(k)}<span>${n}</span></button>`).join('') + `</div>`;
  }
  function render() {
    renderHeader();
    const p = P();
    clearInterval(UI.iv);
    if (!p) { $('#main').innerHTML = ''; $('#nav').innerHTML = ''; if (!UI.sheet) openWelcome(); return; }
    renderNav();
    const V = { today: viewToday, meals: viewMealsRoot, ex: viewEx, fast: viewFast, suivi: viewSuivi };
    $('#main').innerHTML = V[UI.tab](p);
    if (UI.tab === 'ex') renderExGrid();
    FF.Pantry.after();
    if (UI.tab === 'fast' && C.fastCfg(p, FAST)) {
      UI.iv = setInterval(() => { const el = $('#fast-live'); if (el && P()) el.innerHTML = fastLive(P()); }, 1000);
    }
  }

  /* ================= ONGLET : AUJOURD'HUI ================= */
  function viewToday(p) {
    const d = today(), now = new Date();
    const dp = dayPlan(p, d), def = dp.def, sess = def ? FF.Session.build(def, p, d) : null, ext = dp.ext;
    const done = sessionOf(p, d);
    const hr = now.getHours();
    const greet = hr < 12 ? 'Bonjour' : hr < 18 ? 'Bon après-midi' : 'Bonsoir';
    const menu = menuFor(p, d), kc = C.kcal(p);
    const wT = C.water(p, d), wN = waterTotal(p, d);
    const cur = C.curWeight(p);
    const checks = p.log.checks[d] || {};
    const fs = fastStatus(p);
    const goals = [
      { t: dp.rest ? 'Jour de repos : récupère bien' : (ext.length && !def ? `Faire mon cours (${ext[0].name})` : 'Faire ma séance'), on: dp.rest || !!(done && done.done), auto: true, sub: dp.rest ? 'Le repos fait partie du programme' : '' },
      { t: `Boire ${U.n1(wT / 1000)} L d'eau`, on: wN >= wT, auto: true, sub: `${U.n1(wN / 1000)} L bus` },
      { t: 'Rester dans mes calories', on: menu.eatenK > 0 && menu.eatenK <= menu.target * 1.05, auto: true, sub: `${menu.eatenK} / ${menu.target} kcal` },
      { t: 'Pauses actives au bureau', on: !!checks.walk, k: 'walk', sub: '2 min debout ou marche, toutes les heures' }
    ];
    if (fs) goals.push({ t: 'Tenir mon jeûne', on: !!p.log.fastDone[d], k: 'fast', sub: C.fastCfg(p, FAST).model === 'libre' ? 'Jeûne libre' : 'Modèle ' + C.fastCfg(p, FAST).model });
    const nDone = goals.filter(g => g.on).length;

    /* Semaine */
    const mon = U.mondayOf(d);
    const week = Array.from({ length: 7 }, (_, i) => {
      const dd = U.addDays(mon, i), dw = U.parse(dd).getDay();
      const s = p.log.sessions[dd], isT = dd === d;
      const cl = (isT ? 'today ' : '') + (s && s.done ? 'done' : dd >= d ? 'plan' : '');
      return `<div class="day ${cl}" title="${esc(U.longDate(dd))}"><span>${DOW[dw]}</span><b>${U.parse(dd).getDate()}</b><span class="dot"></span></div>`;
    }).join('');
    const nWeek = Array.from({ length: 7 }, (_, i) => p.log.sessions[U.addDays(mon, i)]).filter(s => s && s.done).length;
    const planRows = Array.from({ length: 7 }, (_, i) => {
      const dd = U.addDays(mon, i), x = dayPlan(p, dd), s = p.log.sessions[dd];
      const label = [x.ext.map(e => `${esc(e.name)} ${esc(e.start)}`).join(' + '), x.def ? esc(x.def.titre) : ''].filter(Boolean).join(' + ');
      return `<div class="plan-row ${dd === d ? 'today' : ''}"><b>${['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][x.wd]}</b><span>${label}</span>${s && s.done ? '<span class="ok" aria-label="fait">✓</span>' : ''}</div>`;
    }).join('');

    /* Séance */
    const extCard = ext.map(e => {
      const k = EXT_KINDS[e.kind] || EXT_KINDS.sculpt, mins = PL.extMinutes(e);
      const isDone = !!(done && done.parts.some(x => x.id === e.id));
      return `<div class="card">
        <div class="row between"><div><span class="badge water">Cours · ${esc(e.start)} – ${esc(e.end)}</span><h2 style="margin-top:6px">${esc(e.name)}</h2><p class="muted">${esc(k.nom)} · ${mins} min</p></div><span style="font-size:2rem" aria-hidden="true">🏋️</span></div>
        <div>${chipsHtml(PL.loadOfExt(e))}</div>
        ${isDone ? '<div class="note ok">✅ Cours fait : bravo !</div>' : (U.toMin(e.start) >= 17 * 60 ? `<div class="note">Ce soir : mange léger vers ${U.hm(U.toMin(e.start) - 90)}, bois bien, et prévois une collation protéinée après le cours (voir l'onglet Repas).</div>` : '')}
        <button class="btn ${isDone ? '' : 'primary'} xl block" data-act="extDone" data-id="${e.id}">${isDone ? '✓ Fait (annuler)' : "J'ai fait mon cours ✓"}</button>
        <div class="row wrap"><button class="btn sm" data-act="startSession" data-id="mobi">Mobilité 12 min en échauffement</button><button class="btn sm ghost" data-act="chooseSession">Je n'y vais pas : autre séance</button></div></div>`;
    }).join('');
    const restCard = dp.rest ? `<div class="card">
        <div class="row between"><div><span class="badge">Repos</span><h2 style="margin-top:6px">Jour de récupération</h2><p class="muted">C'est pendant le repos que les muscles se renforcent.</p></div><span style="font-size:2rem" aria-hidden="true">🛋️</span></div>
        <p>Une marche de 20 min ou 12 min de mobilité restent possibles, sans obligation.</p>
        <div class="row wrap"><button class="btn sm" data-act="startSession" data-id="mobi">Mobilité 12 min</button><button class="btn sm ghost" data-act="chooseSession">Faire une séance quand même</button></div></div>` : '';
    const adaptNote = def && dp.note ? `<div class="note">📅 ${esc(dp.note)}</div>` : '';
    let sessionCard = '';
    if (!def) sessionCard = '';
    else if (def.type === 'activity') {
      sessionCard = `<div class="card">
        <div class="row between"><div><span class="badge accent">Séance du jour</span><h2 style="margin-top:6px">${esc(def.titre)}</h2><p class="muted">${esc(def.focus)}</p></div><span style="font-size:2rem" aria-hidden="true">🚶</span></div>
        ${done && done.done ? `<div class="note ok">✅ Fait aujourd'hui : ${done.min} min · ≈ ${done.kcal} kcal</div>` : ''}
        <label class="field"><span>Durée de la marche</span><select id="walkmin">${[20, 30, 45, 60, 90].map(m => `<option ${m === 45 ? 'selected' : ''} value="${m}">${m} minutes</option>`).join('')}</select></label>
        <button class="btn primary xl block" data-act="walkDone">J'ai marché ✓</button>
        <div class="row wrap"><button class="btn sm" data-act="startSession" data-id="mobi">Ajouter 12 min de mobilité</button><button class="btn sm ghost" data-act="chooseSession">Changer de séance</button></div></div>`;
    } else {
      const rows = sess.items.map(it => { const e = exo(it.ex); return `<button class="exrow" data-act="openEx" data-id="${e.id}"><span class="th">${FF.Fig.thumb(e)}</span><span><span class="t">${esc(e.nom)}</span><br><span class="d">${esc(FF.Session.dose(it))}</span></span></button>`; }).join('');
      sessionCard = `<div class="card">
        <div class="row between"><div><span class="badge accent">${done && done.done ? 'Séance faite ✓' : 'Séance du jour'}</span><h2 style="margin-top:6px">${esc(def.titre)}</h2><p class="muted">${esc(def.focus)}</p></div>
          <div class="center"><div style="font-size:1.6rem;font-weight:800;color:var(--accent)">${sess.minutes}</div><div class="muted small">min</div></div></div>
        ${done && done.done ? `<div class="note ok">✅ ${esc((done.titles || []).join(' + '))} — ${done.min} min · ≈ ${done.kcal} kcal</div>` : ''}
        <p class="muted small">${sess.rounds} tour${sess.rounds > 1 ? 's' : ''} · repos ${sess.rest} s · échauffement ${sess.warm ? 'inclus (1 min)' : 'non inclus'}${sess.capped ? ' · raccourcie pour tenir dans ton temps disponible' : ''}</p>
        <div class="list">${rows}</div>
        <button class="btn primary xl block" data-act="startSession" data-id="${def.id}">▶ ${done && done.done ? 'Refaire la séance' : 'Démarrer la séance'}</button>
        <div class="row wrap">${def.id !== 'express' ? '<button class="btn sm" data-act="startSession" data-id="express">⚡ Version Express 8 min</button>' : ''}<button class="btn sm ghost" data-act="chooseSession">Changer de séance</button></div></div>`;
    }

    const remain = cur - p.goal;
    const goalTxt = remain > 0.2 ? `Plus que <b>${U.n1(remain)} kg</b> avant ton objectif` : 'Objectif de poids atteint 🎉';
    const goalsHtml = goals.map(g => g.k
      ? `<button class="item check ${g.on ? 'on' : ''}" data-act="toggleCheck" data-k="${g.k}" aria-pressed="${g.on}"><span class="ico">✓</span><span class="grow"><span class="t">${esc(g.t)}</span><br><span class="muted small">${esc(g.sub || '')}</span></span></button>`
      : `<div class="item ${g.on ? 'on' : ''}"><span class="ico">✓</span><span class="grow"><span class="t">${esc(g.t)}</span><br><span class="muted small">${esc(g.sub || 'Se coche automatiquement')}</span></span></div>`).join('');

    return `
      <section class="card brand">
        <div class="row between"><div class="grow"><p class="muted">${esc(U.longDate(d))}</p><h1 style="font-size:1.5rem;margin:2px 0 6px">${greet}, ${esc(p.name)} 👋</h1><p>${goalTxt}</p></div>
        ${ring(nDone / goals.length, '', `${nDone}/${goals.length}<small>objectifs</small>`, 'on-brand')}</div>
      </section>
      <div class="grid3">
        <button class="mini" data-act="tab" data-t="meals"><span class="k">Calories</span><span class="v">${menu.eatenK}</span>${bar(menu.eatenK / menu.target, menu.eatenK > menu.target * 1.05 ? 'over' : 'accent')}<span class="muted small">sur ${menu.target} kcal</span></button>
        <button class="mini" data-act="tab" data-t="suivi" data-s="eau"><span class="k">Eau</span><span class="v">${U.n1(wN / 1000)} L</span>${bar(wN / wT, 'water')}<span class="muted small">sur ${U.n1(wT / 1000)} L</span></button>
        <button class="mini" data-act="tab" data-t="suivi" data-s="poids"><span class="k">Poids</span><span class="v">${U.n1(cur)}</span>${bar(1 - Math.max(0, remain) / Math.max(1, Math.abs(p.log.weights.length ? C.weights(p)[0].kg - p.goal : 10)))}<span class="muted small">objectif ${U.n1(p.goal)} kg</span></button>
      </div>
      ${fs ? `<button class="mini" data-act="tab" data-t="fast"><span class="k">Jeûne ${esc(C.fastCfg(p, FAST).model === 'libre' ? 'libre' : C.fastCfg(p, FAST).model)}</span><span class="v">${fs.state === 'fast' ? '⏳ En jeûne' : '🍽 Fenêtre de repas'}</span><span class="muted small">${fs.state === 'fast' ? 'Fin dans ' : 'Fermeture dans '}${U.dur(fs.remaining * 60)}</span></button>` : ''}
      ${extCard}${adaptNote}${sessionCard}${restCard}
      <section class="card">
        <div class="sec-title" style="padding:0"><h2>Mes objectifs du jour</h2></div>
        <div class="list">${goalsHtml}</div>
      </section>
      <section class="card">
        <div class="row between"><h2>Cette semaine</h2><span class="muted small">${nWeek} séance${nWeek > 1 ? 's' : ''} faite${nWeek > 1 ? 's' : ''}</span></div>
        <div class="week">${week}</div>
        <div class="plan">${planRows}</div>
        <button class="btn block" data-act="planning">📅 Planning détaillé et mes cours</button>
      </section>
      <section class="card flat"><h3>💡 Le conseil du jour</h3><p>${esc(TIPS[U.dayNum(d) % TIPS.length])}</p></section>
      <p class="muted small center">Les valeurs sont des estimations indicatives et ne remplacent pas l'avis d'un médecin.</p>`;
  }

  /* ================= ONGLET : REPAS ================= */
  function viewMealsRoot(p) {
    const t = UI.mealTab || 'menu';
    const seg = `<div class="seg" role="group" aria-label="Section repas">${[['menu', '🍽 Menu'], ['pantry', '🥫 Garde-manger'], ['shop', '🛒 Courses']].map(([k, l]) => `<button aria-pressed="${t === k}" data-act="mealTab" data-s="${k}">${l}</button>`).join('')}</div>`;
    const hint = t === 'menu' && FF.Pantry.ensure(p).pantry.length ? '<p class="muted small center">🥫 Menu composé en priorité avec ce qu\'il y a dans ton garde-manger.</p>' : '';
    return seg + hint + (t === 'pantry' ? FF.Pantry.viewPantry(p) : t === 'shop' ? FF.Pantry.viewShop(p) : viewMeals(p));
  }
  function viewMeals(p) {
    const d = UI.mealDate, isToday = d === today();
    const menu = menuFor(p, d), ml = mealLog(p, d);
    const left = menu.target - menu.eatenK;
    const protT = C.protein(p);
    const w = C.fastCfg(p, FAST, d), evM = eveningExt(p, d);
    const slots = menu.items.map(it => {
      const c = it.custom;
      return `<article class="card slot ${it.eaten ? 'eaten' : ''}">
        <div class="row between"><div class="row"><span class="ico" aria-hidden="true">${it.meta.ico}</span><div><div class="nm">${it.meta.nom}</div><div class="muted small">vers ${U.hm(it.time)}</div></div></div>
          <span class="kc">${c ? c.kcal : it.kcal} kcal</span></div>
        <div><b>${esc(c ? c.name : it.meal.n)}</b>${c ? ' <span class="badge">Perso</span>' : ' ' + FF.Pantry.badge(p, it.meal)}${it.picked ? ' <span class="badge">Choisi</span>' : ''}
          <p class="muted small">${c ? (c.p ? c.p + ' g de protéines' : '') : esc(it.meal.d) + ' · ' + it.prot + ' g de protéines' + (menu.scale !== 1 ? ' · portion ×' + U.n1(menu.scale) : '')}</p></div>
        <div class="row wrap">
          <button class="btn sm ${it.eaten ? '' : 'primary'}" data-act="mealToggle" data-slot="${it.id}" aria-pressed="${it.eaten}">${it.eaten ? '✓ Mangé (annuler)' : 'J\'ai mangé'}</button>
          ${c ? `<button class="btn sm" data-act="mealCustomClear" data-slot="${it.id}">Revenir au menu</button>` : `<button class="btn sm" data-act="mealSwap" data-slot="${it.id}">↻ Autre idée</button>`}
          <button class="btn sm" data-act="slotRecipes" data-slot="${it.id}">🍳 Recettes</button>
          <button class="btn sm ghost" data-act="mealCustom" data-slot="${it.id}">J'ai mangé autre chose</button>
        </div></article>`;
    }).join('');
    const extras = menu.extras.map(x => `<div class="item"><span class="grow"><b>${esc(x.name)}</b><br><span class="muted small">${x.kcal} kcal${x.p ? ' · ' + x.p + ' g prot.' : ''}</span></span><button class="icon-btn" data-act="extraDel" data-id="${x.id}" aria-label="Supprimer ${esc(x.name)}">✕</button></div>`).join('');
    const clsNote = evM ? `<div class="note ok">🏋️ Jour de cours (${esc(evM.name)} ${esc(evM.start)}–${esc(evM.end)}) : dîner léger avant, collation protéinée de récupération après.</div>` : '';
    const shiftNote = w && w.shifted ? `<div class="note">Ta fenêtre de repas est décalée de ${U.n1(w.shifted / 60)} h aujourd'hui pour ton cours : ${esc(U.hm(w.start))} – ${esc(U.hm(w.end))}.</div>` : '';
    const skipped = w && w.start >= 630 ? `<div class="note">Avec ton jeûne (${esc(fastWindowText(w))}), le petit-déjeuner est remplacé : on répartit tes repas dans la fenêtre.</div>` : '';
    return `
      <div class="row between"><button class="icon-btn" data-act="mealPrev" aria-label="Jour précédent">‹</button>
        <div class="center"><h2 style="text-transform:capitalize">${isToday ? 'Aujourd\'hui' : esc(U.longDate(d))}</h2>${isToday ? `<p class="muted small">${esc(U.longDate(d))}</p>` : '<button class="btn sm ghost" data-act="mealToday">Revenir à aujourd\'hui</button>'}</div>
        <button class="icon-btn" data-act="mealNext" aria-label="Jour suivant">›</button></div>
      <section class="card">
        <div class="row between"><div><span class="muted small">Calories mangées</span><div style="font-size:1.8rem;font-weight:800">${menu.eatenK} <span class="muted" style="font-size:1rem">/ ${menu.target} kcal</span></div></div>
          ${ring(menu.eatenK / menu.target, left < -menu.target * .05 ? 'accent' : '', `${left >= 0 ? left : '+' + (-left)}<small>${left >= 0 ? 'restantes' : 'en trop'}</small>`)}</div>
        ${bar(menu.eatenK / menu.target, menu.eatenK > menu.target * 1.05 ? 'over' : '')}
        <div class="grid2"><div class="stat"><b>${menu.eatenP} g</b><span>protéines (objectif ≈ ${protT} g)</span></div><div class="stat"><b>${C.kcal(p).maintenance}</b><span>kcal pour maintenir ton poids</span></div></div>
        ${C.kcal(p).floored ? '<div class="note">Ta cible est plafonnée au minimum raisonnable. Vise un rythme plus doux plutôt que de manger moins.</div>' : ''}
      </section>
      ${clsNote}${shiftNote}${skipped}
      ${slots}
      <section class="card">
        <div class="row between"><h2>Extras & boissons</h2><button class="btn sm primary" data-act="extraAdd">+ Ajouter</button></div>
        ${extras || '<p class="muted small">Un café sucré, un verre de jus, un biscuit… note-le ici pour garder un compteur honnête.</p>'}
      </section>
      <section class="card flat"><h3>🍳 Astuce week-end</h3><p>Cuisine une grosse portion de poulet, de riz complet et de légumes le dimanche (≈ 1 h) : tes déjeuners de lundi à mercredi sont prêts.</p></section>
      <p class="muted small center">Quantités indicatives, ajustées à ta cible de ${menu.target} kcal. Plats pensés pour toute la famille.</p>`;
  }

  /* ================= ONGLET : EXERCICES ================= */
  const CATS = ['Tous', 'Jambes & fessiers', 'Haut du corps', 'Abdos & dos', 'Cardio'];
  function viewEx() {
    return `
      <label class="field"><span class="sr">Rechercher un exercice</span><input type="text" id="exq" data-input="exQ" placeholder="Rechercher (squat, pompes, dos…)" value="${esc(UI.exQ)}" autocomplete="off"></label>
      <div class="chips" role="group" aria-label="Filtrer par catégorie">${CATS.map(c => `<button class="chip" aria-pressed="${UI.exCat === c}" data-act="exCat" data-c="${esc(c)}">${c}</button>`).join('')}</div>
      <div id="exgrid"></div>
      <p class="muted small center">Touche un exercice : animation, explications pas à pas et vidéo.</p>`;
  }
  function renderExGrid() {
    const q = UI.exQ.trim().toLowerCase();
    const list = EXOS.filter(e => (UI.exCat === 'Tous' || e.cat === UI.exCat) && (!q || (e.nom + ' ' + e.tags.join(' ') + ' ' + e.cat).toLowerCase().includes(q)));
    $('#exgrid').innerHTML = list.length ? `<div class="exgrid">${list.map(e => `<button class="excard" data-act="openEx" data-id="${e.id}"><span class="th">${FF.Fig.thumb(e)}</span><h3>${esc(e.nom)}</h3><span class="meta"><span class="badge ${e.niveau === 'Débutant' ? 'brand' : 'warn'}">${e.niveau}</span><span class="badge">${e.type === 'temps' ? e.sec + ' s' : e.reps + ' rép.'}</span></span></button>`).join('')}</div>` : '<div class="card"><p class="muted center">Aucun exercice ne correspond.</p></div>';
  }

  const ytId = url => { const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/); return m ? m[1] : null; };
  function exVideoHtml(e) {
    const id = ytId(St.videos()[e.id]);
    const q = encodeURIComponent(e.nom + ' exercice technique');
    return `<div class="card flat" style="padding:12px" id="exvideo">
      ${id ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Vidéo : ${esc(e.nom)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>
      <button class="btn sm ghost danger" data-act="delVideo" data-id="${e.id}">Retirer cette vidéo</button>` : `<p class="muted small">L'animation ci-dessus fonctionne sans connexion. Pour une vraie vidéo : ouvre la recherche YouTube, choisis celle qui te plaît puis colle son lien ici, elle s'affichera directement dans la fiche.</p>
      <a class="btn primary block" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener noreferrer">▶ Chercher des vidéos sur YouTube</a>
      <form data-form="video" data-id="${e.id}" class="row"><input type="url" name="url" class="grow" placeholder="Coller un lien YouTube…" aria-label="Lien YouTube" required><button class="btn">Ajouter</button></form>
      <p class="err" id="vid-err"></p>`}
    </div>`;
  }
  function sheetEx(id) {
    const e = exo(id), p = P();
    const dose = e.type === 'temps' ? `${e.sec} secondes` : `${e.reps} répétitions${e.par ? ' ' + e.par : ''}`;
    openSheet(`${sheetHead(esc(e.nom))}
      <div class="figbox" id="sheet-fig"></div>
      <p class="muted small center">↔ Glisse pour faire tourner le modèle 3D · double-clic pour recentrer</p>
      <div class="row wrap"><span class="badge ${e.niveau === 'Débutant' ? 'brand' : 'warn'}">${e.niveau}</span>${e.tags.map(t => `<span class="badge">${esc(t)}</span>`).join('')}<span class="badge accent">${dose}</span></div>
      <p>${esc(e.resume)}</p>
      <div class="card flat"><h3>Comment faire</h3><ol class="steps">${e.etapes.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
      <div class="grid2" style="align-items:start"><div class="card flat"><h3>✅ Conseils</h3><ul class="dots">${e.conseils.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
        <div class="card flat"><h3>⚠️ À éviter</h3><ul class="dots">${e.erreurs.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div></div>
      <div class="grid2" style="align-items:start"><div class="card flat"><h3>Plus facile</h3><p class="muted">${esc(e.facile)}</p></div><div class="card flat"><h3>Plus dur</h3><p class="muted">${esc(e.dur)}</p></div></div>
      <h3>Vidéo</h3>${exVideoHtml(e)}`);
    FF.Fig.mount($('#sheet-fig'), e);
  }

  /* ================= ONGLET : JEÛNE ================= */
  function fastLive(p) {
    const s = fastStatus(p); if (!s) return '';
    const fasting = s.state === 'fast';
    const hours = s.elapsed / 60;
    const stage = FAST_STAGES.filter(x => x.h <= hours).pop();
    return `<div class="row between"><span class="badge ${fasting ? 'accent' : 'brand'}">${fasting ? '⏳ En jeûne' : '🍽 Fenêtre de repas'}</span><span class="muted small">${esc(U.hm(s.w.start))} – ${esc(U.hm(s.w.end))}</span></div>
      ${ring(s.pct, fasting ? 'accent' : '', `<span style="font-size:1.7rem">${U.dur(s.remaining * 60)}</span><small>${fasting ? 'avant le prochain repas' : 'avant la fin des repas'}</small>`, 'fast-ring')}
      <p class="center">${fasting ? `Tu jeûnes depuis <b>${U.dur(s.elapsed * 60)}</b>. Premier repas à <b>${U.hm(s.w.start)}</b>.` : `Tu peux manger jusqu'à <b>${U.hm(s.w.end)}</b>. Le jeûne reprend ensuite pour ${s.w.fast} h.`}</p>
      ${s.w.shifted ? `<p class="note">Fenêtre décalée de ${U.n1(s.w.shifted / 60)} h aujourd'hui pour ton cours (${esc(s.w.shiftFor)}).</p>` : ''}
      ${fasting ? `<div class="timeline">${FAST_STAGES.map(x => `<div class="${stage && x.h === stage.h ? 'on' : ''}"><b>${x.h} h</b><span><b>${esc(x.nom)}</b> — ${esc(x.txt)}</span></div>`).join('')}</div><p class="muted small">Repères indicatifs, qui varient d'une personne à l'autre.</p>` : ''}`;
  }
  function viewFast(p) {
    const f = p.fasting || {}, w = C.fastCfg(p, FAST), d = today();
    const models = FAST.map(m => `<button class="model" aria-pressed="${f.model === m.id}" data-act="fastModel" data-m="${m.id}">
      <div class="row between"><h3>${m.nom}</h3><span class="badge ${m.niv === 'Débutant' ? 'brand' : m.niv === 'Avancé' ? 'warn' : 'accent'}">${m.niv}</span></div>
      <p>${esc(m.desc)}</p><p class="muted small">${esc(m.cible)}</p></button>`).join('') +
      `<button class="model" aria-pressed="${f.model === 'libre'}" data-act="fastModel" data-m="libre"><div class="row between"><h3>Libre</h3><span class="badge">Sur mesure</span></div><p>Choisis ta durée de jeûne (8 à 23 h) et l'heure de ton premier repas.</p></button>`;
    const last7 = Array.from({ length: 7 }, (_, i) => U.addDays(d, i - 6)).map(dd => `<div class="day ${p.log.fastDone[dd] ? 'done' : ''} ${dd === d ? 'today' : ''}"><span>${DOW[U.parse(dd).getDay()]}</span><b>${U.parse(dd).getDate()}</b><span class="dot"></span></div>`).join('');
    const cfg = w ? `<section class="card">
        <h2>Réglages</h2>
        ${f.model === 'libre' ? `<label class="field"><span>Durée du jeûne (heures)</span><input type="number" min="8" max="23" step="1" value="${w.fast}" data-change="fastHours"></label>` : ''}
        <label class="field"><span>Heure de mon premier repas</span><input type="time" value="${esc(f.eatStart || '12:00')}" data-change="fastStart"></label>
        <p class="note ok">${esc(fastWindowText(w))} (${w.eat} h pour manger).</p>
        <button class="btn danger sm" data-act="fastOff">Désactiver le jeûne</button></section>
      <section class="card">
        <div class="row between"><div><h3>Jeûne tenu aujourd'hui ?</h3><p class="muted small">Série en cours : ${fastStreak(p)} jour${fastStreak(p) > 1 ? 's' : ''}</p></div><button class="btn sm ${p.log.fastDone[d] ? '' : 'primary'}" data-act="fastDone">${p.log.fastDone[d] ? '✓ Tenu' : 'Valider'}</button></div>
        <div class="week">${last7}</div></section>` : '';
    return `
      ${w ? `<section class="card" id="fast-live">${fastLive(p)}</section>` : `<section class="card brand"><h2>Jeûne intermittent</h2><p>Alterne une période où tu manges et une période de jeûne (eau, thé et café sans sucre autorisés). Choisis un modèle pour démarrer.</p></section>`}
      <div class="sec-title"><h2>Choisir un modèle</h2></div>
      <div class="models">${models}</div>
      ${cfg}
      <section class="card flat"><h3>👨‍👧 Avec des enfants en bas âge</h3>
        <ul class="dots"><li>Garde le dîner en famille : place plutôt la fenêtre de repas du <b>midi à 20 h</b>.</li><li>Un café ou un thé sans sucre le matin aide à tenir jusqu'au déjeuner.</li><li>Les nuits courtes et la fatigue comptent : si tu as faim ou des vertiges, mange. Le jeûne doit rester un outil, pas une contrainte.</li></ul></section>
      <section class="card flat"><h3>⚠️ À savoir</h3><p class="muted">Le jeûne intermittent ne convient pas à tout le monde (diabète ou traitement, grossesse ou allaitement, antécédents de troubles du comportement alimentaire, personnes de moins de 18 ans). Demande l'avis de ton médecin avant de commencer.</p></section>`;
  }

  /* ================= ONGLET : SUIVI (eau + poids) ================= */
  function glassSvg(pct) {
    const k = U.clamp(pct, 0, 1), top = 165 - 150 * k;
    return `<svg class="glass" viewBox="0 0 130 175" role="img" aria-label="Verre rempli à ${Math.round(k * 100)} %"><defs><clipPath id="gclip"><path d="M18 10h94l-10 150q-1 6-7 6H35q-6 0-7-6z"/></clipPath></defs>
      <g clip-path="url(#gclip)"><rect class="w" x="0" y="${top.toFixed(1)}" width="130" height="${(175 - top).toFixed(1)}"/></g><path class="o" d="M18 10h94l-10 150q-1 6-7 6H35q-6 0-7-6z"/></svg>`;
  }
  function viewSuivi(p) {
    return `<div class="seg" role="group" aria-label="Choisir la section"><button aria-pressed="${UI.suivi === 'eau'}" data-act="suiviTab" data-s="eau">💧 Eau</button><button aria-pressed="${UI.suivi === 'poids'}" data-act="suiviTab" data-s="poids">⚖️ Poids</button></div>` + (UI.suivi === 'eau' ? viewWater(p) : viewWeight(p));
  }
  function viewWater(p) {
    const d = today(), T = C.water(p, d), N = waterTotal(p, d), list = waterList(p, d);
    const left = Math.max(0, T - N);
    const days = Array.from({ length: 7 }, (_, i) => U.addDays(d, i - 6));
    let streak = 0; for (let k = (N >= T ? 0 : 1); k < 60; k++) { const dd = U.addDays(d, -k); if (waterTotal(p, dd) >= C.water(p, dd)) streak++; else break; }
    const bars = days.map(dd => { const n = waterTotal(p, dd), t = C.water(p, dd); return `<div title="${esc(U.longDate(dd))} : ${n} ml"><i class="${n >= t ? 'ok' : ''}" style="height:${Math.max(3, Math.round(U.clamp(n / t, 0, 1.15) * 100))}%"></i><span>${DOW[U.parse(dd).getDay()]}</span></div>`; }).join('');
    const sess = p.log.sessions[d];
    return `
      <section class="card">
        <div class="row">${glassSvg(N / T)}<div class="grow">
          <div style="font-size:2rem;font-weight:800;color:var(--water)">${U.n1(N / 1000)} L</div>
          <p class="muted">sur ${U.n1(T / 1000)} L aujourd'hui</p>
          <p style="margin-top:6px"><b>${left > 0 ? 'Il reste ' + left + ' ml' : 'Objectif atteint 🎉'}</b></p>
          ${streak ? `<span class="badge water" style="margin-top:6px">🔥 ${streak} jour${streak > 1 ? 's' : ''} d'affilée</span>` : ''}</div></div>
        ${bar(N / T, 'water')}
        <div class="wbtns"><button class="btn" data-act="waterAdd" data-ml="150">+150<small>petit verre</small></button><button class="btn" data-act="waterAdd" data-ml="250">+250<small>verre</small></button><button class="btn" data-act="waterAdd" data-ml="330">+330<small>grand verre</small></button><button class="btn" data-act="waterAdd" data-ml="500">+500<small>bouteille</small></button></div>
        <div class="row wrap"><button class="btn sm" data-act="waterCustom">Autre quantité…</button><button class="btn sm ghost" data-act="waterUndo" ${list.length ? '' : 'disabled'}>↶ Annuler le dernier</button></div>
      </section>
      ${list.length ? `<section class="card"><h3>Aujourd'hui</h3><div class="list">${list.map((e, i) => `<div class="item"><span class="grow"><b>${e.ml} ml</b> <span class="muted small">à ${new Date(e.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></span><button class="icon-btn" data-act="waterDel" data-i="${i}" aria-label="Supprimer ${e.ml} ml">✕</button></div>`).reverse().join('')}</div></section>` : ''}
      <section class="card"><div class="row between"><h3>7 derniers jours</h3><span class="muted small">objectif atteint = couleur pleine</span></div><div class="bars">${bars}</div></section>
      <section class="card flat"><h3>Comment est calculé ton objectif ?</h3><p class="muted">≈ 35 ml par kg de poids (${U.n1(C.curWeight(p))} kg)${sess && sess.done ? ' + 500 ml car tu as fait ta séance' : ', + 500 ml les jours de séance'}. Le thé, les tisanes et le café sans sucre comptent aussi. Un verre avant chaque repas aide à calmer la faim.</p></section>`;
  }

  function weightChart(p) {
    const ws = C.weights(p);
    if (ws.length < 2) return '<p class="muted center" style="padding:14px 0">Ajoute au moins deux pesées pour voir ta courbe.</p>';
    const W = 340, H = 180, pl = 38, pr = 12, pt = 14, pb = 26;
    const t0 = U.dayNum(ws[0].d), t1 = U.dayNum(ws[ws.length - 1].d), span = Math.max(1, t1 - t0);
    const vals = ws.map(x => x.kg).concat([p.goal]);
    const mn = Math.floor(Math.min(...vals) - 1), mx = Math.ceil(Math.max(...vals) + 1);
    const X = d => pl + (U.dayNum(d) - t0) / span * (W - pl - pr), Y = v => pt + (mx - v) / (mx - mn) * (H - pt - pb);
    const path = ws.map((x, i) => (i ? 'L' : 'M') + X(x.d).toFixed(1) + ' ' + Y(x.kg).toFixed(1)).join(' ');
    const last = ws[ws.length - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de poids : de ${U.n1(ws[0].kg)} kg à ${U.n1(last.kg)} kg">
      <line class="axis" x1="${pl}" y1="${H - pb}" x2="${W - pr}" y2="${H - pb}"/><line class="axis" x1="${pl}" y1="${pt}" x2="${pl}" y2="${H - pb}"/>
      <text x="${pl - 6}" y="${pt + 4}" text-anchor="end">${mx}</text><text x="${pl - 6}" y="${H - pb}" text-anchor="end">${mn}</text>
      <line class="goal" x1="${pl}" y1="${Y(p.goal).toFixed(1)}" x2="${W - pr}" y2="${Y(p.goal).toFixed(1)}"/><text x="${W - pr}" y="${(Y(p.goal) - 5).toFixed(1)}" text-anchor="end" style="fill:var(--accent)">objectif ${U.n1(p.goal)}</text>
      <path class="ln" d="${path}"/>${ws.map(x => `<circle class="pt" cx="${X(x.d).toFixed(1)}" cy="${Y(x.kg).toFixed(1)}" r="${ws.length > 30 ? 2 : 4}"/>`).join('')}
      <text x="${pl}" y="${H - 8}">${esc(U.shortDate(ws[0].d))}</text><text x="${W - pr}" y="${H - 8}" text-anchor="end">${esc(U.shortDate(last.d))}</text></svg>`;
  }
  function viewWeight(p) {
    const ws = C.weights(p), cur = C.curWeight(p), start = ws.length ? ws[0].kg : cur;
    const loss = p.goal < start;       // objectif = perdre
    const delta = cur - start;
    const good = v => loss ? v < 0 : v > 0;
    const bmi = C.bmi(p);
    /* rythme sur les 28 derniers jours */
    let pace = null;
    const lastD = ws.length ? ws[ws.length - 1].d : today();
    const recent = ws.filter(x => U.dayNum(lastD) - U.dayNum(x.d) <= 28);
    if (recent.length >= 2) {
      const days = U.dayNum(recent[recent.length - 1].d) - U.dayNum(recent[0].d);
      if (days >= 6) pace = (recent[recent.length - 1].kg - recent[0].kg) / days * 7;
    }
    let paceMsg = '', eta = '';
    if (pace != null) {
      const ok = loss ? pace < -0.1 : pace > 0.1;
      const fast = loss && pace < -1;
      paceMsg = fast ? `Rythme de ${U.n1(Math.abs(pace))} kg/sem : un peu rapide, vérifie que tu manges assez.` : ok ? `Bon rythme : ${pace > 0 ? '+' : '−'}${U.n1(Math.abs(pace))} kg par semaine.` : loss && pace > 0.1 ? `Le poids remonte de ${U.n1(pace)} kg/sem : reste régulier, une variation ponctuelle est normale.` : 'Poids stable ces dernières semaines : sois patient, la tendance compte.';
      if (ok && !fast && Math.abs(cur - p.goal) > 0.2 && (cur - p.goal) * pace < 0) {
        const weeks = (p.goal - cur) / pace; const dt = new Date(); dt.setDate(dt.getDate() + Math.round(weeks * 7));
        eta = ` À ce rythme, objectif vers ${new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(dt)}.`;
      }
    }
    const hist = ws.slice().reverse().slice(0, 12).map((x, i, arr) => {
      const prev = arr[i + 1]; const dl = prev ? x.kg - prev.kg : null;
      return `<div class="item"><span class="grow"><b>${U.n1(x.kg)} kg</b> <span class="muted small">${esc(U.shortDate(x.d))}</span></span>${dl != null ? `<span class="${good(dl) ? 'down' : dl === 0 ? 'muted' : 'up'}"><b>${dl > 0 ? '+' : dl < 0 ? '−' : ''}${U.n1(Math.abs(dl))}</b></span>` : ''}<button class="icon-btn" data-act="weightDel" data-d="${x.d}" aria-label="Supprimer la pesée du ${esc(U.shortDate(x.d))}">✕</button></div>`;
    }).join('');
    const remain = cur - p.goal;
    return `
      <section class="card">
        <div class="grid3">
          <div class="stat"><b>${U.n1(cur)} kg</b><span>poids actuel</span></div>
          <div class="stat"><b class="${delta === 0 ? '' : good(delta) ? 'down' : 'up'}">${delta > 0 ? '+' : delta < 0 ? '−' : ''}${U.n1(Math.abs(delta))} kg</b><span>depuis le début</span></div>
          <div class="stat"><b>${Math.abs(remain) < 0.2 ? '✓' : U.n1(Math.abs(remain)) + ' kg'}</b><span>${remain > 0.2 ? 'pour atteindre l\'objectif' : remain < -0.2 ? 'sous l\'objectif' : 'objectif atteint'}</span></div>
        </div>
        ${weightChart(p)}
        ${paceMsg ? `<p class="note ok">${esc(paceMsg + eta)}</p>` : '<p class="muted small">Pèse-toi 1 fois par semaine, le matin, dans les mêmes conditions : le rythme se calcule dès 2 pesées espacées d\'une semaine.</p>'}
      </section>
      <section class="card"><h3>Nouvelle pesée</h3>
        <form data-form="weight" class="grid2" style="align-items:end" novalidate>
          <label class="field"><span>Poids (kg)</span><input type="number" name="kg" inputmode="decimal" step="0.1" min="30" max="300" placeholder="${U.n1(cur)}" required></label>
          <label class="field"><span>Date</span><input type="date" name="d" value="${today()}" max="${today()}" required></label>
          <button class="btn primary" style="grid-column:1/-1">Enregistrer la pesée</button></form>
        <p class="err" id="w-err"></p></section>
      <section class="card"><div class="grid2"><div class="stat"><b>${U.n1(bmi)}</b><span>IMC · ${esc(C.bmiLabel(bmi))}</span></div><div class="stat"><b>${U.n1(C.bmi(p, p.goal))}</b><span>IMC à l'objectif (${U.n1(p.goal)} kg)</span></div></div>
        ${C.bmi(p, p.goal) < 18.5 ? '<p class="note">Ton poids cible donne un IMC inférieur à 18,5 : parles-en avec un professionnel de santé.</p>' : ''}</section>
      ${hist ? `<section class="card"><h3>Historique</h3><div class="list">${hist}</div></section>` : ''}`;
  }

  /* ================= PROFILS ================= */
  function profileForm(p) {
    const v = p || { name: '', color: COLORS[0], sex: 'm', birth: '', height: '', weight: '', goal: '', activity: 'sedentaire', level: 'debutant', pace: 'moyen' };
    const w = p ? C.curWeight(p) : '';
    const opt = (map, cur) => Object.entries(map).map(([k, o]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(o.nom)}</option>`).join('');
    return `<form data-form="profile" data-id="${p ? p.id : ''}" style="display:grid;gap:12px" novalidate>
      <label class="field"><span>Prénom</span><input type="text" name="name" value="${esc(v.name)}" maxlength="24" required autocomplete="off" placeholder="Ex. Christopher"></label>
      <div class="field"><span>Couleur</span><div class="swatches">${COLORS.map(c => `<button type="button" style="background:${c}" aria-label="Couleur ${c}" aria-pressed="${c === v.color}" data-act="pickColor" data-c="${c}"></button>`).join('')}</div><input type="hidden" name="color" value="${v.color}"></div>
      <div class="grid2">
        <label class="field"><span>Sexe (pour le calcul du métabolisme)</span><select name="sex"><option value="m" ${v.sex === 'm' ? 'selected' : ''}>Homme</option><option value="f" ${v.sex === 'f' ? 'selected' : ''}>Femme</option></select></label>
        <label class="field"><span>Date de naissance</span><input type="date" name="birth" value="${esc(v.birth)}" max="${today()}" required></label>
        <label class="field"><span>Taille (cm)</span><input type="number" name="height" inputmode="numeric" min="120" max="230" value="${esc(v.height)}" required></label>
        <label class="field"><span>Poids actuel (kg)</span><input type="number" name="weight" inputmode="decimal" step="0.1" min="30" max="300" value="${esc(w)}" required></label>
      </div>
      <label class="field"><span>Poids que je vise (kg)</span><input type="number" name="goal" inputmode="decimal" step="0.1" min="30" max="300" value="${esc(v.goal)}" required></label>
      <label class="field"><span>Activité au quotidien</span><select name="activity">${opt(C.ACTIVITY, v.activity)}</select></label>
      <label class="field"><span>Niveau sportif</span><select name="level">${opt(C.LEVELS, v.level)}</select></label>
      <label class="field"><span>Rythme de perte souhaité</span><select name="pace">${opt(C.PACES, v.pace)}</select></label>
      <div class="card flat" style="padding:12px"><h3>Mon programme sportif</h3>
        <label class="field"><span>Séances par semaine (cours inclus)</span><select name="perWeek"><option value="auto">Selon mon niveau (recommandé)</option>${[2, 3, 4, 5, 6].map(n => `<option value="${n}" ${String(v.perWeek) === String(n) ? 'selected' : ''}>${n} séances</option>`).join('')}</select></label>
        <div class="grid2"><label class="field"><span>Temps en semaine</span><select name="timeWeek">${[15, 20, 25, 30, 45].map(n => `<option value="${n}" ${(v.timeWeek || 25) === n ? 'selected' : ''}>${n} min</option>`).join('')}</select></label>
        <label class="field"><span>Temps le week-end</span><select name="timeWeekend">${[30, 45, 60, 90].map(n => `<option value="${n}" ${(v.timeWeekend || 45) === n ? 'selected' : ''}>${n} min</option>`).join('')}</select></label></div>
        <label class="check-row"><input type="checkbox" name="lowImpact" ${v.lowImpact ? 'checked' : ''}><span>Éviter les sauts et impacts (genoux, dos)</span></label>
        <p class="muted small">Le programme s'adapte aussi à ton âge, ton IMC, ton niveau et ton activité.</p></div>
      <p class="err" id="pf-err" role="alert"></p>
      <button class="btn primary xl block">${p ? 'Enregistrer' : 'Créer le profil'}</button>
      ${p ? `<button type="button" class="btn danger block" data-act="delProfile" data-id="${p.id}">Supprimer ce profil et ses données</button>` : ''}
    </form>`;
  }
  function openWelcome() {
    openSheet(`<div class="welcome"><div class="logo" aria-hidden="true">💪</div><h1>Bienvenue sur FitFamille</h1>
      <p class="muted">Programme sport court, repas, jeûne intermittent, eau et suivi du poids. Pensé pour les emplois du temps chargés.</p></div>
      <p class="note ok">Tes données restent sur cet appareil. Tu peux créer plusieurs profils (un par personne).</p>
      ${profileForm(null)}
      <p class="muted small center">Les calculs sont indicatifs et ne remplacent pas l'avis d'un médecin.</p>`, { lock: true });
  }
  function sheetProfiles() {
    const cur = P();
    openSheet(`${sheetHead('Profils')}
      <div class="list">${St.profiles().map(p => `<div class="item"><span class="avatar" style="background:${p.color}">${esc(p.name.charAt(0).toUpperCase())}</span>
        <span class="grow"><b>${esc(p.name)}</b><br><span class="muted small">${C.age(p)} ans · ${p.height} cm · ${U.n1(C.curWeight(p))} → ${U.n1(p.goal)} kg</span><br><span class="muted small">${C.program(p).perWeek} séances/sem · ${C.program(p).capWeek} min${C.program(p).lowImpact ? ' · faible impact' : ''}</span></span>
        ${cur && cur.id === p.id ? '<span class="badge brand">Actif</span>' : `<button class="btn sm" data-act="pickProfile" data-id="${p.id}">Choisir</button>`}
        <button class="icon-btn" data-act="editProfile" data-id="${p.id}" aria-label="Modifier ${esc(p.name)}">✎</button></div>`).join('')}</div>
      <button class="btn primary block" data-act="newProfile">+ Ajouter un profil</button>
      <div class="card flat"><h3>Sauvegarde</h3><p class="muted small">Les données sont stockées dans ce navigateur. Exporte-les pour les garder ou les transférer sur un autre appareil.</p>
        <div class="row wrap"><button class="btn sm" data-act="exportData">Exporter (.json)</button><button class="btn sm" data-act="importData">Importer…</button><button class="btn sm danger" data-act="resetAll">Tout effacer</button></div></div>`);
  }
  function sheetProfileEdit(id) {
    const p = St.profiles().find(x => x.id === id);
    const k = C.kcal(p);
    openSheet(`${sheetHead('Modifier ' + esc(p.name))}
      <div class="grid2"><div class="stat"><b>${k.target} kcal</b><span>cible quotidienne</span></div><div class="stat"><b>${U.n1(C.water(p, today()) / 1000)} L</b><span>eau par jour</span></div></div>
      ${profileForm(p)}`);
  }

  /* ================= ACTIONS ================= */
  const ACT = {
    tab(d) { UI.tab = d.t; if (d.s) UI.suivi = d.s; window.scrollTo(0, 0); render(); },
    closeSheet,
    profiles: sheetProfiles,
    newProfile() { openSheet(`${sheetHead('Nouveau profil')}${profileForm(null)}`); },
    editProfile(d) { sheetProfileEdit(d.id); },
    pickProfile(d) { St.setActive(d.id); closeSheet(); UI.tab = 'today'; render(); toast('Profil changé'); },
    pickColor(d, el) {
      const f = el.closest('form'); f.elements.color.value = d.c;
      el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === el));
    },
    delProfile(d) {
      const p = St.profiles().find(x => x.id === d.id);
      if (!confirm(`Supprimer le profil « ${p.name} » et toutes ses données ? Cette action est définitive.`)) return;
      St.removeProfile(d.id); closeSheet(); UI.tab = 'today'; render();
      if (P()) toast('Profil supprimé');
    },
    exportData() {
      const blob = new Blob([St.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fitfamille-sauvegarde-${today()}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    importData() { $('#import-file').click(); },
    resetAll() {
      if (!confirm('Effacer TOUS les profils et toutes les données de cet appareil ?')) return;
      if (!confirm('Dernière confirmation : cette action est irréversible.')) return;
      St.reset(); closeSheet(); UI.tab = 'today'; render();
    },

    /* Aujourd'hui */
    startSession(d) {
      const p = P(), def = SESSIONS[d.id], sess = FF.Session.build(def, p, today());
      closeSheet();
      FF.Player.start(sess, { weight: C.curWeight(p), onDone: (res, s) => logSession(res, s.titre, PL.loadOfSession(def, P())) });
    },
    walkDone() {
      const p = P(), min = parseInt($('#walkmin').value, 10) || 45;
      logSession({ min, kcal: FF.Session.kcalFor(SESSIONS.marche.met, C.curWeight(p), min) }, 'Marche en famille', PL.loadOfSession(SESSIONS.marche, p));
    },
    extDone(d) {
      const p = P(), t = today(), e = (p.ext || []).find(x => x.id === d.id); if (!e) return;
      const s = sessionOf(p, t);
      if (s && s.parts.some(x => x.id === e.id)) {
        s.parts = s.parts.filter(x => x.id !== e.id);
        if (s.parts.length) recalc(s); else delete p.log.sessions[t];
        saveOrWarn(); render(); return;
      }
      const min = PL.extMinutes(e);
      logSession({ min, kcal: FF.Session.kcalFor((EXT_KINDS[e.kind] || EXT_KINDS.sculpt).met, C.curWeight(p), min) }, e.name, PL.loadOfExt(e), e.id);
    },
    chooseSession() {
      const p = P(), t = today(), cur = (dayPlan(p, t).def || {}).id;
      const rows = Object.values(SESSIONS).map(s => {
        const b = FF.Session.build(s, p, t), cf = PL.conflictsFor(p, t, s);
        const warn = cf.before.length ? `⚠ ${PL.names(cf.before)} déjà sollicité${cf.before.length > 1 ? 's' : ''} hier` : cf.after.length ? `⚠ ${PL.names(cf.after)} : trop proche de ton prochain cours` : '';
        return `<button class="item" data-act="setSession" data-id="${s.id}"><span class="grow"><b>${esc(s.titre)}</b>${s.id === cur ? ' <span class="badge brand">Prévu</span>' : ''}<br><span class="muted small">${esc(s.focus)} · ${s.type === 'activity' ? '45 min' : '≈ ' + b.minutes + ' min'}</span>${warn ? `<br><span class="badge warn">${esc(warn)}</span>` : ''}</span></button>`;
      }).join('');
      openSheet(`${sheetHead('Changer de séance')}<p class="muted">Choisis selon ton énergie et ton temps. Les avertissements indiquent les muscles qui n'ont pas encore récupéré.</p><div class="list">${rows}</div>`);
    },
    setSession(d) { P().log.plan[today()] = d.id; saveOrWarn(); closeSheet(); render(); toast('Séance du jour modifiée'); },
    planning: sheetPlanning,
    courseAdd: sheetCourse,
    coursePreset() {
      const f = $('form[data-form=course]'); if (!f) return;
      f.elements.name.value = 'Body sculpt'; f.elements.kind.value = 'sculpt'; f.elements.day.value = '3'; f.elements.start.value = '20:30'; f.elements.end.value = '21:30';
    },
    courseDel(d) {
      const p = P(); const e = (p.ext || []).find(x => x.id === d.id);
      if (!e || !confirm(`Supprimer le cours « ${e.name} » du planning ?`)) return;
      p.ext = p.ext.filter(x => x.id !== d.id); saveOrWarn(); sheetPlanning(); render();
    },
    toggleCheck(d) { const p = P(), t = today(); if (d.k === 'fast') p.log.fastDone[t] = !p.log.fastDone[t]; else { p.log.checks[t] = p.log.checks[t] || {}; p.log.checks[t][d.k] = !p.log.checks[t][d.k]; } saveOrWarn(); render(); },

    /* Repas */
    mealPrev() { UI.mealDate = U.addDays(UI.mealDate, -1); render(); },
    mealNext() { UI.mealDate = U.addDays(UI.mealDate, 1); render(); },
    mealToday() { UI.mealDate = today(); render(); },
    mealToggle(d) {
      const l = mealLog(P(), UI.mealDate, true);
      if (!l.eaten[d.slot] && !l.custom[d.slot] && !(l.pick && l.pick[d.slot])) {   // repas mangé : on fige la recette, même si le garde-manger change ensuite
        const it = menuFor(P(), UI.mealDate).items.find(i => i.id === d.slot);
        if (it && it.meal.id) { l.pick = l.pick || {}; l.pick[d.slot] = it.meal.id; l.fz = l.fz || {}; l.fz[d.slot] = true; }
      }
      l.eaten[d.slot] = !l.eaten[d.slot]; saveOrWarn(); render();
    },
    mealSwap(d) { const l = mealLog(P(), UI.mealDate, true); l.sw[d.slot] = (l.sw[d.slot] || 0) + 1; delete l.custom[d.slot]; if (l.pick) delete l.pick[d.slot]; if (l.fz) delete l.fz[d.slot]; saveOrWarn(); render(); },
    mealCustomClear(d) { const l = mealLog(P(), UI.mealDate, true); delete l.custom[d.slot]; saveOrWarn(); render(); },
    mealCustom(d) {
      const s = SLOTS.find(x => x.id === d.slot);
      openSheet(`${sheetHead(esc(s.nom) + ' : autre repas')}
        <form data-form="mealCustom" data-slot="${s.id}" style="display:grid;gap:12px" novalidate>
          <label class="field"><span>Ce que j'ai mangé</span><input type="text" name="name" maxlength="60" required placeholder="Ex. Pizza maison, 2 parts"></label>
          <div class="grid2"><label class="field"><span>Calories (kcal)</span><input type="number" name="kcal" inputmode="numeric" min="0" max="3000" required></label>
          <label class="field"><span>Protéines (g, option)</span><input type="number" name="p" inputmode="numeric" min="0" max="200"></label></div>
          <p class="err" id="f-err"></p><button class="btn primary block">Enregistrer</button></form>`, { focus: true });
    },
    extraAdd() {
      openSheet(`${sheetHead('Ajouter un extra')}
        <form data-form="extra" style="display:grid;gap:12px" novalidate>
          <label class="field"><span>Aliment ou boisson</span><input type="text" name="name" maxlength="60" required placeholder="Ex. Café sucré, biscuit…"></label>
          <div class="grid2"><label class="field"><span>Calories (kcal)</span><input type="number" name="kcal" inputmode="numeric" min="0" max="3000" required></label>
          <label class="field"><span>Protéines (g, option)</span><input type="number" name="p" inputmode="numeric" min="0" max="200"></label></div>
          <p class="err" id="f-err"></p><button class="btn primary block">Ajouter</button></form>`, { focus: true });
    },
    extraDel(d) { const l = mealLog(P(), UI.mealDate, true); l.extras = l.extras.filter(x => x.id !== d.id); saveOrWarn(); render(); },

    /* Exercices */
    exCat(d) { UI.exCat = d.c; render(); },
    openEx(d) { sheetEx(d.id); },
    delVideo(d) { St.setVideo(d.id, null); sheetEx(d.id); },

    /* Jeûne */
    fastModel(d) {
      const p = P(), m = FAST.find(x => x.id === d.m);
      p.fasting = Object.assign({ eatStart: '12:00', customFast: 16 }, p.fasting, { model: d.m });
      if (m) p.fasting.eatStart = m.start;
      saveOrWarn(); render();
    },
    fastOff() { P().fasting.model = 'none'; saveOrWarn(); render(); },
    fastDone() { const p = P(), t = today(); p.log.fastDone[t] = !p.log.fastDone[t]; saveOrWarn(); render(); },

    /* Suivi */
    suiviTab(d) { UI.suivi = d.s; render(); },
    waterAdd(d) { const p = P(), t = today(); (p.log.water[t] = p.log.water[t] || []).push({ t: Date.now(), ml: parseInt(d.ml, 10) }); saveOrWarn(); render(); toast(`+${d.ml} ml 💧`); },
    waterUndo() { const l = P().log.water[today()]; if (l && l.length) { l.pop(); saveOrWarn(); render(); } },
    waterDel(d) { const l = P().log.water[today()]; if (l) { l.splice(parseInt(d.i, 10), 1); saveOrWarn(); render(); } },
    waterCustom() {
      openSheet(`${sheetHead('Quantité d\'eau')}
        <form data-form="waterCustom" style="display:grid;gap:12px" novalidate>
          <label class="field"><span>Millilitres bus</span><input type="number" name="ml" inputmode="numeric" min="10" max="3000" step="10" required placeholder="Ex. 750"></label>
          <p class="err" id="f-err"></p><button class="btn primary block">Ajouter</button></form>`, { focus: true });
    },
    weightDel(d) { const p = P(); if (p.log.weights.length <= 1) return toast('Garde au moins une pesée.'); if (!confirm('Supprimer cette pesée ?')) return; p.log.weights = p.log.weights.filter(x => x.d !== d.d); saveOrWarn(); render(); }
  };

  function logSession(res, titre, load, id) {
    const p = P(), t = today();
    let cur = sessionOf(p, t);
    if (!cur) cur = p.log.sessions[t] = { parts: [], done: true, min: 0, kcal: 0, titles: [] };
    cur.parts.push({ id: id || null, titre, min: res.min, kcal: res.kcal, load: load || PL.zero() });
    recalc(cur); saveOrWarn(); render();
    toast(`Enregistré : ${res.min} min, ≈ ${res.kcal} kcal 💪`);
  }

  /* ---------- Planning de la semaine et cours extérieurs ---------- */
  const DAYS = [[1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'], [6, 'Samedi'], [0, 'Dimanche']];
  const DAYN = { 0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi' };
  function sheetPlanning() {
    const p = P(), d = today(), mon = U.mondayOf(d), pr = C.program(p);
    const rows = Array.from({ length: 7 }, (_, i) => {
      const dd = U.addDays(mon, i), x = dayPlan(p, dd), s = p.log.sessions[dd];
      const parts = x.ext.map(e => `<span class="badge water">${esc(e.start)}–${esc(e.end)}</span> <b>${esc(e.name)}</b>`);
      if (x.def) { const b = FF.Session.build(x.def, p, dd); parts.push(`<b>${esc(x.def.titre)}</b> <span class="muted small">${x.def.type === 'activity' ? '45 min' : '≈ ' + b.minutes + ' min'}</span>`); }
      if (!parts.length) parts.push('<b>Repos</b> <span class="muted small">récupération</span>');
      return `<div class="item" style="align-items:flex-start"><b style="min-width:54px;${dd === d ? 'color:var(--brand)' : ''}">${DAYN[x.wd].slice(0, 3)}. ${U.parse(dd).getDate()}</b>
        <span class="grow">${parts.join('<br>')}<div style="margin-top:4px">${chipsHtml(x.load)}</div>${x.note ? `<p class="muted small">${esc(x.note)}</p>` : ''}</span>${s && s.done ? '<span class="badge brand">Fait ✓</span>' : ''}</div>`;
    }).join('');
    const exts = (p.ext || []).map(e => `<div class="item"><span class="grow"><b>${esc(e.name)}</b><br><span class="muted small">${DAYN[e.day]} · ${esc(e.start)} – ${esc(e.end)} · ${esc((EXT_KINDS[e.kind] || EXT_KINDS.sculpt).nom)}</span></span><button class="icon-btn" data-act="courseDel" data-id="${e.id}" aria-label="Supprimer ${esc(e.name)}">✕</button></div>`).join('');
    openSheet(`${sheetHead('Mon planning')}
      <div class="card flat"><h3>Programme de ${esc(p.name)}</h3><ul class="dots">${pr.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
        <p class="muted small">Règle : jamais d'effort intense sur le même groupe musculaire (bras, jambes, dos…) deux jours d'affilée.</p></div>
      <div class="list">${rows}</div>
      <div class="card flat"><h3>Mes cours extérieurs</h3>
        ${exts || '<p class="muted small">Tu suis un cours régulier (body sculpt, yoga, cardio…) ? Ajoute-le : le programme s\'adapte autour (récupération, repas, jeûne).</p>'}
        <button class="btn primary block" data-act="courseAdd">+ Ajouter un cours</button></div>`);
  }
  function sheetCourse() {
    openSheet(`${sheetHead('Ajouter un cours')}
      <button type="button" class="btn block" data-act="coursePreset">Body sculpt · mercredi 20:30 – 21:30</button>
      <form data-form="course" style="display:grid;gap:12px" novalidate>
        <label class="field"><span>Nom du cours</span><input type="text" name="name" maxlength="40" required placeholder="Ex. Body sculpt"></label>
        <label class="field"><span>Type d'effort</span><select name="kind">${Object.entries(EXT_KINDS).map(([k, o]) => `<option value="${k}">${esc(o.nom)}</option>`).join('')}</select></label>
        <label class="field"><span>Jour</span><select name="day">${DAYS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label>
        <div class="grid2"><label class="field"><span>Début</span><input type="time" name="start" value="20:30" required></label><label class="field"><span>Fin</span><input type="time" name="end" value="21:30" required></label></div>
        <p class="err" id="f-err"></p><button class="btn primary xl block">Ajouter au planning</button></form>`);
  }

  /* ---------- Formulaires ---------- */
  const num = v => parseFloat(String(v).replace(',', '.'));
  const FORM = {
    profile(f, fd) {
      const err = $('#pf-err', f), id = f.dataset.id;
      const v = { name: String(fd.get('name') || '').trim(), color: fd.get('color'), sex: fd.get('sex'), birth: fd.get('birth'), height: num(fd.get('height')), weight: num(fd.get('weight')), goal: num(fd.get('goal')), activity: fd.get('activity'), level: fd.get('level'), pace: fd.get('pace'), perWeek: fd.get('perWeek'), timeWeek: parseInt(fd.get('timeWeek'), 10), timeWeekend: parseInt(fd.get('timeWeekend'), 10), lowImpact: fd.get('lowImpact') === 'on' };
      const bad = m => { err.textContent = m; };
      if (!v.name) return bad('Indique un prénom.');
      if (!v.birth) return bad('Indique ta date de naissance.');
      const age = C.age(v); if (!(age >= 14 && age <= 100)) return bad('L\'application est prévue pour les personnes de 14 ans et plus (date de naissance à vérifier).');
      if (!(v.height >= 120 && v.height <= 230)) return bad('La taille doit être comprise entre 120 et 230 cm.');
      if (!(v.weight >= 30 && v.weight <= 300)) return bad('Le poids doit être compris entre 30 et 300 kg.');
      if (!(v.goal >= 30 && v.goal <= 300)) return bad('Le poids visé doit être compris entre 30 et 300 kg.');
      if (id) {
        const p = St.profiles().find(x => x.id === id), was = C.curWeight(p);
        St.updateProfile(id, { name: v.name, color: v.color, sex: v.sex, birth: v.birth, height: v.height, goal: v.goal, activity: v.activity, level: v.level, pace: v.pace, perWeek: v.perWeek, timeWeek: v.timeWeek, timeWeekend: v.timeWeekend, lowImpact: v.lowImpact });
        if (Math.abs(v.weight - was) > 0.04) setWeight(p, today(), v.weight);
        saveOrWarn(); closeSheet(); render(); toast('Profil mis à jour');
      } else {
        St.addProfile({ name: v.name, color: v.color, sex: v.sex, birth: v.birth, height: v.height, weight: v.weight, goal: v.goal, activity: v.activity, level: v.level, pace: v.pace, perWeek: v.perWeek, timeWeek: v.timeWeek, timeWeekend: v.timeWeekend, lowImpact: v.lowImpact });
        closeSheet(); UI.tab = 'today'; render(); toast(`Bienvenue, ${v.name} !`);
      }
    },
    course(f, fd) {
      const e = { id: U.uid(), name: String(fd.get('name') || '').trim(), kind: fd.get('kind'), day: parseInt(fd.get('day'), 10), start: fd.get('start'), end: fd.get('end') };
      if (!e.name) return ($('#f-err', f).textContent = 'Donne un nom au cours.');
      if (!e.start || !e.end || U.toMin(e.end) <= U.toMin(e.start)) return ($('#f-err', f).textContent = 'L\'heure de fin doit être après le début.');
      const p = P(); p.ext = p.ext || []; p.ext.push(e); saveOrWarn(); sheetPlanning(); render(); toast('Cours ajouté : le programme est recalculé');
    },
    mealCustom(f, fd) {
      const name = String(fd.get('name') || '').trim(), kcal = num(fd.get('kcal')), pr = num(fd.get('p')) || 0;
      if (!name || !(kcal >= 0)) return ($('#f-err', f).textContent = 'Indique un nom et des calories.');
      const l = mealLog(P(), UI.mealDate, true);
      l.custom[f.dataset.slot] = { name, kcal: Math.round(kcal), p: Math.round(pr) }; l.eaten[f.dataset.slot] = true;
      saveOrWarn(); closeSheet(); render();
    },
    extra(f, fd) {
      const name = String(fd.get('name') || '').trim(), kcal = num(fd.get('kcal')), pr = num(fd.get('p')) || 0;
      if (!name || !(kcal >= 0)) return ($('#f-err', f).textContent = 'Indique un nom et des calories.');
      const l = mealLog(P(), UI.mealDate, true);
      l.extras.push({ id: U.uid(), name, kcal: Math.round(kcal), p: Math.round(pr) });
      saveOrWarn(); closeSheet(); render();
    },
    waterCustom(f, fd) {
      const ml = Math.round(num(fd.get('ml')));
      if (!(ml >= 10 && ml <= 3000)) return ($('#f-err', f).textContent = 'Entre une quantité entre 10 et 3000 ml.');
      const p = P(), t = today(); (p.log.water[t] = p.log.water[t] || []).push({ t: Date.now(), ml });
      saveOrWarn(); closeSheet(); render(); toast(`+${ml} ml 💧`);
    },
    weight(f, fd) {
      const kgv = num(fd.get('kg')), d = fd.get('d');
      if (!(kgv >= 30 && kgv <= 300)) return ($('#w-err').textContent = 'Entre un poids entre 30 et 300 kg.');
      if (!d || d > today()) return ($('#w-err').textContent = 'Date invalide.');
      const p = P(), was = C.curWeight(p);
      setWeight(p, d, kgv); saveOrWarn(); render();
      const diff = kgv - was;
      toast(Math.abs(diff) < 0.05 ? 'Pesée enregistrée' : `Pesée enregistrée (${diff > 0 ? '+' : '−'}${U.n1(Math.abs(diff))} kg)`);
    },
    video(f, fd) {
      const id = ytId(fd.get('url'));
      if (!id) return ($('#vid-err').textContent = 'Lien YouTube non reconnu. Exemple : https://www.youtube.com/watch?v=…');
      St.setVideo(f.dataset.id, fd.get('url')); sheetEx(f.dataset.id);
    }
  };
  function setWeight(p, d, kgv) {
    p.log.weights = p.log.weights.filter(x => x.d !== d);
    p.log.weights.push({ d, kg: Math.round(kgv * 10) / 10 });
    p.log.weights.sort((a, b) => a.d.localeCompare(b.d));
  }

  const CHG = {
    fastStart(el) { if (!el.value) return; const p = P(); p.fasting.eatStart = el.value; saveOrWarn(); render(); },
    fastHours(el) { const v = U.clamp(parseInt(el.value, 10) || 16, 8, 23); const p = P(); p.fasting.customFast = v; saveOrWarn(); render(); }
  };
  const INP = { exQ(el) { UI.exQ = el.value; renderExGrid(); } };

  /* ---------- Écouteurs globaux ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset, el, e);
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-form]'); if (!f) return;
    e.preventDefault(); const h = FORM[f.dataset.form]; if (h) h(f, new FormData(f));
  });
  document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHG[el.dataset.change]) CHG[el.dataset.change](el); });
  document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INP[el.dataset.input]) INP[el.dataset.input](el); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI.sheet && !UI.sheet.lock) closeSheet(); });
  $('#import-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        if (!confirm('Importer cette sauvegarde ? Elle remplacera les données actuelles de cet appareil.')) return;
        St.importJSON(String(rd.result)); closeSheet(); UI.tab = 'today'; render(); toast('Sauvegarde importée');
      } catch (err) { alert('Fichier non valide : ' + err.message); }
    };
    rd.readAsText(file); e.target.value = '';
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !FF.Player.isOpen() && !UI.sheet && P()) { UI.mealDate = UI.mealDate; render(); } });

  /* ---------- Démarrage ---------- */
  FF.Pantry.install({ UI, P, render, openSheet, closeSheet, sheetHead, toast, saveOrWarn, menuFor, slotPlan, mealLog, ACT, FORM, CHG, INP });
  St.load();
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
})();
