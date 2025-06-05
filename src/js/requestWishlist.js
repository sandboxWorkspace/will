import { RecentItemsList } from './ui/recentItemsList.js';
import { escapeHtml } from './utils/utils.js';

function renderWishlistRequestItem(request) {
    const itemElement = document.createElement("div");
    itemElement.className = "recent-item wishlist-request-item";

    const timestampSource = request.firebaseTimestamp || request.clientTimestamp;
    const timestamp = timestampSource
        ? new Date(timestampSource).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : 'No date';

    const submitter = escapeHtml(request.submitterName || 'Unknown');
    const equipment = escapeHtml(request.requestEquipment || 'N/A');
    const discipline = escapeHtml(request.disciplineType || 'N/A');
    const equipmentURL = request.equipmentURL ? escapeHtml(request.equipmentURL) : '';
    const details = request.requestDetails || '';
    const detailsPreview = escapeHtml(details.substring(0, 100)) + (details.length > 100 ? '...' : '');

    itemElement.innerHTML = `
        <strong>${equipment}</strong>
        ${detailsPreview ? `<span class="item-details-preview" title="${escapeHtml(details)}">${detailsPreview}</span>` : ''}
        <div class="item-meta">
            <span>Discipline: ${discipline}</span>
            ${equipmentURL ? `<span>URL: <a href="${equipmentURL}" target="_blank" rel="noopener noreferrer">${equipmentURL.length > 30 ? equipmentURL.substring(0, 27) + '...' : equipmentURL}</a></span>` : ''}
            <span>Submitted: ${timestamp} by ${submitter}</span>
            <span>Status: ${escapeHtml(request.status || 'Unknown')}</span>
        </div>
    `;
    return itemElement;
}

class WishlistRequestHandler {
    constructor(dataManager) {
        if (!dataManager) {
            throw new Error("DataManager instance is required for WishlistRequestHandler.");
        }
        this.dataManager = dataManager;
        console.log("WishlistRequestHandler received DataManager.");

        // --- Get Form DOM Elements ---
        this.form = document.getElementById("wishlistRequestForm");
        this.submitterNameInput = document.getElementById("submitterName");
        this.requestEquipmentInput = document.getElementById("requestEquipment");
        this.disciplineTypeInput = document.getElementById("disciplineType");
        this.equipmentURLInput = document.getElementById("equipmentURL"); // Changed from equipmentName
        this.requestDetailsInput = document.getElementById("requestDetails");
        this.formStatus = document.getElementById("formStatus");
        this.submitButton = this.form ? this.form.querySelector('button[type="submit"]') : null;

        this.elementsReady = false;
        this.recentRequestsListComponent = null;
    }

    initialize() {
        // Check for form elements
        if (!this.form || !this.submitterNameInput || !this.requestEquipmentInput || !this.disciplineTypeInput ||
            !this.equipmentURLInput || !this.requestDetailsInput || !this.formStatus || !this.submitButton) {
            console.error("Required DOM elements for Wishlist Request *form* not found during initialization.");
            if(this.formStatus) this.showStatus("Page initialization failed. Required form elements missing.", true);
            this.elementsReady = false;
            return;
        }
        this.elementsReady = true;
        console.log("WishlistRequestHandler Form DOM elements found.");

        // --- Initialize the RecentItemsList ---
        this.recentRequestsListComponent = new RecentItemsList(this.dataManager, {
            listElementId: "recentRequestsList", // ID of the list container in HTML
            loadDataFunction: this.dataManager.getRecentWishlistRequests.bind(this.dataManager),
            renderItemFunction: renderWishlistRequestItem,
            loadingMessage: '<p>Loading recent wishlist requests...</p>',
            noItemsMessage: '<p>No recent wishlist requests found.</p>',
            errorMessage: '<p>Could not load wishlist requests. Please try again later.</p>'
        });

        const listInitialized = this.recentRequestsListComponent.initialize();
        if (!listInitialized) {
             console.error("Failed to initialize the recent requests list component.");
        }

        // --- Bind Form Methods ---
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.showStatus = this.showStatus.bind(this);
        this.clearStatus = this.clearStatus.bind(this);
        this.form.addEventListener("submit", this.handleFormSubmit);

        console.log("WishlistRequestHandler initialized successfully.");
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        if (!this.elementsReady) return;

        this.submitButton.disabled = true;
        this.submitButton.textContent = 'Submitting...';
        this.clearStatus();

        const submitterName = this.submitterNameInput.value.trim();
        const requestEquipment = this.requestEquipmentInput.value.trim();
        const disciplineType = this.disciplineTypeInput.value.trim();
        const equipmentURL = this.equipmentURLInput.value.trim(); // Optional field
        const requestDetails = this.requestDetailsInput.value.trim();

        // Basic validation - URL is optional
        if (!submitterName || !requestEquipment || !disciplineType || !requestDetails) {
            this.showStatus("Please fill out all required fields (Your Name, Equipment, Discipline, Justification).", true);
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Submit Request';
            return;
        }

        // Optional: Add length validation for equipmentURL if desired, e.g., if it's too long or not a valid-looking URL
        if (equipmentURL && equipmentURL.length > 1024) { // Example max length for URL
            this.showStatus("The equipment URL is too long. Please shorten it.", true);
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Submit Request';
            this.equipmentURLInput.focus();
            return;
        }
        if (equipmentURL && !equipmentURL.toLowerCase().startsWith('http') && equipmentURL.includes('.')) {
             // Basic check, not a full URL validation
             this.showStatus("Please enter a valid URL (e.g., http://example.com).", true);
             this.submitButton.disabled = false;
             this.submitButton.textContent = 'Submit Request';
             this.equipmentURLInput.focus();
             return;
        }

        const requestData = {
            submitterName,
            requestEquipment,
            disciplineType,
            equipmentURL, // Can be empty string if not provided
            requestDetails,
            status: "Submitted"
        };

        this.showStatus("Submitting request...", false);

        try {
            await this.dataManager.saveWishlistRequest(requestData);
            this.showStatus("Request submitted successfully!", false);
            this.form.reset();
            this.recentRequestsListComponent.refresh();
            
            // --- Google Forms Submission ---
            try {
                const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfaYeXWk9lnmo2qOYDxZ1cW2bYo8CHFrRUl19Kc-ApFtrKn3w/formResponse?&submit=Submit?usp=pp_url' +
                    `&entry.1873077433=${encodeURIComponent(submitterName)}` +      // Your Name
                    `&entry.1368078064=${encodeURIComponent(requestEquipment)}` +    // Equipment Requesting
                    `&entry.2025085608=${encodeURIComponent(disciplineType)}` +   // Discipline Requesting
                    `&entry.174963547=${encodeURIComponent(equipmentURL)}` +       // Link or URL to Equipment
                    `&entry.1582753521=${encodeURIComponent(requestDetails)}`;     // Justification/Details

                // Log the constructed URL to the console for debugging
                console.log("Google Forms URL for Wishlist Request:", formUrl);

                const googleFormsResponse = await fetch(formUrl, {
                    method: 'POST',
                    body: new FormData(),
                    mode: 'no-cors',
                });
                console.log('Wishlist data successfully submitted to Google Forms (no-cors).');
            } catch (googleFormsError) {
                console.error('Error submitting Wishlist data to Google Forms:', googleFormsError);
                // Log this error but don't let it block the main success flow
            }
            // --- End Google Forms Submission ---

            setTimeout(() => this.clearStatus(), 5000);

        } catch (error) {
            console.error("Error submitting wishlist request:", error);
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
        this.recentRequestsListComponent?.destroy();
        console.log("WishlistRequestHandler listeners removed and components destroyed.");
    }
}

export { WishlistRequestHandler };