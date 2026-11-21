/* FitFamille — garde-manger, recettes avec ce qu'on a, recettes perso et liste de courses */
window.FF = window.FF || {};
FF.Pantry = (() => {
  const U = FF.U, esc = U.esc, D = FF.data, I = FF.ing;
  let A = null;                                   // contexte fourni par app.js (install)
  const POOLN = { petitdej: 'Petit-déjeuner', dej: 'Déjeuner', collation: 'Collation', recup: 'Récupération', diner: 'Dîner' };
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const ensure = p => {
    p.pantry = p.pantry || []; p.recipes = p.recipes || []; p.customIng = p.customIng || [];
    p.shop = p.shop || { checked: {}, extras: [], people: 1 };
    p.shop.checked = p.shop.checked || {}; p.shop.extras = p.shop.extras || []; p.shop.people = p.shop.people || 1;
    return p;
  };
  const ing = (p, id) => I.CATALOG[id] || ((p.customIng || []).find(x => x.id === id)) || { id, nom: id, rayon: I.R.ep, unit: 'u', k: 0, p: 0, ul: 'pièce' };
  const allIng = p => Object.values(I.CATALOG).concat(p.customIng || []);
  function fmtQ(g, q) {
    if (g.unit === 'u') { const n = q < 10 ? Math.round(q * 10) / 10 : Math.round(q); return `${U.n1(n)} ${g.ul}${n > 1 && !/s$/.test(g.ul) ? 's' : ''}`; }
    return `${Math.round(q)} ${g.unit}`;
  }
  /* Nutrition d'une quantité q : kcal et protéines (par pièce si unité u, sinon pour 100 g / 100 ml) */
  const nut = (g, q) => { const f = g.unit === 'u' ? q : q / 100; return { k: (g.k || 0) * f, p: (g.p || 0) * f }; };
  const fmtNut = n => `${Math.round(n.k).toLocaleString('fr-FR')} kcal · ${Math.round(n.p)} g prot.`;
  const refNut = g => g.unit === 'u' ? `${Math.round(g.k)} kcal / ${g.ul}` : `${Math.round(g.k)} kcal / 100 ${g.unit}`;
  const unitLabel = g => g.unit === 'u' ? g.ul + '(s)' : g.unit;
  const buyQty = (g, x) => g.unit === 'u' ? Math.ceil(x - 0.001) : Math.ceil(x / (x < 100 ? 10 : 50) - 0.001) * (x < 100 ? 10 : 50);
  const describe = (p, list) => list.map(x => `${ing(p, x.i).nom.toLowerCase()} ${fmtQ(ing(p, x.i), x.q)}`).join(', ');
  const owned = (p, id) => (p.pantry || []).find(x => x.id === id);

  /* Repas disponibles pour un type de repas : catalogue + recettes perso */
  function pool(p, name) {
    ensure(p);
    const base = D.MEALS[name] || [];
    const own = p.recipes.filter(r => r.pool === name || (name === 'recup' && r.pool === 'collation'))
      .map(r => ({ id: r.id, n: r.name, kcal: r.kcal, p: r.p, d: describe(p, r.ing), ing: r.ing, custom: true }));
    return base.concat(own);
  }
  function findRecipe(p, id) {
    ensure(p);
    for (const name of Object.keys(D.MEALS)) { const r = pool(p, name).find(x => x.id === id); if (r) return { recipe: r, pool: name }; }
    const c = p.recipes.find(r => r.id === id);
    return c ? { recipe: pool(p, c.pool).find(x => x.id === id), pool: c.pool } : null;
  }
  /* Couverture d'une recette par le garde-manger */
  function cover(p, r, mult) {
    mult = mult || 1;
    const have = [], miss = [];
    (r.ing || []).forEach(x => {
      const it = owned(p, x.i);
      (it && (it.qty == null || it.qty >= x.q * mult * 0.9) ? have : miss).push(x);
    });
    const n = have.length + miss.length;
    return { have, miss, pct: n ? have.length / n : 0 };
  }
  function badge(p, r) {
    ensure(p);
    if (!p.pantry.length || !r.ing || !r.ing.length) return '';
    const c = cover(p, r);
    return c.miss.length === 0 ? '<span class="badge brand">Tu as tout ✓</span>' : `<span class="badge ${c.pct >= 0.6 ? 'accent' : ''}">Il manque ${c.miss.length}</span>`;
  }

  /* ---------- Liste de courses ---------- */
  function shopList(p, days, people) {
    ensure(p);
    const need = {}; let meals = 0;
    const mine = { k: 0, p: 0 };                    // ce que mange le profil (sans les autres personnes)
    const t0 = U.ds();
    for (let k = 0; k < days; k++) {
      const d = U.addDays(t0, k), menu = A.menuFor(p, d);
      menu.items.forEach(it => {
        if (it.eaten || it.custom || !it.meal.ing) return;
        meals++;
        const mult = menu.scale + (people - 1);
        it.meal.ing.forEach(x => {
          need[x.i] = (need[x.i] || 0) + x.q * mult;
          const n = nut(ing(p, x.i), x.q * menu.scale); mine.k += n.k; mine.p += n.p;
        });
      });
    }
    const toBuy = [], inStock = [];
    Object.keys(need).forEach(id => {
      const g = ing(p, id), it = owned(p, id);
      let buy = need[id];
      if (it) buy = it.qty == null ? 0 : Math.max(0, need[id] - it.qty);
      if (buy > 0.001) toBuy.push({ id, g, need: need[id], buy: buyQty(g, buy), have: it ? it.qty : 0 });
      else inStock.push({ id, g });
    });
    toBuy.sort((a, b) => a.g.rayon.localeCompare(b.g.rayon, 'fr') || a.g.nom.localeCompare(b.g.nom, 'fr'));
    const tot = { k: 0, p: 0 }, buyTot = { k: 0, p: 0 };
    Object.keys(need).forEach(id => { const n = nut(ing(p, id), need[id]); tot.k += n.k; tot.p += n.p; });
    toBuy.forEach(x => { const n = nut(x.g, x.buy); buyTot.k += n.k; buyTot.p += n.p; });
    return { toBuy, inStock, meals, tot, buyTot, mine, days };
  }
  const shopText = (p, L) => {
    const lines = ['Liste de courses FitFamille'];
    let cur = '';
    L.toBuy.forEach(x => { if (x.g.rayon !== cur) { cur = x.g.rayon; lines.push('', cur.toUpperCase()); } lines.push(`- ${x.g.nom} : ${fmtQ(x.g, x.buy)} (${fmtNut(nut(x.g, x.buy))})`); });
    if (L.meals) lines.push('', `NUTRITION DES REPAS PRÉVUS (${L.days} j) : ${fmtNut(L.tot)} · moi ≈ ${Math.round(L.mine.k / L.days)} kcal et ${Math.round(L.mine.p / L.days)} g de protéines par jour`);
    if (p.shop.extras.length) { lines.push('', 'AUTRES'); p.shop.extras.forEach(e => lines.push('- ' + e.name)); }
    return lines.join('\n');
  };

  /* Choisit les repas des prochains jours en favorisant ce qu'on a déjà et les ingrédients communs */
  function planDays(p, days) {
    ensure(p);
    const used = {}, count = {}; const t0 = U.ds();
    for (let k = 0; k < days; k++) {
      const d = U.addDays(t0, k), ml = A.mealLog(p, d, true);
      ml.pick = ml.pick || {};
      A.slotPlan(p, d).forEach(pl => {
        if (ml.eaten[pl.id] || ml.custom[pl.id]) return;
        const cands = pool(p, pl.pool || pl.id);
        let best = null, bs = -1e9;
        const pickFrom = cands.filter(r => (count[r.id] || 0) < 2);          // pas plus de 2 fois la même recette
        (pickFrom.length ? pickFrom : cands).forEach((r, ix) => {
          const ings = r.ing || [];
          const ov = ings.length ? ings.filter(x => used[x.i] && used[x.i] < 4).length / ings.length : 0;
          const heavy = ings.filter(x => (used[x.i] || 0) >= 5).length;       // évite de manger 7 jours de suite le même aliment
          const sc = cover(p, r).pct + 0.35 * ov - 0.6 * (count[r.id] || 0) - 0.3 * heavy + (((ix + k) % cands.length) * 1e-3);
          if (sc > bs) { bs = sc; best = r; }
        });
        if (best) { ml.pick[pl.id] = best.id; count[best.id] = (count[best.id] || 0) + 1; (best.ing || []).forEach(x => { used[x.i] = (used[x.i] || 0) + 1; }); }
      });
    }
  }

  /* ---------- Vues ---------- */
  function viewPantry(p) {
    ensure(p);
    const byR = {};
    p.pantry.forEach(it => { const g = ing(p, it.id); (byR[g.rayon] = byR[g.rayon] || []).push({ it, g }); });
    const rows = Object.keys(byR).sort((a, b) => a.localeCompare(b, 'fr')).map(r => `<h3 class="rayon">${esc(r)}</h3><div class="list">` +
      byR[r].sort((a, b) => a.g.nom.localeCompare(b.g.nom, 'fr')).map(({ it, g }) => `<div class="item"><span class="grow"><b>${esc(g.nom)}</b></span>
        <input class="qty" type="number" min="0" step="any" inputmode="decimal" placeholder="assez" value="${it.qty == null ? '' : it.qty}" data-change="pantryQty" data-id="${esc(it.id)}" aria-label="Quantité de ${esc(g.nom)}">
        <span class="muted small unit">${esc(unitLabel(g))}</span><button class="icon-btn" data-act="pantryDel" data-id="${esc(it.id)}" aria-label="Retirer ${esc(g.nom)}">✕</button></div>`).join('') + '</div>').join('');
    /* idées de repas avec ce qu'on a */
    let ideas = '';
    if (p.pantry.length) {
      const all = [];
      Object.keys(D.MEALS).forEach(name => pool(p, name).forEach(r => { if (r.ing && r.ing.length) all.push({ r, name, c: cover(p, r) }); }));
      const top = all.filter(x => x.c.pct >= 0.5).sort((a, b) => b.c.pct - a.c.pct || a.c.miss.length - b.c.miss.length).slice(0, 8);
      ideas = top.length ? `<div class="list">${top.map(({ r, name, c }) => `<button class="item" data-act="recipeOpen" data-id="${esc(r.id)}"><span class="grow"><b>${esc(r.n)}</b> <span class="badge">${POOLN[name]}</span><br>
        <span class="muted small">${c.miss.length ? 'Manque : ' + esc(c.miss.map(x => ing(p, x.i).nom.toLowerCase()).join(', ')) : 'Tu as tous les ingrédients'}</span></span>${c.miss.length ? `<span class="badge ${c.pct >= 0.7 ? 'accent' : ''}">${Math.round(c.pct * 100)} %</span>` : '<span class="badge brand">Prêt ✓</span>'}</button>`).join('')}</div>`
        : '<p class="muted small">Ajoute encore quelques ingrédients : aucune recette n\'est couverte à moitié pour l\'instant.</p>';
    }
    const mine = p.recipes.map(r => `<button class="item" data-act="recipeOpen" data-id="${esc(r.id)}"><span class="grow"><b>${esc(r.name)}</b> <span class="badge">${POOLN[r.pool]}</span><br><span class="muted small">${r.kcal} kcal · ${r.p} g de protéines</span></span></button>`).join('');
    return `
      <section class="card">
        <h2>Mon garde-manger</h2>
        <p class="muted small">Note ce que tu as déjà chez toi. L'appli te propose des repas avec ces ingrédients et ne met dans la liste de courses que ce qui manque. Laisse la quantité vide si tu en as « assez ».</p>
        <label class="field"><span class="sr">Ajouter un ingrédient</span><input type="text" id="pq" data-input="pantryQ" placeholder="Ajouter un ingrédient (poulet, riz, œufs…)" value="${esc(A.UI.pantryQ || '')}" autocomplete="off"></label>
        <div id="pres" class="chips wrapchips"></div>
        ${p.pantry.length ? '' : '<button class="btn" data-act="pantryBasics">+ Ajouter les basiques (œufs, lait, riz, pâtes…)</button>'}
      </section>
      ${p.pantry.length ? `<section class="card"><div class="row between"><h2>Chez moi (${p.pantry.length})</h2><button class="btn sm ghost danger" data-act="pantryClear">Tout vider</button></div>${rows}</section>` : ''}
      ${p.pantry.length ? `<section class="card"><h2>🍳 Que cuisiner ?</h2>${ideas}</section>` : ''}
      <section class="card"><div class="row between"><h2>Mes recettes</h2><button class="btn sm primary" data-act="recipeNew">+ Créer</button></div>
        ${mine || '<p class="muted small">Crée tes propres recettes à partir des ingrédients : les calories sont calculées pour toi et elles entrent dans le menu.</p>'}</section>`;
  }
  function renderResults() {
    const el = document.getElementById('pres'); if (!el) return;
    const p = ensure(A.P()), q = norm(A.UI.pantryQ || '');
    const have = new Set(p.pantry.map(x => x.id));
    let list = allIng(p).filter(g => !have.has(g.id));
    if (q) list = list.filter(g => norm(g.nom).includes(q));
    else {
      const freq = {};
      Object.values(I.RECIPE_ING).forEach(l => l.forEach(([i]) => { freq[i] = (freq[i] || 0) + 1; }));
      list.sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
    }
    list = list.slice(0, q ? 30 : 16);
    const exact = q && allIng(p).some(g => norm(g.nom) === q);
    el.innerHTML = list.map(g => `<button class="chip" data-act="pantryAdd" data-id="${esc(g.id)}">+ ${esc(g.nom)}</button>`).join('')
      + (q && !exact ? `<button class="chip on" data-act="ingCreate" data-q="${esc(A.UI.pantryQ.trim())}">Créer « ${esc(A.UI.pantryQ.trim())} »</button>` : '')
      + (!list.length && !q ? '<span class="muted small">Tout le catalogue est déjà dans ton garde-manger.</span>' : '');
  }

  function viewShop(p) {
    ensure(p);
    const days = A.UI.shopDays || 7, people = p.shop.people;
    const L = shopList(p, days, people);
    const byR = {};
    L.toBuy.forEach(x => { (byR[x.g.rayon] = byR[x.g.rayon] || []).push(x); });
    const groups = Object.keys(byR).map(r => `<h3 class="rayon">${esc(r)}</h3><div class="list">${byR[r].map(x => {
      const on = !!p.shop.checked[x.id];
      return `<button class="item check ${on ? 'on' : ''}" data-act="shopCheck" data-id="${esc(x.id)}" aria-pressed="${on}"><span class="ico">✓</span><span class="grow"><span class="t"><b>${esc(x.g.nom)}</b> — ${esc(fmtQ(x.g, x.buy))}</span><br><span class="muted small">${esc(fmtQ(x.g, x.need))} nécessaires${x.have ? ' · tu en as ' + esc(fmtQ(x.g, x.have)) : ''}</span><br><span class="nutri small">${esc(fmtNut(nut(x.g, x.buy)))}</span> <span class="muted small">· ${esc(refNut(x.g))}</span></span></button>`;
    }).join('')}</div>`).join('');
    const extras = p.shop.extras.map(e => `<div class="item check ${e.on ? 'on' : ''}" style="padding:0"><button class="item check ${e.on ? 'on' : ''}" style="flex:1" data-act="shopExtraCheck" data-id="${e.id}" aria-pressed="${!!e.on}"><span class="ico">✓</span><span class="grow t">${esc(e.name)}</span></button><button class="icon-btn" data-act="shopExtraDel" data-id="${e.id}" aria-label="Supprimer ${esc(e.name)}">✕</button></div>`).join('');
    const nChecked = L.toBuy.filter(x => p.shop.checked[x.id]).length;
    return `
      <section class="card">
        <h2>Liste de courses</h2>
        <div class="chips" role="group" aria-label="Période">${[[1, "Aujourd'hui"], [3, '3 jours'], [7, '7 jours'], [14, '14 jours']].map(([n, l]) => `<button class="chip" aria-pressed="${days === n}" data-act="shopDays" data-n="${n}">${l}</button>`).join('')}</div>
        <div class="row between"><span><b>Je cuisine pour</b> <span class="muted small">(moi + autres)</span></span>
          <span class="row"><button class="icon-btn" data-act="shopPeople" data-n="-1" aria-label="Moins de personnes">−</button><b style="min-width:24px;text-align:center">${people}</b><button class="icon-btn" data-act="shopPeople" data-n="1" aria-label="Plus de personnes">+</button></span></div>
        <p class="muted small">${L.meals} repas prévus · ${L.toBuy.length} article${L.toBuy.length > 1 ? 's' : ''} à acheter${L.inStock.length ? ' · ' + L.inStock.length + ' déjà chez toi' : ''}.</p>
        ${L.meals ? `<div class="nutri-box" aria-label="Valeurs nutritionnelles">
          <div><b>${Math.round(L.mine.k / days).toLocaleString('fr-FR')}</b><span>kcal / jour pour toi</span></div>
          <div><b>${Math.round(L.mine.p / days)} g</b><span>protéines / jour pour toi</span></div>
          <div><b>${Math.round(L.buyTot.k).toLocaleString('fr-FR')}</b><span>kcal achetées</span></div>
          <div><b>${Math.round(L.buyTot.p)} g</b><span>protéines achetées</span></div>
        </div><p class="muted small">Total des repas prévus (${days} j${people > 1 ? ', ' + people + ' personnes' : ''}) : ${esc(fmtNut(L.tot))} — valeurs estimées à partir des ingrédients crus (huile de cuisson et assaisonnements non inclus) : elles peuvent être un peu en dessous des kcal affichées sur les repas.</p>` : ''}
        <button class="btn primary block" data-act="shopPlan">✨ Choisir mes repas pour limiter les achats</button>
        <button class="btn sm ghost block" data-act="shopReset">Revenir au menu automatique</button>
      </section>
      ${L.toBuy.length ? `<section class="card">${groups}</section>` : `<section class="card"><p class="center muted">${L.meals ? 'Tu as déjà tout ce qu\'il faut pour ces repas 🎉' : 'Aucun repas à prévoir sur cette période.'}</p></section>`}
      <section class="card"><h3>Autres articles</h3>${extras}
        <form data-form="shopExtra" class="row"><input type="text" name="name" class="grow" placeholder="Ajouter un article (savon, café…)" aria-label="Autre article" maxlength="50" required><button class="btn">Ajouter</button></form></section>
      <section class="card"><div class="row wrap">
        <button class="btn sm primary" data-act="shopToPantry" ${nChecked ? '' : 'disabled'}>✓ ${nChecked || ''} acheté${nChecked > 1 ? 's' : ''} : ajouter au garde-manger</button>
        <button class="btn sm" data-act="shopCopy">Copier la liste</button><button class="btn sm ghost" data-act="shopUncheck">Tout décocher</button></div></section>
      ${L.inStock.length ? `<section class="card flat"><h3>Déjà chez toi</h3><p class="muted small">${L.inStock.map(x => esc(x.g.nom.toLowerCase())).join(', ')}</p></section>` : ''}`;
  }

  /* ---------- Feuilles ---------- */
  function sheetRecipe(id) {
    const p = ensure(A.P()), f = findRecipe(p, id); if (!f) return;
    const r = f.recipe, c = cover(p, r);
    const rows = (r.ing || []).map(x => {
      const g = ing(p, x.i), it = owned(p, x.i), ok = it && (it.qty == null || it.qty >= x.q * 0.9);
      return `<div class="item"><span class="ico-s ${ok ? 'ok' : 'no'}" aria-hidden="true">${ok ? '✓' : '✗'}</span><span class="grow"><b>${esc(g.nom)}</b></span><span>${esc(fmtQ(g, x.q))}</span>${!ok && it && it.qty != null ? `<span class="muted small">(tu as ${esc(fmtQ(g, it.qty))})</span>` : ''}</div>`;
    }).join('');
    const menu = A.menuFor(p, A.UI.mealDate);
    const uses = menu.items.filter(it => (it.pool || it.id) === f.pool || (f.pool === 'collation' && it.pool === 'recup'))
      .map(it => `<button class="btn block" data-act="recipeUse" data-id="${esc(id)}" data-slot="${it.id}">Utiliser pour : ${esc(it.meta.nom)} — ${esc(A.UI.mealDate === U.ds() ? 'aujourd\'hui' : U.shortDate(A.UI.mealDate))}</button>`).join('');
    A.openSheet(`${A.sheetHead(esc(r.n))}
      <div class="row wrap"><span class="badge">${POOLN[f.pool]}</span><span class="badge accent">${r.kcal} kcal</span><span class="badge brand">${r.p} g de protéines</span>${p.pantry.length ? badge(p, r) : ''}</div>
      <p class="muted small">Quantités pour 1 portion (ajustée à ta cible calorique dans le menu).</p>
      <div class="list">${rows || '<p class="muted">Pas d\'ingrédients détaillés pour cette recette.</p>'}</div>
      ${r.d ? `<p class="muted">${esc(r.d)}</p>` : ''}
      ${uses || '<div class="note">Aucun repas de ce type n\'est prévu à la date affichée dans le menu.</div>'}
      ${c.miss.length ? `<button class="btn" data-act="recipeToShop" data-id="${esc(id)}">+ Ajouter les ${c.miss.length} ingrédient${c.miss.length > 1 ? 's' : ''} manquant${c.miss.length > 1 ? 's' : ''} à ma liste</button>` : ''}
      ${r.custom ? `<button class="btn danger" data-act="recipeDel" data-id="${esc(id)}">Supprimer cette recette</button>` : ''}`);
  }
  function sheetSlotRecipes(slot) {
    const p = ensure(A.P()), d = A.UI.mealDate;
    const pl = A.slotPlan(p, d).find(x => x.id === slot); if (!pl) return;
    const name = pl.pool || pl.id;
    const rows = pool(p, name).map(r => ({ r, c: cover(p, r) })).sort((a, b) => p.pantry.length ? b.c.pct - a.c.pct : 0);
    A.openSheet(`${A.sheetHead('Recettes : ' + esc(pl.nom || POOLN[slot]))}
      <p class="muted small">${p.pantry.length ? 'Classées selon ce que tu as déjà chez toi.' : 'Renseigne ton garde-manger pour voir les recettes que tu peux faire tout de suite.'}</p>
      <div class="list">${rows.map(({ r, c }) => `<button class="item" data-act="recipeUse" data-id="${esc(r.id)}" data-slot="${slot}"><span class="grow"><b>${esc(r.n)}</b>${r.custom ? ' <span class="badge">Perso</span>' : ''}<br><span class="muted small">${r.kcal} kcal${p.pantry.length && c.miss.length ? ' · manque : ' + esc(c.miss.map(x => ing(p, x.i).nom.toLowerCase()).join(', ')) : ''}</span></span>${badge(p, r)}</button>`).join('')}</div>
      <button class="btn ghost" data-act="mealTab" data-s="pantry">Aller à mon garde-manger</button>`);
  }
  const ingRow = p => `<div class="row ing-row"><select name="ing" aria-label="Ingrédient" data-change="recipeUnit" class="grow">${Object.entries(allIng(p).reduce((a, g) => { (a[g.rayon] = a[g.rayon] || []).push(g); return a; }, {})).map(([r, l]) => `<optgroup label="${esc(r)}">${l.map(g => `<option value="${esc(g.id)}">${esc(g.nom)}</option>`).join('')}</optgroup>`).join('')}</select>
    <input type="number" name="qty" min="0" step="any" inputmode="decimal" class="qty" placeholder="qté" aria-label="Quantité"><span class="muted small unit">g</span></div>`;
  function sheetRecipeNew() {
    const p = ensure(A.P());
    A.openSheet(`${A.sheetHead('Créer une recette')}
      <form data-form="recipe" style="display:grid;gap:12px" novalidate>
        <label class="field"><span>Nom de la recette</span><input type="text" name="name" maxlength="50" required placeholder="Ex. Omelette aux champignons"></label>
        <label class="field"><span>Type de repas</span><select name="pool">${['petitdej', 'dej', 'collation', 'diner'].map(k => `<option value="${k}">${POOLN[k]}</option>`).join('')}</select></label>
        <div class="field"><span>Ingrédients pour 1 portion</span><div id="ing-rows" style="display:grid;gap:8px">${ingRow(p)}${ingRow(p)}</div>
          <button type="button" class="btn sm ghost" data-act="recipeRow">+ Ingrédient</button></div>
        <p class="err" id="f-err"></p><button class="btn primary xl block">Enregistrer la recette</button></form>`);
    document.querySelectorAll('.ing-row select').forEach(updateUnit);
  }
  function updateUnit(sel) {
    const p = A.P(), g = ing(p, sel.value), row = sel.closest('.ing-row');
    row.querySelector('.unit').textContent = unitLabel(g);
  }
  function sheetIngredient(q) {
    A.openSheet(`${A.sheetHead('Nouvel ingrédient')}
      <form data-form="ingredient" style="display:grid;gap:12px" novalidate>
        <label class="field"><span>Nom</span><input type="text" name="name" maxlength="40" required value="${esc(q || '')}"></label>
        <label class="field"><span>Rayon</span><select name="rayon">${Object.values(I.R).map(r => `<option>${esc(r)}</option>`).join('')}</select></label>
        <label class="field"><span>Unité</span><select name="unit"><option value="g">grammes</option><option value="ml">millilitres</option><option value="u">pièces</option></select></label>
        <div class="grid2"><label class="field"><span>Calories (pour 100 g/ml, ou par pièce)</span><input type="number" name="k" min="0" step="any" inputmode="decimal" placeholder="optionnel"></label>
        <label class="field"><span>Protéines (g, même base)</span><input type="number" name="pr" min="0" step="any" inputmode="decimal" placeholder="optionnel"></label></div>
        <p class="err" id="f-err"></p><button class="btn primary block">Créer et ajouter au garde-manger</button></form>`, { focus: true });
  }

  /* ---------- Branchement sur l'application ---------- */
  function install(ctx) {
    A = ctx;
    const { ACT, FORM, CHG, INP } = ctx;
    const save = () => ctx.saveOrWarn();
    ACT.mealTab = d => { ctx.UI.mealTab = d.s; ctx.closeSheet(); window.scrollTo(0, 0); ctx.render(); };
    ACT.pantryAdd = d => {
      const p = ensure(ctx.P()); if (!owned(p, d.id)) p.pantry.push({ id: d.id, qty: null });
      save(); ctx.render(); const q = document.getElementById('pq'); if (q) q.focus();
    };
    ACT.pantryDel = d => { const p = ensure(ctx.P()); p.pantry = p.pantry.filter(x => x.id !== d.id); save(); ctx.render(); };
    ACT.pantryClear = () => { if (!confirm('Vider tout le garde-manger ?')) return; ensure(ctx.P()).pantry = []; save(); ctx.render(); };
    ACT.pantryBasics = () => {
      const p = ensure(ctx.P());
      ['oeuf', 'lait', 'yaourt_nature', 'riz_complet', 'pates', 'pomme_de_terre', 'oignon', 'huile', 'pain', 'banane'].forEach(id => { if (!owned(p, id)) p.pantry.push({ id, qty: null }); });
      save(); ctx.render(); ctx.toast('Basiques ajoutés : retire ce que tu n\'as pas');
    };
    CHG.pantryQty = el => {
      const p = ensure(ctx.P()), it = owned(p, el.dataset.id); if (!it) return;
      const v = parseFloat(String(el.value).replace(',', '.'));
      it.qty = isNaN(v) ? null : Math.max(0, v); save(); ctx.render();
    };
    INP.pantryQ = el => { ctx.UI.pantryQ = el.value; renderResults(); };
    ACT.ingCreate = d => sheetIngredient(d.q);
    FORM.ingredient = (f, fd) => {
      const p = ensure(ctx.P()), name = String(fd.get('name') || '').trim();
      if (!name) return (document.getElementById('f-err').textContent = 'Donne un nom.');
      const k = parseFloat(fd.get('k')) || 0, pr = parseFloat(fd.get('pr')) || 0, unit = fd.get('unit');
      const g = { id: 'c' + U.uid(), nom: name, rayon: fd.get('rayon'), unit, k, p: pr, ul: 'pièce' };
      p.customIng.push(g); p.pantry.push({ id: g.id, qty: null });
      ctx.UI.pantryQ = ''; save(); ctx.closeSheet(); ctx.render(); ctx.toast('Ingrédient ajouté');
    };
    ACT.recipeOpen = d => sheetRecipe(d.id);
    ACT.slotRecipes = d => sheetSlotRecipes(d.slot);
    ACT.recipeUse = d => {
      const p = ensure(ctx.P()), ml = ctx.mealLog(p, ctx.UI.mealDate, true);
      ml.pick = ml.pick || {}; ml.pick[d.slot] = d.id; delete ml.custom[d.slot];
      save(); ctx.closeSheet(); ctx.UI.mealTab = 'menu'; ctx.render(); ctx.toast('Repas choisi');
    };
    ACT.recipeNew = sheetRecipeNew;
    ACT.recipeRow = () => { const rows = document.getElementById('ing-rows'); if (!rows) return; rows.insertAdjacentHTML('beforeend', ingRow(ctx.P())); updateUnit(rows.lastElementChild.querySelector('select')); };
    CHG.recipeUnit = el => updateUnit(el);
    FORM.recipe = (f, fd) => {
      const p = ensure(ctx.P()), name = String(fd.get('name') || '').trim(), err = document.getElementById('f-err');
      if (!name) return (err.textContent = 'Donne un nom à la recette.');
      const ids = fd.getAll('ing'), qs = fd.getAll('qty'), list = [];
      ids.forEach((id, i) => { const q = parseFloat(String(qs[i]).replace(',', '.')); if (q > 0) { const ex = list.find(x => x.i === id); if (ex) ex.q += q; else list.push({ i: id, q }); } });
      if (!list.length) return (err.textContent = 'Ajoute au moins un ingrédient avec sa quantité.');
      let kcal = 0, pr = 0;
      list.forEach(x => { const g = ing(p, x.i), m = g.unit === 'u' ? x.q : x.q / 100; kcal += g.k * m; pr += g.p * m; });
      p.recipes.push({ id: 'c' + U.uid(), name, pool: fd.get('pool'), ing: list, kcal: Math.round(kcal / 5) * 5, p: Math.round(pr) });
      save(); ctx.closeSheet(); ctx.render(); ctx.toast('Recette créée : elle entre dans ton menu');
    };
    ACT.recipeDel = d => {
      const p = ensure(ctx.P()); const r = p.recipes.find(x => x.id === d.id);
      if (!r || !confirm(`Supprimer la recette « ${r.name} » ?`)) return;
      p.recipes = p.recipes.filter(x => x.id !== d.id);
      Object.values(p.log.meals).forEach(m => { if (m.pick) Object.keys(m.pick).forEach(s => { if (m.pick[s] === d.id) delete m.pick[s]; }); });
      save(); ctx.closeSheet(); ctx.render();
    };
    ACT.recipeToShop = d => {
      const p = ensure(ctx.P()), f = findRecipe(p, d.id); if (!f) return;
      const c = cover(p, f.recipe);
      c.miss.forEach(x => { const g = ing(p, x.i), name = `${g.nom} (${fmtQ(g, x.q)})`; if (!p.shop.extras.some(e => e.name === name)) p.shop.extras.push({ id: U.uid(), name, on: false }); });
      save(); ctx.closeSheet(); ctx.UI.mealTab = 'shop'; ctx.render(); ctx.toast('Ajouté à la liste de courses');
    };
    ACT.shopDays = d => { ctx.UI.shopDays = parseInt(d.n, 10); ctx.render(); };
    ACT.shopPeople = d => { const p = ensure(ctx.P()); p.shop.people = U.clamp(p.shop.people + parseInt(d.n, 10), 1, 8); save(); ctx.render(); };
    ACT.shopCheck = d => { const p = ensure(ctx.P()); p.shop.checked[d.id] = !p.shop.checked[d.id]; save(); ctx.render(); };
    ACT.shopExtraCheck = d => { const p = ensure(ctx.P()), e = p.shop.extras.find(x => x.id === d.id); if (e) { e.on = !e.on; save(); ctx.render(); } };
    ACT.shopExtraDel = d => { const p = ensure(ctx.P()); p.shop.extras = p.shop.extras.filter(x => x.id !== d.id); save(); ctx.render(); };
    ACT.shopUncheck = () => { const p = ensure(ctx.P()); p.shop.checked = {}; p.shop.extras.forEach(e => { e.on = false; }); save(); ctx.render(); };
    FORM.shopExtra = (f, fd) => {
      const p = ensure(ctx.P()), name = String(fd.get('name') || '').trim(); if (!name) return;
      p.shop.extras.push({ id: U.uid(), name, on: false }); save(); ctx.render();
    };
    ACT.shopToPantry = () => {
      const p = ensure(ctx.P()), L = shopList(p, ctx.UI.shopDays || 7, p.shop.people);
      let n = 0;
      L.toBuy.filter(x => p.shop.checked[x.id]).forEach(x => {
        const it = owned(p, x.id); n++;
        if (!it) p.pantry.push({ id: x.id, qty: x.buy }); else if (it.qty != null) it.qty += x.buy;
      });
      p.shop.checked = {}; p.shop.extras = p.shop.extras.filter(e => !e.on);
      save(); ctx.render(); ctx.toast(n ? `${n} article${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} au garde-manger` : 'Articles retirés de la liste');
    };
    ACT.shopCopy = () => {
      const p = ensure(ctx.P()), txt = shopText(p, shopList(p, ctx.UI.shopDays || 7, p.shop.people));
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => ctx.toast('Liste copiée')).catch(() => {
        const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); ctx.toast('Liste copiée'); } catch (e) { ctx.toast('Copie impossible'); } ta.remove();
      });
    };
    ACT.shopPlan = () => { planDays(ctx.P(), ctx.UI.shopDays || 7); save(); ctx.render(); ctx.toast('Repas choisis à partir de ton garde-manger'); };
    ACT.shopReset = () => {
      const p = ensure(ctx.P()), t0 = U.ds(), n = ctx.UI.shopDays || 7;
      for (let k = 0; k < n; k++) { const m = p.log.meals[U.addDays(t0, k)]; if (m) m.pick = {}; }
      save(); ctx.render(); ctx.toast('Menu automatique rétabli');
    };
  }
  /* appelé après chaque rendu */
  const after = () => { if (A && A.UI.tab === 'meals' && A.UI.mealTab === 'pantry') renderResults(); };

  return { install, after, pool, badge, viewPantry, viewShop, ensure };
})();
