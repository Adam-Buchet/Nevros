(function () {
  'use strict';
  const { api, toast, escapeHtml, fmtDate, $, $$ } = window.App;

  const lockScreen = $('#vault-lock');
  const content = $('#vault-content');
  const lockForm = $('#vault-lock-form');
  const lockInput = $('#vault-password');
  const lockErr = $('#vault-err');
  const UNLOCK_KEY = 'aa_vault_open';

  const noteList = $('#note-list');
  const linkList = $('#link-list');
  const fileList = $('#file-list');

  function unlock() {
    lockScreen.style.display = 'none';
    content.style.display = 'block';
  }

  lockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    lockErr.classList.remove('show');
    try {
      await api('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ password: lockInput.value })
      });
      sessionStorage.setItem(UNLOCK_KEY, '1');
      toast('Coffre déverrouillé 🔓');
      unlock();
      loadAll();
    } catch (err) {
      lockErr.textContent = err.message || 'Mot de passe incorrect';
      lockErr.classList.add('show');
    }
  });

  function fileSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / 1048576).toFixed(1) + ' Mo';
  }

  function deleteBtn(fn) {
    const b = document.createElement('button');
    b.className = 'icon-btn sm ghosty';
    b.setAttribute('aria-label', 'Supprimer');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    b.addEventListener('click', fn);
    return b;
  }

  function addItem(el, item, opts) {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.animationDelay = (opts.i * 0.04) + 's';
    row.appendChild(opts.icon(el));
    const grow = document.createElement('div');
    grow.className = 'grow';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = item.title || (opts.titleOf ? opts.titleOf(item) : '');
    grow.appendChild(title);
    if (opts.meta) {
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = opts.meta(item);
      grow.appendChild(meta);
    }
    row.appendChild(grow);
    row.appendChild(opts.action ? opts.action(item) : document.createElement('span'));
    row.appendChild(deleteBtn(() => opts.del(item)));
    el.appendChild(row);
  }

  async function loadAll() {
    const items = await api('/api/vault');
    noteList.innerHTML = '';
    linkList.innerHTML = '';
    fileList.innerHTML = '';

    items.forEach((item, i) => {
      if (item.type === 'note') {
        addItem(noteList, item, {
          i,
          icon: () => { const el = document.createElement('span'); el.className = 'file-icon'; el.dataset.icon = 'note'; return el; },
          titleOf: () => item.title,
          meta: () => item.content,
          del: async () => {
            await api('/api/vault/' + item.id, { method: 'DELETE' });
            toast('Note supprimée');
            loadAll();
          }
        });
      } else if (item.type === 'link') {
        addItem(linkList, item, {
          i,
          icon: () => { const el = document.createElement('span'); el.className = 'file-icon'; el.dataset.icon = 'link'; return el; },
          titleOf: () => item.title,
          meta: () => item.content,
          action: () => {
            const a = document.createElement('a');
            a.className = 'icon-btn sm ghosty';
            a.href = item.content;
            a.target = '_blank';
            a.rel = 'noopener';
            a.setAttribute('aria-label', 'Ouvrir le lien');
            a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
            return a;
          },
          del: async () => {
            await api('/api/vault/' + item.id, { method: 'DELETE' });
            toast('Lien supprimé');
            loadAll();
          }
        });
      } else if (item.type === 'file') {
        addItem(fileList, item, {
          i,
          icon: () => { const el = document.createElement('span'); el.className = 'file-icon'; el.dataset.icon = 'file'; return el; },
          titleOf: () => item.title || item.file_name,
          meta: () => fileSize(item.file_size) + ' · ajouté le ' + new Date(item.created_at).toLocaleDateString('fr-FR'),
          action: () => {
            const a = document.createElement('a');
            a.className = 'icon-btn sm ghosty';
            a.download = item.title || item.file_name;
            a.setAttribute('aria-label', 'Télécharger');
            window.App.fileUrl(item).then((u) => { if (u) a.href = u; });
            a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
            return a;
          },
          del: async () => {
            await api('/api/vault/' + item.id, { method: 'DELETE' });
            toast('Fichier supprimé');
            loadAll();
          }
        });
      }
    });

    window.App.hydrateIcons && window.App.hydrateIcons();
  }

  $('#note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('#note-title').value.trim();
    const content = $('#note-content').value.trim();
    if (!title) { toast('Il faut un titre.', true); return; }
    try {
      await api('/api/vault', { method: 'POST', body: JSON.stringify({ type: 'note', title, content }) });
      toast('Note ajoutée 🔒');
      $('#note-title').value = ''; $('#note-content').value = '';
      loadAll();
    } catch (err) { toast(err.message, true); }
  });

  $('#link-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('#link-title').value.trim();
    const url = $('#link-url').value.trim();
    if (!title || !url) { toast('Titre et URL requis.', true); return; }
    try {
      await api('/api/vault', { method: 'POST', body: JSON.stringify({ type: 'link', title, content: url }) });
      toast('Lien ajouté 🔗');
      $('#link-title').value = ''; $('#link-url').value = '';
      loadAll();
    } catch (err) { toast(err.message, true); }
  });

  $('#file-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = $('#file-upload');
    const file = fileInput.files[0];
    if (!file) { toast('Choisis d\u2019abord un fichier.', true); return; }
    const fd = new FormData();
    fd.append('type', 'file');
    fd.append('title', $('#file-title').value.trim());
    fd.append('file', file);
    try {
      await api('/api/vault', { method: 'POST', body: fd });
      toast('Fichier stocké 🗄️');
      fileInput.value = ''; $('#file-title').value = '';
      loadAll();
    } catch (err) { toast(err.message, true); }
  });

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $('#pane-' + tab.dataset.tab).classList.add('active');
    });
  });

  if (sessionStorage.getItem(UNLOCK_KEY) === '1') {
    unlock();
    loadAll();
  }
})();
