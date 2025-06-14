export class Metronome {
    constructor(options = {}) {
        this.tempoSlider = document.getElementById(options.tempoSliderId || 'tempoSlider');
        // Ensure all getElementById calls are robust
        this.tempoInput = document.getElementById(options.tempoInputId || 'tempoInput');
        this.playPauseBtn = document.getElementById(options.playPauseBtnId || 'playPauseBtn');
        this.appContainer = document.querySelector(options.appContainerSelector || '.metronome-app-container');
        this.indicatorPalette = document.getElementById(options.indicatorPaletteId || 'indicatorColorPalette');
        // Note: volumeControlSlider is handled by MetronomeApp
        if (!this.tempoSlider || !this.tempoInput || !this.playPauseBtn || !this.appContainer || !this.indicatorPalette) {
            console.error("Metronome Class: One or more essential DOM elements are missing (appContainer, indicatorPalette, etc.). Ensure IDs/selectors match HTML.");
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
    }

    initialize() {
        if (!this.valid) return;

        this.tempoSlider.value = this.bpm;
        this.tempoInput.value = this.bpm;
        this.pulseColor = this.defaultPulseColor;
        // No initial color set for appContainer background pulse, color picker sets pulseColor

        this.tempoSlider.addEventListener('input', (e) => this._updateTempo(parseInt(e.target.value, 10)));
        this.tempoSlider.addEventListener('mousedown', () => this._handleTempoInteractionStart());
        this.tempoSlider.addEventListener('mouseup', () => this._handleTempoInteractionEnd());
        this.tempoInput.addEventListener('change', (e) => this._updateTempo(parseInt(e.target.value, 10))); // Use change for number input
        this.tempoInput.addEventListener('focus', () => this._handleTempoInteractionStart());
        // this.playPauseBtn.setAttribute('aria-label', 'Play'); // Set by HTML, but good to be aware
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

        console.log("Metronome initialized.");
        this._updateIndicatorColor(this.defaultPulseColor); // Ensure default is applied
    }

    _updateTempo(newTempo) {
        const minTempo = 8;  // parseInt(this.tempoSlider.min, 10);
        const maxTempo = 280; // parseInt(this.tempoSlider.max, 10);

        if (isNaN(newTempo)) newTempo = this.bpm; // Revert to current if invalid input
        newTempo = Math.max(minTempo, Math.min(maxTempo, newTempo)); // Clamp value

        this.bpm = newTempo;
        this.tempoSlider.value = this.bpm;
        this.tempoInput.value = this.bpm;

        // Tempo change logic now handled by _handleTempoInteractionEnd
    }

    _handleTempoInteractionStart() {
        if (this.isPlaying) {
            this.wasPlayingBeforeTempoChange = true;
            this.stop();
        } else {
            this.wasPlayingBeforeTempoChange = false;
        }
    }

    _handleTempoInteractionEnd() {
        if (this.wasPlayingBeforeTempoChange) {
            this.play(); // Resume playback if it was playing before adjustment
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
            // totalBeatsPlayed is not reset here, only on explicit reset.
            console.log(`Time signature set to: ${this.beatsPerMeasure}/${this.beatUnit}`);
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
        this.totalBeatsPlayed = 0;
        this.currentBeatInMeasure = 0; // Also reset current beat in measure
        this.elapsedTimeInSeconds = 0;
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
            this.timerIntervalId = null;
        }
        // If playing, restart the timer interval
        if (this.isPlaying) {
            this._startTimerInterval();
        }
    }

    play() {
        if (this.isPlaying || !this.valid) return;
        this.isPlaying = true;

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume AudioContext if it's suspended (browsers often require user interaction)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(err => console.error("Error resuming AudioContext:", err));
        }

        // this.playPauseBtn.textContent = 'Pause'; // Replaced by icon and ARIA label
        this.playPauseBtn.classList.remove('green-button');
        this.playPauseBtn.classList.add('red-button'); // Change to red when playing
        this.playPauseBtn.classList.add('playing');
        this.playPauseBtn.setAttribute('aria-label', 'Pause');

        const interval = (60 / this.bpm) * 1000;
        this.intervalId = setInterval(this._beat, interval);
        this._startTimerInterval();
        this._beat(); // Immediate first beat
    }

    stop() {
        if (!this.isPlaying || !this.valid) return;
        this.isPlaying = false;
        // this.playPauseBtn.textContent = 'Play'; // Replaced by icon and ARIA label
        this.playPauseBtn.classList.remove('red-button');
        this.playPauseBtn.classList.add('green-button'); // Change back to green when paused
        this.playPauseBtn.classList.remove('playing');
        this.playPauseBtn.setAttribute('aria-label', 'Play');
        clearInterval(this.intervalId);
        this.intervalId = null;
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
            this.timerIntervalId = null;
        }
        this.appContainer.style.backgroundColor = this.baseIndicatorColor; // Reset to base color
    }

    _startTimerInterval() {
        if (this.timerIntervalId) clearInterval(this.timerIntervalId);
        this.timerIntervalId = setInterval(() => {
            this.elapsedTimeInSeconds++;
        }, 1000);
    }

    togglePlay() {
        if (!this.valid) return;
        this.isPlaying ? this.stop() : this.play();
    }

    _beat() {
        this.currentBeatInMeasure++;
        this.totalBeatsPlayed++;
        if (this.currentBeatInMeasure > this.beatsPerMeasure) {
            this.currentBeatInMeasure = 1;
        }

        const isFirstBeat = this.currentBeatInMeasure === 1;

        this.appContainer.style.backgroundColor = this.pulseColor; // Pulse with selected color
        this._playBeep(isFirstBeat);

        setTimeout(() => {
            // Check if still playing OR if intervalId is null (meaning stop() was called and cleared it)
            // This ensures the visual reset happens unless explicitly stopped.
            if (!this.isPlaying && this.intervalId) return; 
            
            this.appContainer.style.backgroundColor = this.baseIndicatorColor; // Return to base color
        }, 100);
    }

    _playBeep(isAccent = false) {
        if (!this.audioContext || !this.valid) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sine';
        const frequency = isAccent ? 180 : 380; // Lower accent than regular beat
        const volume = isAccent ? this.beepVolume * 1.8 : this.beepVolume; // Slightly louder accent

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(Math.min(1.0, volume), this.audioContext.currentTime); // Ensure volume doesn't exceed 1.0

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.058);
    }
}

class MetronomeApp {
    constructor() {
        this.metronome = new Metronome({
            tempoSliderId: 'tempoSlider',
            tempoInputId: 'tempoInput',
            playPauseBtnId: 'playPauseBtn',
            appContainerSelector: '.metronome-app-container', // Selector for the main container
            indicatorPaletteId: 'indicatorColorPalette' // Changed to palette ID
        });

        // Side Menu Elements
        this.menuToggleBtn = document.getElementById('menuToggleBtn');
        this.sideMenu = document.getElementById('sideMenu');
        this.closeMenuBtnInside = document.getElementById('closeMenuBtnInside');

        // Future Feature UI Placeholders
        this.timeSignatureSelect = document.getElementById('timeSignature');
        this.volumeControlSlider = document.getElementById('volumeControl');
        this.beatCountDisplay = document.getElementById('beatCountDisplay');
        this.runningTimerDisplay = document.getElementById('runningTimerDisplay');
        this.resetTimerBtn = document.getElementById('resetTimerBtn');

        this._bindEvents();
        this.initialize();
    }

    initialize() {
        if (this.metronome.valid) { // Check if core metronome elements were found
            this.metronome.initialize();
        } else {
            console.error("MetronomeApp: Metronome core failed to initialize. App features might be limited.");
        }

        if (!this.menuToggleBtn || !this.sideMenu) {
            console.warn("MetronomeApp: Side menu elements (menuToggleBtn or sideMenu) not found. Menu functionality will be disabled.");
        }
        
        // Initialize future feature states/listeners if needed (stubs for now)
        console.log("Metronome App initialized with UI placeholders for advanced features.");
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
                this._updateBeatCountDisplay(); // Update display immediately
                this._updateTimerDisplay();     // Update display immediately
            });
        }

        // Interval to update beat count and timer displays
        setInterval(() => {
            if (this.metronome && this.metronome.isPlaying) {
                this._updateBeatCountDisplay();
                this._updateTimerDisplay();
            } else if (this.metronome && !this.metronome.isPlaying) {
                // Ensure displays are up-to-date even when paused if a reset happened
                // or to show initial state (0)
                this._updateBeatCountDisplay();
                this._updateTimerDisplay();
            }
        }, 200); // Update display roughly 5 times a second
    }

    _updateBeatCountDisplay() {
        if (this.beatCountDisplay && this.metronome) {
            this.beatCountDisplay.textContent = this.metronome.totalBeatsPlayed;
        }
    }

    _updateTimerDisplay() {
        if (this.runningTimerDisplay && this.metronome) {
            const time = this.metronome.elapsedTimeInSeconds;
            const hours = String(Math.floor(time / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((time % 3600) / 60)).padStart(2, '0');
            const seconds = String(time % 60).padStart(2, '0');
            this.runningTimerDisplay.textContent = `${minutes}:${seconds}`;
        }
    }

    // _makeDraggable(element) { ... } // Entire function removed

    _handleTimeSignatureChange(value) {
        if (this.metronome) {
            this.metronome.setTimeSignature(value);
        }
        console.log("MetronomeApp: Time signature changed to:", value);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MetronomeApp();
});