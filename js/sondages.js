(function () {
  'use strict';
  const { api, toast, escapeHtml, fmtDate, getNick, $, $$ } = window.App;

  /* ================== AIDE ================== */
  function totalOf(v) {
    return (v.counts || []).reduce(function (a, b) { return a + b; }, 0);
  }

  function statusText(v) {
    if (!v.open) return 'clos';
    if (v.closes_at) return 'se clôt ' + fmtDate(v.closes_at);
    return 'ouvert';
  }

  /* ================== CARTE SONDAGE ================== */
  function makeOptionBtn(v, idx, refresh) {
    const opt = v.options[idx];
    const total = totalOf(v);
    const pct = total ? Math.round((v.counts[idx] / total) * 100) : 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vote-opt' + (v.myVote === idx ? ' mine' : '');
    btn.innerHTML =
      '<span class="bar" style="--w:' + pct + '%"></span>' +
      '<span style="position:relative;z-index:1;">' + escapeHtml(opt) + '</span>' +
      '<span class="pct" style="position:relative;z-index:1;">' + (v.counts[idx] || 0) + ' · ' + pct + '%</span>';
    if (v.open) {
      btn.addEventListener('click', function () {
        api('/api/votes/' + v.id + '/vote', { method: 'POST', body: JSON.stringify({ optionIndex: idx }) })
          .then(function () { toast('Ton vote est compté ✔'); refresh(); })
          .catch(function (e) { toast(e.message, true); });
      });
    } else {
      btn.disabled = true;
      btn.style.opacity = '.7';
    }
    return btn;
  }

  function pollCard(v, refresh) {
    const card = document.createElement('div');
    card.className = 'card col-6 poll-card';
    card.style.animation = 'itemIn .45s var(--ease) both';

    const h = document.createElement('h3');
    h.textContent = v.question;
    card.appendChild(h);

    const meta = document.createElement('p');
    meta.className = 'poll-meta';
    meta.innerHTML =
      '<span class="poll-status ' + (v.open ? 'on' : 'off') + '">' + (v.open ? 'Ouvert' : 'Clos') + '</span>' +
      '<span>Par ' + escapeHtml(v.created_by) + ' · ' + escapeHtml(statusText(v)) + '</span>';
    card.appendChild(meta);

    const opts = document.createElement('div');
    opts.className = 'poll-opts';
    (v.options || []).forEach(function (_, idx) { opts.appendChild(makeOptionBtn(v, idx, refresh)); });
    card.appendChild(opts);

    const total = totalOf(v);
    const foot = document.createElement('div');
    foot.className = 'toolbar';
    foot.style.marginTop = '14px';
    foot.style.marginBottom = '0';
    const totalLabel = document.createElement('span');
    totalLabel.className = 'poll-total';
    totalLabel.textContent = total + ' vote' + (total > 1 ? 's' : '');
    foot.appendChild(totalLabel);

    if (v.open) {
      const close = document.createElement('button');
      close.className = 'btn ghost sm';
      close.textContent = 'Clore le vote';
      close.addEventListener('click', function () {
        api('/api/votes/' + v.id + '/close', { method: 'POST' })
          .then(function () { toast('Vote clos'); refresh(); })
          .catch(function (e) { toast(e.message, true); });
      });
      foot.appendChild(close);
    }

    const del = document.createElement('button');
    del.className = 'btn ghost sm danger';
    del.textContent = 'Supprimer';
    del.addEventListener('click', function () {
      if (!confirm('Supprimer ce sondage ?')) return;
      api('/api/votes/' + v.id, { method: 'DELETE' })
        .then(function () { toast('Sondage supprimé'); refresh(); })
        .catch(function (e) { toast(e.message, true); });
    });
    foot.appendChild(del);

    card.appendChild(foot);
    return card;
  }

  /* ================== PAGE DEDIEE ================== */
  function initPage() {
    const root = $('#poll-root');
    if (!root) return;

    const form = $('#poll-form');
    const question = $('#poll-question');
    const optsBox = $('#poll-opts');
    const addOpt = $('#poll-addopt');
    const closesInput = $('#poll-closes');
    const list = $('#poll-list');
    const empty = $('#poll-empty');

    function renderOptionInputs() {
      optsBox.innerHTML = '';
      for (let i = 0; i < 2; i++) {
        const div = document.createElement('div');
        div.className = 'col-6';
        const input = document.createElement('input');
        input.className = 'input';
        input.placeholder = 'Option ' + (i + 1);
        div.appendChild(input);
        optsBox.appendChild(div);
      }
    }

    addOpt.addEventListener('click', function () {
      const count = $$('#poll-opts .input').length;
      if (count >= 8) { toast('Maximum 8 options.', true); return; }
      const div = document.createElement('div');
      div.className = 'col-6';
      const input = document.createElement('input');
      input.className = 'input';
      input.placeholder = 'Option ' + (count + 1);
      div.appendChild(input);
      optsBox.appendChild(div);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const q = question.value.trim();
      const options = $$('#poll-opts .input').map(function (i) { return i.value.trim(); }).filter(Boolean);
      if (!q) { toast('Une question est nécessaire.', true); return; }
      if (options.length < 2) { toast('Il faut au moins 2 options.', true); return; }
      let closesAt = null;
      if (closesInput.value) {
        closesAt = new Date(closesInput.value).getTime();
        if (isNaN(closesAt)) { toast('Date de fin invalide.', true); return; }
        if (closesAt <= Date.now()) { toast('La date de fin doit être dans le futur.', true); return; }
      }
      api('/api/votes', {
        method: 'POST',
        body: JSON.stringify({ question: q, options: options, author: getNick() || 'Anonyme', closes_at: closesAt })
      }).then(function () {
        toast('Sondage lancé 🗳️');
        question.value = '';
        closesInput.value = '';
        renderOptionInputs();
        load();
      }).catch(function (err) { toast(err.message, true); });
    });

    function load() {
      api('/api/votes').then(function (votes) {
        list.innerHTML = '';
        empty.style.display = votes.length ? 'none' : 'block';
        votes.forEach(function (v, i) {
          const card = pollCard(v, load);
          card.style.animationDelay = (i * 0.04) + 's';
          list.appendChild(card);
        });
      }).catch(function (e) { toast(e.message, true); });
    }

    renderOptionInputs();
    load();
  }

  /* ================== WIDGET ACCUEIL ================== */
  function initWidget() {
    const root = $('#sondage-widget');
    if (!root) return;

    const loading = $('#sondage-widget-loading');
    const emptyBox = $('#sondage-widget-empty');
    const wrap = $('#sondage-widget-inner');

    function load() {
      api('/api/votes').then(function (votes) {
        loading.style.display = 'none';
        const open = votes.filter(function (v) { return v.open; });
        const pick = open[0] || votes[0];
        if (!pick) {
          wrap.innerHTML = '';
          emptyBox.style.display = 'block';
          return;
        }
        emptyBox.style.display = 'none';
        wrap.innerHTML = '';
        const card = pollCard(pick, load);
        card.className = 'card poll-card col-12';
        card.style.animation = 'itemIn .45s var(--ease) both';
        wrap.appendChild(card);
      }).catch(function (e) {
        loading.style.display = 'block';
        loading.textContent = 'Sondage indisponible pour le moment.';
      });
    }

    load();
  }

  /* ================== INIT ================== */
  document.addEventListener('DOMContentLoaded', function () {
    initPage();
    initWidget();
  });
})();
