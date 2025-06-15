class IOSDebugLogger {
    constructor() {
        this.debugLogEl = document.getElementById('debugLogContainer');
        if (this.debugLogEl) {
            // Initial log message from the logger itself
            this._writeToLog("iOS Debug Logger initialized.", 'info');
        } else {
            // Fallback to console if the UI element isn't found
            console.warn("IOSDebugLogger: debugLogContainer element not found. UI logs will be disabled.");
        }
    }

    _writeToLog(message, type) {
        if (this.debugLogEl) {
            const entry = document.createElement('p');
            const timestamp = new Date().toLocaleTimeString();
            let prefix = type.toUpperCase() + ': ';
            if (type === 'log' || type === 'info') prefix = ''; // No prefix for simple logs

            entry.textContent = `[${timestamp}] ${prefix}${typeof message === 'object' ? JSON.stringify(message, null, 2) : message}`;
            if (type === 'error') entry.style.color = '#ff7b72'; // Light red
            else if (type === 'warn') entry.style.color = '#f0e68c'; // Khaki / Light yellow
            else if (type === 'info') entry.style.color = '#87CEFA'; // LightSkyBlue for info
            this.debugLogEl.appendChild(entry);
            this.debugLogEl.scrollTop = this.debugLogEl.scrollHeight;
        }
    }

    log(message, type = 'log') {
        // Also log to the actual browser console
        if (type === 'error' && console.error) console.error(message);
        else if (type === 'warn' && console.warn) console.warn(message);
        else if (console.log) console.log(message);

        this._writeToLog(message, type);
    }
}

export const logger = new IOSDebugLogger();