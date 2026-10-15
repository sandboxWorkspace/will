/**
 * Tile hit-testing for Speak Board gaze cursor — pure geometry, no DOM.
 *
 * Purpose:  map a cursor point (viewport px) to a tile index
 *           deterministically. Replaces the old first-match-wins scan in
 *           aacBoard.js, which let overlapping SNAP_PAD rects resolve to
 *           whichever tile came first in document order (top-left bias at
 *           every shared edge — pads are 48px, gaps are 8-14px).
 * Consumes: plain rect records { left, right, top, bottom, cx, cy } —
 *           callers build them from getBoundingClientRect() so this module
 *           stays Node-testable.
 * Emits:    a tile index, or -1 for "no target".
 *
 * Rules (deterministic, order-independent):
 *   1. Candidates = tiles whose SNAP_PAD-padded rect contains the point.
 *   2. Among candidates (there may be several in the pad-overlap zone at
 *      tile seams), the winner is the closest tile CENTER — a seam point
 *      always resolves to the nearer tile, never to document order.
 *      Ties (exact equidistance) keep the lower index for stability.
 *   3. If no padded rect contains the point, fall back to the nearest
 *      center when it is within NEAR_PAD px (keeps the dwell bar steady
 *      when the cursor is just outside a tile at board edges).
 *   4. Otherwise -1.
 */

/**
 * @param {Array<{left:number,right:number,top:number,bottom:number,cx:number,cy:number}>} rects
 * @param {number} x  viewport px
 * @param {number} y  viewport px
 * @param {{snapPad?: number, nearPad?: number}} [opts]
 * @returns {number} tile index or -1
 */
export function pickTile(rects, x, y, { snapPad = 48, nearPad = 140 } = {}) {
    if (!Array.isArray(rects) || rects.length === 0) return -1;
    if (x == null || y == null) return -1;

    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (!r) continue;
        const inside =
            x >= r.left - snapPad &&
            x <= r.right + snapPad &&
            y >= r.top - snapPad &&
            y <= r.bottom + snapPad;
        const d = Math.hypot(x - r.cx, y - r.cy);
        if (inside) {
            // Strictly-less keeps the lower index on an exact tie.
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
    }
    if (best >= 0) return best;

    // Nearest-center halo outside the padded rects.
    let halo = -1;
    let haloD = Infinity;
    for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (!r) continue;
        const d = Math.hypot(x - r.cx, y - r.cy);
        if (d < haloD) {
            haloD = d;
            halo = i;
        }
    }
    if (halo >= 0 && haloD < nearPad) return halo;
    return -1;
}

/** Build the rect record for one DOM element. Called per sample by the board. */
export function recordOf(el) {
    const r = el.getBoundingClientRect();
    return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2
    };
}
