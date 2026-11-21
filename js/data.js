/* FitFamille — données : exercices, séances, repas, modèles de jeûne, conseils */
window.FF = window.FF || {};
FF.data = (() => {
  const r = (ex, reps, note) => ({ ex, reps, note });
  const s = (ex, sec, note) => ({ ex, sec, note });

  /* Angles en degrés : 0 = vers le bas, 90 = vers l'avant (droite), 180 = vers le haut, -90 = vers l'arrière.
     t = tronc (hanche -> épaule), an/af = bras proche/lointain [bras, avant-bras], ln/lf = jambes [cuisse, mollet]. */
  const EXOS = [
    {
      id: 'squat', charge: { jambes: 2 }, nom: 'Squat', cat: 'Jambes & fessiers', tags: ['Cuisses', 'Fessiers'], niveau: 'Débutant', type: 'reps', reps: 12, met: 5,
      resume: "Le mouvement roi pour dépenser des calories : il sollicite les plus gros muscles du corps.",
      etapes: ["Pieds écartés à la largeur des épaules, pointes légèrement ouvertes.", "Envoie les fesses vers l'arrière comme pour t'asseoir sur une chaise, bras tendus devant toi.", "Descends jusqu'à ce que les cuisses soient presque à l'horizontale, dos bien droit.", "Pousse dans les talons pour remonter en serrant les fessiers."],
      conseils: ["Les genoux suivent la direction des pieds.", "Inspire en descendant, expire en remontant."],
      erreurs: ["Genoux qui rentrent vers l'intérieur.", "Talons qui décollent du sol."],
      facile: "Squat sur chaise : touche l'assise puis remonte.", dur: "Squat avec pause de 3 secondes en bas.",
      fig: { A: { t: 180, an: [15, 15], af: [15, 15] }, B: { t: 140, an: [90, 90], af: [90, 90], ln: [80, -15], lf: [80, -15] }, anchor: 'fn' }
    },
    {
      id: 'fentes', charge: { jambes: 2 }, nom: 'Fentes', cat: 'Jambes & fessiers', tags: ['Cuisses', 'Fessiers', 'Équilibre'], niveau: 'Débutant', type: 'reps', reps: 10, par: 'par jambe', met: 5,
      resume: "Travaille chaque jambe séparément, corrige les déséquilibres et sollicite fortement les fessiers.",
      etapes: ["Un grand pas en avant, buste droit, mains sur les hanches.", "Fléchis les deux genoux : le genou arrière descend vers le sol sans le toucher.", "Le genou avant reste au-dessus de la cheville.", "Pousse dans le pied avant pour te redresser, puis change de jambe."],
      conseils: ["Garde le buste vertical, regard devant.", "Fais le pas assez grand pour que le genou avant ne dépasse pas les orteils."],
      erreurs: ["Pas trop court : tout le poids part sur le genou avant.", "Buste qui penche vers l'avant."],
      facile: "Fente arrière avec une main appuyée sur un mur.", dur: "Fentes sautées en alternant les jambes.",
      fig: { A: { t: 180, an: [-35, 55], af: [-35, 55], ln: [40, 10], lf: [-40, -10] }, B: { t: 180, an: [-35, 55], af: [-35, 55], ln: [85, -5], lf: [-5, -141] }, anchor: 'p' }
    },
    {
      id: 'pont', charge: { jambes: 1, dos: 1 }, nom: 'Pont fessier', cat: 'Jambes & fessiers', tags: ['Fessiers', 'Ischios', 'Bas du dos'], niveau: 'Débutant', type: 'reps', reps: 15, met: 3.5,
      resume: "Réveille les fessiers (souvent endormis par la position assise) et soulage le bas du dos.",
      etapes: ["Allongé sur le dos, genoux fléchis, pieds à plat près des fesses.", "Bras le long du corps, paumes au sol.", "Pousse dans les talons et monte le bassin jusqu'à aligner épaules, hanches et genoux.", "Serre les fessiers 1 seconde en haut puis redescends lentement."],
      conseils: ["Pense à « pincer une pièce » entre les fessiers.", "Expire en montant."],
      erreurs: ["Cambrer le bas du dos au lieu de monter avec les fessiers.", "Pousser sur les orteils."],
      facile: "Monte moins haut, sans pause.", dur: "Pont à une jambe, l'autre tendue.",
      fig: { A: { t: -90, an: [90, 90], af: [90, 90], ln: [135, 45], lf: [135, 45] }, B: { t: -55, an: [90, 90], af: [90, 90], ln: [84, 43], lf: [84, 43] }, anchor: 'fn', ground: ['fn', 's'] }
    },
    {
      id: 'chaise', charge: { jambes: 2 }, nom: 'Chaise murale', cat: 'Jambes & fessiers', tags: ['Cuisses', 'Endurance'], niveau: 'Intermédiaire', type: 'temps', sec: 30, met: 4,
      resume: "Un gainage des cuisses : simple, sans matériel, redoutable en 30 secondes.",
      etapes: ["Dos plaqué contre un mur, pieds à 50 cm du mur.", "Glisse vers le bas jusqu'à ce que genoux et hanches forment un angle droit.", "Maintiens la position, mains posées sur les cuisses ou croisées sur la poitrine.", "Remonte en poussant dans les talons."],
      conseils: ["Les genoux restent au-dessus des chevilles.", "Respire normalement, ne bloque pas ta respiration."],
      erreurs: ["S'appuyer avec les mains sur les cuisses (ça soulage trop).", "Pieds trop proches du mur."],
      facile: "Descends seulement à moitié.", dur: "Allonge le temps ou lève un talon quelques secondes.",
      fig: { A: { t: 180 }, B: { t: 180, ln: [90, 0], lf: [90, 0] }, anchor: 'p', ax: 160, period: 3200, props3: [{ box: [-5, 0, 0, 150, -70, 70], col: [190, 200, 195], alpha: 0.28 }] }
    },
    {
      id: 'pompes', charge: { haut: 3, abdos: 1 }, nom: 'Pompes', cat: 'Haut du corps', tags: ['Pectoraux', 'Épaules', 'Triceps'], niveau: 'Intermédiaire', type: 'reps', reps: 8, met: 6,
      resume: "Le classique du haut du corps : pectoraux, épaules, triceps et gainage en même temps.",
      etapes: ["Mains un peu plus larges que les épaules, corps en ligne de la tête aux talons.", "Fléchis les coudes pour descendre la poitrine vers le sol (coudes à environ 45°).", "Frôle le sol avec la poitrine.", "Pousse fort pour remonter bras tendus."],
      conseils: ["Serre les abdos et les fessiers : le corps reste « planche ».", "Regarde le sol, nuque dans le prolongement du dos."],
      erreurs: ["Bassin qui s'affaisse ou qui monte.", "Coudes écartés à 90° (mauvais pour les épaules)."],
      facile: "Pompes sur les genoux ou mains surélevées sur un meuble.", dur: "Pompes lentes (3 s à la descente) ou pieds surélevés.",
      fig: { A: { t: 114, an: [0, 0], af: [0, 0], ln: [-66, -66], lf: [-66, -66] }, B: { t: 98, an: [-60, 80], af: [-60, 80], ln: [-82, -82], lf: [-82, -82] }, anchor: 'hn', ground: ['hn', 'fn'] }
    },
    {
      id: 'pompes_genoux', charge: { haut: 2, abdos: 1 }, nom: 'Pompes sur les genoux', cat: 'Haut du corps', tags: ['Pectoraux', 'Épaules', 'Triceps'], niveau: 'Débutant', type: 'reps', reps: 10, met: 4.5,
      resume: "La version accessible des pompes : on garde la technique, avec moins de charge.",
      etapes: ["À quatre pattes, mains sous les épaules, genoux au sol, pieds en l'air.", "Corps aligné de la tête aux genoux.", "Fléchis les coudes pour descendre la poitrine vers le sol.", "Pousse pour remonter sans cambrer."],
      conseils: ["Ne laisse pas les fesses dépasser vers le haut.", "Un tapis sous les genoux est plus confortable."],
      erreurs: ["Descendre à moitié seulement.", "Tête qui plonge vers le sol."],
      facile: "Pompes contre un mur.", dur: "Passe aux pompes classiques.",
      fig: { A: { t: 124, an: [0, 0], af: [0, 0], ln: [-56, -120], lf: [-56, -120] }, B: { t: 101, an: [-60, 81], af: [-60, 81], ln: [-79, -115], lf: [-79, -115] }, anchor: 'hn', ground: ['hn', 'kn'] }
    },
    {
      id: 'dips', charge: { haut: 3 }, nom: 'Dips sur chaise', cat: 'Haut du corps', tags: ['Triceps', 'Épaules'], niveau: 'Intermédiaire', type: 'reps', reps: 10, met: 4.5,
      resume: "Cible l'arrière des bras. Une chaise stable (ou le bord d'un canapé) suffit.",
      etapes: ["Assis au bord d'une chaise solide, mains près des hanches, doigts vers l'avant.", "Avance les fesses devant la chaise, jambes fléchies ou tendues.", "Fléchis les coudes vers l'arrière jusqu'à environ 90°.", "Pousse sur les paumes pour remonter."],
      conseils: ["Reste près de la chaise, dos frôlant le bord.", "Épaules loin des oreilles."],
      erreurs: ["Descendre trop bas (douleur d'épaule).", "Coudes qui s'écartent sur les côtés."],
      facile: "Genoux bien fléchis, pieds près de la chaise.", dur: "Jambes tendues, voire un pied levé.",
      fig: {
        A: { t: 195, an: [0, 0], af: [0, 0], ln: [45, 47], lf: [45, 47] }, B: { t: 195, an: [-65, 45], af: [-65, 45], ln: [60, 74], lf: [60, 74] },
        anchor: 'hn', ground: ['hn'], gy: 122,
        props3: [
          { box: [-54, 6, 44, 50, -26, 26], col: [150, 125, 100] },
          { box: [-52, -47, 0, 44, -24, -19], col: [120, 100, 80] }, { box: [-52, -47, 0, 44, 19, 24], col: [120, 100, 80] },
          { box: [-1, 4, 0, 44, -24, -19], col: [120, 100, 80] }, { box: [-1, 4, 0, 44, 19, 24], col: [120, 100, 80] }
        ]
      }
    },
    {
      id: 'planche', charge: { abdos: 2, haut: 1 }, nom: 'Planche (gainage)', cat: 'Abdos & dos', tags: ['Abdos', 'Dos', 'Épaules'], niveau: 'Débutant', type: 'temps', sec: 30, met: 4,
      resume: "Le gainage renforce toute la sangle abdominale, utile pour le dos et la posture au bureau.",
      etapes: ["Avant-bras au sol, coudes sous les épaules.", "Jambes tendues, appuyé sur la pointe des pieds.", "Corps aligné des talons à la tête, ventre et fessiers serrés.", "Tiens la position en respirant calmement."],
      conseils: ["Regarde un point au sol entre tes mains.", "Arrête dès que le bas du dos se creuse."],
      erreurs: ["Fesses en l'air ou bassin qui tombe.", "Retenir sa respiration."],
      facile: "Planche sur les genoux ou mains sur un meuble.", dur: "Planche avec lever d'une jambe en alternance.",
      fig: { A: { t: 102, an: [0, 90], af: [0, 90], ln: [-78, -78], lf: [-78, -78] }, B: { t: 104, an: [0, 90], af: [0, 90], ln: [-76, -76], lf: [-76, -76] }, anchor: 'en', ground: ['en', 'fn'], period: 4000 }
    },
    {
      id: 'crunch', charge: { abdos: 2 }, nom: 'Crunch', cat: 'Abdos & dos', tags: ['Abdos'], niveau: 'Débutant', type: 'reps', reps: 15, met: 3.8,
      resume: "Un travail ciblé des abdominaux, à faire doucement et sans tirer sur la nuque.",
      etapes: ["Allongé sur le dos, genoux fléchis, pieds à plat.", "Mains légères derrière la tête, coudes ouverts.", "Enroule le buste pour décoller les omoplates du sol.", "Redescends lentement sans relâcher complètement."],
      conseils: ["Expire en montant, comme pour vider le ventre.", "Garde un poing d'espace entre menton et poitrine."],
      erreurs: ["Tirer sur la nuque avec les mains.", "Monter tout le dos (ce n'est plus un crunch)."],
      facile: "Bras croisés sur la poitrine, amplitude réduite.", dur: "Crunch avec jambes en l'air ou maintien 2 s en haut.",
      fig: { A: { t: -90, an: [-160, -12], af: [-160, -12], ln: [135, 45], lf: [135, 45] }, B: { t: -125, an: [-195, -47], af: [-195, -47], ln: [135, 45], lf: [135, 45] }, anchor: 'p', ground: ['p', 'fn'] }
    },
    {
      id: 'superman', charge: { dos: 2 }, nom: 'Superman', cat: 'Abdos & dos', tags: ['Lombaires', 'Fessiers'], niveau: 'Débutant', type: 'reps', reps: 12, met: 3.2,
      resume: "Renforce les muscles du dos : idéal contre les journées assis à un bureau.",
      etapes: ["Allongé sur le ventre, bras tendus devant toi.", "Décolle en même temps bras, poitrine et jambes de quelques centimètres.", "Tiens 1 à 2 secondes en serrant les fessiers.", "Redescends doucement."],
      conseils: ["Regarde le sol pour garder la nuque neutre.", "Monte peu : l'important est de contracter le dos."],
      erreurs: ["Monter la tête seule.", "Se cambrer trop fort."],
      facile: "Lève seulement bras ou jambes en alternance.", dur: "Tiens 3 à 5 secondes en haut.",
      fig: { A: { t: 90, an: [90, 90], af: [90, 90], ln: [-90, -90], lf: [-90, -90] }, B: { t: 100, an: [118, 118], af: [118, 118], ln: [-106, -106], lf: [-106, -106] }, anchor: 'p', ground: ['p'] }
    },
    {
      id: 'birddog', charge: { dos: 1, abdos: 1 }, nom: 'Bird dog (oiseau-chien)', cat: 'Abdos & dos', tags: ['Dos', 'Gainage', 'Équilibre'], niveau: 'Débutant', type: 'reps', reps: 8, par: 'par côté', met: 3,
      resume: "Un exercice de stabilité du tronc très doux pour le dos : à faire sans se précipiter.",
      etapes: ["À quatre pattes, mains sous les épaules, genoux sous les hanches.", "Tends un bras vers l'avant et la jambe opposée vers l'arrière.", "Garde le bassin stable, dos plat, 2 secondes de maintien.", "Reviens au centre, puis change de côté."],
      conseils: ["Imagine un verre d'eau posé sur ton dos.", "Bouge lentement."],
      erreurs: ["Bassin qui tourne.", "Dos qui se creuse."],
      facile: "Lève seulement le bras, puis seulement la jambe.", dur: "Rapproche coude et genou sous le ventre entre chaque répétition.",
      fig: { A: { t: 106, an: [0, 0], af: [0, 0], ln: [0, -90], lf: [0, -90] }, B: { t: 106, an: [90, 90], af: [0, 0], ln: [0, -90], lf: [-95, -95] }, anchor: 'hf', ground: ['hf', 'kn'], period: 3000 }
    },
    {
      id: 'hinge', charge: { dos: 1, jambes: 1 }, nom: 'Charnière de hanche', cat: 'Abdos & dos', tags: ['Ischios', 'Dos', 'Mobilité'], niveau: 'Débutant', type: 'reps', reps: 10, met: 3,
      resume: "Apprend à se pencher avec le dos plat (comme pour ramasser un jouet) et étire l'arrière des cuisses.",
      etapes: ["Debout, pieds largeur de hanches, genoux à peine fléchis.", "Pousse les fesses vers l'arrière en inclinant le buste, dos plat.", "Descends jusqu'à sentir l'étirement derrière les cuisses.", "Reviens debout en poussant les hanches vers l'avant."],
      conseils: ["Le mouvement vient des hanches, pas du dos.", "Garde les bras pendants, proches des jambes."],
      erreurs: ["Arrondir le dos.", "Plier les genoux comme pour un squat."],
      facile: "Mains sur les cuisses pour guider le mouvement.", dur: "Sur une jambe, ou avec une charge (sac, bouteille d'eau).",
      fig: { A: { t: 180 }, B: { t: 105, ln: [25, -15], lf: [25, -15] }, anchor: 'fn' }
    },
    {
      id: 'jacks', charge: { cardio: 2, jambes: 1 }, nom: 'Jumping jacks', cat: 'Cardio', tags: ['Cardio', 'Corps entier'], niveau: 'Débutant', type: 'temps', sec: 40, met: 7,
      resume: "Un échauffement cardio rapide qui fait monter le rythme cardiaque.",
      etapes: ["Debout, pieds joints, bras le long du corps.", "Saute en écartant les jambes et en levant les bras au-dessus de la tête.", "Saute à nouveau pour revenir pieds joints, bras en bas.", "Garde un rythme régulier."],
      conseils: ["Réceptions souples sur l'avant des pieds.", "Version sans saut possible : un pas de côté à la fois."],
      erreurs: ["Atterrir jambes tendues.", "Bras mous qui ne montent pas."],
      facile: "Version sans saut : pas de côté + bras.", dur: "Jacks croisés ou plus rapides.",
      fig: { A: { t: 180, an: [10, 10], af: [-10, -10], ln: [3, 3], lf: [-3, -3] }, B: { t: 180, an: [155, 165], af: [-155, -165], ln: [22, 22], lf: [-22, -22] }, anchor: 'p', period: 1100, front: true }
    },
    {
      id: 'genoux', charge: { cardio: 2, jambes: 1, abdos: 1 }, nom: 'Montées de genoux', cat: 'Cardio', tags: ['Cardio', 'Abdos'], niveau: 'Débutant', type: 'temps', sec: 40, met: 7,
      resume: "Une course sur place : brûle des calories et réveille les abdominaux.",
      etapes: ["Debout, buste droit, coudes fléchis à 90°.", "Monte un genou à hauteur de hanche, bras opposé vers l'avant.", "Change de jambe en rythme, sur l'avant des pieds.", "Garde le buste vertical."],
      conseils: ["Plus tu montes le genou, plus c'est intense.", "Reste souple dans les chevilles."],
      erreurs: ["Buste qui se penche en arrière.", "Pieds trop lourds au sol."],
      facile: "Marche rapide sur place, genoux à mi-hauteur.", dur: "Accélère et monte les genoux plus haut.",
      fig: { A: { t: 178, an: [-35, 30], af: [45, 120], ln: [100, -10], lf: [0, 0] }, B: { t: 178, an: [45, 120], af: [-35, 30], ln: [0, 0], lf: [100, -10] }, anchor: 'p', period: 900 }
    },
    {
      id: 'talons', charge: { cardio: 2, jambes: 1 }, nom: 'Talons-fesses', cat: 'Cardio', tags: ['Cardio', 'Ischios'], niveau: 'Débutant', type: 'temps', sec: 40, met: 6.5,
      resume: "Une course sur place qui sollicite l'arrière des cuisses et chauffe tout le corps.",
      etapes: ["Debout, buste droit, coudes fléchis.", "Ramène un talon vers la fesse du même côté.", "Alterne en rythme sur l'avant des pieds.", "Balance les bras comme en course."],
      conseils: ["Les genoux restent proches l'un de l'autre.", "Reste souple, ne tape pas le sol."],
      erreurs: ["Se pencher vers l'avant.", "Écarter les genoux."],
      facile: "Un talon à la fois, au ralenti.", dur: "Accélère le rythme.",
      fig: { A: { t: 176, an: [-35, 30], af: [45, 120], ln: [-10, -160], lf: [0, 0] }, B: { t: 176, an: [45, 120], af: [-35, 30], ln: [0, 0], lf: [-10, -160] }, anchor: 'p', period: 900 }
    },
    {
      id: 'mountain', charge: { cardio: 3, abdos: 1, haut: 1 }, nom: 'Mountain climbers', cat: 'Cardio', tags: ['Cardio', 'Abdos', 'Épaules'], niveau: 'Intermédiaire', type: 'temps', sec: 30, met: 8,
      resume: "Un cardio intense en position de planche haute, très efficace pour les abdos.",
      etapes: ["Position de pompe : mains sous les épaules, corps aligné.", "Ramène un genou vers la poitrine.", "Change de jambe en alternance, en rythme.", "Garde le bassin bas et les épaules au-dessus des mains."],
      conseils: ["Commence lentement, accélère ensuite.", "Respire sans retenir ton souffle."],
      erreurs: ["Fesses en l'air.", "Épaules qui reculent."],
      facile: "Mains surélevées sur un meuble, rythme lent.", dur: "Accélère ou rapproche le genou du coude opposé.",
      fig: { A: { t: 114, an: [0, 0], af: [0, 0], ln: [75, -60], lf: [-66, -66] }, B: { t: 114, an: [0, 0], af: [0, 0], ln: [-66, -66], lf: [75, -60] }, anchor: 'hn', ground: ['hn', 'hf'], period: 1000 }
    },
    {
      id: 'marche', charge: { cardio: 1 }, nom: 'Marche rapide', cat: 'Cardio', tags: ['Cardio', 'Endurance'], niveau: 'Débutant', type: 'temps', sec: 60, met: 3.8,
      resume: "La base d'une perte de poids durable : douce pour les articulations, faisable en famille.",
      etapes: ["Redresse-toi, regard devant, épaules relâchées.", "Marche à un rythme où tu peux parler mais plus chanter.", "Balance les bras naturellement.", "Vise 30 à 60 minutes, en une ou plusieurs fois."],
      conseils: ["Poussette, parc, trajets : tout compte.", "Un podomètre ou ton téléphone peut t'aider à viser 8 000 pas."],
      erreurs: ["Marcher trop doucement pour que ça compte.", "Regarder ses pieds."],
      facile: "Marche à ton rythme, en augmentant peu à peu.", dur: "Alterne 2 min rapides / 1 min lentes, ou choisis un parcours avec des côtes.",
      fig: { A: { t: 178, an: [-30, 15], af: [30, 10], ln: [28, 5], lf: [-22, -35] }, B: { t: 178, an: [30, 10], af: [-30, 15], ln: [-22, -35], lf: [28, 5] }, anchor: 'p', period: 1200 }
    }
  ];

  /* Variantes à faible impact (sans saut), utilisées automatiquement selon le profil */
  EXOS.push({
    id: 'jacks_low', charge: { cardio: 1, jambes: 1 }, nom: 'Jacks sans saut', cat: 'Cardio', tags: ['Cardio', 'Faible impact'], niveau: 'Débutant', type: 'temps', sec: 40, met: 4.5,
    resume: "La version douce des jumping jacks : mêmes bras, mais un pas de côté au lieu du saut. Ménage genoux et dos.",
    etapes: ["Debout, pieds joints, bras le long du corps.", "Fais un grand pas de côté avec un pied en levant les bras au-dessus de la tête.", "Ramène le pied et abaisse les bras.", "Alterne le côté en gardant un rythme régulier."],
    conseils: ["Reste souple sur les chevilles.", "Idéal pour démarrer ou pour préserver les articulations."],
    erreurs: ["Raidir les genoux.", "Oublier de lever les bras."],
    facile: "Réduis l'amplitude des bras.", dur: "Passe aux jumping jacks classiques.",
    fig: { A: { t: 180, an: [10, 10], af: [-10, -10], ln: [3, 3], lf: [-3, -3] }, B: { t: 180, an: [155, 165], af: [-155, -165], ln: [22, 22], lf: [-3, -3] }, anchor: 'p', period: 1600, front: true }
  });
  EXOS.push({
    id: 'genoux_low', charge: { cardio: 1, jambes: 1 }, nom: 'Montées de genoux marchées', cat: 'Cardio', tags: ['Cardio', 'Faible impact'], niveau: 'Débutant', type: 'temps', sec: 40, met: 4.5,
    resume: "Les montées de genoux sans sauts ni course : on marche en levant les genoux à mi-hauteur.",
    etapes: ["Debout, buste droit, coudes fléchis à 90°.", "Monte un genou à mi-hauteur, bras opposé vers l'avant.", "Repose le pied en douceur et change de jambe.", "Garde un rythme de marche tonique."],
    conseils: ["Pose le pied sans taper.", "Plus c'est rapide, plus c'est intense."],
    erreurs: ["Se pencher en arrière.", "Se précipiter et perdre l'équilibre."],
    facile: "Genoux à peine levés.", dur: "Passe aux montées de genoux classiques.",
    fig: { A: { t: 180, an: [-35, 30], af: [45, 120], ln: [70, -5], lf: [0, 0] }, B: { t: 180, an: [45, 120], af: [-35, 30], ln: [0, 0], lf: [70, -5] }, anchor: 'p', period: 1500 }
  });

  /* Séances : items = exercices ; reps/sec = niveau intermédiaire (adapté selon le niveau du profil) */
  const SESSIONS = {
    fbA: { id: 'fbA', titre: 'Corps entier', focus: 'Jambes · Pompes · Gainage', type: 'force', met: 5, rounds: 3, rest: 30, items: [r('squat', 12), r('pompes', 8), r('fentes', 10), s('planche', 30), r('pont', 15)] },
    bas: { id: 'bas', titre: 'Bas du corps', focus: 'Cuisses · Fessiers', type: 'force', met: 5, rounds: 3, rest: 30, items: [r('squat', 15), r('fentes', 10), r('pont', 15), s('chaise', 30), r('hinge', 12)] },
    core: { id: 'core', titre: 'Abdos & dos', focus: 'Gainage · Dos · Posture', type: 'force', met: 3.8, rounds: 3, rest: 20, items: [r('crunch', 15), r('superman', 12), r('birddog', 10), s('planche', 30), r('hinge', 10)] },
    cardio: { id: 'cardio', titre: 'Cardio doux + abdos', focus: 'Cardio sans impact fort · Abdos', type: 'cardio', met: 6.5, rounds: 3, rest: 20, items: [s('jacks', 40), s('genoux', 40), s('talons', 40), r('crunch', 15), s('marche', 40)] },
    haut: { id: 'haut', titre: 'Haut du corps & dos', focus: 'Pompes · Bras · Dos', type: 'force', met: 4.5, rounds: 3, rest: 30, items: [r('pompes', 8), r('dips', 10), r('superman', 12), r('birddog', 10), s('planche', 30)] },
    mobi: { id: 'mobi', titre: 'Mobilité & récupération', focus: 'Journée légère', type: 'mobi', met: 2.8, rounds: 2, rest: 15, fixedRounds: true, noWarm: true, items: [r('hinge', 10), r('birddog', 8), r('pont', 12), s('marche', 40)] },
    hiit: { id: 'hiit', titre: 'HIIT 20 minutes', focus: 'Cardio intense · jambes ménagées', type: 'cardio', met: 8, rounds: 4, rest: 20, roundRest: 30, items: [s('jacks', 40), s('mountain', 40), s('genoux', 40), s('talons', 40)] },
    long: { id: 'long', titre: 'Grande séance du week-end', focus: 'Circuit complet · le plus long de la semaine', type: 'force', met: 6, rounds: 4, rest: 30, items: [r('squat', 15), r('pompes', 10), r('fentes', 12), s('genoux', 40), r('dips', 12), r('pont', 15), s('planche', 40), s('jacks', 45)] },
    express: { id: 'express', titre: 'Express 8 minutes', focus: 'Journée chargée ? Mieux que rien !', type: 'force', met: 6, rounds: 2, rest: 20, fixedRounds: true, noWarm: true, items: [r('squat', 12), r('pompes', 8), s('mountain', 30), r('pont', 12)] },
    marche: { id: 'marche', titre: 'Marche en famille', focus: 'Poussette, parc ou balade · 45 à 60 min', type: 'activity', met: 3.8, minutes: 45, items: [] }
  };
  // 0 = dimanche … 6 = samedi
  const WEEK = { 0: 'marche', 1: 'fbA', 2: 'cardio', 3: 'haut', 4: 'mobi', 5: 'hiit', 6: 'long' };
  /* Séances préférées par jour (dans l'ordre) : le planificateur prend la première compatible avec la veille et le lendemain */
  const PREF = { 1: ['fbA', 'bas', 'cardio', 'mobi'], 2: ['cardio', 'core', 'mobi'], 3: ['haut', 'core', 'cardio', 'mobi'], 4: ['mobi', 'core', 'cardio'], 5: ['hiit', 'cardio', 'bas', 'mobi'], 6: ['long', 'fbA', 'bas', 'haut', 'cardio', 'mobi'], 0: ['marche'] };
  /* Groupes musculaires et seuil à partir duquel deux jours d'affilée = surcharge */
  const GROUPS = ['jambes', 'haut', 'dos', 'abdos', 'cardio'];
  const GROUP_NAMES = { jambes: 'Jambes', haut: 'Haut du corps et bras', dos: 'Dos', abdos: 'Abdos', cardio: 'Cardio' };
  const THRESH = { jambes: 2, haut: 2, dos: 2, abdos: 3, cardio: 3 };
  /* Cours extérieurs possibles */
  const EXT_KINDS = {
    sculpt: { nom: 'Body sculpt / renforcement', charge: { jambes: 2, haut: 2, dos: 2, abdos: 2, cardio: 1 }, met: 5 },
    cardio: { nom: 'Cours cardio (RPM, step, zumba…)', charge: { jambes: 2, abdos: 1, cardio: 3 }, met: 7 },
    doux: { nom: 'Yoga / pilates / étirements', charge: { jambes: 1, haut: 1, dos: 1, abdos: 1 }, met: 3 }
  };

  const SLOTS = [
    { id: 'petitdej', nom: 'Petit-déjeuner', ico: '☕', time: 450 },
    { id: 'dej', nom: 'Déjeuner', ico: '🥗', time: 750 },
    { id: 'collation', nom: 'Collation', ico: '🍎', time: 960 },
    { id: 'diner', nom: 'Dîner', ico: '🍲', time: 1170 }
  ];
  const SLOT_OFFSET = { petitdej: 0, dej: 2, collation: 1, diner: 4 };

  /* Repas simples, familiaux, faciles à préparer (kcal / protéines indicatives pour 1 portion) */
  const MEALS = {
    petitdej: [
      { n: 'Flocons d\'avoine, lait, banane et noix', kcal: 380, p: 14, d: '50 g de flocons, 200 ml de lait, 1 banane, 2 noix.' },
      { n: 'Yaourt grec, fruits rouges, amandes', kcal: 290, p: 20, d: '150 g de yaourt grec, une poignée de fruits rouges, 10 amandes.' },
      { n: 'Œufs brouillés, pain complet, tomate', kcal: 350, p: 22, d: '2 œufs, 1 tranche de pain complet, 1 tomate.' },
      { n: 'Fromage blanc, kiwi, granola maison', kcal: 300, p: 24, d: '150 g de fromage blanc 0 %, 1 kiwi, 30 g de granola, 1 c. à café de miel.' },
      { n: 'Tartine avocat-œuf', kcal: 400, p: 17, d: '1 tranche de pain complet, ½ avocat, 1 œuf poché ou au plat.' },
      { n: 'Smoothie banane-épinards au skyr', kcal: 320, p: 25, d: '1 banane, une poignée d\'épinards, 150 g de skyr, 100 ml de lait.' }
    ],
    dej: [
      { n: 'Poulet rôti, riz complet, haricots verts', kcal: 520, p: 42, d: '120 g de poulet, 80 g de riz complet cuit, haricots verts à volonté.' },
      { n: 'Salade composée thon-œuf-quinoa', kcal: 480, p: 36, d: '1 boîte de thon, 1 œuf dur, 80 g de quinoa cuit, crudités, 1 c. à soupe d\'huile d\'olive.' },
      { n: 'Omelette aux légumes, pommes de terre vapeur', kcal: 500, p: 28, d: '3 œufs, poêlée de légumes, 150 g de pommes de terre vapeur, salade verte.' },
      { n: 'Pâtes complètes bolognaise de dinde', kcal: 560, p: 38, d: '80 g de pâtes complètes (cru), sauce tomate à la dinde hachée, salade.' },
      { n: 'Curry de pois chiches et riz basmati', kcal: 520, p: 20, d: '150 g de pois chiches, lait de coco léger, épinards, 60 g de riz basmati.' },
      { n: 'Saumon vapeur, lentilles, brocoli', kcal: 560, p: 40, d: '1 pavé de saumon, 120 g de lentilles cuites, brocoli.' },
      { n: 'Wrap poulet-crudités et yaourt nature', kcal: 480, p: 34, d: '1 wrap complet, 100 g de poulet, crudités, sauce yaourt ; 1 yaourt nature.' }
    ],
    recup: [
      { n: 'Skyr, banane et amandes', kcal: 190, p: 20, d: '150 g de skyr nature, 1 banane, 5 amandes.' },
      { n: 'Yaourt grec et fruits rouges', kcal: 150, p: 12, d: '150 g de yaourt grec, une poignée de fruits rouges.' },
      { n: 'Deux œufs durs et une pomme', kcal: 220, p: 13, d: '2 œufs durs, 1 pomme.' }
    ],
    collation: [
      { n: 'Pomme et amandes', kcal: 160, p: 4, d: '1 pomme, 15 amandes.' },
      { n: 'Yaourt nature et fruit', kcal: 130, p: 7, d: '1 yaourt nature, 1 fruit de saison.' },
      { n: 'Bâtonnets de carotte et houmous', kcal: 150, p: 5, d: '2 carottes, 40 g de houmous.' },
      { n: 'Deux œufs durs', kcal: 150, p: 12, d: '2 œufs durs avec une pincée de sel et de paprika.' },
      { n: 'Skyr nature', kcal: 100, p: 17, d: '150 g de skyr nature, quelques fruits rouges.' },
      { n: 'Chocolat noir et thé', kcal: 110, p: 2, d: '2 carrés de chocolat noir (70 %) avec un thé sans sucre.' }
    ],
    diner: [
      { n: 'Soupe de légumes et tartine de chèvre', kcal: 380, p: 14, d: 'Grand bol de soupe maison, 1 tranche de pain complet, 30 g de chèvre.' },
      { n: 'Cabillaud au four, légumes rôtis, quinoa', kcal: 450, p: 38, d: '150 g de cabillaud, légumes rôtis, 70 g de quinoa cuit.' },
      { n: 'Steak haché 5 %, patate douce, haricots', kcal: 500, p: 38, d: '1 steak haché 5 %, 150 g de patate douce, haricots verts.' },
      { n: 'Gratin de courgettes au thon et chèvre', kcal: 420, p: 30, d: 'Courgettes, 1 boîte de thon, 40 g de chèvre, un peu de crème légère.' },
      { n: 'Shakshuka et pain complet', kcal: 430, p: 24, d: '2 œufs pochés dans une sauce tomate-poivron, 1 tranche de pain complet.' },
      { n: 'Wok de dinde, légumes et nouilles de riz', kcal: 470, p: 36, d: '120 g de dinde, légumes sautés, 60 g de nouilles de riz (cru).' },
      { n: 'Poêlée de crevettes, légumes et riz', kcal: 440, p: 34, d: '150 g de crevettes, poêlée de légumes, 60 g de riz.' }
    ]
  };

  const FAST = [
    { id: '14:10', nom: '14:10', fast: 14, eat: 10, niv: 'Débutant', start: '10:00', desc: '14 h de jeûne, 10 h pour manger. La façon la plus douce de commencer : on saute simplement les grignotages du soir.', cible: 'Idéal pour démarrer ou pour garder un rythme familial.' },
    { id: '16:8', nom: '16:8', fast: 16, eat: 8, niv: 'Intermédiaire', start: '12:00', desc: '16 h de jeûne, fenêtre de 8 h (ex. 12 h – 20 h). Le plus répandu : on saute le petit-déjeuner, on garde déjeuner et dîner en famille.', cible: 'Bon équilibre efficacité / praticité.' },
    { id: '18:6', nom: '18:6', fast: 18, eat: 6, niv: 'Avancé', start: '13:00', desc: '18 h de jeûne, 6 h pour manger (ex. 13 h – 19 h). Réservé à ceux qui ont déjà tenu le 16:8 sans difficulté.', cible: 'Plus exigeant : surveille énergie et sommeil.' }
  ];

  const FAST_STAGES = [
    { h: 0, nom: 'Digestion', txt: 'Ton corps digère le dernier repas.' },
    { h: 4, nom: 'Baisse de l\'insuline', txt: 'La glycémie se stabilise, les réserves de sucre servent en premier.' },
    { h: 12, nom: 'Transition', txt: 'Le corps commence à puiser davantage dans les graisses (repère indicatif).' },
    { h: 16, nom: 'Jeûne établi', txt: 'Phase prolongée : reste hydraté, écoute ton énergie.' }
  ];

  const TIPS = [
    'Deux minutes debout ou en marche toutes les heures de bureau : ça compte vraiment dans la journée.',
    'Pèse-toi 1 fois par semaine, même jour, même heure : le poids varie de 1 à 2 kg d\'un jour à l\'autre, c\'est normal.',
    'Un grand verre d\'eau avant chaque repas aide à mieux gérer la faim.',
    '10 minutes valent mieux que 0 : sur les journées chargées, lance la séance Express.',
    'Cuisine en double le dimanche (1 h de batch cooking) : tes repas de la semaine sont prêts.',
    'Le café et le thé sans sucre sont autorisés pendant le jeûne.',
    'Mets de la protéine à chaque repas (œufs, poisson, volaille, légumineuses, skyr) : elle rassasie.',
    'Transforme un exercice en jeu avec les enfants : planche = pont pour la voiture, squats en comptant ensemble.',
    'Descends un arrêt plus tôt ou prends les escaliers : les petits gestes pèsent à la fin de la semaine.',
    'Le sommeil influence la faim. Avec de jeunes enfants, vise surtout de te coucher tôt quand tu le peux.',
    'Le poids n\'évolue pas en ligne droite : regarde la tendance sur 3 à 4 semaines, pas sur un jour.',
    'Ne te prive pas totalement : un repas plaisir par semaine aide à tenir sur la durée.'
  ];

  return { EXOS, SESSIONS, WEEK, PREF, GROUPS, GROUP_NAMES, THRESH, EXT_KINDS, SLOTS, SLOT_OFFSET, MEALS, FAST, FAST_STAGES, TIPS };
})();
