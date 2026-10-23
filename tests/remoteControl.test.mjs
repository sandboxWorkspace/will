/**
 * Tests for remoteControl.js — command validation for the optional remote.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isFreshCommand, isKnownAction, makeCommand,
} from '../src/js/remoteControl.js';

test('remote actions are exactly pause, resume, end', () => {
  assert.equal(isKnownAction('pause'), true);
  assert.equal(isKnownAction('resume'), true);
  assert.equal(isKnownAction('end'), true);
  assert.equal(isKnownAction('start'), false);
  assert.equal(isKnownAction('restart'), false);
  assert.equal(isKnownAction('config'), false);
  assert.equal(isKnownAction(''), false);
  assert.equal(isKnownAction(null), false);
});

test('commands carry a unique id, action, and timestamp', () => {
  const a = makeCommand('pause');
  const b = makeCommand('end');
  assert.equal(a.action, 'pause');
  assert.equal(typeof a.id, 'string');
  assert.ok(a.id.length > 0);
  assert.equal(typeof a.at, 'number');
  assert.notEqual(a.id, b.id);
});

test('makeCommand rejects unknown actions', () => {
  assert.throws(() => makeCommand('launch'), /Unknown remote action/);
});

test('fresh commands pass and stale commands fail', () => {
  const now = 1_000_000;
  const cmd = { id: 'abc', action: 'resume', at: now - 500 };
  assert.equal(isFreshCommand(cmd, now), true);
  assert.equal(isFreshCommand(cmd, now + 20_000), false);
});

test('malformed or future-skewed commands are rejected', () => {
  const now = 1_000_000;
  assert.equal(isFreshCommand(null, now), false);
  assert.equal(isFreshCommand({}, now), false);
  assert.equal(isFreshCommand({ id: '', action: 'pause', at: now }, now), false);
  assert.equal(isFreshCommand({ id: 'x', action: 'pause', at: 'now' }, now), false);
  assert.equal(isFreshCommand({ id: 'x', action: 'start', at: now }, now), false);
  assert.equal(isFreshCommand({ id: 'x', action: 'pause', at: now + 120_000 }, now), false);
});
