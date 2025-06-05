import { RecentItemsList, renderMaintenanceRequestItem } from './ui/recentItemsList.js';
import { escapeHtml } from './utils/utils.js';

class MaintenanceRequestHandler {
    constructor(dataManager) {
        if (!dataManager) {
            throw new Error("DataManager instance is required for MaintenanceRequestHandler.");
        }
        this.dataManager = dataManager;
        console.log("MaintenanceRequestHandler received DataManager.");

        // --- Get Form DOM Elements ---
        // List element is now handled by RecentItemsList
        this.form = document.getElementById("maintenanceRequestForm");
        this.submitterNameInput = document.getElementById("submitterName");
        this.requestTypeInput = document.getElementById("requestType");
        this.equipmentNameInput = document.getElementById("equipmentName");
        this.requestDetailsInput = document.getElementById("requestDetails");
        this.formStatus = document.getElementById("formStatus");
        this.submitButton = this.form ? this.form.querySelector('button[type="submit"]') : null;

        this.elementsReady = false;
        this.recentRequestsListComponent = null; // To hold the list component instance
    }

    initialize() {
        // Check for form elements
        if (!this.form || !this.submitterNameInput || !this.requestTypeInput || !this.equipmentNameInput || !this.requestDetailsInput || !this.formStatus || !this.submitButton) {
            console.error("Required DOM elements for Maintenance Request *form* not found during initialization.");
            if(this.formStatus) this.showStatus("Page initialization failed. Required form elements missing.", true);
            this.elementsReady = false;
            return;
        }
        this.elementsReady = true;
        console.log("MaintenanceRequestHandler Form DOM elements found.");

        // --- Initialize the RecentItemsList ---
        this.recentRequestsListComponent = new RecentItemsList(this.dataManager, {
            listElementId: "recentRequestsList", // ID of the list container in HTML
            loadDataFunction: this.dataManager.getRecentMaintenanceRequests.bind(this.dataManager), // Pass the bound function
            renderItemFunction: renderMaintenanceRequestItem, // Pass the specific renderer
            loadingMessage: '<p>Loading recent maintenance requests...</p>',
            noItemsMessage: '<p>No recent maintenance requests found.</p>',
            errorMessage: '<p>Could not load maintenance requests. Please try again later.</p>'
        });

        // Initialize the list component (it handles its own element check)
        const listInitialized = this.recentRequestsListComponent.initialize();
        if (!listInitialized) {
             console.error("Failed to initialize the recent requests list component.");
             // Decide if this is critical - maybe still allow form submission?
             // this.elementsReady = false; // Uncomment if list is critical
             // return;
        }

        // --- Bind Form Methods ---
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.showStatus = this.showStatus.bind(this);
        this.clearStatus = this.clearStatus.bind(this);

        // Add form submission listener
        this.form.addEventListener("submit", this.handleFormSubmit);

        console.log("MaintenanceRequestHandler initialized successfully.");
    }

    // displayRecentRequests is now handled by RecentItemsList

    async handleFormSubmit(event) {
        event.preventDefault();
        if (!this.elementsReady) return;

        this.submitButton.disabled = true;
        this.submitButton.textContent = 'Submitting...';

        const submitterName = this.submitterNameInput.value.trim();
        const requestType = this.requestTypeInput.value.trim();
        const equipmentName = this.equipmentNameInput.value.trim();
        const requestDetails = this.requestDetailsInput.value.trim();

        if (!submitterName || !requestType || !equipmentName || !requestDetails) {
            this.showStatus("Please fill out all fields.", true);
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Submit Request';
            return;
        }

        // Length validation (moved from HTML maxlength for better JS control)
        const maxEquipmentLength = 38; // Define max length
        if (equipmentName.length > maxEquipmentLength) {
            this.showStatus(`Equipment Name must be ${maxEquipmentLength} characters or less.`, true);
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Submit Request';
            this.equipmentNameInput.focus();
            return;
        }

        const requestData = {
            submitterName,
            requestType,
            equipmentName,
            requestDetails,
            status: "Submitted"
        };

        this.showStatus("Submitting request...", false);

        try {
            await this.dataManager.saveMaintenanceRequest(requestData);
            this.showStatus("Request submitted successfully!", false);
            this.form.reset();
            // Refresh the list using the component's method
            this.recentRequestsListComponent.refresh();
            
            // --- Google Forms Submission ---
            try {
                const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdpFHLlkSwx0BckmGcwRcJ2tKDg1GyLmq3BHtyFfvVXdcEuMQ/formResponse?&submit=Submit?usp=pp_url' +
                    `&entry.1873077433=${encodeURIComponent(submitterName)}` +
                    `&entry.2025085608=${encodeURIComponent(requestType)}` +
                    `&entry.1368078064=${encodeURIComponent(equipmentName)}` +
                    `&entry.1582753521=${encodeURIComponent(requestDetails)}`;

                const googleFormsResponse = await fetch(formUrl, {
                    method: 'POST',
                    // Include an empty FormData object in the body.
                    body: new FormData(),
                    mode: 'no-cors', // Use no-cors to prevent CORS issues
                });

                // Note: With 'no-cors', we cannot check the response status.
                // We assume success if no error is thrown.
                console.log('Data successfully submitted to Google Forms (no-cors).');
                // If you want to be extra cautious, consider setting up a 
                // server-side proxy to handle the Google Forms submission and 
                // provide a reliable success/failure response.

            } catch (googleFormsError) {
                console.error('Error submitting to Google Forms:', googleFormsError);
                // Consider whether a Google Forms failure should be considered
                // a critical error. You might want to inform the user or retry.
                // For now, we'll just log the error.
            }
            // --- End Google Forms Submission ---

            setTimeout(() => this.clearStatus(), 5000);

        } catch (error) {
            console.error("Error submitting maintenance request:", error);
            this.showStatus(`Submission failed: ${error.message || 'Please try again.'}`, true);
        } finally {
             this.submitButton.disabled = false;
             this.submitButton.textContent = 'Submit Request';
        }
    }

    showStatus(message, isError = false) {
        if (!this.formStatus) return;
        this.formStatus.textContent = message;
        this.formStatus.className = `form-status-message ${isError ? 'error' : 'success'}`;
        this.formStatus.setAttribute('aria-live', isError ? 'assertive' : 'polite');
    }

    clearStatus() {
         if (!this.formStatus) return;
        this.formStatus.textContent = '';
        this.formStatus.className = 'form-status-message';
        this.formStatus.removeAttribute('aria-live');
    }

    destroy() {
        this.form?.removeEventListener("submit", this.handleFormSubmit);
        this.recentRequestsListComponent?.destroy(); // Destroy the list component
        console.log("MaintenanceRequestHandler listeners removed and components destroyed.");
    }
}

export { MaintenanceRequestHandler };