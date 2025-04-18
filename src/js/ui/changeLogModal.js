export class ChangeLogModal {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.changelogModal = document.getElementById("changelogModal");
        this.closeChangelogBtn = document.getElementById("closeChangelogBtn");
        this.changelogList = document.getElementById("changelogList");
        this.openChangelogBtn = document.getElementById("openChangelogBtn"); // Get open button reference

        // Bind methods
        this.showModal = this.showModal.bind(this);
        this.hideModal = this.hideModal.bind(this);
        this.handleWindowClick = this.handleWindowClick.bind(this);
        this.loadChangeLog = this.loadChangeLog.bind(this); // Bind loadChangeLog
    }

    initialize() {
        if (!this.changelogModal || !this.closeChangelogBtn || !this.changelogList || !this.openChangelogBtn) {
            console.error("Changelog elements not found in the DOM");
            return;
        }

        this.openChangelogBtn.addEventListener("click", this.showModal);
        this.closeChangelogBtn.addEventListener("click", this.hideModal);
        window.addEventListener("click", this.handleWindowClick);
    }

    showModal() {
        this.changelogModal.classList.add('is-visible');
        this.loadChangeLog(); // Load content when showing
    }

    hideModal() {
        this.changelogModal.classList.remove('is-visible');
        // Optional: Clear list content when hiding to save memory?
        // this.changelogList.innerHTML = '';
    }

    handleWindowClick(event) {
        if (event.target === this.changelogModal) {
            this.hideModal();
        }
    }

    async loadChangeLog() {
        this.changelogList.innerHTML = '<p>Loading changes...</p>'; // Indicate loading
        try {
            const changes = await this.dataManager.loadChangeLog();

            if (changes && Object.keys(changes).length > 0) {
                // Sort entries by timestamp descending
                const changeEntries = Object.values(changes).sort((a, b) => b.timestamp - a.timestamp);
                this.changelogList.innerHTML = ''; // Clear loading message

                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // Define day names

                changeEntries.forEach(change => {
                    const changeItem = document.createElement("div");
                    changeItem.classList.add("changelog-item"); // Add class for potential styling

                    // Format timestamp
                    const timestamp = new Date(change.timestamp).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short'
                    });

                    // Get day name, handle potential undefined index
                    const dayName = change.dayIndex >= 0 && change.dayIndex < dayNames.length
                        ? dayNames[change.dayIndex]
                        : 'Unknown Day';

                    // Sanitize values before inserting into innerHTML to prevent XSS
                    const sanitizedOldValue = this.escapeHtml(change.oldValue || "");
                    const sanitizedNewValue = this.escapeHtml(change.newValue || "");

                    changeItem.innerHTML = `
                        <strong class="changelog-timestamp">${timestamp}</strong><br>
                        <span class="changelog-details">${dayName} ${this.escapeHtml(change.time)}: " ${sanitizedOldValue}" &rarr; "${sanitizedNewValue}"</span>
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

    // Helper function to escape HTML special characters
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe; // Return non-strings as is
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

    // Optional: Add destroy method
    destroy() {
        this.openChangelogBtn?.removeEventListener("click", this.showModal);
        this.closeChangelogBtn?.removeEventListener("click", this.hideModal);
        window.removeEventListener("click", this.handleWindowClick);
        console.log("ChangeLogModal listeners removed.");
    }
}