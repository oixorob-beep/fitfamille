/* FitFamille — construction des séances et coach guidé (minuteur, repos, bips) */
window.FF = window.FF || {};

FF.Session = (() => {
  const { EXOS } = FF.data;
  const U = FF.U;
  const exo = id => EXOS.find(e => e.id === id);

  /* Remplacements automatiques : niveau débutant et profils « faible impact » */
  const LOW = { jacks: 'jacks_low', genoux: 'genoux_low', mountain: 'planche' };
  function sub(id, p) {
    const pr = p ? FF.calc.program(p) : null;
    if (p && p.level === 'debutant' && id === 'pompes') id = 'pompes_genoux';
    if (pr && pr.lowImpact && LOW[id]) id = LOW[id];
    return id;
  }

  /* Adapte une séance type au profil : niveau, âge, IMC, temps disponible ce jour-là */
  function build(def, p, date) {
    const pr = FF.calc.program(p);
    const lv = FF.calc.LEVELS[p.level] || FF.calc.LEVELS.inter;
    const wd = date ? U.parse(date).getDay() : new Date().getDay();
    const cap = (wd === 0 || wd === 6) ? pr.capWeekend : pr.capWeek;
    let rounds = def.fixedRounds ? def.rounds : Math.max(1, def.rounds + lv.rounds);
    let items = def.items.map(it => {
      const o = { ex: sub(it.ex, p) };
      if (it.reps) o.reps = Math.max(5, Math.round(it.reps * pr.repK));
      if (it.sec) o.sec = Math.max(15, Math.round(it.sec * pr.repK / 5) * 5);
      if (o.ex === 'planche' && it.ex === 'mountain') { delete o.reps; o.sec = Math.min(o.sec || 30, 30); }
      return o;
    });
    const s = { id: def.id, titre: def.titre, focus: def.focus, type: def.type, met: def.met, rounds, rest: def.rest + pr.restBonus, roundRest: def.roundRest || 45, items, warm: !def.noWarm && def.type !== 'activity', minutes: def.minutes, capped: false };
    if (def.type !== 'activity') {
      s.minutes = estimate(s);
      while (s.minutes > cap && s.rounds > 1) { s.rounds--; s.minutes = estimate(s); s.capped = true; }
      while (s.minutes > cap && s.items.length > 3) { s.items = s.items.slice(0, -1); s.minutes = estimate(s); s.capped = true; }
    }
    return s;
  }
  function estimate(s) {
    let per = 0;
    s.items.forEach(it => { per += (it.sec ? it.sec : it.reps * 3.5) + s.rest; });
    const sec = s.rounds * per + (s.rounds - 1) * s.roundRest + (s.warm ? 60 : 0);
    return Math.max(1, Math.round(sec / 60));
  }
  const dose = it => it.sec ? `${it.sec} s` : `${it.reps} rép.${exo(it.ex).par ? ' ' + exo(it.ex).par : ''}`;
  const kcalFor = (met, kg, minutes) => Math.round(met * kg * minutes / 60);

  return { build, estimate, dose, exo, kcalFor, sub };
})();

FF.Player = (() => {
  const U = FF.U, esc = U.esc;
  let P = null, timer = null, wake = null, ctx = null;
  const root = () => document.getElementById('player-root');

  function beep(freq, ms) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq; o.type = 'sine'; g.gain.value = 0.08;
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + ms / 1000);
    } catch (e) { }
    try { if (navigator.vibrate) navigator.vibrate(ms > 200 ? 200 : 60); } catch (e) { }
  }

  function steps(s) {
    const out = [];
    if (s.warm) out.push({ type: 'warm', sec: 60, ex: 'marche', label: 'Échauffement' });
    for (let r = 1; r <= s.rounds; r++) {
      s.items.forEach((it, i) => {
        out.push({ type: 'work', r, i, it, ex: it.ex, sec: it.sec || 0 });
        const lastItem = i === s.items.length - 1, lastRound = r === s.rounds;
        if (!(lastItem && lastRound)) out.push({ type: 'rest', sec: lastItem ? s.roundRest : s.rest, afterRound: lastItem });
      });
    }
    return out;
  }
  const nextWork = from => { for (let k = from + 1; k < P.steps.length; k++) if (P.steps[k].type === 'work') return P.steps[k]; return null; };

  function start(sess, opts) {
    P = { sess, steps: steps(sess), i: 0, opts: opts || {}, t0: Date.now(), pausedTotal: 0, paused: false, lastBeep: 0, done: false };
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => { }); } catch (e) { }
    beep(660, 100);
    goto(0);
    clearInterval(timer); timer = setInterval(tick, 200);
  }
  function close() {
    clearInterval(timer); timer = null;
    try { if (wake) wake.release(); } catch (e) { } wake = null;
    root().innerHTML = ''; document.body.classList.remove('lock'); P = null;
  }
  function goto(i) {
    P.i = i; P.paused = false; P.lastBeep = 0;
    const st = P.steps[i];
    if (!st) return finish();
    if (st.sec) P.endAt = Date.now() + st.sec * 1000;
    render();
  }
  const next = () => goto(P.i + 1);
  const activeMs = () => Date.now() - P.t0 - P.pausedTotal - (P.paused ? Date.now() - P.pauseStart : 0);

  function tick() {
    if (!P || P.paused || P.done) return;
    const st = P.steps[P.i];
    if (!st || !st.sec) return;
    const rem = Math.ceil((P.endAt - Date.now()) / 1000);
    const el = document.getElementById('pl-time');
    if (el) el.textContent = U.dur(Math.max(0, rem));
    if (rem <= 3 && rem > 0 && rem !== P.lastBeep) { P.lastBeep = rem; beep(880, 90); }
    if (rem <= 0) { beep(1250, 300); next(); }
  }
  function togglePause() {
    if (!P) return;
    const st = P.steps[P.i];
    if (!P.paused) { P.paused = true; P.pauseStart = Date.now(); P.remMs = st.sec ? P.endAt - Date.now() : 0; }
    else { P.paused = false; P.pausedTotal += Date.now() - P.pauseStart; if (st.sec) P.endAt = Date.now() + P.remMs; }
    render();
  }
  function finish() {
    P.done = true;
    const ms = activeMs();
    P.result = { min: Math.max(1, Math.round(ms / 60000)), kcal: Math.round(P.sess.met * (P.opts.weight || 80) * ms / 3600000) };
    beep(1000, 150); setTimeout(() => beep(1400, 250), 200);
    render();
  }

  function render() {
    const st = P.steps[P.i], s = P.sess, R = root();
    document.body.classList.add('lock');
    if (P.done) {
      R.innerHTML = `<div class="player"><div class="pl-body center">
        <div class="pl-trophy">🎉</div><h2>Séance terminée !</h2>
        <p class="muted">Bravo, c'est dans la boîte. Chaque séance compte, même courte.</p>
        <div class="pl-stats"><div><b>${P.result.min}</b><span>minutes</span></div><div><b>≈ ${P.result.kcal}</b><span>kcal</span></div><div><b>${s.rounds}</b><span>tours</span></div></div>
        <p class="muted small">Pense à boire un grand verre d'eau.</p>
        <button class="btn primary xl" data-pl="finish">Enregistrer et terminer</button></div></div>`;
      return;
    }
    const workSteps = P.steps.filter(x => x.type === 'work');
    const doneWork = P.steps.slice(0, P.i).filter(x => x.type === 'work').length;
    const pct = Math.round(P.i / P.steps.length * 100);
    const top = `<div class="pl-top"><button class="icon-btn" data-pl="quit" aria-label="Quitter la séance">✕</button>
      <div class="pl-prog" aria-hidden="true"><i style="width:${pct}%"></i></div><span class="pl-count">${doneWork}/${workSteps.length}</span></div>`;
    let body = '';
    if (st.type === 'work' || st.type === 'warm') {
      const ex = FF.Session.exo(st.ex);
      const label = st.type === 'warm' ? 'Échauffement' : `Tour ${st.r}/${s.rounds} · Exercice ${st.i + 1}/${s.items.length}`;
      const nx = st.type === 'warm' ? P.steps[1] : nextWork(P.i);
      const nxEx = nx && nx.type === 'work' ? FF.Session.exo(nx.ex) : null;
      const big = st.sec ? `<div class="pl-big" id="pl-time">${U.dur(Math.max(0, Math.ceil((P.paused ? P.remMs : P.endAt - Date.now()) / 1000)))}</div>`
        : `<div class="pl-big">${st.it.reps}<small>répétitions${ex.par ? ' ' + esc(ex.par) : ''}</small></div>`;
      const hint = st.type === 'warm' ? 'Marche sur place, mobilise épaules et hanches en douceur.' : esc(ex.etapes[1] || ex.etapes[0]);
      body = `<div class="pl-label">${label}</div><div class="pl-fig" id="pl-fig"></div><h2>${esc(ex.nom)}</h2>${big}
        <p class="pl-hint">${hint}</p>
        <div class="pl-actions">
          <button class="btn ghost" data-pl="pause">${P.paused ? '▶ Reprendre' : '⏸ Pause'}</button>
          <button class="btn primary xl" data-pl="next">${st.sec ? 'Passer' : 'Terminé ✓'}</button>
        </div>
        <p class="pl-next">${nxEx ? 'Ensuite : <b>' + esc(nxEx.nom) + '</b>' : 'Dernier exercice !'}</p>`;
    } else {
      const nx = nextWork(P.i), nxEx = nx ? FF.Session.exo(nx.ex) : null;
      body = `<div class="pl-label">${st.afterRound ? 'Fin du tour — souffle un peu' : 'Repos'}</div>
        <div class="pl-big" id="pl-time">${U.dur(Math.max(0, Math.ceil((P.paused ? P.remMs : P.endAt - Date.now()) / 1000)))}</div>
        ${nxEx ? `<div class="pl-up"><div class="pl-thumb">${FF.Fig.thumb(nxEx)}</div><div><span class="muted small">Prochain exercice</span><h3>${esc(nxEx.nom)}</h3><p class="muted">${esc(FF.Session.dose(nx.it))}</p></div></div>` : ''}
        <div class="pl-actions">
          <button class="btn ghost" data-pl="plus">+15 s</button>
          <button class="btn ghost" data-pl="pause">${P.paused ? '▶ Reprendre' : '⏸ Pause'}</button>
          <button class="btn primary xl" data-pl="next">Passer le repos</button>
        </div>`;
    }
    R.innerHTML = `<div class="player" role="dialog" aria-modal="true" aria-label="Séance en cours">${top}<div class="pl-body">${body}</div></div>`;
    const fig = document.getElementById('pl-fig');
    if (fig) FF.Fig.mount(fig, FF.Session.exo(st.ex));
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pl]');
    if (!b || !P) return;
    const a = b.dataset.pl;
    if (a === 'next') { beep(700, 60); next(); }
    else if (a === 'pause') togglePause();
    else if (a === 'plus') { if (P.paused) P.remMs += 15000; else P.endAt += 15000; P.steps[P.i].sec += 15; render(); }
    else if (a === 'quit') { if (confirm('Quitter la séance en cours ? Elle ne sera pas enregistrée.')) close(); }
    else if (a === 'finish') { const res = P.result, cb = P.opts.onDone, sess = P.sess; close(); if (cb) cb(res, sess); }
  });

  return { start, close, isOpen: () => !!P };
})();
