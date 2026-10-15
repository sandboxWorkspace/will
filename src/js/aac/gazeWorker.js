/**
 * Gaze worker — MediaPipe FaceLandmarker inference off the UI thread.
 *
 * Purpose:  webcam frames in → gaze signals out, never blocking the UI.
 *           MediaPipe FaceLandmarker © Google, Apache-2.0.
 * Consumes: { type: 'init', vw, vh }
 *           { type: 'frame', bitmap: ImageBitmap, ts, seq }   (transferred)
 * Emits:    { type: 'ready', backend }
 *           { type: 'result', faceOk, open, nx, ny, gx, gy, hx, hy, fw,
 *                        distCm, irisPx, hp, hyaw, blinkL, blinkR, seq }
 *           { type: 'fatal' | 'error', message, seq }
 *
 * `seq` echoes the engine's per-frame sequence number so the engine can
 * drop stale results (late replies never clear a newer in-flight slot).
 * A busy/not-ready drop replies 'error' with the seq so the engine's
 * supervision frees the slot immediately instead of waiting out a stall.
 * Owns:     the FaceLandmarker instance, per-frame serialization, OneEuro
 *           smoothing on the screen point (nx, ny) and head pose (hp, hyaw).
 *
 * Signal design:
 *   gx/gy — iris-in-corner per-eye average, [0,1] with 0.5 ahead
 *   nx/ny — screen-space point derived from gx/gy: stretched around center
 *           by GAIN (brain decision: full-screen travel from an eye signal
 *           whose real-world swing is only ~±0.15), OneEuro-smoothed hot
 *           (minCutoff 2.0, beta 3.0 — avoid trailing, feeds the board
 *           without a second filter)
 */

import { OneEuro2D } from './oneEuro2D.js';
import {
    EYE,
    eyeNorm,
    headNormX,
    headNormY,
    faceWidth,
    headAngles,
    distanceCmFromIris,
    irisSpanPx
} from './landmarkSignals.js';

const CDN_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
const CDN_ESM = `${CDN_ROOT}/vision_bundle.mjs`;
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MIN_CONF = 0.3;
const GAIN = 3.2; // screen travel per unit of eye swing (see header)
const BLINK_OPEN_MAX = 0.55;

let landmarker = null;
let ready = false;
let busy = false;
let pointFilter = null;
let poseFilter = null;

function post(message) {
    self.postMessage(message);
}

self.onmessage = (event) => {
    const message = event.data || {};
    if (message.type === 'init') init(message);
    else if (message.type === 'frame') onFrame(message);
};

async function init({ vw, vh }) {
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
        let backend = 'GPU';
        try {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, opts);
        } catch (gpuError) {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                ...opts,
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' }
            });
            backend = 'CPU';
        }
        pointFilter = new OneEuro2D({
            vw: vw || 1000,
            vh: vh || 1000,
            minCutoff: 2.0,
            beta: 3.0
        });
        poseFilter = new OneEuro2D({ vw: 1000, vh: 1000 });
        ready = true;
        post({ type: 'ready', backend });
    } catch (err) {
        post({ type: 'fatal', message: String((err && err.message) || err) });
    }
}

function onFrame({ bitmap, ts, seq }) {
    if (!ready || !landmarker || busy) {
        bitmap.close();
        // Tell the engine this seq produced nothing — frees its slot now.
        post({ type: 'error', message: 'busy-or-not-ready', seq });
        return;
    }
    busy = true;
    const frameW = bitmap.width || 0;
    const frameH = bitmap.height || 0;
    try {
        const result = landmarker.detectForVideo(bitmap, ts);
        if (result) post(serialize(result, frameW, frameH, ts, seq));
    } catch (err) {
        post({ type: 'error', message: String((err && err.message) || err), seq });
    } finally {
        bitmap.close();
        busy = false;
    }
}

/** Per-frame contract with gazeEngine.js. Eyes closed → nx/ny/gx/gy null. */
function serialize(result, frameW, frameH, ts, seq) {
    const lm =
        result.faceLandmarks && result.faceLandmarks.length
            ? result.faceLandmarks[0]
            : null;
    const faceOk = Boolean(lm);
    if (!faceOk) return { type: 'result', faceOk: false, open: false, seq };

    const blinkL = blinkScore(result, 'eyeBlinkLeft');
    const blinkR = blinkScore(result, 'eyeBlinkRight');
    const open = (blinkL + blinkR) / 2 < BLINK_OPEN_MAX;

    const [lx, ly] = eyeNorm(lm, EYE.left);
    const [rx, ry] = eyeNorm(lm, EYE.right);
    const gx = (lx + rx) / 2;
    const gy = (ly + ry) / 2;

    let nx = null;
    let ny = null;
    if (open) {
        // Stretch to screen span, then smooth the STRETCHED signal (filtering
        // in screen space is what keeps jitter micro and saccades free)
        nx = (gx - 0.5) * GAIN;
        ny = (gy - 0.5) * GAIN;
        if (pointFilter) [nx, ny] = pointFilter.step([nx, ny], ts);
    }

    let hp = null;
    let hyaw = null;
    const angles = headAngles(result.facialTransformationMatrixes?.[0]);
    hp = angles ? angles.pitch : null;
    hyaw = angles ? angles.yaw : null;
    if (poseFilter && hp != null && hyaw != null) {
        [hp, hyaw] = poseFilter.step([hp, hyaw], ts);
    }

    const irisPx = irisSpanPx(lm, frameW, frameH);
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
        distCm: distanceCmFromIris(irisPx, frameW),
        irisPx,
        hp,
        hyaw,
        blinkL,
        blinkR,
        seq
    };
}

function blinkScore(result, name) {
    const shapes = result.faceBlendshapes && result.faceBlendshapes[0];
    if (shapes && shapes.categories) {
        for (const category of shapes.categories) {
            if (category.categoryName === name) return category.score;
        }
    }
    return 0;
}
