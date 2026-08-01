(function () {
  'use strict';
  const { api, toast, escapeHtml, fmtDate, getNick, $ } = window.App;

  const list = $('#defi-list');
  const empty = $('#defi-empty');
  const addBtn = $('#defi-add');
  const textInput = $('#defi-text');

  function renderRank(items) {
    const counts = {};
    items.forEach(function (i) {
      if (!i.done) return;
      const n = String(i.done_by || '').trim();
      if (!n || n === 'Anonyme' || n === 'Quelqu\u2019un') return;
      counts[n] = (counts[n] || 0) + 1;
    });
    const ranked = Object.keys(counts)
      .map(function (name) { return { name: name, n: counts[name] }; })
      .sort(function (a, b) { return b.n - a.n || String(a.name).localeCompare(String(b.name), 'fr'); });

    const podium = $('#podium');
    const rankList = $('#rank-list');
    const rankEmpty = $('#rank-empty');
    if (!ranked.length) {
      podium.innerHTML = '';
      rankList.innerHTML = '';
      rankList.style.display = 'none';
      rankEmpty.style.display = 'block';
      return;
    }
    rankEmpty.style.display = 'none';

    const medals = ['🥇', '🥈', '🥉'];
    const order = [1, 0, 2];
    podium.innerHTML = order.map(function (rankIdx) {
      const p = ranked[rankIdx];
      if (!p) {
        return '<div class="podium-cell empty"><div class="podium-bar"></div><div class="podium-name">—</div></div>';
      }
      return '<div class="podium-cell' + (rankIdx === 0 ? ' first' : '') + '">' +
        '<div class="podium-bar"><span class="podium-medal">' + medals[rankIdx] + '</span></div>' +
        '<div class="podium-name">' + escapeHtml(p.name) + '</div>' +
        '<div class="podium-count">' + p.n + ' défi' + (p.n > 1 ? 's' : '') + '</div>' +
        '</div>';
    }).join('');

    const rest = ranked.slice(3);
    if (!rest.length) {
      rankList.innerHTML = '';
      rankList.style.display = 'none';
      return;
    }
    rankList.style.display = '';
    rankList.innerHTML = rest.map(function (p, i) {
      return '<div class="rank-row">' +
        '<span class="rank-idx">' + (i + 4) + '</span>' +
        '<span class="rank-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="rank-count">' + p.n + ' défi' + (p.n > 1 ? 's' : '') + '</span>' +
        '</div>';
    }).join('');
  }

  async function load() {
    const items = await api('/api/defis');
    const done = items.filter(i => i.done).length;
    $('#stat-open').textContent = items.length - done;
    $('#stat-done').textContent = done;
    renderRank(items);

    list.innerHTML = '';
    empty.style.display = items.length ? 'none' : 'block';
    items.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'list-item' + (item.done ? ' done' : '');
      el.style.animationDelay = (i * 0.04) + 's';

      const check = document.createElement('button');
      check.className = 'icon-btn sm ghosty';
      check.setAttribute('aria-label', item.done ? 'Marquer comme non fait' : 'Marquer comme fait');
      check.style.color = item.done ? 'var(--accent1)' : '';
      check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>';
      check.addEventListener('click', async () => {
        try {
          const res = await api('/api/defis/' + item.id + '/done', { method: 'POST', body: JSON.stringify({ author: getNick() || 'Anonyme' }) });
          toast(res.done ? 'Défi relevé ! 💪' : 'Défi rouvert');
          load();
        } catch (e) { toast(e.message, true); }
      });
      el.appendChild(check);

      const grow = document.createElement('div');
      grow.className = 'grow';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = item.text;
      grow.appendChild(title);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = 'Par ' + item.author + ' — ' + fmtDate(item.created_at) +
        (item.done ? ' · relevé par ' + item.done_by : '');
      grow.appendChild(meta);
      el.appendChild(grow);

      const del = document.createElement('button');
      del.className = 'icon-btn sm ghosty';
      del.setAttribute('aria-label', 'Supprimer');
      del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.addEventListener('click', async () => {
        if (!confirm('Supprimer ce défi ?')) return;
        try {
          await api('/api/defis/' + item.id, { method: 'DELETE' });
          toast('Défi supprimé');
          load();
        } catch (e) { toast(e.message, true); }
      });
      el.appendChild(del);

      list.appendChild(el);
    });
  }

  async function add() {
    const text = textInput.value.trim();
    if (!text) { toast('Écris d\u2019abord un défi.', true); return; }
    try {
      await api('/api/defis', { method: 'POST', body: JSON.stringify({ text, author: getNick() || 'Anonyme' }) });
      toast('Défi ajouté !');
      textInput.value = '';
      load();
    } catch (e) { toast(e.message, true); }
  }

  addBtn.addEventListener('click', add);
  textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

  load();
})();
