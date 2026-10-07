/**
 * Gaze engine A (Lab A) — the production MediaPipe pipeline hardened for
 * reliability: load watchdog, staged status, cancelable startup, frame
 * dedup, stall detection, and backend diagnostics. Tracking math (EMA
 * smoothing, EAR blink, default detection thresholds) is intentionally
 * identical to the production engine so the labs isolate reliability
 * changes from quality changes.
 *
 * Emits document-level CustomEvents:
 *   aac:gaze-sample  { detail: { gx, gy, hx, hy, stable, faceOk } }
 *   aac:gaze-dir     { detail: { dir } }
 *   aac:gaze-center  { detail: { active } }
 *   aac:gaze-blink   { detail: {} }
 *   aac:gaze-face    { detail: { ok } }
 *   aac:gaze-quality { detail: { fps, jitter, backend, inference, res } }
 *   aac:gaze-status  { detail: { text, warn } }
 */

const CDN_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
const CDN_ESM = `${CDN_ROOT}/vision_bundle.mjs`;
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// --- Tunables ---
const DEADZONE = 0.13;
const SMOOTH = 0.4;
const ZONE_STREAK = 2;
const DIR_COOLDOWN_MS = 600;
const BLINK_EAR = 0.16;
const BLINK_MIN_MS = 400;
const BLINK_MAX_MS = 900;
const BLINK_SUPPRESS_MS = 900;
const HEAD_GATE = 0.03;
const FACE_LOST_MS = 1000;
const QUALITY_INTERVAL_MS = 500;
const LOAD_WATCHDOG_MS = 20000; // overall start() budget
const CAMERA_WATCHDOG_MS = 15000; // getUserMedia budget
const STALL_WARN_MS = 3000; // no-face warning while camera runs

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
let starting = false;
let aborting = false;
let video = null;
let stream = null;
let landmarker = null;
let rafId = null;
let lastVideoTime = -1;
let backend = 'unknown';

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
let stallWarned = false;

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
    lastVideoTime = -1;
    stallWarned = false;
}

/**
 * Start camera + engine with a hard watchdog. Resolves true when tracking,
 * false on failure or when stop() is called mid-startup.
 */
export async function start() {
    if (running || starting) return running;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        emit('aac:gaze-status', {
            text: 'Camera is not supported in this browser. Touch mode still works.',
            warn: true
        });
        return false;
    }

    starting = true;
    aborting = false;
    running = true;
    emit('aac:gaze-status', { text: 'Loading gaze engine (first time takes a few seconds)...' });

    // Overall watchdog: everything below must finish within the budget
    let watchdogFired = false;
    const watchdog = setTimeout(() => {
        watchdogFired = true;
        if (!landmarker || !stream) {
            emit('aac:gaze-status', {
                text: 'Gaze engine took too long to load — check the connection and try again.',
                warn: true
            });
            failStart();
        }
    }, LOAD_WATCHDOG_MS);

    const failStart = () => {
        running = false;
        starting = false;
        teardownMedia();
        clearTimeout(watchdog);
    };

    try {
        const vision = await import(/* @vite-ignore */ CDN_ESM);
        if (aborting || watchdogFired) return false;
        emit('aac:gaze-status', { text: 'Starting camera...' });
        const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN_ROOT}/wasm`);
        if (aborting || watchdogFired) return false;
        try {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                runningMode: 'VIDEO',
                numFaces: 1
            });
            backend = 'GPU';
        } catch (gpuError) {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
                runningMode: 'VIDEO',
                numFaces: 1
            });
            backend = 'CPU';
        }
        if (aborting || watchdogFired) return false;
    } catch (err) {
        console.error('gazeEngineA: failed to load MediaPipe', err);
        clearTimeout(watchdog);
        emit('aac:gaze-status', {
            text: 'Could not load the gaze engine (network blocked?). Touch mode still works.',
            warn: true
        });
        failStart();
        return false;
    }

    try {
        stream = await Promise.race([
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Camera permission timed out')), CAMERA_WATCHDOG_MS)
            )
        ]);
    } catch (err) {
        console.error('gazeEngineA: camera unavailable', err);
        emit('aac:gaze-status', {
            text:
                err && err.message === 'Camera permission timed out'
                    ? 'Camera permission timed out. Touch mode still works.'
                    : err && err.name === 'NotAllowedError'
                      ? 'Camera permission denied. Touch mode still works.'
                      : 'Camera unavailable. Touch mode still works.',
            warn: true
        });
        failStart();
        return false;
    }
    if (aborting || watchdogFired) {
        failStart();
        return false;
    }
    clearTimeout(watchdog);

    video = document.createElement('video'); // offscreen; never added to the DOM
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    try {
        await video.play();
    } catch (err) {
        console.error('gazeEngineA: video start failed', err);
    }

    starting = false;
    faceSeenAt = performance.now();
    qualityAt = faceSeenAt;
    resetTransient();
    emit('aac:gaze-face', { ok: true });
    emit('aac:gaze-status', {
        text: `Tracking (GPU: ${backend === 'GPU'}). ${TRACKING_HINT}`
    });
    rafId = requestAnimationFrame(loop);
    return true;
}

function teardownMedia() {
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
}

/** Stop tracking, release camera and model, reset state. Idempotent. */
export function stop() {
    aborting = true;
    running = false;
    starting = false;
    teardownMedia();
    resetTransient();
    emit('aac:gaze-face', { ok: false });
    emit('aac:gaze-status', { text: '' });
    setTimeout(() => {
        aborting = false;
    }, 100);
}

function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    if (!video || video.readyState < 2 || !landmarker) return;

    // Frame dedup: skip inference when the camera has not produced a new frame
    if (video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

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
        // Stall detector: camera flowing but nothing detected for a long time
        if (!stallWarned && now - faceSeenAt > STALL_WARN_MS) {
            stallWarned = true;
            emit('aac:gaze-status', {
                text: 'Tracking stalled — check lighting, or reload the page.',
                warn: true
            });
        }
        return;
    }

    faceSeenAt = now;
    stallWarned = false;
    if (faceLost) {
        faceLost = false;
        emit('aac:gaze-face', { ok: true });
        emit('aac:gaze-status', { text: `Tracking (GPU: ${backend === 'GPU'}). ${TRACKING_HINT}` });
    }

    const nose = lm[NOSE_TIP];
    const headJump = prevNose ? Math.hypot(nose.x - prevNose.x, nose.y - prevNose.y) : 0;
    const stable = headJump <= HEAD_GATE;
    prevNose = { x: nose.x, y: nose.y };

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
            fps: Math.round((frameCount * 1000) / Math.max(1, now - qualityAt)),
            jitter: sampleJitter(),
            backend,
            inference: 'main',
            res: video ? `${video.videoWidth}x${video.videoHeight}` : ''
        });
        frameCount = 0;
        qualityAt = now;
    }

    if (!stable) return;

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
    emit('aac:gaze-center', { active: false });
    if (previous !== 'center') return;
    if (now - lastDirAt < DIR_COOLDOWN_MS) return;
    lastDirAt = now;
    lastBlinkAt = now;
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
    if (zone !== 'center') {
        blinking = false;
        return;
    }
    const closed = earRatio(lm, EYE.left) < BLINK_EAR && earRatio(lm, EYE.right) < BLINK_EAR;
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
