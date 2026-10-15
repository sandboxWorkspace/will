/**
 * Device voice support for Speak Board (Web Speech API).
 *
 * Purpose:  the single voice path for the board — list voices from the OS,
 *           remember the chosen one, speak tile labels.
 * Consumes: window.speechSynthesis (voices: OS-provided).
 * Emits:    nothing to the DOM — the board calls the exports directly.
 * Owns:     voice enumeration, choice persistence (`aac-voice`), the iOS
 *           gesture-unlock quirk, and the "voices arrive late on mobile"
 *           warm-up.
 *
 * NOTE: intentionally NOT pluggable. The previous two-file provider
 * framework (registerProvider + swappable backends) was built for future
 * neural/cloud voice sources and had zero call sites — simplified per the
 * audit. Re-create if a second backend ever actually lands.
 *
 * Storage format: 'aac-voice' = "voiceURI" string. Legacy stored shape
 * { providerId, voiceId } migrates to a bare id on first load.
 */

const CHOSEN_KEY = 'aac-voice';
const PROVIDER_ID = 'system';
const PROVIDER_LABEL = 'Device voices';

const voices = [];
const listeners = [];
let chosenId = null;
let primed = false;

try {
    const raw = localStorage.getItem(CHOSEN_KEY);
    if (raw) {
        const parsed = JSON.parse(raw);
        // Legacy shape { providerId, voiceId } → bare voiceId
        chosenId = typeof parsed === 'string' ? parsed : parsed && parsed.voiceId ? parsed.voiceId : null;
        if (chosenId) localStorage.setItem(CHOSEN_KEY, JSON.stringify(chosenId));
    }
} catch (err) { /* storage unavailable */ }

const isSupported = () =>
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

function loadVoices() {
    if (!isSupported()) return;
    const list = window.speechSynthesis.getVoices();
    if (list && list.length) {
        voices.length = 0;
        voices.push(...list);
        notify();
    }
}

if (typeof window !== 'undefined' && isSupported()) {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    // Some mobile browsers populate voices late without firing the event
    setTimeout(loadVoices, 500);
}

function notify() {
    listeners.forEach((callback) => {
        try {
            callback();
        } catch (err) { /* listener error is non-fatal */ }
    });
}

/**
 * Call from inside a real user gesture to unlock speech on iOS, which
 * blocks the first speak() outside a gesture.
 */
export function prime() {
    if (primed || !isSupported()) return;
    try {
        const utterance = new SpeechSynthesisUtterance(' ');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        primed = true;
    } catch (err) { /* non-fatal */ }
}

/** [ { id, label, voices: [{id, label}] } ] — the shape the settings UI builds optgroups from. */
export function listVoiceOptions() {
    return [
        {
            id: PROVIDER_ID,
            label: PROVIDER_LABEL,
            voices: voices.map((voice) => ({
                id: voice.voiceURI,
                label: `${voice.name} (${voice.lang})${voice.localService ? ' — offline' : ''}`
            }))
        }
    ];
}

/** { providerId, voiceId } | null — the shape the board expects. */
export function getChosen() {
    if (!chosenId) return null;
    return { providerId: PROVIDER_ID, voiceId: chosenId };
}

export function setVoice(providerId, voiceId) {
    if (providerId !== PROVIDER_ID) return;
    chosenId = voiceId || null;
    try {
        if (chosenId) localStorage.setItem(CHOSEN_KEY, JSON.stringify(chosenId));
        else localStorage.removeItem(CHOSEN_KEY);
    } catch (err) { /* storage unavailable */ }
}

export function speak(text) {
    if (!isSupported() || !text) return;
    const synth = window.speechSynthesis;
    loadVoices();
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice =
        voices.find((v) => v.voiceURI === chosenId) || pickDefault();
    if (voice) utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    synth.speak(utterance);
}

/**
 * Default voice: match page language first, then language family, then any
 * locally-installed (offline) voice, then the OS default. Local voices work
 * without a network.
 */
function pickDefault() {
    if (!voices.length) return null;
    const lang = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
    const prefix = lang.split('-')[0];
    const local = voices.filter((v) => v.localService);
    return (
        local.find((v) => v.lang.toLowerCase().startsWith(lang)) ||
        local.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ||
        local[0] ||
        voices[0]
    );
}

/**
 * Register a callback re-invoked whenever the OS voice list refreshes.
 * Fires immediately if voices are already known (no-op avoids a settings
 * select sitting empty on first open on browsers that load synchronously).
 */
export function onVoicesChanged(callback) {
    if (!isSupported()) return;
    listeners.push(callback);
    if (voices.length) callback();
}
