/* FitFamille — utilitaires, stockage local (plusieurs profils) et calculs de santé */
window.FF = window.FF || {};

FF.U = (() => {
  const pad = n => String(n).padStart(2, '0');
  const ds = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ds(d); };
  const dayNum = s => { const [y, m, d] = s.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 864e5); };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const n1 = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const mondayOf = s => { const d = parse(s); const k = (d.getDay() + 6) % 7; return addDays(s, -k); };
  const hm = min => { min = ((Math.round(min) % 1440) + 1440) % 1440; return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`; };
  const toMin = t => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
  const dur = sec => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h} h ${pad(m)}` : `${m}:${pad(s)}`; };
  const longDate = s => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(parse(s));
  const shortDate = s => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(parse(s));
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  return { pad, ds, parse, addDays, dayNum, esc, clamp, n1, mondayOf, hm, toMin, dur, longDate, shortDate, uid };
})();

FF.Store = (() => {
  const KEY = 'fitfamille.v1';
  let S = { v: 1, profiles: [], activeId: null };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const o = JSON.parse(raw); if (o && Array.isArray(o.profiles)) S = o; }
    } catch (e) { /* stockage indisponible */ }
    if (!S.profiles.some(p => p.id === S.activeId)) S.activeId = S.profiles[0] ? S.profiles[0].id : null;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { return false; }
  }
  /* Liens vidéo ajoutés par l'utilisateur : partagés entre tous les profils */
  const videos = () => (S.videos = S.videos || {});
  function setVideo(id, url) { if (url) videos()[id] = url; else delete videos()[id]; save(); }
  const profiles = () => S.profiles;
  const active = () => S.profiles.find(p => p.id === S.activeId) || null;
  const setActive = id => { S.activeId = id; save(); };

  function blankLog() { return { water: {}, weights: [], meals: {}, sessions: {}, plan: {}, checks: {}, fastDone: {}, videos: {} }; }

  function addProfile(f) {
    const p = Object.assign({ id: FF.U.uid(), created: Date.now(), ext: [], fasting: { model: 'none', eatStart: '12:00', customFast: 16 }, log: blankLog() }, f);
    p.log.weights.push({ d: FF.U.ds(), kg: f.weight });
    S.profiles.push(p); S.activeId = p.id; save(); return p;
  }
  function updateProfile(id, f) {
    const p = S.profiles.find(x => x.id === id); if (!p) return;
    Object.assign(p, f);
    save(); return p;
  }
  function removeProfile(id) {
    S.profiles = S.profiles.filter(p => p.id !== id);
    if (S.activeId === id) S.activeId = S.profiles[0] ? S.profiles[0].id : null;
    save();
  }
  const exportJSON = () => JSON.stringify(S, null, 1);
  function importJSON(txt) {
    const o = JSON.parse(txt);
    if (!o || !Array.isArray(o.profiles)) throw new Error('Fichier invalide');
    o.profiles.forEach(p => { p.log = Object.assign(blankLog(), p.log || {}); p.fasting = p.fasting || { model: 'none', eatStart: '12:00', customFast: 16 }; p.ext = Array.isArray(p.ext) ? p.ext : []; });
    S = { v: 1, profiles: o.profiles, activeId: o.activeId, videos: o.videos && typeof o.videos === 'object' ? o.videos : {} };
    if (!S.profiles.some(p => p.id === S.activeId)) S.activeId = S.profiles[0] ? S.profiles[0].id : null;
    save();
  }
  function reset() { S = { v: 1, profiles: [], activeId: null }; try { localStorage.removeItem(KEY); } catch (e) { } }

  return { load, save, videos, setVideo, profiles, active, setActive, addProfile, updateProfile, removeProfile, exportJSON, importJSON, reset };
})();

/* Calculs indicatifs (Mifflin-St Jeor, apport en eau, rythme de perte) */
FF.calc = (() => {
  const U = FF.U;
  const ACTIVITY = {
    sedentaire: { f: 1.2, nom: 'Sédentaire (travail de bureau)' },
    leger: { f: 1.375, nom: 'Légèrement actif (1 à 3 séances / semaine)' },
    modere: { f: 1.55, nom: 'Actif (3 à 5 séances / semaine)' }
  };
  const LEVELS = { debutant: { nom: 'Débutant', k: 0.75, rounds: -1 }, inter: { nom: 'Intermédiaire', k: 1, rounds: 0 }, avance: { nom: 'Avancé', k: 1.25, rounds: 1 } };
  const PACES = { doux: { nom: 'Doux : 0,25 kg / semaine', kg: 0.25 }, moyen: { nom: 'Modéré : 0,5 kg / semaine', kg: 0.5 }, soutenu: { nom: 'Soutenu : 0,75 kg / semaine', kg: 0.75 } };

  const age = p => {
    const b = U.parse(p.birth), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  };
  const weights = p => p.log.weights.slice().sort((a, b) => a.d.localeCompare(b.d));
  const curWeight = p => { const w = weights(p); return w.length ? w[w.length - 1].kg : p.weight; };
  const bmi = (p, w) => { w = w || curWeight(p); const m = p.height / 100; return w / (m * m); };
  const bmr = p => 10 * curWeight(p) + 6.25 * p.height - 5 * age(p) + (p.sex === 'f' ? -161 : 5);
  const tdee = p => bmr(p) * (ACTIVITY[p.activity] || ACTIVITY.sedentaire).f;
  const wantsLoss = p => p.goal < curWeight(p) - 0.2;
  const deficit = p => wantsLoss(p) ? (PACES[p.pace] || PACES.moyen).kg * 7700 / 7 : 0;
  function kcal(p) {
    const floor = p.sex === 'f' ? 1200 : 1500;
    const raw = tdee(p) - deficit(p);
    return { target: Math.round(Math.max(floor, raw) / 10) * 10, floored: raw < floor, maintenance: Math.round(tdee(p) / 10) * 10 };
  }
  const protein = p => Math.round(Math.min(170, 1.6 * curWeight(p)) / 5) * 5;
  function water(p, date) {
    const sess = p.log.sessions[date];
    const base = 35 * curWeight(p) + (sess && sess.done ? 500 : 0);
    return Math.round(U.clamp(base, 1500, 4000) / 50) * 50;
  }
  const bmiLabel = v => v < 18.5 ? 'Insuffisance pondérale' : v < 25 ? 'Corpulence normale' : v < 30 ? 'Surpoids' : 'Obésité';

  /* Fenêtre de jeûne : {fast, eat, start (min), end (min)} ou null */
  function fastCfg(p, FAST, date) {
    const f = p.fasting || {};
    if (!f.model || f.model === 'none') return null;
    let fast;
    if (f.model === 'libre') fast = U.clamp(Math.round(f.customFast || 16), 8, 23);
    else { const m = FAST.find(x => x.id === f.model); if (!m) return null; fast = m.fast; }
    let start = U.toMin(f.eatStart || '12:00');
    const cfg = { fast, eat: 24 - fast, start, end: start + (24 - fast) * 60, model: f.model, shifted: 0, shiftFor: '' };
    /* Cours en soirée : la fenêtre de repas est décalée pour finir 30 min après la fin du cours */
    if (date) {
      const wd = U.parse(date).getDay();
      (p.ext || []).filter(e => e.day === wd && U.toMin(e.start) >= 17 * 60).forEach(e => {
        const need = U.toMin(e.end) + 30 - cfg.end;
        if (need > cfg.shifted) { cfg.shifted = Math.min(180, need); cfg.shiftFor = e.name; }
      });
      cfg.start += cfg.shifted; cfg.end += cfg.shifted;
    }
    return cfg;
  }

  /* Programme personnalisé : déduit des paramètres du profil (niveau, âge, IMC, temps, fréquence) */
  function program(p) {
    const lv = LEVELS[p.level] || LEVELS.inter;
    const age = p.birth ? C_age(p) : 38, bmi = p.height ? curBmi(p) : 25;
    const reasons = [];
    const perWeek = U.clamp(parseInt(p.perWeek, 10) || ({ debutant: 3, inter: 4, avance: 5 }[p.level] || 4), 2, 6);
    reasons.push(p.perWeek && p.perWeek !== 'auto' ? `${perWeek} séances par semaine (ton choix)` : `${perWeek} séances par semaine (adapté à ton niveau ${lv.nom.toLowerCase()})`);
    let repK = lv.k;
    if (age >= 50) { repK *= 0.9; reasons.push('volume réduit de 10 % (50 ans et plus)'); }
    if (bmi >= 35) { repK *= 0.85; reasons.push('volume réduit de 15 % (IMC ≥ 35) : on monte progressivement'); }
    const lowImpact = !!p.lowImpact || bmi >= 32 || age >= 55;
    if (lowImpact) reasons.push(p.lowImpact ? 'sans sauts, comme demandé' : 'sans sauts ni impacts forts (pour préserver genoux et dos)');
    const capWeek = parseInt(p.timeWeek, 10) || 25, capWeekend = parseInt(p.timeWeekend, 10) || 45;
    reasons.push(`séances de ${capWeek} min maximum en semaine, ${capWeekend} min le week-end`);
    if (p.activity === 'sedentaire') reasons.push('travail assis : pauses actives et exercices de dos / fessiers privilégiés');
    return { perWeek, repK, lowImpact, capWeek, capWeekend, restBonus: p.level === 'debutant' ? 10 : 0, reasons, age, bmi };
  }
  const C_age = p => age(p), curBmi = p => bmi(p);

  return { ACTIVITY, LEVELS, PACES, program, age, weights, curWeight, bmi, bmr, tdee, kcal, protein, water, bmiLabel, deficit, wantsLoss, fastCfg };
})();
