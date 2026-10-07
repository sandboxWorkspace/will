/**
 * One Euro Filter — adaptive low-pass smoothing for gaze pointers.
 *
 * Heavy smoothing when the signal is slow (steady gaze), light smoothing when
 * the signal is fast (saccades) — removes the lag-then-catch feel of a plain
 * EMA. Standard for interactive gaze tracking (Casiez et al., CHI 2012).
 * This implementation smooths two axes jointly (screen x/y).
 */

class LowPass {
    constructor() {
        this.y = null;
        this.s = null;
    }

    filter(value, alpha) {
        this.s = this.s === null ? value : alpha * value + (1 - alpha) * this.s;
        return this.s;
    }

    lastValue() {
        return this.s;
    }
}

export class OneEuro2D {
    /**
     * @param {number} minCutoff lower cutoff frequency (Hz). Lower = smoother
     *   when still. 1.0 is a good gaze-cursor default.
     * @param {number} beta speed coefficient. Higher = more responsive during
     *   fast motion. 0.02-0.05 suits webcam gaze.
     * @param {number} dCutoff cutoff for the derivative estimate (Hz)
     */
    constructor(minCutoff = 1.0, beta = 0.04, dCutoff = 1.0) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.x = new LowPass();
        this.y = new LowPass();
        this.dx = new LowPass();
        this.dy = new LowPass();
        this.lastTime = null;
    }

    static alpha(cutoff, dt) {
        const tau = 1 / (2 * Math.PI * cutoff);
        return 1 / (1 + tau / dt);
    }

    reset() {
        this.x = new LowPass();
        this.y = new LowPass();
        this.dx = new LowPass();
        this.dy = new LowPass();
        this.lastTime = null;
    }

    /**
     * @param {number} px raw screen x
     * @param {number} py raw screen y
     * @param {number} now timestamp in ms (performance.now())
     * @returns {{x: number, y: number}} smoothed point
     */
    filter(px, py, now) {
        if (this.lastTime === null) {
            this.lastTime = now;
            this.x.filter(px, 1);
            this.y.filter(py, 1);
            return { x: this.x.lastValue(), y: this.y.lastValue() };
        }
        const dt = Math.max((now - this.lastTime) / 1000, 1e-3);
        this.lastTime = now;

        const prevX = this.x.lastValue();
        const prevY = this.y.lastValue();
        const dx = prevX === null ? 0 : (px - prevX) / dt;
        const dy = prevY === null ? 0 : (py - prevY) / dt;
        const edx = this.dx.filter(dx, OneEuro2D.alpha(this.dCutoff, dt));
        const edy = this.dy.filter(dy, OneEuro2D.alpha(this.dCutoff, dt));
        const cutoffX = this.minCutoff + this.beta * Math.abs(edx);
        const cutoffY = this.minCutoff + this.beta * Math.abs(edy);
        const sx = this.x.filter(px, OneEuro2D.alpha(cutoffX, dt));
        const sy = this.y.filter(py, OneEuro2D.alpha(cutoffY, dt));
        return { x: sx, y: sy };
    }
}
