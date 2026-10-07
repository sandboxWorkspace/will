/**
 * 5-point gaze calibration with visual feedback for Speak Board.
 *
 * While the user looks at each pulsing target, a live dot shows the raw
 * (uncalibrated) gaze signal so they can see tracking working in real time.
 * The collected samples are fit with a per-axis affine map:
 *     screenX = a * gx + b * gy + c
 *     screenY = d * gx + e * gy + f
 * solved as least squares over the 5 target points (mean or median sample
 * per point, depending on variant).
 *
 * Variants (engines and pages pass their variant; fits are format-identical):
 *   'legacy' — production behavior: strict stability gate, mean samples,
 *              no exit affordance during collection
 *   'a'      — Lab A: same sampling as legacy, plus an always-visible Exit
 *              button and a per-point progress bar
 *   'b'      — Lab B: median samples (outlier-robust), relaxed sampling gate
 *              (any frame with a face counts), Exit button, progress bar,
 *              and a live *calibrated* cursor (green) that visibly converges
 *              onto the targets as points are collected
 *
 * Fits are stored in localStorage per source ('iris' or 'head') because the
 * two signals have very different offsets and gains.
 */

const POINTS = [
    [0.12, 0.12],
    [0.88, 0.12],
    [0.88, 0.88],
    [0.12, 0.88],
    [0.5, 0.5]
];
const SAMPLE_MS = 1800;
const MIN_SAMPLES = 12;

const overlay = () => document.getElementById('calib-overlay');
const stage = () => document.getElementById('calib-stage');
const card = () => document.getElementById('calib-card');

function storageKey(source) {
    return `aac-calib-${source}`;
}

export function getFit(source) {
    try {
        const raw = localStorage.getItem(storageKey(source));
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        return null;
    }
}

export function clearFit(source) {
    try {
        localStorage.removeItem(storageKey(source));
    } catch (err) { /* storage unavailable */ }
}

/** Map a raw gaze vector through a stored fit into screen pixels. */
export function applyFit(fit, ux, uy) {
    if (!fit) return null;
    return {
        x: fit.a * ux + fit.b * uy + fit.c,
        y: fit.d * ux + fit.e * uy + fit.f
    };
}

/**
 * Run the full calibration flow. Assumes the gaze engine is already running.
 * Calls onDone(fit) when finished, onCancel() if the user backs out.
 */
export function runCalibration(source, { onDone, onCancel, variant = 'legacy' }) {
    const root = overlay();
    const stageEl = stage();
    const cardEl = card();
    if (!root || !stageEl || !cardEl) return;

    const enhanced = variant === 'a' || variant === 'b';
    let active = false;
    let sampleListener = null;
    let escListener = null;

    const cleanup = () => {
        if (sampleListener) document.removeEventListener('aac:gaze-sample', sampleListener);
        if (escListener) document.removeEventListener('keydown', escListener);
        sampleListener = null;
        escListener = null;
        stageEl.innerHTML = '';
        cardEl.hidden = true;
        root.hidden = true;
        active = false;
    };

    const cancel = () => {
        cleanup();
        if (onCancel) onCancel();
    };

    escListener = (event) => {
        if (event.key === 'Escape') cancel();
    };

    const intro = () => {
        root.hidden = false;
        stageEl.innerHTML = '';
        cardEl.hidden = false;
        cardEl.innerHTML = `
            <h2>Calibrate Gaze</h2>
            <p>Look at each blue dot as it appears. Keep your head as still as you can.</p>
            <p>${variant === 'b' ? 'A green cursor shows your calibrated gaze converging as you go.' : ''} Takes about 15 seconds.</p>
            <div class="modal-actions">
                <button class="button green-button aac-ctl" data-act="start">Start</button>
                <button class="button pending-button aac-ctl" data-act="cancel">Cancel</button>
            </div>`;
        cardEl.querySelector('[data-act="start"]').addEventListener('click', collectPoints);
        cardEl.querySelector('[data-act="cancel"]').addEventListener('click', cancel);
    };

    const collectPoints = async () => {
        cardEl.hidden = true;
        active = true;

        // Target + live raw-gaze dot + point counter (+ variant extras)
        const target = document.createElement('div');
        target.className = 'calib-target';
        const dot = document.createElement('div');
        dot.style.cssText =
            'position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;' +
            'background:#ffd54f;opacity:0.9;z-index:51;pointer-events:none;';
        const counter = document.createElement('div');
        counter.style.cssText =
            'position:absolute;top:max(10px, env(safe-area-inset-top));left:50%;transform:translateX(-50%);' +
            'color:#fff;font-size:1rem;z-index:51;pointer-events:none;text-align:center;';

        const extras = document.createElement('div');
        if (enhanced) {
            // Always-visible exit — Escape does not exist on touch devices
            const exit = document.createElement('button');
            exit.type = 'button';
            exit.className = 'button red-button aac-ctl';
            exit.textContent = 'Exit';
            exit.style.cssText =
                'position:absolute;top:max(10px, env(safe-area-inset-top));right:10px;z-index:52;';
            exit.addEventListener('click', cancel);
            const progress = document.createElement('div');
            progress.style.cssText =
                'position:absolute;top:calc(max(10px, env(safe-area-inset-top)) + 34px);left:50%;' +
                'transform:translateX(-50%);width:220px;height:6px;border-radius:3px;' +
                'background:rgba(255,255,255,0.18);z-index:51;pointer-events:none;';
            const progressFill = document.createElement('div');
            progressFill.style.cssText = 'height:100%;width:0;border-radius:3px;background:#4a90e2;';
            progress.appendChild(progressFill);
            extras.appendChild(exit);
            extras.appendChild(progress);
            if (variant === 'b') {
                const predict = document.createElement('div');
                predict.style.cssText =
                    'position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;' +
                    'background:rgba(76,175,80,0.35);border:3px solid #4caf50;opacity:0.95;' +
                    'z-index:52;pointer-events:none;visibility:hidden;';
                predict.hidden = false;
                extras.appendChild(predict);
                extras.predictDot = predict;
            }
            extras.progressFill = progressFill;
        }

        stageEl.innerHTML = '';
        stageEl.appendChild(target);
        stageEl.appendChild(dot);
        stageEl.appendChild(counter);
        if (enhanced) {
            Array.from(extras.children).forEach((child) => stageEl.appendChild(child));
        }

        const perPoint = [];
        for (let i = 0; i < POINTS.length && active; i++) {
            const [px, py] = POINTS[i];
            target.style.left = `${px * window.innerWidth}px`;
            target.style.top = `${py * window.innerHeight}px`;
            counter.textContent = `Point ${i + 1} of ${POINTS.length} — keep looking at the dot`;

            const samples = [];
            const started = performance.now();
            await new Promise((resolve) => {
                // Everything here is scoped to THIS point: the listener, the
                // progress animation, and the watchdog timer. finish() is the
                // single exit path and is idempotent, so no timer from an
                // earlier point can ever strand a later one (the bug that
                // hung calibration at the 3rd dot).
                let finished = false;
                let progressRAF = null;
                let hardTimer = null;

                const finish = () => {
                    if (finished) return;
                    finished = true;
                    if (progressRAF) cancelAnimationFrame(progressRAF);
                    if (hardTimer) clearTimeout(hardTimer);
                    document.removeEventListener('aac:gaze-sample', listener);
                    if (sampleListener === listener) sampleListener = null;
                    resolve();
                };

                const listener = (event) => {
                    const s = event.detail;
                    if (!s || !s.faceOk) return;
                    const ux = source === 'head' ? s.hx : s.gx;
                    const uy = source === 'head' ? s.hy : s.gy;
                    // legacy/a keep the strict stability gate; b accepts any
                    // tracked frame — the fit tolerates noise
                    if (variant !== 'b' && !s.stable) return;
                    samples.push([ux, uy]);
                    dot.style.left = `${ux * window.innerWidth}px`;
                    dot.style.top = `${uy * window.innerHeight}px`;

                    // Live calibrated cursor: refit from points collected so
                    // far and predict the current sample
                    if (variant === 'b' && perPoint.length >= 3 && extras.predictDot) {
                        const liveFit = solveFit(perPoint);
                        if (liveFit) {
                            const p = {
                                x: liveFit.a * ux + liveFit.b * uy + liveFit.c,
                                y: liveFit.d * ux + liveFit.e * uy + liveFit.f
                            };
                            extras.predictDot.style.visibility = 'visible';
                            extras.predictDot.style.left = `${p.x}px`;
                            extras.predictDot.style.top = `${p.y}px`;
                        }
                    }

                    if (performance.now() - started > SAMPLE_MS && samples.length >= MIN_SAMPLES) {
                        finish();
                    }
                };

                sampleListener = listener;
                document.addEventListener('aac:gaze-sample', listener);
                if (enhanced) {
                    const tick = () => {
                        if (finished) return;
                        const elapsed = performance.now() - started;
                        if (extras.progressFill) {
                            extras.progressFill.style.width = `${Math.min(100, (elapsed / SAMPLE_MS) * 100)}%`;
                        }
                        progressRAF = requestAnimationFrame(tick);
                    };
                    progressRAF = requestAnimationFrame(tick);
                }
                // Hard watchdog: if this point can't gather enough samples,
                // give up on it (the caller decides what to show)
                hardTimer = setTimeout(finish, SAMPLE_MS * 3);
            });

            if (!active) break;
            if (samples.length < MIN_SAMPLES) {
                failCard('Not enough steady samples. Try in better light, closer to the camera.');
                return;
            }
            const aggregate =
                variant === 'b'
                    ? medianSample(samples)
                    : samples.reduce(
                          (acc, s) => [acc[0] + s[0], acc[1] + s[1]],
                          [0, 0]
                      ).map((v) => v / samples.length);
            perPoint.push({
                ux: aggregate[0],
                uy: aggregate[1],
                tx: px * window.innerWidth,
                ty: py * window.innerHeight
            });
        }

        if (!active) return;
        dot.hidden = true;

        const fit = solveFit(perPoint);
        if (!fit) {
            failCard('Calibration could not be solved. Please try again.');
            return;
        }
        fit.at = Date.now();
        fit.w = window.innerWidth;
        fit.h = window.innerHeight;
        try {
            localStorage.setItem(storageKey(source), JSON.stringify(fit));
        } catch (err) { /* storage unavailable — fit still usable this session */ }

        const cm = ((fit.errPx / 96) * 2.54).toFixed(1);
        cardEl.hidden = false;
        cardEl.innerHTML = `
            <h2>Calibrated!</h2>
            <p>Average error: about ${Math.round(fit.errPx)} pixels (~${cm} cm on a typical screen).</p>
            <p>${fit.errPx < 120 ? 'Looks good.' : 'A bit rough — a redo may help, or try Head pointer mode under glare.'}</p>
            <div class="modal-actions">
                <button class="button green-button aac-ctl" data-act="done">Done</button>
                <button class="button blue-button aac-ctl" data-act="redo">Redo</button>
            </div>`;
        cardEl.querySelector('[data-act="done"]').addEventListener('click', () => {
            cleanup();
            if (onDone) onDone(fit);
        });
        cardEl.querySelector('[data-act="redo"]').addEventListener('click', () => {
            cleanup();
            active = false;
            runCalibration(source, { onDone, onCancel, variant });
        });
    };

    const failCard = (message) => {
        cardEl.hidden = false;
        cardEl.innerHTML = `
            <h2>Calibration Problem</h2>
            <p>${message}</p>
            <div class="modal-actions">
                <button class="button blue-button aac-ctl" data-act="redo">Try again</button>
                <button class="button pending-button aac-ctl" data-act="cancel">Cancel</button>
            </div>`;
        cardEl.querySelector('[data-act="redo"]').addEventListener('click', () => {
            cleanup();
            runCalibration(source, { onDone, onCancel, variant });
        });
        cardEl.querySelector('[data-act="cancel"]').addEventListener('click', cancel);
    };

    document.addEventListener('keydown', escListener);
    intro();
}

function medianSample(samples) {
    const xs = samples.map((s) => s[0]).sort((a, b) => a - b);
    const ys = samples.map((s) => s[1]).sort((a, b) => a - b);
    const mid = Math.floor(samples.length / 2);
    const pick = (arr) =>
        arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    return [pick(xs), pick(ys)];
}

/** Least-squares affine fit per axis. Returns { a..f, errPx } or null. */
function solveFit(points) {
    if (!points || points.length < 3) return null;
    // x-axis: minimize || a*ux + b*uy + c - tx ||^2  (normal equations, 3x3)
    const fx = solveAxis(points, (p) => p.ux, (p) => p.uy, (p) => p.tx);
    const fy = solveAxis(points, (p) => p.uy, (p) => p.ux, (p) => p.ty);
    if (!fx || !fy) return null;

    let err = 0;
    points.forEach((p) => {
        const px = fx.a * p.ux + fx.b * p.uy + fx.c;
        const py = fy.a * p.ux + fy.b * p.uy + fy.c;
        err += Math.hypot(px - p.tx, py - p.ty);
    });
    return {
        a: fx.a, b: fx.b, c: fx.c,
        d: fy.a, e: fy.b, f: fy.c,
        errPx: err / points.length
    };
}

function solveAxis(points, getU, getV, getT) {
    // Sums for the 3x3 normal matrix [Suu, Suv, Su; Suv, Svv, Sv; Su, Sv, N]
    let Suu = 0, Suv = 0, Svv = 0, Su = 0, Sv = 0, Stu = 0, Stv = 0, St = 0;
    const n = points.length;
    points.forEach((p) => {
        const u = getU(p);
        const v = getV(p);
        const t = getT(p);
        Suu += u * u; Suv += u * v; Svv += v * v;
        Su += u; Sv += v;
        Stu += t * u; Stv += t * v; St += t;
    });
    return gaussian({
        0: [Suu, Suv, Su, Stu],
        1: [Suv, Svv, Sv, Stv],
        2: [Su, Sv, n, St]
    });
}

function gaussian(rows) {
    // 3x4 augmented matrix, partial pivoting — small and stable enough here
    const m = [rows[0].slice(), rows[1].slice(), rows[2].slice()];
    for (let col = 0; col < 3; col++) {
        let pivot = col;
        for (let r = col + 1; r < 3; r++) {
            if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
        }
        if (Math.abs(m[pivot][col]) < 1e-9) return null;
        [m[col], m[pivot]] = [m[pivot], m[col]];
        for (let r = 0; r < 3; r++) {
            if (r === col) continue;
            const factor = m[r][col] / m[col][col];
            for (let c = col; c < 4; c++) m[r][c] -= factor * m[col][c];
        }
    }
    return {
        a: m[0][3] / m[0][0],
        b: m[1][3] / m[1][1],
        c: m[2][3] / m[2][2]
    };
}
