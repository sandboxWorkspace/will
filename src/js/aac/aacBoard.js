/**
 * Speak Board — base board renderer and input dispatcher.
 * Input-agnostic by design: touch, keyboard, and gaze all funnel into the
 * same moveHighlight() / activate() calls, so new input modules plug in by
 * dispatching 'aac:gaze-*' style events (see gazeEngine.js).
 */
import * as speech from './speech.js';
import { escapeHtml } from '../utils/utils.js';

const DWELL_MS = 800;
const FLASH_MS = 350;

const state = {
    tiles: [],
    highlight: -1,
    gazeOn: false,
    dwellArmed: false,
    dwellRAF: null,
    engine: null
};

/**
 * Entry point, called from scripts.js when #aac-board exists on the page.
 */
export async function initBoard() {
    const root = document.getElementById('aac-board');
    const lastSaid = document.getElementById('last-said');
    const toggle = document.getElementById('gaze-toggle');
    const statusBar = document.getElementById('gaze-status');
    if (!root || !lastSaid || !toggle) return;

    let data;
    try {
        const res = await fetch('data/aacBoards.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
    } catch (err) {
        lastSaid.textContent = 'Board data failed to load. Please reload the page.';
        console.error('aacBoard: failed to load board data', err);
        return;
    }

    const board = data.boards && data.boards.home;
    if (!board || !Array.isArray(board.tiles) || !board.tiles.length) {
        lastSaid.textContent = 'Board data is empty. Please reload the page.';
        return;
    }
    state.tiles = board.tiles;

    root.innerHTML = board.tiles
        .map(
            (tile, index) => `
        <button class="aac-tile" data-index="${index}" type="button" aria-label="${escapeHtml(tile.label)}">
            <span class="aac-icon" aria-hidden="true">${tile.icon}</span>
            <span class="aac-label">${escapeHtml(tile.label)}</span>
            <span class="dwell-bar" aria-hidden="true"></span>
        </button>`
        )
        .join('');

    const tileEls = () => Array.from(root.querySelectorAll('.aac-tile'));

    // --- Touch / mouse / keyboard-activated buttons ---
    root.addEventListener('click', (event) => {
        const tileEl = event.target.closest('.aac-tile');
        if (!tileEl) return;
        activate(Number(tileEl.dataset.index));
    });

    // Arrow keys move the highlight (also the seam for future switch access)
    document.addEventListener('keydown', (event) => {
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

    // --- Gaze engine events (dispatched on document) ---
    document.addEventListener('aac:gaze-dir', (event) => {
        moveHighlight(event.detail.dir);
    });
    document.addEventListener('aac:gaze-center', (event) => {
        if (event.detail.active) startDwell(tileEls);
        else {
            state.dwellArmed = true;
            cancelDwell(tileEls);
        }
    });
    document.addEventListener('aac:gaze-blink', () => {
        if (state.highlight >= 0) activate(state.highlight);
    });
    document.addEventListener('aac:gaze-status', (event) => {
        statusBar.hidden = false;
        statusBar.textContent = event.detail.text;
        statusBar.classList.toggle('warn', Boolean(event.detail.warn));
        if (!event.detail.text) statusBar.hidden = true;
    });

    // --- Gaze toggle ---
    toggle.addEventListener('click', async () => {
        speech.prime(); // real user gesture: unlocks iOS speech
        if (!state.gazeOn) {
            try {
                if (!state.engine) state.engine = await import('./gazeEngine.js');
            } catch (err) {
                console.error('aacBoard: failed to load gaze engine', err);
                return;
            }
            const ok = await state.engine.start();
            state.gazeOn = ok;
            if (ok) {
                setHighlight(0, tileEls);
                state.dwellArmed = true;
            }
        } else {
            state.engine.stop();
            state.gazeOn = false;
            cancelDwell(tileEls);
            setHighlight(-1, tileEls);
        }
        toggle.textContent = state.gazeOn ? 'Gaze: On' : 'Gaze: Off';
        toggle.classList.toggle('gaze-on', state.gazeOn);
        toggle.setAttribute('aria-pressed', String(state.gazeOn));
    });

    function currentCols() {
        const cols = getComputedStyle(root).gridTemplateColumns;
        return cols.split(' ').filter(Boolean).length || 2;
    }

    function setHighlight(index, els) {
        state.highlight = index;
        els().forEach((el, i) => el.classList.toggle('highlight', i === index));
    }

    function moveHighlight(dir) {
        if (dir !== 'up' && dir !== 'down' && dir !== 'left' && dir !== 'right') return;
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
        if (to >= total) return; // empty grid cell
        if (to !== from || state.highlight < 0) {
            cancelDwell(tileEls);
            setHighlight(to, tileEls);
        }
    }

    function startDwell(els) {
        cancelDwell(els);
        if (!state.dwellArmed || state.highlight < 0) return;
        const start = performance.now();
        const step = (now) => {
            const elapsed = now - start;
            const bar = els()[state.highlight] && els()[state.highlight].querySelector('.dwell-bar');
            if (bar) bar.style.width = `${Math.min(100, (elapsed / DWELL_MS) * 100)}%`;
            if (elapsed >= DWELL_MS) {
                state.dwellRAF = null;
                state.dwellArmed = false;
                activate(state.highlight);
                return;
            }
            state.dwellRAF = requestAnimationFrame(step);
        };
        state.dwellRAF = requestAnimationFrame(step);
    }

    function cancelDwell(els) {
        if (state.dwellRAF) cancelAnimationFrame(state.dwellRAF);
        state.dwellRAF = null;
        const highlighted = els()[state.highlight];
        const bar = highlighted && highlighted.querySelector('.dwell-bar');
        if (bar) bar.style.width = '0%';
    }

    function activate(index) {
        const tile = state.tiles[index];
        if (!tile) return;
        speech.speak(tile.speech);
        lastSaid.innerHTML = `Said: <strong>${escapeHtml(tile.speech)}</strong>`;
        const el = tileEls()[index];
        if (el) {
            el.classList.add('just-spoken');
            setTimeout(() => el.classList.remove('just-spoken'), FLASH_MS);
        }
    }
}
