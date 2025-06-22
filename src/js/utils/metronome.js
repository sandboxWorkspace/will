import { logger } from './iosDebug.js';

export class Metronome {
    constructor(options = {}) {
        this.tempoSlider = document.getElementById(options.tempoSliderId || 'tempoSlider');
        this.tempoInput = document.getElementById(options.tempoInputId || 'tempoInput');
        this.playPauseBtn = document.getElementById(options.playPauseBtnId || 'playPauseBtn');
        this.appContainer = document.querySelector(options.appContainerSelector || '.metronome-app-container');
        this.indicatorPalette = document.getElementById(options.indicatorPaletteId || 'indicatorColorPalette');
        // Display elements for beat count and timer, managed by Metronome class
        this.beatCountDisplayEl = document.getElementById(options.beatCountDisplayId || 'beatCountDisplay');
        this.runningTimerDisplayEl = document.getElementById(options.runningTimerDisplayId || 'runningTimerDisplay');
        this.tempoDecrementBtn = document.getElementById(options.tempoDecrementBtnId || 'tempoDecrementBtn');
        this.tempoIncrementBtn = document.getElementById(options.tempoIncrementBtnId || 'tempoIncrementBtn');

        // Note: volumeControlSlider is handled by MetronomeApp
        if (!this.tempoSlider || !this.tempoInput || !this.playPauseBtn || !this.appContainer || !this.indicatorPalette || !this.tempoDecrementBtn || !this.tempoIncrementBtn) {
            console.error("Metronome Class: Essential DOM elements missing. Ensure IDs/selectors match HTML.");
            this.valid = false;
            return;
        }
        this.valid = true;

        this.defaultPulseColor = '#E74C3C'; // Default red
        this.bpm = parseInt(this.tempoInput.value, 10);
        this.isPlaying = false;
        this.intervalId = null;
        this.baseIndicatorColor = getComputedStyle(this.appContainer).backgroundColor; // Store initial background
        this.pulseColor = this.defaultPulseColor; // Initialize with defaultPulseColor

        this.beatsPerMeasure = 1;
        this.beatUnit = 4;
        this.currentBeatInMeasure = 0;
        this.totalBeatsPlayed = 0;
        this.elapsedTimeInSeconds = 0;
        this.timerIntervalId = null;
        this.audioContext = null;
        this.beepVolume = 0.1;

        this._updateTempo = this._updateTempo.bind(this);
        this.togglePlay = this.togglePlay.bind(this);
        this._beat = this._beat.bind(this);
        this._updateIndicatorColor = this._updateIndicatorColor.bind(this);
        this._playBeep = this._playBeep.bind(this);
        this.setTimeSignature = this.setTimeSignature.bind(this);
        this.resetCounterAndTimer = this.resetCounterAndTimer.bind(this);
        this._updateBeatCountDisplay = this._updateBeatCountDisplay.bind(this);
        this._updateTimerDisplay = this._updateTimerDisplay.bind(this);
    }

    initialize() {
        if (!this.valid) return;

        this.tempoSlider.value = this.bpm;
        this.tempoInput.value = this.bpm;
        this.pulseColor = this.defaultPulseColor;
        this._updateBeatCountDisplay();
        this._updateTimerDisplay();

        // The 'input' event is sufficient for live updates from both the slider and the text field.
        this.tempoSlider.addEventListener('input', (e) => this._updateTempo(parseInt(e.target.value, 10)));
        this.tempoInput.addEventListener('input', (e) => this._updateTempo(parseInt(e.target.value, 10)));
        this.tempoDecrementBtn.addEventListener('click', () => this._updateTempo(this.bpm - 1));
        this.tempoIncrementBtn.addEventListener('click', () => this._updateTempo(this.bpm + 1));
        this.playPauseBtn.addEventListener('click', this.togglePlay);
        
        const colorButtons = this.indicatorPalette.querySelectorAll('.color-button');
        colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const newColor = button.dataset.color;
                this._updateIndicatorColor(newColor);
                
                colorButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
            });
            if (button.dataset.color === this.pulseColor) {
                button.classList.add('selected');
            }
        });

        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this._handleVisibilityChange);

        logger.log("Metronome initialized.");
        this._updateIndicatorColor(this.defaultPulseColor);
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
        if (this.audioContext && this.audioContext.state === 'running') {
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

    _updateTempo(newTempo) {
        const minTempo = parseInt(this.tempoSlider.min, 10) || 8; // Read from element or fallback
        const maxTempo = parseInt(this.tempoSlider.max, 10) || 280; // Read from element or fallback

        if (isNaN(newTempo)) newTempo = this.bpm; // Revert to current if invalid input
        newTempo = Math.max(minTempo, Math.min(maxTempo, newTempo)); // Clamp value

        this.bpm = newTempo;
        this.tempoSlider.value = this.bpm;
        this.tempoInput.value = this.bpm;

        // If playing, immediately update the interval
        if (this.isPlaying) {
            clearInterval(this.intervalId);
            const intervalTime = (60 / this.bpm) * 1000;
            this.intervalId = setInterval(this._beat, intervalTime);
        }
    }

    _updateIndicatorColor(newColor) {
        this.pulseColor = newColor;
        // If playing, the next beat will use the new color. If stopped, no immediate visual change.
    }
    
    setTimeSignature(signatureString) {
        if (!this.valid) return;
        const parts = signatureString.split('/');
        if (parts.length === 2) {
            this.beatsPerMeasure = parseInt(parts[0], 10);
            this.beatUnit = parseInt(parts[1], 10); // beatUnit is stored but not directly used in current simple beep
            this.currentBeatInMeasure = 0; // Reset beat count on signature change
            logger.log(`Time signature set to: ${this.beatsPerMeasure}/${this.beatUnit}`);
            // If playing, restart to apply new signature immediately
            if (this.isPlaying) { this.stop(); this.togglePlay(); }
        }
    }
    setVolume(newVolumePercent) {
        // Map 0-100 slider value to 0.0-1.0 gain value
        this.beepVolume = Math.max(0, Math.min(1, newVolumePercent / 100));
    }

    resetCounterAndTimer() {
        if (!this.valid) return;

        const wasCurrentlyPlaying = this.isPlaying;

        if (wasCurrentlyPlaying) {
            this.stop();
        }

        this.totalBeatsPlayed = 0;
        this.currentBeatInMeasure = 0;
        this.elapsedTimeInSeconds = 0;

        this._updateBeatCountDisplay();
        this._updateTimerDisplay();

        // If it was playing before reset, start it again.
        if (wasCurrentlyPlaying) {
            this.togglePlay();
        }
    }

    _updateBeatCountDisplay() {
        if (this.beatCountDisplayEl) {
            this.beatCountDisplayEl.textContent = this.totalBeatsPlayed;
        }
    }

    _updateTimerDisplay() {
        if (this.runningTimerDisplayEl) {
            const time = this.elapsedTimeInSeconds;
            // const hours = String(Math.floor(time / 3600)).padStart(2, '0'); // Not currently displayed
            const minutes = String(Math.floor((time % 3600) / 60)).padStart(2, '0');
            const seconds = String(time % 60).padStart(2, '0');
            this.runningTimerDisplayEl.textContent = `${minutes}:${seconds}`;
        }
    }

    _startPlayback() {
        if (this.isPlaying || !this.valid) return;
    
        this.isPlaying = true;
        this._updatePlayButtonUI(true);
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
            this._updatePlayButtonUI(false);
            return;
        }

        this._beat(); // Play the first beat immediately
        const intervalTime = (60 / this.bpm) * 1000;
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(this._beat, intervalTime);
        this._startTimerInterval();
    }

    stop() {
        if (!this.isPlaying || !this.valid) return;
        this.isPlaying = false;
        this._updatePlayButtonUI(false);
        clearInterval(this.intervalId);
        this.intervalId = null;
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
            this.timerIntervalId = null;
        }
        // Update displays to reflect final state upon stopping
        this._updateBeatCountDisplay();
        this._updateTimerDisplay();

        this.appContainer.style.backgroundColor = this.baseIndicatorColor; // Reset to base color
    }

    _updatePlayButtonUI(isPlaying) {
        if (isPlaying) {
            this.playPauseBtn.classList.remove('green-button');
            this.playPauseBtn.classList.add('red-button', 'playing');
            this.playPauseBtn.setAttribute('aria-label', 'Pause');
        } else {
            this.playPauseBtn.classList.remove('red-button', 'playing');
            this.playPauseBtn.classList.add('green-button');
            this.playPauseBtn.setAttribute('aria-label', 'Play');
        }
    }

    _startTimerInterval() {
        if (this.timerIntervalId) clearInterval(this.timerIntervalId);
        this.timerIntervalId = setInterval(() => {
            this.elapsedTimeInSeconds++;
            this._updateTimerDisplay();
        }, 1000);
    }

    async togglePlay() {
        if (!this.valid) return;

        if (this.isPlaying) {
            logger.log("togglePlay: Stopping metronome.");
            this.stop();
        } else {
            logger.log("togglePlay: Attempting to play metronome.");
            const audioReady = await this._ensureAudioIsReady();

            if (audioReady) {
                this._startPlayback();
            } else {
                logger.log("togglePlay: Playback aborted, audio context not ready.", 'error');
                this.isPlaying = false;
                this._updatePlayButtonUI(false);
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
        this._updateBeatCountDisplay();

        const isAccent = this.currentBeatInMeasure === 1;
        this.appContainer.style.backgroundColor = this.pulseColor; // Pulse with selected color
        this._playBeep(isAccent); // Play the beep, possibly accented

        setTimeout(() => {
            if (this.isPlaying) { // Only reset color if metronome is still supposed to be playing
                this.appContainer.style.backgroundColor = this.baseIndicatorColor; // Return to base color
            }
        }, 100);
    }

    _playBeep(isAccent = false) {
        if (!this.valid) { // this.valid is about DOM elements, less likely the audio cause
            logger.log("Metronome._playBeep: Metronome instance is not valid (this.valid is false). Skipping beep.", 'warn');
            return;
        }
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
        const targetGain = isAccent ? this.beepVolume * 1.8 : this.beepVolume; // Accent is 1.8x louder
        const finalVolume = Math.min(1.0, Math.max(0.0, targetGain)); // Clamp between 0 and 1
        const duration = 0.028;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'triangle'; // Or 'sine' for a softer test

        oscillator.frequency.setValueAtTime(targetFrequency, currentTime);
        gainNode.gain.setValueAtTime(finalVolume, currentTime);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);
    }

    destroy() {
        if (!this.valid) return;
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    }
}

class MetronomeApp {
    constructor() {
        this.metronome = new Metronome({
            tempoSliderId: 'tempoSlider',
            tempoInputId: 'tempoInput',
            playPauseBtnId: 'playPauseBtn',
            appContainerSelector: '.metronome-app-container',
            indicatorPaletteId: 'indicatorColorPalette',
            beatCountDisplayId: 'beatCountDisplay',
            runningTimerDisplayId: 'runningTimerDisplay',
            tempoDecrementBtnId: 'tempoDecrementBtn',
            tempoIncrementBtnId: 'tempoIncrementBtn'
        });

        this.menuToggleBtn = document.getElementById('menuToggleBtn');
        this.sideMenu = document.getElementById('sideMenu');
        this.closeMenuBtnInside = document.getElementById('closeMenuBtnInside');
        
        this.timeSignatureSelect = document.getElementById('timeSignature');
        this.volumeControlSlider = document.getElementById('volumeControl');
        this.resetTimerBtn = document.getElementById('resetTimerBtn');

        this._bindEventListeners();
        this.initialize();
    }

    initialize() {
        if (!this.metronome.valid) {
            logger.log("MetronomeApp: Metronome core failed to initialize.", 'error');
            return;
        }

        if (!this.menuToggleBtn || !this.sideMenu) {
            logger.log("MetronomeApp: Side menu elements not found.", 'warn');
        }
        
        this.metronome.initialize(); 
        logger.log("Metronome App initialized.");
    }

    _toggleMenu() {
        if (!this.sideMenu || !this.menuToggleBtn) return;
        const isOpen = this.sideMenu.classList.toggle('open');

        this.menuToggleBtn.setAttribute('aria-expanded', isOpen);
        this.menuToggleBtn.textContent = isOpen ? 'Close Menu' : 'Expand Menu';
        this.sideMenu.setAttribute('aria-hidden', !isOpen);
        this.sideMenu.inert = !isOpen;

        if (isOpen) {
            // When the menu opens, move focus to an element inside it for accessibility.
            if (this.closeMenuBtnInside) {
                this.closeMenuBtnInside.focus();
            }
        } else {
            // When the menu closes, return focus to the button that opened it.
            // This prevents the "aria-hidden element has focus" warning.
            this.menuToggleBtn.focus();
        }
    }

    _bindEventListeners() {
        if (this.menuToggleBtn && this.sideMenu) {
            // Set initial state from HTML and add listener
            const isInitiallyOpen = this.sideMenu.classList.contains('open');
            this.menuToggleBtn.setAttribute('aria-expanded', isInitiallyOpen);
            this.menuToggleBtn.textContent = isInitiallyOpen ? 'Close Menu' : 'Expand Menu';
            this.sideMenu.setAttribute('aria-hidden', !isInitiallyOpen);
            this.sideMenu.inert = !isInitiallyOpen;

            this.menuToggleBtn.addEventListener('click', () => this._toggleMenu());
        }

        if (this.closeMenuBtnInside) {
            this.closeMenuBtnInside.addEventListener('click', () => this._toggleMenu());
        }

        if (this.timeSignatureSelect) {
            this.metronome.setTimeSignature(this.timeSignatureSelect.value);
            this.timeSignatureSelect.addEventListener('change', (e) => this.metronome.setTimeSignature(e.target.value));
        }

        if (this.volumeControlSlider && this.metronome) {
            this.volumeControlSlider.addEventListener('input', (e) => {
                this.metronome.setVolume(parseInt(e.target.value, 10));
            });
            this.metronome.setVolume(parseInt(this.volumeControlSlider.value, 10));
        }

        if (this.resetTimerBtn && this.metronome) {
            this.resetTimerBtn.addEventListener('click', () => {
                this.metronome.resetCounterAndTimer();
                
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MetronomeApp();
    // in a single-page application, you might want to call metronome.destroy().
    // window.addEventListener('beforeunload', () => { if (app && app.metronome) app.metronome.destroy(); });
});