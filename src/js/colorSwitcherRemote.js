/**
 * Remote clicker — host side (optional add-on, fully separate from the core).
 *
 * Creates a short-lived Firebase room and renders a QR that opens the clicker
 * page with ?join=PIN. Taps arrive as a tap counter on the room and are
 * delivered through app.advance('remote'). Works across networks.
 *
 * The core never imports this module and works exactly the same if it never
 * loads (the drill stays fully local).
 */

import {
  FB_TIMEOUT_MS, buildJoinUrl, genPin, loadRemoteDb, roomPath,
  renderQrTo, shouldAdvance, withTimeout,
} from './remotePairing.js';

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
  let unsub = null;
  let pin = '';
  let lastSeq = 0;
  let connected = false;
  let autoClosed = false;

  function setStatus(text) { els.menuStatus.textContent = text; }

  function showSlotStatus() {
    els.pairBtn.textContent = connected ? 'Remote connected — manage' : 'Pair a second device…';
    els.status.textContent = connected
      ? 'Connected — taps from the other phone advance the drill.'
      : 'Use another phone as a big tap pad — works over the internet, no accounts.';
  }

  function teardown() {
    if (unsub) { unsub(); unsub = null; }
    if (room && fb) {
      const oldRoom = room;
      try { fb.remove(oldRoom).catch(() => {}); } catch (e) { /* ignore */ }
    }
    room = null;
    pin = '';
    lastSeq = 0;
    connected = false;
    autoClosed = false;
  }

  async function startPairing() {
    teardown();
    els.menu.classList.add('active');
    els.qr.removeAttribute('src');
    els.pin.textContent = '\u00b7\u00b7\u00b7\u00b7';
    els.url.textContent = '';
    setStatus('Preparing\u2026');
    try {
      fb = await loadRemoteDb();
      let roomRef = null;
      for (let attempt = 0; attempt < 5 && !roomRef; attempt++) {
        const candidate = genPin();
        const ref = fb.ref(fb.db, roomPath(candidate));
        const snap = await withTimeout(fb.get(ref), FB_TIMEOUT_MS,
          'Could not reach the pairing service — check the internet connection.');
        if (!snap.exists()) { pin = candidate; roomRef = ref; }
      }
      if (!roomRef) throw new Error('Could not reserve a PIN — try again.');

      room = roomRef;
      await withTimeout(fb.set(room, {
        v: 1,
        status: 'waiting',
        tapSeq: 0,
        createdAt: fb.serverTimestamp(),
      }), FB_TIMEOUT_MS, 'Could not reach the pairing service — check the internet connection.');
      fb.onDisconnect(room).remove();
      lastSeq = 0;
      connected = false;

      els.pin.textContent = pin;
      const clickerUrl = new URL('./toolColorSwitcherClicker.html', location.href).href;
      els.url.textContent = clickerUrl;
      await renderQrTo(els.qr, buildJoinUrl(clickerUrl, pin));
      setStatus('Scan this with the other phone\u2019s camera — it opens the tap pad. Or open the clicker page and enter the PIN.');

      unsub = fb.onValue(room, (snap) => {
        if (!room) return;
        const data = snap.val();
        if (!data) {
          if (unsub) { unsub(); unsub = null; }
          room = null;
          connected = false;
          setStatus('Pairing closed — start again.');
          showSlotStatus();
          return;
        }
        const seq = Number(data.tapSeq) || 0;
        if (shouldAdvance(lastSeq, seq)) app.advance('remote');
        lastSeq = seq;

        const guestHere = Boolean(data.guest);
        if (guestHere !== connected) {
          connected = guestHere;
          showSlotStatus();
          if (connected) {
            setStatus('Clicker connected — taps are live.');
            if (!autoClosed) {
              autoClosed = true;
              setTimeout(() => { if (connected) els.menu.classList.remove('active'); }, 1200);
            }
          } else {
            setStatus('Clicker disconnected — waiting for it to rejoin.');
          }
        }
      });
      showSlotStatus();
    } catch (e) {
      setStatus('Could not start pairing: ' + (e && e.message ? e.message : 'unknown error'));
    }
  }

  els.pairBtn.addEventListener('click', () => {
    if (connected) {
      showSlotStatus();
      els.menu.classList.add('active');
      setStatus('Connected — the clicker is live.');
      return;
    }
    startPairing();
  });
  els.cancelBtn.addEventListener('click', () => {
    teardown();
    els.menu.classList.remove('active');
    showSlotStatus();
  });
  window.addEventListener('beforeunload', () => {
    if (unsub) { unsub(); unsub = null; }
  });

  slot.style.display = '';
  showSlotStatus();
  return { teardown, isConnected: () => connected };
}
