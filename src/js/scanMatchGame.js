/**
 * Visual Scan Trainer — Spot It!-inspired matching game for therapy.
 *
 * Deck uses finite projective plane of order 7 (57 cards, 8 symbols each).
 * Only round number syncs over Firebase — all card data is generated client-side.
 * QR code encodes ?join=PIN for one-tap pairing.
 */

import { getDatabase, ref, set, get, onValue, update, serverTimestamp, onDisconnect } from "firebase/database";
import QRCode from 'qrcode';
import { setupToggleSwitch } from './utils/utils.js';
import { SeededRNG, computeCardLayout, paintCard } from './scanMatchLayout.js';

// Match reveal: how long the correct emoji stays highlighted before advancing
const REVEAL_MS = 700;

// Room PIN range (4 digits — ample keyspace for clinic scale; collisions
// self-heal via the createRoom retry; change these constants to scale later)
const PIN_MIN = 1000;
const PIN_MAX = 9999;

// Desktop card-size stepper: smallest centered app column + step size (px)
const APP_MIN_W = 420;
const APP_STEP_PX = 120;

// ── 91 Emoji Symbols (supports N=6,8,10 projective planes) ────────────
const EMOJI = [
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼',
  '🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔',
  '🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉',
  '🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐌',
  '🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎',
  '🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡',
  '🐠','🐟','🐬','🐳','🐋','🐊','🐆','🐅',
  '🦓',
  // ── +34 for N=9/10 support ──────────────────────
  '🦙','🦛','🦘','🦡','🦨','🦦','🦥','🦔',
  '🐿','🦃','🦏','🦍','🦚','🦢','🐏','🐒',
  '🐄','🐃','🐂','🐐','🦈','🐘','🐓','🦝',
  '🐁','🦧','🐕','🦣','🐀','🐩','🦭','🐖',
  '🐇','🐎'
];

// ── Finite field GF(q) — needed for prime-power q (4, 8, 9) ────────────
// A projective plane of order q exists iff q is a prime power.
// q = 6 (N = 7 symbols/card) is therefore impossible (Euler's 36 officers).
// Prime q uses plain modular arithmetic; prime-power q uses polynomials
// over GF(p) reduced modulo an irreducible polynomial.
function makeField(q) {
  if ([2, 3, 5, 7].includes(q)) {
    return { add: (a, b) => (a + b) % q, mul: (a, b) => (a * b) % q };
  }
  const PARAMS = {
    4: { p: 2, k: 2, mod: [1, 1, 1] },     // x²+x+1 over GF(2)
    8: { p: 2, k: 3, mod: [1, 1, 0, 1] },  // x³+x+1 over GF(2)
    9: { p: 3, k: 2, mod: [1, 0, 1] },     // x²+1  over GF(3)
  }[q];
  if (!PARAMS) throw new Error(`No field of size ${q} (N-1 must be 2,3,4,5,7,8,9)`);
  const { p, k, mod } = PARAMS; // mod ascending, monic (mod[k] === 1)

  const toPoly = (a) => {
    const c = [];
    for (let i = 0; i < k; i++) { c.push(a % p); a = Math.floor(a / p); }
    return c; // c[0] + c[1]x + ... + c[k-1]x^(k-1)
  };
  const fromPoly = (c) => c.reduce((acc, v, i) => acc + v * Math.pow(p, i), 0);
  const polyMulMod = (a, b) => {
    const A = toPoly(a), B = toPoly(b);
    const R = Array(2 * k - 1).fill(0);
    for (let i = 0; i < k; i++)
      for (let j = 0; j < k; j++) R[i + j] = (R[i + j] + A[i] * B[j]) % p;
    for (let d = 2 * k - 2; d >= k; d--) {
      if (R[d] === 0) continue;
      const f = R[d];
      for (let j = 0; j <= k; j++)
        R[d - k + j] = (((R[d - k + j] - f * mod[j]) % p) + p) % p;
    }
    return fromPoly(R.slice(0, k));
  };
  const addT = [], mulT = [];
  for (let a = 0; a < q; a++) {
    const A = toPoly(a);
    for (let b = 0; b < q; b++) {
      const B = toPoly(b);
      addT.push(fromPoly(A.map((v, i) => (v + B[i]) % p)));
      mulT.push(polyMulMod(a, b));
    }
  }
  return { add: (a, b) => addT[a * q + b], mul: (a, b) => mulT[a * q + b] };
}

// ── Deck Generation (Projective Plane over GF(q), q = N-1) ─────────────
// Returns N²−N+1 cards of N symbols each; every pair shares exactly one.
export function generateBaseDeck(N) {
  const q = N - 1;
  const F = makeField(q);
  const pt = (x, y) => N + y * q + x; // point symbol; indices 0..N-1 = points at infinity
  const cards = [];

  cards.push(Array.from({ length: N }, (_, i) => i)); // line at infinity

  // Slope-∞ lines (x = c): infinity index 0
  for (let c = 0; c < q; c++) {
    const card = [0];
    for (let y = 0; y < q; y++) card.push(pt(c, y));
    cards.push(card);
  }
  // Slopes s ∈ F (infinity indices 1..N-1): lines y = s·x + d
  for (let sIdx = 1; sIdx < N; sIdx++) {
    const s = sIdx - 1;
    for (let d = 0; d < q; d++) {
      const card = [sIdx];
      for (let x = 0; x < q; x++) card.push(pt(x, F.add(F.mul(s, x), d)));
      cards.push(card);
    }
  }
  return cards;
}

// ── Game Engine ─────────────────────────────────────────────────────────
export class ScanMatchGame {
  constructor(firebaseApp) {
    this.app = firebaseApp;
    this.db = getDatabase(firebaseApp);
    this.pin = null;
    this.role = null;       // 'host' | 'guest'
    this.local = false;      // one-device mode: no Firebase anywhere
    this.sessionSeed = null; // layout seed for local games (pin-seeded otherwise)
    this.round = 0;
    this.roundTimes = [];   // per-round find times (ms), synced via room data
    this.deck = [];         // 57 cards, shuffled
    this.emojiMap = [];     // symbol index → emoji string
    this.state = 'idle';    // 'idle' | 'waiting' | 'playing' | 'finished'
    this.unsub = null;      // Firebase onValue unsubscribe
    this.mode = 'count';    // 'count' | 'timed'
    this.timerDuration = 60;
    this.startedAt = null;  // server timestamp (remote) | Date.now() (local)
    this.timerInterval = null;
    this.maxRounds = 25;
    this.symbolsPerCard = 8;
  }

  // ── Room Management ─────────────────────────────────────────────────

  /** Create a room. Returns the PIN string. */
  async createRoom(mode = 'count', timerDuration = 60, maxRounds = 25, symbolsPerCard = 8) {
    this.mode = mode;
    this.timerDuration = timerDuration;
    this.maxRounds = maxRounds;
    this.symbolsPerCard = symbolsPerCard;

    const rng = new SeededRNG(Date.now());
    this.pin = String(PIN_MIN + Math.floor(rng.next() * (PIN_MAX - PIN_MIN + 1)));
    this.role = 'host';

    const roomRef = ref(this.db, `scanMatchSessions/${this.pin}`);
    const existing = await get(roomRef);
    if (existing.exists()) return this.createRoom(mode, timerDuration, maxRounds, symbolsPerCard);

    await set(roomRef, {
      status: 'waiting',
      round: 0,
      mode,
      timerDuration,
      maxRounds: this.maxRounds,
      symbolsPerCard: this.symbolsPerCard,
      createdAt: serverTimestamp()
    });

    // Auto-cleanup: delete room when host disconnects
    onDisconnect(roomRef).remove();

    this.state = 'waiting';
    this._listen();
    this._initDeck(this.pin, this.symbolsPerCard);
    return this.pin;
  }

  /** Join an existing room by PIN. */
  async joinRoom(pin) {
    this.pin = pin;
    this.role = 'guest';

    const roomRef = ref(this.db, `scanMatchSessions/${pin}`);
    const snap = await get(roomRef);
    if (!snap.exists()) throw new Error('Room not found. Check the PIN.');

    const data = snap.val();
    if (data.status !== 'waiting') throw new Error('Room is not available.');

    await update(roomRef, {
      status: 'playing',
      startedAt: serverTimestamp()
    });

    this.mode = data.mode || 'count';
    this.timerDuration = data.timerDuration !== undefined ? data.timerDuration : 60;
    this.maxRounds = data.maxRounds !== undefined ? data.maxRounds : 25;
    this.symbolsPerCard = data.symbolsPerCard || 8;
    this.state = 'playing';
    this.round = data.round || 0;

    // Guest also cleans up on disconnect
    onDisconnect(roomRef).remove();

    this._listen();
    this._initDeck(pin, this.symbolsPerCard);
    return data;
  }

  /** Leave / clean up the room. */
  async leaveRoom() {
    this.stopTimer();
    if (this.unsub) { this.unsub(); this.unsub = null; }
    if (this.local) {
      this.local = false;
      this.sessionSeed = null;
      this.state = 'idle';
      return;
    }
    if (this.pin && this.role === 'host') {
      try { await set(ref(this.db, `scanMatchSessions/${this.pin}`), null); }
      catch (e) { /* ignore */ }
    }
    this.state = 'idle';
  }

  /** Start a one-device game (two players, one screen) — no Firebase. */
  startLocalGame(mode = 'count', timerDuration = 60, maxRounds = 25, symbolsPerCard = 8) {
    this.local = true;
    this.pin = null;
    this.role = 'host';
    this.mode = mode;
    this.timerDuration = timerDuration;
    this.maxRounds = maxRounds;
    this.symbolsPerCard = symbolsPerCard;
    this.round = 0;
    this.roundTimes = [];
    this.sessionSeed = Date.now() | 0;
    this.startedAt = Date.now();
    this.state = 'playing';
    this._initDeck(String(this.sessionSeed), symbolsPerCard);
    if (this.mode === 'timed') this.startTimer();
    this._notify('gameStarted');
  }

  /** Advance the round by 1. findTimeMs (optional) is recorded for stats. */
  async advanceRound(findTimeMs = null) {
    if (this.state !== 'playing') return;
    const nextRound = this.round + 1;
    const nextTimes = (findTimeMs != null && findTimeMs >= 0)
      ? [...this.roundTimes, Math.round(findTimeMs)]
      : this.roundTimes;
    if (this.local) {
      this.round = nextRound;
      this.roundTimes = nextTimes;
      if (nextRound >= this.maxRounds) {
        this.state = 'finished';
        this.stopTimer();
        this._notify('gameFinished');
      } else {
        this._notify('roundChanged', nextRound);
      }
      return;
    }
    if (nextRound >= this.maxRounds) {
      await update(ref(this.db, `scanMatchSessions/${this.pin}`), {
        round: nextRound,
        roundTimes: nextTimes,
        status: 'finished'
      });
      return;
    }
    await update(ref(this.db, `scanMatchSessions/${this.pin}`), {
      round: nextRound,
      roundTimes: nextTimes
    });
  }

  /** Undo: rewind one round (floored at 0) and trim its recorded time.
   * Remote: syncs both devices via the room data. */
  async revertRound() {
    if (this.state !== 'playing' || this.round <= 0) return;
    const prevRound = this.round - 1;
    const prevTimes = this.roundTimes.slice(0, prevRound);
    if (this.local) {
      this.round = prevRound;
      this.roundTimes = prevTimes;
      this._notify('roundChanged', prevRound);
      return;
    }
    await update(ref(this.db, `scanMatchSessions/${this.pin}`), {
      round: prevRound,
      roundTimes: prevTimes
    });
  }

  // ── Timer ───────────────────────────────────────────────────────────

  startTimer() {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => {
      if (this.state !== 'playing') { this.stopTimer(); return; }
      const remaining = this.getRemainingTime();
      this._notify('tick', Math.max(0, Math.ceil(remaining)));
      if (remaining <= 0) {
        this.stopTimer();
        this.state = 'finished';
        if (!this.local) {
          update(ref(this.db, `scanMatchSessions/${this.pin}`), {
            status: 'finished',
            round: this.round
          });
        }
        this._notify('gameFinished');
      }
    }, 200);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getRemainingTime() {
    if (!this.startedAt) return this.timerDuration;
    const elapsed = (Date.now() - this.startedAt) / 1000;
    return Math.max(0, this.timerDuration - elapsed);
  }

  getElapsedTime() {
    if (!this.startedAt) return 0;
    return Math.round((Date.now() - this.startedAt) / 1000);
  }

  // ── Card Data ────────────────────────────────────────────────────────

  /** Find the common symbol index between the two current cards. */
  getMatchSymbolIndex() {
    if (this.deck.length === 0) return -1;
    const idx = this.round * 2;
    const left = this.deck[idx % this.deck.length];
    const right = this.deck[(idx + 1) % this.deck.length];
    const rightSet = new Set(right);
    return left.find(i => rightSet.has(i)) ?? -1;
  }

  /** Get the two cards for the current round: [leftCard, rightCard] (emoji strings). */
  getCurrentPair() {
    if (this.deck.length === 0) return [[], []];
    const idx = this.round * 2;
    const left = this.deck[idx % this.deck.length];
    const right = this.deck[(idx + 1) % this.deck.length];
    return [
      left.map(i => this.emojiMap[i]),
      right.map(i => this.emojiMap[i])
    ];
  }

  /** Get emojis for this device's card. */
  getMyCard() {
    if (this.deck.length === 0) return [];
    const idx = this.round * 2 + (this.role === 'guest' ? 1 : 0);
    const card = this.deck[idx % this.deck.length];
    return card.map(i => this.emojiMap[i]);
  }

  /** Get emojis for the partner's card. */
  getPartnerCard() {
    if (this.deck.length === 0) return [];
    const idx = this.round * 2 + (this.role === 'guest' ? 0 : 1);
    const card = this.deck[idx % this.deck.length];
    return card.map(i => this.emojiMap[i]);
  }

  // ── Internal ─────────────────────────────────────────────────────────

  /** Initialize deck from PIN seed and difficulty level. */
  _initDeck(pin, symbolsPerCard = 8) {
    const N = symbolsPerCard;
    const seed = parseInt(pin, 10);
    const rng = new SeededRNG(seed);
    const baseDeck = generateBaseDeck(N);
    const cardCount = baseDeck.length; // N*(N-1)+1

    // Shuffle symbol → emoji mapping (use only as many emoji as cards)
    const indices = Array.from({ length: Math.min(EMOJI.length, cardCount) }, (_, i) => i);
    rng.shuffle(indices);
    this.emojiMap = indices.map(i => EMOJI[i]);

    // Shuffle card order
    this.deck = rng.shuffle([...baseDeck]);

    // NOTE: sizes + positions are computed at paint time from the measured
    // screen box (see ScanMatchUI._layoutCard) — per-device optimal, no
    // cross-device sync needed (only symbol sets are game state).
  }

  /** Listen for Firebase room changes. */
  _listen() {
    if (this.unsub) return;
    const roomRef = ref(this.db, `scanMatchSessions/${this.pin}`);
    this.unsub = onValue(roomRef, (snap) => {
      if (!snap.exists()) {
        this.stopTimer();
        this.state = 'idle';
        this._notify('roomDeleted');
        return;
      }
      const data = snap.val();

      // Capture server timestamp for timer (only when it becomes available)
      if (data.startedAt && !this.startedAt) {
        this.startedAt = data.startedAt;
        if (this.mode === 'timed') this.startTimer();
      }

      this.round = data.round || 0;
      // Combined per-round find times — identical on both devices
      this.roundTimes = Array.isArray(data.roundTimes)
        ? data.roundTimes
        : (data.roundTimes ? Object.values(data.roundTimes) : []);

      if (data.status === 'playing' && this.state === 'waiting') {
        this.state = 'playing';
        this._notify('gameStarted');
      }

      if (data.status === 'finished') {
        this.state = 'finished';
        this.stopTimer();
        this._notify('gameFinished');
        return;
      }

      this._notify('roundChanged', this.round);
    });
  }

  /** Simple pub-sub for UI updates. */
  _listeners = {};
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
  _notify(event, ...args) {
    (this._listeners[event] || []).forEach(fn => fn(...args));
  }
}

// ── UI Controller ────────────────────────────────────────────────────────
export class ScanMatchUI {
  constructor(game) {
    this.game = game;
    this._tapping = false;  // debounce flag for card taps
  }

  initialize() {
    this._cache();
    this._bindEvents();
    this._listenGame();

    // Restore theme + desktop layout preference from localStorage
    this._restoreTheme();
    this._restoreLayout();

    // Show initial difficulty preview
    this._updateDiffPreview();

    // Auto-join from QR code scan (?join=PIN)
    const params = new URLSearchParams(window.location.search);
    const joinPin = params.get('join');
    if (joinPin && joinPin.length >= 4) {
      this.pinInput.value = joinPin;
      this._hideLobbyControls();
      this._setLobbyStatus('Auto-joining…');
      setTimeout(() => this._onJoin(), 300);
    } else {
      this._showScreen('lobby');
    }
  }

  _cache() {
    this.screens = {
      lobby: document.getElementById('lobbyScreen'),
      game: document.getElementById('gameScreen'),
      results: document.getElementById('resultsScreen'),
    };

    // Lobby
    this.pinInput = document.getElementById('pinInput');
    this.joinBtn = document.getElementById('joinBtn');
    this.createBtn = document.getElementById('createBtn');
    this.modeBtns = document.querySelectorAll('.mode-btn');
    this.diffBtns = document.querySelectorAll('[data-n]');
    this.diffPreview = document.getElementById('diffPreview');
    this.countOptions = document.getElementById('countOptions');
    this.countBtns = document.querySelectorAll('.count-btn');
    this.countCustomInput = document.getElementById('countCustomInput');
    this.timerOptions = document.getElementById('timerOptions');
    this.timerBtns = document.querySelectorAll('.timer-btn');
    this.timerCustomInput = document.getElementById('timerCustomInput');
    this.hostArea = document.getElementById('hostArea');
    this.pinDisplay = document.getElementById('pinDisplay');
    this.qrContainer = document.getElementById('qrContainer');
    this.waitingMsg = document.getElementById('waitingMsg');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.lobbyStatus = document.getElementById('lobbyStatus');
    this.playersBtns = document.querySelectorAll('.players-btn');
    this.startLocalBtn = document.getElementById('startLocalBtn');
    this.selectedMode = 'count';
    this.selectedDiff = 8;
    this.selectedCount = 25;
    this.selectedTimer = 120;
    this.selectedPlayers = '2';

    // Theme toggle
    this.themeToggle = document.getElementById('themeToggleInput');

    // Desktop card-size stepper
    this.sizeStep = document.getElementById('sizeStep');
    this.sizeMinus = document.getElementById('sizeMinus');
    this.sizePlus = document.getElementById('sizePlus');
    this.sizeRange = document.getElementById('sizeRange');

    // Game
    this.countNumber = document.getElementById('countNumber');
    this.countMax = document.getElementById('countMax');
    this.countFill = document.getElementById('countFill');
    this.timerDisplay = document.getElementById('timerDisplay');
    this.timerValue = document.getElementById('timerValue');
    this.timerBarFill = document.getElementById('timerBarFill');
    this.cardArea = document.getElementById('cardArea');
    this.myCard = document.getElementById('myCard');
    this.cardB = document.getElementById('cardB');
    this.endBtn = document.getElementById('endBtn');
    this.undoBtn = document.getElementById('undoBtn');
    this.gameStatus = document.getElementById('gameStatus');

    // Results
    this.resultRounds = document.getElementById('resultRounds');
    this.resultTotal = document.getElementById('resultTotal');
    this.resultAvg = document.getElementById('resultAvg');
    this.resultBest = document.getElementById('resultBest');
    this.resultRate = document.getElementById('resultRate');
    this.roundChart = document.getElementById('roundChart');
    this.newBtn = document.getElementById('newBtn');

    // Per-round timing (paint-ready → tap; excludes reveal + render time)
    this._paintedRound = -1;
    this._readyAt = null;

    // Back / exit
    this.homeBtn = document.getElementById('homeBtn');
    this.exitConfirm = document.getElementById('exitConfirm');
    this.exitYes = document.getElementById('exitYes');
    this.exitNo = document.getElementById('exitNo');
    this._historyPushed = false;
  }

  _bindEvents() {
    // Lobby
    this.pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._onJoin();
    });
    this.joinBtn.addEventListener('click', () => this._onJoin());
    this.createBtn.addEventListener('click', () => this._onCreate());
    this.cancelBtn.addEventListener('click', () => this._reset());

    // Mode toggles
    this.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedMode = btn.dataset.mode;
        this.countOptions.style.display = this.selectedMode === 'count' ? 'flex' : 'none';
        this.timerOptions.style.display = this.selectedMode === 'timed' ? 'flex' : 'none';
      });
    });

    // Difficulty toggles (Easy/Medium/Hard → symbols per card)
    this.diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedDiff = parseInt(btn.dataset.n, 10);
        this._updateDiffPreview();
      });
    });

    // Count target toggles
    this.countBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.countBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.target === 'custom') {
          this.countCustomInput.style.display = '';
          this.countCustomInput.focus();
          this.selectedCount = parseInt(this.countCustomInput.value, 10) || 25;
        } else {
          this.countCustomInput.style.display = 'none';
          this.selectedCount = parseInt(btn.dataset.target, 10);
        }
      });
    });
    this.countCustomInput.addEventListener('input', () => {
      this.selectedCount = parseInt(this.countCustomInput.value, 10) || 25;
    });

    // Timer duration toggles (minutes → seconds)
    this.timerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.timerBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.minutes === 'custom') {
          this.timerCustomInput.style.display = '';
          this.timerCustomInput.focus();
          this.selectedTimer = (parseInt(this.timerCustomInput.value, 10) || 1) * 60;
        } else {
          this.timerCustomInput.style.display = 'none';
          this.selectedTimer = parseInt(btn.dataset.minutes, 10) * 60;
        }
      });
    });
    this.timerCustomInput.addEventListener('input', () => {
      this.selectedTimer = (parseInt(this.timerCustomInput.value, 10) || 1) * 60;
    });

    // Players: 2 devices (pair by PIN/QR) vs 1 device (two players, one screen)
    this.playersBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.playersBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedPlayers = btn.dataset.players;
        this._applyPlayersVisibility();
      });
    });
    this.startLocalBtn.addEventListener('click', () => this._onStartLocal());

    // Game — cards ARE the Found It button (either card in one-device mode)
    this.myCard.addEventListener('click', () => this._onFoundIt());
    this.cardB.addEventListener('click', () => this._onFoundIt());

    this.undoBtn.addEventListener('click', () => this._onUndo());
    this.endBtn.addEventListener('click', () => this._onEnd());

    // Re-layout on resize/rotation (same seed → same arrangement, rescaled)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      // Keep the Players gating in sync with the new viewport size
      this._applyPlayersVisibility();
      // Re-clamp the desktop app width to the new viewport
      const saved = localStorage.getItem('scanMatchWidth');
      if (saved && saved !== 'full') {
        const px = Math.max(APP_MIN_W, Math.min(window.innerWidth,
          parseInt(saved, 10) || APP_MIN_W));
        this._applyAppWidth(this._pxToPct(px), { persist: false, relayout: false });
      }
      if (!this.screens.game.classList.contains('active')) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this._layoutCard(), 150);
    });

    // Results
    this.newBtn.addEventListener('click', () => this._reset());

    // Back arrow — context-aware (lobby→hub, playing→confirm, results→lobby)
    this.homeBtn.addEventListener('click', (e) => this._onHome(e));
    this.exitYes.addEventListener('click', () => this._confirmExit());
    this.exitNo.addEventListener('click', () => this._hideExitConfirm());

    // Browser/swipe-back guard: a live game can't be silently killed
    window.addEventListener('popstate', () => {
      if (this.game.state === 'playing' && this.screens.game.classList.contains('active')) {
        history.pushState({ sm: 'game' }, '');
        this._showExitConfirm();
      }
    });

    // Theme toggle
    setupToggleSwitch(this.themeToggle, (isDark) => {
      document.body.classList.toggle('dark', isDark);
      localStorage.setItem('scanMatchTheme', isDark ? 'dark' : 'light');
    });

    // Desktop card-size stepper — zoom-style − / + with hold-to-repeat
    this._initSizeStepper();
  }

  _listenGame() {
    this.game.on('gameStarted', () => {
      this._showScreen('game');
      this._pushHistoryGuard();
      // Reset timer bar
      if (this.timerBarFill) {
        this.timerBarFill.style.width = '100%';
        this.timerBarFill.style.transition = 'none';
        // Force reflow then re-enable transition for smooth countdown
        void this.timerBarFill.offsetWidth;
        this.timerBarFill.style.transition = '';
      }
      this._renderRound();
    });
    this.game.on('roundChanged', () => {
      this._renderRound();
    });
    this.game.on('gameFinished', () => {
      this._renderResults();
      this._showScreen('results');
    });
    this.game.on('roomDeleted', () => {
      this.game.stopTimer();
      this._setGameStatus('Partner disconnected');
      setTimeout(() => this._reset(), 1500);
    });
    this.game.on('tick', (remaining) => {
      if (this.timerValue) this.timerValue.textContent = `${remaining}s`;
      const pct = this.game.maxRounds > 0 && this.game.timerDuration > 0
        ? (remaining / this.game.timerDuration) * 100 : 100;
      if (this.timerBarFill) this.timerBarFill.style.width = `${pct}%`;
    });
  }

  // ── Theme ──────────────────────────────────────────────────

  _restoreTheme() {
    const saved = localStorage.getItem('scanMatchTheme');
    if (saved === 'dark') {
      document.body.classList.add('dark');
      if (this.themeToggle) this.themeToggle.checked = true;
    }
  }

  _restoreLayout() {
    const saved = localStorage.getItem('scanMatchWidth');
    if (saved === 'full' || saved === null) {
      this._applyAppWidth(100, { persist: false, relayout: false });
    } else {
      const px = Math.max(APP_MIN_W,
        Math.min(window.innerWidth, parseInt(saved, 10) || APP_MIN_W));
      this._applyAppWidth(this._pxToPct(px), { persist: false, relayout: false });
    }
  }

  _pxToPct(px) {
    const range = Math.max(1, window.innerWidth - APP_MIN_W);
    return Math.max(0, Math.min(100, (px - APP_MIN_W) / range * 100));
  }

  _pctToPx(pct) {
    return Math.round(APP_MIN_W + (window.innerWidth - APP_MIN_W) * pct / 100);
  }

  /** Apply app width from percent (100 = full-width). The stepper calls this
   * with defaults (persist + crisp relayout per step); restore and window
   * re-clamp pass { persist: false, relayout: false }. */
  _applyAppWidth(pct, opts = {}) {
    const persist = opts.persist !== false;
    const relayout = opts.relayout !== false;
    pct = Math.max(0, Math.min(100, Number(pct) || 0));
    this._appPct = pct;

    // Keep the slider in sync — this function is the single source of truth
    this.sizeRange.value = String(Math.round(pct));

    // App width — px value, or 100% at the exact top of the range
    const px = Math.round(Math.min(window.innerWidth, this._pctToPx(pct)));
    document.body.style.setProperty('--app-max', pct >= 100 ? '100%' : px + 'px');
    if (persist) {
      localStorage.setItem('scanMatchWidth', pct >= 99.5 ? 'full' : String(px));
    }

    if (relayout && this.screens.game.classList.contains('active')) {
      this._layoutCard();
    }
  }

  _initSizeStepper() {
    this._bindHoldRepeat(this.sizeMinus, -1);
    this._bindHoldRepeat(this.sizePlus, 1);

    // Slider: input = CSS-only tracking while dragging (60fps, no optimizer
    // work); change (release) = persist + one crisp relayout
    this.sizeRange.addEventListener('input', () =>
      this._applyAppWidth(this.sizeRange.value, { persist: false, relayout: false }));
    this.sizeRange.addEventListener('change', () =>
      this._applyAppWidth(this.sizeRange.value));
  }

  /** Zoom-style stepper: click = one ±APP_STEP_PX step; hold = repeat.
   * Pointer path handles mouse/touch; the click handler serves keyboard
   * (Enter/Space) and is suppressed when the pointer already stepped. */
  _bindHoldRepeat(btn, dir) {
    let repeatTimer = null, repeatInterval = null, fromPointer = false;
    const step = () => this._stepAppWidth(dir);
    const stop = () => {
      clearTimeout(repeatTimer);
      clearInterval(repeatInterval);
      repeatTimer = repeatInterval = null;
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fromPointer = true;
      step();
      repeatTimer = setTimeout(() => { repeatInterval = setInterval(step, 120); }, 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('click', () => {
      if (fromPointer) { fromPointer = false; stop(); return; }  // mouse path already handled
      step();                                                    // keyboard Enter/Space
    });
  }

  _stepAppWidth(dir) {
    const curPx = Math.round(this._pctToPx(this._appPct || 0));
    const nextPx = Math.max(APP_MIN_W,
      Math.min(window.innerWidth, curPx + dir * APP_STEP_PX));
    // Round to 10px so stepped widths stay tidy
    this._applyAppWidth(this._pxToPct(Math.round(nextPx / 10) * 10));
  }

  // ── Actions ────────────────────────────────────────────────

  async _onCreate() {
    this._setLobbyStatus('Creating…');
    this.createBtn.disabled = true;
    try {
      let pin;
      if (this.selectedMode === 'count') {
        pin = await this.game.createRoom('count', 0, this.selectedCount, this.selectedDiff);
      } else {
        pin = await this.game.createRoom('timed', this.selectedTimer, 999, this.selectedDiff);
      }
      this._showHostArea(pin);
      this._setLobbyStatus('');
    } catch (err) {
      this._setLobbyStatus('Error: ' + err.message);
      this.createBtn.disabled = false;
    }
  }

  async _onJoin() {
    const pin = this.pinInput.value.trim();
    if (pin.length < 4) {
      this._setLobbyStatus('Enter a valid PIN.');
      return;
    }
    this._setLobbyStatus('Joining…');
    this.joinBtn.disabled = true;
    try {
      await this.game.joinRoom(pin);
      this._showScreen('game');
      this._pushHistoryGuard();
      this._renderRound();
    } catch (err) {
      this._setLobbyStatus(err.message);
      this.joinBtn.disabled = false;
    }
  }

  async _onFoundIt() {
    if (this.game.state !== 'playing' || this._tapping) return;
    this._tapping = true;
    // Render-excluded find time: clock ran from paint-ready to this tap
    const t = this._readyAt != null
      ? Math.max(0, Math.round(performance.now() - this._readyAt))
      : null;
    this._highlightMatch();
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) { /* ignore */ } }
    await new Promise(r => setTimeout(r, REVEAL_MS));
    await this.game.advanceRound(t);
    this._tapping = false;
  }

  async _onUndo() {
    if (this._tapping || this.game.state !== 'playing' || this.game.round <= 0) return;
    this._tapping = true;
    await this.game.revertRound();
    // Local mode re-rendered synchronously; brief lock avoids double-taps
    setTimeout(() => { this._tapping = false; }, 150);
  }

  _onStartLocal() {
    // Always start one-device games at the largest card size — the zoom
    // controls are for shrinking / fine-tuning during play
    this._applyAppWidth(100, { persist: false, relayout: false });
    if (this.selectedMode === 'count') {
      this.game.startLocalGame('count', 0, this.selectedCount, this.selectedDiff);
    } else {
      this.game.startLocalGame('timed', this.selectedTimer, 999, this.selectedDiff);
    }
    this._showScreen('game');
    this._pushHistoryGuard();
    this._renderRound();
  }

  /** Show/hide lobby controls per the selected Players mode.
   * One-device mode is a large-display feature (≥700px viewport) — on
   * smaller screens the lobby always shows the 2-device flow. */
  _applyPlayersVisibility() {
    const oneDevice = this.selectedPlayers === '1' && window.innerWidth >= 700;
    this.startLocalBtn.style.display = oneDevice ? '' : 'none';
    this.createBtn.style.display = oneDevice ? 'none' : '';
    this.pinInput.style.display = oneDevice ? 'none' : '';
    this.joinBtn.style.display = oneDevice ? 'none' : '';
    const divider = document.querySelector('.lobby-divider');
    if (divider) divider.style.display = oneDevice ? 'none' : '';
  }

  async _onEnd() {
    await this.game.leaveRoom();
    this._reset();
  }

  // ── Back / exit flow ─────────────────────────────────

  /** Context-aware back: lobby→hub, live game→confirm, results→lobby. */
  _onHome(e) {
    e.preventDefault();
    if (this.screens.game.classList.contains('active')) {
      if (this.game.state === 'playing') this._showExitConfirm();
      else this._reset();                     // finished but still on game screen
    } else if (this.screens.results.classList.contains('active')) {
      this._reset();                          // results → lobby
    } else {
      location.href = this.homeBtn.href;       // lobby → hub
    }
  }

  _showExitConfirm() {
    if (!this.exitConfirm) return;
    const text = this.exitConfirm.querySelector('.modal-text');
    if (text) {
      text.textContent = this.game.local
        ? 'Progress will be lost.'
        : 'Your partner will be disconnected.';
    }
    this.exitConfirm.classList.add('show');
  }
  _hideExitConfirm() { if (this.exitConfirm) this.exitConfirm.classList.remove('show'); }

  async _confirmExit() {
    this._hideExitConfirm();
    await this.game.leaveRoom();
    this._reset();
  }

  /** Push a history state so browser/swipe-back can't exit the SPA mid-game. */
  _pushHistoryGuard() {
    if (!this._historyPushed) {
      try { history.pushState({ sm: 'game' }, ''); this._historyPushed = true; } catch (e) { /* ignore */ }
    }
  }

  // ── Host Area (PIN + QR Code) ─────────────────────────────

  _hideLobbyControls() {
    this.createBtn.style.display = 'none';
    this.startLocalBtn.style.display = 'none';
    this.pinInput.style.display = 'none';
    this.joinBtn.style.display = 'none';
        const divider = document.querySelector('.lobby-divider');
        if (divider) divider.style.display = 'none';
    this.modeBtns.forEach(b => b.style.display = 'none');
    this.playersBtns.forEach(b => b.style.display = 'none');
    this.diffBtns.forEach(b => b.style.display = 'none');
    this.countOptions.style.display = 'none';
    this.timerOptions.style.display = 'none';
  }

  _showLobbyControls() {
    this.modeBtns.forEach(b => b.style.display = '');
    this.playersBtns.forEach(b => b.style.display = '');
    this.diffBtns.forEach(b => b.style.display = '');
    this.countOptions.style.display = this.selectedMode === 'count' ? 'flex' : 'none';
    this.timerOptions.style.display = this.selectedMode === 'timed' ? 'flex' : 'none';
    this._applyPlayersVisibility();
  }

  async _showHostArea(pin) {
    this._hideLobbyControls();

    // Show host area
    this.pinDisplay.textContent = pin;
    this.waitingMsg.style.display = 'block';
    this.hostArea.classList.add('show');

    // Generate QR code
    const joinUrl = `${window.location.origin}${window.location.pathname}?join=${pin}`;
    this.qrContainer.innerHTML = '';
    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, joinUrl, {
        width: 220,
        margin: 2,
        errorCorrectionLevel: 'M'
      });
      this.qrContainer.appendChild(canvas);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  }

  // ── Rendering ──────────────────────────────────────────────

  _renderRound() {
    const g = this.game;
    this.countNumber.textContent = g.round;
    if (this.countMax) this.countMax.textContent = '/' + g.maxRounds;
    const pct = g.maxRounds > 0 ? (g.round / g.maxRounds) * 100 : 0;
    this.countFill.style.width = `${pct}%`;

    if (this.undoBtn) this.undoBtn.disabled = g.round <= 0;

    // Update game status (hint text is only shown before first find)
    if (g.round === 0) {
      this._setGameStatus(g.local ? 'Tap either card to find it' : 'Tap the card to find it');
    } else {
      this._setGameStatus('');
    }

    // One-device mode: show the second card and split the area
    this.cardB.hidden = !g.local;
    this.cardArea.classList.toggle('local-split', g.local);

    // Timer display
    if (g.mode === 'timed') {
      this.timerDisplay.style.display = '';
      if (this.timerBarFill && this.timerBarFill.parentElement) {
        this.timerBarFill.parentElement.style.display = '';
      }
      if (!g.startedAt && this.timerValue) this.timerValue.textContent = '--s';
    } else {
      this.timerDisplay.style.display = 'none';
      if (this.timerBarFill && this.timerBarFill.parentElement) {
        this.timerBarFill.parentElement.style.display = 'none';
      }
    }

    // Render the card(s) for the current round (paint-time, measured boxes)
    this._layoutCard();
  }

  /**
   * Paint my card (and the second card in one-device mode) from measured
   * boxes. Layout seed derives from (sessionSeed|pin, cardIdx) so
   * resize/rotation re-renders the same arrangement, rescaled.
   */
  _layoutCard() {
    const g = this.game;
    if (!g.deck.length) return;
    const offsetA = (g.role === 'guest' && !g.local) ? 1 : 0;
    this._paintCardInto(this.myCard, g.round * 2 + offsetA);
    if (g.local) this._paintCardInto(this.cardB, g.round * 2 + 1);
    // Per-round clock: starts when this round's card(s) are actually painted
    // (reveal hold + render time fall between rounds → excluded from stats)
    if (g.round !== this._paintedRound) {
      this._paintedRound = g.round;
      this._readyAt = performance.now();
    }
  }

  _paintCardInto(container, cardIdx) {
    const g = this.game;
    const w = container.clientWidth, h = container.clientHeight;
    if (w < 50 || h < 50) return; // hidden or not laid out yet
    const idx = cardIdx % g.deck.length;
    const card = g.deck[idx];
    const seed = (((g.sessionSeed || parseInt(g.pin, 10) || 12345) * 31) + idx * 7919) | 0;
    const layout = computeCardLayout(card.length, { w, h }, new SeededRNG(seed));
    paintCard(container, card.map(i => g.emojiMap[i]), layout);
  }

  _updateDiffPreview() {
    if (!this.diffPreview) return;
    const n = this.selectedDiff || 8;
    // Pick first n emoji from the game's EMOJI array (hardcoded for preview)
    const previewEmoji = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯'].slice(0, n);
    this.diffPreview.innerHTML = previewEmoji.map(e => `<span>${e}</span>`).join('');
  }

  _highlightMatch() {
    const g = this.game;
    const matchIdx = g.getMatchSymbolIndex();
    if (matchIdx === -1) return;

    const highlightIn = (cardEl, cardIdx) => {
      const card = g.deck[cardIdx % g.deck.length];
      const matchPos = card.indexOf(matchIdx);
      const cells = cardEl.querySelectorAll('.cell');
      // Phase 1: highlight the match immediately
      cells.forEach((cell, i) => {
        if (i === matchPos) cell.classList.add('match-highlight');
      });
      // Phase 2: dim non-matching cells after a brief pause
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cells.forEach((cell, i) => {
            if (i !== matchPos) cell.classList.add('cell-dim');
          });
        });
      });
      // Card-level pulse
      cardEl.classList.remove('match-pulse');
      void cardEl.offsetWidth;
      cardEl.classList.add('match-pulse');
    };

    // One-device mode: reveal the match on BOTH cards simultaneously
    highlightIn(this.myCard, g.round * 2 + ((g.role === 'guest' && !g.local) ? 1 : 0));
    if (g.local) highlightIn(this.cardB, g.round * 2 + 1);
  }

  /** Results: stat grid + per-round bar chart — session-only, nothing stored. */
  _renderResults() {
    const g = this.game;
    const times = (g.roundTimes || []).filter(t => typeof t === 'number' && t >= 0);
    const rounds = g.round;
    const totalS = Math.max(0, g.getElapsedTime());

    this.resultRounds.textContent = rounds;
    this.resultTotal.textContent = totalS + 's';

    if (times.length) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const best = Math.min(...times);
      this.resultAvg.textContent = (avg / 1000).toFixed(1) + 's';
      this.resultBest.textContent = (best / 1000).toFixed(1) + 's';
      this.resultRate.textContent = totalS > 0
        ? (rounds / (totalS / 60)).toFixed(1)
        : '–';
    } else {
      this.resultAvg.textContent = '–';
      this.resultBest.textContent = '–';
      this.resultRate.textContent = '–';
    }

    this._renderChart(times);
  }

  _renderChart(times) {
    const chart = this.roundChart;
    chart.innerHTML = '';
    if (!times || times.length === 0) {
      chart.style.display = 'none';
      return;
    }
    chart.style.display = '';
    const max = Math.max(...times);
    const bestIdx = times.indexOf(Math.min(...times));
    times.forEach((t, i) => {
      const bar = document.createElement('div');
      bar.className = 'bar' + (i === bestIdx ? ' best' : '');
      bar.style.height = (max > 0 ? Math.max(6, Math.round((t / max) * 100)) : 6) + '%';
      bar.title = 'Round ' + (i + 1) + ' — ' + (t / 1000).toFixed(1) + 's';
      chart.appendChild(bar);
    });
  }

  _showScreen(name) {
    Object.values(this.screens).forEach(el => {
      if (el) el.classList.remove('active');
    });
    if (this.screens[name]) this.screens[name].classList.add('active');
  }

  _setLobbyStatus(msg) {
    if (this.lobbyStatus) this.lobbyStatus.textContent = msg;
  }

  _setGameStatus(msg) {
    if (this.gameStatus) this.gameStatus.textContent = msg;
  }

  _reset() {
    this._tapping = false;
    this._hideExitConfirm();
    this.game.stopTimer();
    this.game.leaveRoom();

    // Reset per-round timing state
    this._paintedRound = -1;
    this._readyAt = null;

    // Clean up the swipe-back history guard
    if (this._historyPushed) {
      this._historyPushed = false;
      try { if (history.state && history.state.sm) history.back(); } catch (e) { /* ignore */ }
    }

    // Reset lobby UI
    this.hostArea.classList.remove('show');
    this.waitingMsg.style.display = 'none';
    this._showLobbyControls();
    this.createBtn.disabled = false;
    this.joinBtn.disabled = false;
    this.pinInput.value = '';
    this._setLobbyStatus('');
    this._setGameStatus('');
    this._showScreen('lobby');
  }
}
