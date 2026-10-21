/**
 * Remote clicker — pairing helpers (optional add-on).
 *
 * Pairing uses a short-lived Firebase Realtime Database room keyed by a
 * 4-digit PIN (same room pattern as Scan Match). The QR encodes the clicker
 * page URL with ?join=PIN, so the second phone's native camera opens the page
 * and auto-joins. Works across networks — no WebRTC, no same-Wi-Fi need.
 *
 * Pure helpers are node-testable. Firebase and QR rendering are lazy-loaded
 * only when the optional module actually runs; the core drill never imports
 * any of this.
 */

export const FB_TIMEOUT_MS = 12000;

export function isValidPin(value) {
  return typeof value === 'string' && /^\d{4}$/.test(value);
}

/** 4-digit pairing PIN — shown on both devices to verify the right pair. */
export function genPin() {
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return String(1000 + (buf[0] % 9000));
  }
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function roomPath(pin) {
  if (!isValidPin(pin)) throw new Error('Invalid PIN');
  return `colorSwitcherRemote/${pin}`;
}

/** Absolute clicker page URL that auto-joins the given room. */
export function buildJoinUrl(pageUrl, pin) {
  if (!isValidPin(pin)) throw new Error('Invalid PIN');
  const url = new URL(pageUrl);
  url.searchParams.set('join', pin);
  return url.href;
}

/** Accepts a full URL, ?join=PIN, #join=PIN, or a bare PIN. */
export function parseJoinPin(input) {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  if (isValidPin(raw)) return raw;
  let search = '';
  if (raw.startsWith('?')) {
    search = raw;
  } else if (raw.startsWith('#')) {
    const hash = raw.slice(1);
    search = hash.startsWith('?') ? hash : `?${hash}`;
  } else if (raw.startsWith('join=')) {
    search = `?${raw}`;
  } else {
    let url;
    try { url = new URL(raw); } catch (e) { return null; }
    search = url.search;
  }
  const pin = new URLSearchParams(search).get('join');
  return isValidPin(pin) ? pin : null;
}

/** True when a new tap counter value should advance the drill once. */
export function shouldAdvance(prev, next) {
  const p = Number(prev);
  const n = Number(next);
  return (Number.isFinite(n) ? n : 0) > (Number.isFinite(p) ? p : 0);
}

export function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message || 'Request timed out')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

let dbPromise = null;

/** Lazily loads Firebase + config once per page. */
export function loadRemoteDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const [{ initializeApp, getApps, getApp }, dbMod, { default: firebaseConfig }] = await Promise.all([
        import('firebase/app'),
        import('firebase/database'),
        import('./database/firebase/firebaseConfig.js'),
      ]);
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      return { ...dbMod, app, db: dbMod.getDatabase(app) };
    })();
  }
  return dbPromise;
}

/** Renders `text` as a QR into an <img> (src=dataURL) or <canvas>. */
export async function renderQrTo(target, text) {
  const QRCode = (await import('qrcode')).default;
  if (target.tagName === 'CANVAS') {
    await QRCode.toCanvas(target, text, { margin: 1, width: 512, errorCorrectionLevel: 'L' });
  } else {
    const url = await QRCode.toDataURL(text, { margin: 1, width: 512, errorCorrectionLevel: 'L' });
    target.src = url;
  }
}
