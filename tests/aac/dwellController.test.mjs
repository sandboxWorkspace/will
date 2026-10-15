/**
 * Tests for createDwellController() — the dwell/hover state machine.
 * Scripted fake-clock scenarios; no DOM, no real timers.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDwellController } from '../../src/js/aac/dwellController.js';

// Phase-1 default timings under test (mirrors aacBoard.js constants)
const CFG = { hysMs: 120, graceMs: 400, reacqMs: 400, exitMs: 250, getDwellMs: () => 800 };

/** One controller + one monotonically increasing clock across all feeds. */
function makeDriver(cfg = CFG) {
    const ctl = createDwellController(cfg);
    let t = 0;
    return {
        ctl,
        /** script: array of [dtMs, candidate, valid]; returns outputs */
        feed(script) {
            return script.map(([dt, c, v]) => {
                t += dt;
                return this.ctl.update(t, c, v);
            });
        },
        /** Steady valid hover on `idx` for `dur` ms in `step` ms samples */
        steady: (idx, dur, step = 33) =>
            Array.from({ length: Math.ceil(dur / step) }, () => [step, idx, true]),
        /** Steady INVALID samples for `dur` ms */
        dropout: (dur, step = 50) =>
            Array.from({ length: Math.ceil(dur / step) }, () => [step, -1, false])
    };
}

const firstActivate = (outs) => outs.find((o) => o.activate >= 0);

test('basic dwell activates once when the dwell time elapses', () => {
    const d = makeDriver();
    const outs = d.feed([...d.steady(2, 150), ...d.steady(2, 900)]);
    const hit = firstActivate(outs);
    assert.ok(hit, 'activation should fire');
    assert.equal(hit.activate, 2);
    // ~120ms hysteresis + 800ms dwell ≈ 920ms (± 2 sample periods)
    const tApprox = (outs.indexOf(hit) + 1) * 33;
    assert.ok(tApprox >= 900 && tApprox <= 1050, `activation timing ~${tApprox}ms`);
});

test('no repeat activation while gaze stays on the same tile', () => {
    const d = makeDriver();
    d.feed([...d.steady(1, 150), ...d.steady(1, 900)]); // activate tile 1
    const more = d.feed([...d.steady(1, 3000)]); // keep staring
    assert.ok(!firstActivate(more), 'no refire on the blocked tile');
    assert.ok(more.every((o) => o.dwellIdx === -1), 'no dwell restarts while blocked');
    assert.equal(d.ctl.getState().blocked, 1);
});

test('a brief gaze flit does not re-arm: hover hysteresis rejects sub-hysMs changes', () => {
    const d = makeDriver();
    d.feed([...d.steady(3, 150), ...d.steady(3, 900)]); // activate tile 3
    const outs = d.feed([
        [60, 4, true],           // 60ms glance at tile 4 (< hys 120)
        ...d.steady(3, 1200)     // long stare back on blocked tile 3
    ]);
    assert.ok(!firstActivate(outs), 'no activation after brief flit');
    assert.equal(d.ctl.getState().blocked, 3, 'still blocked on tile 3');
    assert.equal(d.ctl.getState().hover, 3, 'hover never left tile 3 (flit rejected)');
});

test('stable exit to another tile re-arms, then a new dwell can complete', () => {
    const d = makeDriver();
    d.feed([...d.steady(0, 150), ...d.steady(0, 900)]); // activate tile 0
    const move = d.feed([...d.steady(1, 150)]); // firm move, passes hysteresis
    assert.equal(move.at(-1).hover, 1, 'hover moved to tile 1');
    d.feed([...d.steady(1, d.ctl ? 300 : 300)]); // sit out the 250ms exit window
    assert.equal(d.ctl.getState().blocked, -1, 're-armed after stable exit');
    const outs = d.feed([...d.steady(1, 900)]);
    const hit = firstActivate(outs);
    assert.ok(hit && hit.activate === 1, 'tile 1 activates after re-arm');
});

test('seam oscillation (sub-hysteresis flips) never switches hover, dwell completes', () => {
    const d = makeDriver();
    const script = [...d.steady(5, 150)]; // hover tile 5
    for (let i = 0; i < 25; i++) script.push([40, i % 2 === 0 ? 5 : 6, true]); // 40ms flips
    const outs = d.feed(script);
    const hits = outs.filter((o) => o.activate >= 0);
    assert.equal(hits.length, 1, 'dwell completed exactly once through seam jitter');
    assert.equal(hits[0].activate, 5);
    assert.ok(outs.every((o) => o.hover !== 6), 'hover never flipped to tile 6');
});

test('short dropout pauses dwell (no activation while invalid, clock frozen)', () => {
    const d = makeDriver();
    const outs = d.feed([
        ...d.steady(2, 150),   // hover
        ...d.steady(2, 600),   // 600ms of the 800ms dwell
        [200, -1, false],      // 200ms dropout (< grace 400)
        [33, 2, true]          // resume on the same tile
    ]);
    assert.ok(!firstActivate(outs), 'no premature activation: invalid time did not count');
    const paused = outs.find((o) => o.dwellPaused);
    assert.ok(paused, 'dwell reported paused during dropout');
    assert.ok(paused.dwellFrac > 0.5, 'paused dwell kept its progress');
    const rest = d.feed([...d.steady(2, 400)]);
    const hit = firstActivate(rest);
    assert.ok(hit && hit.activate === 2, 'dwell completes after valid time resumes');
});

test('long dropout loses tracking; reacquisition gate delays selection resume', () => {
    const d = makeDriver();
    const outs = d.feed([
        ...d.steady(4, 150),
        ...d.steady(4, 600),
        ...d.dropout(600)      // 600ms continuous invalid > grace 400 → lost
    ]);
    const last = outs.at(-1);
    assert.equal(last.lost, true, 'entered lost state');
    assert.equal(last.hover, -1, 'hover cleared');
    assert.ok(outs.some((o) => o.dwellCanceled), 'dwell canceled on long dropout');
    const gate1 = d.feed([...d.steady(4, 200)]); // < reacq 400
    assert.ok(gate1.every((o) => !o.selectionEnabled), 'selection disabled during reacquire');
    assert.ok(gate1.every((o) => o.dwellIdx === -1), 'no dwell during reacquire');
    const gate2 = d.feed([...d.steady(4, 300)]); // crosses the reacq threshold
    assert.equal(gate2.at(-1).selectionEnabled, true, 're-enabled after stable reacquire');
    const outs2 = d.feed([...d.steady(4, 900)]);
    assert.ok(firstActivate(outs2), 'dwell works after reacquisition');
});

test('an invalid frame inside the reacquire window restarts the window', () => {
    const d = makeDriver();
    d.feed([...d.steady(4, 150), ...d.dropout(600)]); // lost
    d.feed([...d.steady(4, 300)]); // 300ms into the 400ms window
    const outs = d.feed([[50, -1, false], ...d.steady(4, 300)]); // interruption + 300ms
    assert.ok(outs.every((o) => !o.selectionEnabled), 'reacquire window restarted');
    const final = d.feed([...d.steady(4, 200)]);
    assert.equal(final.at(-1).selectionEnabled, true);
});

test('silence longer than the grace window counts as a long dropout', () => {
    const d = makeDriver();
    d.feed([...d.steady(0, 150), ...d.steady(0, 300)]);
    const outs = d.feed([[2000, 0, true]]); // no samples for 2s, then one valid
    assert.equal(outs[0].lost, true, 'silence treated as long dropout');
    assert.equal(outs[0].selectionEnabled, false, 'reacquire gate applies');
});

test('external activation (touch/pad) blocks the same tile until stable exit', () => {
    const d = makeDriver();
    d.feed([...d.steady(7, 150)]);
    d.ctl.noteExternalActivate(7);
    const outs = d.feed([...d.steady(7, 2000)]);
    assert.ok(outs.every((o) => o.activate !== 7 && o.dwellIdx === -1), 'blocked after tap');
    assert.equal(d.ctl.getState().blocked, 7);
});

test('hover moving to another tile before completion cancels the old dwell', () => {
    const d = makeDriver();
    const outs = d.feed([
        ...d.steady(0, 150),
        ...d.steady(0, 500),  // partial dwell on 0
        ...d.steady(1, 200)   // firm move to 1 (passes hysteresis)
    ]);
    const cancel = outs.find((o) => o.dwellCanceled && o.hoverChanged && o.hoverFrom === 0);
    assert.ok(cancel, 'dwell canceled exactly when hover moved');
    d.feed([...d.steady(1, CFG.exitMs + 100)]); // sit out exit window (no block set — dwell already on 1)
    const outs2 = d.feed([...d.steady(1, 900)]);
    const hit = firstActivate(outs2);
    assert.ok(hit && hit.activate === 1, 'fresh dwell completes on tile 1');
});

test('dwell timing honors live getDwellMs() changes', () => {
    let dwellMs = 1500;
    const d = makeDriver({ ...CFG, getDwellMs: () => dwellMs });
    const outs = d.feed([...d.steady(2, 150), ...d.steady(2, 1000)]);
    assert.ok(!firstActivate(outs), '1000ms is not enough at 1500ms dwell');
    dwellMs = 800;
    const out2 = d.feed([...d.steady(2, 400)]); // 1000 banked + 400 > 800
    assert.ok(firstActivate(out2), 'activates once the live dwell threshold lowers');
});

test('reset() returns to a clean slate', () => {
    const d = makeDriver();
    d.feed([...d.steady(3, 150), ...d.steady(3, 900)]);
    d.ctl.reset();
    const st = d.ctl.getState();
    assert.equal(st.hover, -1);
    assert.equal(st.blocked, -1);
    assert.equal(st.dwellIdx, -1);
    assert.equal(st.lost, false);
});
