/**
 * Tests for createSupervisor() — worker in-flight bookkeeping + metrics.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupervisor } from '../../src/js/aac/workerSupervisor.js';

const CFG = { stallMs: 2000, maxStalls: 3 };

test('happy path: send → result completes, latency recorded, fps counted', () => {
    const sup = createSupervisor(CFG);
    sup.noteSent(1000, 1);
    assert.equal(sup.inFlight(), true);
    const r = sup.noteResult(1033, 1); // 33ms inference
    assert.equal(r, 'accepted');
    assert.equal(sup.inFlight(), false);
    const stats = sup.intervalStats(2000); // 1s interval, 1 completion
    assert.equal(stats.fps, 1);
    assert.equal(stats.avgMs, 33);
    assert.equal(stats.samples, 1);
});

test('a stale sequence result is dropped and does not clear the live slot', () => {
    const sup = createSupervisor(CFG);
    sup.noteSent(1000, 5);
    const r = sup.noteResult(1050, 3); // from an old frame → stale
    assert.equal(r, 'stale');
    assert.equal(sup.inFlight(), true, 'live in-flight slot untouched');
    assert.equal(sup.cumulative().staleDrops, 1);
    // The matching result still completes normally afterward
    assert.equal(sup.noteResult(1080, 5), 'accepted');
});

test('a result with nothing in flight is unexpected and counted', () => {
    const sup = createSupervisor(CFG);
    assert.equal(sup.noteResult(1000, 1), 'unexpected');
    assert.equal(sup.cumulative().staleDrops, 1);
});

test('worker error CLEARS the in-flight slot (the wedge fix) and is counted', () => {
    const sup = createSupervisor(CFG);
    sup.noteSent(1000, 1);
    const wasInFlight = sup.noteError();
    assert.equal(wasInFlight, true);
    assert.equal(sup.inFlight(), false, 'next frame may proceed — no wedge');
    assert.equal(sup.cumulative().errors, 1);
    // And the pipeline flows on the very next send
    sup.noteSent(1100, 2);
    assert.equal(sup.noteResult(1133, 2), 'accepted');
});

test('watchdog: stall under stallMs is silent; past stallMs frees the slot', () => {
    const sup = createSupervisor(CFG);
    sup.noteSent(1000, 1);
    assert.equal(sup.tick(2999), null, 'no stall before the limit');
    const r = sup.tick(3001); // 2001ms in flight
    assert.equal(r, 'stall');
    assert.equal(sup.inFlight(), false, 'stall frees the slot for a retry');
    assert.equal(sup.cumulative().stalls, 1);
});

test('watchdog escalates to degrade after maxStalls consecutive stalls', () => {
    const sup = createSupervisor({ stallMs: 100, maxStalls: 3 });
    let result = null;
    for (let i = 0; i < 3; i++) {
        sup.noteSent(i * 1000, i + 1);
        result = sup.tick(i * 1000 + 500); // exceed 100ms stall each time
    }
    assert.equal(result, 'degrade');
    assert.equal(sup.cumulative().stalls, 3);
});

test('stall: a late result for the stalled frame is now stale and harmless', () => {
    const sup = createSupervisor(CFG);
    sup.noteSent(1000, 9);
    sup.tick(4000); // stall → slot freed
    assert.equal(sup.noteResult(4100, 9), 'unexpected', 'the stale frame result is ignored');
    // New frames keep working
    sup.noteSent(4200, 10);
    assert.equal(sup.noteResult(4233, 10), 'accepted');
});

test('dropped-frame backpressure counts per interval and resets', () => {
    const sup = createSupervisor(CFG);
    sup.noteSent(1000, 1);
    sup.noteDrop();
    sup.noteDrop();
    sup.noteDrop();
    let stats = sup.intervalStats(2000);
    assert.equal(stats.drops, 3);
    stats = sup.intervalStats(3000);
    assert.equal(stats.drops, 0, 'interval counter reset');
});

test('latency ring reports avg/p50/p95 by nearest-rank', () => {
    const sup = createSupervisor(CFG);
    for (let i = 1; i <= 100; i++) {
        sup.noteSent(i * 100, i);
        sup.noteResult(i * 100 + i, i); // latency = i ms
    }
    const stats = sup.intervalStats(100 * 100 + 1);
    assert.equal(stats.avgMs, 51); // round(50.5)
    assert.equal(stats.p50Ms, 50);
    assert.equal(stats.p95Ms, 95);
});

test('fallback completions contribute latency + fps identically', () => {
    const sup = createSupervisor(CFG);
    for (let i = 1; i <= 10; i++) sup.noteCompletion(i * 100, 40);
    const stats = sup.intervalStats(1100); // 1000ms interval since first activity
    assert.equal(stats.fps, 10);
    assert.equal(stats.avgMs, 40);
});

test('empty interval reports null latency stats without NaN', () => {
    const sup = createSupervisor(CFG);
    const stats = sup.intervalStats(1000);
    assert.equal(stats.fps, 0);
    assert.equal(stats.avgMs, null);
    assert.equal(stats.p50Ms, null);
    assert.equal(stats.p95Ms, null);
});

test('forceIdle frees the in-flight slot without counting anything', () => {
    const sup = createSupervisor(CFG);
    sup.noteSent(1000, 7);
    sup.forceIdle();
    assert.equal(sup.inFlight(), false);
    assert.equal(sup.tick(9999), null);
    assert.deepEqual(sup.cumulative(), { errors: 0, stalls: 0, staleDrops: 0 });
    // A later result for the orphaned slot is unexpected (engine guards too)
    assert.equal(sup.noteResult(10000, 7), 'unexpected');
});
