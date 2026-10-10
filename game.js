(() => {
  'use strict';

  const COLS = ['B', 'I', 'N', 'G', 'O'];
  const FREE = 12;
  const RIVALS = 3;
  const BOOST_BALLS = 5;
  const BASE_REWARD = 100;
  const LUCKY_BOX_BONUS = 25;
  const SAVE_KEY = 'bingo-benny';

  const MODES = {
    easy: {
      label: 'Easy',
      callMs: 10000,
      boxes: 0,
      rivalDelay: 8, // rivals call BINGO 8-10 balls after completing a line
      freezeMs: 1000,
      hint: true, // tell the player whether the current answer is on their card
      odds: false,
      rewardMult: 1,
    },
    genius: {
      label: 'Genius',
      callMs: 6500,
      boxes: 4,
      rivalDelay: 4, // 4-6 balls
      freezeMs: 2000,
      hint: false,
      odds: true,
      rewardMult: 2,
    },
  };

  const MOUTHS = {
    happy: 'M44 67 Q47 70.5 50 67 Q53 70.5 56 67',
    sad: 'M44 70 Q50 65 56 70',
    wow: 'M46 67 Q50 74 54 67 Q50 64 46 67',
  };

  const $ = id => document.getElementById(id);

  // ---------- Persistence ----------
  const save = Object.assign({ coins: 0, played: 0, wins: 0, mode: 'easy' }, (() => {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
  })());
  if (!MODES[save.mode]) save.mode = 'easy';
  let mode = MODES[save.mode];
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
  }

  // ---------- Helpers ----------
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const randInt = n => Math.floor(Math.random() * n);
  const pick = arr => arr[randInt(arr.length)];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const colOf = n => COLS[Math.floor((n - 1) / 15)];
  const colRange = n => { const c = Math.floor((n - 1) / 15); return range(c * 15 + 1, c * 15 + 15); };
  const ordinal = n => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const digitSum = n => String(n).split('').reduce((a, d) => a + Number(d), 0);
  const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };

  // ---------- Riddles ----------
  // Themed clues for numbers that have them (math, probability, cats).
  const SPECIAL = (() => {
    const map = {};
    const add = (n, text) => { if (n >= 1 && n <= 75) (map[n] ||= []).push(text); };

    for (let k = 1; k <= 6; k++) add(2 ** k, `Possible outcomes when flipping ${k} coin${k > 1 ? 's' : ''}`);
    add(6, 'Ways to line up 3 cats in a row');
    add(24, 'Ways to line up 4 cats in a row');
    for (let n = 4; n <= 12; n++) {
      for (let k = 2; k <= Math.floor(n / 2); k++) add(choose(n, k), `Ways to pick ${k} cats from a group of ${n}`);
    }
    for (let s = 2; s <= 12; s++) add(6 - Math.abs(s - 7), `Ways to roll a total of ${s} with two dice`);
    add(36, 'Possible outcomes when rolling two dice');
    add(50, 'Chance (%) a fair coin lands heads');
    add(25, 'Chance (%) of two heads in two flips');
    add(75, 'Chance (%) of at least one head in two flips');
    add(13, 'Chance (%) of three heads in a row, rounded');
    add(17, 'Chance (%) of rolling a 6 on one die, rounded');
    add(33, 'Chance (%) of rolling a 1 or 2 on one die, rounded');
    add(67, 'Chance (%) of NOT rolling a 1 or 2, rounded');
    add(3, 'Chance (%) of rolling double sixes, rounded');
    add(9, 'Lives of one cat');
    add(18, 'Lives of two cats');
    add(27, 'Lives of three cats');
    add(36, 'Lives of four cats');
    add(45, 'Lives of five cats');
    add(54, 'Lives of six cats');
    add(63, 'Lives of seven cats');
    add(72, 'Lives of eight cats');
    add(16, 'Legs on four cats');
    add(40, 'Legs on ten cats');

    let idx = 0;
    for (let p = 2; p <= 75; p++) {
      if (range(2, Math.floor(Math.sqrt(p))).every(d => p % d)) add(p, `The ${ordinal(++idx)} prime number`);
    }
    for (let k = 2; k <= 8; k++) add(k * k, `${k} squared`);
    for (let k = 2; k <= 4; k++) add(k ** 3, `${k} cubed`);
    [2, 3, 5, 8, 13, 21, 34, 55].forEach((f, i) => add(f, `The ${ordinal(i + 3)} Fibonacci number (1, 1, 2, 3, 5…)`));
    return map;
  })();

  function genericRiddles(n) {
    const out = [];
    if (n >= 2) { const a = 1 + randInt(n - 1); out.push(`${a} + ${n - a}`); }
    const b = 1 + randInt(20);
    out.push(`${n + b} − ${b}`);
    out.push(`Half of ${n * 2}`);
    const divisors = range(2, Math.floor(n / 2)).filter(d => n % d === 0 && n / d >= 2);
    if (divisors.length) { const d = pick(divisors); out.push(`${d} × ${n / d}`); }
    const a = 2 + randInt(4), m = 2 + randInt(5);
    if (a * m < n) out.push(`${a} × ${m} + ${n - a * m}`);

    // Column-based riddles: only used when the answer is unique within the column.
    const col = colRange(n);
    if (col.filter(x => digitSum(x) === digitSum(n)).length === 1) {
      out.push(`In this column, my digits add up to ${digitSum(n)}`);
    }
    for (const k of [7, 9, 11, 12, 13]) {
      if (n % k === 0 && col.filter(x => x % k === 0).length === 1) out.push(`The only multiple of ${k} in this column`);
    }
    return out;
  }

  // Easy mode: plain addition, subtraction, small times tables.
  function easyRiddles(n) {
    const out = [];
    if (n >= 2) { const a = 1 + randInt(Math.min(n - 1, 10)); out.push(`${n - a} + ${a}`); }
    const b = 1 + randInt(9);
    out.push(`${n + b} − ${b}`);
    const factors = range(2, 10).filter(d => n % d === 0 && n / d >= 2 && n / d <= 10);
    if (factors.length) { const d = pick(factors); out.push(`${d} × ${n / d}`); }
    if (n % 2 === 0 && n <= 40) out.push(`Double ${n / 2}`);
    return out;
  }

  function riddleFor(n) {
    if (mode === MODES.easy) return pick(easyRiddles(n));
    const special = SPECIAL[n];
    if (special && Math.random() < 0.6) return pick(special);
    return pick(genericRiddles(n));
  }

  // ---------- Cards ----------
  // Cells: { kind: 'free' | 'num' | 'box' | 'empty', n, a, b, truth, marked }
  function makeCard(withBoxes) {
    const cols = COLS.map((_, c) => shuffle(range(c * 15 + 1, c * 15 + 15)));
    const cells = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) cells.push({ kind: 'num', n: cols[c][r], marked: false });
    cells[FREE] = { kind: 'free', marked: true };

    if (withBoxes) {
      const spare = cols.map(() => 5); // next unused number per column
      const spots = shuffle(range(0, 24).filter(i => i !== FREE)).slice(0, mode.boxes);
      for (const i of spots) {
        const c = i % 5;
        const pair = [cells[i].n, cols[c][spare[c]++]].sort((x, y) => x - y);
        cells[i] = { kind: 'box', a: pair[0], b: pair[1], truth: pick(pair), marked: false };
      }
    }
    return cells;
  }

  const LINES = (() => {
    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(range(0, 4).map(j => i * 5 + j));
      lines.push(range(0, 4).map(j => j * 5 + i));
    }
    lines.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
    return lines;
  })();

  const hasBingo = isMarked => LINES.some(line => line.every(isMarked));

  // ---------- Probability ----------
  // Chance a cell is daubable if ball x comes next, using only public info
  // (the player's own daubs + already-revealed answers), so it never leaks a riddle.
  function cellChance(cell, x, revealed) {
    if (cell.marked) return 1;
    if (cell.kind === 'num') return cell.n === x ? 1 : 0;
    if (cell.kind === 'box') return [cell.a, cell.b].filter(v => v === x || revealed.has(v)).length / 2;
    return 0;
  }

  function nextBallOdds() {
    const remaining = round.deck;
    if (!remaining.length) return 0;
    const revealed = new Set(round.calledOrder.slice(0, -1));
    let expected = 0;
    for (const x of remaining) {
      let best = 0;
      for (const line of LINES) {
        let p = 1;
        for (const i of line) { p *= cellChance(round.card[i], x, revealed); if (!p) break; }
        best = Math.max(best, p);
      }
      expected += best;
    }
    return expected / remaining.length;
  }

  // ---------- Benny ----------
  let moodTimer = null;
  function say(text, mood = 'happy') {
    $('bubble').textContent = text;
    $('benny-mouth').setAttribute('d', MOUTHS[mood === 'excited' || mood === 'pounce' ? 'wow' : mood] || MOUTHS.happy);
    const wideEyes = mood === 'excited' || mood === 'pounce';
    for (const id of ['benny-pupil-l', 'benny-pupil-r']) {
      $(id).setAttribute('rx', wideEyes ? 4.5 : 1.8);
      $(id).setAttribute('ry', wideEyes ? 5 : 5.5);
    }
    const benny = $('benny');
    benny.classList.remove('excited', 'sad', 'pounce');
    void benny.offsetWidth; // restart animation
    if (mood === 'excited' || mood === 'sad' || mood === 'pounce') benny.classList.add(mood);
    clearTimeout(moodTimer);
    moodTimer = setTimeout(() => benny.classList.remove('excited', 'pounce'), 1800);
  }

  const CHATTER = [
    'Purr… think it through.',
    'Probability is just counting with confidence.',
    'Those rivals look nervous…',
    'Is the cat in the box? Only one way to find out.',
    'Benny believes in you!',
  ];

  // ---------- UI ----------
  function show(screen) {
    for (const id of ['screen-menu', 'screen-game', 'screen-result']) {
      $(id).classList.toggle('hidden', id !== screen);
    }
  }

  function renderCoins() {
    $('coins').textContent = `🪙 ${save.coins}`;
    $('stats').textContent = save.played ? `Games: ${save.played} · Wins: ${save.wins}` : '';
  }

  // How a called number relates to the player's card:
  // 'off' (not on it), 'hit' (daubed), 'missed' (on it, not daubed), 'maybe' (in a sealed box).
  function ballStatus(m) {
    const cell = round.card.find(c => (c.kind === 'num' && c.n === m) || (c.kind === 'box' && (c.a === m || c.b === m)));
    if (!cell) return 'off';
    if (cell.kind === 'box') return 'maybe';
    return cell.marked ? 'hit' : 'missed';
  }

  function ballEl(n) {
    const el = document.createElement('div');
    el.className = `ball ${ballStatus(n)}`;
    el.dataset.col = colOf(n);
    el.textContent = `${colOf(n)}${n}`;
    return el;
  }

  let cellEls = [];

  function buildCard() {
    const card = $('card');
    card.innerHTML = '';
    for (const letter of COLS) {
      const h = document.createElement('div');
      h.className = 'head';
      h.textContent = letter;
      card.appendChild(h);
    }
    cellEls = round.card.map((_, i) => {
      const el = document.createElement('button');
      el.addEventListener('click', () => tap(i));
      card.appendChild(el);
      return el;
    });
    round.card.forEach((_, i) => renderCell(i));
  }

  function renderCell(i, stamp) {
    const c = round.card[i];
    const el = cellEls[i];
    el.className = 'cell';
    el.classList.toggle('marked', c.marked);
    if (stamp) el.classList.add('pawed');

    if (c.kind === 'free') {
      el.classList.add('free');
      el.textContent = 'FREE';
    } else if (c.kind === 'box') {
      el.classList.add('box');
      const revealed = new Set(round.calledOrder.slice(0, -1));
      const hits = [c.a, c.b].filter(v => revealed.has(v)).length;
      el.innerHTML = `<span class="box-nums">${c.a}<i>or</i>${c.b}</span>`
        + (hits ? `<span class="chance">${hits * 50}%</span>` : '');
      el.setAttribute('aria-label', `Schrödinger box: ${c.a} or ${c.b}`);
    } else if (c.kind === 'empty') {
      el.classList.add('empty');
      el.textContent = '∅';
      el.setAttribute('aria-label', 'Empty box');
    } else {
      el.textContent = c.n;
      el.removeAttribute('aria-label');
    }
  }

  function renderBoxes() {
    round.card.forEach((c, i) => { if (c.kind === 'box') renderCell(i); });
  }

  function renderCall() {
    const n = round.calledOrder[round.calledOrder.length - 1];
    const current = $('current-ball');
    current.dataset.col = colOf(n);
    current.textContent = round.boostLeft > 0 ? `${colOf(n)}${n}` : `${colOf(n)}?`;
    current.classList.remove('pop');
    void current.offsetWidth;
    current.classList.add('pop');

    const clue = $('clue');
    clue.textContent = round.clue;
    if (round.boostLeft > 0) {
      const ans = document.createElement('span');
      ans.className = 'answer';
      ans.textContent = ` = ${n} 🐾`;
      clue.appendChild(ans);
    }

    $('balls-called').textContent = `${round.calledOrder.length} / 75`;
    renderAnswers();
  }

  // Everything about revealed answers: history colours, last-answer feedback, easy-mode hint.
  function renderAnswers() {
    const history = $('history');
    history.innerHTML = '';
    round.calledOrder.slice(-6, -1).reverse().forEach(m => history.appendChild(ballEl(m)));

    const feedback = $('feedback');
    const last = round.calledOrder[round.calledOrder.length - 2];
    if (last === undefined) {
      feedback.className = 'feedback hidden';
    } else {
      const status = ballStatus(last);
      const name = `${colOf(last)}${last}`;
      feedback.className = `feedback ${status}`;
      feedback.textContent = {
        off: `Last answer: ${name}. Not on your card.`,
        hit: `Last answer: ${name}. On your card ✓`,
        missed: `Last answer: ${name}. It's on your card! Daub it now.`,
        maybe: `Last answer: ${name}. It's one of the numbers in a Schrödinger box!`,
      }[status];
    }

    const hint = $('hint');
    hint.classList.toggle('hidden', !mode.hint);
    if (mode.hint) {
      const status = ballStatus(round.calledOrder[round.calledOrder.length - 1]);
      hint.className = `hint ${status}`;
      hint.textContent = {
        off: "Not on your card. Relax until the next one.",
        hit: '✓ Daubed!',
        missed: "🐾 It's on your card! Find it.",
        maybe: '🐾 It might be in a box!',
      }[status];
    }
  }

  function renderOdds() {
    $('odds').classList.toggle('hidden', !mode.odds);
    if (!mode.odds) return;
    const p = nextBallOdds();
    $('odds').textContent = `🎲 Chance the next ball gives you BINGO: ${(p * 100).toFixed(1)}%`
      + ` (${(p * round.deck.length).toFixed(1)} of ${round.deck.length} balls)`;
  }

  function restartTimerBar() {
    const bar = $('timer-bar');
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.animation = `drain ${mode.callMs}ms linear forwards`;
  }

  function refreshBingoButton() {
    const ready = hasBingo(i => round.card[i].marked);
    const btn = $('btn-bingo');
    if (ready && btn.disabled) say('You have a line! Hit BINGO!', 'excited');
    btn.disabled = !ready;
  }

  // ---------- Round ----------
  let round = null;

  function startRound() {
    round = {
      card: makeCard(true),
      deck: shuffle(range(1, 75)),
      called: new Set(),
      calledOrder: [],
      clue: '',
      rivals: Array.from({ length: RIVALS }, () => ({
        nums: makeCard(false).map(c => c.n ?? 0),
        marked: new Set([FREE]),
        bingoAt: null,
        reaction: mode.rivalDelay + randInt(3),
      })),
      timer: null,
      over: false,
      frozenUntil: 0,
      boostLeft: 0,
      boostUsed: false,
      luckyBoxes: 0,
      reward: 0,
      doubled: false,
    };

    buildCard();
    $('history').innerHTML = '';
    $('rivals').textContent = `${RIVALS} rivals playing`;
    $('btn-bingo').disabled = true;
    $('btn-boost').disabled = false;

    show('screen-game');
    say(mode.boxes
      ? 'Genius mode! Solve each riddle, then daub the answer. Mind the boxes!'
      : "Solve each sum, then daub the answer. I'll tell you if it's on your card!");
    callNext();
    resume();
  }

  function pause() {
    if (!round) return;
    clearInterval(round.timer);
    $('timer-bar').style.animationPlayState = 'paused';
  }

  function resume() {
    if (!round || round.over) return;
    clearInterval(round.timer);
    round.timer = setInterval(callNext, mode.callMs);
    restartTimerBar();
  }

  function callNext() {
    if (round.over) return;
    if (!round.deck.length) return endRound(false, 'All 75 balls are out. Nobody called it!');

    const n = round.deck.pop();
    round.called.add(n);
    round.calledOrder.push(n);
    round.clue = riddleFor(n);
    restartTimerBar();

    if (round.boostLeft > 0) {
      const i = round.card.findIndex(c => c.kind === 'num' && c.n === n);
      if (i >= 0) { round.card[i].marked = true; renderCell(i, true); }
    }
    renderCall();
    if (round.boostLeft > 0) round.boostLeft -= 1;

    for (const rival of round.rivals) {
      const i = rival.nums.indexOf(n);
      if (i >= 0) rival.marked.add(i);
      if (rival.bingoAt === null && hasBingo(j => rival.marked.has(j))) {
        rival.bingoAt = round.calledOrder.length + rival.reaction;
      }
    }

    const close = round.rivals.filter(r => r.bingoAt !== null).length;
    $('rivals').textContent = close ? `⚠️ ${close} rival${close > 1 ? 's' : ''} close!` : `${RIVALS} rivals playing`;

    if (round.rivals.some(r => r.bingoAt !== null && round.calledOrder.length >= r.bingoAt)) {
      return endRound(false, 'A rival called BINGO first!');
    }

    renderBoxes();
    renderOdds();
    refreshBingoButton();
    if (round.calledOrder.length % 7 === 0) say(pick(CHATTER));
  }

  function shake(i) {
    const el = cellEls[i];
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function freeze() {
    round.frozenUntil = Date.now() + mode.freezeMs;
    $('card').classList.add('frozen');
    setTimeout(() => $('card').classList.remove('frozen'), mode.freezeMs);
  }

  function tap(i) {
    if (round.over) return;
    const c = round.card[i];
    if (c.marked || c.kind === 'empty') return;
    if (Date.now() < round.frozenUntil) { say('Hold on… still grooming.', 'sad'); return; }
    if (c.kind === 'box') return openBox(i);

    if (round.called.has(c.n)) {
      c.marked = true;
      renderCell(i, true);
      renderAnswers();
      renderOdds();
      refreshBingoButton();
    } else {
      shake(i);
      freeze();
      say(`Hiss! ${c.n} hasn't been called.`, 'sad');
    }
  }

  function openBox(i) {
    const c = round.card[i];
    const aCalled = round.called.has(c.a), bCalled = round.called.has(c.b);
    if (!aCalled && !bCalled) {
      shake(i);
      say(`Sealed! Wait until ${c.a} or ${c.b} is called.`);
      return;
    }
    if (round.called.has(c.truth)) {
      round.card[i] = { kind: 'num', n: c.truth, marked: true };
      renderCell(i, true);
      if (aCalled && bCalled) {
        say('Both numbers called: a 100% safe open!', 'happy');
      } else {
        round.luckyBoxes += 1;
        say(`Alive! The 50/50 paid off: it was ${c.truth}. +${LUCKY_BOX_BONUS} if you win!`, 'excited');
      }
    } else {
      round.card[i] = { kind: 'empty', truth: c.truth, marked: false };
      renderCell(i);
      say(`Empty box… it was ${c.truth} all along. That's probability!`, 'sad');
    }
    renderAnswers();
    renderOdds();
    refreshBingoButton();
  }

  function endRound(won, message) {
    round.over = true;
    pause();
    save.played += 1;

    const title = $('result-title');
    const double = $('btn-double');
    if (won) {
      save.wins += 1;
      const speed = Math.max(0, 60 - round.calledOrder.length) * 5;
      const boxes = round.luckyBoxes * LUCKY_BOX_BONUS;
      round.reward = (BASE_REWARD + speed + boxes) * mode.rewardMult;
      save.coins += round.reward;
      title.textContent = 'BINGO! 🎉';
      $('result-text').textContent = `Won in ${round.calledOrder.length} balls. +${round.reward} coins`
        + (boxes ? ` (incl. lucky boxes)` : '')
        + (mode.rewardMult > 1 ? ` (${mode.label} pays ×${mode.rewardMult})` : '');
      double.classList.remove('hidden');
      double.disabled = false;
      say('MEOW! That was purr-fect!', 'excited');
    } else {
      title.textContent = 'So close!';
      $('result-text').textContent = message;
      double.classList.add('hidden');
      say("Mrrow. We'll get 'em next time!", 'sad');
    }

    const last = round.calledOrder[round.calledOrder.length - 1];
    $('result-answer').textContent = last === undefined ? ''
      : `Last riddle: "${round.clue}" = ${colOf(last)}${last}`
        + (ballStatus(last) === 'off' ? ' (not on your card)' : '');
    $('result-mode').textContent = `${mode.label} mode`;

    persist();
    renderCoins();
    show('screen-result');
  }

  // ---------- Ad hooks ----------
  async function boost() {
    if (round.over || round.boostUsed) return;
    pause();
    const watched = await Ads.showRewarded();
    if (watched && !round.over) {
      round.boostUsed = true;
      $('btn-boost').disabled = true;
      // Benny peeks in every box (and uses one of his nine lives on empty ones),
      // paws every called number, then solves the next riddles for you.
      round.card.forEach((c, i) => {
        if (c.kind === 'box' || c.kind === 'empty') round.card[i] = { kind: 'num', n: c.truth, marked: false };
        const cell = round.card[i];
        const stamp = cell.kind === 'num' && !cell.marked && round.called.has(cell.n);
        if (stamp) cell.marked = true;
        renderCell(i, stamp);
      });
      round.boostLeft = BOOST_BALLS;
      renderCall(); // reveals the current riddle's answer too
      say(mode.boxes
        ? `BENNY BOOST! I peeked in every box and I'll solve the next ${BOOST_BALLS} riddles!`
        : `BENNY BOOST! I pawed your numbers and I'll solve the next ${BOOST_BALLS} sums!`, 'pounce');
      renderOdds();
      refreshBingoButton();
    }
    resume();
  }

  async function doubleCoins() {
    if (round.doubled) return;
    const watched = await Ads.showRewarded();
    if (!watched) return;
    round.doubled = true;
    save.coins += round.reward;
    persist();
    renderCoins();
    $('btn-double').disabled = true;
    $('result-text').textContent += ` → doubled to ${round.reward * 2}!`;
    say('Double coins! Cha-ching!', 'excited');
  }

  let starting = false;
  async function playAgain() {
    if (starting) return;
    starting = true;
    await Ads.maybeInterstitial();
    starting = false;
    startRound();
  }

  function selectMode(key) {
    mode = MODES[key];
    save.mode = key;
    persist();
    document.querySelectorAll('.mode-picker button').forEach(b => {
      const active = b.dataset.mode === key;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active);
    });
    document.querySelectorAll('.howto').forEach(ul => ul.classList.toggle('hidden', ul.dataset.mode !== key));
  }

  // ---------- Wiring ----------
  document.querySelectorAll('.mode-picker button').forEach(b => b.addEventListener('click', () => {
    selectMode(b.dataset.mode);
    say(b.dataset.mode === 'easy'
      ? "Easy mode: simple sums, and I'll tell you when the answer is on your card."
      : 'Genius mode: tough riddles, Schrödinger boxes and live odds. Double coins!', 'excited');
  }));
  $('btn-menu').addEventListener('click', () => { show('screen-menu'); say('Pick a mode, then hit Play!'); });
  $('btn-play').addEventListener('click', startRound);
  $('btn-again').addEventListener('click', playAgain);
  $('btn-bingo').addEventListener('click', () => {
    if (!round.over && hasBingo(i => round.card[i].marked)) endRound(true);
  });
  $('btn-boost').addEventListener('click', boost);
  $('btn-double').addEventListener('click', doubleCoins);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else if ($('ad-overlay').classList.contains('hidden')) resume();
  });

  Ads.init();
  selectMode(save.mode);
  renderCoins();
})();
