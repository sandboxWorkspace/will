import { logger } from './iosDebug.js';

/**
 * A pure logic class for the metronome engine.
 * It manages state and timing, but has no knowledge of the DOM.
 * It communicates state changes via a callback.
 */
export class Metronome {
    constructor(options = {}) {
        // State
        this.bpm = options.bpm || 60;
        this.minTempo = options.minTempo || 8;
        this.maxTempo = options.maxTempo || 280;
        this.beatsPerMeasure = options.beatsPerMeasure || 1;
        this.beatUnit = options.beatUnit || 4;
        this.beepVolume = options.beepVolume || 0.1;
        this.pulseColor = options.pulseColor || '#E74C3C';

        this.isPlaying = false;
        this.currentBeatInMeasure = 0;
        this.totalBeatsPlayed = 0;
        this.elapsedTimeInSeconds = 0;
        this.isPulsing = false; // Flag for the UI to know when to show pulse color

        // Internals
        this.intervalId = null;
        this.timerIntervalId = null;
        this.audioContext = null;

        // Callback for state changes
        this.onStateChange = options.onStateChange || (() => {});

        // Bind methods
        this.togglePlay = this.togglePlay.bind(this);
        this._beat = this._beat.bind(this);
        this._playBeep = this._playBeep.bind(this);
        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this._handleVisibilityChange);
    }

    _getState() {
        return {
            isPlaying: this.isPlaying,
            bpm: this.bpm,
            totalBeatsPlayed: this.totalBeatsPlayed,
            elapsedTimeInSeconds: this.elapsedTimeInSeconds,
            pulseColor: this.pulseColor,
            isPulsing: this.isPulsing,
        };
    }

    _notifyStateChange() {
        this.onStateChange(this._getState());
    }

    async _ensureAudioIsReady() {
        // 1. Create AudioContext if it doesn't exist or is closed.
        // This should be done within the user gesture.
        if (!this.audioContext || this.audioContext.state === 'closed') {
            logger.log(this.audioContext ? "AudioContext was closed, creating a new one." : "AudioContext does not exist, creating one.");
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                logger.log(`AudioContext created. Initial state: ${this.audioContext.state}`);
            } catch (e) {
                logger.log(`Failed to create AudioContext: ${e.message}`, 'error');
                return false; 
            }
        }

        // 2. If AudioContext is suspended, try to resume it.
        // This is the key part for iOS. It must be called from a user gesture.
        if (this.audioContext.state === 'suspended') {
            logger.log("AudioContext is suspended, attempting to resume...");
            try {
                await this.audioContext.resume(); 
                logger.log(`AudioContext resumed. State: ${this.audioContext.state}`);
            } catch (err) {
                logger.log(`Error resuming AudioContext: ${err.message}`, 'error');
                return false;
            }
        }

        // 3. Final check: Is the AudioContext now running?
        if (this.audioContext?.state === 'running') {
            return true;
        } else {
            logger.log(`AudioContext is NOT running. Final state: ${this.audioContext.state}.`, 'error');
            return false;
        }
    }

    _handleVisibilityChange() {
        if (!this.audioContext) return; // No audio context to manage yet

        if (document.visibilityState === 'visible') {
            if (this.audioContext.state === 'suspended') {
                logger.log("Page visible, AudioContext suspended. Attempting resume.");
                this.audioContext.resume().then(() => {
                    logger.log(`AudioContext resumed on visibility. State: ${this.audioContext.state}`);
                }).catch(err => {
                    logger.log(`Error resuming AudioContext on visibility: ${err.message}`, 'error');
                });
            }
        } else {
            logger.log(`Page hidden. AudioContext state: ${this.audioContext.state}`);
            // iOS often suspends the context automatically. Explicitly stopping the metronome
            // if it's playing might be a good idea if desired, but not strictly necessary for resume.
        }
    }

    setTempo(newTempo) {
        if (isNaN(newTempo)) newTempo = this.bpm; // Revert to current if invalid input
        newTempo = Math.max(this.minTempo, Math.min(this.maxTempo, newTempo)); // Clamp value

        if (newTempo === this.bpm) return; // No change, no need to update

        this.bpm = newTempo;

        if (this.isPlaying) {
            clearInterval(this.intervalId);
            const intervalTime = (60 / this.bpm) * 1000;
            this.intervalId = setInterval(this._beat, intervalTime);
        }
        this._notifyStateChange();
    }

    setPulseColor(newColor) {
        this.pulseColor = newColor;
        this._notifyStateChange();
    }
    
    async setTimeSignature(signatureString) {
        const wasPlaying = this.isPlaying;
        if (wasPlaying) this.stop();

        const parts = signatureString.split('/');
        if (parts.length === 2) {
            this.beatsPerMeasure = parseInt(parts[0], 10);
            this.beatUnit = parseInt(parts[1], 10);
            this.currentBeatInMeasure = 0;
            logger.log(`Time signature set to: ${this.beatsPerMeasure}/${this.beatUnit}`);
            this._notifyStateChange();
        }

        if (wasPlaying) await this.togglePlay();
    }

    setVolume(newVolumePercent) {
        this.beepVolume = Math.max(0, Math.min(1, newVolumePercent / 100));
    }

    async resetCounterAndTimer() {
        const wasPlaying = this.isPlaying;
        if (wasPlaying) this.stop();

        this.totalBeatsPlayed = 0;
        this.currentBeatInMeasure = 0;
        this.elapsedTimeInSeconds = 0;
        this._notifyStateChange();

        if (wasPlaying) await this.togglePlay();
    }

    _startPlayback() {
        if (this.isPlaying) return;
    
        this.isPlaying = true;
        logger.log(`Starting playback. AC State: ${this.audioContext.state}`);

        // Prime the audio context right before the first beat to prevent issues on some platforms
        try {
            const primerOscillator = this.audioContext.createOscillator();
            const primerGain = this.audioContext.createGain();
            primerOscillator.connect(primerGain);
            primerGain.connect(this.audioContext.destination);
            primerGain.gain.setValueAtTime(0.0001, this.audioContext.currentTime);
            primerOscillator.frequency.setValueAtTime(20, this.audioContext.currentTime);
            primerOscillator.type = 'sine';
            primerOscillator.start(this.audioContext.currentTime);
            primerOscillator.stop(this.audioContext.currentTime + 0.01);
        } catch (primeError) {
            logger.log(`CRITICAL ERROR during priming: ${primeError.message}. Playback aborted.`, 'error');
            this.isPlaying = false;
            this._notifyStateChange();
            return;
        }

        this._beat(); // Play the first beat immediately
        const intervalTime = (60 / this.bpm) * 1000;
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(this._beat, intervalTime);
        this._startTimerInterval();
        this._notifyStateChange();
    }

    stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        clearInterval(this.intervalId);
        this.intervalId = null;
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
            this.timerIntervalId = null;
        }
        this._notifyStateChange();
    }
    _startTimerInterval() {
        if (this.timerIntervalId) clearInterval(this.timerIntervalId);
        this.timerIntervalId = setInterval(() => {
            this.elapsedTimeInSeconds++;
            this._notifyStateChange();
        }, 1000);
    }

    async togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            const audioReady = await this._ensureAudioIsReady();

            if (audioReady) {
                this._startPlayback();
            } else {
                logger.log("togglePlay: Playback aborted, audio context not ready.", 'error');
                // Ensure state is correct and UI is notified
                this.isPlaying = false;
                this._notifyStateChange();
            }
        }
    }

    _beat() {
        this.currentBeatInMeasure++;
        // Reset currentBeatInMeasure if it exceeds beatsPerMeasure
        if (this.currentBeatInMeasure > this.beatsPerMeasure) {
            this.currentBeatInMeasure = 1;
        }
        this.totalBeatsPlayed++;
        this._playBeep(this.currentBeatInMeasure === 1);

        this.isPulsing = true;
        this._notifyStateChange();

        setTimeout(() => {
            if (this.isPlaying) {
                this.isPulsing = false;
                this._notifyStateChange();
            }
        }, 100);
    }

    _playBeep(isAccent = false) {
        if (!this.audioContext) {
            logger.log("Metronome._playBeep: AudioContext is null. Skipping beep.", 'warn');
            return;
        }
        if (!this.audioContext.destination) {
            logger.log(`Metronome._playBeep: AudioContext.destination is not available. AudioContext state: ${this.audioContext.state}. Skipping beep.`, 'warn');
            return;
        }
        if (this.audioContext.state !== 'running') {
            logger.log(`Metronome._playBeep: AudioContext not 'running'. State: ${this.audioContext.state}. Skipping beep.`, 'warn');
            return;
        }

        const currentTime = this.audioContext.currentTime;
        const targetFrequency = isAccent ? 880 : 580;
        const targetGain = isAccent ? this.beepVolume * 1.8 : this.beepVolume;
        const finalVolume = Math.min(1.0, Math.max(0.0, targetGain));
        const duration = 0.028;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'triangle';

        oscillator.frequency.setValueAtTime(targetFrequency, currentTime);
        gainNode.gain.setValueAtTime(finalVolume, currentTime);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);
    }

    destroy() {
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    }
}

class MetronomeApp {
    constructor() {
        if (!this._cacheDOMElements()) {
            logger.log("MetronomeApp: One or more essential DOM elements are missing. App will not run.", 'error');
            return;
        }

        this.baseIndicatorColor = getComputedStyle(this.appContainer).backgroundColor;

        this.metronome = new Metronome({
            bpm: parseInt(this.tempoInput.value, 10),
            minTempo: parseInt(this.tempoSlider.min, 10),
            maxTempo: parseInt(this.tempoSlider.max, 10),
            beepVolume: parseInt(this.volumeControlSlider.value, 10) / 100,
            onStateChange: this._render.bind(this)
        });

        this._bindEventListeners();
        this._initializeUI();
        logger.log("Metronome App initialized.");
    }

    _cacheDOMElements() {
        this.appContainer = document.querySelector('.metronome-app-container');
        this.tempoSlider = document.getElementById('tempoSlider');
        this.tempoInput = document.getElementById('tempoInput');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.indicatorPalette = document.getElementById('indicatorColorPalette');
        this.beatCountDisplayEl = document.getElementById('beatCountDisplay');
        this.runningTimerDisplayEl = document.getElementById('runningTimerDisplay');
        this.tempoDecrementBtn = document.getElementById('tempoDecrementBtn');
        this.tempoIncrementBtn = document.getElementById('tempoIncrementBtn');
        this.menuToggleBtn = document.getElementById('menuToggleBtn');
        this.sideMenu = document.getElementById('sideMenu');
        this.closeMenuBtnInside = document.getElementById('closeMenuBtnInside');
        this.timeSignatureSelect = document.getElementById('timeSignature');
        this.volumeControlSlider = document.getElementById('volumeControl');
        this.resetTimerBtn = document.getElementById('resetTimerBtn');

        return this.tempoSlider && this.tempoInput && this.playPauseBtn && this.appContainer;
    }

    _initializeUI() {
        const initialState = this.metronome._getState();
        this.tempoSlider.value = initialState.bpm;
        this.tempoInput.value = initialState.bpm;
        this.metronome.setTimeSignature(this.timeSignatureSelect.value);
        this.metronome.setVolume(parseInt(this.volumeControlSlider.value, 10));

        // Set initial selected color
        const colorButtons = this.indicatorPalette.querySelectorAll('.color-button');
        colorButtons.forEach(button => {
            if (button.dataset.color === this.metronome.pulseColor) {
                button.classList.add('selected');
            }
        });

        // Set initial menu state
        const isInitiallyOpen = this.sideMenu.classList.contains('open');
        this.menuToggleBtn.setAttribute('aria-expanded', isInitiallyOpen);
        this.menuToggleBtn.textContent = isInitiallyOpen ? 'Close Menu' : 'Expand Menu';
        this.sideMenu.setAttribute('aria-hidden', !isInitiallyOpen);
        this.sideMenu.inert = !isInitiallyOpen;
    }

    _render(state) {
        // Update BPM controls
        this.tempoSlider.value = state.bpm;
        this.tempoInput.value = state.bpm;

        // Update play/pause button
        if (state.isPlaying) {
            this.playPauseBtn.classList.remove('green-button');
            this.playPauseBtn.classList.add('red-button', 'playing');
            this.playPauseBtn.setAttribute('aria-label', 'Pause');
        } else {
            this.playPauseBtn.classList.remove('red-button', 'playing');
            this.playPauseBtn.classList.add('green-button');
            this.playPauseBtn.setAttribute('aria-label', 'Play');
        }

        // Update beat count and timer displays
        this.beatCountDisplayEl.textContent = state.totalBeatsPlayed;
        const time = state.elapsedTimeInSeconds;
        const minutes = String(Math.floor((time % 3600) / 60)).padStart(2, '0');
        const seconds = String(time % 60).padStart(2, '0');
        this.runningTimerDisplayEl.textContent = `${minutes}:${seconds}`;

        // Update visual pulse indicator
        this.appContainer.style.backgroundColor = state.isPulsing ? state.pulseColor : this.baseIndicatorColor;
    }

    _toggleMenu() {
        const isOpen = this.sideMenu.classList.toggle('open');
        this.menuToggleBtn.setAttribute('aria-expanded', isOpen);
        this.menuToggleBtn.textContent = isOpen ? 'Close Menu' : 'Expand Menu';
        this.sideMenu.setAttribute('aria-hidden', !isOpen);
        this.sideMenu.inert = !isOpen;

        if (isOpen) {
            this.closeMenuBtnInside?.focus();
        } else {
            this.menuToggleBtn.focus();
        }
    }

    _bindEventListeners() {
        // Main controls
        this.playPauseBtn.addEventListener('click', () => this.metronome.togglePlay());
        this.tempoSlider.addEventListener('input', (e) => this.metronome.setTempo(parseInt(e.target.value, 10)));
        this.tempoInput.addEventListener('input', (e) => this.metronome.setTempo(parseInt(e.target.value, 10)));
        this.tempoDecrementBtn.addEventListener('click', () => this.metronome.setTempo(this.metronome.bpm - 1));
        this.tempoIncrementBtn.addEventListener('click', () => this.metronome.setTempo(this.metronome.bpm + 1));

        // Menu controls
        this.menuToggleBtn.addEventListener('click', () => this._toggleMenu());
        this.closeMenuBtnInside.addEventListener('click', () => this._toggleMenu());

        // Advanced settings
        this.timeSignatureSelect.addEventListener('change', (e) => this.metronome.setTimeSignature(e.target.value));
        this.volumeControlSlider.addEventListener('input', (e) => this.metronome.setVolume(parseInt(e.target.value, 10)));
        this.resetTimerBtn.addEventListener('click', () => this.metronome.resetCounterAndTimer());

        // Color palette
        this.indicatorPalette.addEventListener('click', (e) => {
            const button = e.target.closest('.color-button');
            if (!button) return;

            const newColor = button.dataset.color;
            this.metronome.setPulseColor(newColor);

            // Update selected state on buttons
            this.indicatorPalette.querySelectorAll('.color-button').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MetronomeApp();
    // in a single-page application, you might want to call metronome.destroy().
    // window.addEventListener('beforeunload', () => { if (app && app.metronome) app.metronome.destroy(); });
});