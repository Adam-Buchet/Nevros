(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ================== UTILITAIRES ================== */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "à l'instant";
    if (diff < 3600000) return 'il y a ' + Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return 'il y a ' + Math.floor(diff / 3600000) + ' h';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function getNick() {
    try { return localStorage.getItem('aa_nick') || ''; } catch (e) { return ''; }
  }
  function setNick(n) {
    try { localStorage.setItem('aa_nick', n); } catch (e) {}
  }

  /* ================== API (locale) ================== */
  function api(path, opts) {
    return window.AAStore.api(path, opts);
  }

  function fileUrl(item) {
    return window.AAStore.fileUrl(item);
  }

  /* ================== TOASTS ================== */
  function toast(message, isErr) {
    let wrap = $('.toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toasts';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' err' : '');
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 400);
    }, 3200);
  }

  /* ================== NAVIGATION / TRANSITIONS ================== */
  function navigate(path) {
    const isLogin = /login\.html?$/.test(window.location.pathname);
    if (typeof document.startViewTransition === 'function' && !isLogin) {
      document.startViewTransition(() => {
        window.location.href = path;
      });
      return;
    }
    document.body.classList.add('page-leaving');
    setTimeout(() => { window.location.href = path; }, 560);
  }

  function initTransitions() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (/^https?:\/\//i.test(href) && new URL(href).origin !== window.location.origin) return;
      if (a.classList.contains('no-transition')) return;
      e.preventDefault();
      navigate(href);
    });
  }

  /* ================== THEME ================== */
  const THEMES = {
    noir: ['#4f46e5', '#7c3aed'],
    neon: ['#06b6d4', '#e11d8f'],
    foret: ['#059669', '#d97706'],
    ocean: ['#0ea5e9', '#6366f1'],
    coucher: ['#f97316', '#e11d48'],
    candy: ['#ec4899', '#8b5cf6'],
    aurore: ['#65a30d', '#0891b2'],
    mono: ['#6b7280', '#9ca3af']
  };

  function applyTheme(theme, mode) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-mode', mode);
    try {
      localStorage.setItem('aa_theme', theme);
      localStorage.setItem('aa_mode', mode);
    } catch (e) {}
    const meta = $('meta[name="theme-color"]');
    if (meta) {
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim() || (mode === 'dark' ? '#0b0d12' : '#f7f7f9');
      meta.setAttribute('content', bg);
    }
  }

  function initThemePanel() {
    const btn = $('#theme-btn');
    const panel = $('#theme-panel');
    const backdrop = $('#theme-backdrop');
    if (!btn || !panel) return;

    const open = () => {
      panel.classList.add('open');
      backdrop.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      panel.classList.remove('open');
      backdrop.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', () => {
      panel.classList.contains('open') ? close() : open();
    });
    backdrop.addEventListener('click', close);

    const currentTheme = () => document.documentElement.getAttribute('data-theme') || 'noir';
    const currentMode = () => document.documentElement.getAttribute('data-mode') || 'dark';

    const renderSwatches = () => {
      const grid = $('#theme-grid');
      if (!grid) return;
      grid.innerHTML = '';
      Object.keys(THEMES).forEach((name) => {
        const [c1, c2] = THEMES[name];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'theme-swatch' + (name === currentTheme() ? ' active' : '');
        b.dataset.theme = name;
        b.innerHTML = '<span class="swatch-dot" style="--s1:' + c1 + ';--s2:' + c2 + '"></span><span>' + name + '</span>';
        b.addEventListener('click', () => {
          applyTheme(name, currentMode());
          renderSwatches();
        });
        grid.appendChild(b);
      });
    };
    renderSwatches();

    const modeBtns = $$('.mode-switch button');
    modeBtns.forEach((b) => {
      b.addEventListener('click', () => {
        applyTheme(currentTheme(), b.dataset.mode);
        modeBtns.forEach((x) => x.classList.toggle('active', x === b));
      });
    });
    modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === currentMode()));
  }

  /* ================== MENU BURGER ================== */
  function initMenu() {
    const btn = $('#burger-btn');
    const menu = $('#menu');
    if (!btn || !menu) return;

    const close = () => {
      btn.classList.remove('open');
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };
    const toggle = () => {
      const open = menu.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        $$('.menu-links .menu-item').forEach((el, i) => {
          el.style.transitionDelay = (0.08 + i * 0.06) + 's';
        });
      } else {
        $$('.menu-links .menu-item').forEach((el) => { el.style.transitionDelay = '0s'; });
      }
    };
    btn.addEventListener('click', toggle);
    menu.addEventListener('click', (e) => {
      if (e.target.closest('.menu-link')) close();
    });

    const logout = $('#logout-btn');
    if (logout) {
      logout.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await api('/api/auth/logout', { method: 'POST' });
        } catch (err) {}
        window.location.href = 'login.html';
      });
    }
  }

  /* ================== CURSEUR ================== */
  function initCursor() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const dot = $('.cursor-dot');
    if (!dot) return;
    document.documentElement.classList.add('has-cursor');

    window.addEventListener('mousemove', (e) => {
      dot.style.transform = 'translate(' + (e.clientX - 3.5) + 'px,' + (e.clientY - 3.5) + 'px)';
    });
  }

  /* ================== SMOOTH SCROLL ================== */
  function initSmoothScroll() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!matchMedia('(pointer: fine)').matches) return;
    if ($('body[data-no-smooth]')) return;

    let current = window.scrollY;
    let target = current;
    let raf = null;
    let animating = false;

    function step() {
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.4) current = target;
      window.scrollTo(0, current);
      if (Math.abs(target - current) < 0.4) {
        animating = false;
        raf = null;
      } else {
        raf = requestAnimationFrame(step);
      }
    }

    function to(y) {
      target = Math.max(0, Math.min(y, document.body.scrollHeight - window.innerHeight));
      if (!raf) { animating = true; raf = requestAnimationFrame(step); }
    }

    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) return;
      if (e.target.closest('[data-lenis-prevent]')) return;
      e.preventDefault();
      to(target + e.deltaY);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      const keys = { ArrowDown: 80, ArrowUp: -80, PageDown: window.innerHeight * 0.9, PageUp: -window.innerHeight * 0.9, ' ': window.innerHeight * 0.9, Home: -1e9, End: 1e9 };
      if (keys[e.key] !== undefined) {
        e.preventDefault();
        to(e.key === 'Home' ? 0 : e.key === 'End' ? document.body.scrollHeight : target + keys[e.key]);
      }
    });

    window.addEventListener('scroll', () => {
      if (!animating) { current = window.scrollY; target = current; }
    });

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const el = id ? document.getElementById(id) : null;
      if (el) {
        e.preventDefault();
        to(el.getBoundingClientRect().top + window.scrollY - 90);
      }
    });

    window.__smoothScrollTo = to;
  }

  /* ================== REVEAL ================== */
  function initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    document.documentElement.classList.add('reveal-ready');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('revealed');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  /* ================== MAGNETIQUE ================== */
  function initMagnetic() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    $$('[data-magnetic]').forEach((el) => {
      const strength = 18;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        const y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        el.style.transform = 'translate(' + x * strength + 'px,' + y * strength + 'px)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* ================== NAV SCROLL ================== */
  function initNavScroll() {
    const nav = $('.nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ================== AUTH GUARD ================== */
  function guard() {
    if ($('body[data-noauth]')) return Promise.resolve(true);
    return Promise.resolve()
      .then(() => api('/api/auth/me'))
      .then(() => true)
      .catch(() => {
        window.location.href = 'login.html';
        return false;
      });
  }

  /* ================== ICONES ================== */
  const ICONS = {
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    film: '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/><circle cx="8.5" cy="15.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/>',
    sparkles: '<path d="M12 3l1.9 5.7a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/><line x1="19" y1="3" x2="19" y2="6"/><line x1="17" y1="4.5" x2="21" y2="4.5"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H3v1a4 4 0 0 0 4 4"/><path d="M17 6h4v1a4 4 0 0 1-4 4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    question: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
  };

  function hydrateIcons() {
    $$('[data-icon]').forEach((el) => {
      const name = el.getAttribute('data-icon');
      if (ICONS[name]) {
        el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
      }
    });
  }

  /* ================== MARQUEE ================== */
  function initMarquee() {
    const track = $('#marquee-track');
    if (!track) return;
    const items = [
      'Archives &amp; Nostalgie', 'Défis &amp; Vie de groupe', 'Fil d\u2019actualité',
      'Coffre-fort', 'Ludique &amp; Divertissement', 'Playlist commune'
    ];
    const copy = items.map((t) => '<span>' + t + '</span><span class="sep">✦</span>').join('');
    track.innerHTML = copy + copy;
  }

  /* ================== TILT LOGO 3D ================== */
  function initHeroTilt() {
    const logo = $('#hero-logo');
    const wrap = $('#hero-logo-wrap');
    if (!logo || !wrap || !matchMedia('(pointer: fine)').matches) return;
    wrap.addEventListener('mousemove', (e) => {
      const r = wrap.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * 22;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * -30;
      logo.style.transform = 'rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg)';
    });
    wrap.addEventListener('mouseleave', () => { logo.style.transform = ''; });
  }

  /* ================== PWA ================== */
  function initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }

    const panel = $('#theme-panel');
    if (panel && !$('#install-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn install-app';
      btn.id = 'install-btn';
      btn.hidden = true;
      btn.innerHTML = '<span data-icon="download"></span><span>Installer l\u2019appli</span>';
      panel.appendChild(btn);
      hydrateIcons();
    }
    const installBtn = $('#install-btn');
    if (!installBtn) return;

    const isStandalone = matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    let deferredPrompt = null;
    const show = () => { installBtn.hidden = false; };
    const hide = () => { installBtn.hidden = true; };

    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (e) {}
        deferredPrompt = null;
        hide();
        return;
      }
      if (isIOS) {
        toast('Sur iPhone / iPad : menu Partage \u2192 \u00ab Ajouter \u00e0 l\u2019\u00e9cran d\u2019accueil \u00bb');
        return;
      }
      hide();
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      show();
    });

    window.addEventListener('appinstalled', hide);

    if (isIOS) show();
  }

  /* ================== PSEUDO ================== */
  function initNick() {
    const input = $('#nick-input');
    if (!input) return;
    input.value = getNick();
    input.addEventListener('change', () => {
      const v = input.value.trim();
      setNick(v);
      toast(v ? 'Pseudo enregistré : ' + v : 'Pseudo effacé');
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  }

  /* ================== INTRO (ouverture) ================== */
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function caretEl() {
    const c = document.createElement('span');
    c.className = 'intro-caret';
    return c;
  }

  async function typeText(el, text, speed) {
    el.innerHTML = '';
    const t = document.createElement('span');
    t.className = 'intro-text';
    el.appendChild(t);
    el.appendChild(caretEl());
    for (let i = 0; i <= text.length; i++) {
      t.textContent = text.slice(0, i);
      await sleep(speed);
    }
    return t;
  }

  async function backspaceText(el, speed) {
    const t = el.querySelector('.intro-text');
    if (!t) return;
    while (t.textContent.length > 0) {
      t.textContent = t.textContent.slice(0, -1);
      await sleep(speed);
    }
  }

  async function playIntro() {
    const intro = $('#intro');
    if (!intro) return;
    const titleEl = $('#intro-title');
    const defEl = $('#intro-def');
    const prevOverflow = document.body.style.overflow;
    let done = false;

    const cleanup = () => {
      if (done) return;
      done = true;
      clearTimeout(watchdog);
      intro.classList.remove('show');
      intro.classList.add('hide');
      setTimeout(() => {
        if (intro.parentNode) intro.remove();
        document.body.style.overflow = prevOverflow;
      }, 540);
      try {
        const url = location.pathname + location.search.replace(/[?&]intro=1/, '').replace(/^&/, '?') + location.hash;
        history.replaceState(null, '', url);
      } catch (e) {}
    };

    const watchdog = setTimeout(cleanup, 8000);

    try {
      document.body.style.overflow = 'hidden';
      intro.classList.add('show');
      await sleep(120);
      await typeText(titleEl, 'NÉVROS', 90);
      await sleep(280);
      await typeText(defEl, 'névroser — rendre névrosé, angoisser, faire péter les plombs. Avec amour.', 24);
      await sleep(800);
      await backspaceText(defEl, 18);
      await backspaceText(titleEl, 60);
      await sleep(150);
      cleanup();
    } catch (e) {
      cleanup();
    }
  }

  /* ================== INIT ================== */
  async function init() {
    window.AAStore.initPassword();
    initReveal();
    if (!(await guard())) return;
    hydrateIcons();
    initThemePanel();
    initMenu();
    initCursor();
    initSmoothScroll();
    initMagnetic();
    initNavScroll();
    initTransitions();
    initMarquee();
    initHeroTilt();
    initPWA();
    initNick();
    if (/[?&]intro=1/.test(location.search)) playIntro();
  }

  window.App = {
    api, fileUrl, toast, navigate, escapeHtml, fmtDate, getNick, setNick, applyTheme,
    hydrateIcons, $, $$
  };

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(() => {
      document.documentElement.classList.add('reveal-ready');
      $$('[data-reveal]').forEach((el) => el.classList.add('revealed'));
    });
  });
})();
