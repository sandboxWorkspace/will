class MaintenanceRequestHandler {
    constructor(dataManager) {
        // --- Check if DataManager is provided ---
        if (!dataManager) {
            console.error("MaintenanceRequestHandler requires a DataManager instance!");
            // Throw an error or handle gracefully depending on application structure
            throw new Error("DataManager instance is required for MaintenanceRequestHandler.");
        }
        this.dataManager = dataManager;
        console.log("MaintenanceRequestHandler received DataManager.");

        // --- Get DOM Elements ---
        this.recentRequestsList = document.getElementById("recentRequestsList");
        this.form = document.getElementById("maintenanceRequestForm");
        this.submitterNameInput = document.getElementById("submitterName");
        this.requestTypeInput = document.getElementById("requestType");
        this.equipmentNameInput = document.getElementById("equipmentName");
        this.requestDetailsInput = document.getElementById("requestDetails");
        this.formStatus = document.getElementById("formStatus");
        this.submitButton = this.form ? this.form.querySelector('button[type="submit"]') : null; // Get submit button

        // --- Basic DOM Element Check ---
        // Perform checks within initialize() to ensure DOM is ready
        this.elementsReady = false; // Flag to track if elements are found
    }

    // Initialize is called externally (e.g., from scripts.js) after DOM is ready
    initialize() {
        // Check for elements now that DOM should be loaded
        if (!this.recentRequestsList || !this.form || !this.submitterNameInput || !this.requestTypeInput || !this.equipmentNameInput || !this.requestDetailsInput || !this.formStatus || !this.submitButton) {
            console.error("Required DOM elements for Maintenance Request page not found during initialization.");
            // Optionally display an error message on the page itself
            if(this.formStatus) this.showStatus("Page initialization failed. Required elements missing.", true);
            this.elementsReady = false;
            return; // Stop initialization
        }
        this.elementsReady = true;
        console.log("MaintenanceRequestHandler DOM elements found.");

        // --- Bind Methods ---
        // Binding ensures 'this' refers to the class instance within event handlers
        this.displayRecentRequests = this.displayRecentRequests.bind(this);
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.escapeHtml = this.escapeHtml.bind(this);
        this.showStatus = this.showStatus.bind(this);
        this.clearStatus = this.clearStatus.bind(this);

        // Load initial list of requests
        this.displayRecentRequests();

        // Add form submission listener
        this.form.addEventListener("submit", this.handleFormSubmit);

        console.log("MaintenanceRequestHandler initialized successfully.");
    }

    async displayRecentRequests() {
        if (!this.elementsReady) return; // Don't run if elements aren't ready

        this.recentRequestsList.innerHTML = '<p>Loading recent requests...</p>'; // Loading indicator

        try {
            // Use the DataManager instance passed in constructor
            const requestsData = await this.dataManager.loadMaintenanceRequests(15); // Load latest 15

            if (requestsData && typeof requestsData === 'object' && Object.keys(requestsData).length > 0) {
                 // Firebase returns an object with keys. Convert to array and sort.
                 // Sort by Firebase server timestamp descending (most recent first)
                const requests = Object.values(requestsData)
                    .sort((a, b) => (b.firebaseTimestamp || b.clientTimestamp || 0) - (a.firebaseTimestamp || a.clientTimestamp || 0));

                this.recentRequestsList.innerHTML = ''; // Clear loading message

                requests.forEach(request => {
                    const requestItem = document.createElement("div");
                    requestItem.classList.add("request-item");

                    // Use server timestamp if available, otherwise client timestamp
                    const timestampSource = request.firebaseTimestamp || request.clientTimestamp;
                    const timestamp = timestampSource
                        ? new Date(timestampSource).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                        : 'No date';

                    // Sanitize data before displaying
                    const equipment = this.escapeHtml(request.equipmentName || 'N/A');
                    const type = this.escapeHtml(request.requestType || 'N/A');
                    const submitter = this.escapeHtml(request.submitterName || 'Unknown');
                    // Preview details, add ellipsis if truncated
                    const details = request.requestDetails || '';
                    const detailsPreview = this.escapeHtml(details.substring(0, 100)) + (details.length > 100 ? '...' : '');

                    requestItem.innerHTML = `
                        <strong>${equipment}</strong>
                        <span class="request-details-preview" title="${this.escapeHtml(details)}">${detailsPreview}</span>
                        <div class="request-meta">
                            <span>Type: ${type}</span>
                            <span>Submitted: ${timestamp} by ${submitter}</span>
                        </div>
                    `;
                    this.recentRequestsList.appendChild(requestItem);
                });

            } else {
                this.recentRequestsList.innerHTML = '<p>No recent maintenance requests found.</p>';
            }
        } catch (error) {
            console.error("Error loading maintenance requests:", error);
            this.recentRequestsList.innerHTML = '<p>Could not load requests. Please try again later.</p>';
            // Optionally show error via showStatus as well
            this.showStatus("Error loading recent requests.", true);
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault(); // Prevent default HTML form submission
        if (!this.elementsReady) return;

        // Disable button to prevent multiple submissions
        this.submitButton.disabled = true;
        this.submitButton.textContent = 'Submitting...'; // Provide visual feedback

        const submitterName = this.submitterNameInput.value.trim();
        const requestType = this.requestTypeInput.value.trim();
        const equipmentName = this.equipmentNameInput.value.trim();
        const requestDetails = this.requestDetailsInput.value.trim();

        // Basic Validation
        if (!submitterName || !requestType || !equipmentName || !requestDetails) {
            this.showStatus("Please fill out all fields.", true);
            this.submitButton.disabled = false; // Re-enable button
            this.submitButton.textContent = 'Submit Request';
            return;
        }

        const requestData = {
            submitterName,
            requestType,
            equipmentName,
            requestDetails,
            // Timestamps (clientTimestamp, firebaseTimestamp) added by DataManager/Adapter
            status: "Submitted" // Initial status
        };

        this.showStatus("Submitting request...", false); // Indicate processing

        try {
            await this.dataManager.saveMaintenanceRequest(requestData);
            this.showStatus("Request submitted successfully!", false);
            this.form.reset(); // Clear the form
            // Refresh the list to show the new request immediately
            await this.displayRecentRequests(); // Use await if displayRecentRequests is async

            // Optional: Clear status message after a few seconds
            setTimeout(() => this.clearStatus(), 5000);

        } catch (error) {
            console.error("Error submitting maintenance request:", error);
            this.showStatus(`Submission failed: ${error.message || 'Please try again.'}`, true);
        } finally {
             // Re-enable button regardless of success or failure
             this.submitButton.disabled = false;
             this.submitButton.textContent = 'Submit Request';
        }
    }

    showStatus(message, isError = false) {
        if (!this.formStatus) return; // Check if element exists
        this.formStatus.textContent = message;
        // Use classList for cleaner class management
        this.formStatus.classList.remove('success', 'error'); // Remove previous classes
        this.formStatus.classList.add(isError ? 'error' : 'success');
        // Ensure display is set correctly (handled by CSS based on class)
    }

    clearStatus() {
         if (!this.formStatus) return;
        this.formStatus.textContent = '';
        this.formStatus.classList.remove('success', 'error');
        // CSS should hide the element when classes are removed if display: none is default
    }

    // Helper function to escape HTML (Consider moving to a shared utility module)
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe; // Return non-strings as-is
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

    // Optional: Add destroy method if needed for cleanup (e.g., in SPAs)
    destroy() {
        if (this.form) {
            this.form.removeEventListener("submit", this.handleFormSubmit);
        }
        console.log("MaintenanceRequestHandler listeners removed.");
        // Clear any timers if used (e.g., the status clear timeout)
        // clearTimeout(this.statusClearTimer); // Need to store timer ID if doing this
    }
}

export { MaintenanceRequestHandler };