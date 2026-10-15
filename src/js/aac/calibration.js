/**
 * Gaze calibration for Speak Board — closed-form per-user correction on the
 * stretched-eye signal (nx/ny, Auto mode) or the nose-in-face signal
 * (hx/hy, Head pointer mode).
 *
 * Purpose:  collect on-screen dot gazes, fit a per-user correction mapping
 *           signals → screen position, verify it with honest px errors,
 *           refresh ONLY from verified dwell anchors during use.
 * Consumes: aac:gaze-sample events from gazeEngine.js — nx/ny = eye-vector
 *           stretched to screen span (OneEuro-smoothed in the worker),
 *           hp/hyaw = head pitch/yaw from faceRt.
 * Emits:    nothing global — returns the fit via runCalibration().onDone and
 *           exports applyCalib / refineFitFromTap for the board. Fit
 *           persistence (per-device, named-user) is owned by aacBoard.js.
 * Owns:     the calibration overlay flow, the solver, and every ACCEPTANCE
 *           gate (a fit is never silently enabled):
 *             1. Point count per tier (3 → affine basis, 8/6 → full basis);
 *             2. Design sufficiency — basisHealth() requires the anchor set
 *                to actually excite the primary signals and to span 2D space
 *                (a degenerate/collinear anchor set is refused, not fitted);
 *             3. Gauss-Jordan singularity refusal inside the solve itself;
 *             4. Verification: avg corrected error at/above the Rough verdict
 *                blocks completion — retry/refine are the only ways forward.
 *
 * There is no neural gaze model: personalization is entirely the closed-form
 * fit — cheap Gauss-Jordan over a small ridge, solved in ~0ms.
 *
 * Features per axis (standardized before solving, transform stored on the
 * fit — see solveFit/applyCalib):
 *
 *   kind 'gaze': [ nx, ny, nx², ny², nx·ny, hp, ny·hp, 1 ]   (8)
 *   kind 'head': [ hx, hy, hx², hy², hx·hy, hp, hyaw, 1 ]    (8)
 *
 * hp is the pitch-coupling mop (looking down pitches the head, which tilts
 * the eye vector the same way). The x-axis doesn't use it. 8 dof / 13 anchors
 * keeps the fit too stiff to swallow a saccade as signal — which is what lets
 * MAD spot corruption. Robustness stack: per-dot stability weighting, one
 * IRLS reweight pass, leave-one-out MAD outlier drop (≤2 passes).
 *
 * UI shape: everything lives ON the dot — a progress ring that fills while
 * the gaze dwells inside and drains when it leaves, plus a counter chip.
 * Dots auto-advance on a held gaze — no per-target clicks required.
 *
 * Flow: intro (seating guidance + position coach) → 13 dots → 3-dot
 * verification (honest corrected px per dot) → result card (average +
 * verdict; Rough fits can only retry/refine). Refine-edges adds 4 extreme
 * dots (17 total). While the flow runs, board selection/speech stays locked.
 *
 * Exports:
 *   runCalibration({ kind, onDone, onCancel }) — kind 'gaze' | 'head'
 *   applyCalib(fit, sample) → { x, y } px   (kind read off the fit)
 *   refineFitFromTap(fit, sample, txPx, tyPx) → fit | null
 */

const POINTS13 = (() => {
    const axes = [0.15, 0.5, 0.85];
    const points = [];
    for (const y of axes) for (const x of axes) points.push([x, y]);
    // Edge-middles — excitation where magnitude error concentrates; kept
    // well inside the viewport so dots never collide with the Exit button
    // (top-center was its old home) or the bottom edge on short screens
    points.push([0.5, 0.105], [0.105, 0.5], [0.895, 0.5], [0.5, 0.895]);
    return points;
})();
const EDGE_POINTS = [
    [0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94]
];
const VERIFY_POINTS = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.85]];

// Dot-dwell accrual model: progress fills DWELL_TOTAL_MS of "good" gaze;
// a tick adds 50ms while good, drains slower (30% of gain) while bad —
// dwell-anywhere long bothers the eyes before it bothers the fit.
const DWELL_TOTAL_MS = 900;
const VERIFY_DWELL_MS = 1000;
const TICK_MS = 50;
const TICK_BAD_DRAIN = 15;
const VERDICT_EXCELLENT = 120; // px — tiles click easily
const VERDICT_GOOD = 220;
const VERDICT_FAIR = 350; // at/above this, the fit is rejected (see showResult)
const SPREAD_GATE = 0.05; // normalized signal scatter that fails a dot
const MIN_RING_SAMPLES = 5; // minimum window content to make a sample
const PREVIEW_MIN_POINTS = 4; // anchors in before the live corrected cursor shows
const RIDGE = 0.02; // diagonal-scaled ridge shrink
const MIN_POINTS = { gaze: 8, head: 6 }; // full-tier floors
const SPARSE_POINTS = 3; // affine tier floor (promotes at 3 anchors)
const MAX_SAMPLES = 34; // fit memory: 17 calib anchors + recent taps
const MAX_TAP_SAMPLES = 16;
const STALL_MS = 12000; // dot abandoned after this much no-progress
const STALL_HINT_MS = 5000;

/** Which signal pair a fit kind is driven by (dot gates + spread). */
const KIND_KEYS = {
    gaze: ['nx', 'ny'],
    head: ['hx', 'hy']
};

const overlay = () => document.getElementById('calib-overlay');
const stage = () => document.getElementById('calib-stage');
const card = () => document.getElementById('calib-card');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Solver ─────────────────────────────────────────────────────────────

/**
 * Feature vector per sample, per fit kind.
 *   gaze (8 coeffs/axis):  stretched eye coupled to head pitch —
 *                          looking down rotates the face, which tilts the
 *                          eye vector the same way.
 *   head (8 coeffs/axis):  nose-in-face pointer; pitch/yaw linear enough.
 */
function features(kind, s) {
    const hp = s.hp ?? 0;
    const hyaw = s.hyaw ?? 0;
    if (kind === 'head') {
        const hx = s.hx ?? 0;
        const hy = s.hy ?? 0;
        return [hx, hy, hx * hx, hy * hy, hx * hy, hp, hyaw, 1];
    }
    const nx = s.nx ?? 0;
    const ny = s.ny ?? 0;
    return [nx, ny, nx * nx, ny * ny, nx * ny, hp, ny * hp, 1];
}

/**
 * Affine tier used when only a few anchors exist (3–7 samples): a plane
 * correction that beats the identity default immediately. Once 8 anchors
 * (head: with full 8-dof) are in, solveFit promotes to the full basis.
 */
function sparseFeatures(kind, s) {
    if (kind === 'head') return [s.hx ?? 0, s.hy ?? 0, 1];
    return [s.nx ?? 0, s.ny ?? 0, 1];
}

/** Solve one axis: min ||A c − t||² + λ·diag-scaled ridge, row-weighted. */
function solveAxis(A, t, w) {
    const n = A[0].length;
    const M = Array.from({ length: n }, () => new Array(n).fill(0));
    const b = new Array(n).fill(0);
    for (let i = 0; i < A.length; i++) {
        const row = A[i];
        const weight = w ? w[i] : 1;
        for (let j = 0; j < n; j++) {
            b[j] += weight * row[j] * t[i];
            for (let k = j; k < n; k++) M[j][k] += weight * row[j] * row[k];
        }
    }
    for (let j = 0; j < n; j++) {
        for (let k = 0; k < j; k++) M[j][k] = M[k][j];
        M[j][j] += Math.max(RIDGE * M[j][j], 1e-9); // keep intercept solvable
    }
    return gaussJordan(M, b);
}

/** Gauss-Jordan with partial pivoting. Returns null if singular. */
function gaussJordan(M, b) {
    const n = b.length;
    const A = M.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
        let pivot = col;
        for (let r = col + 1; r < n; r++) {
            if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
        }
        if (Math.abs(A[pivot][col]) < 1e-12) return null;
        [A[col], A[pivot]] = [A[pivot], A[col]];
        const d = A[col][col];
        for (let c = col; c <= n; c++) A[col][c] /= d;
        for (let r = 0; r < n; r++) {
            if (r === col) continue;
            const f = A[r][col];
            if (f === 0) continue;
            for (let c = col; c <= n; c++) A[r][c] -= f * A[col][c];
        }
    }
    return A.map((row) => row[n]);
}

/** Standardize a feature matrix columnwise (std clamped — never divide by 0). */
function standardize(A) {
    const n = A[0].length;
    const m = A.length;
    const mean = new Array(n).fill(0);
    const std = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < m; i++) mean[j] += A[i][j];
        mean[j] /= m;
        for (let i = 0; i < m; i++) std[j] += (A[i][j] - mean[j]) ** 2;
        std[j] = Math.max(Math.sqrt(std[j] / m), 1e-6);
    }
    const standardized = A.map((row) => row.map((v, j) => (v - mean[j]) / std[j]));
    // The intercept column is constant — standardizing it yields 0; keep the
    // fit solvable by leaving it as 1 (it IS the offset for z-space zeros).
    standardized.forEach((row) => {
        row[n - 1] = 1;
    });
    return { standardized, mean, std };
}

/**
 * Fit one pass over { signal → txN/tyN } samples of a given kind
 * ('gaze' | 'head'). One IRLS reweight pass (corrupt anchors can't warp
 * gating), then iterative MAD outlier drop (≤2 passes) with an absolute
 * floor. Returns { cx, cy, featMean, featStd, dropped, samples, kind }
 * or null.
 */
function solveFit(samples, opts = {}) {
    const kind = opts.kind || 'gaze';
    const fullFloor = MIN_POINTS[kind];
    // Tier by the CANONICAL floor (even if a caller relaxes minPoints for a
    // preview pass): under it we use the affine basis, at/over it the full
    // one — declared up front so standardization and prediction agree.
    const sparseOk = opts.minPoints !== undefined
        ? Math.min(SPARSE_POINTS, opts.minPoints)
        : SPARSE_POINTS;
    let pool = samples;
    const sparse = pool.length < fullFloor;
    if (pool.length < (sparse ? sparseOk : fullFloor)) return null;
    const featOf = (s) => (sparse ? sparseFeatures(kind, s) : features(kind, s));

    const build = (list) => {
        const A = list.map(featOf);
        const { standardized, mean, std } = standardize(A);
        const w = list.map((s) => s.w ?? 1);
        return {
            cx: solveAxis(standardized, list.map((s) => s.txN), w),
            cy: solveAxis(standardized, list.map((s) => s.tyN), w),
            featMean: mean,
            featStd: std
        };
    };

    const predictT = (sol, s) => {
        const f = featOf(s).map(
            (v, i) => (v - sol.featMean[i]) / sol.featStd[i]
        );
        f[f.length - 1] = 1;
        return [
            sol.cx.reduce((acc, c, i) => acc + c * f[i], 0),
            sol.cy.reduce((acc, c, i) => acc + c * f[i], 0)
        ];
    };

    let sol = build(pool);
    if (!sol.cx || !sol.cy) return null;

    // IRLS: reweight by 1/(residual + eps) and resolve once.
    pool = pool.map((s) => {
        const [px, py] = predictT(sol, s);
        const r = Math.hypot(px - s.txN, py - s.tyN);
        return { ...s, w: (s.w ?? 1) / (r + 0.02) };
    });
    sol = build(pool);
    if (!sol.cx || !sol.cy) return null;

    // Outlier hunting uses LEAVE-ONE-OUT residuals, not in-sample ones —
    // an 8-dof ridge bends enough to absorb a corrupt anchor whole (found
    // in the solver bench), so in-sample MAD can never see it. Re-fitting
    // each column is 13 small Gauss-Jordan solves — microseconds.
    const looResiduals = (list) =>
        list.map((s, i) => {
            const rest = list.filter((_, j) => j !== i);
            const solRest = build(rest);
            if (!solRest.cx || !solRest.cy) return 0;
            const f = featOf(s).map(
                (v, k) => (v - solRest.featMean[k]) / solRest.featStd[k]
            );
            f[f.length - 1] = 1;
            const px = solRest.cx.reduce((acc, c, k) => acc + c * f[k], 0);
            const py = solRest.cy.reduce((acc, c, k) => acc + c * f[k], 0);
            return Math.hypot(px - s.txN, py - s.tyN);
        });

    let dropped = 0;
    for (let pass = 0; pass < 2 && !sparse && pool.length >= fullFloor; pass++) {
        const resids = looResiduals(pool);
        const sorted = [...resids].sort((a, b) => a - b);
        const med = sorted[Math.floor(sorted.length / 2)];
        if (!(med > 0)) break;
        const mad =
            [...sorted].map((r) => Math.abs(r - med)).sort((a, b) => a - b)[
                Math.floor(sorted.length / 2)
            ] || 0;
        // Robust gate: worst > med + max(3.3·MAD, med) AND an absolute floor
        // (~120px at a 1000px viewport) so honest scatter is never dropped —
        // MAD exists to purge corrupt anchors, not honest sensor noise
        const thresh = med + Math.max(2.2 * 1.4826 * mad, med);
        const ABSOLUTE_FLOOR = 0.12;
        let worstIdx = 0;
        let worstVal = 0;
        resids.forEach((r, i) => {
            if (r > worstVal) {
                worstVal = r;
                worstIdx = i;
            }
        });
        if (worstVal <= thresh || worstVal <= ABSOLUTE_FLOOR) break;
        pool = pool.filter((_, i) => i !== worstIdx);
        dropped += 1;
        sol = build(pool);
        if (!sol.cx || !sol.cy) return null;
    }
    return { ...sol, dropped, samples: pool, kind, sparse };
}

/**
 * Design-sufficiency gate — checked BEFORE a fit is accepted anywhere
 * (dot flow and passive dwell refinement). A mapping is only learnable when
 * the anchors actually excited the signals and span the plane:
 *   1. Excitation: primary signals must vary by a real fraction of a healthy
 *      dot sweep (floors ≈ 1/10 of the expected span — sized to catch "the
 *      gaze never moved" without rejecting soft-but-real data);
 *   2. 2D non-degeneracy: the smallest covariance eigenvalue of the anchor
 *      signals must exceed epsilon (three collinear tiles cannot support an
 *      affine map; a near-degenerate set only *looks* fitted).
 * Accuracy judgment stays with the verification step — this gate only keeps
 * the DESIGN MATRIX honest. Returns { ok, why }.
 */
export function basisHealth(samples, kind) {
    const [ka, kb] = KIND_KEYS[kind];
    const xs = samples.map((s) => s[ka] ?? 0);
    const ys = samples.map((s) => s[kb] ?? 0);
    const n = xs.length;
    if (!n) return { ok: false, why: 'no-anchors' };
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    xs.forEach((x, i) => {
        const dx = x - mx;
        const dy = ys[i] - my;
        sxx += dx * dx;
        syy += dy * dy;
        sxy += dx * dy;
    });
    const floors = kind === 'head' ? [0.02, 0.02] : [0.08, 0.06];
    if (sxx / n < floors[0] * floors[0] || syy / n < floors[1] * floors[1]) {
        return { ok: false, why: 'signal-barely-moved' };
    }
    // Smallest eigenvalue of the (unnormalized) 2D covariance
    const tr = sxx + syy;
    const det = sxx * syy - sxy * sxy;
    const minEig = (tr - Math.sqrt(Math.max(0, tr * tr - 4 * det))) / 2;
    if (!(minEig > 1e-8 * n)) return { ok: false, why: 'anchors-degenerate' };
    return { ok: true };
}

/** Map a signal bundle through the fit → screen px. */
export function applyCalib(fit, s) {
    if (!fit || !s) return null;
    const kind = fit.kind || 'gaze';
    const [ka, kb] = KIND_KEYS[kind];
    if (s[ka] == null || s[kb] == null) return null;
    const f = fit.sparse ? sparseFeatures(kind, s) : features(kind, s);
    if (fit.featMean && fit.featStd) {
        for (let i = 0; i < f.length - 1; i++) f[i] = (f[i] - fit.featMean[i]) / fit.featStd[i];
        f[f.length - 1] = 1;
    }
    const txN = fit.cx.reduce((acc, c, i) => acc + c * f[i], 0);
    const tyN = fit.cy.reduce((acc, c, i) => acc + c * f[i], 0);
    return {
        x: (txN + 0.5) * window.innerWidth,
        y: (tyN + 0.5) * window.innerHeight
    };
}

/**
 * Fold a verified dwell activation into the fit: sample = median recent
 * signal bundle, target = the dwelled tile's center (px). A completed dwell
 * is a verified user observation — ambiguous partner TAPS are never folded
 * (the board only calls this from the dwell path). Calibration anchors are
 * kept; old session anchors roll off past MAX_SAMPLES. The design-sufficiency
 * gate runs here too — anchors that don't excite/span return null and leave
 * the fit untouched rather than degrading it. Returns a new fit or null.
 */
export function refineFitFromTap(fit, sample, txPx, tyPx) {
    if (!fit || !Array.isArray(fit.samples) || sample == null) return null;
    const kind = fit.kind || 'gaze';
    const anchor = {
        ...sample,
        txN: txPx / window.innerWidth - 0.5,
        tyN: tyPx / window.innerHeight - 0.5,
        src: 'tap'
    };
    const calib = fit.samples.filter((s) => s.src !== 'tap');
    const session = fit.samples.filter((s) => s.src === 'tap').slice(-MAX_TAP_SAMPLES);
    const samples = [...calib, ...session, anchor].slice(-MAX_SAMPLES);
    if (!basisHealth(samples, kind).ok) return null; // never weaken the fit
    const solved = solveFit(samples, { kind });
    if (!solved) return null;
    return { ...solved, samples, vw: window.innerWidth, vh: window.innerHeight };
}


// ── Calibration flow (dot-centric) ────────────────────────────────────────
// UI contract: everything lives ON the dot — the ring fills while gaze is
// held, drains when it leaves, and the counter chip rides with the dot.

const OVERLAY_TICK = TICK_MS;

/**
 * Run the flow. Assumes the gaze engine is already running.
 * kind 'gaze' (stretched-eye fit) | 'head' (nose-in-face pointer fit —
 * blinks are fine, eyes-open is not a gate).
 * Calls onDone(fit) when finished, onCancel() if the user backs out.
 */
export function runCalibration({ kind = 'gaze', onDone, onCancel }) {
    const root = overlay();
    const stageEl = stage();
    const cardEl = card();
    if (!root || !stageEl || !cardEl) return;

    const keyA = KIND_KEYS[kind][0];
    const keyB = KIND_KEYS[kind][1];
    const hasSignal = (s) => s && s.faceOk && s[keyA] != null && s[keyB] != null;

    let active = false;
    let escListener = null;
    let sampleListener = null;

    const live = {
        fit: null,
        predictEl: null,
        dot: null, // current runDot state
        hintEl: null, // intro coach element
    };

    const cleanup = () => {
        active = false;
        if (sampleListener) document.removeEventListener('aac:gaze-sample', sampleListener);
        if (escListener) document.removeEventListener('keydown', escListener);
        sampleListener = null;
        escListener = null;
        live.predictEl = null;
        live.dot = null;
        live.hintEl = null;
        stageEl.innerHTML = '';
        cardEl.hidden = true;
        root.hidden = true;
    };

    const cancel = () => {
        cleanup();
        if (onCancel) onCancel();
    };

    escListener = (event) => {
        if (event.key === 'Escape') cancel();
    };
    document.addEventListener('keydown', escListener);

    // One listener for the whole flow: dot quality, capture windows,
    // live corrected cursor, coach readout during intro.
    sampleListener = (event) => {
        const s = event.detail;
        if (!hasSignal(s)) {
            if (live.hintEl) live.hintEl.textContent = 'Position: no face — look at the camera';
            if (live.predictEl) live.predictEl.style.visibility = 'hidden';
            if (live.dot) live.dot.badReason = 'camera can\'t see you clearly';
            return;
        }
        if (live.hintEl) {
            live.hintEl.textContent =
                s.irisPx == null
                    ? 'Position: measuring…'
                    : s.irisPx < 7
                      ? 'Position: too far / enable High-detail camera'
                      : s.irisPx < 10
                        ? 'Position: a bit far — closer is steadier'
                        : 'Position: good';
        }
        const dot = live.dot;
        if (dot) {
            const t = performance.now();
            if (dot.lastSampleAt) {
                // Frame cadence EMA — freshness gates later respect the
                // device's real frame interval (slow CPU fallbacks would
                // otherwise falsely fail every tick)
                dot.gapMs = dot.gapMs
                    ? 0.85 * dot.gapMs + 0.15 * (t - dot.lastSampleAt)
                    : t - t + 60;
            }
            dot.lastSampleAt = t;
            dot.lastSample = s;
            dot.badReason = isGood(dot, s);
            dot.window.push({ ...s, at: t, bad: dot.badReason || null });
            while (dot.window.length && now() - dot.window[0].at > 800) dot.window.shift();
        }
        if (live.predictEl) {
            const p = live.fit ? applyCalib(live.fit, s) : null;
            if (p) {
                live.predictEl.style.visibility = 'visible';
                live.predictEl.style.left = `${p.x}px`;
                live.predictEl.style.top = `${p.y}px`;
            } else {
                live.predictEl.style.visibility = 'hidden';
            }
        }
    };
    document.addEventListener('aac:gaze-sample', sampleListener);

    const now = () => performance.now();

    // A sample is "good" for the dot: signal present (for gaze: eyes open
    // too) and recent gaze is steady. There is no aim-inside radius gate:
    // an imperfect fit cannot be allowed to decide whether its own anchors
    // are good — v1.1-style, the dot always finishes as long as tracking
    // holds.
    function isGood(dot, s) {
        // Collect samples only while tracking is VALID: the engine's opening
        // settle window (self-zero bias not locked yet) counts as not-yet-
        // valid, alongside eyes-closed / face-missing states.
        if (s.settling) return 'settling — hold still';
        if (kind === 'gaze') {
            if (!s.open || s.nx == null) return 'eyes open — avoid blink-flat lids';
        } else if (s.hx == null) {
            return 'face visible — camera can\'t see your nose';
        }
        if (!stableRecent(dot)) return 'steady your head';
        return null;
    }

    function stableRecent(dot) {
        const w = dot.window;
        if (w.length < 4) return true;
        let mx = 0;
        let my = 0;
        w.forEach((q) => {
            mx += q[keyA] ?? 0;
            my += q[keyB] ?? 0;
        });
        mx /= w.length;
        my /= w.length;
        for (const q of w) {
            const qx = q[keyA] ?? 0;
            const qy = q[keyB] ?? 0;
            if (Math.hypot(qx - mx, qy - my) > 0.05) return false;
        }
        return true;
    }

    /**
     * Show one dot; fill its ring while the user's gaze rests on it; drain
     * while it wanders; resolve once the ring fills (or fail if truly
     * stalled). mode 'collect' | 'verify'.
     */
    function runDot(fx, fy, index, total, mode) {
        return new Promise((resolve) => {
            const xPx = fx * window.innerWidth;
            const yPx = fy * window.innerHeight;
            const dot = document.createElement('div');
            dot.className = 'calib-dot';
            dot.style.left = `${xPx}px`;
            dot.style.top = `${yPx}px`;
            const ring = document.createElement('div');
            ring.className = 'calib-ring';
            const core = document.createElement('div');
            core.className = 'calib-core';
            const chip = document.createElement('div');
            chip.className = 'calib-chip' + (fy > 0.75 ? ' calib-chip-above' : '');
            chip.textContent = `${index}/${total}`;
            dot.append(ring, core, chip);
            stageEl.appendChild(dot);

            const state = {
                el: dot,
                chipEl: chip,
                xPx,
                yPx,
                index,
                mode,
                kind: mode,
                totalMs: mode === 'verify' ? VERIFY_DWELL_MS : DWELL_TOTAL_MS,
                progressMs: 0,
                window: [],
                badReason: null,
                gapMs: 60,
                lastSampleAt: 0,
                lastSample: null,
                startedAt: now(),
                tolerance: Math.max(72, Math.min(window.innerWidth, window.innerHeight) * 0.12)
            };
            live.dot = state;

            const tick = setInterval(() => {
                if (!active) {
                    close(null);
                    return;
                }
                const t = now();
                // Freshness follows this device's real frame cadence —
                // a slow CPU fallback at ~4fps would otherwise auto-fail
                // every tick
                const fresh = t - state.lastSampleAt < Math.max(450, state.gapMs * 3);
                // Graded progress: fraction of the last ~350ms of samples
                // that passed the gates — a flickering gate now scales the
                // fill instead of zeroing it
                const recent = state.window.filter((q) => t - q.at <= 350);
                const goodFrac = recent.length
                    ? recent.filter((q) => !q.bad).length / recent.length
                    : paperGood(state, fresh)
                      ? 1
                      : 0;
                state.progressMs = Math.max(
                    0,
                    state.progressMs + TICK_MS * goodFrac - TICK_BAD_DRAIN * (1 - goodFrac)
                );
                dot.style.setProperty('--p', String(Math.min(1, state.progressMs / state.totalMs)));

                const meaninglesslyStuck =
                    goodFrac === 0 && state.progressMs <= 0 && t - state.startedAt > STALL_HINT_MS;
                if (meaninglesslyStuck) {
                    // Say WHICH gate is failing, so the user can fix it
                    const reason =
                        state.badReason || (fresh ? 'camera can\'t see you clearly' : 'tracking paused');
                    chip.textContent = `${index}/${total} — ${reason}`;
                    state.hinted = true;
                } else if (state.hinted && state.progressMs > 0) {
                    chip.textContent = `${index}/${total}`;
                    state.hinted = false;
                }
                if (t - state.startedAt > STALL_MS && state.progressMs <= 0) {
                    close(null);
                    return;
                }
                if (state.progressMs >= state.totalMs) {
                    close(state.window.slice());
                }
            }, OVERLAY_TICK);

            // When the window is empty the last sample is the verdict anyway
            function paperGood(dotState, fresh) {
                return fresh && !dotState.badReason;
            }

            function close(windowSamples) {
                clearInterval(tick);
                dot.remove();
                if (live.dot === state) live.dot = null;
                if (!windowSamples || !windowSamples.length) {
                    resolve(null);
                    return;
                }
                const good = windowSamples.filter((q) => hasSignal(q));
                if (good.length < MIN_RING_SAMPLES) {
                    resolve(null);
                    return;
                }
                const grab = (key) => median(good.map((q) => q[key] ?? 0));
                const mx = grab(keyA);
                const my = grab(keyB);
                const devs = good
                    .map((q) => Math.hypot((q[keyA] ?? 0) - mx, (q[keyB] ?? 0) - my))
                    .sort((a, b) => a - b);
                const bundle = {
                    nx: grab('nx'),
                    ny: grab('ny'),
                    gx: grab('gx'),
                    gy: grab('gy'),
                    hx: grab('hx'),
                    hy: grab('hy'),
                    hp: grab('hp'),
                    hyaw: grab('hyaw'),
                    spread: devs[Math.floor(devs.length / 2)] || 0
                };
                if (mode === 'verify' && live.fit) {
                    let errs = 0;
                    let n = 0;
                    good.forEach((q) => {
                        const p = applyCalib(live.fit, q);
                        if (!p) return;
                        errs += Math.hypot(p.x - state.xPx, p.y - state.yPx);
                        n += 1;
                    });
                    bundle.errPx = n ? errs / n : null;
                }
                resolve(bundle);
            }

            // Timeout guard — a dot the tracker never wins fails out so the
            // flow can't hang forever with no feedback
            function finish() {}
            void finish;
        });
    }

    // ── Page furniture (built once per flow) ─────────────────────

    const buildStageChrome = () => {
        stageEl.innerHTML = '';
        const predict = document.createElement('div');
        predict.className = 'calib-predict';
        const exit = document.createElement('button');
        exit.type = 'button';
        exit.className = 'button red-button aac-ctl calib-exit';
        exit.textContent = 'Exit';
        exit.addEventListener('click', cancel);
        stageEl.append(exit, predict);
        live.predictEl = predict;
    };

    const intro = () => {
        root.hidden = false;
        stageEl.innerHTML = '';
        cardEl.hidden = false;
        const aimVerb =
            kind === 'head' ? 'Point your nose at' : 'Hold your eyes on';
        cardEl.innerHTML = `
            <h2>${kind === 'head' ? 'Calibrate Head Pointer' : 'Calibrate Gaze'}</h2>
            <p>Sit steady facing the screen at about arm's length, face visible to the camera.
               ${aimVerb} each dot until its ring fills — 13 dots, about 20 seconds.
               Dots fill only while tracking is steady, and only while they are on screen.</p>
            <p id="calib-distance" class="calib-hint">Position: measuring…</p>
            <label class="calib-hires"><input type="checkbox" id="calib-hires"> High-detail camera (helps past arm's length) — applies next time Gaze is turned on</label>
            <div class="modal-actions">
                <button class="button green-button aac-ctl" data-act="start">Start</button>
                <button class="button pending-button aac-ctl" data-act="cancel">Cancel</button>
            </div>`;
        live.hintEl = cardEl.querySelector('#calib-distance');
        const hi = cardEl.querySelector('#calib-hires');
        try {
            hi.checked = localStorage.getItem('aac-hires') === '1';
        } catch (err) { /* storage unavailable */ }
        hi.addEventListener('change', () => {
            try {
                localStorage.setItem('aac-hires', hi.checked ? '1' : '0');
            } catch (err) { /* storage unavailable */ }
        });
        cardEl.querySelector('[data-act="start"]').addEventListener('click', async () => {
            live.hintEl = null;
            cardEl.hidden = true;
            run();
        });
        cardEl.querySelector('[data-act="cancel"]').addEventListener('click', cancel);
    };

    // Complete flow: collect (13 anchors) → verify (3 checks) → result card
    async function run(priorSamples) {
        active = true;
        buildStageChrome();
        const samples = [...(priorSamples || [])];
        let fails = 0;

        for (let i = 0; i < POINTS13.length && active; i++) {
            const [fx, fy] = POINTS13[i];
            const got = await runDot(fx, fy, i + 1, POINTS13.length, 'collect');
            if (!active) return;
            if (got && got.spread <= SPREAD_GATE) {
                samples.push({
                    ...got,
                    txN: fx - 0.5,
                    tyN: fy - 0.5,
                    w: 1 / Math.max(0.004, got.spread),
                    src: 'calib'
                });
                // Live preview: a relaxed 4-anchor fit on the way to
                // confidence — but only when the anchor design is already
                // healthy, or the preview dot could mislead mid-flow
                if (samples.length >= PREVIEW_MIN_POINTS && basisHealth(samples, kind).ok) {
                    const partial = solveFit(samples, { kind, minPoints: PREVIEW_MIN_POINTS });
                    if (partial) live.fit = partial;
                }
            } else {
                fails += 1;
            }
            await sleep(200);
        }
        if (!active) return;

        if (samples.length < MIN_POINTS[kind] || fails > 2) {
            failCard(
                samples.length < MIN_POINTS[kind]
                    ? 'Not enough good gazes — keep your face visible and eyes on the dots.'
                    : 'Dots timed out — more light on your face and a steadier seat help.'
            );
            return;
        }
        // Design-matrix gate: the anchors must actually excite the signals
        // across the screen, or the resulting map is unlearnable-in-disguise.
        const health = basisHealth(samples, kind);
        if (!health.ok) {
            failCard(
                'The gaze signal barely changed across the dots — the eyes may not be following them yet. ' +
                    'Watch that the gaze dot tracks the user\'s eyes, then try again.'
            );
            return;
        }
        const fit = solveFit(samples, { kind });
        if (!fit) {
            failCard('Calibration could not be solved. Please try again.');
            return;
        }
        fit.vw = window.innerWidth;
        fit.vh = window.innerHeight;
        live.fit = fit;
        await verifyAndReport({ allowRefine: true });
    }

    const verifyAndReport = async ({ allowRefine }) => {
        buildStageChrome();
        const dots = [];
        for (let i = 0; i < VERIFY_POINTS.length && active; i++) {
            const [fx, fy] = VERIFY_POINTS[i];
            const got = await runDot(fx, fy, i + 1, VERIFY_POINTS.length, 'verify');
            if (!active) return;
            if (got && got.errPx != null) {
                dots.push({
                    label: `Dot ${i + 1} (${Math.round(fx * 100)}% across, ${Math.round(fy * 100)}% down)`,
                    corrected: got.errPx
                });
            }
        }
        if (!dots.length) {
            failCard('Lost tracking during the check — better light or a steadier seat helps.');
            return;
        }
        const avg = dots.reduce((sum, d) => sum + d.corrected, 0) / dots.length;
        showResult(live.fit, avg, dots, allowRefine);
    };

    const showResult = (fit, avgPx, dots, allowRefine) => {
        stageEl.innerHTML = '';
        live.predictEl = null;
        live.dot = null;
        // A rough fit must never silently enable gaze selection: Done is
        // withheld and the user is steered to retry or refine (or back out).
        const weak = avgPx >= VERDICT_FAIR;
        const rows = dots
            .map((d) => `<tr><td>${d.label}</td><td>${Math.round(d.corrected)}px</td></tr>`)
            .join('');
        cardEl.hidden = false;
        cardEl.innerHTML = `
            <h2>${weak ? 'Calibration too rough to use' : 'Calibrated!'}</h2>
            <p>Average corrected error: <strong>~${Math.round(avgPx)}px</strong></p>
            <table class="calib-report"><thead><tr><th>Check dot</th><th>corrected error</th></tr></thead>
                <tbody>${rows}</tbody></table>
            <p>${verdict(avgPx)}</p>
            <p class="calib-hint">${weak
                ? 'Gaze selection stays off with a fit this rough — try again or refine the edges.'
                : 'Completed dwell selections keep gently tuning the correction during use.'}</p>
            <div class="modal-actions">
                ${weak ? '' : '<button class="button green-button aac-ctl" data-act="done">Done</button>'}
                ${allowRefine ? '<button class="button blue-button aac-ctl" data-act="edges">Refine edges</button>' : ''}
                <button class="button ${weak ? 'green-button' : 'pending-button'} aac-ctl" data-act="redo">${weak ? 'Try again' : 'Redo'}</button>
                ${weak ? '<button class="button pending-button aac-ctl" data-act="cancel">Cancel</button>' : ''}
            </div>`;
        const done = cardEl.querySelector('[data-act="done"]');
        if (done) {
            done.addEventListener('click', () => {
                cleanup();
                if (onDone) onDone(fit);
            });
        }
        cardEl.querySelector('[data-act="redo"]').addEventListener('click', () => {
            cleanup();
            runCalibration({ kind, onDone, onCancel });
        });
        const cancelBtn = cardEl.querySelector('[data-act="cancel"]');
        if (cancelBtn) cancelBtn.addEventListener('click', cancel);
        const edges = cardEl.querySelector('[data-act="edges"]');
        if (edges) {
            edges.addEventListener('click', async () => {
                cardEl.hidden = true;
                live.fit = fit;
                // 4 extreme-edge dots accumulate onto the anchors we already have
                active = true;
                buildStageChrome();
                const extra = [];
                let extraFails = 0;
                for (let i = 0; i < EDGE_POINTS.length && active; i++) {
                    const [fx, fy] = EDGE_POINTS[i];
                    const got = await runDot(fx, fy, i + 1, EDGE_POINTS.length, 'collect');
                    if (got && got.spread <= SPREAD_GATE) {
                        extra.push({
                            ...got,
                            txN: fx - 0.5,
                            tyN: fy - 0.5,
                            w: 1 / Math.max(0.004, got.spread),
                            src: 'calib'
                        });
                        if (!active) return;
                    } else {
                        extraFails += 1;
                    }
                    await sleep(200);
                }
                if (!active) return;
                if (extra.length) {
                    const rebuilt = solveFit([...(fit.samples || []), ...extra], { kind });
                    if (rebuilt) {
                        rebuilt.vw = window.innerWidth;
                        rebuilt.vh = window.innerHeight;
                        live.fit = rebuilt;
                    }
                }
                if (extraFails > 2) {
                    failCard('Too many edge dots timed out — light helps a lot.');
                    return;
                }
                await verifyAndReport({ allowRefine: false });
            });
        }
    };

    const verdict = (errPx) => {
        if (errPx < VERDICT_EXCELLENT) return 'Excellent — tiles will be easy to hit.';
        if (errPx < VERDICT_GOOD) return 'Good — comfortable for a 3-column board.';
        if (errPx < VERDICT_FAIR) return 'Fair — a Refine edges pass or more light usually helps.';
        return 'Rough — try again with more light and the screen at arm length.';
    };

    const failCard = (message) => {
        active = false;
        stageEl.innerHTML = '';
        live.predictEl = null;
        live.dot = null;
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
            live.fit = null;
            runCalibration({ kind, onDone, onCancel });
        });
        cardEl.querySelector('[data-act="cancel"]').addEventListener('click', cancel);
    };

    intro();
}

// Exported for the node solver test only (no other importers).
export const _calibSolver = { features, sparseFeatures, solveAxis, gaussJordan, solveFit };function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
