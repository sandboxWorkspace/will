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

const SETTINGS_KEY = 'aac-settings';
// Board library + user content. The shipped library lives in
// public/data/aacBoards.json (id → { name, icon?, tiles }). User content is
// localStorage — same project storage approach as settings; no
// accounts/backend. Shape: { overrides: { boardId: {name, tiles} },
// customs: { customId: {name, tiles} } } — overrides replace library
// boards (edits + the legacy single-board customization), customs are
// user-made boards listed under "My boards".
const CUSTOM_BOARDS_KEY = 'aac-custom-boards';
const LEGACY_CUSTOM_KEY = 'aac-custom-board';
// Per-device, named-user calibration persistence (localStorage — same
// project storage approach as settings/custom board; no accounts/backend).
// Shape: { name, savedAt, vw, vh, fits: { gaze?, head? } }
const CALIB_KEY = 'aac-calib-profile';
// Grid density: auto = viewport tier (small phones ≤3 cols so a 3×3 grid
// never shrinks, large phones 4, tablets 6, desktop up to 8), all clamped
// by a minimum tile width so manual picks can't make tiles unreadable.
const MIN_TILE_FLOOR_PX = 95;
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

// Captions strip: expiring history of speech + system notices (initial
// values — tune from use). Speech captions are tap-to-repeat; a repeat
// refreshes the entry instead of duplicating it. Nothing is stored.
const CAPTION_MAX = 3;
const CAPTION_TTL_SPEECH_MS = 15000;
const CAPTION_TTL_NOTICE_MS = 6000;
const CAPTION_FADE_MS = 600;
const CAPTION_TICK_MS = 500;

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
    tiles: [], // RENDERED tiles of the current board (incl. synthetic nav tiles)
    allBoards: {}, // merged view: library + overrides + customs
    libraryIds: new Set(), // board ids that come from the shipped library
    customStore: { overrides: {}, customs: {} },
    boardStack: ['home'], // navigation stack; top = current board id
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
    messages: [], // captions strip entries: { html, speech, expiresAt }
    settings: {
        mode: 'auto',
        dwellMs: 800,
        showDot: true,
        showPad: false,
        userName: '',
        showEmoji: true,
        colsPerRow: 'auto'
    }
};

// Synthetic tiles injected at render time (never persisted)
const BACK_TILE = { id: '__back', label: 'Back', icon: '⬅', go: '__back' };
const MY_BOARDS_TILE = { id: '__myboards', label: 'My boards', icon: '📋', go: '__myboards' };

const els = {};
let captionsEl, statusBarEl, gazeDotEl, root;
let captionTicker = null;

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
    captionsEl = document.getElementById('captions');
    statusBarEl = document.getElementById('gaze-status');
    gazeDotEl = document.getElementById('gaze-dot');
    if (!root || !captionsEl) return;
    Object.assign(els, {
        gazeToggle: document.getElementById('gaze-toggle'),
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
        setEmoji: document.getElementById('set-emoji'),
        setCols: document.getElementById('set-cols'),
        setEdit: document.getElementById('set-edit'),
        setRecalib: document.getElementById('set-recalib'),
        boardNewOpen: document.getElementById('boardnew-open'),
        boardNewModal: document.getElementById('boardnew-modal'),
        boardNewName: document.getElementById('boardnew-name'),
        boardNewList: document.getElementById('boardnew-list'),
        boardNewCreate: document.getElementById('boardnew-create'),
        boardNewCancel: document.getElementById('boardnew-cancel'),
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
    updateFeedback('Tap a tile to speak it aloud.', { ttl: 10000 });
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
    applyGridCols(); // tiles-per-row follows the window shape
    const fit = activeFit();
    if (!fit) return;
    const fitAspect = fit.vw / fit.vh;
    const nowAspect = window.innerWidth / window.innerHeight;
    if (Math.abs(fitAspect - nowAspect) / fitAspect < 0.15) return;
    if (rotateHintTimer) clearTimeout(rotateHintTimer);
    rotateHintTimer = setTimeout(() => {
        updateFeedback('Screen turned — recalibrate in Settings to re-fit for accuracy.');
    }, 900);
});

// ── Board data ─────────────────────────────────────────────

/** One-time migration: the old single-custom-board key becomes a home override. */
function migrateLegacyCustom() {
    try {
        const raw = localStorage.getItem(LEGACY_CUSTOM_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const tiles = parsed && Array.isArray(parsed.tiles) ? parsed.tiles : null;
        if (tiles && tiles.length) {
            const store = readCustomBoards();
            if (!store.overrides.home) {
                store.overrides.home = { name: 'Speaking Board', tiles };
                persistCustomBoards(store);
            }
        }
        localStorage.removeItem(LEGACY_CUSTOM_KEY);
    } catch (err) { /* storage unavailable */ }
}

function readCustomBoards() {
    try {
        const raw = localStorage.getItem(CUSTOM_BOARDS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') {
            return {
                overrides:
                    parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
                customs:
                    parsed.customs && typeof parsed.customs === 'object' ? parsed.customs : {}
            };
        }
    } catch (err) { /* storage unavailable */ }
    return { overrides: {}, customs: {} };
}

function persistCustomBoards(store) {
    try {
        localStorage.setItem(CUSTOM_BOARDS_KEY, JSON.stringify(store));
    } catch (err) { /* storage unavailable */ }
}

async function loadTiles() {
    let library = null;
    try {
        const res = await fetch('data/aacBoards.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.boards && data.boards.home) library = data.boards;
    } catch (err) {
        console.error('aacBoard: failed to load board data', err);
    }
    migrateLegacyCustom();
    const store = readCustomBoards();
    if (!library) {
        // Offline/partial loads: user content alone can carry the app
        const home = store.overrides.home || store.customs.home;
        if (!home) {
            updateFeedback('Board data failed to load. Please reload the page.');
            return false;
        }
        library = { home };
    }
    state.libraryIds = new Set(Object.keys(library));
    state.customStore = store;
    state.allBoards = { ...library, ...store.overrides, ...store.customs };
    state.boardStack = ['home'];
    return true;
}

const currentBoardId = () => state.boardStack[state.boardStack.length - 1];

const hasCustomBoards = () => Object.keys(state.customStore.customs).length > 0;

/** Rendered tiles for a board: real tiles + injected navigation synthetics. */
function boardTilesFor(boardId) {
    const board = state.allBoards[boardId];
    if (!board) return [];
    const tiles = Array.isArray(board.tiles) ? [...board.tiles] : [];
    if (boardId === '__myboards') {
        return tiles; // already synthesized by myBoardsBoard()
    }
    if (boardId !== 'home') tiles.unshift(BACK_TILE);
    if (boardId === 'more' && hasCustomBoards()) tiles.push(MY_BOARDS_TILE);
    return tiles;
}

/** The generated "My boards" list: one nav tile per user-made board. */
function myBoardsBoard() {
    const tiles = Object.keys(state.customStore.customs)
        .sort()
        .map((id) => ({
            id: `go-${id}`,
            label: state.customStore.customs[id].name || 'Board',
            icon: '📋',
            go: id
        }));
    return { name: 'My boards', tiles };
}

function navigate(target) {
    if (target === '__back') {
        if (state.boardStack.length > 1) state.boardStack.pop();
        else return;
    } else if (target === '__myboards') {
        state.allBoards.__myboards = myBoardsBoard();
        state.boardStack.push('__myboards');
    } else if (state.allBoards[target]) {
        state.boardStack.push(target);
        if (state.boardStack.length > 16) state.boardStack.splice(1, 1); // sanity cap
    } else {
        return;
    }
    renderBoard();
    const board = state.allBoards[currentBoardId()];
    if (board && board.name) {
        updateFeedback(`Opened: <strong>${escapeHtml(board.name)}</strong>`);
    }
}

/** Persist the current board's rendered tiles (synthetics stripped). */
function writeBoard() {
    const id = currentBoardId();
    if (id === '__myboards') return; // generated view — nothing to persist
    const board = state.allBoards[id];
    if (!board) return;
    const tiles = state.tiles
        .filter((t) => t.id !== '__back' && t.id !== '__myboards')
        .map((t) => ({
            id: t.id,
            label: String(t.label || '').slice(0, 24),
            icon: typeof t.icon === 'string' ? t.icon.slice(0, 4) : '',
            speech: String(t.speech || t.label || '').slice(0, 80),
            go: typeof t.go === 'string' ? t.go : ''
        }));
    const store = readCustomBoards();
    if (state.libraryIds.has(id)) store.overrides[id] = { name: board.name, tiles };
    else store.customs[id] = { name: board.name, tiles };
    persistCustomBoards(store);
    state.customStore = store;
    state.allBoards[id] = { ...board, tiles };
}

function renderBoard() {
    state.tiles = boardTilesFor(currentBoardId());
    const cols = computeGridCols();
    const rows = Math.ceil(state.tiles.length / cols);
    const blanks = Math.max(0, cols * rows - state.tiles.length);
    // Edit mode shows the grid's blank cells as "Add" placeholders (and one
    // trailing cell when the grid is full, so a board can always grow).
    // They are DOM-only: never in state.tiles, never gaze/hit-test targets
    // (gaze is off in edit mode), and always appended AFTER real tiles so
    // element indexes still line up with state.tiles.
    const addCells = state.editMode ? Math.max(1, blanks) : 0;
    const tilesHtml = state.tiles
        .map(
            (tile, index) => `
        <button class="aac-tile${tile.go ? ' aac-tile-category' : ''}" data-index="${index}" type="button" aria-label="${escapeHtml(tile.go ? `Open ${tile.label || ''}` : tile.label || '')}">
            ${tile.icon ? `<span class="aac-icon" aria-hidden="true">${escapeHtml(tile.icon)}</span>` : ''}
            <span class="aac-label">${escapeHtml(tile.label || '')}</span>
            <span class="dwell-bar" aria-hidden="true"></span>
        </button>`
        )
        .join('');
    const addHtml = Array.from({ length: addCells }, () => `
        <button class="aac-tile aac-tile-add" type="button" data-add="1" aria-label="Add a tile here">
            <span class="aac-icon" aria-hidden="true">➕</span>
            <span class="aac-label">Add</span>
        </button>`).join('');
    root.innerHTML = tilesHtml + addHtml;
    root.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    applyEmojiSetting();
    dwellCtl.reset();
    setHoverVisual(-1, true);
    setHighlight(-1);
}

// ── Grid density + emoji display (Settings-driven) ───────────

/**
 * Auto column choice: minimize BLANK CELLS first (a grid that fills its
 * rows completely), with tile squareness as the tiebreaker — so a 9-tile
 * home board is a full 3×3, a 15-tile word board earns 5 columns, and a
 * 5-tile animals board avoids a lonely single row. Caps keep phones ≤3
 * columns and every tile ≥ the width floor; manual picks clamp the same way.
 */
function computeGridCols() {
    const vw = window.innerWidth;
    const tierCap = vw <= 420 ? 3 : vw <= 768 ? 4 : vw <= 1200 ? 6 : 8;
    const width = root ? root.clientWidth || vw : vw;
    const widthCap = Math.max(2, Math.floor(width / MIN_TILE_FLOOR_PX));
    const n = Math.max(1, state.tiles.length);
    const pref = state.settings.colsPerRow;
    if (pref && pref !== 'auto' && Number.isFinite(Number(pref))) {
        return Math.max(2, Math.min(Number(pref), tierCap, widthCap));
    }
    const height = root && root.clientHeight ? root.clientHeight : width * 0.6;
    const maxCols = Math.min(tierCap, widthCap, Math.max(2, n));
    let cols = 2;
    let best = Infinity;
    for (let c = 2; c <= maxCols; c++) {
        const rows = Math.ceil(n / c);
        const blanks = c * rows - n;
        const aspect = Math.abs(Math.log(width / c / (height / rows)));
        const score = blanks * 0.6 + aspect;
        if (score < best) {
            best = score;
            cols = c;
        }
    }
    return Math.max(2, Math.min(cols, tierCap, widthCap));
}

function applyGridCols() {
    if (!root) return;
    root.style.gridTemplateColumns = `repeat(${computeGridCols()}, 1fr)`;
}

function applyEmojiSetting() {
    if (!root) return;
    root.classList.toggle('no-emoji', !state.settings.showEmoji);
}

const tileEls = () => Array.from(root.querySelectorAll('.aac-tile'));

// ── Touch / keyboard ────────────────────────────────────────

function wireTouchAndKeys() {
    // Captions: tap a SPEECH caption to repeat it (refreshes to the front
    // with a new TTL — a repeat, not a duplicate entry).
    captionsEl.addEventListener('click', (event) => {
        const el = event.target.closest('.aac-caption-speech');
        if (!el) return;
        const m = state.messages[Number(el.dataset.mindex)];
        if (!m || !m.speech) return;
        speech.speak(m.speech);
        const now = performance.now();
        state.messages = state.messages.filter((x) => x !== m);
        state.messages.unshift({ ...m, expiresAt: now + CAPTION_TTL_SPEECH_MS });
        renderCaptions(true);
    });

    root.addEventListener('click', (event) => {
        const tileEl = event.target.closest('.aac-tile');
        if (!tileEl) return;
        // Blank-cell "Add" placeholders (edit mode only, DOM-only elements)
        if (tileEl.dataset.add) {
            if (state.editMode) addTile();
            return;
        }
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
            if (els.boardNewModal) els.boardNewModal.hidden = true;
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
    // Category tiles navigate (silently) instead of speaking — one activation,
    // one outcome, in every input mode (touch, gaze dwell, directional, pad).
    if (tile.go) {
        navigate(tile.go);
        return;
    }
    const phrase = tile.speech || tile.label;
    speech.speak(phrase);
    pushMessage(escapeHtml(phrase), { speech: phrase, ttl: CAPTION_TTL_SPEECH_MS });
    const el = tileEls()[index];
    if (el) {
        el.classList.add('just-spoken');
        setTimeout(() => el.classList.remove('just-spoken'), FLASH_MS);
    }
}

// ── Captions strip: expiring speech + notices ────────────────

/**
 * Add an entry to the captions strip. Speech entries (speech != null) are
 * tap-to-repeat; notices (default) are plain text. Both expire — the strip
 * is fully self-clearing and nothing is stored.
 */
function pushMessage(html, { speech = null, ttl = CAPTION_TTL_NOTICE_MS } = {}) {
    const now = performance.now();
    state.messages.unshift({ html, speech, expiresAt: now + ttl });
    if (state.messages.length > CAPTION_MAX) state.messages.length = CAPTION_MAX;
    renderCaptions(true);
    if (captionTicker) return;
    captionTicker = setInterval(() => renderCaptions(false), CAPTION_TICK_MS);
}

function renderCaptions(rebuild) {
    if (!captionsEl) return;
    const now = performance.now();
    const alive = state.messages.filter((m) => m.expiresAt > now);
    if (alive.length !== state.messages.length) rebuild = true;
    state.messages = alive;
    if (!state.messages.length) {
        captionsEl.innerHTML = '';
        if (captionTicker) {
            clearInterval(captionTicker);
            captionTicker = null;
        }
        applyGridCols(); // board reclaims the strip's space
        return;
    }
    if (rebuild) {
        captionsEl.innerHTML = state.messages
            .map(
                (m, i) =>
                    (m.speech
                        ? `<button type="button" class="aac-caption aac-caption-speech`
                        : `<div class="aac-caption`) +
                    `${i === 0 ? ' aac-caption-new' : ''}"${m.speech ? ` data-mindex="${i}"` : ''}>${m.html}</${m.speech ? 'button' : 'div'}>`
            )
            .join('');
        applyGridCols(); // board height changed with the strip
    }
    captionsEl.querySelectorAll('.aac-caption').forEach((el, i) => {
        const m = state.messages[i];
        el.classList.toggle('dying', Boolean(m && m.expiresAt - now < CAPTION_FADE_MS));
    });
}

/** System feedback == an expiring caption notice (kept as updateFeedback for call-site clarity). */
function updateFeedback(html, opts) {
    pushMessage(html, opts);
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

    // (Calibrate lives in Settings → Calibration → Recalibrate; first Gaze
    // start still auto-runs the guided flow when no saved fit exists.)

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
        'Calibration not completed — using Directional gaze (no calibration needed). Recalibrate anytime in Settings to set up the cursor.'
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
        },
        // Poor-camera recovery: restart the whole flow with the 720p flag,
        // or switch this user to a head-pointer calibration instead
        onHiResRetry: () => {
            state.lock = null;
            updatePadVisibility();
            retryCalibrationHiRes(kind, onDone, onCancel);
        },
        onHeadRetry:
            kind === 'gaze'
                ? () => {
                      state.lock = null;
                      updatePadVisibility();
                      launchCalibration(
                          'head',
                          (fit) => {
                              if (fit) {
                                  state.settings.mode = 'head';
                                  saveSettings();
                                  updateFeedback(
                                      'Head-pointer calibrated — set as the gaze mode.'
                                  );
                              } else fallbackToDirectional();
                          },
                          () => fallbackToDirectional()
                      );
                  }
                : null
    });
}

/** Restart gaze with the 720p camera flag set, then re-run the calibration. */
async function retryCalibrationHiRes(kind, onDone, onCancel) {
    try {
        localStorage.setItem('aac-hires', '1');
    } catch (err) { /* storage unavailable */ }
    if (els.setHiRes) els.setHiRes.checked = true;
    stopGaze();
    updateFeedback('High-detail camera enabled — restarting Gaze…');
    if (!(await ensureEngine())) return; // engine status explains the failure
    launchCalibration(kind, onDone, onCancel);
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

/**
 * Edit mode entry/exit. Entry lives in Settings → Board → "✏️ Edit this
 * board"; exit is the Done editing button in the edit toolbar.
 */
function enterEditMode() {
    if (state.editMode) return;
    state.editMode = true;
    stopGaze();
    els.editTools.hidden = false;
    updateEditResetLabel();
    cancelDwell();
    dwellCtl.reset();
    setHoverVisual(-1, true);
    updatePadVisibility();
    renderBoard(); // blank-cell Add placeholders appear
    updateFeedback('Editing: tap a tile to change it. Boards save on this device.');
}

function exitEditMode() {
    if (!state.editMode) return;
    state.editMode = false;
    els.editTools.hidden = true;
    cancelDwell();
    dwellCtl.reset();
    setHoverVisual(-1, true);
    updatePadVisibility();
    renderBoard();
    updateFeedback('Done editing — tap a tile to speak it aloud.', { ttl: 8000 });
}

function wireEdit() {
    els.editToggle.addEventListener('click', exitEditMode);

    els.editAdd.addEventListener('click', addTile);

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
        writeBoard();
        els.editModal.hidden = true;
        renderBoard();
    });

    els.editDelete.addEventListener('click', () => {
        if (editIndex < 0) return;
        const tile = state.tiles[editIndex];
        if (tile && (tile.id === '__back' || tile.id === '__myboards')) return;
        if (state.tiles.length <= 1) return;
        state.tiles.splice(editIndex, 1);
        writeBoard();
        els.editModal.hidden = true;
        renderBoard();
    });

    els.editCancel.addEventListener('click', () => {
        els.editModal.hidden = true;
    });

    // Export/import carry ALL user content: overrides of library boards and
    // custom boards. Legacy single-board exports still import (as the home
    // board override), so old files keep working.
    els.editExport.addEventListener('click', () => {
        const store = readCustomBoards();
        const blob = new Blob(
            [JSON.stringify({ version: 2, overrides: store.overrides, customs: store.customs }, null, 2)],
            { type: 'application/json' }
        );
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
                const imported = sanitizeImport(parsed);
                if (!imported) throw new Error('invalid');
                const store = { overrides: imported.overrides, customs: imported.customs };
                persistCustomBoards(store);
                loadTiles().then((ok) => {
                    if (ok) {
                        renderBoard();
                        updateFeedback('Boards imported.');
                    }
                });
            } catch (err) {
                updateFeedback('Import failed — file must be a Speak Board export.');
            }
            els.editImportFile.value = '';
        };
        reader.readAsText(file);
    });

    // Reset/delete semantics depend on the current board: library boards
    // reset to their shipped defaults (removes the override); user-made
    // boards are deleted entirely.
    els.editReset.addEventListener('click', () => {
        const id = currentBoardId();
        if (id === '__myboards') return;
        const isCustom = !state.libraryIds.has(id) && id !== 'home';
        if (els.editReset.dataset.armed) {
            const store = readCustomBoards();
            if (isCustom) {
                delete store.customs[id];
                persistCustomBoards(store);
                state.customStore = store;
                delete state.allBoards[id];
                state.boardStack.pop();
            } else {
                delete store.overrides[id];
                persistCustomBoards(store);
                state.customStore = store;
                state.allBoards[id] = undefined;
            }
            delete els.editReset.dataset.armed;
            loadTiles().then(() => {
                // Stay on the board after a reset (it still exists); a deleted
                // custom board falls back to home.
                if (!isCustom && state.allBoards[id]) state.boardStack = [id];
                renderBoard();
                updateEditResetLabel();
            });
            updateFeedback(isCustom ? 'Board deleted.' : 'Board reset to defaults.');
        } else {
            els.editReset.dataset.armed = '1';
            els.editReset.textContent = isCustom ? 'Delete board?' : 'Confirm reset?';
            setTimeout(() => {
                delete els.editReset.dataset.armed;
                updateEditResetLabel();
            }, 3000);
        }
    });

    wireBoardNew();
}

/** Reset-button label for the board being edited. */
function updateEditResetLabel() {
    if (!els.editReset) return;
    const id = currentBoardId();
    if (id === '__myboards') {
        els.editReset.hidden = true;
        return;
    }
    els.editReset.hidden = false;
    const isCustom = !state.libraryIds.has(id) && id !== 'home';
    els.editReset.textContent = isCustom ? 'Delete board' : 'Reset board';
}

/** Append a tile to the current board (Add tile button + grid placeholders). */
function addTile() {
    if (currentBoardId() === '__myboards') {
        updateFeedback('This list is generated from your boards — create one with New board.');
        return;
    }
    state.tiles.push({ id: `t${Date.now()}`, label: 'New button', icon: '', speech: '' });
    writeBoard();
    renderBoard();
    openEditor(state.tiles.length - 1);
}

/**
 * New board from a pasted list — one word per line, optional icon after a
 * pipe ("shark | 🦈"). Creates a custom board listed under My boards.
 */
function wireBoardNew() {
    if (!els.boardNewOpen) return;
    els.boardNewOpen.addEventListener('click', () => {
        if (!els.boardNewModal) return;
        els.boardNewName.value = '';
        els.boardNewList.value = '';
        els.boardNewModal.hidden = false;
        els.boardNewName.focus();
    });
    if (els.boardNewCancel) {
        els.boardNewCancel.addEventListener('click', () => {
            els.boardNewModal.hidden = true;
        });
    }
    if (els.boardNewCreate) {
        els.boardNewCreate.addEventListener('click', () => {
            const name = (els.boardNewName.value || '').trim().slice(0, 24);
            const lines = els.boardNewList.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);
            const tiles = [];
            lines.forEach((line) => {
                const [word, icon] = line.split('|').map((part) => part.trim());
                if (!word) return;
                tiles.push({
                    id: `t${tiles.length}`,
                    label: word.slice(0, 24),
                    icon: icon ? icon.slice(0, 4) : '',
                    speech: word.slice(0, 80)
                });
            });
            if (!name || !tiles.length) {
                updateFeedback('New board needs a name and at least one word.');
                return;
            }
            const id = `custom-${Date.now()}`;
            const store = readCustomBoards();
            store.customs[id] = { name, tiles };
            persistCustomBoards(store);
            state.customStore = store;
            state.allBoards[id] = { name, tiles };
            els.boardNewModal.hidden = true;
            navigate(id);
            updateFeedback(`Board "${escapeHtml(name)}" created — add more tiles with Add tile.`);
        });
    }
}

/** Accepts v2 full exports or legacy single-board files; returns a clean store shape. */
function sanitizeImport(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;
    const cleanTiles = (tiles) => {
        if (!Array.isArray(tiles) || !tiles.length) return null;
        if (!tiles.every((t) => t && t.label)) return null;
        return tiles.map((t, i) => ({
            id: t.id || `t${i}`,
            label: String(t.label).slice(0, 24),
            icon: typeof t.icon === 'string' ? t.icon.slice(0, 4) : '',
            speech: String(t.speech || t.label).slice(0, 80),
            go: typeof t.go === 'string' ? t.go.slice(0, 32) : ''
        }));
    };
    const cleanMap = (obj) => {
        const out = {};
        if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach((id) => {
                const board = obj[id];
                if (!board || !board.name) return;
                const tiles = cleanTiles(board.tiles);
                if (tiles) out[id] = { name: String(board.name).slice(0, 24), tiles };
            });
        }
        return out;
    };
    if (parsed.version === 2) {
        return { overrides: cleanMap(parsed.overrides), customs: cleanMap(parsed.customs) };
    }
    const legacy = parsed.tiles || parsed.boards?.home?.tiles;
    const tiles = cleanTiles(legacy);
    if (!tiles) return null;
    return { overrides: { home: { name: 'Speaking Board', tiles } }, customs: {} };
}

function openEditor(index) {
    editIndex = index;
    const tile = state.tiles[index];
    if (!tile) return;
    // Synthetic navigation tiles are not editable content
    if (tile.id === '__back' || tile.id === '__myboards') {
        editIndex = -1;
        return;
    }
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
    if (typeof state.settings.showEmoji !== 'boolean') state.settings.showEmoji = true;
    if (typeof state.settings.colsPerRow !== 'string') state.settings.colsPerRow = 'auto';
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
        if (els.setEmoji) els.setEmoji.checked = state.settings.showEmoji;
        if (els.setCols) els.setCols.value = state.settings.colsPerRow || 'auto';
        if (els.setUser) els.setUser.value = profileName();
        renderCalibStatus();
        fillVoices();
        els.settingsModal.hidden = false;
    });

    els.setClose.addEventListener('click', () => {
        els.settingsModal.hidden = true;
    });

    // Unified panel: board-editing + recalibrate launchers (the former
    // top-row Calibrate and Edit buttons live here now)
    if (els.setEdit) {
        els.setEdit.addEventListener('click', () => {
            els.settingsModal.hidden = true;
            enterEditMode();
        });
    }

    if (els.setRecalib) {
        els.setRecalib.addEventListener('click', async () => {
            speech.prime();
            els.settingsModal.hidden = true; // modal would cover the dots
            if (!(await ensureEngine())) return;
            // Recalibrate the kind the Settings mode resolves to
            const kind = state.settings.mode === 'head' ? 'head' : 'gaze';
            launchCalibration(
                kind,
                () => activateMode(kind === 'head' ? 'head' : 'auto'),
                () => {}
            );
        });
    }

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

    // Emoji display: words always remain; icons are optional decoration
    if (els.setEmoji) {
        els.setEmoji.addEventListener('change', () => {
            state.settings.showEmoji = els.setEmoji.checked;
            applyEmojiSetting();
            saveSettings();
        });
    }

    // Grid density: Auto follows the viewport tier; manual picks are
    // clamped so tiles can never shrink below the floor on small screens
    if (els.setCols) {
        els.setCols.addEventListener('change', () => {
            state.settings.colsPerRow = els.setCols.value;
            applyGridCols();
            saveSettings();
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

