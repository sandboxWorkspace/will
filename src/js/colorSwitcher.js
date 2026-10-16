/**
 * Color Switcher — full-screen color pacer for dot/cone drills (experimental tool).
 *
 * Behaviour: the screen floods with one color = "go to that dot"; any input
 * (tap, any key / Bluetooth clicker, gamepad button)
 * advances to the next color. Manual or Pace timing × Random or Sequence order.
 *
 * No dependencies. No network. No Firebase — storage is the last-used settings only.
 * Loaded lazily from src/scripts.js when #colorSwitcher is present.
 */

'use strict';

// ── Constants ───────────────────────────────────────────────

const PRESETS = [
  { hex: '#E11D1D', name: 'Red',    on: true  },
  { hex: '#F59E0B', name: 'Orange', on: false },
  { hex: '#FFD500', name: 'Yellow', on: true  },
  { hex: '#16A34A', name: 'Green',  on: true  },
  { hex: '#1D4ED8', name: 'Blue',   on: true  },
  { hex: '#7C3AED', name: 'Purple', on: false },
  { hex: '#EC4899', name: 'Pink',   on: false },
  { hex: '#F5F5F5', name: 'White',  on: false },
];

const DEBOUNCE_MS = 200;   // ignore inputs this soon after an advance
const EARLY_MS = 300;      // advance sooner than this = flagged "early"
const LONGPRESS_MS = 600;  // hold this long on the run screen = pause menu
const LS_KEY = 'colorSwitcher.config.v1';
const PACE_MS = [2000, 5000]; // pace mode: random interval range
const GAP_MS = [150, 400];    // blank beat between colors
const RING_CIRC = 2 * Math.PI * 40; // timer ring circumference (r = 40 in the SVG)

const DEFAULT_CONFIG = {
  presets: Object.fromEntries(PRESETS.map(p => [p.hex, p.on])),
  custom: [],              // { hex, label, on }
  timing: 'manual',        // 'manual' | 'pace'
  order: 'random',         // 'random' | 'sequence'
  sequence: [],            // hex strings (must be in play)
  speakNames: false,
  endMode: 'open',         // 'open' | 'time' | 'reps' | 'either'
  endMs: 60000,            // time limit (used by 'time'/'either')
  endReps: 20,             // rep target (used by 'reps'/'either')
  passes: 1,               // sequence passes before auto-end (0 = endless)
};

// ── Utilities ───────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const rand = (min, max) => min + Math.random() * (max - min);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function formatSecs(ms) {
  if (ms == null) return '—';
  return (ms / 1000).toFixed(1) + 's';
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ── App ─────────────────────────────────────────────────────

class ColorSwitcherApp {
  constructor() {
    this.cfg = deepCopy(DEFAULT_CONFIG);

    // Session state
    this.state = 'setup';        // 'setup' | 'countdown' | 'running' | 'paused' | 'done'
    this.attempts = [];          // { dt, hex, name, kind: 'rep'|'early', source }
    this.acks = [];              // pace-mode completion markers (dt ms)
    this.seqPos = 0;
    this.current = null;         // { hex, name }
    this.currentTOn = 0;
    this.awaiting = false;
    this.lastAdvanceAt = 0;
    this.startAt = 0;
    this.endAt = 0;
    this.pausedTotal = 0;
    this.pauseStart = 0;
    this.timerA = null;          // pace interval / gap chain
    this.timerB = null;
    this.timerId = null;         // time-limit ticker
    this.timeLimitEndAt = 0;     // wall-clock end for time limits
    this.timeLimitTotalMs = 0;   // configured limit (ring denominator)
    this.endReason = '';         // 'manual' | 'time' | 'reps' | 'sequence'
    this.lpTimer = null;         // long-press timer
    this.lpFired = false;
    this.leavePending = false;   // hub-exit confirm open
    this.padPrev = {};           // gamepad edge state
    this.indicatorTimers = new Map();
    this.wakeLock = null;

    // DOM refs
    this.setupScreen = $('#setupScreen');
    this.runScreen = $('#runScreen');
    this.resultsScreen = $('#resultsScreen');
    this.pauseMenu = $('#pauseMenu');
    this.nameOverlay = $('#nameOverlay');
    this.countdownEl = $('#countdown');
    this.hudEl = $('#hud');
    this.paletteChips = $('#paletteChips');
    this.sequenceSection = $('#sequenceSection');
    this.sequenceAdd = $('#sequenceAdd');
    this.sequenceList = $('#sequenceList');
    this.sequenceEmpty = $('#sequenceEmpty');
    this.customColorInput = $('#customColorInput');
    this.customLabelInput = $('#customLabelInput');
    this.setupMsg = $('#setupMsg');
    this.startBtn = $('#startBtn');
    this.customRow = $('#customRow');
    this.summaryLine = $('#summaryLine');
    this.statsGrid = $('#statsGrid');
    this.perColorList = $('#perColorList');
    this.summaryText = $('#summaryText');
    this.indTap = $('#indTap');
    this.indKey = $('#indKey');
    this.indPad = $('#indPad');
    this.endRunBtn = $('#endRunBtn');
    this.timerEl = $('#timer');
    this.timerRingWrap = $('#timerRingWrap');
    this.ringProgress = $('#ringProgress');
    this.timeSlider = $('#timeSlider');
    this.timeVal = $('#timeVal');
    this.repsSlider = $('#repsSlider');
    this.repsMinus = $('#repsMinus');
    this.repsPlus = $('#repsPlus');
    this.endPills = $('#endPills');
    this.timeRow = $('#timeRow');
    this.timePills = $('#timePills');
    this.repsRow = $('#repsRow');
    this.repsVal = $('#repsVal');
    this.passesRow = $('#passesRow');
    this.passesPills = $('#passesPills');
    this.backBtn = $('#csBackBtn');
    this.leaveMenu = $('#leaveMenu');

    // Bind once
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onPointerDownRun = this._onPointerDownRun.bind(this);
    this._onPointerUpRun = this._onPointerUpRun.bind(this);
    this._loop = this._loop.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
  }

  // ── Config ────────────────────────────────────────────────

  loadConfig() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const merged = deepCopy(DEFAULT_CONFIG);
      if (saved.presets && typeof saved.presets === 'object') merged.presets = { ...merged.presets, ...saved.presets };
      if (Array.isArray(saved.custom)) merged.custom = saved.custom.filter(c => c && typeof c.hex === 'string');
      if (saved.timing === 'pace' || saved.timing === 'manual') merged.timing = saved.timing;
      if (saved.order === 'sequence' || saved.order === 'random') merged.order = saved.order;
      if (Array.isArray(saved.sequence)) merged.sequence = saved.sequence.filter(h => typeof h === 'string');
      if (['open', 'time', 'reps', 'either'].includes(saved.endMode)) merged.endMode = saved.endMode;
      if (typeof saved.endMs === 'number' && saved.endMs >= 15000 && saved.endMs <= 1800000) merged.endMs = saved.endMs;
      if (typeof saved.endReps === 'number' && saved.endReps >= 1 && saved.endReps <= 200) merged.endReps = saved.endReps;
      if ([0, 1, 2, 3].includes(saved.passes)) merged.passes = saved.passes;
      for (const k of ['speakNames']) {
        if (typeof saved[k] === 'boolean') merged[k] = saved[k];
      }
      this.cfg = merged;
    } catch (e) {
      console.warn('ColorSwitcher: failed to load config', e);
    }
  }

  saveConfig() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.cfg)); } catch (e) { /* private mode */ }
  }

  // ── Colors ────────────────────────────────────────────────

  activeColors() {
    const list = [];
    for (const p of PRESETS) {
      if (this.cfg.presets[p.hex]) list.push({ hex: p.hex, name: p.name, custom: false });
    }
    for (const c of this.cfg.custom) {
      if (c.on) list.push({ hex: c.hex, name: c.label || '', custom: true });
    }
    return list;
  }

  sequenceColors() {
    const active = new Map(this.activeColors().map(c => [c.hex, c]));
    return this.cfg.sequence.filter(h => active.has(h)).map(h => active.get(h));
  }

  displayName(color) {
    return color.name || color.hex.toUpperCase();
  }

  // ── Setup UI ──────────────────────────────────────────────

  init() {
    this.loadConfig();
    this.applyConfigToUI();
    this.bindSetupEvents();

    // Global input listeners (routed by state)
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('pointerdown', (e) => {
      if (this.state !== 'setup') return;
      if (e.target.closest('button, input, label, a')) return;
      this.flashIndicator(this.indTap);
    });
    this.runScreen.addEventListener('pointerdown', this._onPointerDownRun);
    this.runScreen.addEventListener('pointerup', this._onPointerUpRun);
    this.runScreen.addEventListener('pointercancel', () => clearTimeout(this.lpTimer));
    this.runScreen.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', this._onVisibility);

    this.backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.requestHubExit();
    });
    $('#leaveCancelBtn').addEventListener('click', () => this.closeLeaveMenu());
    $('#leaveConfirmBtn').addEventListener('click', () => this.confirmHubExit());

    requestAnimationFrame(this._loop);
  }

  applyConfigToUI() {
    // Pills
    for (const btn of document.querySelectorAll('#timingPills .pill-btn')) {
      this.markPill(btn, btn.dataset.timing === this.cfg.timing);
    }
    for (const btn of document.querySelectorAll('#orderPills .pill-btn')) {
      this.markPill(btn, btn.dataset.order === this.cfg.order);
    }
    this.sequenceSection.style.display = this.cfg.order === 'sequence' ? '' : 'none';
    // Speak toggle
    this.syncSpeakBtn();
    // Length
    for (const btn of this.endPills.querySelectorAll('.pill-btn')) {
      this.markPill(btn, btn.dataset.end === this.cfg.endMode);
    }
    for (const btn of this.timePills.querySelectorAll('.pill-btn')) {
      this.markPill(btn, Number(btn.dataset.ms) === this.cfg.endMs);
    }
    for (const btn of this.passesPills.querySelectorAll('.pill-btn')) {
      this.markPill(btn, Number(btn.dataset.passes) === this.cfg.passes);
    }
    this.timeSlider.value = String(this.cfg.endMs);
    this.timeSlider.setAttribute('aria-valuetext', formatDuration(this.cfg.endMs));
    this.timeVal.textContent = formatDuration(this.cfg.endMs);
    this.repsSlider.value = String(this.cfg.endReps);
    this.repsSlider.setAttribute('aria-valuetext', `${this.cfg.endReps} reps`);
    this.repsVal.textContent = String(this.cfg.endReps);
    this.syncStepperBounds();
    this.syncLengthRows();
    this.renderPalette();
    this.renderSequence();
    this.updateSummaryLine();
  }

  markPill(btn, on) {
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  syncSpeakBtn() {
    const btn = $('#speakBtn');
    const on = this.cfg.speakNames;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Mute color names' : 'Unmute color names');
  }

  syncLengthRows() {
    const m = this.cfg.endMode;
    this.timeRow.style.display = (m === 'time' || m === 'either') ? '' : 'none';
    this.repsRow.style.display = (m === 'reps' || m === 'either') ? '' : 'none';
    this.passesRow.style.display = this.cfg.order === 'sequence' ? '' : 'none';
  }

  syncStepperBounds() {
    this.repsMinus.disabled = this.cfg.endReps <= 1;
    this.repsPlus.disabled = this.cfg.endReps >= 200;
  }

  setTimeMs(ms, persist = true) {
    const clamped = Math.min(1800000, Math.max(15000, Math.round(ms)));
    this.cfg.endMs = Math.round(clamped / 15000) * 15000;
    this.timeSlider.value = String(this.cfg.endMs);
    this.timeSlider.setAttribute('aria-valuetext', formatDuration(this.cfg.endMs));
    this.timeVal.textContent = formatDuration(this.cfg.endMs);
    for (const btn of this.timePills.querySelectorAll('.pill-btn')) {
      this.markPill(btn, Number(btn.dataset.ms) === this.cfg.endMs);
    }
    this.updateSummaryLine();
    if (persist) this.saveConfig();
  }

  setReps(n, persist = true) {
    this.cfg.endReps = Math.min(200, Math.max(1, Math.round(n)));
    this.repsSlider.value = String(this.cfg.endReps);
    this.repsSlider.setAttribute('aria-valuetext', `${this.cfg.endReps} reps`);
    this.repsVal.textContent = String(this.cfg.endReps);
    this.syncStepperBounds();
    this.updateSummaryLine();
    if (persist) this.saveConfig();
  }

  renderPalette() {
    this.paletteChips.innerHTML = '';
    for (const p of PRESETS) {
      this.paletteChips.appendChild(this.chipEl(p.hex, p.name, this.cfg.presets[p.hex], false));
    }
    for (const c of this.cfg.custom) {
      this.paletteChips.appendChild(this.chipEl(c.hex, c.label || c.hex.toUpperCase(), c.on, true));
    }
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'chip add-chip';
    add.textContent = '+ Custom';
    add.addEventListener('click', () => {
      const open = this.customRow.classList.toggle('open');
      if (open) this.customLabelInput.focus();
    });
    this.paletteChips.appendChild(add);
  }

  chipEl(hex, label, on, removable) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (on ? ' on' : '') + (removable ? ' removable' : '');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = hex;
    const text = document.createElement('span');
    text.textContent = label;
    chip.appendChild(dot);
    chip.appendChild(text);
    chip.addEventListener('click', () => this.toggleColor(hex, removable));
    if (removable) {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'x';
      x.textContent = '✕';
      x.setAttribute('aria-label', 'Remove custom color');
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cfg.custom = this.cfg.custom.filter(c => c.hex !== hex);
        this.cfg.sequence = this.cfg.sequence.filter(h => h !== hex);
        this.afterConfigChange();
      });
      chip.appendChild(x);
    }
    return chip;
  }

  toggleColor(hex, isCustom) {
    if (isCustom) {
      const c = this.cfg.custom.find(c => c.hex === hex);
      if (c) c.on = !c.on;
    } else {
      this.cfg.presets[hex] = !this.cfg.presets[hex];
    }
    // Keep sequence consistent with what is in play
    if (!this.activeColors().some(c => c.hex === hex)) {
      this.cfg.sequence = this.cfg.sequence.filter(h => h !== hex);
    }
    this.afterConfigChange();
  }

  renderSequence() {
    // Add row: active colors
    this.sequenceAdd.innerHTML = '';
    for (const c of this.activeColors()) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = c.hex;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(this.displayName(c)));
      chip.addEventListener('click', () => {
        this.cfg.sequence.push(c.hex);
        this.afterConfigChange();
      });
      this.sequenceAdd.appendChild(chip);
    }
    // Sequence list
    this.sequenceList.innerHTML = '';
    const active = new Map(this.activeColors().map(c => [c.hex, c]));
    this.cfg.sequence.forEach((hex, idx) => {
      const color = active.get(hex);
      if (!color) return; // sanitized elsewhere; skip for safety
      if (idx > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'seq-arrow';
        arrow.textContent = '›';
        arrow.setAttribute('aria-hidden', 'true');
        this.sequenceList.appendChild(arrow);
      }
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'seq-chip';
      chip.setAttribute('aria-label', `Remove ${this.displayName(color)} from sequence`);
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = hex;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(this.displayName(color)));
      chip.addEventListener('click', () => {
        this.cfg.sequence.splice(idx, 1);
        this.afterConfigChange();
      });
      this.sequenceList.appendChild(chip);
    });
    this.sequenceEmpty.style.display = this.cfg.sequence.length ? 'none' : '';
  }

  afterConfigChange() {
    this.saveConfig();
    this.applyConfigToUI();
    this.refreshSetupState();
  }

  drillMsg(active) {
    if (this.cfg.order === 'sequence' && this.sequenceColors().length < 1) {
      return 'Add at least one color to the sequence.';
    }
    if (this.cfg.order === 'random' && active.length < 2) {
      return 'Random order needs at least 2 colors in play.';
    }
    return '';
  }

  finalMsg() {
    const active = this.activeColors();
    if (!active.length) return 'Select at least one color in play.';
    return this.drillMsg(active);
  }

  refreshSetupState() {
    const msg = this.finalMsg();
    this.setupMsg.textContent = msg;
    this.startBtn.disabled = !!msg;
  }

  updateSummaryLine() {
    const n = this.activeColors().length;
    const timing = this.cfg.timing === 'manual' ? 'Manual' : 'Pace';
    const order = this.cfg.order === 'random' ? 'Random' : 'Sequence';
    let len = 'Open';
    if (this.cfg.endMode === 'time') len = formatDuration(this.cfg.endMs);
    else if (this.cfg.endMode === 'reps') len = `${this.cfg.endReps} reps`;
    else if (this.cfg.endMode === 'either') len = `${formatDuration(this.cfg.endMs)} / ${this.cfg.endReps} reps`;
    let passes = '';
    if (this.cfg.order === 'sequence' && this.cfg.passes > 0) {
      passes = ` · ${this.cfg.passes} pass${this.cfg.passes === 1 ? '' : 'es'}`;
    }
    this.summaryLine.textContent = `${n} color${n === 1 ? '' : 's'} · ${timing} · ${order} · ${len}${passes}`;
  }

  validate() {
    const msg = this.finalMsg();
    this.setupMsg.textContent = msg;
    this.startBtn.disabled = !!msg;
    return !msg;
  }

  bindSetupEvents() {
    $('#timingPills').addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      this.cfg.timing = btn.dataset.timing;
      this.afterConfigChange();
    });
    $('#orderPills').addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      this.cfg.order = btn.dataset.order;
      this.afterConfigChange();
    });
    this.endPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      this.cfg.endMode = btn.dataset.end;
      this.afterConfigChange();
    });
    this.timePills.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      this.cfg.endMs = Number(btn.dataset.ms);
      this.afterConfigChange();
    });
    this.passesPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      this.cfg.passes = Number(btn.dataset.passes);
      this.afterConfigChange();
    });
    this.repsMinus.addEventListener('click', () => this.setReps(this.cfg.endReps - 1));
    this.repsPlus.addEventListener('click', () => this.setReps(this.cfg.endReps + 1));
    this.timeSlider.addEventListener('input', () => this.setTimeMs(Number(this.timeSlider.value), false));
    this.timeSlider.addEventListener('change', () => this.saveConfig());
    this.repsSlider.addEventListener('input', () => this.setReps(Number(this.repsSlider.value), false));
    this.repsSlider.addEventListener('change', () => this.saveConfig());
    $('#addCustomBtn').addEventListener('click', () => {
      const hex = this.customColorInput.value.toUpperCase();
      const label = this.customLabelInput.value.trim().slice(0, 12);
      if (this.cfg.custom.some(c => c.hex === hex)) return;
      this.cfg.custom.push({ hex, label, on: true });
      this.customLabelInput.value = '';
      this.afterConfigChange();
    });
    $('#speakBtn').addEventListener('click', () => {
      this.cfg.speakNames = !this.cfg.speakNames;
      this.saveConfig();
      this.syncSpeakBtn();
    });

    this.startBtn.addEventListener('click', () => this.startSession());
    $('#resetBtn').addEventListener('click', () => {
      this.cfg = deepCopy(DEFAULT_CONFIG);
      this.saveConfig();
      this.applyConfigToUI();
      this.refreshSetupState();
    });

    // Pause menu
    $('#resumeBtn').addEventListener('click', () => this.resume());
    $('#restartBtn').addEventListener('click', () => this.restartSession());
    $('#endBtn').addEventListener('click', () => this.endSession('manual'));
    $('#settingsBtn').addEventListener('click', () => this.exitSession());

    // Run screen end
    this.endRunBtn.addEventListener('click', () => this.endSession('manual'));

    // Results
    $('#copyBtn').addEventListener('click', () => this.copySummary());
    $('#playAgainBtn').addEventListener('click', () => this.startSession());
    $('#backSetupBtn').addEventListener('click', () => this.showSetup());
  }

  flashIndicator(el) {
    if (!el) return;
    el.classList.add('lit');
    clearTimeout(this.indicatorTimers.get(el));
    this.indicatorTimers.set(el, setTimeout(() => el.classList.remove('lit'), 700));
  }

  // ── Global inputs ─────────────────────────────────────────

  _onKeyDown(e) {
    if (this.leavePending) {
      if (e.key === 'Escape') this.closeLeaveMenu();
      return;
    }
    if (this.state === 'running') {
      if (e.key === 'Escape') { this.openPause(); return; }
      this.advance('key', e);
    } else if (this.state === 'paused') {
      if (e.key === 'Escape') this.resume();
    } else if (this.state === 'setup') {
      this.flashIndicator(this.indKey);
    }
  }

  _onPointerDownRun(e) {
    if (this.state !== 'running') return;
    if (e.target.closest('#endRunBtn')) return;
    this.lpFired = false;
    clearTimeout(this.lpTimer);
    this.lpTimer = setTimeout(() => {
      this.lpFired = true;
      this.openPause();
    }, LONGPRESS_MS);
  }

  _onPointerUpRun(e) {
    clearTimeout(this.lpTimer);
    if (this.state !== 'running') return;
    if (e.target.closest('#endRunBtn')) return;
    if (this.lpFired) { this.lpFired = false; return; }
    this.advance('tap');
  }

  _loop() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let anyEdge = false;
    for (const gp of pads) {
      if (!gp) continue;
      gp.buttons.forEach((b, i) => {
        const key = gp.index + ':' + i;
        const was = this.padPrev[key] || false;
        if (b.pressed && !was) anyEdge = true;
        this.padPrev[key] = b.pressed;
      });
    }
    if (anyEdge) {
      if (this.state === 'running' && this.awaiting) this.advance('gamepad');
      else if (this.state === 'setup') this.flashIndicator(this.indPad);
    }
    requestAnimationFrame(this._loop);
  }

  _onVisibility() {
    if (document.visibilityState === 'hidden' && this.state === 'running') {
      this.openPause();
    } else if (document.visibilityState === 'visible' && this.state === 'running') {
      this.acquireWakeLock();
    }
  }

  requestHubExit() {
    const live = this.state === 'running' || this.state === 'countdown' || this.state === 'paused';
    if (live) {
      this.leavePending = true;
      this.leaveMenu.classList.add('active');
      const cancel = $('#leaveCancelBtn');
      if (cancel) cancel.focus();
      return;
    }
    this.goHub();
  }

  closeLeaveMenu() {
    this.leavePending = false;
    this.leaveMenu.classList.remove('active');
  }

  confirmHubExit() {
    this.leavePending = false;
    this.leaveMenu.classList.remove('active');
    this.clearTimers();
    this.stopLimitTimer();
    this.releaseWakeLock();
    this.goHub();
  }

  goHub() {
    location.href = (this.backBtn.getAttribute && this.backBtn.getAttribute('href')) || '/will/';
  }

  // ── Session lifecycle ─────────────────────────────────────

  async startSession() {
    if (!this.validate()) return;

    this.setupScreen.classList.remove('active');
    this.resultsScreen.classList.remove('active');
    this.runScreen.classList.add('active');
    this.pauseMenu.classList.remove('active');

    this.resetSession();
    await this.acquireWakeLock();

    this.state = 'countdown';
    await this.countdown();
    if (this.state !== 'countdown') return;
    this.state = 'running';
    this.startAt = performance.now();
    this.startLimitTimers();
    this.showNext();
  }

  resetSession() {
    this.attempts = [];
    this.acks = [];
    this.seqPos = 0;
    this.current = null;
    this.awaiting = false;
    this.lastAdvanceAt = 0;
    this.startAt = 0;
    this.endAt = 0;
    this.pausedTotal = 0;
    this.pauseStart = 0;
    this.timeLimitEndAt = 0;
    this.timeLimitTotalMs = 0;
    this.endReason = '';
    this.stopLimitTimer();
    this.timerRingWrap.style.display = 'none';
    this.timerEl.textContent = '';
    this.ringProgress.style.strokeDashoffset = String(RING_CIRC);
    this.hudEl.style.display = 'none';
  }

  async countdown() {
    this.countdownEl.style.display = '';
    this.runScreen.style.background = '';
    this.nameOverlay.textContent = '';
    for (const n of [3, 2, 1]) {
      this.countdownEl.textContent = String(n);
      await sleep(700);
      if (this.state !== 'countdown') break;
    }
    this.countdownEl.style.display = 'none';
  }

  pickStimulus() {
    if (this.cfg.order === 'sequence') {
      const seq = this.sequenceColors();
      if (!seq.length) return this.activeColors()[0];
      const color = seq[this.seqPos % seq.length];
      this.seqPos++;
      return color;
    }
    const active = this.activeColors();
    let candidates = active;
    if (active.length > 2 && this.current) {
      candidates = active.filter(c => c.hex !== this.current.hex);
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  showNext() {
    if (this.state !== 'running') return;
    if (this.isSequenceDone()) { this.endSession('sequence'); return; }
    const stim = this.pickStimulus();
    if (!stim) return;
    this.current = stim;
    this.currentTOn = performance.now();
    this.awaiting = true;
    this.renderFlood(stim);
    if (this.cfg.speakNames) this.speak(stim.name);
    this.updateHud();
    if (this.cfg.timing === 'pace') this.schedulePace();
  }

  showBlank() {
    this.awaiting = false;
    this.runScreen.style.background = '';
    this.nameOverlay.textContent = '';
  }

  renderFlood(color) {
    this.runScreen.style.background = color.hex;
    this.nameOverlay.textContent = color.name || '';
  }

  schedulePace() {
    const dur = rand(PACE_MS[0], PACE_MS[1]);
    const gap = rand(GAP_MS[0], GAP_MS[1]);
    this.timerA = setTimeout(() => {
      if (this.state !== 'running') return;
      this.showBlank();
      this.timerB = setTimeout(() => {
        if (this.state === 'running') this.showNext();
      }, gap);
    }, Math.max(dur - gap, 500));
  }

  clearTimers() {
    clearTimeout(this.timerA);
    clearTimeout(this.timerB);
    this.timerA = null;
    this.timerB = null;
  }

  isSequenceDone() {
    if (this.cfg.order !== 'sequence' || !this.cfg.passes) return false;
    const len = this.sequenceColors().length;
    return len > 0 && this.seqPos >= len * this.cfg.passes;
  }

  startLimitTimers() {
    const timed = this.cfg.endMode === 'time' || this.cfg.endMode === 'either';
    if (timed) {
      this.timeLimitTotalMs = this.cfg.endMs;
      this.timeLimitEndAt = performance.now() + this.cfg.endMs;
    }
    this.timerRingWrap.style.display = '';
    this.updateTimerDisplay();
    clearInterval(this.timerId);
    this.timerId = setInterval(() => this.tickTimer(), 200);
  }

  elapsedMs() {
    const ref = this.state === 'paused' ? this.pauseStart : performance.now();
    return Math.max(0, ref - this.startAt - this.pausedTotal);
  }

  updateTimerDisplay() {
    if (this.timeLimitEndAt) {
      const total = this.timeLimitTotalMs || this.cfg.endMs;
      const left = Math.max(0, this.timeLimitEndAt - performance.now());
      const elapsed = Math.min(total, Math.max(0, total - left));
      this.timerEl.textContent = `${formatDuration(elapsed)}/${formatDuration(total)}`;
      this.ringProgress.style.display = '';
      this.ringProgress.style.strokeDashoffset = String(RING_CIRC * (1 - elapsed / total));
    } else {
      this.timerEl.textContent = formatDuration(this.elapsedMs());
      this.ringProgress.style.display = 'none';
    }
  }

  tickTimer() {
    if (this.state !== 'running') return;
    this.updateTimerDisplay();
    if (this.timeLimitEndAt && performance.now() >= this.timeLimitEndAt) this.endSession('time');
  }

  stopLimitTimer() {
    clearInterval(this.timerId);
    this.timerId = null;
  }

  advance(source, evt) {
    if (this.leavePending) return;
    if (this.state !== 'running' || !this.awaiting) return;
    if (evt && evt.repeat) return;
    const now = performance.now();
    if (now - this.lastAdvanceAt < DEBOUNCE_MS) return;
    this.lastAdvanceAt = now;

    const dt = now - this.currentTOn;
    const kind = dt < EARLY_MS ? 'early' : 'rep';
    this.attempts.push({ dt, hex: this.current.hex, name: this.displayName(this.current), kind, source });
    this.awaiting = false;
    this.clearTimers();

    if (this.cfg.timing === 'manual') {
      if (kind === 'rep' && this.repTargetReached()) {
        this.updateHud();
        this.endSession('reps');
        return;
      }
      this.updateHud();
      this.showBlank();
      const gap = rand(GAP_MS[0], GAP_MS[1]);
      this.timerB = setTimeout(() => {
        if (this.state === 'running') this.showNext();
      }, gap);
    } else {
      if (kind === 'rep') {
        this.acks.push(dt);
        if (this.repTargetReached()) {
          this.updateHud();
          this.endSession('reps');
          return;
        }
      }
      this.updateHud();
      this.flashAck();
    }
  }

  repTargetReached() {
    if (this.cfg.endMode !== 'reps' && this.cfg.endMode !== 'either') return false;
    return this.attempts.filter(a => a.kind === 'rep').length >= this.cfg.endReps;
  }

  flashAck() {
    this.runScreen.classList.add('ack');
    setTimeout(() => this.runScreen.classList.remove('ack'), 70);
  }

  updateHud() {
    if (this.state === 'done') {
      this.hudEl.style.display = 'none';
      return;
    }
    const reps = this.attempts.filter(a => a.kind === 'rep');
    const repsLimited = this.cfg.endMode === 'reps' || this.cfg.endMode === 'either';
    let text = repsLimited ? `R${reps.length}/${this.cfg.endReps}` : `R${reps.length}`;
    if (this.cfg.timing === 'manual' && reps.length) {
      text += ` · ${formatSecs(reps[reps.length - 1].dt)}`;
    }
    this.hudEl.textContent = text;
    this.hudEl.style.display = '';
  }

  // ── Pause / end ───────────────────────────────────────────

  openPause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.pauseStart = performance.now();
    this.clearTimers();
    this.pauseMenu.classList.add('active');
    const resumeBtn = $('#resumeBtn');
    if (resumeBtn) resumeBtn.focus();
  }

  dismissPauseFocus() {
    const ae = document.activeElement;
    if (ae && this.pauseMenu.contains && this.pauseMenu.contains(ae)) ae.blur();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.dismissPauseFocus();
    const pausedDur = performance.now() - this.pauseStart;
    this.pausedTotal += pausedDur;
    if (this.timeLimitEndAt) this.timeLimitEndAt += pausedDur;
    this.updateTimerDisplay();
    this.pauseMenu.classList.remove('active');
    this.state = 'running';
    if (this.current) {
      this.currentTOn = performance.now();
      this.awaiting = true;
      this.renderFlood(this.current);
      if (this.cfg.timing === 'pace') this.schedulePace();
    } else {
      this.showNext();
    }
  }

  restartSession() {
    if (this.state !== 'paused') return;
    this.dismissPauseFocus();
    this.clearTimers();
    this.releaseWakeLock();
    this.pauseMenu.classList.remove('active');
    this.startSession();
  }

  endSession(reason = 'manual') {
    if (this.state === 'done') return;
    this.dismissPauseFocus();
    this.endReason = reason;
    this.state = 'done';
    this.endAt = performance.now();
    this.clearTimers();
    this.stopLimitTimer();
    this.pauseMenu.classList.remove('active');
    this.runScreen.classList.remove('active');
    this.runScreen.style.background = '';
    this.nameOverlay.textContent = '';
    this.releaseWakeLock();
    this.showResults();
  }

  exitSession() {
    if (this.state === 'done') return;
    this.dismissPauseFocus();
    this.state = 'setup';
    this.clearTimers();
    this.stopLimitTimer();
    this.pauseMenu.classList.remove('active');
    this.runScreen.classList.remove('active');
    this.runScreen.style.background = '';
    this.nameOverlay.textContent = '';
    this.releaseWakeLock();
    this.showSetup();
  }

  showSetup() {
    this.state = 'setup';
    this.runScreen.classList.remove('active');
    this.resultsScreen.classList.remove('active');
    this.setupScreen.classList.add('active');
    this.refreshSetupState();
  }

  // ── Results ───────────────────────────────────────────────

  showResults() {
    const reps = this.attempts.filter(a => a.kind === 'rep');
    const times = reps.map(a => a.dt);
    const activeMs = Math.max(1, (this.endAt || performance.now()) - this.startAt - this.pausedTotal);
    const rate = times.length ? (times.length / (activeMs / 60000)) : 0;
    const med = median(times);
    const fast = times.length ? Math.min(...times) : null;

    const stats = [
      { label: 'Reps', value: String(times.length) },
      { label: 'Duration', value: formatDuration(activeMs) },
      { label: 'Reps / min', value: times.length ? rate.toFixed(1) : '—' },
      { label: 'Median rep', value: formatSecs(med) },
      { label: 'Fastest', value: formatSecs(fast) },
    ];
    if (this.cfg.timing === 'pace' && this.acks.length) {
      stats.push({ label: 'Acks (median)', value: formatSecs(median(this.acks)) });
    }
    this.statsGrid.innerHTML = '';
    for (const st of stats) {
      const div = document.createElement('div');
      div.className = 'stat';
      div.textContent = st.label;
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = st.value;
      div.appendChild(num);
      this.statsGrid.appendChild(div);
    }

    // Per-color medians (palette order)
    const active = this.activeColors();
    const byHex = new Map();
    for (const a of reps) {
      if (!byHex.has(a.hex)) byHex.set(a.hex, []);
      byHex.get(a.hex).push(a.dt);
    }
    this.perColorList.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = 'Per color (median rep)';
    this.perColorList.appendChild(label);
    let anyRows = false;
    for (const c of active) {
      const list = byHex.get(c.hex);
      if (!list || !list.length) continue;
      anyRows = true;
      const row = document.createElement('div');
      row.className = 'color-row';
      const left = document.createElement('span');
      left.className = 'swatch';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = c.hex;
      left.appendChild(dot);
      left.appendChild(document.createTextNode(this.displayName(c)));
      const right = document.createElement('span');
      right.className = 'med';
      right.textContent = formatSecs(median(list));
      row.appendChild(left);
      row.appendChild(right);
      this.perColorList.appendChild(row);
    }
    if (!anyRows) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No reps recorded.';
      this.perColorList.appendChild(p);
    }

    // Copy summary
    const mode = this.cfg.timing === 'manual' ? 'Manual' : 'Pace';
    const order = this.cfg.order === 'random' ? 'Random' : 'Sequence';
    const lines = [
      `Color Switcher · ${mode} · ${order} · ${active.length} colors · ${formatDuration(activeMs)}`,
      times.length
        ? `${times.length} reps · ${rate.toFixed(1)}/min · median ${formatSecs(med)} · fastest ${formatSecs(fast)}`
        : 'No reps recorded',
    ];
    if (times.length) {
      const perColor = active
        .map(c => [c, byHex.get(c.hex)])
        .filter(([, l]) => l && l.length)
        .map(([c, l]) => `${this.displayName(c)} ${formatSecs(median(l))}`)
        .join(' · ');
      if (perColor) lines.push(`Per color: ${perColor}`);
    }
    if (this.cfg.timing === 'pace' && this.acks.length) {
      lines.push(`Acks: ${this.acks.length} · median ${formatSecs(median(this.acks))}`);
    }
    this.summaryText.value = lines.join('\n');

    this.resultsScreen.classList.add('active');
  }

  copySummary() {
    const text = this.summaryText.value;
    const done = () => {
      const btn = $('#copyBtn');
      btn.textContent = 'Copied';
      const status = $('#copyStatus');
      if (status) status.textContent = 'Summary copied to clipboard';
      setTimeout(() => {
        btn.textContent = 'Copy';
        if (status) status.textContent = '';
      }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => this.selectSummary());
    } else {
      this.selectSummary();
    }
  }

  selectSummary() {
    this.summaryText.focus();
    this.summaryText.select();
  }

  // ── Audio ─────────────────────────────────────────────────

  speak(name) {
    if (!name || name.startsWith('#')) return;
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(name);
      u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  // ── Wake lock ─────────────────────────────────────────────

  async acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) { /* unsupported or denied */ }
  }

  releaseWakeLock() {
    try { this.wakeLock && this.wakeLock.release(); } catch (e) { /* ignore */ }
    this.wakeLock = null;
  }
}

// ── Boot ────────────────────────────────────────────────────

/** Called by src/scripts.js when the Color Switcher page is present. */
export function initColorSwitcher() {
  const app = new ColorSwitcherApp();
  app.init();
  return app;
}
