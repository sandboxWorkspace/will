/**
 * Gaze worker (Lab B) — runs MediaPipe FaceLandmarker inference off the main
 * thread (the pattern Google's own docs recommend: detectForVideo blocks the
 * UI thread). Receives transferred ImageBitmap frames, posts back normalized
 * landmarks plus eye-blink blendshape scores.
 *
 * Messages in:  { type: 'init' }
 *               { type: 'frame', bitmap, ts }   (bitmap transferred, not copied)
 * Messages out: { type: 'ready', backend }
 *               { type: 'result', ts, lm, blink }
 *               { type: 'fatal', message }
 */

const CDN_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
const CDN_ESM = `${CDN_ROOT}/vision_bundle.mjs`;
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Lowered thresholds keep tracking alive in glare / dim clinic lighting
const MIN_FACE_DETECTION_CONFIDENCE = 0.3;
const MIN_FACE_PRESENCE_CONFIDENCE = 0.3;
const MIN_TRACKING_CONFIDENCE = 0.3;

let landmarker = null;
let ready = false;

function post(message, transfer) {
    self.postMessage(message, transfer || []);
}

async function init() {
    try {
        const vision = await import(/* @vite-ignore */ CDN_ESM);
        const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN_ROOT}/wasm`);
        try {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                runningMode: 'VIDEO',
                numFaces: 1,
                outputFaceBlendshapes: true,
                minFaceDetectionConfidence: MIN_FACE_DETECTION_CONFIDENCE,
                minFacePresenceConfidence: MIN_FACE_PRESENCE_CONFIDENCE,
                minTrackingConfidence: MIN_TRACKING_CONFIDENCE
            });
            post({ type: 'ready', backend: 'GPU' });
        } catch (gpuError) {
            // No WebGL in this worker context — CPU inference still beats
            // blocking the main thread
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
                runningMode: 'VIDEO',
                numFaces: 1,
                outputFaceBlendshapes: true,
                minFaceDetectionConfidence: MIN_FACE_DETECTION_CONFIDENCE,
                minFacePresenceConfidence: MIN_FACE_PRESENCE_CONFIDENCE,
                minTrackingConfidence: MIN_TRACKING_CONFIDENCE
            });
            post({ type: 'ready', backend: 'CPU' });
        }
        ready = true;
    } catch (err) {
        post({ type: 'fatal', message: String((err && err.message) || err) });
    }
}

async function onFrame({ bitmap, ts }) {
    if (!ready || !landmarker) {
        if (bitmap.close) bitmap.close();
        return;
    }
    let result = null;
    try {
        result = landmarker.detectForVideo(bitmap, ts);
    } catch (err) {
        result = null;
    }
    if (bitmap.close) bitmap.close();

    const lm = result && result.faceLandmarks && result.faceLandmarks[0] ? result.faceLandmarks[0] : null;
    const blink = {};
    const shapes = result && result.faceBlendshapes && result.faceBlendshapes[0];
    if (shapes && shapes.categories) {
        shapes.categories.forEach((category) => {
            if (category.categoryName === 'eyeBlinkLeft' || category.categoryName === 'eyeBlinkRight') {
                blink[category.categoryName] = category.score;
            }
        });
    }
    post({ type: 'result', ts, lm, blink });
}

self.onmessage = (event) => {
    const message = event.data;
    if (!message) return;
    if (message.type === 'init') init();
    if (message.type === 'frame') onFrame(message);
};
