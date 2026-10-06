/**
 * Gaze Practice — bubble-popping training game for Speak Board.
 *
 * A round of bubbles appears one at a time; the user pops each by holding
 * their (calibrated) gaze on it. Doubles as dwell-training for new gaze
 * users and as a quick functional check for calibration quality.
 *
 * startPractice({ getPoint, onExit })
 *   getPoint(sample) — callback supplied by the board: maps a raw gaze
 *                     sample to screen px ({x, y}) or null when unavailable
 *   onExit()         — called when the overlay is closed
 */

const BUBBLE_COUNT = 10;
const BUBBLE_SIZE = 110;
const POP_DWELL_MS = 400;
const AVG_MARGIN = 0.04;

export function startPractice({ getPoint, onExit }) {
    const overlay = document.getElementById('practice-overlay');
    const stage = document.getElementById('practice-stage');
    const hud = document.getElementById('practice-hud');
    const exitBtn = document.getElementById('practice-exit');
    if (!overlay || !stage || !hud || !exitBtn) return;

    let active = true;
    let bubble = null;
    let popped = 0;
    let times = [];
    let dwellStart = 0;
    let spawnedAt = 0;
    let sampleListener = null;
    let escListener = null;

    const cleanup = () => {
        active = false;
        if (sampleListener) document.removeEventListener('aac:gaze-sample', sampleListener);
        if (escListener) document.removeEventListener('keydown', escListener);
        stage.innerHTML = '';
        overlay.hidden = true;
        exitBtn.removeEventListener('click', onExitClick);
    };

    function onExitClick() {
        cleanup();
        if (onExit) onExit();
    }

    const spawnBubble = () => {
        if (!active) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const margin = BUBBLE_SIZE / 2 + 30;
        bubble = document.createElement('div');
        bubble.className = 'practice-bubble';
        bubble.style.width = `${BUBBLE_SIZE}px`;
        bubble.style.height = `${BUBBLE_SIZE}px`;
        bubble.style.left = `${margin + Math.random() * (w - margin * 2) - BUBBLE_SIZE / 2}px`;
        bubble.style.top = `${margin + Math.random() * (h - margin * 2) - BUBBLE_SIZE / 2}px`;
        stage.appendChild(bubble);
        dwellStart = 0;
        spawnedAt = performance.now();
        hud.textContent = `Bubble ${popped + 1} of ${BUBBLE_COUNT} — look at it to pop`;
    };

    const showSummary = () => {
        const avg = times.length
            ? (times.reduce((sum, t) => sum + t, 0) / times.length / 1000).toFixed(1)
            : '—';
        stage.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'calib-card';
        card.innerHTML = `
            <h2>Nice work!</h2>
            <p>${BUBBLE_COUNT} bubbles popped.</p>
            <p>Average pop time: ${avg} s.</p>
            <div class="modal-actions">
                <button class="button green-button aac-ctl" data-act="again">Play again</button>
                <button class="button pending-button aac-ctl" data-act="exit">Exit</button>
            </div>`;
        stage.appendChild(card);
        card.querySelector('[data-act="again"]').addEventListener('click', () => {
            popped = 0;
            times = [];
            spawnBubble();
        });
        card.querySelector('[data-act="exit"]').addEventListener('click', onExitClick);
    };

    const pop = () => {
        const elapsed = performance.now() - spawnedAt;
        times.push(elapsed);
        popped += 1;
        bubble.classList.add('pop');
        const old = bubble;
        setTimeout(() => old.remove(), 250);
        bubble = null;
        if (popped >= BUBBLE_COUNT) showSummary();
        else setTimeout(spawnBubble, 400);
    };

    sampleListener = (event) => {
        if (!active || !bubble) return;
        const point = getPoint(event.detail);
        if (!point) {
            dwellStart = 0;
            bubble.classList.remove('pop');
            return;
        }
        const rect = bubble.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const inside =
            Math.hypot(point.x - cx, point.y - cy) <=
            rect.width / 2 + (rect.width * AVG_MARGIN);
        const now = performance.now();
        if (inside) {
            if (!dwellStart) dwellStart = now;
            if (now - dwellStart >= POP_DWELL_MS) pop();
        } else {
            dwellStart = 0;
        }
    };

    escListener = (event) => {
        if (event.key === 'Escape') onExitClick();
    };

    overlay.hidden = false;
    exitBtn.addEventListener('click', onExitClick);
    document.addEventListener('aac:gaze-sample', sampleListener);
    document.addEventListener('keydown', escListener);
    spawnBubble();
}
