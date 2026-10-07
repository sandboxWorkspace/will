/**
 * Speak Board — base board renderer, input dispatcher, and mode manager.
 *
 * Input-agnostic by design: touch, keyboard, and gaze (directional, calibrated
 * cursor, or head pointer) all funnel into the same moveHighlight() /
 * activate() calls. Gaze sources are selected in Settings; the board listens
 * to the aac:gaze-* events dispatched by gazeEngine.js and maps them per mode.
 */
import * as speech from './speech.js';
import { escapeHtml } from '../utils/utils.js';
import { getFit, applyFit, runCalibration } from './calibration.js';
import { startPractice } from './gazePractice.js';
import { OneEuro2D } from './oneEuro.js';

const CUSTOM_KEY = 'aac-custom-board';
const SETTINGS_KEY = 'aac-settings';
const POINT_SMOOTH = 0.35;
const FLASH_MS = 350;
const JITTER_WARN = 0.015;
// Lab B: dwell only accrues when the cursor is slower than this (px/ms)
const VEL_GATE = 0.6;
// Lab B Auto mode: iris weight vs jitter (blend shifts toward head pointer
// as iris jitter rises between these bounds)
const JITTER_LO = 0.006;
const JITTER_HI = 0.02;

const MODE_HINTS = {
    auto: 'Look at a tile and hold until the blue bar fills.',
    cursor: 'Look at a tile and hold until the blue bar fills.',
    directional: 'Look up, down, left, or right to move. Look ahead or blink to select.',
    head: 'Tilt your head to move the cursor. Hold steady on a tile to select.'
};

const state = {
    tiles: [],
    hovered: -1,
    highlight: -1, // directional-mode cursor
    gazeOn: false,
    mode: 'directional', // 'auto' | 'cursor' | 'directional' | 'head'
    lock: null, // 'calibration' | 'practice' — disables tile activation
    editMode: false,
    dwellRAF: null,
    dwellArmed: true,
    engine: null,
    fits: { iris: null, head: null },
    point: null, // smoothed cursor position
    variant: 'legacy', // 'legacy' | 'a' | 'b' — set by the page
    enginePath: './gazeEngine.js',
    oneEuro: null,
    lastJitter: 0,
    speed: 0, // cursor speed in px/ms (variant b)
    lastPoint: null,
    lastPointAt: 0,
    settings: { mode: 'cursor', dwellMs: 800, showDot: true, showCheck: false }
};

const els = {};
let lastSaidEl, statusBarEl, gazeDotEl, gazeCheckEl, root;

/**
 * Entry point, called from scripts.js when #aac-board exists on the page.
 */
export async function initBoard() {
    root = document.getElementById('aac-board');
    lastSaidEl = document.getElementById('last-said');
    statusBarEl = document.getElementById('gaze-status');
    gazeDotEl = document.getElementById('gaze-dot');
    gazeCheckEl = document.getElementById('gaze-check');
    if (!root || !lastSaidEl) return;
    Object.assign(els, {
        gazeToggle: document.getElementById('gaze-toggle'),
        calibrate: document.getElementById('calibrate-btn'),
        practice: document.getElementById('practice-btn'),
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
        setCheck: document.getElementById('set-check'),
        setTest: document.getElementById('set-test'),
        setClose: document.getElementById('set-close')
    });

    // Page-selected engine + behavior variant (see toolGazeLabA/B.html)
    state.variant = root.dataset.gazeVariant || 'legacy';
    loadSettings();
    if (root.dataset.gazeDefaultMode && !localStorage.getItem(SETTINGS_KEY)) {
        state.settings.mode = root.dataset.gazeDefaultMode;
    }
    state.oneEuro = new OneEuro2D(1.0, 0.04, 1.0);
    state.fits.iris = getFit('iris');
    state.fits.head = getFit('head');

    if (!(await loadTiles())) return;
    renderBoard();

    wireTouchAndKeys();
    wireGaze();
    wireEdit();
    wireSettings();
    updateFeedback('Tap a tile to speak it aloud.');
}

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
    setHover(-1, true);
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
        else activate(index);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            els.editModal.hidden = true;
            els.settingsModal.hidden = true;
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
        const source = state.settings.mode === 'head' ? 'head' : 'iris';
        launchCalibration(source, () => {});
    });

    els.practice.addEventListener('click', async () => {
        speech.prime();
        if (!(await ensureEngine())) return;
        if (!state.fits.iris) {
            launchCalibration(
                'iris',
                () => beginPractice(),
                () => updateFeedback('Practice needs calibration — tap Practice again after.')
            );
            return;
        }
        beginPractice();
    });

    document.addEventListener('aac:gaze-dir', (event) => {
        if (!state.gazeOn || state.mode !== 'directional' || state.lock) return;
        moveHighlight(event.detail.dir);
    });
    document.addEventListener('aac:gaze-center', (event) => {
        if (!state.gazeOn || state.mode !== 'directional' || state.lock) return;
        if (event.detail.active) startDwell();
        else {
            state.dwellArmed = true;
            cancelDwell();
        }
    });
    document.addEventListener('aac:gaze-blink', () => {
        if (!state.gazeOn || state.mode !== 'directional' || state.lock) return;
        if (state.highlight >= 0) activate(state.highlight);
    });

    document.addEventListener('aac:gaze-sample', (event) => {
        if (!state.gazeOn || state.lock || state.editMode) return;
        if (state.mode === 'directional') return;
        if (!els.settingsModal.hidden || !els.editModal.hidden) {
            setHover(-1);
            return;
        }
        const raw = computePoint(event.detail);
        if (!raw) {
            setHover(-1);
            return;
        }
        const now = performance.now();
        if (state.variant === 'b') {
            // One Euro: adaptive smoothing — steady when still, agile on saccades
            state.point = state.oneEuro.filter(raw.x, raw.y, now);
        } else {
            if (!state.point) state.point = { x: raw.x, y: raw.y };
            state.point.x += (raw.x - state.point.x) * POINT_SMOOTH;
            state.point.y += (raw.y - state.point.y) * POINT_SMOOTH;
        }
        // Cursor speed (px/ms) — Lab B gates dwell while the eye is moving
        if (state.lastPoint && now > state.lastPointAt) {
            const moved = Math.hypot(state.point.x - state.lastPoint.x, state.point.y - state.lastPoint.y);
            state.speed = moved / (now - state.lastPointAt);
        }
        state.lastPoint = { x: state.point.x, y: state.point.y };
        state.lastPointAt = now;
        if (state.settings.showDot) {
            gazeDotEl.hidden = false;
            gazeDotEl.style.left = `${state.point.x}px`;
            gazeDotEl.style.top = `${state.point.y}px`;
        }
        setHover(hitTest(state.point.x, state.point.y));
    });

    document.addEventListener('aac:gaze-quality', (event) => {
        els.lastQuality = event.detail;
        if (typeof event.detail.jitter === 'number') state.lastJitter = event.detail.jitter;
        updateCheck();
    });

    document.addEventListener('aac:gaze-status', (event) => {
        statusBarEl.hidden = !event.detail.text;
        statusBarEl.textContent = event.detail.text;
        statusBarEl.classList.toggle('warn', Boolean(event.detail.warn));
        updateCheck();
    });
    document.addEventListener('aac:gaze-quality', (event) => {
        els.lastQuality = event.detail;
        updateCheck();
    });
    document.addEventListener('aac:gaze-face', updateCheck);
}

// Engines are code-split chunks; import.meta.glob keeps the paths statically
// analyzable so Vite bundles every engine the pages can select. Pages pick
// one via data-gaze-engine ("" production, "A", "B").
const ENGINE_LOADERS = import.meta.glob('./gazeEngine*.js');

async function ensureEngine() {
    try {
        if (!state.engine) {
            const key = root.dataset.gazeEngine || '';
            const loader = ENGINE_LOADERS[`./gazeEngine${key}.js`] || ENGINE_LOADERS['./gazeEngine.js'];
            if (!loader) throw new Error(`no engine loader for "${key}"`);
            state.engine = await loader();
        }
    } catch (err) {
        console.error('aacBoard: failed to load gaze engine', err);
        return false;
    }
    return state.engine.start();
}

async function enterPreferredMode() {
    const preferred = state.settings.mode;
    if (preferred === 'auto' && state.variant === 'b') {
        const needIris = !state.fits.iris;
        const needHead = !state.fits.head;
        if (needIris || needHead) {
            const first = needIris ? 'iris' : 'head';
            const second = needIris ? 'head' : 'iris';
            launchCalibration(
                first,
                () => {
                    if ((first === 'iris' && !state.fits.head) || (first === 'head' && !state.fits.iris)) {
                        launchCalibration(
                            second,
                            () => activateMode('auto'),
                            () => activateMode('auto')
                        );
                    } else {
                        activateMode('auto');
                    }
                },
                () => activateMode('directional')
            );
            return;
        }
        activateMode('auto');
        return;
    }
    if ((preferred === 'cursor' && !state.fits.iris) || (preferred === 'head' && !state.fits.head)) {
        const source = preferred === 'head' ? 'head' : 'iris';
        launchCalibration(source, () => activateMode(preferred), () => activateMode('directional'));
        return;
    }
    activateMode(preferred);
}

function launchCalibration(source, onDone, onCancel) {
    state.lock = 'calibration';
    gazeDotEl.hidden = true;
    runCalibration(source, {
        variant: state.variant,
        onDone: (fit) => {
            state.fits[source] = fit;
            state.point = null;
            state.oneEuro.reset();
            state.lock = null;
            updateFeedback('Gaze calibrated.');
            if (onDone) onDone();
        },
        onCancel: () => {
            state.lock = null;
            if (onCancel) onCancel();
        }
    });
}

function activateMode(mode) {
    if (mode === 'auto' && state.variant === 'b') {
        // Auto needs both fits; degrade gracefully to what exists
        if (state.fits.iris && state.fits.head) state.mode = 'auto';
        else if (state.fits.iris) state.mode = 'cursor';
        else if (state.fits.head) state.mode = 'head';
        else state.mode = 'directional';
    } else if ((mode === 'cursor' && !state.fits.iris) || (mode === 'head' && !state.fits.head)) {
        state.mode = 'directional';
    } else {
        state.mode = mode;
    }
    state.gazeOn = true;
    state.point = null;
    state.oneEuro.reset();
    state.dwellArmed = true;
    setHover(-1, true);
    setHighlight(state.mode === 'directional' ? 0 : -1);
    const label =
        state.mode === 'auto'
            ? 'Auto'
            : state.mode === 'cursor'
              ? 'Cursor'
              : state.mode === 'head'
                ? 'Head'
                : 'Directional';
    els.gazeToggle.textContent = `Gaze: ${label}`;
    els.gazeToggle.classList.add('gaze-on');
    els.gazeToggle.setAttribute('aria-pressed', 'true');
    statusBarEl.hidden = false;
    statusBarEl.textContent = MODE_HINTS[state.mode] || MODE_HINTS.cursor;
    statusBarEl.classList.remove('warn');
    if (!state.settings.showDot) gazeDotEl.hidden = true;
    updateCheck();
}

function stopGaze() {
    state.gazeOn = false;
    if (state.engine) state.engine.stop();
    cancelDwell();
    setHover(-1, true);
    setHighlight(-1);
    state.point = null;
    state.oneEuro.reset();
    gazeDotEl.hidden = true;
    els.gazeToggle.textContent = 'Gaze: Off';
    els.gazeToggle.classList.remove('gaze-on');
    els.gazeToggle.setAttribute('aria-pressed', 'false');
    updateCheck();
}

function computePoint(sample) {
    if (!sample || !sample.faceOk) return null;
    if (state.mode === 'auto' && state.variant === 'b') {
        const irisPoint = state.fits.iris
            ? scalePoint(state.fits.iris, applyFit(state.fits.iris, sample.gx, sample.gy))
            : null;
        const headPoint = state.fits.head
            ? scalePoint(state.fits.head, applyFit(state.fits.head, sample.hx, sample.hy))
            : null;
        if (irisPoint && headPoint) {
            // Weight the eye signal by its own stability; when the iris gets
            // noisy (glare, glasses, dim light) lean on the head pointer
            const t = Math.min(
                1,
                Math.max(0, (state.lastJitter - JITTER_LO) / (JITTER_HI - JITTER_LO))
            );
            const wIris = 1 - 0.75 * t; // never below 0.25
            return {
                x: irisPoint.x * wIris + headPoint.x * (1 - wIris),
                y: irisPoint.y * wIris + headPoint.y * (1 - wIris)
            };
        }
        return irisPoint || headPoint;
    }
    const fit = state.mode === 'head' ? state.fits.head : state.fits.iris;
    if (!fit) return null;
    const p = applyFit(
        fit,
        state.mode === 'head' ? sample.hx : sample.gx,
        state.mode === 'head' ? sample.hy : sample.gy
    );
    return scalePoint(fit, p);
}

// Practice always trains the calibrated eye cursor, independent of the
// board's current gaze mode.
function pointFromIris(sample) {
    if (!sample || !sample.faceOk) return null;
    const fit = state.fits.iris;
    if (!fit) return null;
    return scalePoint(fit, applyFit(fit, sample.gx, sample.gy));
}

function scalePoint(fit, p) {
    if (p && fit.w && fit.h) {
        // Calibration was recorded at a different window size — rescale
        p.x *= window.innerWidth / fit.w;
        p.y *= window.innerHeight / fit.h;
    }
    return p;
}

function beginPractice() {
    state.lock = 'practice';
    startPractice({
        getPoint: pointFromIris,
        onExit: () => {
            state.lock = null;
        }
    });
}

function hitTest(x, y) {
    const tiles = tileEls();
    for (let i = 0; i < tiles.length; i++) {
        const rect = tiles[i].getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i;
    }
    return -1;
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

function setHover(index, force) {
    if (index === state.hovered && !force) return;
    state.hovered = index;
    tileEls().forEach((el, i) => el.classList.toggle('highlight', i === index));
    cancelDwell();
    const slowEnough = state.variant !== 'b' || state.speed <= VEL_GATE;
    if (index >= 0 && state.dwellArmed && !state.editMode && slowEnough) startDwell();
    if (index < 0) state.dwellArmed = true;
}

function startDwell() {
    cancelDwell();
    const index = state.mode === 'directional' ? state.highlight : state.hovered;
    if (index < 0 || !state.gazeOn || state.lock || state.editMode) return;
    const start = performance.now();
    const step = (now) => {
        const bar =
            tileEls()[state.mode === 'directional' ? state.highlight : state.hovered]
                ?.querySelector('.dwell-bar');
        if (bar) bar.style.width = `${Math.min(100, ((now - start) / state.settings.dwellMs) * 100)}%`;
        if (now - start >= state.settings.dwellMs) {
            state.dwellRAF = null;
            state.dwellArmed = false;
            activate(state.mode === 'directional' ? state.highlight : state.hovered);
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
    document.querySelectorAll('.aac-tile .dwell-bar').forEach((bar) => {
        bar.style.width = '0%';
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
        setHover(-1, true);
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
            // Page doesn't offer this mode (e.g. Auto on non-Lab-B pages)
            state.settings.mode = modeOptions.includes('cursor') ? 'cursor' : modeOptions[0];
            saveSettings();
        }
        els.setMode.value = state.settings.mode;
        els.setDwell.value = String(state.settings.dwellMs);
        els.setDot.checked = state.settings.showDot;
        els.setCheck.checked = state.settings.showCheck;
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

    els.setCheck.addEventListener('change', () => {
        state.settings.showCheck = els.setCheck.checked;
        updateCheck();
        saveSettings();
    });

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

function splitVoiceValue(value) {
    const parts = String(value).split('::');
    return [parts[0], parts.slice(1).join('::')];
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

// ── Tracking readout ───────────────────────────────────────

function updateCheck() {
    if (!state.settings.showCheck) {
        gazeCheckEl.hidden = true;
        return;
    }
    const modeLabel =
        state.mode === 'auto'
            ? 'Auto'
            : state.mode === 'cursor'
              ? 'Cursor'
              : state.mode === 'head'
                ? 'Head pointer'
                : 'Directional';
    const lines = [`Mode: ${state.gazeOn ? modeLabel : 'off'}`, `Face: ${state.gazeOn ? 'ok' : 'camera off'}`];
    if (els.lastQuality && state.gazeOn) {
        lines.push(`FPS: ${els.lastQuality.fps}`);
        if (els.lastQuality.backend) {
            lines.push(`Engine: ${els.lastQuality.backend}${els.lastQuality.inference ? ` (${els.lastQuality.inference})` : ''}`);
        }
        lines.push(
            `Jitter: ${els.lastQuality.jitter.toFixed(3)}${els.lastQuality.jitter > JITTER_WARN ? ' — check lighting' : ''}`
        );
    }
    gazeCheckEl.textContent = lines.join('\n');
    gazeCheckEl.hidden = false;
}
