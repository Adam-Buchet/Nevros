(function () {
  'use strict';
  const { api, $ } = window.App;
  const grid = $('#mosaic-grid');
  const empty = $('#mosaic-empty');
  if (!grid) return;

  const IMG_RE = /\.(jpe?g|png|gif|webp|avif|svg)$/i;
  const PATTERN = ['big', '', 'tall', '', 'wide', ''];

  async function load() {
    const items = await api('/api/archives');
    const imgs = items.filter((it) => IMG_RE.test(it.file_name));
    empty.style.display = imgs.length ? 'none' : 'block';
    if (!imgs.length) return;
    grid.innerHTML = '';
    imgs.forEach((it, i) => {
      const a = document.createElement('a');
      a.className = 'tile ' + PATTERN[i % PATTERN.length];
      a.href = 'archives.html';
      a.setAttribute('aria-label', it.caption || 'Photo partagée');
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = it.caption || 'Photo partagée';
      window.App.fileUrl(it).then((u) => { if (u) img.src = u; });
      a.appendChild(img);
      if (it.caption) {
        const cap = document.createElement('span');
        cap.className = 'cap';
        cap.textContent = it.caption;
        a.appendChild(cap);
      }
      grid.appendChild(a);
    });
  }

  load().catch(() => {});
})();
