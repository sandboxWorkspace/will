/**
 * Device voice provider for Speak Board — the browser's built-in Web Speech
 * voices (provided by the OS: iOS, Android, Windows, macOS). No downloads,
 * works offline, and most devices include several male and female voices.
 *
 * Implements the provider contract expected by speech.js:
 *   id, label, isAvailable(), listVoices(), getChosenVoiceId(),
 *   setVoice(id), onVoicesChanged(cb), speak(text), prime()
 *
 * New voice sources (on-device neural, cloud TTS) plug in via the same
 * contract — see speech.js registerProvider().
 */

const voices = [];
const listeners = [];
let chosenId = null;
let primed = false;

function isSupported() {
    return 'speechSynthesis' in window;
}

function listVoiceOptions() {
    return voices.map((voice) => ({
        id: voice.voiceURI,
        label: `${voice.name} (${voice.lang})${voice.localService ? ' — offline' : ''}`,
        offline: Boolean(voice.localService)
    }));
}

function notify() {
    const options = listVoiceOptions();
    listeners.forEach((cb) => {
        try {
            cb(options);
        } catch (err) { /* listener error is non-fatal */ }
    });
}

function loadVoices() {
    if (!isSupported()) return;
    const list = window.speechSynthesis.getVoices();
    if (list && list.length) {
        voices.length = 0;
        voices.push(...list);
        notify();
    }
}

if (isSupported()) {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    // Some mobile browsers populate voices late without firing the event
    setTimeout(loadVoices, 500);
}

function pickDefault() {
    if (!voices.length) return null;
    const lang = (navigator.language || 'en').toLowerCase();
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

const systemVoiceProvider = {
    id: 'system',
    label: 'Device voices',
    isAvailable: isSupported,

    listVoices() {
        return listVoiceOptions();
    },

    getChosenVoiceId() {
        return chosenId;
    },

    setVoice(id) {
        chosenId = id;
    },

    onVoicesChanged(callback) {
        listeners.push(callback);
        if (voices.length) callback(systemVoiceProvider.listVoices());
    },

    speak(text) {
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
    },

    /**
     * Call from inside a real user gesture to unlock speech on iOS, which
     * blocks the first speak() outside a gesture.
     */
    prime() {
        if (primed || !isSupported()) return;
        try {
            const utterance = new SpeechSynthesisUtterance(' ');
            utterance.volume = 0;
            window.speechSynthesis.speak(utterance);
            primed = true;
        } catch (err) { /* non-fatal */ }
    }
};

export { systemVoiceProvider };
