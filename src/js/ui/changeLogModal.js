import { escapeHtml } from '../utils/utils.js';

export class ChangeLogModal {
    // Accept an options object for configuration
    constructor(dataManager, options = {}) {
        this.dataManager = dataManager;

        // Use provided IDs or defaults
        const defaultIds = {
            modalId: "changelogModal",
            closeBtnId: "closeChangelogBtn",
            listId: "changelogList",
            openBtnId: "openChangelogBtn"
        };
        this.options = { ...defaultIds, ...options }; // Merge defaults with provided options

        // Get elements using configured IDs
        this.changelogModal = document.getElementById(this.options.modalId);
        this.closeChangelogBtn = document.getElementById(this.options.closeBtnId);
        this.changelogList = document.getElementById(this.options.listId);
        this.openChangelogBtn = document.getElementById(this.options.openBtnId);

        // Bind methods
        this.showModal = this.showModal.bind(this);
        this.hideModal = this.hideModal.bind(this);
        this.handleWindowClick = this.handleWindowClick.bind(this);
        this.loadChangeLog = this.loadChangeLog.bind(this);
    }

    initialize() {
        // Check if essential elements were found using the configured IDs
        if (!this.changelogModal || !this.closeChangelogBtn || !this.changelogList) {
            console.error(`Changelog modal elements (modal: ${this.options.modalId}, close: ${this.options.closeBtnId}, list: ${this.options.listId}) not found in the DOM.`);
            return;
        }
        // Open button is optional for initialization, might be triggered programmatically
        if (!this.openChangelogBtn) {
             console.warn(`Changelog open button (id: ${this.options.openBtnId}) not found. Modal must be opened programmatically.`);
        } else {
            this.openChangelogBtn.addEventListener("click", this.showModal);
        }

        this.closeChangelogBtn.addEventListener("click", this.hideModal);
        window.addEventListener("click", this.handleWindowClick);
        console.log("ChangeLogModal initialized.");
    }

    showModal() {
        if (!this.changelogModal) return;
        this.changelogModal.classList.add('is-visible');
        this.loadChangeLog(); // Load content when showing
    }

    hideModal() {
        if (!this.changelogModal) return;
        this.changelogModal.classList.remove('is-visible');
        // Optional: Clear list content when hiding to save memory?
        // if (this.changelogList) this.changelogList.innerHTML = '';
    }

    handleWindowClick(event) {
        if (event.target === this.changelogModal) {
            this.hideModal();
        }
    }

    async loadChangeLog() {
        if (!this.changelogList) return;
        this.changelogList.innerHTML = '<p>Loading changes...</p>'; // Indicate loading
        try {
            // Assuming dataManager.loadChangeLog() is generic enough or
            // you might pass a specific loader function via options if needed
            const changes = await this.dataManager.loadChangeLog();

            if (changes && Object.keys(changes).length > 0) {
                const changeEntries = Object.values(changes).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Safer sort
                this.changelogList.innerHTML = ''; // Clear loading message

                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // Define day names

                changeEntries.forEach(change => {
                    const changeItem = document.createElement("div");
                    changeItem.classList.add("changelog-item"); // Keep class for styling

                    const timestamp = change.timestamp
                        ? new Date(change.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                        : 'Unknown Time';

                    const dayName = (typeof change.dayIndex === 'number' && change.dayIndex >= 0 && change.dayIndex < dayNames.length)
                        ? dayNames[change.dayIndex]
                        : ''; // Default to empty if no valid dayIndex

                    // Use imported escapeHtml
                    const sanitizedOldValue = escapeHtml(change.oldValue || "");
                    const sanitizedNewValue = escapeHtml(change.newValue || "");
                    const timeStr = escapeHtml(change.time || "");
                    const dayAndTime = dayName && timeStr ? `${dayName} ${timeStr}: ` : '';

                    changeItem.innerHTML = `
                        <strong class="changelog-timestamp">${timestamp}</strong><br>
                        <span class="changelog-details">${dayAndTime}"${sanitizedOldValue}" &rarr; "${sanitizedNewValue}"</span>
                    `;
                    this.changelogList.appendChild(changeItem);
                });
            } else {
                 this.changelogList.innerHTML = '<p>No changes recorded yet.</p>';
            }
        } catch (error) {
            console.error("Error loading changelog:", error);
            this.changelogList.innerHTML = '<p>Error loading changes. Please try again later.</p>';
        }
    }

    // Optional: Add destroy method
    destroy() {
        this.openChangelogBtn?.removeEventListener("click", this.showModal);
        this.closeChangelogBtn?.removeEventListener("click", this.hideModal);
        window.removeEventListener("click", this.handleWindowClick);
        console.log("ChangeLogModal listeners removed.");
    }
}