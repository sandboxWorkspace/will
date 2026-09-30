/**
 * Scan Match layout — paint-time, per-device card rendering.
 *
 * Pure module (no Firebase). Symbol SETS are game state (seed-synced
 * between devices); sizes and positions are a rendering concern computed
 * from the measured screen box at paint time — each device renders its
 * own optimal layout for its own screen.
 *
 * Determinism: identical (seed, box, profile) → identical output. The
 * game derives the seed from (pin, cardIdx), so resize/rotation re-renders
 * the same arrangement scaled to the new box.
 *
 * Units: generators work in measured px (VISUAL glyph diameters =
 * font-size × GLYPH_METRIC); output positions are % of the box (CSS
 * left/top), sizes are font px (CSS font-size).
 */

// ── Seeded RNG (Mulberry32) ─────────────────────────────────────────────
export class SeededRNG {
  constructor(seed) {
    this.s = seed | 0;
  }
  /** Returns a float in [0, 1). */
  next() {
    this.s |= 0;
    this.s = (this.s + 0x6D2B79F5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Fisher-Yates shuffle (in-place). */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ── Difficulty profiles (keyed by symbols-per-card N) ───────────────────
// N=7 does not exist: no projective plane of order 6 (Euler's 36 officers).
//   layout   'grid' | 'ring' | 'scatter'
//   base     glyph FONT diameter floor (% of the box's smaller dimension)
//   variance 0..1 tier depth: sizes draw from Spot It-like tiers
//            [±0.5, ±0.2] × variance (seeded-shuffled per card)
//   rotation max glyph tilt (±deg)
// Auto-grow: sizes scale up to 2× (SCALE_CAP) when the box allows.
// Tune via toolScanMatchPreview.html, then paste final values here.
export const DIFFICULTY_PROFILES = {
  3:  { layout: 'grid',    base: 30, variance: 0.45, rotation: 6  },
  4:  { layout: 'grid',    base: 26, variance: 0.45, rotation: 10 },
  5:  { layout: 'ring',    base: 22, variance: 0.4,  rotation: 15 },
  6:  { layout: 'scatter', base: 18, variance: 0.5,  rotation: 20 },
  8:  { layout: 'scatter', base: 18, variance: 0.6,  rotation: 25 },
  9:  { layout: 'scatter', base: 17, variance: 0.6,  rotation: 28 },
  10: { layout: 'scatter', base: 16, variance: 0.6,  rotation: 30 },
};

const MAX_ASPECT = 1.6;  // very wide screens: layout in a centered sub-box
const SCALE_CAP = 2.0;    // auto-grow ceiling (2× profile floor)
const SCALES = [2.0, 1.85, 1.7, 1.55, 1.4, 1.25, 1.1, 1.0, 0.9, 0.8, 0.7]; // descend until feasible

// Emoji glyphs paint ~30% larger than their CSS font-size box (Apple/Noto
// overhang + rotation). All layout geometry uses this VISUAL diameter so
// nothing ever touches the card border or rounded corners.
const GLYPH_METRIC = 1.3;

// Size tiers (Dobble/Spot It look): distinct big/medium/small per card.
const TIERS = [0.5, 0.2, -0.2, -0.5];  // × variance

// One-slot paint cache — identical (N, box, seed, profile) renders instantly
// on resize/toolbar re-layout instead of re-optimizing.
let _cacheKey = null, _cacheVal = null;

/**
 * Compute one card's render layout for a measured box.
 * Returns { sizes: px[], positions: {x%, y%, r}[] }.
 */
export function computeCardLayout(N, box, rng, profile = DIFFICULTY_PROFILES[N]) {
  const cacheKey = N + '|' + box.w + 'x' + box.h + '|' + (rng.s | 0) + '|' +
    profile.layout + ',' + profile.base + ',' + profile.variance + ',' + profile.rotation;
  if (cacheKey === _cacheKey) return _cacheVal;

  // Wide clamp: work in a centered sub-box so desktop cards stay phone-shaped
  let w = box.w, h = box.h, ox = 0;
  if (w > h * MAX_ASPECT) { w = h * MAX_ASPECT; ox = (box.w - w) / 2; }
  const minDim = Math.min(w, h);
  const GAP = 0.02 * minDim + 2;          // required visible gap between glyphs (px)

  // Glyph floor FONT sizes (px): seeded-shuffled Spot It tiers × variance
  const tiers = rng.shuffle(Array.from({ length: N }, (_, i) => TIERS[i % TIERS.length]));
  const floors = tiers.map(t =>
    (profile.base / 100) * minDim * (1 + t * profile.variance));

  // Auto-grow: largest scale whose layout keeps the min-gap guarantee.
  // Generators + minGap work in VISUAL diameters (font × GLYPH_METRIC).
  const gen = LAYOUTS[profile.layout] || LAYOUTS.scatter;
  const tryScale = (s) => {
    const font = floors.map(d => d * s);
    const vis = font.map(d => d * GLYPH_METRIC);
    if (Math.max(...vis) > minDim * 0.98) return null;    // can't fit on-card
    const cand = gen(N, { w, h }, rng, vis, GAP);
    return (minGap(cand, vis) >= GAP && edgeGap(cand, vis, { w, h }) >= 1)
      ? { font, cand } : false;
  };

  let accepted = null, acceptedScale = 0, lastRejected = 0;
  for (const s of SCALES) {
    const res = tryScale(s);
    if (res === null) continue;            // scale physically impossible — skip
    if (res) { accepted = res; acceptedScale = s; break; }
    lastRejected = s;                      // tested but too tight
  }
  if (accepted && lastRejected > acceptedScale) {
    // Binary-refine between the accepted rung and the rejected one — the
    // coarse ladder alone can leave 10%+ of growth on the table.
    let lo = acceptedScale, hi = lastRejected;
    for (let i = 0; i < 4; i++) {
      const mid = (lo + hi) / 2;
      const res = tryScale(mid);
      if (res) { accepted = res; lo = mid; }
      else hi = mid;
    }
  }

  let sizes, pts;
  if (accepted) {
    sizes = accepted.font; pts = accepted.cand;
  } else {
    // Safety net (tiny landscape boxes): uniform grid, sizes clamped so
    // the cell-fit gap covers GAP plus the 2px jitter allowance.
    const cols = N <= 4 ? 2 : Math.max(1, Math.round(Math.sqrt(N * (w / h))));
    const rows = Math.ceil(N / cols);
    const cw = (w * 0.94) / cols, ch = (h * 0.94) / rows;
    const sFit = Math.max(0.3, Math.min(SCALE_CAP,
      (Math.min(cw, ch) - GAP - 2) / (Math.max(...floors) * GLYPH_METRIC)));
    sizes = floors.map(d => d * sFit);
    pts = LAYOUTS.grid(N, { w, h }, rng, sizes.map(d => d * GLYPH_METRIC), GAP);
  }

  const result = {
    sizes,
    positions: pts.map(p => ({
      x: ((ox + p.x) / box.w) * 100,
      y: (p.y / box.h) * 100,
      r: (rng.next() - 0.5) * profile.rotation
    }))
  };
  _cacheKey = cacheKey; _cacheVal = result;
  return result;
}

/**
 * Paint emojis into a card container using a computed layout.
 * Future Twemoji swap point (F6): replace the `textContent` line only.
 */
export function paintCard(container, emojis, layout) {
  container.innerHTML = '';
  emojis.forEach((emoji, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.style.fontSize = layout.sizes[i].toFixed(1) + 'px';
    cell.style.left = layout.positions[i].x + '%';
    cell.style.top = layout.positions[i].y + '%';
    cell.style.transform = `translate(-50%, -50%) rotate(${layout.positions[i].r || 0}deg)`;
    cell.style.setProperty('--rot', (layout.positions[i].r || 0) + 'deg'); // for match-pop keyframes
    cell.textContent = emoji;
    container.appendChild(cell);
  });
}

// ── Layout algorithms (px space, aspect-aware; `sizes` = VISUAL diameters) ─

/** grid: jittered shuffled grid — provable non-overlap for any N/box.
 * Jitter is bounded so adjacent glyphs keep at least `gap` between them. */
function gridPx(N, box, rng, sizes, gap = 2) {
  const cols = N <= 4 ? 2 : Math.max(1, Math.round(Math.sqrt(N * (box.w / box.h))));
  const rows = Math.ceil(N / cols);
  const padX = box.w * 0.03, padY = box.h * 0.03;
  const cw = (box.w - 2 * padX) / cols, ch = (box.h - 2 * padY) / rows;
  const cells = rng.shuffle(Array.from({ length: rows * cols }, (_, i) => i)).slice(0, N);
  return cells.map((cellIdx, i) => {
    const row = Math.floor(cellIdx / cols), col = cellIdx % cols;
    const jx = Math.max(0, (cw - sizes[i] - gap) / 2);
    const jy = Math.max(0, (ch - sizes[i] - gap) / 2);
    return {
      x: padX + (col + 0.5) * cw + (rng.next() - 0.5) * 2 * jx,
      y: padY + (row + 0.5) * ch + (rng.next() - 0.5) * 2 * jy
    };
  });
}

/** ring: center glyph + banded ellipse when width allows; all-N ellipse otherwise. */
function ringPx(N, box, rng, sizes) {
  const cx = box.w / 2, cy = box.h / 2;
  const dMax = Math.max(...sizes);
  const rx = Math.max(2, (box.w - dMax) / 2 - box.w * 0.02);
  const ry = Math.max(2, (box.h - dMax) / 2 - box.h * 0.02);
  const rMin = Math.min(rx, ry);
  const start = rng.next() * Math.PI * 2;

  // Center glyph only if the box is wide enough for center-to-ring clearance
  const clear = sizes[0] / 2 + dMax / 2 + 4;
  if (clear <= rMin * 0.92) {
    const minN = Math.min(Math.max(clear / rMin, 0.3), 0.9);
    const BANDS = [minN, (minN + 1) / 2, 1];
    const bandOrder = rng.shuffle(Array.from({ length: N - 1 }, (_, i) => BANDS[i % 3]));
    const pts = [{ x: cx, y: cy }];
    for (let i = 1; i < N; i++) {
      const a = start + ((i - 1) / (N - 1)) * Math.PI * 2;
      const r = bandOrder[i - 1] + (rng.next() - 0.5) * 0.04;
      pts.push({ x: cx + Math.cos(a) * r * rx, y: cy + Math.sin(a) * r * ry });
    }
    return pts;
  }

  // Narrow box / big glyphs: every glyph on a single ellipse (classic ring)
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = start + (i / N) * Math.PI * 2;
    const r = 1 + (rng.next() - 0.5) * 0.06;
    pts.push({ x: cx + Math.cos(a) * r * rx, y: cy + Math.sin(a) * r * ry });
  }
  return pts;
}

/** scatter: farthest-point insertion + annealed repulsion polish — finds
 * near-optimal maximin layouts so dense cards (N=8-10) grow to their true
 * ceiling instead of leaving free space. */
function scatterPx(N, box, rng, sizes, gap = 2) {
  let best = null, bestScore = -Infinity;

  // 3 seeded farthest-point insertion builds, each polished
  for (let r = 0; r < 3; r++) {
    const cand = polish(insertFarthest(N, box, rng, sizes), sizes, box, gap);
    const score = minGap(cand, sizes);
    if (score > bestScore) { bestScore = score; best = cand; }
  }

  // Slimmed best-of-60 random pool, polished once
  let randBest = null, randScore = -Infinity;
  for (let t = 0; t < 60; t++) {
    const cand = [];
    for (let i = 0; i < N; i++) {
      const mx = sizes[i] / 2 + box.w * 0.02;   // 2% edge inset — glyph ink
      const my = sizes[i] / 2 + box.h * 0.02;   // stays clear of border/corners
      cand.push({
        x: mx + rng.next() * Math.max(1, box.w - 2 * mx),
        y: my + rng.next() * Math.max(1, box.h - 2 * my)
      });
    }
    const score = minGap(cand, sizes);
    if (score > randScore) { randScore = score; randBest = cand; }
  }
  const polished = polish(randBest, sizes, box, gap);
  const pScore = minGap(polished, sizes);
  if (pScore > bestScore) { bestScore = pScore; best = polished; }

  return best;
}

/** Farthest-point insertion: place glyphs largest-first, each at the seeded
 * candidate position maximizing distance to everything already placed. */
function insertFarthest(N, box, rng, sizes) {
  const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => sizes[b] - sizes[a]);
  const placed = [];   // { x, y, s }
  const pts = Array(N);
  for (const i of order) {
    const mx = sizes[i] / 2 + box.w * 0.02, my = sizes[i] / 2 + box.h * 0.02;
    let bestPos = null, bestScore = -Infinity;
    for (let t = 0; t < 150; t++) {
      const p = placed.length === 0
        ? { x: box.w / 2 + (rng.next() - 0.5) * box.w * 0.3,
            y: box.h / 2 + (rng.next() - 0.5) * box.h * 0.3 }
        : { x: mx + rng.next() * Math.max(1, box.w - 2 * mx),
            y: my + rng.next() * Math.max(1, box.h - 2 * my) };
      let score = Math.min(p.x - sizes[i] / 2, box.w - p.x - sizes[i] / 2,
                           p.y - sizes[i] / 2, box.h - p.y - sizes[i] / 2);
      for (const q of placed) {
        score = Math.min(score, Math.hypot(p.x - q.x, p.y - q.y) - (sizes[i] + q.s) / 2);
      }
      if (score > bestScore) { bestScore = score; bestPos = p; }
    }
    pts[i] = bestPos;
    placed.push({ x: bestPos.x, y: bestPos.y, s: sizes[i] });
  }
  return pts;
}

/** Repulsion relaxation: pushes under-spaced pairs apart, keeps glyphs on-card.
 * Targets the acceptance gap (not merely non-overlap); damped pushes anneal
 * over iterations so the relaxation converges instead of oscillating. */
function polish(pts, sizes, box, gap = 2, iters = 160) {
  const p = pts.map(q => ({ ...q }));
  for (let t = 0; t < iters; t++) {
    const damp = 1 - t / iters;
    let moved = false;
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const dx = p[j].x - p[i].x, dy = p[j].y - p[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const need = (sizes[i] + sizes[j]) / 2 + gap;  // target center distance
        if (dist >= need) continue;
        const push = (need - dist) / 2 * damp;
        const ux = dx / dist, uy = dy / dist;
        p[i].x -= ux * push; p[i].y -= uy * push;
        p[j].x += ux * push; p[j].y += uy * push;
        moved = true;
      }
    }
    for (let i = 0; i < p.length; i++) {
      const mx = sizes[i] / 2 + box.w * 0.01;
      const my = sizes[i] / 2 + box.h * 0.01;
      const nx = Math.min(Math.max(p[i].x, mx), box.w - mx);
      const ny = Math.min(Math.max(p[i].y, my), box.h - my);
      if (nx !== p[i].x || ny !== p[i].y) { p[i].x = nx; p[i].y = ny; moved = true; }
    }
    if (!moved) break;
  }
  return p;
}

/** Minimum visible gap (px) between any two glyph boxes; negative = overlap. */
function minGap(pts, sizes) {
  let m = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) - (sizes[i] + sizes[j]) / 2;
      if (d < m) m = d;
    }
  }
  return m;
}

/** Min distance (px) from any glyph's visual box to the card edges. */
function edgeGap(pts, sizes, box) {
  let m = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const r = sizes[i] / 2;
    m = Math.min(m,
      pts[i].x - r, box.w - pts[i].x - r,
      pts[i].y - r, box.h - pts[i].y - r);
  }
  return m;
}

const LAYOUTS = { grid: gridPx, ring: ringPx, scatter: scatterPx };
