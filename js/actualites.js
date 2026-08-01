(function () {
  'use strict';
  const { api, toast, escapeHtml, fmtDate, getNick, $ } = window.App;

  const list = $('#post-list');
  const empty = $('#post-empty');
  const form = $('#post-form');
  const textArea = $('#post-text');

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
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = post.text;
      grow.appendChild(title);
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
    if (document.visibilityState === 'visible') load();
  }, 45000);

  load();
})();
