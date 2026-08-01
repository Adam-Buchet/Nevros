(function () {
  'use strict';
  const { api, toast, escapeHtml, fmtDate, getNick, $ } = window.App;

  const list = $('#post-list');
  const empty = $('#post-empty');
  const form = $('#post-form');
  const textArea = $('#post-text');

  /* ================== ANNONCES FAKES ================== */
  const FAKE_KEY = 'aa_fake_seed_ts';
  const FAKE_TTL = 45 * 60 * 1000;
  const FAKE_COUNT = 6;

  const FAKE_NAMES = [
    'Bobby le Singe', 'Mémé Suzette', 'Dédé', 'La P\u2019tite Lili', 'Tonton Gégé',
    'Kévin (pas celui-là)', 'Momo la Patate', 'La Voisine', 'Micheline', 'Le Chauve au cigare'
  ];

  const FAKE_AUTHORS = [
    '\ud83d\udce2 Radio Groupe', 'Le Conseil des Sages', '\ud83d\udcfb 100% Info',
    'La Gazette du Groupe', 'Rumeur Officielle', 'Le Comité des Belles Annonces', '\ud83d\udce1 Fils du Net'
  ];

  const FAKE_VERBS = [
    'négocier un traité de paix avec le grille-pain',
    'apprendre à parler aux pigeons',
    'vendre des coquilles vides au marché noir',
    'danser la danse de la pluie dans le salon',
    'faire un barbecue dans la salle de bain',
    'chasser le yéti du placard',
    'construire une fusée en carton',
    'organiser un concours de crachat de noyaux',
    'faire une grève de la sieste',
    'convaincre un pigeon de payer le resto',
    'lancer une startup de chips de carottes ratées',
    'enlever ses chaussettes pour compter sur ses orteils'
  ];

  const FAKE_OBJECTS = [
    'le dernier rouleau de PQ', 'la télécommande mystère', 'la paella de la semaine dernière',
    'le slip récalcitrant', 'le cactus à lunettes', 'le vélo sans selle', 'la raclette à roulettes',
    'le masque de chantier', 'la baignoire à pattes', 'le paquet de gâteaux déjà entamé',
    'la chaussette orpheline', 'le camembert suspect', 'le brocoli de la discorde'
  ];

  const FAKE_PLACES = [
    'le toit du bâtiment', 'la cave à patates', 'la salle de bain interdite',
    'le local à balais', 'le parking du centre commercial', 'la remise à poubelles',
    'le placard sous l\u2019escalier', 'le toit de la voiture de la voisine',
    'le rayon congélation du supermarché', 'le canapé des voisins'
  ];

  const FAKE_TEMPLATES = [
    '\ud83d\udea8 ANNONCE OFFICIELLE : {a} a été aperçu·e en train de {v} dans {p}. Aucune intervention prévue.',
    '\ud83d\udce2 Le groupe déclare {o} comme mascotte officielle. Personne n\u2019est d\u2019accord mais c\u2019est voté.',
    '\ud83d\udca1 {a} a parié {n}€ qu\u2019il/elle pouvait {v}. Résultats à {n2}h, ramenez les paquets de chips.',
    '\u26a0\ufe0f Alerte urgence : {o} a disparu. {a} nie tout en bloc. L\u2019enquête suit son cours.',
    '\ud83c\udf89 Record battu ! {a} a réussi à {v} en {n} minutes chrono. On applaudit, on juge pas.',
    '\ud83d\udcfb Flash info : un {o} a été repéré dans {p}. Les experts sont formels : personne ne sait pourquoi.',
    '\ud83e\udd1d Annonce : le groupe organise une cagnotte pour {v}. Objectif : {n}€, déjà {n2} centimes récoltés.',
    '\ud83c\udf55 {a} a décidé que {o} était le meilleur aliment du monde. La guerre civile est imminente.',
    '\ud83d\udebd {a} est bloqué·e {p} depuis {n} heures. Le groupe lance une cellule de crise.',
    '\ud83d\udca9 Bilan de la semaine : {a} a réussi à {v} {n} fois. {n2} témoins·es, zéro commentaire.',
    '\ud83d\udce2 Rumeur non confirmée : {a} aurait été vu·e en train de {v} avec {o}. On confirmera demain, peut-être.',
    '\ud83c\udfc6 Le grand gagnant de la journée est {a}, pour avoir {v} sans se blesser. Chapeau bas.',
    '\ud83d\udea8 Évacuation dans {p} : la sécurité a trouvé {o} abandonné. Le coupable est prié de se manifester.',
    '\ud83e\udde0 Étude du groupe : {n}% des membres ne savent toujours pas où se trouve {o}.',
    '\ud83c\udfaa Grand événement à venir : {a} promet de {v} en public. Entrée gratuite, sortie par les fenêtres.',
    '\u2615 Annonce : plus jamais de {o} au petit-déj. Décret signé par {a}, appliqué par personne.',
    '\ud83d\udcc9 Après enquête, {a} a officiellement interdit {o} dans {p}. Délai de grâce : {n} minutes.',
    '\ud83c\udfa4 Témoignage exclusif : {a} raconte comment il/elle a {v} sans que personne ne le/la remarque.',
    '\ud83d\udd0e Le comité des Belles Annonces signale un excès de {o}. Des patrouilles sont envoyées dans {p}.',
    '\ud83d\udca5 Coup de théâtre : {a} et {o} ne se parlent plus depuis l\u2019incident {p}.',
    '\ud83d\udef0\ufe0f Nouvelle chaîne créée : « {a} TV ». Premier programme : {v}, en direct depuis {p}.',
    '\ud83d\udce2 Attention, annonce importante : la prochaine réunion se tiendra dans {p}. Apportez {o}.',
    '\ud83e\uddea {a} a tenté de {v} pendant la nuit. Bilan : {n} micro-drames, {n2} fous rires.',
    '\ud83c\udfe5 Info santé : le groupe signale une épidémie de {o} chez les membres. Restez chez vous.',
    '\ud83c\udf4c Marché noir détecté : {a} écoule {o} au prix exorbitant de {n}€. Tout le monde en veut.'
  ];

  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function fakeActors() {
    let names = [];
    try {
      const raw = JSON.parse(localStorage.getItem('aa_names') || '[]');
      if (Array.isArray(raw)) raw.forEach((n) => { if (n && n.name) names.push(n.name); });
    } catch (e) {}
    return names.concat(FAKE_NAMES);
  }

  function makeFakePost() {
    const text = pick(FAKE_TEMPLATES)
      .replace(/\{a\}/g, pick(fakeActors()))
      .replace(/\{v\}/g, pick(FAKE_VERBS))
      .replace(/\{o\}/g, pick(FAKE_OBJECTS))
      .replace(/\{p\}/g, pick(FAKE_PLACES))
      .replace(/\{n\}/g, String(randInt(2, 99)))
      .replace(/\{n2\}/g, String(randInt(2, 99)))
      .replace(/\bde ([aeiouéèêy])/gi, 'd\u2019$1');
    return {
      text: text,
      author: pick(FAKE_AUTHORS.concat(fakeActors())),
      likes: randInt(0, 14),
      liked_sids: [],
      fake: true
    };
  }

  function seedFakePosts() {
    const now = Date.now();
    let last = 0;
    try { last = parseInt(localStorage.getItem(FAKE_KEY) || '', 10); } catch (e) {}
    if (isFinite(last) && last > 0 && now - last < FAKE_TTL) return;
    let all = [];
    try { all = JSON.parse(localStorage.getItem('aa_posts') || '[]'); } catch (e) {}
    if (!Array.isArray(all)) all = [];
    const real = all.filter((p) => !p.fake);
    let maxId = real.reduce((m, x) => Math.max(m, x.id || 0), 0);
    const fake = [];
    for (let i = 0; i < FAKE_COUNT; i++) {
      const p = makeFakePost();
      p.id = ++maxId;
      p.created_at = now - randInt(5, 240) * 60 * 1000;
      fake.push(p);
    }
    try {
      localStorage.setItem('aa_posts', JSON.stringify(real.concat(fake)));
      localStorage.setItem(FAKE_KEY, String(now));
    } catch (e) {}
  }

  async function load() {
    const posts = await api('/api/posts');
    list.innerHTML = '';
    empty.style.display = posts.length ? 'none' : 'block';
    posts.forEach((post, i) => {
      const el = document.createElement('div');
      el.className = 'list-item';
      el.style.alignItems = 'flex-start';
      el.style.animationDelay = (i * 0.03) + 's';

      const avatar = document.createElement('div');
      avatar.className = 'file-icon';
      avatar.textContent = (post.author || '?').charAt(0).toUpperCase();
      el.appendChild(avatar);

      const grow = document.createElement('div');
      grow.className = 'grow';
      const titleRow = document.createElement('div');
      titleRow.className = 'title-row';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = post.text;
      titleRow.appendChild(title);
      if (post.fake) {
        const fb = document.createElement('span');
        fb.className = 'fake-badge';
        fb.textContent = 'annonce';
        titleRow.appendChild(fb);
      }
      grow.appendChild(titleRow);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = post.author + ' — ' + fmtDate(post.created_at);
      grow.appendChild(meta);
      el.appendChild(grow);

      const like = document.createElement('button');
      like.className = 'icon-btn sm ghosty';
      like.setAttribute('aria-label', 'J\u2019aime');
      like.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
      like.addEventListener('click', async () => {
        try {
          const res = await api('/api/posts/' + post.id + '/like', { method: 'POST' });
          like.style.color = res.liked ? 'var(--accent1)' : '';
          badge.textContent = res.likes;
          badge.classList.toggle('liked', res.liked);
        } catch (e) { toast(e.message, true); }
      });
      const badge = document.createElement('span');
      badge.className = 'count-badge';
      badge.textContent = post.likes;
      like.appendChild(badge);
      el.appendChild(like);

      const del = document.createElement('button');
      del.className = 'icon-btn sm ghosty';
      del.setAttribute('aria-label', 'Supprimer');
      del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.addEventListener('click', async () => {
        if (!confirm('Supprimer ce post ?')) return;
        try {
          await api('/api/posts/' + post.id, { method: 'DELETE' });
          toast('Post supprimé');
          load();
        } catch (e) { toast(e.message, true); }
      });
      el.appendChild(del);

      list.appendChild(el);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textArea.value.trim();
    if (!text) { toast('Écris un message.', true); return; }
    try {
      await api('/api/posts', { method: 'POST', body: JSON.stringify({ text, author: getNick() || 'Anonyme' }) });
      toast('Posté !');
      textArea.value = '';
      load();
    } catch (err) { toast(err.message, true); }
  });

  $('#post-refresh').addEventListener('click', load);

  setInterval(() => {
    if (document.visibilityState === 'visible') {
      seedFakePosts();
      load();
    }
  }, 45000);

  seedFakePosts();
  load();
})();
