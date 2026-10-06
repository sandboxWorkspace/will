/**
 * Gaze engine for Speak Board — webcam gaze via MediaPipe FaceLandmarker
 * (© Google, Apache-2.0), loaded at runtime from a CDN only when the user
 * turns Gaze mode on. All processing happens on-device.
 *
 * Emits document-level CustomEvents:
 *   aac:gaze-sample  { detail: { gx, gy, hx, hy, stable, faceOk } }
 *       gx, gy — iris vector, per-eye-normalized (~[0,1], 0.5 = looking ahead)
 *       hx, hy — head vector (nose position within the face box, same scale)
 *       stable — false when a large head movement made this frame unreliable
 *   aac:gaze-dir     { detail: { dir: 'up'|'down'|'left'|'right' } }
 *   aac:gaze-center  { detail: { active: true|false } }
 *   aac:gaze-blink   { detail: {} }
 *   aac:gaze-face    { detail: { ok: true|false } }
 *   aac:gaze-quality { detail: { fps, jitter } }  (roughly every 500 ms)
 *   aac:gaze-status  { detail: { text, warn } }
 *
 * Cursor positioning (calibrated iris or head pointer) and dwell live in
 * aacBoard.js / calibration.js — this engine only reports raw signals.
 */

const CDN_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
const CDN_ESM = `${CDN_ROOT}/vision_bundle.mjs`;
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// --- Tunables (empirical defaults; adjust here, no other file changes needed) ---
const DEADZONE = 0.13; // normalized gaze offset treated as "center"
const SMOOTH = 0.4; // EMA weight given to each new frame's sample
const ZONE_STREAK = 2; // consecutive frames required to confirm a zone change
const DIR_COOLDOWN_MS = 600; // minimum gap between direction events
const BLINK_EAR = 0.16; // eye aspect ratio below which an eye counts as closed
const BLINK_MIN_MS = 400; // deliberate blink: hold at least this long...
const BLINK_MAX_MS = 900; // ...but no longer than this
const BLINK_SUPPRESS_MS = 900; // ignore blinks this soon after a direction event
const HEAD_GATE = 0.03; // nose-tip jump (normalized) that marks a frame unstable
const FACE_LOST_MS = 1000;
const QUALITY_INTERVAL_MS = 500;

// Canonical FaceMesh landmark indices (iris-refined 478-point model)
const EYE = {
    left: { iris: 468, inner: 133, outer: 33, top: 159, bottom: 145 },
    right: { iris: 473, inner: 362, outer: 263, top: 386, bottom: 374 }
};
const NOSE_TIP = 1;
const FACE_LEFT = 234;
const FACE_RIGHT = 454;
const FACE_TOP = 10;
const FACE_BOTTOM = 152;

const TRACKING_HINT = 'Look at a tile and hold until the blue bar fills.';

let running = false;
let video = null;
let stream = null;
let landmarker = null;
let rafId = null;

let gxAvg = 0.5;
let gyAvg = 0.5;
let hasAvg = false;
let zone = 'center';
let zoneStreak = 0;
let lastDirAt = 0;
let lastBlinkAt = 0;
let blinkStartAt = 0;
let blinking = false;
let prevNose = null;
let faceSeenAt = 0;
let faceLost = false;

// Quality tracking
let frameCount = 0;
let qualityAt = 0;
let recentSamples = [];

function emit(type, detail) {
    document.dispatchEvent(new CustomEvent(type, { detail }));
}

function resetTransient() {
    zone = 'center';
    zoneStreak = 0;
    hasAvg = false;
    blinking = false;
    prevNose = null;
    recentSamples = [];
}

/**
 * Start camera + engine. Resolves true when tracking is running, false on
 * any failure (permission denied, CDN unreachable, unsupported browser).
 */
export async function start() {
    if (running) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        emit('aac:gaze-status', {
            text: 'Camera is not supported in this browser. Touch mode still works.',
            warn: true
        });
        return false;
    }

    running = true;
    emit('aac:gaze-status', { text: 'Loading gaze engine (first time takes a few seconds)...' });

    try {
        const vision = await import(/* @vite-ignore */ CDN_ESM);
        const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN_ROOT}/wasm`);
        try {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                runningMode: 'VIDEO',
                numFaces: 1
            });
        } catch (gpuError) {
            // Some devices lack WebGL/WebGPU — retry on CPU
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
                runningMode: 'VIDEO',
                numFaces: 1
            });
        }
    } catch (err) {
        console.error('gazeEngine: failed to load MediaPipe', err);
        running = false;
        emit('aac:gaze-status', {
            text: 'Could not load the gaze engine (network blocked?). Touch mode still works.',
            warn: true
        });
        return false;
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 640, height: 480 }
        });
    } catch (err) {
        console.error('gazeEngine: camera unavailable', err);
        running = false;
        emit('aac:gaze-status', {
            text:
                err && err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Touch mode still works.'
                    : 'Camera unavailable. Touch mode still works.',
            warn: true
        });
        return false;
    }

    video = document.createElement('video'); // offscreen; never added to the DOM
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    try {
        await video.play();
    } catch (err) {
        console.error('gazeEngine: video start failed', err);
    }

    faceSeenAt = performance.now();
    resetTransient();
    emit('aac:gaze-face', { ok: true });
    emit('aac:gaze-status', { text: TRACKING_HINT });
    rafId = requestAnimationFrame(loop);
    return true;
}

/** Stop tracking, release camera and model, reset state. */
export function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video) {
        video.srcObject = null;
        video = null;
    }
    if (landmarker) {
        try {
            landmarker.close();
        } catch (err) { /* already closed */ }
        landmarker = null;
    }
    resetTransient();
    emit('aac:gaze-face', { ok: false });
    emit('aac:gaze-status', { text: '' });
}

function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    if (!video || video.readyState < 2 || !landmarker) return;

    let result;
    try {
        result = landmarker.detectForVideo(video, performance.now());
    } catch (err) {
        return; // transient inference error; try again next frame
    }

    const lm = result && result.faceLandmarks && result.faceLandmarks[0];
    const now = performance.now();

    if (!lm) {
        if (!faceLost && now - faceSeenAt > FACE_LOST_MS) {
            faceLost = true;
            resetTransient();
            emit('aac:gaze-face', { ok: false });
            emit('aac:gaze-status', { text: 'Face not found — look at the camera.', warn: true });
        }
        return;
    }

    faceSeenAt = now;
    if (faceLost) {
        faceLost = false;
        emit('aac:gaze-face', { ok: true });
        emit('aac:gaze-status', { text: TRACKING_HINT });
    }

    // Head-motion gate: a large nose-tip jump means the head moved this
    // frame; eye direction is unreliable during head motion.
    const nose = lm[NOSE_TIP];
    const headJump = prevNose
        ? Math.hypot(nose.x - prevNose.x, nose.y - prevNose.y)
        : 0;
    const stable = headJump <= HEAD_GATE;
    prevNose = { x: nose.x, y: nose.y };

    // Raw signals
    const [lx, ly] = eyeNorm(lm, EYE.left);
    const [rx, ry] = eyeNorm(lm, EYE.right);
    const gx = (lx + rx) / 2;
    const gy = (ly + ry) / 2;
    const [hx, hy] = headNorm(lm);

    frameCount += 1;
    recentSamples.push({ gx, gy });
    if (recentSamples.length > 30) recentSamples.shift();
    emit('aac:gaze-sample', { gx, gy, hx, hy, stable, faceOk: true });

    if (now - qualityAt > QUALITY_INTERVAL_MS) {
        emit('aac:gaze-quality', {
            fps: Math.round((frameCount * 1000) / (now - qualityAt)),
            jitter: sampleJitter()
        });
        frameCount = 0;
        qualityAt = now;
    }

    if (!stable) return; // skip zone/blink classification during head motion

    if (!hasAvg) {
        gxAvg = gx;
        gyAvg = gy;
        hasAvg = true;
    }
    gxAvg += (gx - gxAvg) * SMOOTH;
    gyAvg += (gy - gyAvg) * SMOOTH;

    handleBlink(lm, now);
    handleZone(now);
}

// Iris position normalized within each eye's corner-to-corner box, so the
// per-eye geometry cancels camera mirroring: >0.5 always = toward the temple
// (i.e. the user looking toward their own left in screen space).
function eyeNorm(lm, eye) {
    const iris = lm[eye.iris];
    const inner = lm[eye.inner];
    const outer = lm[eye.outer];
    const top = lm[eye.top];
    const bottom = lm[eye.bottom];
    const ex = (iris.x - inner.x) / ((outer.x - inner.x) || 1e-6);
    const ey = (iris.y - top.y) / ((bottom.y - top.y) || 1e-6);
    return [ex, ey];
}

// Nose position within the face box, normalized by box size. Immune to head
// translation (whole box moves together); responds to head rotation (nose
// sweeps within the box). Robust where iris detail fails: glare, glasses.
function headNorm(lm) {
    const faceW = Math.abs(lm[FACE_RIGHT].x - lm[FACE_LEFT].x) || 1e-6;
    const faceH = Math.abs(lm[FACE_BOTTOM].y - lm[FACE_TOP].y) || 1e-6;
    const cx = (lm[FACE_RIGHT].x + lm[FACE_LEFT].x) / 2;
    const cy = (lm[FACE_TOP].y + lm[FACE_BOTTOM].y) / 2;
    const hx = (lm[NOSE_TIP].x - cx) / faceW + 0.5;
    const hy = (lm[NOSE_TIP].y - cy) / faceH + 0.5;
    return [hx, hy];
}

function sampleJitter() {
    if (recentSamples.length < 6) return 0;
    const n = recentSamples.length;
    let mx = 0;
    let my = 0;
    recentSamples.forEach((s) => {
        mx += s.gx;
        my += s.gy;
    });
    mx /= n;
    my /= n;
    let acc = 0;
    recentSamples.forEach((s) => {
        acc += (s.gx - mx) * (s.gx - mx) + (s.gy - my) * (s.gy - my);
    });
    return Math.sqrt(acc / n);
}

function classifyZone() {
    const dx = gxAvg - 0.5;
    const dy = gyAvg - 0.5;
    if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return 'center';
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
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
    // Left center — the board cancels any dwell in progress
    emit('aac:gaze-center', { active: false });
    if (previous !== 'center') return; // must return to center between moves
    if (now - lastDirAt < DIR_COOLDOWN_MS) return;
    lastDirAt = now;
    lastBlinkAt = now; // suppress blink-on-saccade
    emit('aac:gaze-dir', { dir: zone });
}

function earRatio(lm, eye) {
    const vertical = Math.abs(lm[eye.top].y - lm[eye.bottom].y);
    const horizontal = Math.hypot(
        lm[eye.inner].x - lm[eye.outer].x,
        lm[eye.inner].y - lm[eye.outer].y
    );
    return horizontal ? vertical / horizontal : 1;
}

function handleBlink(lm, now) {
    // Looking down narrows the eyelid gap and fakes a blink — only accept
    // blinks while the gaze is near center.
    if (zone !== 'center') {
        blinking = false;
        return;
    }
    const closed =
        earRatio(lm, EYE.left) < BLINK_EAR && earRatio(lm, EYE.right) < BLINK_EAR;
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
