/**
 * Remote clicker — host side (optional add-on, fully separate from the core).
 *
 * Creates a short-lived Firebase room and renders a QR that opens the clicker
 * page with ?join=PIN. Taps arrive as a counter and go through
 * app.advance('remote'). Pause/resume/end arrive as tiny queued commands; the
 * host acknowledges each one and publishes only the current drill phase.
 *
 * The core never imports this module and works exactly the same if it never
 * loads (the drill stays fully local).
 */

import {
  FB_TIMEOUT_MS, buildJoinUrl, genPin, loadRemoteDb, roomPath,
  renderQrTo, shouldAdvance, withTimeout,
} from './remotePairing.js';
import { isFreshCommand, isKnownAction } from './remoteControl.js';

const PHASE_PUBLISH_MS = 250;

export function initRemoteClicker(app) {
  const slot = document.getElementById('remoteGroup');
  if (!slot) return null;

  const els = {
    pairBtn: document.getElementById('remotePairBtn'),
    status: document.getElementById('remoteStatus'),
    menu: document.getElementById('remoteMenu'),
    qr: document.getElementById('remoteQr'),
    pin: document.getElementById('remotePin'),
    url: document.getElementById('remoteUrl'),
    menuStatus: document.getElementById('remoteMenuStatus'),
    cancelBtn: document.getElementById('remoteCancelBtn'),
  };
  if (!els.pairBtn || !els.menu) return null;

  let fb = null;
  let room = null;
  let unsubTap = null;
  let unsubGuest = null;
  let unsubCmd = null;
  let phaseTimer = null;
  let pin = '';
  let lastSeq = 0;
  let lastPhase = '';
  let connected = false;
  let autoClosed = false;
  let pairRun = 0;

  function setStatus(text) { els.menuStatus.textContent = text; }

  function showSlotStatus() {
    els.pairBtn.textContent = connected ? 'Remote connected — manage' : 'Pair a second device…';
    els.status.textContent = connected
      ? 'Connected — the other phone can tap anywhere, pause or resume, and end.'
      : 'Use another phone as a full-screen tap pad with pause and end — works over the internet.';
  }

  function roomRef(child) {
    return fb.ref(fb.db, child ? `${roomPath(pin)}/${child}` : roomPath(pin));
  }

  function publishPhase(force = false) {
    if (!room || !fb || !pin) return;
    const phase = app.state || 'setup';
    if (!force && phase === lastPhase) return;
    lastPhase = phase;
    try { fb.set(roomRef('phase'), phase).catch(() => {}); } catch (e) { /* ignore */ }
  }

  function sendAck(id, ok, msg) {
    if (!room || !fb) return;
    const ack = { id, ok, phase: app.state || 'setup', msg: msg || '', at: Date.now() };
    try { fb.set(roomRef('ack'), ack).catch(() => {}); } catch (e) { /* ignore */ }
  }

  function handleCommand(cmd) {
    const phase = app.state;
    let ok = true;
    let msg = '';
    try {
      switch (cmd.action) {
        case 'pause':
          if (phase === 'running') { app.openPause(); msg = 'Paused.'; }
          else if (phase === 'paused') msg = 'Already paused.';
          else { ok = false; msg = 'The drill is not running.'; }
          break;
        case 'resume':
          if (phase === 'paused') { app.resume(); msg = 'Resumed.'; }
          else if (phase === 'running') msg = 'Already running.';
          else { ok = false; msg = 'The drill is not paused.'; }
          break;
        case 'end':
          if (phase === 'paused') { app.endSession('manual'); msg = 'Ended.'; }
          else if (phase === 'done') msg = 'Already ended.';
          else { ok = false; msg = 'Pause the drill before ending it.'; }
          break;
        default:
          ok = false;
          msg = 'Unknown command.';
      }
    } catch (e) {
      ok = false;
      msg = (e && e.message) ? e.message : 'Command failed.';
    }
    sendAck(cmd.id, ok, msg);
    publishPhase(true);
  }

  function teardown() {
    pairRun++;
    clearInterval(phaseTimer);
    phaseTimer = null;
    if (unsubTap) { unsubTap(); unsubTap = null; }
    if (unsubGuest) { unsubGuest(); unsubGuest = null; }
    if (unsubCmd) { unsubCmd(); unsubCmd = null; }
    if (room && fb) {
      const oldRoom = room;
      try { fb.remove(oldRoom).catch(() => {}); } catch (e) { /* ignore */ }
    }
    room = null;
    pin = '';
    lastSeq = 0;
    lastPhase = '';
    connected = false;
    autoClosed = false;
  }

  async function startPairing() {
    teardown();
    const run = pairRun;
    els.menu.classList.add('active');
    els.qr.removeAttribute('src');
    els.pin.textContent = '\u00b7\u00b7\u00b7\u00b7';
    els.url.textContent = '';
    setStatus('Preparing\u2026');
    try {
      fb = await loadRemoteDb();
      if (run !== pairRun) return;
      let roomRefMain = null;
      for (let attempt = 0; attempt < 5 && !roomRefMain; attempt++) {
        const candidate = genPin();
        const ref = fb.ref(fb.db, roomPath(candidate));
        const snap = await withTimeout(fb.get(ref), FB_TIMEOUT_MS,
          'Could not reach the pairing service — check the internet connection.');
        if (run !== pairRun) return;
        if (!snap.exists()) { pin = candidate; roomRefMain = ref; }
      }
      if (!roomRefMain) throw new Error('Could not reserve a PIN — try again.');

      room = roomRefMain;
      const phase = app.state || 'setup';
      await withTimeout(fb.set(room, {
        v: 1,
        status: 'waiting',
        tapSeq: 0,
        phase,
        createdAt: fb.serverTimestamp(),
      }), FB_TIMEOUT_MS, 'Could not reach the pairing service — check the internet connection.');
      if (run !== pairRun) {
        try { fb.remove(roomRefMain).catch(() => {}); } catch (e) { /* ignore */ }
        return;
      }
      fb.onDisconnect(room).remove();
      lastSeq = 0;
      lastPhase = phase;
      connected = false;

      els.pin.textContent = pin;
      const clickerUrl = new URL('./toolColorSwitcherClicker.html', location.href).href;
      els.url.textContent = clickerUrl;
      await renderQrTo(els.qr, buildJoinUrl(clickerUrl, pin));
      if (run !== pairRun) {
        try { fb.remove(roomRefMain).catch(() => {}); } catch (e) { /* ignore */ }
        return;
      }
      setStatus('Scan this with the other phone\u2019s camera — it opens the full-screen remote. Or open the clicker page and enter the PIN.');

      unsubTap = fb.onValue(roomRef('tapSeq'), (snap) => {
        if (!room) return;
        const seq = Number(snap.val()) || 0;
        if (shouldAdvance(lastSeq, seq)) {
          app.advance('remote');
          publishPhase();
        }
        lastSeq = seq;
      });

      unsubGuest = fb.onValue(roomRef('guest'), (snap) => {
        if (!room) return;
        const guestHere = snap.exists();
        if (guestHere === connected) return;
        connected = guestHere;
        showSlotStatus();
        if (connected) {
          setStatus('Remote connected — tap anywhere, or pause.');
          publishPhase(true);
          if (!autoClosed) {
            autoClosed = true;
            setTimeout(() => { if (connected) els.menu.classList.remove('active'); }, 1200);
          }
        } else {
          setStatus('Remote disconnected — waiting for it to rejoin.');
        }
      });

      unsubCmd = fb.onChildAdded(roomRef('commands'), (snap) => {
        if (!room) return;
        const cmd = snap.val();
        const cmdRef = snap.ref;
        try { fb.remove(cmdRef).catch(() => {}); } catch (e) { /* ignore */ }
        if (!cmd || typeof cmd.id !== 'string' || !isKnownAction(cmd.action)) return;
        if (!isFreshCommand(cmd)) {
          sendAck(cmd.id, false, 'Command expired — try again.');
          return;
        }
        handleCommand(cmd);
      });

      phaseTimer = setInterval(() => publishPhase(), PHASE_PUBLISH_MS);
      showSlotStatus();
    } catch (e) {
      teardown();
      setStatus('Could not start pairing: ' + (e && e.message ? e.message : 'unknown error'));
    }
  }

  els.pairBtn.addEventListener('click', () => {
    if (connected) {
      showSlotStatus();
      els.menu.classList.add('active');
      setStatus('Connected — the remote is live.');
      return;
    }
    startPairing();
  });
  els.cancelBtn.addEventListener('click', () => {
    teardown();
    els.menu.classList.remove('active');
    showSlotStatus();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    queueMicrotask(() => { if (room) publishPhase(true); });
  });
  window.addEventListener('beforeunload', () => {
    clearInterval(phaseTimer);
    if (unsubTap) { unsubTap(); unsubTap = null; }
    if (unsubGuest) { unsubGuest(); unsubGuest = null; }
    if (unsubCmd) { unsubCmd(); unsubCmd = null; }
  });

  slot.style.display = '';
  showSlotStatus();
  return { teardown, isConnected: () => connected };
}
