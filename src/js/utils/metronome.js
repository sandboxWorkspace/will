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
        this.debugLogEl = document.getElementById('debugLogContainer'); // For on-screen debugging

        // Note: volumeControlSlider is handled by MetronomeApp
        if (!this.tempoSlider || !this.tempoInput || !this.playPauseBtn || !this.appContainer || !this.indicatorPalette) {
            // Use console.error directly here as _logToUI might not be set up if `valid` is false.
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
        this._logToUI = this._logToUI.bind(this);
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

        this._logToUI("Metronome initialized.");
        this._updateIndicatorColor(this.defaultPulseColor); // Ensure default is applied
    }

    _logToUI(message, type = 'log') {
        const originalConsole = window.console; // Keep a reference to the original console

        if (type === 'error') {
            if (originalConsole && originalConsole.error) originalConsole.error(message);
        } else if (type === 'warn') {
            if (originalConsole && originalConsole.warn) originalConsole.warn(message);
        } else {
            if (originalConsole && originalConsole.log) originalConsole.log(message);
        }

        if (this.debugLogEl) {
            const entry = document.createElement('p');
            const timestamp = new Date().toLocaleTimeString();
            let prefix = type.toUpperCase() + ': ';
            if (type === 'log') prefix = ''; // No prefix for simple logs

            entry.textContent = `[${timestamp}] ${prefix}${typeof message === 'object' ? JSON.stringify(message, null, 2) : message}`;
            if (type === 'error') entry.style.color = '#ff7b72'; // Light red
            else if (type === 'warn') entry.style.color = '#f0e68c'; // Khaki / Light yellow
            this.debugLogEl.appendChild(entry);
            this.debugLogEl.scrollTop = this.debugLogEl.scrollHeight;
        }
    }

    _handleVisibilityChange() {
        if (!this.audioContext) return; // No audio context to manage yet

        if (document.visibilityState === 'visible') {
            if (this.audioContext.state === 'suspended') {
                this._logToUI("Page visible, AudioContext suspended. Attempting resume.");
                this.audioContext.resume().then(() => {
                    this._logToUI(`AudioContext resumed on visibility. State: ${this.audioContext.state}`);
                }).catch(err => {
                    this._logToUI(`Error resuming AudioContext on visibility: ${err}`, 'error');
                });
            }
        } else {
            this._logToUI(`Page hidden. AudioContext state: ${this.audioContext.state}`);
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
            this._logToUI(`Time signature set to: ${this.beatsPerMeasure}/${this.beatUnit}`);
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

        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this._logToUI("AudioContext created.");
            } catch (e) {
                this._logToUI(`Failed to create AudioContext: ${e}`, 'error');
                this.isPlaying = false;
                this._updatePlayButtonUI(false);
                return;
            }
        }

        if (this.audioContext.state === 'suspended') {
            this._logToUI("AudioContext suspended, attempting resume...");
            try {
                await this.audioContext.resume(); // Wait for the resume promise to resolve
                this._logToUI(`AudioContext resumed. State: ${this.audioContext.state}`);
            } catch (err) {
                this._logToUI(`Error resuming AudioContext: ${err}`, 'error');
                this.isPlaying = false;
                this._updatePlayButtonUI(false);
                return;
            }
        }

        if (this.audioContext.state !== 'running') {
            this._logToUI(`AudioContext not 'running' after setup. State: ${this.audioContext.state}. Sound may not play.`, 'warn');
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
            this._logToUI("AudioContext primed.");
        } catch (primeError) {
            this._logToUI(`Could not prime AudioContext: ${primeError}`, 'warn');
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
        if (this.audioContext) {
            // this._logToUI(`Metronome._playBeep: AudioContext state before playing beep: ${this.audioContext.state}`); // Can be verbose
        }
        if (!this.audioContext || !this.valid) {
            this._logToUI("Metronome._playBeep: AudioContext not available or metronome invalid.", 'warn');
            return;
        }
        if (this.audioContext.state !== 'running') {
            this._logToUI(`Metronome._playBeep: AudioContext not 'running'. State: ${this.audioContext.state}. Skipping beep.`, 'warn');
            return;
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'triangle';
        const frequency = isAccent ? 880 : 580; // lower accent pitch
        const volume = isAccent ? this.beepVolume * 1.8 : this.beepVolume; // Slightly louder accent

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(Math.min(1.0, volume), this.audioContext.currentTime); // Ensure volume doesn't exceed 1.0

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.030); // Shortened duration for a crisper click (30ms)
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
            appContainerSelector: '.metronome-app-container', // Selector for the main container
            indicatorPaletteId: 'indicatorColorPalette', // Changed to palette ID
            beatCountDisplayId: 'beatCountDisplay', // Pass ID for Metronome to manage
            runningTimerDisplayId: 'runningTimerDisplay' // Pass ID for Metronome to manage
        });

        // Side Menu Elements
        this.menuToggleBtn = document.getElementById('menuToggleBtn');
        this.sideMenu = document.getElementById('sideMenu');
        this.closeMenuBtnInside = document.getElementById('closeMenuBtnInside');

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
        if (this.metronome.valid) { // Check if core metronome elements were found
            this.metronome.initialize();
        } else {
            console.error("MetronomeApp: Metronome core failed to initialize."); // Keep as console.error for app-level issues
        }

        if (!this.menuToggleBtn || !this.sideMenu) {
            console.warn("MetronomeApp: Side menu elements not found."); // Keep as console.warn
        }
        
        // console.log("Metronome App initialized."); // Can be logged via metronome's logger if passed or use direct console
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
        // If this needs to be in UI log, MetronomeApp would need access to _logToUI
        // For now, let it be a standard console log for app-level events.
        console.log("MetronomeApp: Time signature changed to:", value); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MetronomeApp();
    // If you ever need to clean up the metronome, for example, if navigating away
    // in a single-page application, you might want to call metronome.destroy().
    // window.addEventListener('beforeunload', () => { if (app && app.metronome) app.metronome.destroy(); });
});