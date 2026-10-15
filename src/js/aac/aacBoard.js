/**
 * Speak Board — base board renderer, input dispatcher, and mode manager.
 *
 * Purpose:  render tiles, speak them on activation, route every input
 *           channel (touch, keyboard, direction pad, gaze Auto cursor,
 *           gaze Directional) through the same moveHighlight() / activate()
 *           pipeline, own calibration persistence (per-device, named user)
 *           and the Settings/Edit/About modals.
 * Consumes: voice.js (speak), calibration.js (fit math + flow),
 *           gazeEngine.js via events and a lazily-dynamically-imported
 *           module handle.
 * Emits:    nothing (listens to aac:gaze-* document events from the engine).
 * Owns:     board state, the live fits (state.fits.{gaze,head}) + their
 *           persistence, dwell/snap behavior, modal wiring, the pad
 *           visibility + mode pill, the "screen-rotated → recalibrate" hint.
 *
 * Board-facing fit contract (see calibration.js for the full story):
 * fits carry vw/vh stamps of the window they were made under; applyCalib
 * maps signal bundles → px (kind-aware). Cursor modes (auto/head) require a
 * fit — first Gaze use guides the user into calibration; Directional mode is
 * the calibration-free fallback. Saved fits never cross between named users.
 */
import * as speech from './voice.js';
import { escapeHtml } from '../utils/utils.js';
import { runCalibration, applyCalib, refineFitFromTap } from './calibration.js';
import { pickTile, recordOf } from './hitTest.js';
import { createDwellController } from './dwellController.js';

const CUSTOM_KEY = 'aac-custom-board';
const SETTINGS_KEY = 'aac-settings';
// Per-device, named-user calibration persistence (localStorage — same
// project storage approach as settings/custom board; no accounts/backend).
// Shape: { name, savedAt, vw, vh, fits: { gaze?, head? } }
const CALIB_KEY = 'aac-calib-profile';
// Pass-through: the worker's One Euro is the ONLY smoothing stage (the old
// comment here described a light EMA that 1.0 does not perform).
const POINT_SMOOTH = 1.0;
const FLASH_MS = 350;
// Hit-test geometry (see aac/hitTest.js): padded-rect snap + nearest-center
// halo. Overlaps resolve to the CLOSEST center, never document order.
const SNAP_PAD = 48;
const NEAR_PAD = 140;
// Recent-prediction window the dwell-anchor refinement takes its median from
const PRED_RING = 10;

// Phase-1 selection-timing tunables (INITIAL defaults — Phase 3 tunes them
// per device/user from the diagnostics; they are not validated settings):
//   HYS_MS    120 — hover switches need a stable new target this long.
//             ~3–4 inference frames at healthy rates: absorbs seam jitter,
//             far shorter than any deliberate dwell.
//   GRACE_MS  400 — shorter dropouts PAUSE dwell (point held, no cancel);
//             covers natural blinks (~100–400ms) and flickery frames; beyond
//             it tracking is declared lost (still under the 1000ms face
//             warning in the engine).
//   REACQ_MS  400 — after loss, this much UNINTERRUPTED valid tracking must
//             pass before selection resumes (explicit reacquisition).
//   EXIT_MS   250 — after an activation, the hover must sit somewhere other
//             than the activated tile this long to re-arm. With hysteresis,
//             the earliest next-dwell is HYS+EXIT ≈ 370ms — the intended
//             cost of making double-fires structurally impossible.
const HYS_MS = 120;
const GRACE_MS = 400;
const REACQ_MS = 400;
const EXIT_MS = 250;

const MODE_HINTS = {
    auto: 'Look at a tile and hold until the blue bar fills.',
    head: 'Tilt your head to steer the dot. Hold on a tile to speak it.',
    directional: 'Look up, down, left, or right to move. Look ahead or blink to select.'
};

// Gaze personalization from much older engines — no longer used.
// Purged once on load.
const LEGACY_FIT_KEYS = ['aac-calib-joint', 'aac-calib-iris', 'aac-calib-head', 'aac-b-hires'];

const state = {
    tiles: [],
    hovered: -1, // cursor-mode highlight (driven by the dwell controller)
    highlight: -1, // directional-mode cursor
    gazeOn: false,
    mode: 'directional', // 'auto' | 'head' | 'directional'
    lock: null, // 'calibration' — disables tile activation while it runs
    editMode: false,
    dwellRAF: null, // directional-mode dwell animation handle
    engine: null,
    fits: { gaze: null, head: null }, // live fits ({cx, cy, samples, vw, vh, kind})
    point: null, // smoothed cursor position
    lastSample: null, // latest gaze sample (freshness/settling gate for anchors)
    lastSampleAt: 0,
    predRing: [], // recent signal bundles — median behind the dwell anchor
    settings: { mode: 'auto', dwellMs: 800, showDot: true, showPad: false, userName: '' }
};

const els = {};
let lastSaidEl, statusBarEl, gazeDotEl, root;

// Dwell/hover state machine for the cursor modes (auto/head) — owns re-arm,
// dropout grace, reacquisition gating, and hover hysteresis. Directional
// mode keeps its own engine-side zone/blink machine and the RAF dwell below.
const dwellCtl = createDwellController({
    hysMs: HYS_MS,
    graceMs: GRACE_MS,
    reacqMs: REACQ_MS,
    exitMs: EXIT_MS,
    getDwellMs: () => state.settings.dwellMs
});

/**
 * Entry point, called from scripts.js when #aac-board exists on the page.
 */
export async function initBoard() {
    root = document.getElementById('aac-board');
    lastSaidEl = document.getElementById('last-said');
    statusBarEl = document.getElementById('gaze-status');
    gazeDotEl = document.getElementById('gaze-dot');
    if (!root || !lastSaidEl) return;
    Object.assign(els, {
        gazeToggle: document.getElementById('gaze-toggle'),
        calibrate: document.getElementById('calibrate-btn'),
        editToggle: document.getElementById('edit-toggle'),
        settings: document.getElementById('settings-btn'),
        status: statusBarEl,
        editTools: document.getElementById('edit-tools'),
        editAdd: document.getElementById('edit-add'),
        editExport: document.getElementById('edit-export'),
        editImport: document.getElementById('edit-import'),
        editReset: document.getElementById('edit-reset'),
        editImportFile: document.getElementById('edit-import-file'),
        editModal: document.getElementById('edit-modal'),
        editTitle: document.getElementById('edit-title'),
        editLabel: document.getElementById('edit-label'),
        editIcon: document.getElementById('edit-icon'),
        editSpeech: document.getElementById('edit-speech'),
        editSave: document.getElementById('edit-save'),
        editDelete: document.getElementById('edit-delete'),
        editCancel: document.getElementById('edit-cancel'),
        settingsModal: document.getElementById('settings-modal'),
        setMode: document.getElementById('set-mode'),
        setDwell: document.getElementById('set-dwell'),
        setVoice: document.getElementById('set-voice'),
        setDot: document.getElementById('set-dot'),
        setHiRes: document.getElementById('set-hires'),
        setPad: document.getElementById('set-pad'),
        setUser: document.getElementById('set-user'),
        setClearCal: document.getElementById('set-clearcal'),
        calibStatus: document.getElementById('calib-status'),
        setTest: document.getElementById('set-test'),
        setClose: document.getElementById('set-close'),
        aboutOpen: document.getElementById('about-open'),
        aboutModal: document.getElementById('about-modal'),
        aboutClose: document.getElementById('about-close'),
        backBtn: document.getElementById('back-btn'),
        pad: document.getElementById('aac-pad'),
        modePill: document.getElementById('aac-mode-pill')
    });

    loadSettings();
    purgeLegacyFits();
    restoreCalibFits();

    // Landing pages that linked in can send the user back where they came from
    if (els.backBtn) {
        const from = new URLSearchParams(window.location.search).get('from');
        if (from === 'moursund') els.backBtn.href = 'moursund.html';
    }

    if (!(await loadTiles())) return;
    renderBoard();

    wireTouchAndKeys();
    wireGaze();
    wireEdit();
    wireSettings();
    wireAbout();
    wirePad();
    updateModePill();
    updatePadVisibility();
    updateFeedback('Tap a tile to speak it aloud.');
}

// Calibration fits from retired pre-persistence engines are dead weight in
// localStorage — clear them once so nothing reads stale data.
function purgeLegacyFits() {
    try {
        LEGACY_FIT_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch (err) { /* storage unavailable */ }
}

// ── Calibration persistence (per-device, named user) ─────────
// A saved fit is one user's: it restores only when the Settings user name
// matches the name it was saved under. Viewport aspect mismatch (>15%, the
// same rule as the rotate hint) means the geometry no longer applies — the
// fit is skipped and the next Gaze start will guide a fresh calibration.

function readCalibProfile() {
    try {
        const raw = localStorage.getItem(CALIB_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' && parsed.fits ? parsed : null;
    } catch (err) {
        return null;
    }
}

function profileName() {
    return (state.settings.userName || '').trim();
}

function saveCalibFit(kind, fit) {
    try {
        const profile = readCalibProfile() || { fits: {} };
        profile.name = profileName();
        profile.savedAt = new Date().toISOString();
        profile.vw = window.innerWidth;
        profile.vh = window.innerHeight;
        profile.fits = { ...profile.fits, [kind]: fit };
        localStorage.setItem(CALIB_KEY, JSON.stringify(profile));
    } catch (err) { /* storage unavailable — session fit still works */ }
}

function clearCalibProfile() {
    try {
        localStorage.removeItem(CALIB_KEY);
    } catch (err) { /* storage unavailable */ }
    state.fits = { gaze: null, head: null };
}

function restoreCalibFits() {
    const profile = readCalibProfile();
    // Names must match exactly (both may be empty = this device's default
    // user). A calibration saved under a different name is another user's.
    if (!profile || profile.name !== profileName()) return false;
    const aspectNow = window.innerWidth / window.innerHeight;
    let restored = 0;
    for (const kind of ['gaze', 'head']) {
        const fit = profile.fits && profile.fits[kind];
        if (!fit || !fit.cx || !fit.cy) continue;
        const fitAspect = (fit.vw || 1) / (fit.vh || 1);
        if (fitAspect && Math.abs(fitAspect - aspectNow) / fitAspect > 0.15) continue;
        state.fits[kind] = fit;
        restored += 1;
    }
    return restored > 0;
}

/** The fit the live input mode consumes. */
function activeFit() {
    if (state.mode === 'auto') return state.fits.gaze;
    if (state.mode === 'head') return state.fits.head;
    return null;
}

// Fits are made under the calibration-time window shape; a rotation or big
// resize silently degrades them. Debounced while the user settles, and only
// nags when a fit actually exists.
let rotateHintTimer = null;
window.addEventListener('resize', () => {
    const fit = activeFit();
    if (!fit) return;
    const fitAspect = fit.vw / fit.vh;
    const nowAspect = window.innerWidth / window.innerHeight;
    if (Math.abs(fitAspect - nowAspect) / fitAspect < 0.15) return;
    if (rotateHintTimer) clearTimeout(rotateHintTimer);
    rotateHintTimer = setTimeout(() => {
        updateFeedback('Screen turned — tap Calibrate to re-fit for accuracy.');
    }, 900);
});

// ── Board data ─────────────────────────────────────────────

async function loadTiles() {
    const custom = readCustom();
    if (custom && Array.isArray(custom.tiles) && custom.tiles.length) {
        state.tiles = custom.tiles;
        return true;
    }
    try {
        const res = await fetch('data/aacBoards.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const board = data.boards && data.boards.home;
        if (!board || !Array.isArray(board.tiles) || !board.tiles.length) throw new Error('empty');
        state.tiles = board.tiles;
        return true;
    } catch (err) {
        updateFeedback('Board data failed to load. Please reload the page.');
        console.error('aacBoard: failed to load board data', err);
        return false;
    }
}

function readCustom() {
    try {
        const raw = localStorage.getItem(CUSTOM_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        return null;
    }
}

function writeCustom() {
    try {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify({ tiles: state.tiles }));
    } catch (err) { /* storage unavailable */ }
}

function renderBoard() {
    root.innerHTML = state.tiles
        .map(
            (tile, index) => `
        <button class="aac-tile" data-index="${index}" type="button" aria-label="${escapeHtml(tile.label || '')}">
            ${tile.icon ? `<span class="aac-icon" aria-hidden="true">${tile.icon}</span>` : ''}
            <span class="aac-label">${escapeHtml(tile.label || '')}</span>
            <span class="dwell-bar" aria-hidden="true"></span>
        </button>`
        )
        .join('');
    dwellCtl.reset();
    setHoverVisual(-1, true);
    setHighlight(-1);
}

const tileEls = () => Array.from(root.querySelectorAll('.aac-tile'));

// ── Touch / keyboard ────────────────────────────────────────

function wireTouchAndKeys() {
    root.addEventListener('click', (event) => {
        const tileEl = event.target.closest('.aac-tile');
        if (!tileEl) return;
        const index = Number(tileEl.dataset.index);
        if (state.editMode) openEditor(index);
        else {
            // Note: a touch tap is NEVER a calibration signal — a partner's
            // tap says "this tile" about a partner action, not about where
            // the user's eyes were. Only verified dwell completions refine
            // the fit (see onDwellActivate).
            // A tap on the tile the gaze cursor may be resting on must not let
            // gaze immediately re-fire it — same rule as a gaze dwell firing.
            if (state.mode === 'auto' || state.mode === 'head') {
                dwellCtl.noteExternalActivate(index);
            }
            activate(index);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            els.editModal.hidden = true;
            els.settingsModal.hidden = true;
            if (els.aboutModal) els.aboutModal.hidden = true;
            return;
        }
        const map = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right'
        };
        const dir = map[event.key];
        if (!dir || event.metaKey || event.ctrlKey || event.altKey) return;
        event.preventDefault();
        moveHighlight(dir);
    });
}

// ── Speaking ────────────────────────────────────────────────

function activate(index) {
    const tile = state.tiles[index];
    if (!tile) return;
    speech.speak(tile.speech || tile.label);
    updateFeedback(`Said: <strong>${escapeHtml(tile.speech || tile.label)}</strong>`);
    const el = tileEls()[index];
    if (el) {
        el.classList.add('just-spoken');
        setTimeout(() => el.classList.remove('just-spoken'), FLASH_MS);
    }
}

function updateFeedback(html) {
    lastSaidEl.innerHTML = html;
}

// ── Gaze: engine lifecycle + mode management ───────────────

function wireGaze() {
    els.gazeToggle.addEventListener('click', async () => {
        speech.prime();
        if (state.gazeOn) {
            stopGaze();
            return;
        }
        if (!(await ensureEngine())) return;
        await enterPreferredMode();
    });

    els.calibrate.addEventListener('click', async () => {
        speech.prime();
        if (!(await ensureEngine())) return;
        // Recalibrate the kind the Settings mode resolves to
        const kind = state.settings.mode === 'head' ? 'head' : 'gaze';
        launchCalibration(
            kind,
            () => activateMode(kind === 'head' ? 'head' : 'auto'),
            () => {}
        );
    });

    document.addEventListener('aac:gaze-dir', (event) => {
        if (!state.gazeOn || state.mode !== 'directional' || state.lock) return;
        moveHighlight(event.detail.dir);
    });
    document.addEventListener('aac:gaze-center', (event) => {
        if (!state.gazeOn || state.mode !== 'directional' || state.lock) return;
        if (event.detail.active) startDwell();
        else cancelDwell();
    });
    document.addEventListener('aac:gaze-blink', () => {
        if (!state.gazeOn || state.mode !== 'directional' || state.lock) return;
        if (state.highlight < 0) return;
        // Single-activation rule: a blink select cancels any in-flight center
        // dwell FIRST so the same fixation can't fire twice (once by the
        // blink, once by the dwell completing).
        cancelDwell();
        activate(state.highlight);
    });

    document.addEventListener('aac:gaze-sample', (event) => {
        state.lastSample = event.detail;
        state.lastSampleAt = performance.now();
        const s = state.lastSample;
        if (s && s.faceOk && !s.settling && (s.open || s.hx != null)) {
            state.predRing.push({
                nx: s.nx, ny: s.ny, gx: s.gx, gy: s.gy,
                hx: s.hx ?? 0, hy: s.hy ?? 0, hp: s.hp ?? 0, hyaw: s.hyaw ?? 0
            });
            if (state.predRing.length > PRED_RING) state.predRing.shift();
        }
        if (!state.gazeOn || state.lock || state.editMode) return;
        if (state.mode === 'directional') return;
        const now = performance.now();
        const uiBlocked = !els.settingsModal.hidden || !els.editModal.hidden;
        // Settling frames (the engine's self-zero window) are not selection
        // material: the bias is about to lock and shift the map, so a dwell
        // started mid-settle could land on the wrong tile. The dot still
        // doesn't move on them — paused dwell, not fake input.
        const raw = !uiBlocked && !s.settling ? computePoint(s) : null;
        const valid = !uiBlocked && !s.settling && Boolean(raw);
        if (valid) {
            // POINT_SMOOTH = 1.0 pass-through: the worker's One Euro is the
            // only smoothing stage (kept as a knob for later tuning).
            if (!state.point) state.point = { x: raw.x, y: raw.y };
            state.point.x += (raw.x - state.point.x) * POINT_SMOOTH;
            state.point.y += (raw.y - state.point.y) * POINT_SMOOTH;
            if (state.settings.showDot) {
                gazeDotEl.hidden = false;
                gazeDotEl.style.left = `${state.point.x}px`;
                gazeDotEl.style.top = `${state.point.y}px`;
            }
        }
        // Invalid sample (face-less frame, eyes-closed frame): HOLD the last
        // displayed point/dot and let the controller decide whether the dwell
        // pauses (short dropout) or tracking is lost (grace exceeded).
        const candidate = valid ? hitTest(state.point.x, state.point.y) : dwellCtl.getState().hover;
        const out = dwellCtl.update(now, uiBlocked ? -1 : candidate, uiBlocked ? true : valid);
        applyDwellOutput(out);
    });

    document.addEventListener('aac:gaze-status', (event) => {
        statusBarEl.hidden = !event.detail.text;
        statusBarEl.textContent = event.detail.text;
        statusBarEl.classList.toggle('warn', Boolean(event.detail.warn));
    });
}

// The engine is a code-split chunk — imported on first Gaze use only
async function ensureEngine() {
    try {
        if (!state.engine) {
            state.engine = await import('./gazeEngine.js');
        }
    } catch (err) {
        console.error('aacBoard: failed to load gaze engine', err);
        return false;
    }
    return state.engine.start();
}

async function enterPreferredMode() {
    const preferred = state.settings.mode;
    if (preferred === 'directional') {
        activateMode('directional');
        return;
    }
    // Cursor modes need a per-user fit. Try to restore this device's saved
    // calibration for the current user name; if none exists, guide straight
    // into the calibration flow instead of booting a placeholder fit.
    const kind = preferred === 'head' ? 'head' : 'gaze';
    if (!state.fits[kind]) restoreCalibFits();
    if (state.fits[kind]) {
        activateMode(preferred);
        const who = profileName();
        updateFeedback(
            `Gaze ready${who ? ` for ${escapeHtml(who)}` : ''} — look at a tile and hold until the blue bar fills.`
        );
        return;
    }
    updateFeedback('First-time setup: one short calibration tunes the gaze cursor to you.');
    launchCalibration(
        kind,
        (fit) => {
            if (fit) activateMode(preferred);
            else fallbackToDirectional();
        },
        () => fallbackToDirectional()
    );
}

// Calibration unavailable/declined: gaze stays usable via Directional mode
// (no calibration), and touch/pad access is untouched.
function fallbackToDirectional() {
    activateMode('directional');
    updateFeedback(
        'Calibration not completed — using Directional gaze (no calibration needed). Tap Calibrate anytime to set up the cursor.'
    );
}

function launchCalibration(kind, onDone, onCancel) {
    if (state.lock === 'calibration') return; // one flow at a time
    // Entering a locked flow must kill any in-flight dwell — a dwell started
    // before the overlay must never fire mid-calibration.
    cancelDwell();
    dwellCtl.reset();
    setHoverVisual(-1, true);
    state.lock = 'calibration';
    gazeDotEl.hidden = true;
    updatePadVisibility();
    runCalibration({
        kind,
        onDone: (fit) => {
            state.fits[kind] = fit || null;
            if (fit) saveCalibFit(kind, fit); // persist under the current user name
            state.point = null;
            state.lock = null;
            const who = profileName();
            updateFeedback(
                fit
                    ? `Calibrated${who ? ` for ${escapeHtml(who)}` : ''} — saved on this device.`
                    : 'Calibration skipped.'
            );
            updatePadVisibility();
            if (onDone) onDone(fit);
        },
        onCancel: () => {
            state.lock = null;
            updatePadVisibility();
            if (onCancel) onCancel();
        }
    });
}

function activateMode(mode) {
    const calibrated =
        (mode === 'auto' && Boolean(state.fits.gaze)) ||
        (mode === 'head' && Boolean(state.fits.head));
    state.mode = mode === 'directional' || calibrated ? mode : 'directional';
    state.gazeOn = true;
    state.point = null;
    if (state.mode === 'directional') cancelDwell();
    dwellCtl.reset();
    setHoverVisual(-1, true);
    setHighlight(state.mode === 'directional' ? 0 : -1);
    const label =
        state.mode === 'auto' ? 'Auto' : state.mode === 'head' ? 'Head' : 'Directional';
    els.gazeToggle.textContent = `Gaze: ${label}`;
    els.gazeToggle.classList.add('gaze-on');
    els.gazeToggle.setAttribute('aria-pressed', 'true');
    statusBarEl.hidden = false;
    statusBarEl.textContent = MODE_HINTS[state.mode] || MODE_HINTS.auto;
    statusBarEl.classList.remove('warn');
    if (!state.settings.showDot) gazeDotEl.hidden = true;
    updatePadVisibility();
    updateModePill();
}

function stopGaze() {
    state.gazeOn = false;
    if (state.engine) state.engine.stop();
    cancelDwell();
    dwellCtl.reset();
    setHoverVisual(-1, true);
    setHighlight(-1);
    state.point = null;
    gazeDotEl.hidden = true;
    els.gazeToggle.textContent = 'Gaze: Off';
    els.gazeToggle.classList.remove('gaze-on');
    els.gazeToggle.setAttribute('aria-pressed', 'false');
    updatePadVisibility();
    updateModePill();
}

// Signals → screen px via the session correction fit for the live mode.
// No fit → no cursor (the Directional state machine is the no-fit path).
function computePoint(sample) {
    if (!sample || !sample.faceOk) return null;
    const fit = activeFit();
    if (fit) return applyCalib(fit, sample);
    return null;
}

/** Median of the recent signal bundles for the given fit kind. */
function medianPrediction(kind) {
    const ring = state.predRing;
    if (!ring.length) return null;
    return {
        nx: median(ring.map((p) => p.nx ?? 0)),
        ny: median(ring.map((p) => p.ny ?? 0)),
        gx: median(ring.map((p) => p.gx ?? 0)),
        gy: median(ring.map((p) => p.gy ?? 0)),
        hx: median(ring.map((p) => p.hx ?? 0)),
        hy: median(ring.map((p) => p.hy ?? 0)),
        hp: median(ring.map((p) => p.hp ?? 0)),
        hyaw: median(ring.map((p) => p.hyaw ?? 0))
    };
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}


function hitTest(x, y) {
    // Delegated to hitTest.js: padded-rect candidates resolve to the closest
    // center (the old first-match-wins scan biased every seam toward the
    // earlier tile in document order). Rects are read fresh per sample so
    // layout changes (resize, board edits) are picked up immediately.
    return pickTile(tileEls().map(recordOf), x, y, { snapPad: SNAP_PAD, nearPad: NEAR_PAD });
}

// ── Highlight (directional) + hover (cursor/head) + dwell ───

function currentCols() {
    const cols = getComputedStyle(root).gridTemplateColumns;
    return cols.split(' ').filter(Boolean).length || 2;
}

function setHighlight(index) {
    state.highlight = index;
    tileEls().forEach((el, i) => el.classList.toggle('highlight', i === index));
}

function moveHighlight(dir) {
    const total = state.tiles.length;
    const cols = currentCols();
    const rows = Math.ceil(total / cols);
    const from = state.highlight < 0 ? 0 : state.highlight;
    let row = Math.floor(from / cols);
    let col = from % cols;
    if (dir === 'up') row = Math.max(0, row - 1);
    if (dir === 'down') row = Math.min(rows - 1, row + 1);
    if (dir === 'left') col = Math.max(0, col - 1);
    if (dir === 'right') col = Math.min(cols - 1, col + 1);
    const to = row * cols + col;
    if (to >= total) return;
    if (to !== from || state.highlight < 0) {
        cancelDwell();
        setHighlight(to);
    }
}

function setHoverVisual(index, force) {
    // Visuals only. Selection timing lives in dwellController (cursor modes)
    // and startDwell (directional mode) — never implicit in a class toggle.
    if (index === state.hovered && !force) return;
    state.hovered = index;
    tileEls().forEach((el, i) => el.classList.toggle('highlight', i === index));
}

// ── Cursor-mode dwell rendering (driven by dwellController outputs) ────

function applyDwellOutput(out) {
    if (out.hoverChanged) setHoverVisual(out.hover);
    if (out.dwellCanceled) clearDwellBars();
    if (out.dwellIdx >= 0) {
        const bar = tileEls()[out.dwellIdx]?.querySelector('.dwell-bar');
        if (bar) {
            bar.style.width = `${Math.min(100, out.dwellFrac * 100)}%`;
            bar.classList.toggle('paused', out.dwellPaused);
        }
    }
    if (out.activate >= 0) onDwellActivate(out.activate);
}

function onDwellActivate(index) {
    // The completed dwell IS the label — fold this tile's center in as a
    // correction anchor (replaces tap-training with zero extra action).
    // Skipped while the engine is settling (pre-bias samples would lie).
    if (state.mode === 'auto' || state.mode === 'head') {
        const fit = activeFit();
        const med = fit && medianPrediction(fit.kind);
        if (fit && med && state.lastSample && !state.lastSample.settling) {
            const rect = tileEls()[index].getBoundingClientRect();
            const next = refineFitFromTap(
                fit,
                med,
                rect.left + rect.width / 2,
                rect.top + rect.height / 2
            );
            if (next) state.fits[fit.kind] = next;
        }
    }
    activate(index);
}

// ── Directional-mode dwell (unchanged semantics: engine events drive it) ──

function startDwell() {
    cancelDwell();
    const index = state.highlight;
    if (index < 0 || !state.gazeOn || state.lock || state.editMode) return;
    const start = performance.now();
    const step = (now) => {
        const bar = tileEls()[state.highlight]?.querySelector('.dwell-bar');
        if (bar) bar.style.width = `${Math.min(100, ((now - start) / state.settings.dwellMs) * 100)}%`;
        if (now - start >= state.settings.dwellMs) {
            state.dwellRAF = null;
            const activated = state.highlight;
            activate(activated);
            cancelDwell();
            return;
        }
        state.dwellRAF = requestAnimationFrame(step);
    };
    state.dwellRAF = requestAnimationFrame(step);
}

function cancelDwell() {
    if (state.dwellRAF) cancelAnimationFrame(state.dwellRAF);
    state.dwellRAF = null;
    clearDwellBars();
}

function clearDwellBars() {
    document.querySelectorAll('.aac-tile .dwell-bar').forEach((bar) => {
        bar.style.width = '0%';
        bar.classList.remove('paused');
    });
}

// ── Edit mode: custom buttons ─────────────────────────────

let editIndex = -1;

function wireEdit() {
    els.editToggle.addEventListener('click', () => {
        state.editMode = !state.editMode;
        if (state.editMode) stopGaze();
        els.editToggle.textContent = state.editMode ? 'Done editing' : 'Edit';
        els.editToggle.setAttribute('aria-pressed', String(state.editMode));
        els.editTools.hidden = !state.editMode;
        els.editReset.textContent = 'Reset board';
        cancelDwell();
        dwellCtl.reset();
        setHoverVisual(-1, true);
        updatePadVisibility();
        updateFeedback(
            state.editMode
                ? 'Editing: tap a tile to change it. Your board saves on this device.'
                : 'Tap a tile to speak it aloud.'
        );
    });

    els.editAdd.addEventListener('click', () => {
        state.tiles.push({ id: `t${Date.now()}`, label: 'New button', icon: '', speech: '' });
        writeCustom();
        renderBoard();
        openEditor(state.tiles.length - 1);
    });

    els.editSave.addEventListener('click', () => {
        if (editIndex < 0) return;
        const label = els.editLabel.value.trim();
        if (!label) {
            els.editLabel.focus();
            return;
        }
        state.tiles[editIndex].label = label;
        state.tiles[editIndex].icon = els.editIcon.value.trim();
        state.tiles[editIndex].speech = els.editSpeech.value.trim() || label;
        writeCustom();
        els.editModal.hidden = true;
        renderBoard();
    });

    els.editDelete.addEventListener('click', () => {
        if (editIndex < 0 || state.tiles.length <= 1) return;
        state.tiles.splice(editIndex, 1);
        writeCustom();
        els.editModal.hidden = true;
        renderBoard();
    });

    els.editCancel.addEventListener('click', () => {
        els.editModal.hidden = true;
    });

    els.editExport.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify({ tiles: state.tiles }, null, 2)], {
            type: 'application/json'
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'speakBoard.json';
        link.click();
        URL.revokeObjectURL(link.href);
    });

    els.editImport.addEventListener('click', () => els.editImportFile.click());
    els.editImportFile.addEventListener('change', () => {
        const file = els.editImportFile.files && els.editImportFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                const tiles = parsed.tiles || parsed.boards?.home?.tiles;
                if (!Array.isArray(tiles) || !tiles.length || !tiles.every((t) => t && t.label)) {
                    throw new Error('invalid');
                }
                state.tiles = tiles.map((t, i) => ({
                    id: t.id || `t${i}`,
                    label: String(t.label).slice(0, 24),
                    icon: typeof t.icon === 'string' ? t.icon.slice(0, 4) : '',
                    speech: String(t.speech || t.label).slice(0, 80)
                }));
                writeCustom();
                renderBoard();
                updateFeedback('Board imported.');
            } catch (err) {
                updateFeedback('Import failed — file must be a Speak Board export.');
            }
            els.editImportFile.value = '';
        };
        reader.readAsText(file);
    });

    els.editReset.addEventListener('click', () => {
        if (els.editReset.dataset.armed) {
            try {
                localStorage.removeItem(CUSTOM_KEY);
            } catch (err) { /* storage unavailable */ }
            loadTiles().then(() => renderBoard());
            els.editReset.textContent = 'Reset board';
            delete els.editReset.dataset.armed;
            updateFeedback('Board reset to defaults.');
        } else {
            els.editReset.dataset.armed = '1';
            els.editReset.textContent = 'Confirm reset?';
            setTimeout(() => {
                delete els.editReset.dataset.armed;
                els.editReset.textContent = 'Reset board';
            }, 3000);
        }
    });
}

function openEditor(index) {
    editIndex = index;
    const tile = state.tiles[index];
    if (!tile) return;
    els.editTitle.textContent = index >= state.tiles.length ? 'Add Tile' : 'Edit Tile';
    els.editLabel.value = tile.label || '';
    els.editIcon.value = tile.icon || '';
    els.editSpeech.value = tile.speech || '';
    els.editDelete.hidden = state.tiles.length <= 1;
    els.editModal.hidden = false;
    els.editLabel.focus();
}

// ── Settings modal ─────────────────────────────────────────

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) Object.assign(state.settings, JSON.parse(raw));
    } catch (err) { /* defaults */ }
    // Legacy 'cursor' mode → auto; 'head' is a real mode again
    if (state.settings.mode === 'cursor') {
        state.settings.mode = 'auto';
    }
    if (!['auto', 'head', 'directional'].includes(state.settings.mode)) {
        state.settings.mode = 'auto';
    }
    // Retired settings keys from older builds
    delete state.settings.showCheck; // debug tracking readout (removed)
    if (typeof state.settings.userName !== 'string') state.settings.userName = '';
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (err) { /* storage unavailable */ }
}

function wireSettings() {
    speech.onVoicesChanged(() => fillVoices());

    els.settings.addEventListener('click', () => {
        const modeOptions = Array.from(els.setMode.options).map((option) => option.value);
        if (!modeOptions.includes(state.settings.mode)) {
            state.settings.mode = modeOptions[0] || 'auto';
            saveSettings();
        }
        els.setMode.value = state.settings.mode;
        els.setDwell.value = String(state.settings.dwellMs);
        els.setDot.checked = state.settings.showDot;
        if (els.setPad) els.setPad.checked = state.settings.showPad;
        if (els.setUser) els.setUser.value = profileName();
        renderCalibStatus();
        fillVoices();
        els.settingsModal.hidden = false;
    });

    els.setClose.addEventListener('click', () => {
        els.settingsModal.hidden = true;
    });

    els.setMode.addEventListener('change', async () => {
        state.settings.mode = els.setMode.value;
        saveSettings();
        if (state.gazeOn) {
            stopGaze();
            await ensureEngine();
            await enterPreferredMode();
        }
    });

    els.setDwell.addEventListener('change', () => {
        state.settings.dwellMs = Number(els.setDwell.value) || 800;
        saveSettings();
    });

    els.setDot.addEventListener('change', () => {
        state.settings.showDot = els.setDot.checked;
        gazeDotEl.hidden = !state.settings.showDot || !state.gazeOn;
        saveSettings();
    });

    // Direction pad (soft D-pad) visibility
    if (els.setPad) {
        els.setPad.checked = state.settings.showPad;
        els.setPad.addEventListener('change', () => {
            state.settings.showPad = els.setPad.checked;
            saveSettings();
            updatePadVisibility();
            updateModePill();
            if (state.settings.showPad) {
                updateFeedback('Direction pad on: arrows move the highlight, ● selects.');
            }
        });
    }

    // Calibration owner: which user the saved fit belongs to on this device.
    // Changing the name retires the live session fits — they were made by and
    // for the previous user and must not steer the new user's cursor.
    if (els.setUser) {
        els.setUser.addEventListener('change', () => {
            const next = els.setUser.value.trim().slice(0, 24);
            if (next === profileName()) return;
            state.settings.userName = next;
            saveSettings();
            state.fits = { gaze: null, head: null };
            if (state.gazeOn && (state.mode === 'auto' || state.mode === 'head')) {
                stopGaze();
                updateFeedback(
                    `User changed — turn Gaze on to calibrate for ${next || 'this device'}.`
                );
            }
            restoreCalibFits(); // picks up THIS user's saved fits, if any
            renderCalibStatus();
        });
    }

    if (els.setClearCal) {
        els.setClearCal.addEventListener('click', () => {
            if (els.setClearCal.dataset.armed) {
                clearCalibProfile();
                els.setClearCal.textContent = 'Clear saved calibration';
                delete els.setClearCal.dataset.armed;
                renderCalibStatus();
                updateFeedback('Saved calibration cleared. The cursor will ask to calibrate next time.');
            } else {
                els.setClearCal.dataset.armed = '1';
                els.setClearCal.textContent = 'Really clear? Tap again';
                setTimeout(() => {
                    delete els.setClearCal.dataset.armed;
                    els.setClearCal.textContent = 'Clear saved calibration';
                }, 3000);
            }
        });
    }

    // Camera detail — default OFF everywhere (720p costs 2–3× inference
    // latency; for pointer distance it doesn't earn it). Arms-length cases
    // can flip it on; changing it requires a gaze restart to take effect.
    if (els.setHiRes) {
        let hiRes = null;
        try {
            hiRes = localStorage.getItem('aac-hires');
        } catch (err) { /* storage unavailable */ }
        if (hiRes == null) {
            hiRes = '0';
            try {
                localStorage.setItem('aac-hires', hiRes);
            } catch (err) { /* storage unavailable */ }
        }
        els.setHiRes.checked = hiRes === '1';
        els.setHiRes.addEventListener('change', () => {
            try {
                localStorage.setItem('aac-hires', els.setHiRes.checked ? '1' : '0');
            } catch (err) { /* storage unavailable */ }
            if (state.gazeOn) {
                stopGaze();
                updateFeedback('Camera detail changed — turn Gaze on again.');
            }
        });
    }

    els.setVoice.addEventListener('change', () => {
        const [providerId, voiceId] = splitVoiceValue(els.setVoice.value);
        if (providerId) speech.setVoice(providerId, voiceId);
    });

    els.setTest.addEventListener('click', () => {
        const [providerId, voiceId] = splitVoiceValue(els.setVoice.value);
        if (providerId) speech.setVoice(providerId, voiceId);
        speech.speak('Hello. This is how I will sound.');
    });
}

// ── About & Licenses modal ──────────────────────────────────

function wireAbout() {
    if (!els.aboutOpen || !els.aboutModal) return;
    const close = () => {
        els.aboutModal.hidden = true;
    };
    els.aboutOpen.addEventListener('click', () => {
        els.aboutModal.hidden = false;
    });
    if (els.aboutClose) els.aboutClose.addEventListener('click', close);
    els.aboutModal.addEventListener('click', (event) => {
        if (event.target === els.aboutModal) close(); // backdrop click
    });
}

// ── Direction pad (non-gaze directional control) ─────────────
//
// A soft D-pad for when the camera is unavailable or glare rules out gaze.
// Arrows move the directional-mode highlight; the center Select pad
// activates it. Hidden while Auto gaze is the live input channel (the
// cursor is faster than a pad would be) and during edit/calibration states.

function wirePad() {
    if (!els.pad) return;
    els.pad.querySelectorAll('[data-dir]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            speech.prime();
            const dir = btn.dataset.dir;
            if (state.editMode || state.lock) return;
            if (dir === 'select') {
                if (state.highlight >= 0) activate(state.highlight);
                return;
            }
            if (state.highlight < 0) setHighlight(0);
            else moveHighlight(dir);
        });
    });
}

function updatePadVisibility() {
    if (!els.pad) return;
    const show =
        state.settings.showPad &&
        !state.editMode &&
        !state.lock &&
        !(state.gazeOn && (state.mode === 'auto' || state.mode === 'head'));
    els.pad.hidden = !show;
}

function updateModePill() {
    if (!els.modePill) return;
    let label;
    if (!state.gazeOn) {
        label = state.settings.showPad ? 'Touch / Pad' : 'Touch';
    } else if (state.mode === 'directional') {
        label = 'Directional gaze';
    } else if (state.mode === 'head') {
        label = 'Head pointer';
    } else {
        label = 'Auto gaze';
    }
    els.modePill.textContent = label;
    els.modePill.classList.toggle('gaze', state.gazeOn);
}

function splitVoiceValue(value) {
    const parts = String(value).split('::');
    return [parts[0], parts.slice(1).join('::')];
}

/** Settings dialog line describing the saved calibration + ownership. */
function renderCalibStatus() {
    if (!els.calibStatus) return;
    const profile = readCalibProfile();
    if (!profile) {
        els.calibStatus.textContent = 'No saved calibration on this device.';
        return;
    }
    const kinds = Object.keys(profile.fits || {}).filter(
        (k) => profile.fits[k] && profile.fits[k].cx
    );
    if (!kinds.length) {
        els.calibStatus.textContent = 'No saved calibration on this device.';
        return;
    }
    const date = profile.savedAt ? new Date(profile.savedAt).toLocaleDateString() : '';
    const owner = profile.name || 'this device (no name)';
    const base = `Saved calibration: ${owner} · ${kinds.join(' + ')}${date ? ' · ' + date : ''}`;
    els.calibStatus.textContent =
        profile.name === profileName()
            ? base
            : `${base} — a different user's fit; it stays unused until the name matches or you clear it.`;
}

// Voice options are grouped by provider, so a future voice source (neural
// on-device, cloud) appears here automatically once registered.
function fillVoices() {
    const groups = speech.listVoiceOptions();
    const chosen = speech.getChosen();
    let html = '';
    groups.forEach((group) => {
        if (!group.voices.length) return;
        html += `<optgroup label="${escapeHtml(group.label)}">`;
        group.voices.forEach((voice) => {
            html += `<option value="${escapeHtml(group.id)}::${escapeHtml(voice.id)}">${escapeHtml(voice.label)}</option>`;
        });
        html += '</optgroup>';
    });
    els.setVoice.innerHTML = html || '<option value="">No voices found on this device</option>';
    if (chosen && chosen.providerId) {
        const value = `${chosen.providerId}::${chosen.voiceId}`;
        if (Array.from(els.setVoice.options).some((option) => option.value === value)) {
            els.setVoice.value = value;
        }
    }
}

