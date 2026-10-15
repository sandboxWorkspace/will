/**
 * Worker supervision + tracking-quality metrics for Speak Board.
 *
 * Purpose:  own the in-flight bookkeeping the gaze engine used to keep in
 *           loose booleans, fixing three confirmed defects:
 *
 *   1. Permanent wedge: a transient worker 'error' message was ignored, so
 *      `inFlight` stayed true and the frame loop skipped every future
 *      frame ("tracker silently dead until Gaze toggled"). Now an error
 *      reply CLEARS the in-flight slot (the worker is done with that frame)
 *      and is counted.
 *
 *   2. No stall detection: a worker that stops answering held `inFlight`
 *      forever. Now tick() treats an in-flight frame older than `stallMs`
 *      as a stall: the slot is freed so the next frame retries, and after
 *      `maxStalls` consecutive stalls the engine is told to switch paths.
 *
 *   3. Stale results: engine-side send SEQUENCE numbers guard against a
 *      result arriving for an old frame (or from a replaced worker), so an
 *      old result can never clear a newer in-flight slot or be applied as
 *      a fresh sample. gazeWorker.js echoes the seq back.
 *
 *   Also owns the quality metrics the readout displays: completed-inference
 *   FPS (per interval, not camera frames), inference latency avg/p50/p95
 *   (rolling ring), and dropped-camera-frame backpressure counts.
 *
 * Pure logic, clock injected by the caller — no DOM/timers, Node-testable.
 */

export function createSupervisor(cfg = {}) {
    const stallMs = cfg.stallMs ?? 2000; // Phase-1 default; tune per device in Phase 3
    const maxStalls = cfg.maxStalls ?? 3;
    const RING = cfg.latRingSize ?? 120;

    const s = {
        inFlightSeq: 0,      // 0 = idle; matches the seq sent with the frame
        inFlightSince: 0,
        completions: 0,      // per-interval completed inferences
        drops: 0,            // per-interval camera frames skipped (backpressure)
        errors: 0,           // cumulative worker 'error' messages
        stalls: 0,           // cumulative stall events
        staleDrops: 0,       // cumulative stale/unexpected results dropped
        latencies: [],       // rolling ring of per-inference ms
        intervalStart: 0     // last intervalStats() call time
    };

    function pushLatency(ms) {
        s.latencies.push(ms);
        if (s.latencies.length > RING) s.latencies.shift();
    }

    /** Mark the start of the first stats interval (engine calls at loop start). */
    function open(now) {
        s.intervalStart = now;
    }

    function touchInterval(now) {
        if (!s.intervalStart) s.intervalStart = now;
    }

    function noteSent(now, seq) {
        touchInterval(now);
        s.inFlightSeq = seq;
        s.inFlightSince = now;
    }

    /**
     * A 'result' message arrived.
     * @returns 'accepted' | 'stale' | 'unexpected'
     */
    function noteResult(now, seq) {
        if (!s.inFlightSeq) {
            s.staleDrops += 1;
            return 'unexpected';
        }
        if (seq !== s.inFlightSeq) {
            s.staleDrops += 1;
            return 'stale';
        }
        pushLatency(now - s.inFlightSince);
        s.completions += 1;
        s.inFlightSeq = 0;
        return 'accepted';
    }

    /** Worker reported a transient per-frame error — the frame is DONE. */
    function noteError() {
        s.errors += 1;
        const wasInFlight = Boolean(s.inFlightSeq);
        s.inFlightSeq = 0;
        return wasInFlight;
    }

    /** Camera frame skipped because inference (or the rate cap) was busy. */
    function noteDrop() {
        s.drops += 1;
    }

    /** Main-thread fallback completed an inference: same latency accounting. */
    function noteCompletion(now, latencyMs) {
        touchInterval(now);
        pushLatency(latencyMs);
        s.completions += 1;
    }

    /** A stale message from a worker instance we no longer own. */
    function noteOrphan() {
        s.staleDrops += 1;
    }

    /**
     * Frame-loop watchdog.
     * @returns null | 'stall' | 'degrade'  ('degrade' once stalls hit maxStalls)
     */
    function tick(now) {
        if (!s.inFlightSeq) return null;
        if (now - s.inFlightSince <= stallMs) return null;
        s.stalls += 1;
        s.inFlightSeq = 0; // free the slot so the next frame retries
        return s.stalls >= maxStalls ? 'degrade' : 'stall';
    }

    /** Drop in-flight state (engine start / path switch). Counters persist. */
    function forceIdle() {
        s.inFlightSeq = 0;
    }

    function reset() {
        s.inFlightSeq = 0;
        s.inFlightSince = 0;
        s.completions = 0;
        s.drops = 0;
        s.errors = 0;
        s.stalls = 0;
        s.staleDrops = 0;
        s.latencies = [];
        s.intervalStart = 0;
    }

    function percentile(sorted, p) {
        if (!sorted.length) return null;
        const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
        return sorted[rank - 1];
    }

    /**
     * Per-interval stats; resets the interval counters (completions, drops).
     * fps = COMPLETED inferences per second over the interval.
     */
    function intervalStats(now) {
        // intervalStart is set by open() or the first inferred activity;
        // with neither (idle pipeline) fps is 0 over a nominal 1ms span.
        const spanMs = s.intervalStart ? Math.max(1, now - s.intervalStart) : 1;
        const fps = Math.round((s.completions * 1000) / spanMs);
        const lat = [...s.latencies].sort((a, b) => a - b);
        const avgMs = lat.length
            ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length)
            : null;
        const stats = {
            fps,
            avgMs,
            p50Ms: percentile(lat, 50),
            p95Ms: percentile(lat, 95),
            samples: s.completions,
            drops: s.drops
        };
        s.completions = 0;
        s.drops = 0;
        s.intervalStart = now;
        return stats;
    }

    function cumulative() {
        return { errors: s.errors, stalls: s.stalls, staleDrops: s.staleDrops };
    }

    function inFlight() {
        return Boolean(s.inFlightSeq);
    }

    return {
        open,
        noteSent,
        noteResult,
        noteError,
        noteDrop,
        noteCompletion,
        noteOrphan,
        tick,
        forceIdle,
        reset,
        intervalStats,
        cumulative,
        inFlight
    };
}
