/**
 * Remote clicker — second-device page (standalone).
 *
 * Opens from the drill device's pairing QR (?join=PIN) and becomes a
 * full-screen tap surface. While running: tap anywhere to advance, pause from
 * the top-right. While paused: resume or end from the overlay, matching the
 * main display's pause mechanic. Commands are tiny Firebase writes; the host
 * acknowledges each one and publishes only the current phase.
 */

import {
  FB_TIMEOUT_MS, isValidPin, loadRemoteDb, parseJoinPin, roomPath, withTimeout,
} from './remotePairing.js';
import { isKnownAction, makeCommand } from './remoteControl.js';

const PHASE_INFO = {
  setup: { title: 'Waiting for the drill', detail: 'It will start on the other phone.' },
  countdown: { title: 'Starting\u2026', detail: '' },
  paused: { title: 'Paused', detail: 'Resume or end the drill.' },
  done: { title: 'Drill ended', detail: 'Waiting for the other phone.' },
};

const COMMAND_TIMEOUT_MS = 4000;
const TAP_INTERVAL_MS = 200;

export async function initClicker() {
  const els = {
    joinStage: document.getElementById('joinStage'),
    connectedStage: document.getElementById('connectedStage'),
    status: document.getElementById('clickerStatus'),
    pinInput: document.getElementById('clickerPinInput'),
    joinBtn: document.getElementById('clickerJoinBtn'),
    tapSurface: document.getElementById('tapSurface'),
    tapHint: document.getElementById('tapHint'),
    pauseBtn: document.getElementById('pauseBtn'),
    leaveBtn: document.getElementById('clickerLeaveBtn'),
    overlay: document.getElementById('stateOverlay'),
    stateTitle: document.getElementById('stateTitle'),
    stateDetail: document.getElementById('stateDetail'),
    resumeBtn: document.getElementById('resumeBtn'),
    endBtn: document.getElementById('endBtn'),
    toast: document.getElementById('toast'),
  };
  if (!els.joinStage || !els.connectedStage || !els.tapSurface) return null;

  let fb = null;
  let room = null;
  let guest = null;
  let unsubPhase = null;
  let unsubAck = null;
  let unsubConnected = null;
  let pin = '';
  let joining = false;
  let online = false;
  let confirmedPhase = 'setup';
  let pending = null;
  let pendingTimer = null;
  let lastTapAt = 0;
  let wakeLock = null;
  let toastTimer = null;

  function show(stage) {
    els.joinStage.style.display = 'none';
    els.connectedStage.style.display = 'none';
    stage.style.display = '';
  }

  function setStatus(text) { els.status.textContent = text; }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3600);
  }

  async function acquireWakeLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* unsupported */ }
  }

  function releaseWakeLock() {
    if (!wakeLock) return;
    try { wakeLock.release().catch(() => {}); } catch (e) { /* ignore */ }
    wakeLock = null;
  }

  function render() {
    const phase = pending ? pending.phase : confirmedPhase;
    const running = phase === 'running';

    els.tapSurface.classList.toggle('disabled', !running);
    els.tapSurface.setAttribute('aria-disabled', String(!running));
    els.pauseBtn.hidden = !running;
    els.pauseBtn.disabled = !!pending || !online;
    els.overlay.hidden = running;

    if (running) {
      els.tapHint.textContent = online ? 'Tap anywhere' : 'Reconnecting\u2026';
      return;
    }

    const info = PHASE_INFO[phase] || PHASE_INFO.setup;
    els.stateTitle.textContent = info.title;
    let detail = info.detail;
    if (pending && pending.action === 'pause') detail = 'Pausing\u2026';
    else if (pending && pending.action === 'end') detail = 'Ending\u2026';
    if (!online) detail = 'Reconnecting\u2026';
    els.stateDetail.textContent = detail;

    const showActions = phase === 'paused';
    els.resumeBtn.hidden = !showActions;
    els.endBtn.hidden = !showActions;
    els.resumeBtn.disabled = !!pending || !online;
    els.endBtn.disabled = !!pending || !online;
  }

  function settlePending(ok, msg) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    pending = null;
    render();
    if (!ok && msg) showToast(msg);
  }

  function applyPhase(value) {
    if (!value) {
      endConnection('Connection ended \u2014 ask the drill device to pair again.');
      return;
    }
    confirmedPhase = value;
    if (!pending) { render(); return; }
    if (value === pending.target || value === 'done' || value === 'setup') {
      settlePending(true);
      return;
    }
    render();
  }

  function onAck(ack) {
    if (!pending || !ack || ack.id !== pending.id) return;
    if (ack.ok && ack.phase) confirmedPhase = ack.phase;
    settlePending(!!ack.ok, ack.msg);
  }

  function teardown() {
    releaseWakeLock();
    if (unsubPhase) { unsubPhase(); unsubPhase = null; }
    if (unsubAck) { unsubAck(); unsubAck = null; }
    if (unsubConnected) { unsubConnected(); unsubConnected = null; }
    clearTimeout(pendingTimer);
    pendingTimer = null;
    pending = null;
    clearTimeout(toastTimer);
    els.toast.hidden = true;
    confirmedPhase = 'setup';
    online = false;
    lastTapAt = 0;
    if (guest && fb) {
      try { fb.remove(guest).catch(() => {}); } catch (e) { /* ignore */ }
    }
    guest = null;
    room = null;
    els.overlay.hidden = true;
    els.connectedStage.style.display = 'none';
  }

  function endConnection(message) {
    teardown();
    show(els.joinStage);
    els.pinInput.value = pin;
    setStatus(message);
  }

  async function join(candidate) {
    const wanted = String(candidate || '').trim();
    if (!isValidPin(wanted)) {
      setStatus('Enter the 4-digit PIN shown on the drill device.');
      return;
    }
    if (joining) return;
    joining = true;
    teardown();
    pin = wanted;
    setStatus('Connecting\u2026');
    try {
      fb = await loadRemoteDb();
      const roomRef = fb.ref(fb.db, roomPath(pin));
      const snap = await withTimeout(fb.get(roomRef), FB_TIMEOUT_MS,
        'Could not reach the pairing service \u2014 check the internet connection.');
      if (!snap.exists()) throw new Error('No drill is waiting with that PIN \u2014 check the drill screen.');

      room = roomRef;
      guest = fb.ref(fb.db, `${roomPath(pin)}/guest`);
      await withTimeout(fb.set(guest, 'joined'), FB_TIMEOUT_MS,
        'Could not reach the pairing service \u2014 check the internet connection.');
      fb.onDisconnect(guest).remove();

      unsubPhase = fb.onValue(fb.ref(fb.db, `${roomPath(pin)}/phase`), (s) => {
        if (!room) return;
        applyPhase(s.val());
      });
      unsubAck = fb.onValue(fb.ref(fb.db, `${roomPath(pin)}/ack`), (s) => {
        if (!room) return;
        onAck(s.val());
      });
      unsubConnected = fb.onValue(fb.ref(fb.db, '.info/connected'), (s) => {
        if (!room) return;
        online = !!s.val();
        if (online && guest) {
          try {
            fb.set(guest, 'joined').catch(() => {});
            fb.onDisconnect(guest).remove();
          } catch (e) { /* ignore */ }
        }
        render();
      });

      if (!room) return;
      show(els.connectedStage);
      render();
      acquireWakeLock();
    } catch (e) {
      teardown();
      show(els.joinStage);
      setStatus(e && e.message ? e.message : 'Could not connect.');
    } finally {
      joining = false;
    }
  }

  async function sendCommand(action) {
    if (!room || !fb || pending || !isKnownAction(action)) return;
    if (!online) { showToast('Connection lost \u2014 reconnecting\u2026'); return; }
    const cmd = makeCommand(action);
    pending = {
      id: cmd.id,
      action,
      phase: action === 'resume' ? 'running' : 'paused',
      target: action === 'end' ? 'done' : (action === 'resume' ? 'running' : 'paused'),
    };
    render();
    pendingTimer = setTimeout(() => {
      if (!pending || pending.id !== cmd.id) return;
      settlePending(false, 'No response from the drill \u2014 check the connection.');
    }, COMMAND_TIMEOUT_MS);
    try {
      await fb.push(fb.ref(fb.db, `${roomPath(pin)}/commands`), cmd);
    } catch (e) {
      if (pending && pending.id === cmd.id) {
        settlePending(false, 'Could not reach the drill.');
      }
    }
  }

  function tap() {
    if (!room || !fb || pending || confirmedPhase !== 'running') return;
    if (!online) return;
    const now = performance.now();
    if (now - lastTapAt < TAP_INTERVAL_MS) return;
    lastTapAt = now;
    els.tapSurface.classList.add('sent');
    setTimeout(() => els.tapSurface.classList.remove('sent'), 90);
    fb.set(fb.ref(fb.db, `${roomPath(pin)}/tapSeq`), fb.increment(1))
      .catch(() => showToast('Tap did not reach the drill.'));
  }

  els.tapSurface.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    tap();
  });
  els.tapSurface.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tap();
    }
  });
  els.pauseBtn.addEventListener('click', () => sendCommand('pause'));
  els.resumeBtn.addEventListener('click', () => sendCommand('resume'));
  els.endBtn.addEventListener('click', () => sendCommand('end'));
  els.joinBtn.addEventListener('click', () => join(els.pinInput.value));
  els.pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') join(els.pinInput.value);
  });
  els.leaveBtn.addEventListener('click', () => {
    const savedPin = pin;
    teardown();
    show(els.joinStage);
    els.pinInput.value = savedPin;
    setStatus('Disconnected. Scan the drill\u2019s code or enter its PIN.');
  });
  window.addEventListener('beforeunload', teardown);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') releaseWakeLock();
    else if (room) acquireWakeLock();
  });

  const initialPin = parseJoinPin(location.search) || parseJoinPin(location.hash);
  show(els.joinStage);
  if (initialPin) {
    els.pinInput.value = initialPin;
    await join(initialPin);
  }
  return { teardown };
}
