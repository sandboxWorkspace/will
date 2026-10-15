/**
 * One Euro filter (2D) — velocity-adaptive smoothing for pointer/gaze
 * signals: still at rest (kills jitter), instant on fast moves (no lag).
 *
 * Purpose:  smooth the per-frame normalized screen point produced by the
 *   worker (gazeWorker.js / gazeEngine.js fallback). This is the ONLY
 *   smoothing stage in the board pipeline — the board itself passes the
 *   point straight through.
 * Consumes: normalized [-0.5, 0.5] screen-space points; viewport size at
 *   construction (px-space derivatives are what the tuned cutoffs mean).
 * Emits:    smoothed normalized points (same space).
 * Owns:     the two LowPass inner filters and per-call dt math.
 */

class LowPass {
    setAlpha(alpha) {
        this.alpha = alpha;
    }
    filter(x) {
        this.y = this.y == null ? x : this.alpha * x + (1 - this.alpha) * this.y;
        return this.y;
    }
    hasLastValue() {
        return this.y != null;
    }
    lastValue() {
        return this.y ?? 0;
    }
}

export class OneEuro2D {
    /**
     * @param {object} opts
     *   minCutoff — smoothing floor (Hz); lower = steadier at rest
     *   beta      — velocity gain (normalized units/s); higher = more
     *               responsive during saccades. 2.0 ≈ stays lag-free while
     *               the eye moves, steady at rest.
     *   dCutoff   — derivative smoothing cutoff (Hz, keep ~1)
     *   vw, vh    — viewport size (px) the normalized signal is scaled by
     */
    constructor({ minCutoff = 1.2, beta = 2.0, dCutoff = 1.0, vw = 1000, vh = 1000 } = {}) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.vw = vw;
        this.vh = vh;
        this.x = new LowPass();
        this.y = new LowPass();
        this.dx = new LowPass();
        this.dy = new LowPass();
        this.lastTime = 0;
    }

    reset() {
        this.x = new LowPass();
        this.y = new LowPass();
        this.dx = new LowPass();
        this.dy = new LowPass();
        this.lastTime = 0;
    }

    setViewport(vw, vh) {
        if (vw && vh) {
            this.vw = vw;
            this.vh = vh;
        }
    }

    /** One Euro step in normalized screen space: in [-0.5, 0.5], out same. */
    step([nx, ny], tMs) {
        if (nx == null || ny == null) return [nx, ny];
        const t = typeof tMs === 'number' ? tMs : performance.now();
        if (!this.lastTime) {
            this.lastTime = t;
            return [nx, ny];
        }
        const te = Math.max(1e-3, (t - this.lastTime) / 1000); // seconds
        this.lastTime = t;

        const xRaw = nx * this.vw;
        const yRaw = ny * this.vh;

        this.dx.setAlpha(alpha(te, this.dCutoff));
        this.dy.setAlpha(alpha(te, this.dCutoff));

        const dx = (xRaw - (this.x.hasLastValue() ? this.x.lastValue() : xRaw)) / this.vw / te;
        const dy = (yRaw - (this.y.hasLastValue() ? this.y.lastValue() : yRaw)) / this.vh / te;
        const edx = this.dx.filter(dx);
        const edy = this.dy.filter(dy);

        // Velocity-aware cutoffs (rate in normalized units; scale the beta so
        // px derivatives map: derivative is in units/s — beta tuned for norm)
        const cutoffX = this.minCutoff + this.beta * Math.abs(edx);
        const cutoffY = this.minCutoff + this.beta * Math.abs(edy);

        this.x.setAlpha(alpha(te, cutoffX));
        this.y.setAlpha(alpha(te, cutoffY));

        const xFilt = this.x.filter(xRaw) / this.vw;
        const yFilt = this.y.filter(yRaw) / this.vh;

        return [xFilt, yFilt];
    }
}

function alpha(te, cutoff) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / te);
}
