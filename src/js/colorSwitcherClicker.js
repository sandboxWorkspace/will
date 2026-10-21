/**
 * Remote clicker — second-device page (standalone).
 *
 * Opens from the drill device's pairing QR (?join=PIN), joins the ephemeral
 * Firebase room, and becomes a full-screen tap pad. Taps increment a counter
 * on the room; the host watches it and advances the drill. Works across
 * networks — no accounts, no storage, no same-Wi-Fi requirement.
 */

import {
  FB_TIMEOUT_MS, isValidPin, loadRemoteDb, parseJoinPin, roomPath, withTimeout,
} from './remotePairing.js';

export async function initClicker() {
  const els = {
    joinStage: document.getElementById('joinStage'),
    tapStage: document.getElementById('tapStage'),
    status: document.getElementById('clickerStatus'),
    pinInput: document.getElementById('clickerPinInput'),
    joinBtn: document.getElementById('clickerJoinBtn'),
    tapBtn: document.getElementById('tapBtn'),
    tapStatus: document.getElementById('tapStatus'),
    leaveBtn: document.getElementById('clickerLeaveBtn'),
  };
  if (!els.joinStage || !els.tapBtn) return null;

  let fb = null;
  let room = null;
  let guest = null;
  let unsub = null;
  let pin = '';
  let lastSend = 0;
  let joining = false;

  function show(stage) {
    els.joinStage.style.display = 'none';
    els.tapStage.style.display = 'none';
    stage.style.display = '';
  }

  function setStatus(text) { els.status.textContent = text; }

  function teardown() {
    if (unsub) { unsub(); unsub = null; }
    if (guest && fb) {
      try { fb.remove(guest).catch(() => {}); } catch (e) { /* ignore */ }
    }
    guest = null;
    room = null;
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
        'Could not reach the pairing service — check the internet connection.');
      if (!snap.exists()) throw new Error('No drill is waiting with that PIN — check the drill screen.');

      room = roomRef;
      guest = fb.ref(fb.db, `${roomPath(pin)}/guest`);
      await withTimeout(fb.set(guest, 'joined'), FB_TIMEOUT_MS,
        'Could not reach the pairing service — check the internet connection.');
      fb.onDisconnect(guest).remove();

      unsub = fb.onValue(room, (s) => {
        if (room && !s.exists()) {
          teardown();
          show(els.joinStage);
          els.pinInput.value = pin;
          setStatus('The drill ended — ask it to pair again.');
        }
      });
      show(els.tapStage);
      els.tapStatus.textContent = `PIN ${pin} \u00b7 connected`;
    } catch (e) {
      teardown();
      show(els.joinStage);
      setStatus(e && e.message ? e.message : 'Could not connect.');
    } finally {
      joining = false;
    }
  }

  function sendTap() {
    if (!room || !fb) return;
    const now = Date.now();
    if (now - lastSend < 120) return;
    lastSend = now;
    const tapRef = fb.ref(fb.db, `${roomPath(pin)}/tapSeq`);
    fb.runTransaction(tapRef, (n) => (Number(n) || 0) + 1).catch(() => {
      els.tapStatus.textContent = 'Connection lost — check the internet and re-pair.';
    });
    els.tapBtn.classList.add('sent');
    setTimeout(() => els.tapBtn.classList.remove('sent'), 90);
  }

  els.tapBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sendTap();
  });
  els.joinBtn.addEventListener('click', () => join(els.pinInput.value));
  els.pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') join(els.pinInput.value);
  });
  els.leaveBtn.addEventListener('click', () => {
    teardown();
    show(els.joinStage);
    setStatus('Disconnected. Scan the drill\u2019s code or enter its PIN.');
  });
  window.addEventListener('beforeunload', teardown);

  const initialPin = parseJoinPin(location.search) || parseJoinPin(location.hash);
  show(els.joinStage);
  if (initialPin) {
    els.pinInput.value = initialPin;
    await join(initialPin);
  }
  return { teardown };
}
