/**
 * Color Switcher — full-screen color pacer for dot/cone drills (experimental tool).
 *
 * Behaviour: the screen floods with one color = "go to that dot"; any input
 * (tap, any key / Bluetooth clicker, gamepad button, paired remote clicker)
 * advances to the next color. Manual or auto-advance timing × Random or Sequence order.
 * Auto mode: colors advance every paceMs; each full color presentation counts as one
 * rep (enforces rep targets); taps are acknowledgements and never stall the pace chain.
 * ⏸ pauses, ✕ ends; mute (spoken color names) lives on the run screen.
 *
 * No dependencies. No network. No Firebase — storage is settings and session
 * history in localStorage only. Remote clicker pairing is a separate
 * optional module (colorSwitcherRemote.js) that hooks into advance('remote').
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
const LS_KEY = 'colorSwitcher.config.v1';
const LS_HISTORY_KEY = 'cs-history-v1'; // recent sessions (local only)
const HISTORY_MAX = 20;
const GAP_MS = [150, 400];    // blank beat between colors
const RING_CIRC = 2 * Math.PI * 40; // timer ring circumference (r = 40 in the SVG)

// Value ranges — sliders keep their coarse ranges; typed entry may go wider.
const TIME_MIN = 15000, TIME_MAX = 3600000;   // 15 s – 60 min
const PACE_MIN = 500, PACE_MAX = 60000;       // 0.5 s – 60 s
const REPS_MAX = 999;

const DEFAULT_CONFIG = {
  presets: Object.fromEntries(PRESETS.map(p => [p.hex, p.on])),
  custom: [],              // { hex, label, on }
  timing: 'manual',        // 'manual' | 'pace'
  paceMs: 3000,            // auto-advance interval between colors (ms)
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
    this.pauseRunBtn = $('#pauseRunBtn');
    this.repChart = $('#repChart');
    this.chartCard = $('#chartCard');
    this.chartNote = $('#chartNote');
    this.historyList = $('#historyList');
    this.timerEl = $('#timer');
    this.timerRingWrap = $('#timerRingWrap');
    this.ringProgress = $('#ringProgress');
    this.timeSlider = $('#timeSlider');
    this.timeVal = $('#timeVal');
    this.paceRow = $('#paceRow');
    this.paceSlider = $('#paceSlider');
    this.paceVal = $('#paceVal');
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
    this._onPointerUpRun = this._onPointerUpRun.bind(this);
    this._loop = this._loop.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
  }

  // ── Config ────────────────────────────────────────────────

  sanitizeConfig(saved) {
    const merged = deepCopy(DEFAULT_CONFIG);
    if (!saved || typeof saved !== 'object') return merged;
    if (saved.presets && typeof saved.presets === 'object') merged.presets = { ...merged.presets, ...saved.presets };
    if (Array.isArray(saved.custom)) merged.custom = saved.custom.filter(c => c && typeof c.hex === 'string');
    if (saved.timing === 'pace' || saved.timing === 'manual') merged.timing = saved.timing;
    if (saved.order === 'sequence' || saved.order === 'random') merged.order = saved.order;
    if (Array.isArray(saved.sequence)) merged.sequence = saved.sequence.filter(h => typeof h === 'string');
    if (['open', 'time', 'reps', 'either'].includes(saved.endMode)) merged.endMode = saved.endMode;
    if (typeof saved.endMs === 'number' && saved.endMs >= TIME_MIN && saved.endMs <= TIME_MAX) merged.endMs = saved.endMs;
    if (typeof saved.paceMs === 'number' && saved.paceMs >= PACE_MIN && saved.paceMs <= PACE_MAX) merged.paceMs = saved.paceMs;
    if (typeof saved.endReps === 'number' && saved.endReps >= 1 && saved.endReps <= REPS_MAX) merged.endReps = saved.endReps;
    if ([0, 1, 2, 3].includes(saved.passes)) merged.passes = saved.passes;
    for (const k of ['speakNames']) {
      if (typeof saved[k] === 'boolean') merged[k] = saved[k];
    }
    return merged;
  }

  loadConfig() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      this.cfg = this.sanitizeConfig(JSON.parse(raw));
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
    try { localStorage.removeItem('cs-sets-v1'); } catch (e) { /* ignore */ }
    this.applyConfigToUI();
    this.bindSetupEvents();
    this.renderHistory();

    // Global input listeners (routed by state)
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('pointerdown', (e) => {
      if (this.state !== 'setup') return;
      if (e.target.closest('button, input, label, a')) return;
      this.flashIndicator(this.indTap);
    });
    this.runScreen.addEventListener('pointerup', this._onPointerUpRun);
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
    this.syncSlider(this.timeSlider, this.cfg.endMs);
    this.timeSlider.setAttribute('aria-valuetext', formatDuration(this.cfg.endMs));
    this.timeVal.textContent = formatDuration(this.cfg.endMs);
    this.syncSlider(this.paceSlider, this.cfg.paceMs);
    this.paceSlider.setAttribute('aria-valuetext', `${this.paceLabel()} interval`);
    this.paceVal.textContent = this.paceLabel();
    this.syncSlider(this.repsSlider, this.cfg.endReps);
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
    this.paceRow.style.display = this.cfg.timing === 'pace' ? '' : 'none';
    this.timeRow.style.display = (m === 'time' || m === 'either') ? '' : 'none';
    this.repsRow.style.display = (m === 'reps' || m === 'either') ? '' : 'none';
    this.passesRow.style.display = this.cfg.order === 'sequence' ? '' : 'none';
  }

  paceLabel() {
    const s = this.cfg.paceMs / 1000;
    return `${parseFloat(s.toFixed(2))}s`;
  }

  /** Pins a slider at its own edge when the value lives beyond its range. */
  syncSlider(slider, value) {
    const readBound = (raw) => {
      if (raw === undefined || raw === null || raw === '') return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };
    const min = readBound(slider.min);
    const max = readBound(slider.max);
    let v = value;
    if (min !== null) v = Math.max(min, v);
    if (max !== null) v = Math.min(max, v);
    slider.value = String(v);
  }

  setPaceMs(ms, persist = true, snap = true) {
    const clamped = Math.min(PACE_MAX, Math.max(PACE_MIN, Math.round(ms)));
    this.cfg.paceMs = snap ? Math.round(clamped / 500) * 500 : clamped;
    this.syncSlider(this.paceSlider, this.cfg.paceMs);
    this.paceSlider.setAttribute('aria-valuetext', `${this.paceLabel()} interval`);
    this.paceVal.textContent = this.paceLabel();
    this.updateSummaryLine();
    if (persist) this.saveConfig();
  }

  syncStepperBounds() {
    this.repsMinus.disabled = this.cfg.endReps <= 1;
    this.repsPlus.disabled = this.cfg.endReps >= REPS_MAX;
  }

  setTimeMs(ms, persist = true, snap = true) {
    const clamped = Math.min(TIME_MAX, Math.max(TIME_MIN, Math.round(ms)));
    this.cfg.endMs = snap ? Math.round(clamped / 15000) * 15000 : clamped;
    this.syncSlider(this.timeSlider, this.cfg.endMs);
    this.timeSlider.setAttribute('aria-valuetext', formatDuration(this.cfg.endMs));
    this.timeVal.textContent = formatDuration(this.cfg.endMs);
    for (const btn of this.timePills.querySelectorAll('.pill-btn')) {
      this.markPill(btn, Number(btn.dataset.ms) === this.cfg.endMs);
    }
    this.updateSummaryLine();
    if (persist) this.saveConfig();
  }

  setReps(n, persist = true) {
    this.cfg.endReps = Math.min(REPS_MAX, Math.max(1, Math.round(n)));
    this.syncSlider(this.repsSlider, this.cfg.endReps);
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
    const timing = this.cfg.timing === 'manual' ? 'Manual' : `Auto ${this.paceLabel()}`;
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
    this.paceSlider.addEventListener('input', () => this.setPaceMs(Number(this.paceSlider.value), false));
    this.paceSlider.addEventListener('change', () => this.saveConfig());
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
    this.pauseRunBtn.addEventListener('click', () => this.openPause());

    this.bindEditableValues();

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

  _onPointerUpRun(e) {
    if (this.state !== 'running') return;
    if (e.target.closest && (e.target.closest('#runControls') || e.target.closest('#speakBtn'))) return;
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
    const dur = this.cfg.paceMs;
    const gap = rand(GAP_MS[0], GAP_MS[1]);
    this.timerA = setTimeout(() => {
      if (this.state !== 'running') return;
      if (this.recordPresentation()) {
        this.updateHud();
        this.endSession('reps');
        return;
      }
      this.showBlank();
      this.timerB = setTimeout(() => {
        if (this.state === 'running') this.showNext();
      }, gap);
    }, Math.max(dur - gap, 500));
  }

  // Auto mode: one rep = one full color presentation (interval elapsed).
  // Returns true when the rep target has been reached.
  recordPresentation() {
    if (!this.current) return false;
    const dt = performance.now() - this.currentTOn;
    this.attempts.push({ dt, hex: this.current.hex, name: this.displayName(this.current), kind: 'rep', source: 'pace' });
    return this.repTargetReached();
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
    this.awaiting = false;

    if (this.cfg.timing === 'manual') {
      this.attempts.push({ dt, hex: this.current.hex, name: this.displayName(this.current), kind, source });
      this.clearTimers();
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
      // Auto advance: a tap acknowledges the current color — it must NOT
      // stall the pace chain; reps are counted per color presentation.
      if (kind === 'rep') this.acks.push(dt);
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
    this.recordHistory();
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

  statsFor(times, activeMs) {
    const n = times.length;
    const avg = n ? times.reduce((s, d) => s + d, 0) / n : null;
    return {
      n,
      avg,
      fast: n ? Math.min(...times) : null,
      slow: n ? Math.max(...times) : null,
      rate: n ? n / (activeMs / 60000) : 0,
    };
  }

  renderStatGrid(times, activeMs) {
    const s = this.statsFor(times, activeMs);
    const stats = [
      { label: 'Reps', value: String(s.n) },
      { label: 'Duration', value: formatDuration(activeMs) },
      { label: 'Avg rep', value: formatSecs(s.avg) },
      { label: 'Fastest', value: formatSecs(s.fast) },
      { label: 'Slowest', value: formatSecs(s.slow) },
    ];
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
  }

  renderRepChart(times) {
    const shown = times.slice(-30);
    this.chartCard.style.display = shown.length ? '' : 'none';
    if (!shown.length) return;
    const W = 300, baseY = 62, maxBar = 52;
    const max = Math.max(...shown);
    const bw = W / shown.length;
    let bars = '';
    shown.forEach((dt, i) => {
      const h = Math.max(2, Math.round((dt / max) * maxBar));
      const x = (i * bw + 1).toFixed(2);
      const w = Math.max(1.5, bw - 2).toFixed(2);
      bars += `<rect class="bar" x="${x}" y="${baseY - h}" width="${w}" height="${h}" rx="1.5"></rect>`;
    });
    this.repChart.innerHTML =
      `<svg viewBox="0 0 ${W} ${baseY + 16}" role="img" aria-label="Rep durations, ${shown.length} bars">` +
      `<line class="axis" x1="0" y1="${baseY}" x2="${W}" y2="${baseY}"></line>` +
      bars +
      `<text class="lbl" x="0" y="${baseY + 12}">fastest ${formatSecs(Math.min(...shown))}</text>` +
      `<text class="lbl" x="${W}" y="${baseY + 12}" text-anchor="end">slowest ${formatSecs(Math.max(...shown))}</text>` +
      `</svg>`;
    this.chartNote.textContent = times.length > 30 ? `last 30 of ${times.length}` : '';
  }

  showResults() {
    const reps = this.attempts.filter(a => a.kind === 'rep');
    const times = reps.map(a => a.dt);
    const activeMs = Math.max(1, (this.endAt || performance.now()) - this.startAt - this.pausedTotal);
    const s = this.statsFor(times, activeMs);

    this.renderStatGrid(times, activeMs);
    this.renderRepChart(times);

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
    const mode = this.cfg.timing === 'manual' ? 'Manual' : `Auto ${this.paceLabel()}`;
    const order = this.cfg.order === 'random' ? 'Random' : 'Sequence';
    const lines = [
      `Color Switcher · ${mode} · ${order} · ${active.length} colors · ${formatDuration(activeMs)}`,
      times.length
        ? `${s.n} reps · avg ${formatSecs(s.avg)} · fastest ${formatSecs(s.fast)} · slowest ${formatSecs(s.slow)}`
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

  // ── Session history (localStorage only) ──────

  readStore(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  historyRecords() {
    const data = this.readStore(LS_HISTORY_KEY);
    if (!data || !Array.isArray(data.records)) return [];
    return data.records.filter(r => r && typeof r === 'object' && typeof r.reps === 'number');
  }

  recordHistory() {
    const times = this.attempts.filter(a => a.kind === 'rep').map(a => a.dt);
    if (!times.length) return; // skip empty/aborted sessions
    const activeMs = Math.max(1, (this.endAt || performance.now()) - this.startAt - this.pausedTotal);
    const avg = times.reduce((s, d) => s + d, 0) / times.length;
    const records = this.historyRecords();
    records.unshift({
      at: Date.now(),
      timing: this.cfg.timing,
      paceMs: this.cfg.paceMs,
      order: this.cfg.order,
      colors: this.activeColors().length,
      reps: times.length,
      durMs: Math.round(activeMs),
      avg: Math.round(avg),
      fast: Math.round(Math.min(...times)),
      slow: Math.round(Math.max(...times)),
    });
    this.writeStore(LS_HISTORY_KEY, { v: 1, records: records.slice(0, HISTORY_MAX) });
    this.renderHistory();
  }

  renderHistory() {
    const records = this.historyRecords();
    this.historyList.innerHTML = '';
    if (!records.length) {
      const p = document.createElement('p');
      p.className = 'history-empty';
      p.textContent = 'No sessions recorded yet.';
      this.historyList.appendChild(p);
      return;
    }
    for (const r of records) {
      const row = document.createElement('div');
      row.className = 'history-row';
      const date = document.createElement('span');
      date.className = 'h-date';
      date.textContent = new Date(r.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const main = document.createElement('span');
      main.className = 'h-main';
      const mode = r.timing === 'manual' ? 'Manual' : 'Auto';
      main.textContent = `${mode} · ${r.order === 'sequence' ? 'Seq' : 'Rnd'} · ${r.colors}c`;
      const metric = document.createElement('span');
      metric.className = 'h-metric';
      metric.textContent = `${r.reps} reps · avg ${formatSecs(r.avg)}`;
      row.appendChild(date);
      row.appendChild(main);
      row.appendChild(metric);
      this.historyList.appendChild(row);
    }
  }

  // ── Typed value entry ─────────────────────────────────────

  /**
   * Makes a value span tap-to-edit: opens an inline number input, commits on
   * Enter/blur, cancels on Escape. Ranges are wider than the sliders'.
   */
  makeEditable(el, opts) {
    if (!el) return;
    el.classList.add('val-editable');
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Edit ${opts.name}`);

    const open = () => {
      if (el._editing) return;
      el._editing = true;
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'val-edit';
      input.inputMode = 'decimal';
      input.min = String(opts.inputMin);
      input.max = String(opts.inputMax);
      input.step = String(opts.step || 1);
      input.value = String(opts.toInput(opts.current()));
      input.setAttribute('aria-label', `${opts.name} value`);
      el.textContent = '';
      el.appendChild(input);
      if (input.focus) input.focus();
      if (input.select) input.select();
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        const n = parseFloat(input.value);
        el._editing = false;
        if (ok && Number.isFinite(n)) opts.commit(n);
        else el.textContent = String(opts.toInput(opts.current()));
      };
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { finish(true); }
        else if (e.key === 'Escape') { finish(false); }
      });
      input.addEventListener('blur', () => finish(true));
    };

    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  }

  bindEditableValues() {
    this.makeEditable(this.timeVal, {
      name: 'time limit', inputMin: 0.25, inputMax: 60, step: 0.25,
      current: () => this.cfg.endMs,
      toInput: (ms) => parseFloat((ms / 60000).toFixed(3)),
      commit: (minutes) => this.setTimeMs(Math.round(minutes * 60000), true, false),
    });
    this.makeEditable(this.paceVal, {
      name: 'auto-advance interval', inputMin: 0.5, inputMax: 60, step: 0.1,
      current: () => this.cfg.paceMs,
      toInput: (ms) => parseFloat((ms / 1000).toFixed(2)),
      commit: (secs) => this.setPaceMs(Math.round(secs * 1000), true, false),
    });
    this.makeEditable(this.repsVal, {
      name: 'rep target', inputMin: 1, inputMax: REPS_MAX, step: 1,
      current: () => this.cfg.endReps,
      toInput: (n) => n,
      commit: (n) => this.setReps(n, true),
    });
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
