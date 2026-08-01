/* ============================================================
   Atrocement Autiste — couche de données 100% navigateur.
   Remplace l'ancien backend Node/Express/SQLite pour tourner
   sur GitHub Pages (hébergement statique, sans serveur).
   - Petites données : localStorage
   - Fichiers (photos, vidéos, documents) : IndexedDB
   - Session : jeton local avec expiration (7 jours)
   ============================================================ */
(function () {
  'use strict';

  var P = 'aa_';
  var DB_NAME = 'aa-files';
  var DEFAULT_PASSWORD = 'Bird0505';
  var AUTH_KEY = P + 'auth';
  var PW_KEY = P + 'site_password';
  var SID_KEY = P + 'sid';
  var AUTH_TTL = 7 * 24 * 60 * 60 * 1000;

  /* ---------------- petites utilitaires ---------------- */

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(P + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function write(key, val) {
    try {
      localStorage.setItem(P + key, JSON.stringify(val));
    } catch (e) {
      throw httpError('Stockage local plein ou indisponible');
    }
  }

  var SORTERS = {
    posts: function (a, b) { return b.created_at - a.created_at; },
    playlist: function (a, b) { return (b.votes - a.votes) || (b.created_at - a.created_at); },
    vault: function (a, b) { return b.created_at - a.created_at; },
    defis: function (a, b) { return (a.done - b.done) || (b.created_at - a.created_at); },
    names: function (a, b) { return String(a.name).localeCompare(String(b.name), 'fr'); },
    shopping: function (a, b) { return (a.done - b.done) || (b.created_at - a.created_at); },
    votes: function (a, b) { return b.created_at - a.created_at; },
    archives: function (a, b) { return b.created_at - a.created_at; }
  };

  function all(key) {
    var arr = read(key, []);
    var s = SORTERS[key];
    return s ? arr.slice().sort(s) : arr.slice();
  }

  function nextId(arr) {
    return arr.reduce(function (m, x) { return Math.max(m, x.id || 0); }, 0) + 1;
  }

  function insert(key, obj) {
    var arr = read(key, []);
    obj.id = nextId(arr);
    arr.push(obj);
    write(key, arr);
    return obj;
  }

  function update(key, id, fn) {
    var arr = read(key, []);
    var i = -1;
    for (var k = 0; k < arr.length; k++) {
      if (arr[k].id === id) { i = k; break; }
    }
    if (i < 0) return null;
    arr[i] = fn(arr[i]);
    write(key, arr);
    return arr[i];
  }

  function remove(key, id) {
    var arr = read(key, []);
    var idx = -1;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === id) { idx = i; break; }
    }
    if (idx < 0) return false;
    arr.splice(idx, 1);
    write(key, arr);
    return true;
  }

  function sid() {
    var s = localStorage.getItem(SID_KEY);
    if (!s) {
      s = 's' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem(SID_KEY, s); } catch (e) {}
    }
    return s;
  }

  function toggleArr(arr, v) {
    var i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(v);
    return arr;
  }

  function httpError(message, status) {
    var e = new Error(message);
    e.status = status || 400;
    return e;
  }

  function jsonBody(opts) {
    var b = opts.body;
    if (typeof b === 'string') {
      try { return JSON.parse(b); } catch (e) { return {}; }
    }
    return b || {};
  }

  /* ---------------- mot de passe & session ---------------- */

  function sha256(text) {
    try {
      if (window.crypto && crypto.subtle) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text))).then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return ('0' + b.toString(16)).slice(-2);
          }).join('');
        }).catch(function () { return 'plain:' + text; });
      }
    } catch (e) {}
    return Promise.resolve('plain:' + text);
  }

  function initPassword() {
    if (!localStorage.getItem(PW_KEY)) {
      sha256(DEFAULT_PASSWORD).then(function (h) {
        try { localStorage.setItem(PW_KEY, h); } catch (e) {}
      });
    }
  }

  function checkPassword(pw) {
    var stored = localStorage.getItem(PW_KEY);
    if (!stored) {
      return sha256(DEFAULT_PASSWORD).then(function (h) {
        try { localStorage.setItem(PW_KEY, h); } catch (e) {}
        return sha256(pw == null ? '' : pw).then(function (h2) { return h2 === h; });
      });
    }
    return sha256(pw == null ? '' : pw).then(function (h) { return h === stored; });
  }

  function isLogged() {
    var a = read('auth', null);
    return !!(a && a.until && Date.now() < a.until);
  }

  function login(pw) {
    return checkPassword(pw).then(function (ok) {
      if (ok) write('auth', { until: Date.now() + AUTH_TTL });
      return ok;
    });
  }

  function logout() {
    try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
  }

  /* ---------------- fichiers (IndexedDB) ---------------- */

  var dbP = null;

  function dbOpen() {
    if (dbP) return dbP;
    dbP = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { dbP = null; reject(req.error); };
    });
    return dbP;
  }

  function putBlob(id, blob) {
    return dbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put({ id: String(id), blob: blob });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function getBlob(id) {
    return dbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('files', 'readonly');
        var req = tx.objectStore('files').get(String(id));
        req.onsuccess = function () { resolve(req.result ? req.result.blob : null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function delBlob(id) {
    return dbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').delete(String(id));
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function fileUrl(item) {
    return getBlob(item.id).then(function (blob) {
      if (!blob) return '';
      if (item._url) { try { URL.revokeObjectURL(item._url); } catch (e) {} }
      var url = URL.createObjectURL(blob);
      item._url = url;
      return url;
    });
  }

  /* ---------------- ressources (miroir des anciennes routes) ---------------- */

  function posts(method, id, action, opts) {
    var my = sid();
    if (method === 'GET') {
      return Promise.resolve(all('posts').map(function (p) {
        return {
          id: p.id, text: p.text, author: p.author, likes: p.likes,
          created_at: p.created_at, liked: (p.liked_sids || []).indexOf(my) >= 0,
          fake: !!p.fake
        };
      }));
    }
    if (method === 'POST' && !id) {
      var body = jsonBody(opts);
      var text = String(body.text || '').trim();
      var author = String(body.author || '').trim() || 'Anonyme';
      if (!text) throw httpError('Message vide');
      if (text.length > 1000) throw httpError('Message trop long (1000 caractères max)');
      return Promise.resolve(insert('posts', { text: text, author: author, likes: 0, liked_sids: [], created_at: Date.now() }));
    }
    if (method === 'POST' && id && action === 'like') {
      var row = update('posts', id, function (p) {
        p.liked_sids = toggleArr(p.liked_sids || [], my);
        p.likes = p.liked_sids.length;
        return p;
      });
      if (!row) throw httpError('Introuvable', 404);
      return Promise.resolve({ likes: row.likes, liked: row.liked_sids.indexOf(my) >= 0 });
    }
    if (method === 'DELETE' && id) {
      if (!remove('posts', id)) throw httpError('Introuvable', 404);
      return Promise.resolve({ ok: true });
    }
    throw httpError('Requête inconnue', 404);
  }

  function playlist(method, id, action, opts) {
    var my = sid();
    if (method === 'GET') {
      return Promise.resolve(all('playlist').map(function (x) {
        return {
          id: x.id, title: x.title, artist: x.artist, url: x.url,
          added_by: x.added_by, votes: x.votes, created_at: x.created_at,
          voted: (x.voted_sids || []).indexOf(my) >= 0
        };
      }));
    }
    if (method === 'POST' && !id) {
      var body = jsonBody(opts);
      var title = String(body.title || '').trim();
      var artist = String(body.artist || '').trim();
      var url = String(body.url || '').trim();
      var addedBy = String(body.author || '').trim() || 'Anonyme';
      if (!title) throw httpError('Titre manquant');
      return Promise.resolve(insert('playlist', { title: title, artist: artist, url: url, added_by: addedBy, votes: 0, voted_sids: [], created_at: Date.now() }));
    }
    if (method === 'POST' && id && action === 'vote') {
      var row = update('playlist', id, function (x) {
        x.voted_sids = toggleArr(x.voted_sids || [], my);
        x.votes = x.voted_sids.length;
        return x;
      });
      if (!row) throw httpError('Introuvable', 404);
      return Promise.resolve({ votes: row.votes, voted: row.voted_sids.indexOf(my) >= 0 });
    }
    if (method === 'DELETE' && id) {
      if (!remove('playlist', id)) throw httpError('Introuvable', 404);
      return Promise.resolve({ ok: true });
    }
    throw httpError('Requête inconnue', 404);
  }

  function vault(method, id, action, opts) {
    if (method === 'GET') {
      return Promise.resolve(all('vault'));
    }
    if (method === 'POST' && !id) {
      if (opts.body instanceof FormData) {
        var file = opts.body.get('file');
        if (!file) throw httpError('Fichier manquant');
        var title = String(opts.body.get('title') || '').trim();
        var rec = insert('vault', {
          type: 'file', title: title || file.name, content: '',
          file_name: file.name, file_size: file.size, created_at: Date.now()
        });
        return putBlob(rec.id, file).then(function () { return rec; });
      }
      var body = jsonBody(opts);
      var type = String(body.type || 'note').trim();
      var title2 = String(body.title || '').trim();
      var content = String(body.content || '').trim();
      if (type === 'link') {
        if (!title2 || !content) throw httpError('Titre et URL manquants');
        return Promise.resolve(insert('vault', { type: 'link', title: title2, content: content, file_name: '', file_size: 0, created_at: Date.now() }));
      }
      if (!title2) throw httpError('Titre manquant');
      return Promise.resolve(insert('vault', { type: 'note', title: title2, content: content, file_name: '', file_size: 0, created_at: Date.now() }));
    }
    if (method === 'DELETE' && id) {
      var row = read('vault', []).filter(function (x) { return x.id === id; })[0];
      if (!row) throw httpError('Introuvable', 404);
      if (row.type === 'file') {
        return delBlob(id).then(function () {
          remove('vault', id);
          return { ok: true };
        });
      }
      remove('vault', id);
      return Promise.resolve({ ok: true });
    }
    throw httpError('Requête inconnue', 404);
  }

  function defis(method, id, action, opts) {
    if (method === 'GET') {
      return Promise.resolve(all('defis'));
    }
    if (method === 'POST' && !id) {
      var body = jsonBody(opts);
      var text = String(body.text || '').trim();
      var author = String(body.author || '').trim() || 'Anonyme';
      if (!text) throw httpError('Défi vide');
      return Promise.resolve(insert('defis', { text: text, author: author, done: 0, done_by: '', created_at: Date.now() }));
    }
    if (method === 'POST' && id && action === 'done') {
      var body2 = jsonBody(opts);
      var row = update('defis', id, function (d) {
        var done = d.done ? 0 : 1;
        d.done = done;
        d.done_by = done ? String(body2.author || '').trim() || 'Quelqu\u2019un' : '';
        return d;
      });
      if (!row) throw httpError('Introuvable', 404);
      return Promise.resolve({ done: row.done, done_by: row.done_by });
    }
    if (method === 'DELETE' && id) {
      if (!remove('defis', id)) throw httpError('Introuvable', 404);
      return Promise.resolve({ ok: true });
    }
    throw httpError('Requête inconnue', 404);
  }

  var NAME_COLORS = ['#8b5cf6', '#f472b6', '#22d3ee', '#fbbf24', '#34d399', '#fb923c', '#a78bfa', '#f43f5e'];

  function leastUsedColor(arr) {
    var used = {};
    arr.forEach(function (n) { if (n.color) used[n.color] = (used[n.color] || 0) + 1; });
    var best = NAME_COLORS[0], bestCount = Infinity;
    NAME_COLORS.forEach(function (c) {
      var cnt = used[c] || 0;
      if (cnt < bestCount) { bestCount = cnt; best = c; }
    });
    return best;
  }

  function names(method, id, action, opts) {
    if (method === 'GET') {
      var arr = all('names');
      var changed = false;
      arr.forEach(function (n) {
        if (!n.color) { n.color = leastUsedColor(arr); changed = true; }
      });
      if (changed) write('names', arr);
      return Promise.resolve(arr);
    }
    if (method === 'POST' && !id) {
      var body = jsonBody(opts);
      var name = String(body.name || '').trim();
      if (!name) throw httpError('Nom vide');
      var dup = read('names', []).filter(function (n) {
        return String(n.name).toLowerCase() === name.toLowerCase();
      })[0];
      if (dup) throw httpError('Ce prénom existe déjà', 409);
      return Promise.resolve(insert('names', { name: name, color: leastUsedColor(read('names', [])), created_at: Date.now() }));
    }
    if (method === 'DELETE' && id) {
      if (!remove('names', id)) throw httpError('Introuvable', 404);
      return Promise.resolve({ ok: true });
    }
    throw httpError('Requête inconnue', 404);
  }

  function shopping(method, id, action, opts) {
    if (method === 'GET') {
      return Promise.resolve(all('shopping'));
    }
    if (method === 'POST' && !id) {
      var body = jsonBody(opts);
      var item = String(body.item || '').trim();
      var by = String(body.author || '').trim() || 'Anonyme';
      if (!item) throw httpError('Article vide');
      return Promise.resolve(insert('shopping', { item: item, done: 0, created_by: by, created_at: Date.now() }));
    }
    if (method === 'POST' && id && action === 'done') {
      var row = update('shopping', id, function (s) { s.done = s.done ? 0 : 1; return s; });
      if (!row) throw httpError('Introuvable', 404);
      return Promise.resolve({ done: !!row.done });
    }
    if (method === 'DELETE' && id) {
      if (!remove('shopping', id)) throw httpError('Introuvable', 404);
      return Promise.resolve({ ok: true });
    }
    throw httpError('Requête inconnue', 404);
  }

  function votes(method, id, action, opts) {
    var my = sid();
    if (method === 'GET') {
      var arr = all('votes');
      var now = Date.now();
      var changed = false;
      arr.forEach(function (v) {
        if (v.open && v.closes_at && now > v.closes_at) {
          v.open = 0;
          changed = true;
        }
      });
      if (changed) write('votes', arr);
      return Promise.resolve(arr.map(function (v) {
        var mine = (v.ballots || []).filter(function (b) { return b.sid === my; })[0];
        return {
          id: v.id, question: v.question, options: v.options || [],
          counts: v.counts || [], open: !!v.open, created_by: v.created_by,
          created_at: v.created_at, closes_at: v.closes_at || null,
          myVote: mine ? mine.option : null
        };
      }));
    }
    if (method === 'POST' && !id) {
      var body = jsonBody(opts);
      var question = String(body.question || '').trim();
      var options = (Array.isArray(body.options) ? body.options : [])
        .map(function (o) { return String(o).trim(); }).filter(Boolean).slice(0, 8);
      var by = String(body.author || '').trim() || 'Anonyme';
      var closes = Number(body.closes_at);
      if (!question) throw httpError('Question manquante');
      if (options.length < 2) throw httpError('Il faut au moins 2 options');
      if (closes && !isFinite(closes)) throw httpError('Date de fin invalide');
      var closesAt = closes > Date.now() ? closes : null;
      return Promise.resolve(insert('votes', {
        question: question, options: options, counts: options.map(function () { return 0; }),
        ballots: [], open: 1, created_by: by, created_at: Date.now(), closes_at: closesAt
      }));
    }
    if (method === 'POST' && id && action === 'vote') {
      var body2 = jsonBody(opts);
      var optionIndex = Number(body2.optionIndex);
      var arr = read('votes', []);
      var v = arr.filter(function (x) { return x.id === id; })[0];
      if (!v) throw httpError('Introuvable', 404);
      if (!v.open) throw httpError('Vote clos');
      if (v.closes_at && Date.now() > v.closes_at) {
        update('votes', id, function (x) { x.open = 0; return x; });
        throw httpError('Vote clos');
      }
      var options = v.options || [];
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
        throw httpError('Option invalide');
      }
      var counts = (v.counts || []).slice();
      var ballots = (v.ballots || []).slice();
      var existing = ballots.filter(function (b) { return b.sid === my; })[0];
      if (existing) counts[existing.option] = Math.max(0, (counts[existing.option] || 0) - 1);
      var nextBallots = ballots.filter(function (b) { return b.sid !== my; });
      nextBallots.push({ sid: my, option: optionIndex });
      counts[optionIndex] = (counts[optionIndex] || 0) + 1;
      update('votes', id, function (x) { x.counts = counts; x.ballots = nextBallots; return x; });
      return Promise.resolve({ counts: counts, myVote: { option: optionIndex } });
    }
    if (method === 'POST' && id && action === 'close') {
      var row = update('votes', id, function (v2) { v2.open = 0; return v2; });
      if (!row) throw httpError('Introuvable', 404);
      return Promise.resolve({ open: false });
    }
    if (method === 'DELETE' && id) {
      if (!remove('votes', id)) throw httpError('Introuvable', 404);
      return Promise.resolve({ ok: true });
    }
    throw httpError('Requête inconnue', 404);
  }

  function archives(method, id, action, opts) {
    if (method === 'GET') {
      return Promise.resolve(all('archives'));
    }
    if (method === 'POST' && !id) {
      if (!(opts.body instanceof FormData)) throw httpError('Requête inconnue', 404);
      var file = opts.body.get('file');
      if (!file) throw httpError('Photo manquante');
      var caption = String(opts.body.get('caption') || '').trim();
      var by = String(opts.body.get('author') || '').trim() || 'Anonyme';
      var rec = insert('archives', {
        caption: caption, file_name: file.name, file_size: file.size,
        uploaded_by: by, created_at: Date.now()
      });
      return putBlob(rec.id, file).then(function () { return rec; });
    }
    if (method === 'DELETE' && id) {
      var row = read('archives', []).filter(function (x) { return x.id === id; })[0];
      if (!row) throw httpError('Introuvable', 404);
      return delBlob(id).then(function () {
        remove('archives', id);
        return { ok: true };
      });
    }
    throw httpError('Requête inconnue', 404);
  }

  /* ---------------- routeur principal ---------------- */

  function api(path, opts) {
    opts = opts || {};
    var method = (opts.method || 'GET').toUpperCase();
    var parts = String(path).replace(/^\/+/, '').split('/').filter(Boolean);
    if (!parts.length || parts[0] !== 'api') {
      return Promise.reject(httpError('Requête inconnue', 404));
    }
    var resource = parts[1];
    var id = parts.length > 2 ? Number(parts[2]) : null;
    var action = parts[3];

    if (resource === 'auth') {
      var sub = parts[2];
      var body = jsonBody(opts);
      if (method === 'POST' && sub === 'login') {
        return checkPassword(body.password).then(function (ok) {
          if (!ok) throw httpError('Mot de passe incorrect', 401);
          write('auth', { until: Date.now() + AUTH_TTL });
          return { ok: true };
        });
      }
      if (method === 'POST' && sub === 'logout') {
        logout();
        return Promise.resolve({ ok: true });
      }
      if (method === 'POST' && sub === 'verify') {
        return checkPassword(body.password).then(function (ok) {
          if (!ok) throw httpError('Mot de passe incorrect', 401);
          return { ok: true };
        });
      }
      if (method === 'GET' && sub === 'me') {
        if (!isLogged()) throw httpError('Non connecté', 401);
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(httpError('Requête inconnue', 404));
    }

    if (!isLogged()) {
      window.location.href = 'login.html';
      return Promise.reject(httpError('Non connecté', 401));
    }

    try {
      switch (resource) {
        case 'posts': return posts(method, id, action, opts);
        case 'playlist': return playlist(method, id, action, opts);
        case 'vault': return vault(method, id, action, opts);
        case 'defis': return defis(method, id, action, opts);
        case 'names': return names(method, id, action, opts);
        case 'shopping': return shopping(method, id, action, opts);
        case 'votes': return votes(method, id, action, opts);
        case 'archives': return archives(method, id, action, opts);
        default: throw httpError('Requête inconnue', 404);
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /* ---------------- API publique ---------------- */

  window.AAStore = {
    api: api,
    fileUrl: fileUrl,
    login: login,
    logout: logout,
    isLogged: isLogged,
    initPassword: initPassword,
    checkPassword: checkPassword
  };
})();
