/* FitFamille — planning de la semaine : cours extérieurs + récupération musculaire.
   Règle : on ne sollicite pas intensément le même groupe musculaire deux jours d'affilée. */
window.FF = window.FF || {};
FF.Plan = (() => {
  const { SESSIONS, EXOS, PREF, GROUPS, GROUP_NAMES, THRESH, EXT_KINDS } = FF.data;
  const U = FF.U;
  const zero = () => ({ jambes: 0, haut: 0, dos: 0, abdos: 0, cardio: 0 });
  const maxL = (a, b) => { const o = zero(); GROUPS.forEach(g => { o[g] = Math.max(a[g] || 0, b[g] || 0); }); return o; };
  const weekday = d => U.parse(d).getDay();
  const exoOf = id => EXOS.find(e => e.id === id);

  function loadOfSession(def, p) {
    if (!def) return zero();
    if (def.type === 'activity') return Object.assign(zero(), { cardio: 1 });
    let L = zero();
    def.items.forEach(it => {
      const id = FF.Session.sub(it.ex, p);
      L = maxL(L, Object.assign(zero(), exoOf(id).charge));
    });
    return L;
  }
  const loadOfExt = e => Object.assign(zero(), (EXT_KINDS[e.kind] || EXT_KINDS.sculpt).charge);
  const loadOfExts = list => list.reduce((a, e) => maxL(a, loadOfExt(e)), zero());
  const conflicts = (a, b) => GROUPS.filter(g => (a[g] || 0) >= THRESH[g] && (b[g] || 0) >= THRESH[g]);
  const names = gs => gs.map(g => GROUP_NAMES[g].toLowerCase()).join(', ');
  const extMinutes = e => Math.max(15, U.toMin(e.end) - U.toMin(e.start));

  /* Cours (extérieurs) d'un jour de la semaine (0 = dimanche) ou d'une date */
  const extByDay = (p, wd) => (p.ext || []).filter(e => e.day === wd).sort((a, b) => a.start.localeCompare(b.start));
  const extFor = (p, date) => extByDay(p, weekday(date));

  /* Plan automatique par jour de semaine, calculé d'après le profil (nombre de séances, cours, récupération) */
  function autoPlan(p) {
    const out = {};
    const pr = FF.calc.program(p);
    const order = [1, 2, 3, 4, 5, 6, 0];
    const nExt = (p.ext || []).length;
    const free = [6, 1, 3, 5, 2, 4].filter(wd => !extByDay(p, wd).length);   // jours d'entraînement, dans l'ordre de priorité
    const need = Math.max(0, Math.min(free.length, pr.perWeek - nExt));
    const train = new Set(free.slice(0, need));
    let prev = loadOfExts(extByDay(p, 0));              // veille du lundi = dimanche (seulement ses cours)
    order.forEach(wd => {
      const ex = extByDay(p, wd);
      if (ex.length) { out[wd] = { ext: ex, def: null, load: loadOfExts(ex), note: '' }; prev = out[wd].load; return; }
      if (wd !== 0 && !train.has(wd)) {
        const def = pr.perWeek >= 4 ? SESSIONS.mobi : null;
        out[wd] = { ext: [], def, load: loadOfSession(def, p), note: def ? 'Jour léger : mobilité facultative pour récupérer.' : '', rest: !def };
        prev = out[wd].load; return;
      }
      const nextExt = loadOfExts(extByDay(p, (wd + 1) % 7));
      const nextNames = extByDay(p, (wd + 1) % 7).map(e => e.name).join(', ');
      const cands = PREF[wd];
      let chosen = null;
      for (let i = 0; i < cands.length && !chosen; i++) {
        const def = SESSIONS[cands[i]], L = loadOfSession(def, p);
        const cPrev = conflicts(prev, L), cNext = conflicts(L, nextExt);
        if (!cPrev.length && !cNext.length) {
          chosen = { ext: [], def, load: L, note: '' };
          if (i > 0) {
            const f = loadOfSession(SESSIONS[cands[0]], p);
            const a = conflicts(prev, f), b = conflicts(f, nextExt);
            chosen.note = a.length ? `Adaptée : ${names(a)} déjà sollicité${a.length > 1 ? 's' : ''} la veille.` : `Adaptée : on ménage ${names(b)} avant ton cours (${nextNames}).`;
          }
        }
      }
      if (!chosen) { const def = SESSIONS[cands[cands.length - 1]]; chosen = { ext: [], def, load: loadOfSession(def, p), note: 'Jour de récupération.' }; }
      out[wd] = chosen; prev = chosen.load;
    });
    return out;
  }

  /* Programme d'une date : séance choisie à la main > plan automatique ; + cours extérieurs */
  function dayFor(p, date) {
    const wd = weekday(date), ap = autoPlan(p)[wd], ov = p.log.plan[date];
    const def = ov && SESSIONS[ov] ? SESSIONS[ov] : ap.def;
    const ext = extFor(p, date);
    return { date, wd, ext, def, rest: !def && !ext.length, load: maxL(loadOfSession(def, p), loadOfExts(ext)), note: ov ? '' : ap.note, manual: !!ov && SESSIONS[ov] !== undefined };
  }
  /* Charge réellement subie un jour : séances faites (ou prévues pour aujourd'hui / à venir) */
  function dayLoad(p, date) {
    const s = p.log.sessions[date];
    if (s && s.load) return s.load;
    if (date < U.ds()) return zero();
    return dayFor(p, date).load;
  }
  /* Groupes en conflit si on fait `def` ce jour-là (veille réelle / lendemain prévu) */
  function conflictsFor(p, date, def) {
    const L = loadOfSession(def, p);
    const before = conflicts(dayLoad(p, U.addDays(date, -1)), L);
    const after = conflicts(L, dayFor(p, U.addDays(date, 1)).load);
    return { before, after };
  }
  const chips = L => GROUPS.filter(g => (L[g] || 0) >= THRESH[g] || (g === 'abdos' && L[g] >= 2));

  return { zero, maxL, loadOfSession, loadOfExt, loadOfExts, extFor, extByDay, extMinutes, dayFor, dayLoad, conflicts, conflictsFor, chips, names, autoPlan };
})();
