/**
 * Color Switcher — full-screen color pacer for dot/cone drills (experimental tool).
 *
 * Behaviour: the screen floods with one color = "go to that dot"; any input
 * (tap, any key / Bluetooth clicker, gamepad button, optional media remote)
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
  showName: true,
  speakNames: false,
  beeps: false,
  remote: false,
  hud: false,
  showTime: false,         // running time in the HUD
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

function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function sd(arr) {
  if (arr.length < 2) return null;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1));
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

/** Minimal silent (8-bit PCM) WAV data-URI for keeping a media session alive. */
let silentWavCache = null;
function silentWavDataUri(seconds = 1, sampleRate = 8000) {
  if (silentWavCache) return silentWavCache;
  const dataSize = Math.floor(seconds * sampleRate);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);          // fmt chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);  // byte rate (8-bit mono)
  view.setUint16(32, 1, true);           // block align
  view.setUint16(34, 8, true);           // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  const bytes = new Uint8Array(buffer);
  for (let i = 44; i < bytes.length; i++) bytes[i] = 128; // 8-bit silence
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  silentWavCache = 'data:audio/wav;base64,' + btoa(binary);
  return silentWavCache;
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
    this.previewTimer = null;
    this.previewIdx = 0;
    this.lpTimer = null;         // long-press timer
    this.lpFired = false;
    this.padPrev = {};           // gamepad edge state
    this.indicatorTimers = new Map();
    this.audioCtx = null;
    this.silentAudio = null;
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
    this.wizNextBtn = $('#wizNextBtn');
    this.wizBackBtn = $('#wizBackBtn');
    this.wizCount = $('#wizCount');
    this.wizDots = $('#wizDots');
    this.customRow = $('#customRow');
    this.summaryLine = $('#summaryLine');
    this.steps = Array.from(document.querySelectorAll('#setupScreen .step'));
    this.step = 0;
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
    this.previewBtn = $('#previewBtn');

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
      for (const k of ['showName', 'speakNames', 'beeps', 'remote', 'hud', 'showTime']) {
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
    this.goStep(0);

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
    // Toggles
    $('#showNameToggle').checked = this.cfg.showName;
    $('#speakToggle').checked = this.cfg.speakNames;
    $('#beepToggle').checked = this.cfg.beeps;
    $('#remoteToggle').checked = this.cfg.remote;
    $('#hudToggle').checked = this.cfg.hud;
    $('#showTimeToggle').checked = this.cfg.showTime;
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
    chip.className = 'chip' + (on ? ' on' : '');
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
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'seq-chip';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = hex;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(this.displayName(color)));
      const x = document.createElement('span');
      x.className = 'x';
      x.textContent = '✕';
      chip.appendChild(x);
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
    this.refreshStepState();
  }

  // ── Wizard (setup steps) ──────────────────────────────────

  goStep(n) {
    const count = this.steps.length;
    if (!count) return;
    this.step = Math.max(0, Math.min(n, count - 1));
    this.steps.forEach((el, i) => el.classList.toggle('active', i === this.step));
    this.wizCount.textContent = `${this.step + 1}/${count}`;
    Array.from(this.wizDots.children).forEach((d, i) => d.classList.toggle('active', i <= this.step));
    this.wizBackBtn.style.visibility = this.step === 0 ? 'hidden' : '';
    this.wizNextBtn.textContent = this.step === count - 1 ? 'Start' : 'Next';
    this.refreshStepState();
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

  refreshStepState() {
    let msg = '';
    if (this.step === 0) {
      if (!this.activeColors().length) msg = 'Select at least one color in play.';
    } else if (this.step === 1) {
      msg = this.drillMsg(this.activeColors());
    } else {
      msg = this.finalMsg();
    }
    this.setupMsg.textContent = msg;
    this.wizNextBtn.disabled = !!msg;
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
    this.wizNextBtn.disabled = !!msg;
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
    const bindToggle = (id, key) => {
      $(id).addEventListener('change', (e) => {
        this.cfg[key] = e.target.checked;
        this.saveConfig();
      });
    };
    bindToggle('#showNameToggle', 'showName');
    bindToggle('#speakToggle', 'speakNames');
    bindToggle('#beepToggle', 'beeps');
    bindToggle('#remoteToggle', 'remote');
    bindToggle('#hudToggle', 'hud');
    bindToggle('#showTimeToggle', 'showTime');

    this.wizNextBtn.addEventListener('click', () => {
      if (this.step === this.steps.length - 1) this.startSession();
      else this.goStep(this.step + 1);
    });
    this.wizBackBtn.addEventListener('click', () => this.goStep(this.step - 1));
    $('#resetBtn').addEventListener('click', () => {
      this.cfg = deepCopy(DEFAULT_CONFIG);
      this.saveConfig();
      this.applyConfigToUI();
      this.goStep(0);
    });

    // Pause menu
    $('#resumeBtn').addEventListener('click', () => this.resume());
    $('#restartBtn').addEventListener('click', () => this.restartSession());
    $('#endBtn').addEventListener('click', () => this.endSession('manual'));
    $('#settingsBtn').addEventListener('click', () => this.exitSession());

    // Run screen end + preview
    this.endRunBtn.addEventListener('click', () => this.endSession('manual'));
    this.previewBtn.addEventListener('click', () => this.startPreview());

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
    if (this.state === 'running') {
      if (e.key === 'Escape') { this.openPause(); return; }
      this.advance('key', e);
    } else if (this.state === 'paused') {
      if (e.key === 'Escape') this.resume();
    } else if (this.state === 'preview') {
      this.stopPreview();
    } else if (this.state === 'setup') {
      this.flashIndicator(this.indKey);
    }
  }

  _onPointerDownRun(e) {
    if (this.state === 'preview') { this.stopPreview(); return; }
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

  // ── Session lifecycle ─────────────────────────────────────

  async startSession() {
    if (!this.validate()) return;

    this.setupScreen.classList.remove('active');
    this.resultsScreen.classList.remove('active');
    this.runScreen.classList.remove('preview');
    this.runScreen.classList.add('active');
    this.pauseMenu.classList.remove('active');

    this.resetSession();
    this.initAudio();                       // inside user gesture (Start click)
    if (this.cfg.remote) this.enableRemote();
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
    if (this.cfg.beeps) this.beep();
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
    const showName = this.cfg.showName && color.name;
    this.nameOverlay.textContent = showName ? color.name : '';
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
      this.timerRingWrap.style.display = '';
      this.updateTimerDisplay();
    }
    if (timed || this.cfg.showTime) {
      clearInterval(this.timerId);
      this.timerId = setInterval(() => this.tickTimer(), 200);
    }
  }

  elapsedMs() {
    const ref = this.state === 'paused' ? this.pauseStart : performance.now();
    return Math.max(0, ref - this.startAt - this.pausedTotal);
  }

  updateTimerDisplay() {
    if (!this.timeLimitEndAt) return;
    const total = this.timeLimitTotalMs || this.cfg.endMs;
    const left = Math.max(0, this.timeLimitEndAt - performance.now());
    const elapsed = Math.min(total, Math.max(0, total - left));
    this.timerEl.textContent = `${formatDuration(elapsed)}/${formatDuration(total)}`;
    this.ringProgress.style.strokeDashoffset = String(RING_CIRC * (1 - elapsed / total));
  }

  tickTimer() {
    if (this.state !== 'running') return;
    if (this.timeLimitEndAt) {
      this.updateTimerDisplay();
      if (performance.now() >= this.timeLimitEndAt) { this.endSession('time'); return; }
    }
    if (this.cfg.showTime) this.updateHud();
  }

  stopLimitTimer() {
    clearInterval(this.timerId);
    this.timerId = null;
  }

  advance(source, evt) {
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
    setTimeout(() => this.runScreen.classList.remove('ack'), 90);
  }

  updateHud() {
    if (this.state === 'done') {
      this.hudEl.style.display = 'none';
      return;
    }
    const reps = this.attempts.filter(a => a.kind === 'rep');
    const repsLimited = this.cfg.endMode === 'reps' || this.cfg.endMode === 'either';
    if (!this.cfg.hud && !repsLimited && !this.cfg.showTime) {
      this.hudEl.style.display = 'none';
      return;
    }
    let text = repsLimited ? `R${reps.length}/${this.cfg.endReps}` : (this.cfg.hud ? `R${reps.length}` : '');
    if (this.cfg.timing === 'manual' && reps.length && (this.cfg.hud || repsLimited)) {
      text += ` · ${formatSecs(reps[reps.length - 1].dt)}`;
    }
    if (this.cfg.showTime) {
      const t = this.timeLabel();
      text = text ? `${text} · ${t}` : t;
    }
    this.hudEl.textContent = text;
    this.hudEl.style.display = '';
  }

  timeLabel() {
    if (this.timeLimitEndAt) {
      const total = this.timeLimitTotalMs;
      const left = Math.max(0, this.timeLimitEndAt - performance.now());
      return `${formatDuration(Math.min(total, total - left))}/${formatDuration(total)}`;
    }
    return formatDuration(this.elapsedMs());
  }

  // ── Color preview ─────────────────────────────────────────

  startPreview() {
    if (this.state !== 'setup') return;
    if (!this.activeColors().length) return;
    this.state = 'preview';
    this.previewIdx = 0;
    this.setupScreen.classList.remove('active');
    this.runScreen.classList.add('active', 'preview');
    this.hudEl.style.display = 'none';
    this.countdownEl.style.display = 'none';
    this.previewNext();
  }

  previewNext() {
    if (this.state !== 'preview') return;
    const colors = this.activeColors();
    if (!colors.length) { this.stopPreview(); return; }
    const color = colors[this.previewIdx % colors.length];
    this.previewIdx++;
    this.renderFlood(color);
    this.previewTimer = setTimeout(() => this.previewNext(), 600);
  }

  stopPreview() {
    if (this.state !== 'preview') return;
    clearTimeout(this.previewTimer);
    this.previewTimer = null;
    this.runScreen.classList.remove('active', 'preview');
    this.runScreen.style.background = '';
    this.nameOverlay.textContent = '';
    this.showSetup();
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
    this.disableRemote();
    this.pauseMenu.classList.remove('active');
    this.startSession();
  }

  endSession(reason = 'manual') {
    if (this.state === 'done' || this.state === 'preview') return;
    this.dismissPauseFocus();
    this.endReason = reason;
    this.state = 'done';
    this.endAt = performance.now();
    this.clearTimers();
    this.stopLimitTimer();
    this.pauseMenu.classList.remove('active');
    this.runScreen.classList.remove('active', 'preview');
    this.runScreen.style.background = '';
    this.nameOverlay.textContent = '';
    this.releaseWakeLock();
    this.disableRemote();
    this.showResults();
  }

  exitSession() {
    if (this.state === 'done') return;
    this.dismissPauseFocus();
    this.state = 'setup';
    this.clearTimers();
    this.stopLimitTimer();
    this.pauseMenu.classList.remove('active');
    this.runScreen.classList.remove('active', 'preview');
    this.runScreen.style.background = '';
    this.nameOverlay.textContent = '';
    this.releaseWakeLock();
    this.disableRemote();
    this.showSetup();
  }

  showSetup() {
    this.state = 'setup';
    this.runScreen.classList.remove('active');
    this.resultsScreen.classList.remove('active');
    this.setupScreen.classList.add('active');
    this.goStep(0);
  }

  // ── Results ───────────────────────────────────────────────

  showResults() {
    const reps = this.attempts.filter(a => a.kind === 'rep');
    const times = reps.map(a => a.dt);
    const activeMs = Math.max(1, (this.endAt || performance.now()) - this.startAt - this.pausedTotal);
    const rate = times.length ? (times.length / (activeMs / 60000)) : 0;
    const med = median(times);
    const fast = times.length ? Math.min(...times) : null;
    const s = sd(times);
    const cv = (s != null && mean(times)) ? (s / mean(times)) * 100 : null;
    const earlyCount = this.attempts.filter(a => a.kind === 'early').length;

    const stats = [
      { label: 'Reps', value: String(times.length) },
      { label: 'Duration', value: formatDuration(activeMs) },
      { label: 'Reps / min', value: times.length ? rate.toFixed(1) : '—' },
      { label: 'Median rep', value: formatSecs(med) },
      { label: 'Fastest', value: formatSecs(fast) },
      { label: 'CV', value: cv == null ? '—' : cv.toFixed(0) + '%' },
      { label: 'Early inputs', value: String(earlyCount) },
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
    const reasonMap = { manual: 'manual end', time: 'time limit', reps: 'rep target', sequence: 'sequence complete' };
    const lines = [
      `Color Switcher — ${mode} · ${order} · ${active.length} colors`,
      `Ended by: ${reasonMap[this.endReason] || 'manual end'}`,
      `${times.length} reps in ${formatDuration(activeMs)}${times.length ? ` (${rate.toFixed(1)} reps/min)` : ''}`,
    ];
    if (times.length) {
      const perColor = active
        .map(c => [c, byHex.get(c.hex)])
        .filter(([, l]) => l && l.length)
        .map(([c, l]) => `${this.displayName(c)} ${formatSecs(median(l))}`)
        .join(' · ');
      lines.push(`Median rep ${formatSecs(med)} · fastest ${formatSecs(fast)}${cv == null ? '' : ` · CV ${cv.toFixed(0)}%`}`);
      if (perColor) lines.push(`Per color: ${perColor}`);
    }
    lines.push(`Early inputs: ${earlyCount}`);
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

  initAudio() {
    try {
      if (!this.audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) this.audioCtx = new Ctx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (e) { /* audio unavailable */ }
  }

  beep() {
    if (!this.audioCtx) return;
    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(gain).connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) { /* ignore */ }
  }

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

  // ── Remote (MediaSession) ─────────────────────────────────

  enableRemote() {
    if (!('mediaSession' in navigator)) return;
    try {
      this.silentAudio = new Audio(silentWavDataUri());
      this.silentAudio.loop = true;
      this.silentAudio.play().catch(() => {});
      if (window.MediaMetadata) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Color Switcher',
          artist: 'Clinic drill',
        });
      }
      const set = (action, handler) => {
        try { navigator.mediaSession.setActionHandler(action, handler); } catch (e) { /* unsupported */ }
      };
      set('play', () => { if (this.state === 'paused') this.resume(); });
      set('pause', () => this.openPause());
      set('nexttrack', () => { if (this.state === 'running' && this.awaiting) this.advance('remote'); });
    } catch (e) { /* ignore */ }
  }

  disableRemote() {
    if ('mediaSession' in navigator) {
      try {
        for (const a of ['play', 'pause', 'nexttrack']) {
          navigator.mediaSession.setActionHandler(a, null);
        }
        navigator.mediaSession.metadata = null;
      } catch (e) { /* ignore */ }
    }
    if (this.silentAudio) {
      try { this.silentAudio.pause(); this.silentAudio.src = ''; } catch (e) { /* ignore */ }
      this.silentAudio = null;
    }
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
