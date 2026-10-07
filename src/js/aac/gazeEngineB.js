/**
 * Gaze engine B (Lab B) — quality-focused pipeline on top of MediaPipe:
 *
 *   - Inference in a Web Worker (never blocks the UI thread), with an
 *     automatic main-thread fallback if workers are unavailable
 *   - Blendshape-based blink detection (the model's own eyeBlink scores,
 *     far steadier than landmark geometry in bad lighting)
 *   - Lowered detection/presence/tracking thresholds to hold tracking in
 *     glare and dim light
 *   - Asymmetric deadzones (vertical gaze is noisier than horizontal because
 *     the eyelid occludes the iris)
 *   - Same watchdog/dedup/stall/diagnostics hardening as engine A
 *
 * Emits the same event contract as engine A; quality events additionally
 * report which inference path and backend won.
 */

const CDN_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
const CDN_ESM = `${CDN_ROOT}/vision_bundle.mjs`;
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// --- Tunables ---
const DEADZONE_X = 0.13;
const DEADZONE_Y = 0.17; // vertical is noisier — wider center zone
const SMOOTH = 0.4;
const ZONE_STREAK = 2;
const DIR_COOLDOWN_MS = 600;
const BLINK_SCORE = 0.45; // blendshape score above which an eye counts closed
const BLINK_MIN_MS = 400;
const BLINK_MAX_MS = 900;
const BLINK_SUPPRESS_MS = 900;
const HEAD_GATE = 0.03;
const FACE_LOST_MS = 1000;
const QUALITY_INTERVAL_MS = 500;
const LOAD_WATCHDOG_MS = 25000;
const CAMERA_WATCHDOG_MS = 15000;
const STALL_WARN_MS = 3000;
const FRAME_STALL_MS = 1000; // worker result overdue → drop the frame

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
let rafId = null;
let lastVideoTime = -1;

let worker = null;
let workerReady = false;
let useWorker = true;
let inFlight = false;
let postedAt = 0;
let backend = 'unknown';
let inference = 'worker';

let mainLandmarker = null; // main-thread fallback only

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
    inFlight = false;
    stallWarned = false;
}

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

    let watchdogFired = false;
    const watchdog = setTimeout(() => {
        watchdogFired = true;
        emit('aac:gaze-status', {
            text: 'Gaze engine took too long to load — check the connection and try again.',
            warn: true
        });
        failStart();
    }, LOAD_WATCHDOG_MS);

    const failStart = () => {
        running = false;
        starting = false;
        teardown();
        clearTimeout(watchdog);
    };

    // --- Inference setup: worker first, main-thread fallback ---
    try {
        if (typeof Worker !== 'undefined' && typeof createImageBitmap === 'function') {
            worker = new Worker(new URL('./gazeWorkerB.js', import.meta.url), { type: 'module' });
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('worker timeout')), LOAD_WATCHDOG_MS);
                worker.onmessage = (event) => {
                    const message = event.data || {};
                    if (message.type === 'ready') {
                        backend = message.backend || 'unknown';
                        inference = 'worker';
                        clearTimeout(timeout);
                        resolve();
                    } else if (message.type === 'fatal') {
                        clearTimeout(timeout);
                        reject(new Error(message.message));
                    }
                };
                worker.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('worker error'));
                };
                worker.postMessage({ type: 'init' });
            });
            workerReady = true;
            useWorker = true;
        } else {
            throw new Error('workers unavailable');
        }
    } catch (workerError) {
        console.warn('gazeEngineB: worker inference unavailable, falling back to main thread', workerError);
        useWorker = false;
        inference = 'main';
        try {
            const vision = await import(/* @vite-ignore */ CDN_ESM);
            const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN_ROOT}/wasm`);
            try {
                mainLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                    runningMode: 'VIDEO',
                    numFaces: 1,
                    outputFaceBlendshapes: true,
                    minFaceDetectionConfidence: 0.3,
                    minFacePresenceConfidence: 0.3,
                    minTrackingConfidence: 0.3
                });
                backend = 'GPU';
            } catch (gpuError) {
                mainLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
                    runningMode: 'VIDEO',
                    numFaces: 1,
                    outputFaceBlendshapes: true,
                    minFaceDetectionConfidence: 0.3,
                    minFacePresenceConfidence: 0.3,
                    minTrackingConfidence: 0.3
                });
                backend = 'CPU';
            }
        } catch (err) {
            console.error('gazeEngineB: engine load failed', err);
            clearTimeout(watchdog);
            emit('aac:gaze-status', {
                text: 'Could not load the gaze engine (network blocked?). Touch mode still works.',
                warn: true
            });
            failStart();
            return false;
        }
    }
    if (aborting || watchdogFired) {
        failStart();
        return false;
    }

    // --- Camera ---
    emit('aac:gaze-status', { text: 'Starting camera...' });
    try {
        stream = await Promise.race([
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Camera permission timed out')), CAMERA_WATCHDOG_MS)
            )
        ]);
    } catch (err) {
        console.error('gazeEngineB: camera unavailable', err);
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

    video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    try {
        await video.play();
    } catch (err) {
        console.error('gazeEngineB: video start failed', err);
    }

    if (useWorker && worker) {
        worker.onmessage = onWorkerMessage;
    }

    starting = false;
    faceSeenAt = performance.now();
    qualityAt = faceSeenAt;
    resetTransient();
    emit('aac:gaze-face', { ok: true });
    emit('aac:gaze-status', {
        text: `Tracking (${inference === 'worker' ? 'worker' : 'main thread'}, ${backend}). ${TRACKING_HINT}`
    });
    rafId = requestAnimationFrame(loop);
    return true;
}

function onWorkerMessage(event) {
    const message = event.data || {};
    if (message.type === 'result') {
        inFlight = false;
        handleLandmarks(message.lm, message.blink || {}, message.ts || performance.now());
    } else if (message.type === 'fatal') {
        // Worker died mid-session: degrade to main-thread inference
        console.warn('gazeEngineB: worker fatal', message.message);
        useWorker = false;
        inference = 'main';
        import(/* @vite-ignore */ CDN_ESM)
            .then((vision) =>
                vision.FilesetResolver.forVisionTasks(`${CDN_ROOT}/wasm`).then((fileset) =>
                    vision.FaceLandmarker.createFromOptions(fileset, {
                        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
                        runningMode: 'VIDEO',
                        numFaces: 1,
                        outputFaceBlendshapes: true,
                        minFaceDetectionConfidence: 0.3,
                        minFacePresenceConfidence: 0.3,
                        minTrackingConfidence: 0.3
                    })
                )
            )
            .then((landmarker) => {
                mainLandmarker = landmarker;
                backend = 'CPU';
                emit('aac:gaze-status', { text: `Tracking (main thread fallback, CPU). ${TRACKING_HINT}` });
            })
            .catch(() => {
                emit('aac:gaze-status', { text: 'Tracking engine stopped — reload to retry.', warn: true });
                stop();
            });
    }
}

function teardown() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (worker) {
        workerReady = false;
        try {
            worker.terminate();
        } catch (err) { /* already dead */ }
        worker = null;
    }
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video) {
        video.srcObject = null;
        video = null;
    }
    if (mainLandmarker) {
        try {
            mainLandmarker.close();
        } catch (err) { /* already closed */ }
        mainLandmarker = null;
    }
}

/** Stop tracking, release everything, reset state. Idempotent. */
export function stop() {
    aborting = true;
    running = false;
    starting = false;
    teardown();
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
    if (!video || video.readyState < 2) return;

    // Frame dedup: never infer twice on the same camera frame
    if (video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

    const now = performance.now();

    if (useWorker && worker && workerReady) {
        // Drop a stuck frame so the pump keeps flowing
        if (inFlight && now - postedAt > FRAME_STALL_MS) inFlight = false;
        if (inFlight) return;
        inFlight = true;
        postedAt = now;
        createImageBitmap(video)
            .then((bitmap) => {
                if (!running) {
                    bitmap.close();
                    inFlight = false;
                    return;
                }
                worker.postMessage({ type: 'frame', bitmap, ts: now }, [bitmap]);
            })
            .catch(() => {
                // createImageBitmap unsupported on this browser — fall back
                useWorker = false;
                inference = 'main';
                inFlight = false;
            });
        return;
    }

    if (mainLandmarker) {
        let result = null;
        try {
            result = mainLandmarker.detectForVideo(video, now);
        } catch (err) {
            return;
        }
        const lm = result && result.faceLandmarks && result.faceLandmarks[0];
        const blink = {};
        const shapes = result && result.faceBlendshapes && result.faceBlendshapes[0];
        if (shapes && shapes.categories) {
            shapes.categories.forEach((category) => {
                if (category.categoryName === 'eyeBlinkLeft' || category.categoryName === 'eyeBlinkRight') {
                    blink[category.categoryName] = category.score;
                }
            });
        }
        handleLandmarks(lm || null, blink, now);
    }
}

function handleLandmarks(lm, blink, now) {
    if (!lm) {
        if (!faceLost && now - faceSeenAt > FACE_LOST_MS) {
            faceLost = true;
            resetTransient();
            emit('aac:gaze-face', { ok: false });
            emit('aac:gaze-status', { text: 'Face not found — look at the camera.', warn: true });
        }
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
        emit('aac:gaze-status', {
            text: `Tracking (${inference === 'worker' ? 'worker' : 'main thread'}, ${backend}). ${TRACKING_HINT}`
        });
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
            inference,
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

    handleBlink(blink, now);
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
    if (Math.abs(dx) < DEADZONE_X && Math.abs(dy) < DEADZONE_Y) return 'center';
    if (Math.abs(dx) / DEADZONE_X >= Math.abs(dy) / DEADZONE_Y) return dx > 0 ? 'left' : 'right';
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

// Blendshape blink: the model reports per-eye closure scores directly.
function handleBlink(blink, now) {
    if (zone !== 'center') {
        blinking = false;
        return;
    }
    const left = blink.eyeBlinkLeft || 0;
    const right = blink.eyeBlinkRight || 0;
    const closed = left > BLINK_SCORE && right > BLINK_SCORE;
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
