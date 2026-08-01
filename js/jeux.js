(function () {
  'use strict';
  const { toast, $, $$ } = window.App;

  /* ================== CAGNOTTE COMMUNE ================== */
  const WALLET_KEY = 'aa_wallet';
  const START_WALLET = 1000;
  let wallet = parseInt(localStorage.getItem(WALLET_KEY) || '', 10);
  if (!isFinite(wallet) || wallet < 0) {
    const old = parseInt(localStorage.getItem('aa_bj_balance') || '', 10);
    wallet = (isFinite(old) && old >= 0) ? old : START_WALLET;
  }
  function saveWallet() { try { localStorage.setItem(WALLET_KEY, String(wallet)); } catch (e) {} }
  function refreshWallet() {
    $$('.wallet-num').forEach((el) => { el.textContent = wallet; });
  }
  function chargeWallet() {
    wallet = START_WALLET;
    saveWallet();
    refreshWallet();
  }

  /* ================== BLACKJACK ================== */
  const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  let deck = [];
  let bet = parseInt(localStorage.getItem('aa_bj_bet') || '', 10);
  if (!isFinite(bet) || bet < 1) bet = 10;

  let player = [];
  let dealer = [];
  let phase = 'betting';
  let doubled = false;

  const dealerBox = $('#bj-dealer');
  const playerBox = $('#bj-player');
  const dealerTotal = $('#bj-dealer-total');
  const playerTotal = $('#bj-player-total');
  const statusEl = $('#bj-status');
  const balanceEl = $('#bj-balance');
  const betEl = $('#bj-bet');

  function makeDeck() {
    const d = [];
    SUITS.forEach((s) => RANKS.forEach((r) => d.push({ r: r, s: s })));
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = d[i]; d[i] = d[j]; d[j] = tmp;
    }
    return d;
  }

  function draw() {
    if (!deck.length) deck = makeDeck();
    return deck.pop();
  }

  function cardValue(c) {
    if (c.r === 'A') return 11;
    if (c.r === 'K' || c.r === 'Q' || c.r === 'J') return 10;
    return parseInt(c.r, 10);
  }

  function handValue(hand) {
    let total = 0;
    let aces = 0;
    hand.forEach((c) => {
      if (c.r === 'A') aces++;
      total += cardValue(c);
    });
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }

  function isBlackjack(hand) {
    return hand.length === 2 && handValue(hand) === 21;
  }

  function saveBet() {
    try { localStorage.setItem('aa_bj_bet', String(bet)); } catch (e) {}
  }

  function cardEl(c, faceDown) {
    const el = document.createElement('div');
    el.className = 'bj-card' + (faceDown ? ' back' : '');
    if (!faceDown) {
      const red = (c.s === '\u2665' || c.s === '\u2666');
      if (red) el.classList.add('red');
      const v = document.createElement('span');
      v.className = 'bc-v';
      v.textContent = c.r;
      const s = document.createElement('span');
      s.className = 'bc-s';
      s.textContent = c.s;
      el.appendChild(v);
      el.appendChild(s);
    }
    return el;
  }

  function render() {
    playerBox.innerHTML = '';
    dealerBox.innerHTML = '';

    player.forEach((c) => playerBox.appendChild(cardEl(c, false)));
    const hideDealerHole = (phase === 'playing' || phase === 'betting') && dealer.length === 2;
    dealer.forEach((c, i) => dealerBox.appendChild(cardEl(c, hideDealerHole && i === 1)));

    const pv = player.length ? handValue(player) : 0;
    playerTotal.textContent = pv || '';
    if (hideDealerHole) {
      dealerTotal.textContent = '?';
    } else {
      dealerTotal.textContent = dealer.length ? handValue(dealer) : '';
    }

    balanceEl.textContent = wallet;
    betEl.textContent = bet;
  }

  function setControls(p) {
    phase = p;
    const deal = $('#bj-deal');
    const hit = $('#bj-hit');
    const stand = $('#bj-stand');
    const doub = $('#bj-double');
    const again = $('#bj-again');
    const betBtns = $$('#bj-bet-minus, #bj-bet-plus, .chip-bet');
    if (p === 'betting') {
      deal.hidden = false; hit.hidden = true; stand.hidden = true; doub.hidden = true; again.hidden = true;
      betBtns.forEach((b) => { b.disabled = false; });
    } else if (p === 'playing') {
      deal.hidden = true; hit.hidden = false; stand.hidden = false; doub.hidden = false; again.hidden = true;
      betBtns.forEach((b) => { b.disabled = true; });
      doub.disabled = wallet < bet;
    } else if (p === 'dealer') {
      deal.hidden = true; hit.hidden = true; stand.hidden = true; doub.hidden = true; again.hidden = true;
      betBtns.forEach((b) => { b.disabled = true; });
    } else {
      deal.hidden = true; hit.hidden = true; stand.hidden = true; doub.hidden = true; again.hidden = false;
      betBtns.forEach((b) => { b.disabled = false; });
    }
  }

  function setStatus(html) {
    statusEl.innerHTML = html;
  }

  function startHand() {
    if (phase === 'dealer') return;
    if (deck.length < 25) deck = makeDeck();
    if (bet > wallet) bet = Math.max(1, wallet);
    if (wallet < 1) { toast('Plus de crédits. Recharge la cagnotte !', true); return; }
    saveBet();
    wallet -= bet;
    saveWallet();
    refreshWallet();
    player = [draw(), draw()];
    dealer = [draw(), draw()];
    doubled = false;
    setControls('playing');
    setStatus('À toi de jouer.');
    render();
    if (isBlackjack(player)) {
      endHand('blackjack');
    } else if (isBlackjack(dealer)) {
      endHand('dealerBj');
    }
  }

  function hit() {
    if (phase !== 'playing') return;
    player.push(draw());
    render();
    if (handValue(player) > 21) endHand('bust');
  }

  function stand() {
    if (phase !== 'playing') return;
    playDealer();
  }

  function doubleDown() {
    if (phase !== 'playing' || player.length !== 2) return;
    if (wallet < bet) { toast('Pas assez de crédits pour doubler.', true); return; }
    wallet -= bet;
    bet *= 2;
    saveWallet();
    refreshWallet();
    saveBet();
    doubled = true;
    player.push(draw());
    render();
    if (handValue(player) > 21) endHand('bust');
    else playDealer();
  }

  function playDealer() {
    setControls('dealer');
    setStatus('Le croupier joue…');
    render();
    const t = setInterval(() => {
      if (handValue(dealer) >= 17) {
        clearInterval(t);
        endHand('settle');
      } else {
        dealer.push(draw());
        render();
      }
    }, 750);
  }

  function endHand(kind) {
    const pv = handValue(player);
    const dv = handValue(dealer);
    let msg = '';
    let sub = 'Croupier : ' + dv + ' · Toi : ' + pv;
    let payout = 0;
    switch (kind) {
      case 'blackjack':
        msg = 'Blackjack ! Tu gagnes x2,5 🎉';
        payout = Math.floor(bet * 2.5);
        break;
      case 'dealerBj':
        msg = 'Le croupier a un blackjack.';
        break;
      case 'bust':
        msg = 'Bust… tu dépasses 21.';
        break;
      default:
        if (pv > 21) { msg = 'Bust… tu dépasses 21.'; }
        else if (dv > 21) { msg = 'Le croupier bust ! Tu gagnes 🎉'; payout = bet * 2; }
        else if (pv > dv) { msg = 'Tu gagnes 🎉'; payout = bet * 2; }
        else if (pv < dv) { msg = 'Le croupier gagne.'; }
        else { msg = 'Égalité, tu récupères ta mise.'; payout = bet; }
        break;
    }
    if (doubled) sub += ' · Mise doublée';
    wallet += payout;
    saveWallet();
    refreshWallet();
    setStatus('<span class="bj-status-title">' + msg + '</span><span class="bj-status-sub">' + sub + '</span>');
    setControls('over');
    render();
    addAddiction();
  }

  $('#bj-deal').addEventListener('click', startHand);
  $('#bj-hit').addEventListener('click', hit);
  $('#bj-stand').addEventListener('click', stand);
  $('#bj-double').addEventListener('click', doubleDown);
  $('#bj-again').addEventListener('click', () => {
    setControls('betting');
    setStatus('Distribue pour commencer.');
    player = [];
    dealer = [];
    render();
  });

  $('#bj-bet-minus').addEventListener('click', () => {
    bet = Math.max(1, bet - 5);
    render();
  });
  $('#bj-bet-plus').addEventListener('click', () => {
    bet = Math.min(Math.max(1, wallet), bet + 5);
    render();
  });
  $$('.chip-bet').forEach((b) => {
    b.addEventListener('click', () => {
      bet = Math.min(Math.max(1, wallet), parseInt(b.dataset.bet, 10) || 10);
      render();
    });
  });

  $('#bj-reset').addEventListener('click', () => {
    if (!confirm('Remettre la cagnotte à ' + START_WALLET + ' crédits ?')) return;
    chargeWallet();
    render();
    toast('Cagnotte réinitialisée');
  });

  /* ================== MACHINES À SOUS ================== */
  const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '7️⃣', '💎'];
  const SLOT_MULT = { '🍒': 3, '🍋': 5, '🔔': 10, '⭐': 20, '7️⃣': 40, '💎': 80 };
  let slotBet = parseInt(localStorage.getItem('aa_slot_bet') || '', 10);
  if (!isFinite(slotBet) || slotBet < 1) slotBet = 10;
  $('#slot-bet').textContent = slotBet;
  let slotBusy = false;
  const slotReels = [$('#slot-r1'), $('#slot-r2'), $('#slot-r3')];

  function slotRand() { return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]; }

  $('#slot-spin').addEventListener('click', () => {
    if (slotBusy) return;
    slotBet = Math.min(Math.max(1, wallet), slotBet);
    if (wallet < slotBet) { toast('Pas assez de crédits.', true); return; }
    wallet -= slotBet;
    saveWallet();
    refreshWallet();
    slotBusy = true;
    $('#slot-result').textContent = '…';
    const result = [slotRand(), slotRand(), slotRand()];
    const running = [true, true, true];
    slotReels.forEach((r) => r.classList.add('spinning'));
    const t = setInterval(() => {
      running.forEach((run, i) => { if (run) slotReels[i].textContent = slotRand(); });
    }, 60);
    setTimeout(() => {
      running[0] = false;
      slotReels[0].classList.remove('spinning');
      slotReels[0].textContent = result[0];
    }, 700);
    setTimeout(() => {
      running[1] = false;
      slotReels[1].classList.remove('spinning');
      slotReels[1].textContent = result[1];
    }, 980);
    setTimeout(() => {
      clearInterval(t);
      running[2] = false;
      slotReels[2].classList.remove('spinning');
      slotReels[2].textContent = result[2];
      const a = result[0], b = result[1], c = result[2];
      let win = 0;
      let msg = '';
      if (a === b && b === c) {
        win = slotBet * SLOT_MULT[a];
        msg = 'Trois ' + a + ' ! Jackpot ×' + SLOT_MULT[a] + ' 🎉';
      } else if (a === b || b === c) {
        win = Math.ceil(slotBet * 0.8);
        msg = 'Deux identiques — petite somme.';
      } else {
        msg = 'Rien… retente ta chance.';
      }
      if (win > 0) {
        wallet += win;
        saveWallet();
        refreshWallet();
        msg += ' (+' + win + ')';
      }
      $('#slot-result').textContent = msg;
      slotBusy = false;
      addAddiction();
    }, 1260);
  });

  $('#slot-minus').addEventListener('click', () => {
    slotBet = Math.max(1, slotBet - 5);
    $('#slot-bet').textContent = slotBet;
  });
  $('#slot-plus').addEventListener('click', () => {
    slotBet = Math.min(Math.max(1, wallet), slotBet + 5);
    $('#slot-bet').textContent = slotBet;
  });

  /* ================== TICKET À GRATTER ================== */
  const SCRATCH_SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '💎'];
  const SCRATCH_MULT = { '🍒': 2, '🍋': 3, '🔔': 5, '⭐': 8, '💎': 15 };
  const SCRATCH_COST = 20;
  const scratchGrid = $('#scratch-grid');
  let scratchPool = [];
  let scratchRevealed = 0;

  function newTicket() {
    if (wallet < SCRATCH_COST) { toast('Pas assez de crédits pour un ticket.', true); return; }
    wallet -= SCRATCH_COST;
    saveWallet();
    refreshWallet();
    const winSym = Math.random() < 0.45
      ? SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)]
      : null;
    const pool = [];
    for (let i = 0; i < 9; i++) {
      if (winSym && i < 3) pool.push(winSym);
      else pool.push(SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)]);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    scratchPool = pool;
    scratchRevealed = 0;
    scratchGrid.innerHTML = '';
    pool.forEach((s, i) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'scratch-tile';
      t.textContent = s;
      t.setAttribute('aria-label', 'Case ' + (i + 1));
      t.addEventListener('click', () => scratchReveal(t, i));
      scratchGrid.appendChild(t);
    });
    $('#scratch-result').textContent = 'Gratte les cases !';
  }

  function scratchReveal(tile) {
    if (tile.classList.contains('revealed')) return;
    tile.classList.add('revealed');
    scratchRevealed++;
    if (scratchRevealed === 9) settleScratch();
  }

  function settleScratch() {
    const counts = {};
    scratchPool.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
    let win = 0;
    SCRATCH_SYMBOLS.forEach((s) => {
      const n = counts[s] || 0;
      if (n >= 3) win += SCRATCH_COST * SCRATCH_MULT[s];
      else if (n === 2) win += Math.ceil(SCRATCH_COST * 0.3);
    });
    if (win > 0) {
      wallet += win;
      saveWallet();
      refreshWallet();
      $('#scratch-result').textContent = 'Tu gagnes ' + win + ' crédits ! 🎉';
    } else {
      $('#scratch-result').textContent = 'Perdu… encore un ticket ?';
    }
    addAddiction();
  }

  $('#scratch-buy').addEventListener('click', newTicket);

  /* ================== ROULETTE ================== */
  const RT_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  let rtBet = parseInt(localStorage.getItem('aa_rt_bet') || '', 10);
  if (!isFinite(rtBet) || rtBet < 1) rtBet = 10;
  $('#rt-bet').textContent = rtBet;
  let rtBetType = 'rouge';
  let rtBetNum = null;
  let rtBusy = false;
  const rtBoard = $('#rt-board');

  function rtColor(n) {
    if (n === 0) return 'green';
    return RT_RED.has(n) ? 'red' : 'black';
  }

  function buildBoard() {
    for (let n = 0; n <= 36; n++) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'rt-cell ' + rtColor(n);
      c.textContent = n;
      c.dataset.n = n;
      c.addEventListener('click', () => {
        rtBetType = 'num';
        rtBetNum = n;
        paintSelection();
      });
      rtBoard.appendChild(c);
    }
  }

  function paintSelection() {
    $$('.rt-cell').forEach((c) => c.classList.remove('selected'));
    if (rtBetType === 'num' && rtBetNum !== null) {
      const c = rtBoard.querySelector('.rt-cell[data-n="' + rtBetNum + '"]');
      if (c) c.classList.add('selected');
    }
  }

  $('#rt-rouge').addEventListener('click', () => {
    rtBetType = 'rouge';
    rtBetNum = null;
    paintSelection();
  });
  $('#rt-noir').addEventListener('click', () => {
    rtBetType = 'noir';
    rtBetNum = null;
    paintSelection();
  });

  $('#rt-spin').addEventListener('click', () => {
    if (rtBusy) return;
    rtBet = Math.min(Math.max(1, wallet), rtBet);
    if (wallet < rtBet) { toast('Pas assez de crédits.', true); return; }
    wallet -= rtBet;
    saveWallet();
    refreshWallet();
    rtBusy = true;
    $$('.rt-cell').forEach((c) => c.classList.remove('win'));
    $('#rt-result').textContent = 'La bille tourne…';
    const n = Math.floor(Math.random() * 37);
    setTimeout(() => {
      const col = rtColor(n);
      const cell = rtBoard.querySelector('.rt-cell[data-n="' + n + '"]');
      if (cell) {
        cell.classList.add('win');
        if (cell.scrollIntoView) cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      let msg = n + ' — ' + col + (n ? (n % 2 ? ' impair' : ' pair') : '');
      let win = 0;
      if (rtBetType === 'num') {
        if (rtBetNum === n) win = rtBet * 36;
      } else if (rtBetType === 'rouge') {
        if (col === 'red') win = rtBet * 2;
      } else if (rtBetType === 'noir') {
        if (col === 'black') win = rtBet * 2;
      }
      if (win > 0) {
        wallet += win;
        saveWallet();
        refreshWallet();
        msg += ' — Tu gagnes ' + win + ' ! 🎉';
      } else {
        msg += ' — Perdu.';
      }
      $('#rt-result').textContent = msg;
      rtBusy = false;
      addAddiction();
    }, 1400);
  });

  $('#rt-minus').addEventListener('click', () => {
    rtBet = Math.max(1, rtBet - 5);
    $('#rt-bet').textContent = rtBet;
  });
  $('#rt-plus').addEventListener('click', () => {
    rtBet = Math.min(Math.max(1, wallet), rtBet + 5);
    $('#rt-bet').textContent = rtBet;
  });

  /* ================== COMPTEUR D'ADDICTION ================== */
  let addiction = parseInt(localStorage.getItem('aa_addict') || localStorage.getItem('aa_bj_addict') || '', 10);
  if (!isFinite(addiction) || addiction < 0) addiction = 0;

  const ADDICT_LEVELS = [
    { t: 0, m: 'Débutant innocent…' },
    { t: 5, m: 'Ça commence à chauffer.' },
    { t: 12, m: 'Un doigt dans le casino.' },
    { t: 25, m: 'Tu connais le croupier par son prénom.' },
    { t: 45, m: 'Tu prends de la place à la table.' },
    { t: 70, m: 'Addiction confirmée par l\u2019équipe médicale.' },
    { t: 100, m: 'Réunion des joueurs anonymes : ton tour de parole.' }
  ];

  function addictMessage(n) {
    let m = ADDICT_LEVELS[ADDICT_LEVELS.length - 1].m;
    ADDICT_LEVELS.forEach((l) => { if (n >= l.t) m = l.m; });
    return m;
  }

  function updateAddiction() {
    const bar = $('#addict-bar');
    if (!bar) return;
    const pct = Math.min(100, 4 + addiction * 3);
    bar.style.width = pct + '%';
    const label = $('#addict-label');
    if (label) label.textContent = addictMessage(addiction);
    const count = $('#addict-count');
    if (count) count.textContent = addiction + ' partie' + (addiction > 1 ? 's' : '') + ' jouée' + (addiction > 1 ? 's' : '');
  }

  function addAddiction() {
    addiction++;
    try { localStorage.setItem('aa_addict', String(addiction)); } catch (e) {}
    updateAddiction();
  }

  $('#addict-reset').addEventListener('click', () => {
    if (!confirm('Se faire soigner ? Le compteur repart à zéro.')) return;
    addiction = 0;
    try { localStorage.setItem('aa_addict', '0'); } catch (e) {}
    updateAddiction();
    toast('Compteur remis à zéro. Soigne-toi bien.');
  });

  $('#wallet-reset').addEventListener('click', () => {
    if (!confirm('Recharger la cagnotte à ' + START_WALLET + ' crédits ?')) return;
    chargeWallet();
    render();
    toast('Cagnotte rechargée');
  });

  /* ============ INIT ============ */
  buildBoard();
  paintSelection();
  setControls('betting');
  setStatus('Distribue pour commencer.');
  updateAddiction();
  refreshWallet();
  render();
})();
