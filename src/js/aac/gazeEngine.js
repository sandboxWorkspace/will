/**
 * Speak Board gaze engine — camera + MediaPipe ownership.
 *
 * Purpose:  own getUserMedia, feed zero-copy ImageBitmap frames into the
 *           worker, and translate worker results into the aac:gaze-* events
 *           the board consumes. Main-thread fallback runs the same signal
 *           math directly off the <video> element — RATE-LIMITED (time-cap
 *           + duty cycle) so a slow CPU delegate cannot starve the UI.
 *           One smoothing stage only: the worker's One Euro; nothing stacks.
 * Consumes: webcam frames; the worker's serialized results (seq-guarded).
 * Emits:    document-level CustomEvents:
 *             aac:gaze-sample  { nx, ny, gx, gy, hx, hy, fw, hp, hyaw,
 *                                distCm, irisPx, blinkL, blinkR, faceOk, open,
 *                                settling }  — ALSO emitted with faceOk:false
 *                                on face-less frames so the board can apply
 *                                dropout policy per frame instead of silence
 *             aac:gaze-dir     { dir }     — Directional move (zone machine)
 *             aac:gaze-center  { active }  — Directional "select" dwell item
 *             aac:gaze-blink   {}          — Directional blink select
 *             aac:gaze-face    { ok }      — face found/lost
 *             aac:gaze-quality { fps, avgMs, p50Ms, p95Ms, drops, errors,
 *                                stalls, staleDrops, jitterNorm, backend,
 *                                inference, res } — fps is COMPLETED
 *                                inferences/s, latency is send→result ms
 *                                (worker) or detect ms (fallback)
 *             aac:gaze-status  { text, warn }
 * Owns:     camera + worker lifecycle, the silent self-zero bootstrap at
 *           start, Directional state machine, face-lost watchdog, quality
 *           ticker, frame dedup + worker backpressure (one inference in
 *           flight, always the newest frame), worker stall watchdog.
 *
 * nx/ny are already screen-space stretched + OneEuro smoothed in the worker
 * (see gazeWorker.js header). Directional mode runs the zone/blink machine
 * on the eye-geometry signals gx/gy.
 * License trail: MediaPipe tasks-vision + landmarker © Google, Apache-2.0.
 */

import { OneEuro2D } from './oneEuro2D.js';
import { createSupervisor } from './workerSupervisor.js';
import {
    EYE,
    eyeNorm,
    headNormX,
    headNormY,
    faceWidth,
    headAngles,
    irisSpanPx,
    distanceCmFromIris
} from './landmarkSignals.js';

const HI_RES_KEY = 'aac-hires';
const CAM_BASE = { facingMode: 'user', width: 640, height: 480 };
const CAM_HI_RES = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };

function readHiRes() {
    try {
        return localStorage.getItem(HI_RES_KEY) === '1';
    } catch (err) {
        return false;
    }
}

function camConstraints() {
    return { video: readHiRes() ? CAM_HI_RES : CAM_BASE, audio: false };
}

// --- Directional-mode tunables (eye-geometry signals, 0.5 = ahead) ---
const DEADZONE_X = 0.13;
const DEADZONE_Y = 0.17;
const SMOOTH = 0.4;
const ZONE_STREAK = 2;
const DIR_COOLDOWN_MS = 600;
const BLINK_SCORE = 0.55;
const BLINK_MIN_MS = 400;
const BLINK_MAX_MS = 900;
const BLINK_SUPPRESS_MS = 900;
const HEAD_GATE = 0.02;
const FACE_LOST_MS = 1000;
const QUALITY_INTERVAL_MS = 500;
const WARMUP_MS = 900;
const SETTLE_MS = 1200; // silent bias bootstrap: opening frames settle the offset
const SETTLE_MIN = 15; // minimum good frames before trusting the settle median
const START_TIMEOUT_MS = 20000;

const GAIN = 3.2; // must match the worker's stretch (gazeWorker.js)
const BLINK_OPEN_MAX = 0.55;

// Phase-1 reliability tunables. These are INITIAL defaults chosen as sane
// starting points pending Phase-3 on-device measurement (do not treat them
// as validated settings): a stall = one inference unanswered for stallMs
// (long past any healthy 640×480 inference, well over the ~1s face-lost
// horizon); maxStalls consecutive stalls switch to the fallback path; the
// fallback is rate-capped to ~15fps and a ≤50% main-thread duty cycle so it
// cannot starve rendering the way the old unthrottled path could.
const WORKER_STALL_MS = 2000;
const WORKER_MAX_STALLS = 3;
const FALLBACK_MIN_INTERVAL_MS = 66;
const FALLBACK_DUTY = 1.0; // idle gap after a fallback inference ≥ its duration

const TRACKING_HINT = 'Look at a tile and hold until the blue bar fills.';

const CDN_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
const CDN_ESM = `${CDN_ROOT}/vision_bundle.mjs`;
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MIN_CONF = 0.3;

let running = false;
let starting = false;
let aborted = false;
let video = null;
let stream = null;

// Worker path
let worker = null;
let workerReady = false;
let backend = 'unknown';
let inference = 'worker';

// Worker supervision + quality metrics (Phase 1)
let sup = null;
let sendSeq = 0;

// Main-thread MediaPipe fallback
let fallbackLandmarker = null;
let fallbackPointFilter = null;
let fallbackPoseFilter = null;
// Fallback rate-limit state (kept out of the supervisor: it is engine policy)
let fbLastStart = 0;
let fbLastEnd = 0;
let fbLastDur = 0;

let rafId = null;
let lastVideoTime = -1;

// Directional + face-state machine
let gxAvg = 0.5;
let gyAvg = 0.5;
let hasAvg = false;
let zone = 'center';
let zoneStreak = 0;
let lastDirAt = 0;
let lastBlinkAt = 0;
let blinkStartAt = 0;
let blinking = false;
let prevHead = null;
let faceSeenAt = 0;
let faceLost = false;
let warmupUntil = 0;
let qualityAt = 0;
let recentSignals = []; // {nx, ny} for jitter

// Silent self-zero: the first SETTLE_MS of open-eyed frames estimate the
// constant camera/mount offset so the uncalibrated map lands centered.
let bias = { nx: 0, ny: 0, hx: 0, hy: 0 };
let settle = null; // { xs:[], ys:[], hxs:[], hys:[] } while collecting
let settleDone = true;
let settleStartAt = 0;

function emit(type, detail) {
    document.dispatchEvent(new CustomEvent(type, { detail }));
}

/**
 * Face-state reset used when tracking drops OUT mid-session (face lost).
 * Deliberately does NOT touch the self-zero bias/settle state: a brief
 * occlusion must not discard the living mount-offset estimate and silently
 * re-settle onto whatever the user happens to look at afterward (the old
 * resetTransient() here was a drift source). Full reset stays at start/stop.
 */
function resetFaceState() {
    zone = 'center';
    zoneStreak = 0;
    hasAvg = false;
    blinking = false;
    prevHead = null;
    recentSignals = [];
}

function resetTransient() {
    resetFaceState();
    lastVideoTime = -1;
    bias = { nx: 0, ny: 0, hx: 0, hy: 0 };
    settle = { xs: [], ys: [], hxs: [], hys: [] };
    settleDone = false;
    settleStartAt = 0;
}

/** Start camera + tracking with a staged, cancelable bootstrap. */
export async function start() {
    if (running || starting) return running;
    aborted = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        emit('aac:gaze-status', {
            text: 'Camera is not supported in this browser. Touch mode still works.',
            warn: true
        });
        return false;
    }

    starting = true;
    running = true;
    emit('aac:gaze-status', { text: 'Starting camera...' });

    const watchdog = setTimeout(() => {
        if (aborted) return;
        emit('aac:gaze-status', {
            text: 'Gaze engine took too long to load — check the connection and try again.',
            warn: true
        });
        stop();
    }, START_TIMEOUT_MS);

    try {
        emit('aac:gaze-status', { text: 'Loading gaze model (first launch takes a few seconds)...' });
        let ok = false;
        if (typeof Worker !== 'undefined' && typeof createImageBitmap === 'function') {
            ok = await startWorker();
        }
        if (!ok) {
            inference = 'main';
            ok = await startMainThread();
        }
        if (!ok) return false;

        stream = await navigator.mediaDevices.getUserMedia(camConstraints());
        if (aborted) return false;

        video = document.createElement('video'); // offscreen; never in the DOM
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        if (aborted) return false;

        clearTimeout(watchdog);
        starting = false;
        warmupUntil = performance.now() + WARMUP_MS;
        faceSeenAt = performance.now();
        qualityAt = faceSeenAt;
        resetTransient();
        settleStartAt = faceSeenAt;
        sup = createSupervisor({ stallMs: WORKER_STALL_MS, maxStalls: WORKER_MAX_STALLS });
        sup.open(faceSeenAt);
        sendSeq = 0;
        fbLastStart = 0;
        fbLastEnd = 0;
        fbLastDur = 0;
        emit('aac:gaze-face', { ok: true });
        emit('aac:gaze-status', {
            text: 'Gaze on — settling for a moment; keep facing the screen.'
        });
        rafId = requestAnimationFrame(loop);
        return true;
    } catch (err) {
        clearTimeout(watchdog);
        stop();
        emit('aac:gaze-status', {
            text:
                err && err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Touch mode still works.'
                    : 'Could not start gaze tracking — check camera + connection.',
            warn: true
        });
        console.error('gazeEngine: start failed', err);
        return false;
    }
}

function startWorker() {
    return new Promise((resolve) => {
        let w;
        try {
            w = new Worker(new URL('./gazeWorker.js', import.meta.url), { type: 'module' });
        } catch (err) {
            resolve(false);
            return;
        }
        worker = w;
        const timeout = setTimeout(() => {
            if (workerReady) return;
            try { w.terminate(); } catch (err) { /* already dead */ }
            worker = null;
            resolve(false);
        }, START_TIMEOUT_MS - 4000);

        w.onmessage = (event) => {
            const message = event.data || {};
            if (message.type === 'ready') {
                backend = message.backend || 'unknown';
                workerReady = true;
                clearTimeout(timeout);
                w.onmessage = (ev) => onWorkerMessage(w, ev);
                resolve(true);
            } else if (message.type === 'fatal' && !workerReady) {
                clearTimeout(timeout);
                try { w.terminate(); } catch (err) { /* already dead */ }
                worker = null;
                resolve(false);
            }
        };
        w.onerror = () => {
            if (workerReady) return;
            clearTimeout(timeout);
            try { w.terminate(); } catch (err) { /* already dead */ }
            worker = null;
            resolve(false);
        };
        w.postMessage({ type: 'init', vw: innerWidth, vh: innerHeight });
    });
}

function onWorkerMessage(w, event) {
    // A reply from a worker instance we already replaced (degrade/restart) —
    // never let an old worker clear our in-flight slot or feed stale samples.
    if (w !== worker) {
        if (sup) sup.noteOrphan();
        return;
    }
    const message = event.data || {};
    if (message.type === 'result') {
        const verdict = sup ? sup.noteResult(performance.now(), message.seq) : 'accepted';
        // 'accepted' → apply; 'stale'/'unexpected' → late reply for an old
        // frame: drop it, and never clear the newer in-flight slot.
        if (verdict === 'accepted') handleSignal(message);
    } else if (message.type === 'error') {
        // Transient per-frame failure: the frame is DONE — free the slot so
        // the next frame proceeds (the old code wedged tracking here forever).
        if (sup) sup.noteError();
    } else if (message.type === 'fatal') {
        degradeToMain('fatal');
    }
}

async function degradeToMain(reason) {
    try { if (worker) worker.terminate(); } catch (err) { /* already dead */ }
    worker = null;
    workerReady = false;
    if (sup) sup.forceIdle();
    inference = 'main';
    const ok = await startMainThread();
    if (!ok) {
        stop();
        return;
    }
    emit('aac:gaze-status', {
        text: 'Tracking switched to the reduced-rate fallback. '
            + 'If it feels slow, turn Gaze off and on to retry the fast path.'
    });
}

// ── Main-thread fallback (no workers / GPU-of-worker needed) ────

async function startMainThread() {
    try {
        const vision = await import(/* @vite-ignore */ CDN_ESM);
        const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN_ROOT}/wasm`);
        const opts = {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
            minFaceDetectionConfidence: MIN_CONF,
            minFacePresenceConfidence: MIN_CONF,
            minTrackingConfidence: MIN_CONF
        };
        try {
            fallbackLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, opts);
            backend = 'GPU';
        } catch (gpuError) {
            fallbackLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                ...opts,
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' }
            });
            backend = 'CPU';
        }
        fallbackPointFilter = new OneEuro2D({ vw: innerWidth, vh: innerHeight, minCutoff: 2.0, beta: 3.0 });
        fallbackPoseFilter = new OneEuro2D({ vw: 1000, vh: 1000 });
        return true;
    } catch (err) {
        console.error('gazeEngine: main-thread fallback failed', err);
        emit('aac:gaze-status', { text: 'Tracking engine failed to load.', warn: true });
        return false;
    }
}

function fallbackStep(ts) {
    if (!fallbackLandmarker) return;
    // Rate cap + duty cycle: the fallback runs synchronous inference on the
    // UI thread, so it is deliberately throttled (the old unthrottled path
    // could starve rendering/input on slow CPUs). Skipped frames count as
    // drops so the readout shows the real outlet rate.
    if (
        ts - fbLastStart < FALLBACK_MIN_INTERVAL_MS ||
        ts - fbLastEnd < fbLastDur * FALLBACK_DUTY
    ) {
        if (sup) sup.noteDrop();
        return;
    }
    fbLastStart = ts;
    let result;
    try {
        result = fallbackLandmarker.detectForVideo(video, ts);
    } catch (err) {
        return;
    }
    const end = performance.now();
    fbLastEnd = end;
    fbLastDur = Math.max(1, end - ts);
    if (sup) sup.noteCompletion(end, fbLastDur);
    if (!result) return;
    const msg = serializeFallback(result, end);
    if (msg) handleSignal(msg);
}

function blinkOf(result, name) {
    const shapes = result && result.faceBlendshapes && result.faceBlendshapes[0];
    if (!shapes || !shapes.categories) return 0;
    for (const category of shapes.categories) {
        if (category.categoryName === name) return category.score;
    }
    return 0;
}

/** Same serialized per-frame contract as gazeWorker.serialize(). */
function serializeFallback(result, ts) {
    const lm =
        result && result.faceLandmarks && result.faceLandmarks.length
            ? result.faceLandmarks[0]
            : null;
    if (!lm) return { faceOk: false, open: false };
    const blinkL = blinkOf(result, 'eyeBlinkLeft');
    const blinkR = blinkOf(result, 'eyeBlinkRight');
    const open = (blinkL + blinkR) / 2 < BLINK_OPEN_MAX;
    const W = video.videoWidth || 640;
    const H = video.videoHeight || 480;
    const irisPx = irisSpanPx(lm, W, H);
    const [lgx, lgy] = eyeNorm(lm, EYE.left);
    const [rgx, rgy] = eyeNorm(lm, EYE.right);
    const gx = (lgx + rgx) / 2;
    const gy = (lgy + rgy) / 2;

    let nx = null;
    let ny = null;
    if (open) {
        nx = (gx - 0.5) * GAIN;
        ny = (gy - 0.5) * GAIN;
        if (fallbackPointFilter) [nx, ny] = fallbackPointFilter.step([nx, ny], ts);
    }

    let hp = null;
    let hyaw = null;
    const angles = headAngles(result.facialTransformationMatrixes?.[0]);
    hp = angles ? angles.pitch : null;
    hyaw = angles ? angles.yaw : null;
    if (fallbackPoseFilter && hp != null && hyaw != null) {
        [hp, hyaw] = fallbackPoseFilter.step([hp, hyaw], ts);
    }

    return {
        type: 'result',
        faceOk: true,
        open,
        nx,
        ny,
        gx,
        gy,
        hx: headNormX(lm),
        hy: headNormY(lm),
        fw: faceWidth(lm),
        distCm: distanceCmFromIris(irisPx, W),
        irisPx,
        hp,
        hyaw,
        blinkL,
        blinkR
    };
}

// ── Frame loop ─────────────────────────────────────────────────

function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    // Watchdog: free (then escalate) a hung in-flight inference. Transient
    // stalls count as drops; repeated stalls switch to the measured,
    // rate-limited fallback path instead of hanging forever.
    if (sup) {
        const stall = sup.tick(performance.now());
        if (stall === 'stall') sup.noteDrop();
        else if (stall === 'degrade') degradeToMain('stall');
    }

    // Frame dedup — never infer twice on the same camera frame
    if (!video || video.readyState < 2 || video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

    if (worker && workerReady) {
        if (sup && sup.inFlight()) {
            sup.noteDrop(); // camera frame skipped — honest backpressure count
            return;
        }
        const ts = performance.now();
        const seq = ++sendSeq;
        const w = worker;
        createImageBitmap(video)
            .then((bitmap) => {
                if (!running || worker !== w || !workerReady) {
                    bitmap.close();
                    return;
                }
                if (sup) sup.noteSent(ts, seq);
                w.postMessage({ type: 'frame', bitmap, ts, seq }, [bitmap]);
            })
            .catch(() => {
                degradeToMain('bitmap');
            });
        return;
    }
    fallbackStep(performance.now());
}

// ── Per-frame signal → board events ────────────────────────────

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Silent bootstrap bias: median the opening frames, then lock it in. */
function finalizeSettle() {
    settleDone = true;
    if (settle && settle.xs.length >= SETTLE_MIN) {
        bias.nx = median(settle.xs);
        bias.ny = median(settle.ys);
    }
    if (settle && settle.hxs.length >= SETTLE_MIN) {
        bias.hx = median(settle.hxs) - 0.5;
        bias.hy = median(settle.hys) - 0.5;
    }
    settle = null;
    emit('aac:gaze-status', {
        text: `Tracking (${inference === 'worker' ? 'worker' : 'main thread'}, ${backend}). ${TRACKING_HINT}`
    });
}

function handleSignal(msg) {
    const now = performance.now();
    if (!msg.faceOk) {
        noFace(now);
        // Face-less frames are EMITTED (as invalid samples) so the board's
        // dropout policy sees per-frame invalidity instead of silence.
        emit('aac:gaze-sample', {
            nx: null, ny: null, gx: null, gy: null, hx: null, hy: null,
            fw: null, distCm: null, irisPx: null, hp: null, hyaw: null,
            blinkL: null, blinkR: null, faceOk: false, open: false,
            settling: !settleDone
        });
        return;
    }
    faceSeenAt = now;
    if (faceLost) {
        faceLost = false;
        emit('aac:gaze-face', { ok: true });
        emit('aac:gaze-status', {
            text: `Tracking (${inference === 'worker' ? 'worker' : 'main thread'}, ${backend}). ${TRACKING_HINT}`
        });
    }

    // Silent self-zero window — no dots, no taps: the user's own opening pose
    if (!settleDone) {
        if (!settleStartAt) settleStartAt = now;
        if (msg.open && msg.nx != null && msg.ny != null) {
            settle.xs.push(msg.nx);
            settle.ys.push(msg.ny);
        }
        if (msg.hx != null && msg.hy != null) {
            settle.hxs.push(msg.hx);
            settle.hys.push(msg.hy);
        }
        if (now - settleStartAt >= SETTLE_MS) finalizeSettle();
    }

    const headJump = prevHead && msg.hx != null
        ? Math.hypot(msg.hx - prevHead.x, msg.hy - prevHead.y)
        : 0;
    const stable = headJump <= HEAD_GATE;
    if (msg.hx != null) prevHead = { x: msg.hx, y: msg.hy };

    emit('aac:gaze-sample', {
        nx: msg.nx != null ? msg.nx - bias.nx : null,
        ny: msg.ny != null ? msg.ny - bias.ny : null,
        gx: msg.gx,
        gy: msg.gy,
        hx: msg.hx != null ? msg.hx - bias.hx : null,
        hy: msg.hy != null ? msg.hy - bias.hy : null,
        fw: msg.fw,
        distCm: msg.distCm,
        irisPx: msg.irisPx,
        hp: msg.hp,
        hyaw: msg.hyaw,
        blinkL: msg.blinkL,
        blinkR: msg.blinkR,
        faceOk: true,
        open: msg.open,
        settling: !settleDone
    });

    if (msg.nx != null) {
        recentSignals.push({ nx: msg.nx, ny: msg.ny });
        if (recentSignals.length > 30) recentSignals.shift();
    }
    if (now - qualityAt > QUALITY_INTERVAL_MS) {
        // Completed-inference truth from the supervisor: fps counts RESULTS,
        // latency is send→result ms (worker) or synchronous detect ms
        // (fallback); drops are camera frames skipped by backpressure.
        const stats = sup
            ? sup.intervalStats(now)
            : { fps: 0, avgMs: null, p50Ms: null, p95Ms: null, samples: 0, drops: 0 };
        const cum = sup ? sup.cumulative() : { errors: 0, stalls: 0, staleDrops: 0 };
        emit('aac:gaze-quality', {
            fps: stats.fps,
            avgMs: stats.avgMs,
            p50Ms: stats.p50Ms,
            p95Ms: stats.p95Ms,
            samples: stats.samples,
            drops: stats.drops,
            errors: cum.errors,
            stalls: cum.stalls,
            staleDrops: cum.staleDrops,
            jitterNorm: signalJitter(),
            backend,
            inference,
            res: video ? `${video.videoWidth}x${video.videoHeight}` : ''
        });
        qualityAt = now;
        // Dev-server-only metric trace (Vite strips DEV in production
        // builds): lets a tester read fps/latency/health from the console
        // while judging a camera — not a product feature.
        if (import.meta.env && import.meta.env.DEV) {
            console.debug(
                '[gaze] fps=%d lat=%s/%sms drops=%d err=%d stall=%d stale=%d',
                stats.fps,
                stats.avgMs ?? '–',
                stats.p95Ms ?? '–',
                stats.drops,
                cum.errors,
                cum.stalls,
                cum.staleDrops
            );
        }
    }

    if (!stable) return;
    if (now < warmupUntil) return;

    // Directional mode: eye-geometry direction signals — strong direction
    // cues at webcam resolution, always available, no calibration
    if (msg.gx != null && msg.gy != null) {
        if (!hasAvg) {
            gxAvg = msg.gx;
            gyAvg = msg.gy;
            hasAvg = true;
        }
        gxAvg += (msg.gx - gxAvg) * SMOOTH;
        gyAvg += (msg.gy - gyAvg) * SMOOTH;
        handleBlink(msg, now);
        handleZone(now);
    }
}

function signalJitter() {
    if (recentSignals.length < 6) return 0;
    let mx = 0;
    let my = 0;
    recentSignals.forEach((s) => {
        mx += s.nx;
        my += s.ny;
    });
    mx /= recentSignals.length;
    my /= recentSignals.length;
    let acc = 0;
    recentSignals.forEach((s) => {
        acc += (s.nx - mx) ** 2 + (s.ny - my) ** 2;
    });
    return Math.sqrt(acc / recentSignals.length);
}

function noFace(now) {
    if (!faceLost && now - faceSeenAt > FACE_LOST_MS) {
        faceLost = true;
        // Keep the self-zero bias + settle state: a dropout must not silently
        // replace the working mapping with a re-settle onto random post-return
        // gaze. Only the transient directional/blink face-state resets.
        resetFaceState();
        emit('aac:gaze-face', { ok: false });
        emit('aac:gaze-status', { text: 'Face not found — look at the camera.', warn: true });
    }
}

// ── Directional state machine (eye signals, 0.5 = ahead) ─────────

function classifyZone() {
    const dx = gxAvg - 0.5;
    const dy = gyAvg - 0.5;
    if (Math.abs(dx) < DEADZONE_X && Math.abs(dy) < DEADZONE_Y) return 'center';
    if (Math.abs(dx) / DEADZONE_X >= Math.abs(dy) / DEADZONE_Y) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
}

function handleZone(now) {
    const next = classifyZone();
    if (next === zone) {
        zoneStreak = 0;
        return;
    }
    zoneStreak += 1;
    if (zoneStreak < ZONE_STREAK) return;
    zoneStreak = 0;

    const previous = zone;
    zone = next;

    if (zone === 'center') {
        emit('aac:gaze-center', { active: true });
        return;
    }
    emit('aac:gaze-center', { active: false });
    if (previous !== 'center') return;
    if (now - lastDirAt < DIR_COOLDOWN_MS) return;
    lastDirAt = now;
    lastBlinkAt = now;
    emit('aac:gaze-dir', { dir: zone });
}

function handleBlink(msg, now) {
    if (zone !== 'center') {
        blinking = false;
        return;
    }
    const left = msg.blinkL || 0;
    const right = msg.blinkR || 0;
    const closed =
        left != null && right != null
            ? left > BLINK_SCORE && right > BLINK_SCORE
            : !msg.open;
    if (closed) {
        if (!blinking) {
            blinking = true;
            blinkStartAt = now;
            return;
        }
        const held = now - blinkStartAt;
        if (held >= BLINK_MIN_MS && held <= BLINK_MAX_MS && now - lastBlinkAt > BLINK_SUPPRESS_MS) {
            lastBlinkAt = now;
            blinking = false;
            emit('aac:gaze-blink', {});
        }
    } else {
        blinking = false;
    }
}

// ── Teardown ────────────────────────────────────────────────────

function teardown() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (worker) {
        try { worker.terminate(); } catch (err) { /* already dead */ }
        worker = null;
    }
    workerReady = false;
    sup = null;
    if (fallbackLandmarker) {
        try { fallbackLandmarker.close(); } catch (err) { /* already closed */ }
        fallbackLandmarker = null;
    }
    fallbackPointFilter = null;
    fallbackPoseFilter = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video) {
        video.srcObject = null;
        video = null;
    }
}

/** Stop tracking, release everything, reset state. Idempotent. */
export function stop() {
    aborted = true;
    running = false;
    starting = false;
    teardown();
    resetTransient();
    emit('aac:gaze-face', { ok: false });
    emit('aac:gaze-status', { text: '' });
    setTimeout(() => {
        aborted = false;
    }, 100);
}
