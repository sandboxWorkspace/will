/**
 * Tests for remotePairing.js — remote-clicker room/URL helpers.
 * Pure logic only (no DOM, no Firebase); the room transport itself is
 * exercised manually between two devices.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJoinUrl, genPin, isValidPin, parseJoinPin, roomPath,
  shouldAdvance, withTimeout,
} from '../src/js/remotePairing.js';

const CLICKER = 'https://sandboxworkspace.github.io/will/toolColorSwitcherClicker.html';

test('pin is 4 digits in 1000-9999', () => {
  for (let i = 0; i < 200; i++) {
    const pin = genPin();
    assert.match(pin, /^\d{4}$/);
    assert.ok(Number(pin) >= 1000 && Number(pin) <= 9999);
  }
});

test('isValidPin accepts only 4 digits', () => {
  assert.equal(isValidPin('4821'), true);
  assert.equal(isValidPin('0000'), true);
  for (const bad of ['123', '12345', '12a4', '', null, 4821, ' 4821']) {
    assert.equal(isValidPin(bad), false, String(bad));
  }
});

test('buildJoinUrl appends the join parameter', () => {
  assert.equal(buildJoinUrl(CLICKER, '4821'), `${CLICKER}?join=4821`);
  assert.equal(buildJoinUrl(CLICKER, '0000'), `${CLICKER}?join=0000`);
  assert.throws(() => buildJoinUrl(CLICKER, '12'), /Invalid PIN/);
});

test('buildJoinUrl preserves an existing query', () => {
  assert.equal(
    buildJoinUrl(`${CLICKER}?x=1`, '4821'),
    `${CLICKER}?x=1&join=4821`
  );
});

test('parseJoinPin reads full URLs, search, hash, and bare pins', () => {
  assert.equal(parseJoinPin(`${CLICKER}?join=4821`), '4821');
  assert.equal(parseJoinPin('?join=4821'), '4821');
  assert.equal(parseJoinPin('#join=4821'), '4821');
  assert.equal(parseJoinPin('join=4821'), '4821');
  assert.equal(parseJoinPin('4821'), '4821');
  assert.equal(parseJoinPin(`${CLICKER}?x=1&join=0000#frag`), '0000');
});

test('parseJoinPin rejects missing or malformed pins', () => {
  for (const bad of [
    '', '   ', null, undefined, CLICKER, `${CLICKER}?join=12`,
    `${CLICKER}?join=12345`, `${CLICKER}?join=abcd`, 'not a url',
  ]) {
    assert.equal(parseJoinPin(bad), null, String(bad));
  }
});

test('roomPath validates before building the path', () => {
  assert.equal(roomPath('4821'), 'colorSwitcherRemote/4821');
  assert.throws(() => roomPath('12'), /Invalid PIN/);
  assert.throws(() => roomPath('../oops'), /Invalid PIN/);
});

test('shouldAdvance fires only on an increasing tap counter', () => {
  assert.equal(shouldAdvance(0, 0), false);
  assert.equal(shouldAdvance(0, 1), true);
  assert.equal(shouldAdvance(3, 4), true);
  assert.equal(shouldAdvance(4, 4), false);
  assert.equal(shouldAdvance(4, 3), false);
  assert.equal(shouldAdvance(null, null), false);
  assert.equal(shouldAdvance(undefined, 1), true);
  assert.equal(shouldAdvance(0, undefined), false);
});

test('withTimeout resolves fast promises', async () => {
  assert.equal(await withTimeout(Promise.resolve('ok'), 1000, 'timeout'), 'ok');
});

test('withTimeout rejects stalled promises with the message', async () => {
  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 20, 'slow service'),
    /slow service/
  );
});
