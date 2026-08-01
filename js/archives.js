(function () {
  'use strict';
  const { api, toast, escapeHtml, fmtDate, getNick, $ } = window.App;

  const gallery = $('#archive-gallery');
  const empty = $('#archive-empty');
  const form = $('#archive-form');
  const fileInput = $('#archive-file');
  const captionInput = $('#archive-caption');
  const submit = $('#archive-submit');

  const IMG_RE = /\.(jpe?g|png|gif|webp|avif|svg)$/i;
  const VID_RE = /\.(mp4|webm|mov|m4v)$/i;

  async function load() {
    const items = await api('/api/archives');
    gallery.innerHTML = '';
    empty.style.display = items.length ? 'none' : 'block';
    items.forEach((item, i) => {
      const media = document.createElement('div');
      media.className = 'media';
      media.style.animationDelay = (i * 0.04) + 's';
      if (IMG_RE.test(item.file_name)) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = item.caption || 'Souvenir';
        window.App.fileUrl(item).then((u) => { if (u) img.src = u; });
        media.appendChild(img);
      } else if (VID_RE.test(item.file_name)) {
        const vid = document.createElement('video');
        vid.controls = true;
        window.App.fileUrl(item).then((u) => { if (u) vid.src = u; });
        media.appendChild(vid);
      } else {
        media.classList.add('media-file');
        media.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:var(--text-dim);" ><span data-icon="file" style="font-size:34px;"></span></div>';
      }
      if (item.caption) {
        const cap = document.createElement('div');
        cap.className = 'cap';
        cap.textContent = item.caption;
        media.appendChild(cap);
      }
      const del = document.createElement('button');
      del.className = 'del';
      del.setAttribute('aria-label', 'Supprimer');
      del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.addEventListener('click', async () => {
        if (!confirm('Supprimer ce souvenir ?')) return;
        try {
          await api('/api/archives/' + item.id, { method: 'DELETE' });
          toast('Souvenir supprimé');
          load();
        } catch (e) { toast(e.message, true); }
      });
      media.appendChild(del);
      gallery.appendChild(media);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) { toast('Choisis d\u2019abord une photo ou une vidéo.', true); return; }

    submit.disabled = true;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', captionInput.value.trim());
    fd.append('author', getNick() || 'Anonyme');

    try {
      await api('/api/archives', { method: 'POST', body: fd });
      toast('Souvenir ajouté 🎉');
      form.reset();
      load();
    } catch (err) {
      toast(err.message, true);
    }
    submit.disabled = false;
  });

  load();
})();
