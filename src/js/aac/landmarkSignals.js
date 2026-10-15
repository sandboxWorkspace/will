/**
 * Landmark → signal math, shared by the gaze worker (gazeWorker.js) and the
 * main-thread fallback path in gazeEngine.js. Everything here maps a
 * MediaPipe FaceLandmarker result (478 landmarks incl. iris, plus the
 * facialTransformationMatrix head pose) into the normalized scalar signals
 * the board and calibration consume:
 *
 *   gx, gy   iris position within the eye corners, ≈[0, 1] (gaze direction)
 *   hx, hy   nose position within the face box, ≈[0, 1] (Directional mode)
 *   fw       inter-eye-corner distance in normalized image units (depth proxy)
 *   hp, hyaw head pitch / yaw in radians, from the face rotation matrix —
 *            the camera-mount asymmetry signal (top bezel vs. bottom mount)
 *   distCm   camera→face distance estimate in cm (coach only, not fit math)
 *   irisPx   iris diameter in FRAME PIXELS — resolution-quality signal
 *
 * No DOM access here — safe in workers (node-testable too).
 * No WebEyeTrack/TF.js: pure geometric signals, no neural gaze model.
 */

export const EYE = {
    left: { iris: 468, inner: 133, outer: 33 },
    right: { iris: 473, inner: 362, outer: 263 }
};
export const NOSE_TIP = 1;
export const FACE_LEFT = 234;
export const FACE_RIGHT = 454;
export const FACE_TOP = 10;
export const FACE_BOTTOM = 152;
const EYE_INNER_LEFT = 133;
const EYE_INNER_RIGHT = 362;

// MediaPipe iris ring landmarks: [center, top, right, bottom, left]
const IRIS_RIGHT = [468, 470, 469, 472, 471];
const IRIS_LEFT = [473, 475, 474, 476, 477];

// Vertical comes from the eye-corner midline + width (stable landmarks),
// not the eyelid gap — the gap moves with gaze and cancels the signal.
// Center offset 0.5 keeps outputs ≈[0, 1].
export function eyeNorm(lm, eye) {
    const iris = lm[eye.iris];
    const inner = lm[eye.inner];
    const outer = lm[eye.outer];
    const ex = (iris.x - inner.x) / ((outer.x - inner.x) || 1e-6);
    const cornerMidY = (inner.y + outer.y) / 2;
    const cornerWidth = Math.abs(outer.x - inner.x) || 1e-6;
    const ey = (iris.y - cornerMidY) / cornerWidth + 0.5;
    return [ex, ey];
}

// Nose position inside the face box — rotation-driven, translation-immune.
export function headNormX(lm) {
    const faceW = Math.abs(lm[FACE_RIGHT].x - lm[FACE_LEFT].x) || 1e-6;
    const cx = (lm[FACE_RIGHT].x + lm[FACE_LEFT].x) / 2;
    return (lm[NOSE_TIP].x - cx) / faceW + 0.5;
}

export function headNormY(lm) {
    const faceH = Math.abs(lm[FACE_BOTTOM].y - lm[FACE_TOP].y) || 1e-6;
    const cy = (lm[FACE_TOP].y + lm[FACE_BOTTOM].y) / 2;
    return (lm[NOSE_TIP].y - cy) / faceH + 0.5;
}

export function faceWidth(lm) {
    return Math.hypot(
        lm[EYE_INNER_LEFT].x - lm[EYE_INNER_RIGHT].x,
        lm[EYE_INNER_LEFT].y - lm[EYE_INNER_RIGHT].y
    );
}


/**
 * Head pitch/yaw (radians) from MediaPipe's 4x4 facial transformation
 * matrix ({rows, columns, data} row-major). Euler extraction matches the
 * convention used by WebEyeTrack's getHeadVector: pitch ≈ nod up/down,
 * yaw ≈ pan left/right. The calibration fit consumes these as features,
 * so a consistent convention is all that matters.
 */
export function headAngles(faceRt) {
    if (!faceRt || !faceRt.data || faceRt.data.length < 9) return null;
    const d = faceRt.data;
    const m = (r, c) => d[r * faceRt.columns + c];
    const pitch = Math.asin(Math.max(-1, Math.min(1, -m(2, 0))));
    const yaw = Math.atan2(m(2, 1), m(2, 2));
    return { pitch, yaw };
}

/**
 * Iris diameter in frame pixels, averaged across both visible eyes and both
 * axes. With landmarks normalized [0..1], frame px dims come in via W/H.
 */
export function irisSpanPx(lm, frameW, frameH) {
    if (!lm || !frameW || !frameH) return null;
    const spans = [];
    for (const idx of [IRIS_LEFT, IRIS_RIGHT]) {
        const hSpan = Math.hypot(
            (lm[idx[2]].x - lm[idx[4]].x) * frameW,
            (lm[idx[2]].y - lm[idx[4]].y) * frameH
        );
        const vSpan = Math.hypot(
            (lm[idx[1]].x - lm[idx[3]].x) * frameW,
            (lm[idx[1]].y - lm[idx[3]].y) * frameH
        );
        if (hSpan > 0.5) spans.push(hSpan);
        if (vSpan > 0.5) spans.push(vSpan);
    }
    if (!spans.length) return null;
    return spans.reduce((a, b) => a + b, 0) / spans.length;
}

const IRIS_CM = 1.18; // mean human iris diameter
const HFOV_DEG = 70; // typical laptop/phone front camera horizontal FOV

/**
 * Camera→face distance estimate in cm from observed iris px size. Honestly
 * approximate: assumes a ~70° horizontal FOV (the common laptop/phone
 * selfie value). Used only for the calibration position coach — never for math.
 */
export function distanceCmFromIris(irisPx, frameW) {
    if (!irisPx || !frameW) return null;
    const focalPx = frameW / (2 * Math.tan((HFOV_DEG * Math.PI) / 360));
    const cm = (IRIS_CM * focalPx) / irisPx;
    if (!isFinite(cm)) return null;
    return Math.max(10, Math.min(250, cm));
}
