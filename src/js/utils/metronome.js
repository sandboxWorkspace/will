import { logger } from './iosDebug.js';

export class Metronome {
    constructor(options = {}) {
        this.tempoSlider = document.getElementById(options.tempoSliderId || 'tempoSlider');
        // Ensure all getElementById calls are robust
        this.tempoInput = document.getElementById(options.tempoInputId || 'tempoInput');
        this.playPauseBtn = document.getElementById(options.playPauseBtnId || 'playPauseBtn');
        this.appContainer = document.querySelector(options.appContainerSelector || '.metronome-app-container');
        this.indicatorPalette = document.getElementById(options.indicatorPaletteId || 'indicatorColorPalette');
        // Display elements for beat count and timer, managed by Metronome class
        this.beatCountDisplayEl = document.getElementById(options.beatCountDisplayId || 'beatCountDisplay');
        this.runningTimerDisplayEl = document.getElementById(options.runningTimerDisplayId || 'runningTimerDisplay');

        // Note: volumeControlSlider is handled by MetronomeApp
        if (!this.tempoSlider || !this.tempoInput || !this.playPauseBtn || !this.appContainer || !this.indicatorPalette) {
            console.error("Metronome Class: Essential DOM elements missing. Ensure IDs/selectors match HTML.");
            this.valid = false;
            return;
        }
        this.valid = true;

        this.defaultPulseColor = '#E74C3C'; // Default red
        this.bpm = parseInt(this.tempoInput.value, 10);
        this.isPlaying = false;
        this.intervalId = null; // Renamed for clarity (setInterval)
        this.baseIndicatorColor = getComputedStyle(this.appContainer).backgroundColor; // Store initial background
        this.pulseColor = this.defaultPulseColor; // Initialize with defaultPulseColor
        this.wasPlayingBeforeTempoChange = false; // Flag for muting during adjustment

        this.beatsPerMeasure = 1; // Default time signature to match HTML
        this.beatUnit = 4;        // Default time signature
        this.currentBeatInMeasure = 0;
        this.totalBeatsPlayed = 0;
        this.elapsedTimeInSeconds = 0;
        this.timerIntervalId = null;
        this.audioContext = null;
        this.beepVolume = 0.1; // Volume for the beep (0.0 to 1.0)

        this._updateTempo = this._updateTempo.bind(this);
        this.togglePlay = this.togglePlay.bind(this);
        this._beat = this._beat.bind(this);
        this._updateIndicatorColor = this._updateIndicatorColor.bind(this);
        this._playBeep = this._playBeep.bind(this);
        this.setTimeSignature = this.setTimeSignature.bind(this);
        this.resetCounterAndTimer = this.resetCounterAndTimer.bind(this);
        this._updateBeatCountDisplay = this._updateBeatCountDisplay.bind(this);
        this._updateTimerDisplay = this._updateTimerDisplay.bind(this);
        this.ensureAudioUnlocked = this.ensureAudioUnlocked.bind(this);
    }

    initialize() {
        if (!this.valid) return;

        this.tempoSlider.value = this.bpm;
        this.tempoInput.value = this.bpm;
        this.pulseColor = this.defaultPulseColor;
        this._updateBeatCountDisplay(); // Initialize display
        this._updateTimerDisplay();     // Initialize display
        // No initial color set for appContainer background pulse, color picker sets pulseColor

        this.tempoSlider.addEventListener('input', (e) => this._updateTempo(parseInt(e.target.value, 10)));
        this.tempoSlider.addEventListener('mousedown', () => this._handleTempoInteractionStart());
        this.tempoSlider.addEventListener('touchstart', () => this._handleTempoInteractionStart(), { passive: true });
        this.tempoSlider.addEventListener('mouseup', () => this._handleTempoInteractionEnd());
        this.tempoSlider.addEventListener('touchend', () => this._handleTempoInteractionEnd());
        this.tempoInput.addEventListener('input', (e) => this._updateTempo(parseInt(e.target.value, 10))); // Use input for live updates
        this.tempoInput.addEventListener('focus', () => this._handleTempoInteractionStart());
        this.tempoInput.addEventListener('blur', () => this._handleTempoInteractionEnd());
        this.playPauseBtn.addEventListener('click', this.togglePlay);
        
        const colorButtons = this.indicatorPalette.querySelectorAll('.color-button');
        colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const newColor = button.dataset.color;
                this._updateIndicatorColor(newColor);
                
                // Update selected state
                colorButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
            });
            // Set initial selected state for the default color
            if (button.dataset.color === this.pulseColor) {
                button.classList.add('selected');
            }
        });

        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this._handleVisibilityChange);

        logger.log("Metronome initialized.");
        this._updateIndicatorColor(this.defaultPulseColor); // Ensure default is applied
    }

    async ensureAudioUnlocked() {
        logger.log("Attempting to unlock audio...");
        if (this.audioContext && this.audioContext.state === 'running') {
            logger.log("AudioContext already running.");
            return true;
        }
        const unlockAudioEl = document.getElementById('unlockAudioElement');
        if (unlockAudioEl) {
            try {
                await unlockAudioEl.play();
                this._logToUI("Played dummy HTML5 audio element successfully.");
            } catch (err) {
                logger.log(`Error playing dummy HTML5 audio: ${err}`, 'warn');
                // Continue, as AudioContext might still resume
            }
        }

        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                logger.log("AudioContext created during unlock process.");
            } catch (e) {
                logger.log(`Failed to create AudioContext during unlock: ${e}`, 'error');
                return false;
            }
        }

        if (this.audioContext.state === 'suspended') {
            return this.audioContext.resume().then(() => {
                logger.log(`AudioContext resumed during unlock. State: ${this.audioContext.state}`);
                return this.audioContext.state === 'running';
            }).catch(err => {
                logger.log(`Error resuming AudioContext during unlock: ${err}`, 'error');
                return false;
            });
        }
        return this.audioContext.state === 'running';
    }

    _handleVisibilityChange() {
        if (!this.audioContext) return; // No audio context to manage yet

        if (document.visibilityState === 'visible') {
            if (this.audioContext.state === 'suspended') {
                logger.log("Page visible, AudioContext suspended. Attempting resume.");
                this.audioContext.resume().then(() => {
                    logger.log(`AudioContext resumed on visibility. State: ${this.audioContext.state}`);
                }).catch(err => {
                    logger.log(`Error resuming AudioContext on visibility: ${err}`, 'error');
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

    _handleTempoInteractionStart() {
        // This method is now less critical for playback control during tempo change,
        // as _updateTempo handles live updates. It can be used for other UI cues if needed.
    }

    _handleTempoInteractionEnd() {
        // Ensure the final value from slider/input is processed.
        const finalTempo = parseInt(this.tempoSlider.value, 10);
        this._updateTempo(finalTempo);
        // If metronome was playing, _updateTempo already restarted the interval.
        // If it was not playing, it remains not playing.
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
        }
        // If playing, restart to apply new signature immediately
        if (this.isPlaying) { this.stop(); this.play(); }
    }
    setVolume(newVolumePercent) {
        // Map 0-100 slider value to 0.0-1.0 gain value
        this.beepVolume = Math.max(0, Math.min(1, newVolumePercent / 100));
    }

    resetCounterAndTimer() {
        if (!this.valid) return;

        const wasCurrentlyPlaying = this.isPlaying; // Store current playing state

        if (wasCurrentlyPlaying) {
            this.stop(); // Stop the metronome: clears intervals, resets UI, sets isPlaying to false.
        }

        // Reset core state variables
        this.totalBeatsPlayed = 0;
        this.currentBeatInMeasure = 0; // Also reset current beat in measure
        this.elapsedTimeInSeconds = 0;

        // Explicitly clear timerIntervalId if it exists (stop() should handle it if wasPlaying)
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
            this.timerIntervalId = null;
        }

        this._updateBeatCountDisplay(); // Update display
        this._updateTimerDisplay();     // Update display

        // If it was playing before reset, start it again.
        if (wasCurrentlyPlaying) {
            this.play(); // play() will handle the immediate first beat, start the timer interval, and update UI.
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

    async play() { // Make the play method asynchronous
        if (this.isPlaying || !this.valid) return;
        // Optimistically set isPlaying, but revert if audio setup fails
        this.isPlaying = true; 

        // Ensure audio is unlocked before proceeding
        const audioUnlocked = await this.ensureAudioUnlocked();
        if (!audioUnlocked) {
            logger.log("Audio could not be unlocked or started. Playback aborted.", 'error');
            this.isPlaying = false;
            this._updatePlayButtonUI(false);
            return;
        }

        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                logger.log("AudioContext created.");
            } catch (e) {
                logger.log(`Failed to create AudioContext: ${e}`, 'error');
                this.isPlaying = false;
                this._updatePlayButtonUI(false);
                return;
            }
        }

        if (this.audioContext.state === 'suspended') {
            logger.log("AudioContext suspended, attempting resume...");
            try {
                await this.audioContext.resume(); // Wait for the resume promise to resolve
                logger.log(`AudioContext resumed. State: ${this.audioContext.state}`);
            } catch (err) {
                logger.log(`Error resuming AudioContext: ${err}`, 'error');
                this.isPlaying = false;
                this._updatePlayButtonUI(false);
                return;
            }
        }

        if (this.audioContext.state !== 'running') {
            logger.log(`AudioContext not 'running' after setup. State: ${this.audioContext.state}. Sound may not play.`, 'warn');
            this.isPlaying = false;
            this._updatePlayButtonUI(false);
            return;
        }

        // Prime the audio context - play a tiny, almost silent sound
        // This can help ensure the audio pathway is open on some mobile browsers
        try {
            const primerOscillator = this.audioContext.createOscillator();
            const primerGain = this.audioContext.createGain();
            primerOscillator.connect(primerGain);
            primerGain.connect(this.audioContext.destination);
            
            primerGain.gain.setValueAtTime(0.0001, this.audioContext.currentTime); // Very quiet
            primerOscillator.frequency.setValueAtTime(20, this.audioContext.currentTime); // Low frequency
            primerOscillator.type = 'sine';
            
            primerOscillator.start(this.audioContext.currentTime);
            primerOscillator.stop(this.audioContext.currentTime + 0.01); // Play for 10ms
            logger.log("AudioContext primed.");
        } catch (primeError) {
            logger.log(`Could not prime AudioContext: ${primeError}`, 'warn');
            // Continue anyway, main sound might still work
        }

        // If we've reached here, AudioContext should be running and isPlaying is true.
        this._updatePlayButtonUI(true);

        const intervalTime = (60 / this.bpm) * 1000;
        if (this.intervalId) clearInterval(this.intervalId); // Ensure no duplicate intervals
        this.intervalId = setInterval(this._beat, intervalTime);
        this._startTimerInterval(); // Timer starts, but first beat won't count towards total yet
        this._beat(true); // Immediate first beat, marked as initial
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
            this._updateTimerDisplay(); // Update timer display from Metronome
        }, 1000);
    }

    togglePlay() {
        if (!this.valid) return;
        this.isPlaying ? this.stop() : this.play();
    }

    _beat(isInitialBeat = false) {
        // If it's not the very first beat triggered by play(), increment counters.
        if (!isInitialBeat) {
            this.currentBeatInMeasure++;
            this.totalBeatsPlayed++;
            this._updateBeatCountDisplay(); // Update beat count display from Metronome
            // Reset currentBeatInMeasure if it exceeds beatsPerMeasure
            if (this.currentBeatInMeasure > this.beatsPerMeasure) {
                this.currentBeatInMeasure = 1;
            }
        }

        // Determine if this beat should be accented.
        // It's an accent if it's the initial beat from play() OR if it's the first beat in a measure.
        const isAccent = isInitialBeat || this.currentBeatInMeasure === 1;

        this.appContainer.style.backgroundColor = this.pulseColor; // Pulse with selected color
        this._playBeep(isAccent); // Play the beep, possibly accented

        setTimeout(() => {
            if (this.isPlaying) { // Only reset color if metronome is still supposed to be playing
                this.appContainer.style.backgroundColor = this.baseIndicatorColor; // Return to base color
            }
        }, 100);
    }

    _playBeep(isAccent = false) {
        if (!this.audioContext || !this.valid || !this.audioContext.destination) {
            logger.log("Metronome._playBeep: AudioContext not available, invalid, or no destination.", 'warn');
            return;
        }
        if (this.audioContext.state !== 'running') {
            logger.log(`Metronome._playBeep: AudioContext not 'running'. State: ${this.audioContext.state}. Skipping beep.`, 'warn');
            return;
        }

        const currentTime = this.audioContext.currentTime;
        const targetFrequency = isAccent ? 880 : 580;
        // Use the actual beepVolume set by the user/default
        const targetGain = isAccent ? this.beepVolume * 1.8 : this.beepVolume; // Accent is 1.8x louder
        const finalVolume = Math.min(1.0, Math.max(0.0, targetGain)); // Clamp between 0 and 1
        const duration = 0.030; // Reverted to 30ms for a crisp click

        logger.log(`_playBeep: Accent: ${isAccent}, Freq: ${targetFrequency}, GainVal: ${finalVolume.toFixed(3)}, ActualBeepVol: ${this.beepVolume.toFixed(3)}, Duration: ${duration}s, AC_Time: ${currentTime.toFixed(3)}`);

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'triangle'; // Or 'sine' for a softer test

        oscillator.frequency.setValueAtTime(targetFrequency, currentTime);
        gainNode.gain.setValueAtTime(finalVolume, currentTime);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);
        logger.log(`_playBeep: Oscillator started at ${currentTime.toFixed(3)}, scheduled to stop at ${(currentTime + duration).toFixed(3)}`);
    }

    destroy() {
        if (!this.valid) return;
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    }
}

// MetronomeApp class remains largely the same but could also use the logger
// if its console.error/warn calls are intended for the UI debug log.
class MetronomeApp {
    constructor() {
        this.metronome = new Metronome({
            tempoSliderId: 'tempoSlider',
            tempoInputId: 'tempoInput',
            playPauseBtnId: 'playPauseBtn',
            appContainerSelector: '.metronome-app-container', // Selector for the main container
            indicatorPaletteId: 'indicatorColorPalette', // Changed to palette ID
            beatCountDisplayId: 'beatCountDisplay', // Pass ID for Metronome to manage
            runningTimerDisplayId: 'runningTimerDisplay' // Pass ID for Metronome to manage
        });

        // Side Menu Elements
        this.menuToggleBtn = document.getElementById('menuToggleBtn');
        this.sideMenu = document.getElementById('sideMenu');
        this.closeMenuBtnInside = document.getElementById('closeMenuBtnInside');
        
        // Audio Unlock UI
        // this.enableAudioBtn = document.getElementById('enableAudioBtn'); // No longer needed
        // this.metronomeMainUIDiv = document.getElementById('metronomeMainUI'); // No longer needed for this logic

        // Future Feature UI Placeholders
        this.timeSignatureSelect = document.getElementById('timeSignature'); // Still needed for app-level event binding
        this.volumeControlSlider = document.getElementById('volumeControl'); // Still needed for app-level event binding
        this.beatCountDisplay = document.getElementById('beatCountDisplay'); // App can still hold a reference if needed for other logic
        this.runningTimerDisplay = document.getElementById('runningTimerDisplay');
        this.resetTimerBtn = document.getElementById('resetTimerBtn');

        this._bindEvents();
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
        
        // Initialize the metronome directly.
        // Audio unlocking will be handled by the first call to metronome.play()
        this.metronome.initialize(); 
        logger.log("Metronome App initialized.");
    }

    _bindEvents() {
        // Bind Metronome core events (already done in Metronome.initialize)
        // this.metronome.tempoSlider.addEventListener(...) etc.

        // Bind App-level events (like menu toggle, future features)

        const toggleMenu = () => {
            if (!this.sideMenu || !this.menuToggleBtn) return;
            this.sideMenu.classList.toggle('open');
            const isOpen = this.sideMenu.classList.contains('open');

            this.menuToggleBtn.textContent = isOpen ? 'Close Menu' : 'Open Menu';
            this.menuToggleBtn.setAttribute('aria-expanded', isOpen);

            if (isOpen) {
                this.sideMenu.setAttribute('aria-hidden', 'false');
                this.sideMenu.inert = false;
            } else {
                this.sideMenu.setAttribute('aria-hidden', 'true');
                this.sideMenu.inert = true;
            }
        };

        if (this.menuToggleBtn) {
            this.menuToggleBtn.addEventListener('click', toggleMenu);
            // Initialize text, ARIA attributes, and inert state
            const isInitiallyOpen = this.sideMenu.classList.contains('open');
            this.menuToggleBtn.textContent = isInitiallyOpen ? 'Close Menu' : 'Open Menu';
            this.menuToggleBtn.setAttribute('aria-expanded', isInitiallyOpen);
            this.sideMenu.setAttribute('aria-hidden', !isInitiallyOpen);
            this.sideMenu.inert = !isInitiallyOpen;
        }

        if (this.closeMenuBtnInside) {
            this.closeMenuBtnInside.addEventListener('click', toggleMenu);
        }



        // Example event listener for a future feature
        // Initialize menu button text
        if (this.timeSignatureSelect) {
            this.metronome.setTimeSignature(this.timeSignatureSelect.value); // Initialize with current value
            this.timeSignatureSelect.addEventListener('change', (e) => this._handleTimeSignatureChange(e.target.value));
        }

        if (this.volumeControlSlider && this.metronome) {
            this.volumeControlSlider.addEventListener('input', (e) => {
                this.metronome.setVolume(parseInt(e.target.value, 10));
            });
            this.metronome.setVolume(parseInt(this.volumeControlSlider.value, 10)); // Initialize volume
        }

        if (this.resetTimerBtn && this.metronome) {
            this.resetTimerBtn.addEventListener('click', () => {
                this.metronome.resetCounterAndTimer();
                // Display updates are now handled by Metronome.resetCounterAndTimer()
            });
        }

        // The polling interval for display updates has been removed.
        // Metronome class now handles its display updates directly.
    }

    // _makeDraggable(element) { ... } // Entire function removed

    _handleTimeSignatureChange(value) {
        if (this.metronome) {
            this.metronome.setTimeSignature(value);
        }
        logger.log(`MetronomeApp: Time signature changed to: ${value}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MetronomeApp();
    // If you ever need to clean up the metronome, for example, if navigating away
    // in a single-page application, you might want to call metronome.destroy().
    // window.addEventListener('beforeunload', () => { if (app && app.metronome) app.metronome.destroy(); });
});