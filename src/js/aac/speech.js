/**
 * Voice coordinator for Speak Board — routes speech through pluggable voice
 * providers so new sources (on-device neural voices, cloud TTS, custom
 * recordings) can be added without touching the board UI.
 *
 * Provider contract (see voiceSystem.js for the reference implementation):
 *   { id, label, isAvailable(), listVoices(), getChosenVoiceId(),
 *     setVoice(id), onVoicesChanged(cb), speak(text), prime() }
 *
 * The active provider is whichever one owns the currently chosen voice;
 * with no choice made, the first available provider serves.
 *
 * External API:
 *   speak(text)                  — speak through the active provider
 *   prime()                       — unlock speech inside a user gesture
 *   listVoiceOptions()            — [{ id, label, voices: [{id, label}] }]
 *   getChosen()                  — { providerId, voiceId } | null
 *   setVoice(providerId, voiceId) — choose and persist
 *   onVoicesChanged(cb)           — notify when any provider's list updates
 *   registerProvider(provider)    — add a voice source at runtime
 */
import { systemVoiceProvider } from './voiceSystem.js';

const CHOSEN_KEY = 'aac-voice';
const providers = [];

if (systemVoiceProvider.isAvailable()) providers.push(systemVoiceProvider);

let chosen = null;
try {
    const raw = localStorage.getItem(CHOSEN_KEY);
    if (raw) chosen = JSON.parse(raw);
} catch (err) { /* storage unavailable — defaults */ }

// Re-apply a persisted choice to its provider
if (chosen && chosen.providerId && chosen.voiceId) {
    const provider = providers.find((p) => p.id === chosen.providerId);
    if (provider) provider.setVoice(chosen.voiceId);
}

function providerById(id) {
    return providers.find((p) => p.id === id) || null;
}

function activeProvider() {
    return (chosen && providerById(chosen.providerId)) || providers[0] || null;
}

export function registerProvider(provider) {
    if (provider && provider.isAvailable() && !providers.some((p) => p.id === provider.id)) {
        providers.push(provider);
    }
}

export function speak(text) {
    const provider = activeProvider();
    if (provider) provider.speak(text);
}

export function prime() {
    providers.forEach((provider) => provider.prime && provider.prime());
}

export function listVoiceOptions() {
    return providers.map((provider) => ({
        id: provider.id,
        label: provider.label,
        voices: provider.listVoices()
    }));
}

export function getChosen() {
    return chosen;
}

export function setVoice(providerId, voiceId) {
    const provider = providerById(providerId);
    if (!provider) return;
    provider.setVoice(voiceId);
    chosen = { providerId, voiceId };
    try {
        localStorage.setItem(CHOSEN_KEY, JSON.stringify(chosen));
    } catch (err) { /* storage unavailable */ }
}

export function onVoicesChanged(callback) {
    providers.forEach((provider) => {
        if (provider.onVoicesChanged) provider.onVoicesChanged(callback);
    });
}
