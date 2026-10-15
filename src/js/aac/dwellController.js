/**
 * Dwell/hover state machine for Speak Board gaze modes (auto + head).
 *
 * Purpose:  own the selection-timing rules that were previously spread
 *           across setHover()/startDwell()/cancelDwell() in aacBoard.js,
 *           fixing three confirmed defects:
 *
 *   1. Stuck re-arm: old code re-armed only when hover hit -1, but the
 *      SNAP_PAD/NEAR_PAD halo made -1 unreachable over the board — after a
 *      first activation, later dwells never started ("works once").
 *      Now: re-arm requires a *stable exit* — the hysteresed hover must sit
 *      on a different tile (or empty space) for `exitMs`. Brief gaze flits
 *      and hit-test seam flips never change the hysteresed hover, so they
 *      can never re-arm.
 *
 *   2. Instant cancel on a single bad frame: one null-point or face-less
 *      frame used to cancel a dwell. Now: a short dropout (≤ `graceMs`)
 *      holds the displayed hover and PAUSES the dwell clock (accumulated
 *      time is kept, activation cannot fire while invalid); a longer
 *      dropout LANDS in `lost` — hover clears and selection stays off until
 *      `reacqMs` of uninterrupted valid samples prove stable reacquisition.
 *
 *   3. Seam jitter restarting dwell: hover switches require the new
 *      candidate to hold for `hysMs` (time-based, frame-rate independent).
 *
 * Blink handling is NOT here: validity is "could we produce a screen point?"
 * (face found + point available). Closed-eye frames make the engine's point
 * null, which arrives here as a plain invalid sample — blink *selection*
 * stays in the Directional-mode state machine, untouched.
 *
 * All timings are injected config — Phase-1 defaults chosen in aacBoard.js,
 * phase-3 device tuning expected. No DOM access — Node-testable.
 *
 * Consumes: update(nowMs, candidateIdx|-1, validBool) per gaze sample.
 * Emits:    a plain result object (see update()) the board renders from.
 */

export function createDwellController(cfg = {}) {
    const hysMs = cfg.hysMs ?? 120;
    const graceMs = cfg.graceMs ?? 400;
    const reacqMs = cfg.reacqMs ?? 400;
    const exitMs = cfg.exitMs ?? 250;
    const getDwellMs = cfg.getDwellMs || (() => 800);

    const s = {
        hover: -1,            // displayed hover (post-hysteresis), -1 = none
        pending: -1,          // hysteresis candidate
        pendingSince: 0,
        dwellIdx: -1,         // tile with a running dwell
        dwellElapsed: 0,      // ms of VALID time accumulated on dwellIdx
        blocked: -1,          // tile blocked from re-dwelling until stable exit
        exitSince: null,      // when the stable exit from `blocked` began
        lost: false,          // post-long-dropout: selection disabled
        reacqSince: null,     // first valid sample of the reacquisition window
        invalidSince: null,   // first invalid sample of the current dropout
        lastTickAt: 0         // last update() timestamp (valid or not)
    };

    function cancelDwellState() {
        s.dwellIdx = -1;
        s.dwellElapsed = 0;
    }

    function enterLost(out) {
        s.lost = true;
        s.reacqSince = null;
        s.pending = -1;
        s.invalidSince = null;
        if (s.dwellIdx >= 0) {
            cancelDwellState();
            out.dwellCanceled = true;
        }
        if (s.hover !== -1) {
            out.hoverChanged = true;
            out.hoverFrom = s.hover;
            s.hover = -1;
        }
        out.lostEntered = true;
    }

    /**
     * @param {number} now        performance.now()-style ms
     * @param {number} candidate  raw hit-test tile for the current point, -1 none
     * @param {boolean} valid     true when the pipeline produced a screen point
     * @returns state the board renders:
     *   { hover, hoverChanged, hoverFrom, activate, dwellIdx, dwellFrac,
     *     dwellPaused, dwellCanceled, lost, selectionEnabled }
     */
    function update(now, candidate, valid) {
        const out = {
            hover: s.hover,
            hoverChanged: false,
            hoverFrom: null,
            activate: -1,
            dwellIdx: -1,
            dwellFrac: 0,
            dwellPaused: false,
            dwellCanceled: false,
            lostEntered: false,
            lost: s.lost,
            selectionEnabled: !s.lost
        };

        const dt = s.lastTickAt ? now - s.lastTickAt : 0;
        s.lastTickAt = now;

        // ── Dropout tracking ─────────────────────────────────────────
        // A long gap BETWEEN samples counts as dropout too (engine normally
        // emits face-less frames, but a stalled pipeline goes silent).
        if (!valid && s.invalidSince == null) {
            s.invalidSince = dt > graceMs ? now - dt : now;
        }
        if (s.invalidSince != null && now - s.invalidSince > graceMs && !s.lost) {
            enterLost(out);
        }

        if (!valid) {
            if (s.lost) s.reacqSince = null; // reacquisition must be UNinterrupted
            out.hover = s.hover; // refresh: enterLost() may have cleared it
            out.lost = s.lost;
            out.selectionEnabled = false;
            if (!s.lost && s.dwellIdx >= 0) {
                // Short dropout: the dwell survives, frozen in place.
                out.dwellIdx = s.dwellIdx;
                out.dwellFrac = Math.min(1, s.dwellElapsed / getDwellMs());
                out.dwellPaused = true;
            }
            return out;
        }

        // ── Valid sample ─────────────────────────────────────────────
        // Silence longer than the grace window (a stalled pipeline delivers
        // nothing at all) counts as a long dropout even though no invalid
        // frames arrived. dt measures against the previous update of any kind.
        if (dt > graceMs && !s.lost) {
            enterLost(out);
        }
        s.invalidSince = null;

        // Reacquisition gate after a long dropout
        if (s.lost) {
            if (s.reacqSince == null) s.reacqSince = now;
            if (now - s.reacqSince < reacqMs) {
                out.hover = s.hover; // stays -1 during the gate
                out.lost = true;
                out.selectionEnabled = false;
                return out; // hover stays cleared — no half-lit dead state
            }
            s.lost = false;
            s.reacqSince = null;
        }
        out.lost = false;
        out.selectionEnabled = true;

        // ── Hover hysteresis ─────────────────────────────────────────
        if (candidate === s.hover) {
            s.pending = -1;
        } else if (candidate !== s.pending) {
            s.pending = candidate;
            s.pendingSince = now;
        } else if (now - s.pendingSince >= hysMs) {
            out.hoverChanged = true;
            out.hoverFrom = s.hover;
            s.hover = candidate;
            s.pending = -1;
            if (s.dwellIdx >= 0) {
                cancelDwellState();
                out.dwellCanceled = true;
            }
        }
        out.hover = s.hover;

        // ── Post-activation re-arm gate (stable exit from blocked tile) ──
        if (s.blocked >= 0) {
            if (s.hover === s.blocked) {
                s.exitSince = null;
            } else {
                if (s.exitSince == null) s.exitSince = now;
                if (now - s.exitSince >= exitMs) {
                    s.blocked = -1;
                    s.exitSince = null;
                }
            }
        }

        // ── Dwell accumulation ───────────────────────────────────────
        // Only valid time advances the clock (pauses are free: we return
        // early on invalid samples before reaching here).
        if (s.hover >= 0 && s.blocked < 0) {
            if (s.dwellIdx !== s.hover) {
                s.dwellIdx = s.hover;
                s.dwellElapsed = 0;
            }
            s.dwellElapsed += dt;
            if (s.dwellElapsed >= getDwellMs()) {
                out.activate = s.hover;
                s.blocked = s.hover; // same tile cannot refire without exit
                s.exitSince = null;
                cancelDwellState();
            }
        }
        out.dwellIdx = s.dwellIdx;
        out.dwellFrac = s.dwellIdx >= 0 ? Math.min(1, s.dwellElapsed / getDwellMs()) : 0;
        return out;
    }

    /** A touch/pad/directional activation outside this controller's path. */
    function noteExternalActivate(index) {
        s.blocked = index;
        s.exitSince = null;
        cancelDwellState();
    }

    function reset() {
        s.hover = -1;
        s.pending = -1;
        s.pendingSince = 0;
        cancelDwellState();
        s.blocked = -1;
        s.exitSince = null;
        s.lost = false;
        s.reacqSince = null;
        s.invalidSince = null;
        s.lastTickAt = 0;
    }

    /** Test/debug view of the raw state. */
    function getState() {
        return { ...s };
    }

    return { update, noteExternalActivate, reset, getState };
}
