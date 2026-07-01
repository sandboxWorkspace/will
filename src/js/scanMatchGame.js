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

// ── Seeded RNG (Mulberry32) ─────────────────────────────────────────────
class SeededRNG {
  constructor(seed) {
    this.s = seed | 0;
  }
  /** Returns a float in [0, 1). */
  next() {
    this.s |= 0;
    this.s = (this.s + 0x6D2B79F5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Fisher-Yates shuffle (in-place). */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ── Deck Generation (Projective Plane of order N-1) ────────────────────
function generateBaseDeck(N) {
  const q = N - 1;
  const cards = [];
  cards.push(Array.from({ length: N }, (_, i) => i));
  const grid = [];
  let sym = N;
  for (let r = 0; r < q; r++) {
    grid[r] = [];
    for (let c = 0; c < q; c++) {
      grid[r][c] = sym++;
    }
  }
  for (let i = 0; i < q; i++) {
    const card = [0];
    for (let j = 0; j < q; j++) card.push(grid[i][j]);
    cards.push(card);
  }
  for (let symIdx = 1; symIdx < N; symIdx++) {
    for (let diag = 0; diag < q; diag++) {
      const card = [symIdx];
      for (let row = 0; row < q; row++) {
        const col = (diag + symIdx * row) % q;
        card.push(grid[row][col]);
      }
      cards.push(card);
    }
  }
  return cards; // 57 cards
}

// ── Game Engine ─────────────────────────────────────────────────────────
export class ScanMatchGame {
  constructor(firebaseApp) {
    this.app = firebaseApp;
    this.db = getDatabase(firebaseApp);
    this.pin = null;
    this.role = null;       // 'host' | 'guest'
    this.round = 0;
    this.deck = [];         // 57 cards, shuffled
    this.emojiMap = [];     // symbol index → emoji string
    this.cardSizes = [];    // [cardIdx][symIdx] → size class
    this.cardPositions = []; // [cardIdx][symIdx] → { x%, y% }
    this.state = 'idle';    // 'idle' | 'waiting' | 'playing' | 'finished'
    this.unsub = null;      // Firebase onValue unsubscribe
    this.mode = 'count';    // 'count' | 'timed'
    this.timerDuration = 60;
    this.startedAt = null;  // Firebase server timestamp (ms)
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
    this.pin = String(100000 + Math.floor(rng.next() * 900000));
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
    if (this.pin && this.role === 'host') {
      try { await set(ref(this.db, `scanMatchSessions/${this.pin}`), null); }
      catch (e) { /* ignore */ }
    }
    this.state = 'idle';
  }

  /** Advance the round by 1. */
  async advanceRound() {
    if (this.state !== 'playing') return;
    const nextRound = this.round + 1;
    if (nextRound >= this.maxRounds) {
      await update(ref(this.db, `scanMatchSessions/${this.pin}`), {
        round: nextRound,
        status: 'finished'
      });
      return;
    }
    await update(ref(this.db, `scanMatchSessions/${this.pin}`), {
      round: nextRound
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
        update(ref(this.db, `scanMatchSessions/${this.pin}`), {
          status: 'finished',
          round: this.round
        });
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

    // Generate size variance per card per position (seeded, so both phones match)
    const sizeClasses = ['size-xl', 'size-lg', 'size-md', 'size-sm'];
    this.cardSizes = this.deck.map(card =>
      card.map(() => sizeClasses[Math.floor(rng.next() * sizeClasses.length)])
    );

    // Fixed scattered positions — use first N for fewer-emoji decks
    const ALL_POSITIONS = [
      { x: 20, y: 22 },   // top-left
      { x: 78, y: 18 },   // top-right
      { x: 50, y: 14 },   // top-center
      { x: 84, y: 52 },   // right
      { x: 24, y: 60 },   // left
      { x: 66, y: 78 },   // bottom-right
      { x: 34, y: 82 },   // bottom-center
      { x: 70, y: 34 },   // upper-right inner
      { x: 43, y: 44 },   // center
      { x: 14, y: 40 },   // far left
    ];
    this.cardPositions = this.deck.map(() => {
      const pool = ALL_POSITIONS.slice(0, N);
      const shuffled = pool.map(p => ({
      x: p.x + (rng.next() - 0.5) * 4,  // ±2% jitter
      y: p.y + (rng.next() - 0.5) * 4,
      r: (rng.next() - 0.5) * 20
      }));
      rng.shuffle(shuffled);
      return shuffled;
    });
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

    // Restore theme from localStorage
    this._restoreTheme();

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
    this.selectedMode = 'count';
    this.selectedDiff = 8;
    this.selectedCount = 25;
    this.selectedTimer = 120;

    // Theme toggle
    this.themeToggle = document.getElementById('themeToggleInput');

    // Game
    this.countNumber = document.getElementById('countNumber');
    this.countMax = document.getElementById('countMax');
    this.countFill = document.getElementById('countFill');
    this.timerDisplay = document.getElementById('timerDisplay');
    this.timerValue = document.getElementById('timerValue');
    this.timerBarFill = document.getElementById('timerBarFill');
    this.myCard = document.getElementById('myCard');
    this.endBtn = document.getElementById('endBtn');
    this.gameStatus = document.getElementById('gameStatus');

    // Results
    this.resultRounds = document.getElementById('resultRounds');
    this.resultTimerRow = document.getElementById('resultTimerRow');
    this.resultTime = document.getElementById('resultTime');
    this.newBtn = document.getElementById('newBtn');
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

    // Game — card IS the Found It button
    this.myCard.addEventListener('click', () => this._onFoundIt());

    this.endBtn.addEventListener('click', () => this._onEnd());

    // Results
    this.newBtn.addEventListener('click', () => this._reset());

    // Theme toggle
    setupToggleSwitch(this.themeToggle, (isDark) => {
      document.body.classList.toggle('dark', isDark);
      localStorage.setItem('scanMatchTheme', isDark ? 'dark' : 'light');
    });
  }

  _listenGame() {
    this.game.on('gameStarted', () => {
      this._showScreen('game');
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
      this.resultRounds.textContent = this.game.round;
      if (this.game.mode === 'timed') {
        this.resultTimerRow.style.display = '';
        this.resultTime.textContent = this.game.getElapsedTime();
      } else {
        this.resultTimerRow.style.display = 'none';
      }
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
      this._renderRound();
    } catch (err) {
      this._setLobbyStatus(err.message);
      this.joinBtn.disabled = false;
    }
  }

  async _onFoundIt() {
    if (this.game.state !== 'playing' || this._tapping) return;
    this._tapping = true;
    this._highlightMatch();
    await new Promise(r => setTimeout(r, 280));
    await this.game.advanceRound();
    this._tapping = false;
  }

  async _onEnd() {
    await this.game.leaveRoom();
    this._reset();
  }

  // ── Host Area (PIN + QR Code) ─────────────────────────────

  _hideLobbyControls() {
    this.createBtn.style.display = 'none';
    this.pinInput.style.display = 'none';
    this.joinBtn.style.display = 'none';
    const divider = document.querySelector('.divider');
    if (divider) divider.style.display = 'none';
    this.modeBtns.forEach(b => b.style.display = 'none');
    this.diffBtns.forEach(b => b.style.display = 'none');
    this.countOptions.style.display = 'none';
    this.timerOptions.style.display = 'none';
  }

  _showLobbyControls() {
    this.createBtn.style.display = '';
    this.pinInput.style.display = '';
    this.joinBtn.style.display = '';
    const divider = document.querySelector('.divider');
    if (divider) divider.style.display = '';
    this.modeBtns.forEach(b => b.style.display = '');
    this.diffBtns.forEach(b => b.style.display = '');
    this.countOptions.style.display = this.selectedMode === 'count' ? 'flex' : 'none';
    this.timerOptions.style.display = this.selectedMode === 'timed' ? 'flex' : 'none';
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

    // Update game status (hint text is only shown before first find)
    if (g.round === 0) {
      this._setGameStatus('Tap the card to find it');
    } else {
      this._setGameStatus('');
    }

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

    // Render my card with sizes and scattered positions
    const cardIdx = g.round * 2 + (g.role === 'guest' ? 1 : 0);
    const card = g.deck[cardIdx % g.deck.length];
    const symbols = card.map(i => g.emojiMap[i]);
    const sizes = g.cardSizes[cardIdx % g.deck.length];
    const positions = g.cardPositions[cardIdx % g.deck.length];
    this._fillCard(this.myCard, symbols, sizes, positions);
  }

  _fillCard(container, symbols, sizes, positions) {
    container.innerHTML = '';
    symbols.forEach((emoji, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (sizes && sizes[i]) cell.classList.add(sizes[i]);
      if (positions && positions[i]) {
        cell.style.left = `${positions[i].x}%`;
        cell.style.top = `${positions[i].y}%`;
        cell.style.transform = `translate(-50%, -50%) rotate(${positions[i].r || 0}deg)`;
      }
      cell.textContent = emoji;
      container.appendChild(cell);
    });
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

    const cardIdx = g.round * 2 + (g.role === 'guest' ? 1 : 0);
    const card = g.deck[cardIdx % g.deck.length];
    const matchPos = card.indexOf(matchIdx);

    const cells = this.myCard.querySelectorAll('.cell');
    // Phase 1: highlight the match immediately
    cells.forEach((cell, i) => {
      if (i === matchPos) cell.classList.add('match-highlight');
    });
    // Phase 2: vanish non-matching cells after a brief pause
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cells.forEach((cell, i) => {
          if (i !== matchPos) cell.classList.add('cell-hide');
        });
      });
    });

    // Card-level pulse
    this.myCard.classList.remove('match-pulse');
    void this.myCard.offsetWidth;
    this.myCard.classList.add('match-pulse');
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
    this.game.stopTimer();
    this.game.leaveRoom();

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
