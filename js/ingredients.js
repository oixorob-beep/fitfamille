/* FitFamille — catalogue d'ingrédients (rayon, unité, nutrition) et ingrédients de chaque recette (par portion) */
window.FF = window.FF || {};
FF.ing = (() => {
  const R = { fl: 'Fruits & légumes', vp: 'Viandes & poissons', cr: 'Crèmerie & œufs', ep: 'Épicerie & féculents', pa: 'Pain & boulangerie', hu: 'Huiles, sauces & épices' };
  /* id: [nom, rayon, unité (g | ml | u), kcal et protéines pour 100 g / 100 ml (ou par pièce si u), libellé de la pièce] */
  const RAW = {
    banane: ['Bananes', R.fl, 'u', 90, 1, 'banane'], pomme: ['Pommes', R.fl, 'u', 75, 0.4, 'pomme'], kiwi: ['Kiwis', R.fl, 'u', 45, 1, 'kiwi'],
    fruits_rouges: ['Fruits rouges', R.fl, 'g', 50, 1], tomate: ['Tomates', R.fl, 'u', 20, 1, 'tomate'], avocat: ['Avocats', R.fl, 'u', 240, 3, 'avocat'],
    epinards: ['Épinards', R.fl, 'g', 23, 2.9], haricots_verts: ['Haricots verts', R.fl, 'g', 31, 1.8], brocoli: ['Brocoli', R.fl, 'g', 34, 2.8],
    courgette: ['Courgettes', R.fl, 'g', 17, 1.2], carotte: ['Carottes', R.fl, 'u', 30, 0.7, 'carotte'], poivron: ['Poivrons', R.fl, 'u', 30, 1.3, 'poivron'],
    patate_douce: ['Patates douces', R.fl, 'g', 86, 1.6], pomme_de_terre: ['Pommes de terre', R.fl, 'g', 77, 2], salade: ['Salade verte', R.fl, 'g', 15, 1.4],
    oignon: ['Oignons', R.fl, 'u', 40, 1, 'oignon'], citron: ['Citrons', R.fl, 'u', 15, 0.5, 'citron'], legumes: ['Légumes de saison (poêlée, soupe, four)', R.fl, 'g', 35, 2],
    poulet: ['Poulet (blanc ou cuisse)', R.vp, 'g', 165, 31], dinde: ['Dinde (escalope)', R.vp, 'g', 110, 23], dinde_hachee: ['Dinde hachée', R.vp, 'g', 140, 21],
    steak_hache: ['Steak haché 5 %', R.vp, 'g', 137, 21], saumon: ['Saumon', R.vp, 'g', 200, 20], cabillaud: ['Cabillaud', R.vp, 'g', 82, 18],
    crevettes: ['Crevettes', R.vp, 'g', 85, 18], thon_boite: ['Thon en boîte', R.vp, 'u', 120, 26, 'boîte'],
    oeuf: ['Œufs', R.cr, 'u', 75, 6.5, 'œuf'], lait: ['Lait', R.cr, 'ml', 46, 3.3], yaourt_nature: ['Yaourts nature', R.cr, 'u', 65, 5, 'yaourt'],
    yaourt_grec: ['Yaourt grec', R.cr, 'g', 100, 6], fromage_blanc: ['Fromage blanc 0 %', R.cr, 'g', 46, 8], skyr: ['Skyr nature', R.cr, 'g', 63, 11],
    chevre: ['Fromage de chèvre', R.cr, 'g', 270, 18], creme: ['Crème légère', R.cr, 'ml', 150, 2],
    flocons: ["Flocons d'avoine", R.ep, 'g', 370, 13], riz_complet: ['Riz complet', R.ep, 'g', 360, 7.5], riz_basmati: ['Riz basmati', R.ep, 'g', 350, 8],
    pates: ['Pâtes complètes', R.ep, 'g', 350, 13], quinoa: ['Quinoa', R.ep, 'g', 370, 14], lentilles: ['Lentilles', R.ep, 'g', 350, 25],
    pois_chiches: ['Pois chiches (cuits)', R.ep, 'g', 120, 8], nouilles_riz: ['Nouilles de riz', R.ep, 'g', 360, 6], granola: ['Granola', R.ep, 'g', 450, 9],
    amandes: ['Amandes', R.ep, 'g', 600, 21], noix: ['Noix', R.ep, 'g', 650, 15], houmous: ['Houmous', R.ep, 'g', 230, 7],
    chocolat_noir: ['Chocolat noir 70 %', R.ep, 'g', 560, 7], sauce_tomate: ['Sauce tomate', R.hu, 'g', 40, 1.5], lait_coco: ['Lait de coco léger', R.hu, 'ml', 100, 1],
    miel: ['Miel', R.ep, 'g', 300, 0.3], wrap: ['Wraps complets', R.pa, 'u', 150, 4, 'wrap'], pain: ['Pain complet (tranches)', R.pa, 'u', 90, 3.5, 'tranche'],
    huile: ["Huile d'olive", R.hu, 'ml', 880, 0], epices: ['Épices (curry, paprika…)', R.hu, 'g', 300, 10]
  };
  const CATALOG = {};
  Object.entries(RAW).forEach(([id, a]) => { CATALOG[id] = { id, nom: a[0], rayon: a[1], unit: a[2], k: a[3], p: a[4], ul: a[5] || 'pièce' }; });

  /* Ingrédients par portion : [id, quantité]. Quantités en poids cru / emballé pour les courses. */
  const RECIPE_ING = {
    'petitdej-0': [['flocons', 50], ['lait', 200], ['banane', 1], ['noix', 10]],
    'petitdej-1': [['yaourt_grec', 150], ['fruits_rouges', 80], ['amandes', 10]],
    'petitdej-2': [['oeuf', 2], ['pain', 1], ['tomate', 1]],
    'petitdej-3': [['fromage_blanc', 150], ['kiwi', 1], ['granola', 30], ['miel', 5]],
    'petitdej-4': [['pain', 1], ['avocat', 0.5], ['oeuf', 1]],
    'petitdej-5': [['banane', 1], ['epinards', 30], ['skyr', 150], ['lait', 100]],
    'dej-0': [['poulet', 120], ['riz_complet', 35], ['haricots_verts', 150]],
    'dej-1': [['thon_boite', 1], ['oeuf', 1], ['quinoa', 30], ['salade', 60], ['tomate', 1], ['huile', 10]],
    'dej-2': [['oeuf', 3], ['legumes', 150], ['pomme_de_terre', 150], ['salade', 60]],
    'dej-3': [['pates', 80], ['dinde_hachee', 100], ['sauce_tomate', 150], ['salade', 60]],
    'dej-4': [['pois_chiches', 150], ['lait_coco', 100], ['epinards', 60], ['riz_basmati', 60], ['epices', 3]],
    'dej-5': [['saumon', 120], ['lentilles', 50], ['brocoli', 150]],
    'dej-6': [['wrap', 1], ['poulet', 100], ['salade', 40], ['tomate', 1], ['yaourt_nature', 2]],
    'collation-0': [['pomme', 1], ['amandes', 15]],
    'collation-1': [['yaourt_nature', 1], ['kiwi', 1]],
    'collation-2': [['carotte', 2], ['houmous', 40]],
    'collation-3': [['oeuf', 2]],
    'collation-4': [['skyr', 150], ['fruits_rouges', 50]],
    'collation-5': [['chocolat_noir', 20]],
    'recup-0': [['skyr', 150], ['banane', 1], ['amandes', 5]],
    'recup-1': [['yaourt_grec', 150], ['fruits_rouges', 60]],
    'recup-2': [['oeuf', 2], ['pomme', 1]],
    'diner-0': [['legumes', 300], ['pain', 1], ['chevre', 30]],
    'diner-1': [['cabillaud', 150], ['legumes', 200], ['quinoa', 30], ['huile', 10]],
    'diner-2': [['steak_hache', 125], ['patate_douce', 150], ['haricots_verts', 150]],
    'diner-3': [['courgette', 250], ['thon_boite', 1], ['chevre', 40], ['creme', 30]],
    'diner-4': [['oeuf', 2], ['tomate', 2], ['poivron', 1], ['oignon', 0.5], ['pain', 1]],
    'diner-5': [['dinde', 120], ['legumes', 200], ['nouilles_riz', 60], ['huile', 5]],
    'diner-6': [['crevettes', 150], ['legumes', 200], ['riz_complet', 35]]
  };

  /* Rattache id et ingrédients à chaque repas du catalogue */
  Object.entries(FF.data.MEALS).forEach(([pool, list]) => {
    list.forEach((m, ix) => { m.id = pool + '-' + ix; m.ing = (RECIPE_ING[m.id] || []).map(([i, q]) => ({ i, q })); });
  });

  return { R, CATALOG, RECIPE_ING };
})();
