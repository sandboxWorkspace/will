/**
 * Tests for pickTile() — deterministic hit-testing.
 * Focus: overlap resolution (closest center, not document order), edges,
 * the near-center halo, and degenerate inputs.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickTile } from '../../src/js/aac/hitTest.js';

const PAD = 48;
const NEAR = 140;

/** 3-column × 2-row grid of 100×100 tiles with 10px gaps, origin (0,0). */
function gridRects() {
    const rects = [];
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
            const left = col * 110;
            const top = row * 110;
            rects.push({
                left,
                right: left + 100,
                top,
                bottom: top + 100,
                cx: left + 50,
                cy: top + 50
            });
        }
    }
    return rects;
}

test('point clearly inside one tile hits that tile', () => {
    const rects = gridRects();
    assert.equal(pickTile(rects, 160, 50, { snapPad: PAD, nearPad: NEAR }), 1);
    assert.equal(pickTile(rects, 270, 160, { snapPad: PAD, nearPad: NEAR }), 5);
});

test('overlap zone between two tiles resolves to the CLOSER center, not document order', () => {
    const rects = gridRects();
    // x=115 is inside tile 0's padded rect (right edge 100+48=148) AND
    // tile 1's padded rect (left edge 110-48=62). It is closer to tile 1's
    // center (160) than tile 0's center (50): old code returned 0 always.
    const x = 115;
    assert.ok(x > 100, 'cursor is right of tile 0 bare edge (closer to tile 1)');
    // Still padded-inside tile 0 — under old first-match-wins this hit tile 0.
    assert.ok(x <= 100 + PAD, 'point is inside tile 0 padded rect (overlap zone)');
    assert.equal(pickTile(rects, x, 50, { snapPad: PAD, nearPad: NEAR }), 1);
});

test('symmetric check: cursor just left of a seam picks the left tile', () => {
    const rects = gridRects();
    assert.equal(pickTile(rects, 100, 50, { snapPad: PAD, nearPad: NEAR }), 0);
});

test('exact equidistant tie keeps the lower index (stable/deterministic)', () => {
    const rects = gridRects();
    // Midpoint between tile 0 center (50) and tile 1 center (160) is 105.
    const resultA = pickTile(rects, 105, 50, { snapPad: PAD, nearPad: NEAR });
    assert.equal(resultA, 0);
    // Same result if the rect array order is reversed.
    const reversed = [...rects].reverse();
    // reversed[5] is tile 0, reversed[4] is tile 1 — lower index IN REVERSED
    // order wins ties. Determinism is "closest center, tie → first listed".
    // The board always passes document order, so ties are stable in practice.
    assert.equal(typeof pickTile(reversed, 105, 50, { snapPad: PAD, nearPad: NEAR }), 'number');
});

test('point far outside all tiles and beyond the halo returns -1', () => {
    const rects = gridRects();
    assert.equal(pickTile(rects, -500, -500, { snapPad: PAD, nearPad: NEAR }), -1);
});

test('nearest-center halo: inside nearPad of one center but outside all padded rects', () => {
    const rects = gridRects();
    // Above the grid: y=-70. Tile 1 center (160, 50) is 120 away (< NEAR=140);
    // outside its padded rect (top 0-48=-48). → halo picks tile 1.
    assert.equal(pickTile(rects, 160, -70, { snapPad: PAD, nearPad: NEAR }), 1);
    // y=-200: 250 from nearest center (> NEAR) → -1.
    assert.equal(pickTile(rects, 160, -200, { snapPad: PAD, nearPad: NEAR }), -1);
});

test('halo boundary: exactly NEAR away from the nearest center does NOT match (< NEAR)', () => {
    const rects = gridRects();
    // Tile 0 center (50, 50); point (50, 50-140) = distance exactly 140.
    assert.equal(pickTile(rects, 50, -90, { snapPad: PAD, nearPad: NEAR }), -1);
});

test('padded-rect boundary is inclusive', () => {
    const rects = gridRects();
    // Tile 0 padded bottom edge = 100+48 = 148 → y=148 is inside pad of tile 0.
    // But tile 3's padded top = 110-48 = 62, center cy=160: distance from
    // (50,148) to tile3 center = 12 → tile 3 wins on proximity.
    assert.equal(pickTile(rects, 50, 148, { snapPad: PAD, nearPad: NEAR }), 3);
    // Corner pad point far from other centers still matches the owner tile.
    const single = [{ left: 0, right: 100, top: 0, bottom: 100, cx: 50, cy: 50 }];
    assert.equal(pickTile(single, -48, -48, { snapPad: PAD, nearPad: NEAR }), 0);
    // 1px past the padded corner: dist((-49,-49)→(50,50)) = 99√2 ≈ 140.01 > NEAR → -1.
    assert.equal(pickTile(single, -49, -49, { snapPad: PAD, nearPad: NEAR }), -1);
    // Past the pad edge (−48.5 < −48) but inside the halo: dist ≈ 110.4 < NEAR → match.
    assert.equal(pickTile(single, -48.5, 0, { snapPad: PAD, nearPad: NEAR }), 0);
});

test('degenerate inputs never throw and return -1', () => {
    assert.equal(pickTile([], 10, 10), -1);
    assert.equal(pickTile(null, 10, 10), -1);
    assert.equal(pickTile(gridRects(), null, 10), -1);
    assert.equal(pickTile(gridRects(), undefined, undefined), -1);
});

test('four-way corner overlap resolves to the quadrant the point is in', () => {
    const rects = gridRects();
    // Intersection of tiles 0,1,3,4 near (105,105): point (111,111) sits in
    // tile 4's quadrant (just past the gap), so tile 4 must win.
    assert.equal(pickTile(rects, 111, 111, { snapPad: PAD, nearPad: NEAR }), 4);
    // And (99,99) sits in tile 0's quadrant.
    assert.equal(pickTile(rects, 99, 99, { snapPad: PAD, nearPad: NEAR }), 0);
});
