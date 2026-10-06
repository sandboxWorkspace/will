/**
 * Web Speech API wrapper for Speak Board.
 * Handles async voice loading, offline-preferred default voice, persistence,
 * and the iOS user-gesture requirement for the first utterance.
 */

const VOICE_KEY = 'aac-voice-uri';

let voices = [];
let chosenVoiceUri = null;
let primed = false;

function isSupported() {
    return 'speechSynthesis' in window;
}

function loadVoices() {
    if (!isSupported()) return;
    const list = window.speechSynthesis.getVoices();
    if (list && list.length) voices = list;
}

try {
    chosenVoiceUri = localStorage.getItem(VOICE_KEY);
} catch (e) { /* storage unavailable (private mode) — fall back to defaults */ }

if (isSupported()) {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    // Some mobile browsers populate voices late without firing the event
    setTimeout(loadVoices, 500);
}

function pickDefault(list) {
    if (!list || !list.length) return null;
    const lang = (navigator.language || 'en').toLowerCase();
    const prefix = lang.split('-')[0];
    const local = list.filter((v) => v.localService);
    return (
        local.find((v) => v.lang.toLowerCase().startsWith(lang)) ||
        local.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
        list.find((v) => v.lang.toLowerCase().startsWith(lang)) ||
        local[0] ||
        list[0]
    );
}

/**
 * Speak a phrase. Cancels anything already queued first.
 * @param {string} text
 */
export function speak(text) {
    if (!isSupported() || !text) return;
    const synth = window.speechSynthesis;
    loadVoices();
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice =
        voices.find((v) => v.voiceURI === chosenVoiceUri) ||
        pickDefault(voices);
    if (voice) utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    synth.speak(utterance);
}

/**
 * Call from inside a real user gesture (e.g. the Gaze toggle click) to unlock
 * speech on iOS, which blocks the first speak() outside a gesture.
 */
export function prime() {
    if (primed || !isSupported()) return;
    try {
        const utterance = new SpeechSynthesisUtterance(' ');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        primed = true;
    } catch (e) { /* non-fatal */ }
}

export function getVoices() {
    return voices;
}

export function getChosenVoiceUri() {
    return chosenVoiceUri;
}

export function setVoice(voiceUri) {
    chosenVoiceUri = voiceUri;
    try {
        localStorage.setItem(VOICE_KEY, voiceUri);
    } catch (e) { /* storage unavailable */ }
}
