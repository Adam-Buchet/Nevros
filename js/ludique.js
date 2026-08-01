(function () {
  'use strict';
  const { api, toast, escapeHtml, fmtDate, getNick, $, $$ } = window.App;

  /* ============ PLAYLIST ============ */
  const plList = $('#pl-list');
  const plEmpty = $('#pl-empty');

  async function loadPlaylist() {
    const items = await api('/api/playlist');
    plList.innerHTML = '';
    plEmpty.style.display = items.length ? 'none' : 'block';
    items.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'list-item';
      el.style.animationDelay = (i * 0.03) + 's';

      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.dataset.icon = 'music';
      el.appendChild(icon);

      const grow = document.createElement('div');
      grow.className = 'grow';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = item.title + (item.artist ? ' — ' + item.artist : '');
      grow.appendChild(title);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = 'Ajouté par ' + item.added_by + ' · ' + fmtDate(item.created_at);
      grow.appendChild(meta);
      el.appendChild(grow);

      const vote = document.createElement('button');
      vote.className = 'icon-btn sm ghosty';
      vote.setAttribute('aria-label', 'Voter');
      vote.style.color = item.voted ? 'var(--accent1)' : '';
      vote.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M12 20V4M6 10l6-6 6 6"/></svg>';
      vote.addEventListener('click', async () => {
        try {
          await api('/api/playlist/' + item.id + '/vote', { method: 'POST' });
          loadPlaylist();
        } catch (e) { toast(e.message, true); }
      });
      const badge = document.createElement('span');
      badge.className = 'count-badge' + (item.voted ? ' liked' : '');
      badge.textContent = item.votes;
      vote.appendChild(badge);
      el.appendChild(vote);

      if (item.url) {
        const a = document.createElement('a');
        a.className = 'icon-btn sm ghosty';
        a.href = item.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', 'Écouter');
        a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
        el.appendChild(a);
      }

      const del = document.createElement('button');
      del.className = 'icon-btn sm ghosty';
      del.setAttribute('aria-label', 'Supprimer');
      del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.addEventListener('click', async () => {
        if (!confirm('Retirer ce son de la playlist ?')) return;
        try {
          await api('/api/playlist/' + item.id, { method: 'DELETE' });
          toast('Son retiré');
          loadPlaylist();
        } catch (e) { toast(e.message, true); }
      });
      el.appendChild(del);

      plList.appendChild(el);
    });
    window.App.hydrateIcons();
  }

  $('#pl-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('#pl-title').value.trim();
    const artist = $('#pl-artist').value.trim();
    const url = $('#pl-url').value.trim();
    if (!title) { toast('Le titre est obligatoire.', true); return; }
    try {
      await api('/api/playlist', {
        method: 'POST',
        body: JSON.stringify({ title, artist, url, author: getNick() || 'Anonyme' })
      });
      toast('Son ajouté à la playlist 🎶');
      $('#pl-title').value = ''; $('#pl-artist').value = ''; $('#pl-url').value = '';
      loadPlaylist();
    } catch (err) { toast(err.message, true); }
  });

  /* ============ ROULETTE ============ */
  const disk = $('#roulette-disk');
  const result = $('#roulette-result');
  const chipsBox = $('#name-chips');
  let wheelRot = 0;
  let spinning = false;
  let wheelNames = [];

  function contrast(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#fff';
    const n = parseInt(m[1], 16);
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.62 ? 'rgba(12, 15, 22, .92)' : '#fff';
  }

  function renderWheelLabels() {
    disk.innerHTML = '';
    const n = wheelNames.length;
    if (!n) return;
    const size = disk.offsetWidth || 280;
    const r = size * 0.33;
    const base = Math.max(9, Math.min(14, 15 - Math.max(0, n - 5) * 0.65));
    wheelNames.forEach((name, i) => {
      const span = document.createElement('span');
      span.className = 'wheel-label';
      span.textContent = name.name;
      const mid = ((i + 0.5) / n) * 360;
      span.style.color = contrast(name.color);
      const len = Math.max(4, name.name.length);
      span.style.fontSize = Math.max(8, Math.min(base, Math.floor(120 / len))) + 'px';
      span.style.transform = 'translate(-50%,-50%) rotate(' + mid + 'deg) translateY(-' + r + 'px) rotate(' + (-mid) + 'deg)';
      disk.appendChild(span);
    });
  }

  async function loadNames() {
    const names = await api('/api/names');
    chipsBox.innerHTML = '';
    wheelNames = names;
    if (names.length) {
      disk.style.background = 'conic-gradient(' + names.map((n, i) => {
        const c = n.color;
        const from = (i / names.length) * 360;
        const to = ((i + 1) / names.length) * 360;
        return c + ' ' + from + 'deg ' + to + 'deg';
      }).join(', ') + ')';
    } else {
      disk.style.background = 'conic-gradient(#2a2a32 0deg 360deg)';
    }
    renderWheelLabels();
    names.forEach((n) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.dataset.color = n.color || '';
      const dot = document.createElement('i');
      dot.className = 'chip-dot';
      dot.style.background = n.color || '#9ca3af';
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(n.name));
      const del = document.createElement('button');
      del.setAttribute('aria-label', 'Retirer ' + n.name);
      del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      del.addEventListener('click', async () => {
        try {
          await api('/api/names/' + n.id, { method: 'DELETE' });
          loadNames();
        } catch (e) { toast(e.message, true); }
      });
      chip.appendChild(del);
      chipsBox.appendChild(chip);
    });
  }

  window.addEventListener('resize', () => {
    if (wheelNames.length) renderWheelLabels();
  });

  $('#name-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#name-input').value.trim();
    if (!name) return;
    try {
      await api('/api/names', { method: 'POST', body: JSON.stringify({ name }) });
      $('#name-input').value = '';
      loadNames();
    } catch (err) { toast(err.message, true); }
  });

  function spin() {
    const names = $$('#name-chips .chip');
    if (names.length < 2) { toast('Il faut au moins 2 prénoms pour tourner.', true); return; }
    if (spinning) return;
    spinning = true;
    const winner = Math.floor(Math.random() * names.length);
    const target = 360 - ((winner + 0.5) / names.length) * 360;
    wheelRot += 5 * 360 + target;
    disk.style.setProperty('--rot', wheelRot + 'deg');
    result.innerHTML = '<div class="name" style="opacity:.25;">…</div>';
    setTimeout(() => {
      const w = names[winner];
      const color = w.dataset.color || '';
      result.innerHTML = '<div class="name">' + escapeHtml(w.textContent.replace(/×/g, '').trim()) + '</div>';
      const el = result.querySelector('.name');
      if (color) {
        el.style.background = 'none';
        el.style.webkitTextFillColor = color;
        el.style.color = color;
      }
      spinning = false;
    }, 3700);
  }

  disk.addEventListener('click', spin);

  /* ============ DE ============ */
  const PIPS = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
  };
  function renderPips(grid, value) {
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const dot = document.createElement('span');
      dot.className = 'pip';
      if (!PIPS[value].includes(i)) dot.style.opacity = '0';
      grid.appendChild(dot);
    }
  }
  const die = $('#die');
  const dieResult = $('#die-result');
  die.innerHTML = '<div class="die-grid" id="die-grid"></div>';
  renderPips($('#die-grid'), 6);
  $('#die-btn').addEventListener('click', () => {
    die.classList.remove('rolling');
    void die.offsetWidth;
    die.classList.add('rolling');
    dieResult.textContent = '…';
    setTimeout(() => {
      const value = 1 + Math.floor(Math.random() * 6);
      renderPips($('#die-grid'), value);
      dieResult.textContent = value;
    }, 480);
  });

  /* ============ PILE OU FACE ============ */
  const coin = $('#coin');
  const coinResult = $('#coin-result');
  $('#coin-btn').addEventListener('click', () => {
    coin.classList.remove('flipping');
    void coin.offsetWidth;
    coin.classList.add('flipping');
    coinResult.textContent = '…';
    setTimeout(() => {
      const isFace = Math.random() < 0.5;
      coin.classList.toggle('is-face', isFace);
      coinResult.textContent = isFace ? 'Face' : 'Pile';
      coin.classList.remove('flipping');
    }, 1000);
  });

  /* ============ BALLE MAGIQUE ============ */
  const ANSWERS = [
    'Oui, vas-y', 'Non, réfléchis bien', 'C\u2019est certain', 'Sans aucun doute',
    'Redemande plus tard', 'Impossible à dire pour l\u2019instant', 'N\u2019y compte pas',
    'Mes sources disent non', 'Mieux que tu ne le penses', 'La réponse est en toi',
    'Bien sûr que non', 'Ça m\u2019étonnerait', 'Absolument', 'Toujours', 'Jamais',
    'Demande à Kevin', 'Trop tôt pour savoir', 'Oui mais pas maintenant'
  ];
  const ball = $('#ball');
  const ballAnswer = $('#ball-answer');
  $('#ball-btn').addEventListener('click', () => {
    ball.classList.remove('shaking');
    void ball.offsetWidth;
    ball.classList.add('shaking');
    ballAnswer.textContent = '…';
    setTimeout(() => {
      ballAnswer.textContent = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    }, 600);
  });

  /* ============ NOMBRE ============ */
  $('#num-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const min = parseInt($('#num-min').value, 10);
    const max = parseInt($('#num-max').value, 10);
    if (isNaN(min) || isNaN(max)) { toast('Entre un min et un max.', true); return; }
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    $('#num-result').textContent = Math.floor(Math.random() * (hi - lo + 1)) + lo;
  });

  /* ============ LISTE DE COURSES ============ */
  const shopList = $('#shop-list');
  const shopEmpty = $('#shop-empty');
  async function loadShop() {
    const items = await api('/api/shopping');
    shopList.innerHTML = '';
    shopEmpty.style.display = items.length ? 'none' : 'block';
    items.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'list-item' + (item.done ? ' done' : '');
      el.style.animationDelay = (i * 0.03) + 's';

      const check = document.createElement('button');
      check.className = 'icon-btn sm ghosty';
      check.style.color = item.done ? 'var(--accent1)' : '';
      check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>';
      check.addEventListener('click', async () => {
        await api('/api/shopping/' + item.id + '/done', { method: 'POST' });
        loadShop();
      });
      el.appendChild(check);

      const grow = document.createElement('div');
      grow.className = 'grow';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = item.item;
      grow.appendChild(title);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = 'Par ' + item.created_by;
      grow.appendChild(meta);
      el.appendChild(grow);

      const del = document.createElement('button');
      del.className = 'icon-btn sm ghosty';
      del.setAttribute('aria-label', 'Supprimer');
      del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.addEventListener('click', async () => {
        await api('/api/shopping/' + item.id, { method: 'DELETE' });
        loadShop();
      });
      el.appendChild(del);

      shopList.appendChild(el);
    });
  }

  $('#shop-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = $('#shop-input').value.trim();
    if (!item) { toast('Écris un article.', true); return; }
    try {
      await api('/api/shopping', { method: 'POST', body: JSON.stringify({ item, author: getNick() || 'Anonyme' }) });
      $('#shop-input').value = '';
      loadShop();
    } catch (err) { toast(err.message, true); }
  });

  /* ============ VOTES ============ */
  const voteOpts = $('#vote-opts');
  const voteList = $('#vote-list');
  const voteEmpty = $('#vote-empty');

  function renderOptionInputs() {
    voteOpts.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const div = document.createElement('div');
      div.className = 'col-6';
      const input = document.createElement('input');
      input.className = 'input';
      input.placeholder = 'Option ' + (i + 1);
      input.dataset.opt = '';
      div.appendChild(input);
      voteOpts.appendChild(div);
    }
  }

  $('#vote-addopt').addEventListener('click', () => {
    const count = $$('#vote-opts .input').length;
    if (count >= 8) { toast('Maximum 8 options.', true); return; }
    const div = document.createElement('div');
    div.className = 'col-6';
    const input = document.createElement('input');
    input.className = 'input';
    input.placeholder = 'Option ' + (count + 1);
    div.appendChild(input);
    voteOpts.appendChild(div);
  });

  $('#vote-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = $('#vote-question').value.trim();
    const options = $$('#vote-opts .input').map(i => i.value.trim()).filter(Boolean);
    if (!question) { toast('Une question est nécessaire.', true); return; }
    if (options.length < 2) { toast('Il faut au moins 2 options.', true); return; }
    try {
      await api('/api/votes', { method: 'POST', body: JSON.stringify({ question, options, author: getNick() || 'Anonyme' }) });
      toast('Vote lancé 🗳️');
      $('#vote-question').value = '';
      renderOptionInputs();
      loadVotes();
    } catch (err) { toast(err.message, true); }
  });

  async function loadVotes() {
    const votes = await api('/api/votes');
    voteList.innerHTML = '';
    voteEmpty.style.display = votes.length ? 'none' : 'block';
    votes.forEach((v, i) => {
      const card = document.createElement('div');
      card.className = 'card col-6';
      card.style.animationDelay = (i * 0.04) + 's';

      const h = document.createElement('h3');
      h.textContent = v.question;
      card.appendChild(h);
      const meta = document.createElement('p');
      meta.style.marginBottom = '14px';
      meta.textContent = 'Par ' + v.created_by + (v.open ? ' · ouvert' : ' · clos') + ' · ' + fmtDate(v.created_at);
      card.appendChild(meta);

      const total = v.counts.reduce((a, b) => a + b, 0);
      v.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vote-opt' + (v.myVote === idx ? ' mine' : '');
        const pct = total ? Math.round((v.counts[idx] / total) * 100) : 0;
        btn.innerHTML =
          '<span class="bar" style="--w:' + pct + '%"></span>' +
          '<span style="position:relative;z-index:1;">' + escapeHtml(opt) + '</span>' +
          '<span class="pct" style="position:relative;z-index:1;">' + v.counts[idx] + ' · ' + pct + '%</span>';
        if (v.open) {
          btn.addEventListener('click', async () => {
            try {
              await api('/api/votes/' + v.id + '/vote', { method: 'POST', body: JSON.stringify({ optionIndex: idx }) });
              toast('Ton vote est compté ✔');
              loadVotes();
            } catch (err) { toast(err.message, true); }
          });
        } else {
          btn.disabled = true;
          btn.style.opacity = '.7';
        }
        card.appendChild(btn);
      });

      const foot = document.createElement('div');
      foot.className = 'toolbar';
      foot.style.marginTop = '14px';
      foot.style.marginBottom = '0';
      if (v.open) {
        const close = document.createElement('button');
        close.className = 'btn ghost sm';
        close.textContent = 'Clore le vote';
        close.addEventListener('click', async () => {
          await api('/api/votes/' + v.id + '/close', { method: 'POST' });
          loadVotes();
        });
        foot.appendChild(close);
      }
      const del = document.createElement('button');
      del.className = 'btn ghost sm danger';
      del.textContent = 'Supprimer';
      del.addEventListener('click', async () => {
        if (!confirm('Supprimer ce vote ?')) return;
        await api('/api/votes/' + v.id, { method: 'DELETE' });
        loadVotes();
      });
      foot.appendChild(del);
      card.appendChild(foot);

      voteList.appendChild(card);
    });
  }

  /* ============ INIT ============ */
  renderOptionInputs();
  loadPlaylist();
  loadNames();
  loadShop();
  loadVotes();
})();
