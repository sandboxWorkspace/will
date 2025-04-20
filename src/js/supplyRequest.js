import { RecentItemsList } from './ui/recentItemsList.js';
import { escapeHtml } from './utils/utils.js';

// --- Sample Supply Item Data (Replace with actual data loading if needed) ---
const SAMPLE_SUPPLY_ITEMS = [
    "Gloves (Box)", "Sanitizer Wipes", "Paper Towels", "AAA Batteries",
    "AA Batteries", "Masks (Box)", "Gowns (Pack)", "Sharps Container",
    "Biohazard Bags", "Alcohol Prep Pads"
];
// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

// --- Renderer for Supply Request Items ---
function renderSupplyRequestItem(request) {
    const itemElement = document.createElement("div");
    itemElement.className = "recent-item supply-request-item"; // Specific class

    const timestampSource = request.firebaseTimestamp || request.clientTimestamp;
    const timestamp = timestampSource
        ? new Date(timestampSource).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : 'No date';

    const submitter = escapeHtml(request.submitterName || 'Unknown');
    // Display requested items (assuming request.items is an array of {name: string})
    let itemsHtml = 'N/A';
    if (Array.isArray(request.items) && request.items.length > 0) {
        itemsHtml = request.items.map(item =>
            `${escapeHtml(item.name)}` // Simple display
        ).join(', ');
        if (itemsHtml.length > 100) {
            itemsHtml = itemsHtml.substring(0, 97) + '...';
        }
    }

    const details = request.requestDetails || '';
    const detailsPreview = escapeHtml(details.substring(0, 100)) + (details.length > 100 ? '...' : '');

    itemElement.innerHTML = `
        <strong>Requested Items: ${itemsHtml}</strong>
        ${details ? `<span class="item-details-preview" title="${escapeHtml(details)}">${detailsPreview}</span>` : ''}
        <div class="item-meta">
            <span>Submitted: ${timestamp} by ${submitter}</span>
            <span>Status: ${escapeHtml(request.status || 'Unknown')}</span>
        </div>
    `;
    return itemElement;
}
// --- --- --- --- --- --- --- --- --- --- ---

export class SupplyRequestHandler {
    constructor(dataManager) {
        if (!dataManager) {
            throw new Error("DataManager instance is required for SupplyRequestHandler.");
        }
        this.dataManager = dataManager;
        this.supplyItemData = []; // To store autocomplete data
        this.itemCounter = 0; // To give unique IDs to dynamic items

        // --- Get DOM Elements ---
        this.form = document.getElementById("supplyRequestForm");
        this.submitterNameInput = document.getElementById("submitterName");
        this.supplyItemsContainer = document.getElementById("supplyItemsContainer");
        this.addSupplyItemBtn = document.getElementById("addSupplyItemBtn");
        this.requestDetailsInput = document.getElementById("requestDetails"); // Optional details
        this.formStatus = document.getElementById("formStatus");
        this.submitButton = this.form ? this.form.querySelector('button[type="submit"]') : null;

        this.elementsReady = false;
        this.recentSupplyRequestsListComponent = null;
    }

    async initialize() {
        // Check for form elements
        if (!this.form || !this.submitterNameInput || !this.supplyItemsContainer || !this.addSupplyItemBtn || !this.requestDetailsInput || !this.formStatus || !this.submitButton) {
            console.error("Required DOM elements for Supply Request form not found.");
            if(this.formStatus) this.showStatus("Page initialization failed. Required form elements missing.", true);
            this.elementsReady = false;
            return;
        }
        this.elementsReady = true;
        console.log("SupplyRequestHandler Form DOM elements found.");

        // --- Initialize RecentItemsList for Supply Requests ---
        this.recentSupplyRequestsListComponent = new RecentItemsList(this.dataManager, {
            listElementId: "recentSupplyRequestsList", // Use a different ID for the list container
            loadDataFunction: this.dataManager.loadSupplyRequests.bind(this.dataManager),
            renderItemFunction: renderSupplyRequestItem,
            loadingMessage: '<p>Loading recent supply requests...</p>',
            noItemsMessage: '<p>No recent supply requests found.</p>',
            errorMessage: '<p>Could not load supply requests. Please try again later.</p>'
        });

        const listInitialized = this.recentSupplyRequestsListComponent.initialize();
        if (!listInitialized) {
             console.error("Failed to initialize the recent supply requests list component.");
        }

        // --- Load Autocomplete Data (Example: using sample data) ---
        // In a real app, fetch this from dataManager or a static source
        this.supplyItemData = SAMPLE_SUPPLY_ITEMS;
        console.log("Supply item data for autocomplete:", this.supplyItemData);

        // --- Bind Methods ---
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.addSupplyItemInput = this.addSupplyItemInput.bind(this);
        this.setupAutocomplete = this.setupAutocomplete.bind(this);
        this.showStatus = this.showStatus.bind(this);
        this.clearStatus = this.clearStatus.bind(this);

        // --- Add Initial Item Input ---
        this.addSupplyItemInput(); // Start with one item input

        // --- Add Event Listeners ---
        this.addSupplyItemBtn.addEventListener("click", this.addSupplyItemInput);
        this.form.addEventListener("submit", this.handleFormSubmit);
        // Use event delegation for remove buttons
        this.supplyItemsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-item-btn')) {
                event.target.closest('.supply-item-group').remove();
                // Optional: Re-evaluate if minimum items exist, etc.
            }
        });


        console.log("SupplyRequestHandler initialized successfully.");
    }

    addSupplyItemInput() {
        this.itemCounter++;
        const newItemId = `supplyName_${this.itemCounter}`;
        const itemGroup = document.createElement('div');
        itemGroup.className = 'form-group supply-item-group'; // Group label, input, remove btn

        itemGroup.innerHTML = `
            <label for="${newItemId}">Supply Item #${this.itemCounter}:</label>
            <div class="input-with-button">
                <input type="text" id="${newItemId}" name="supplyName[]" class="supply-name-input" required placeholder="Type or select supply item">
                <button type="button" class="button remove-item-btn" title="Remove Item">&times;</button>
            </div>
            <!-- Datalist will be associated via 'list' attribute -->
        `;

        this.supplyItemsContainer.appendChild(itemGroup);
        const newInput = itemGroup.querySelector(`#${newItemId}`);
        this.setupAutocomplete(newInput); // Setup autocomplete for the new input
    }

    // --- Basic Datalist Autocomplete Implementation ---
    setupAutocomplete(inputElement) {
        const listId = "supplyItemsDatalist"; // Use one shared datalist
        let datalist = document.getElementById(listId);

        // Create and populate datalist only if it doesn't exist
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = listId;
            this.supplyItemData.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                datalist.appendChild(option);
            });
            // Append the datalist to the body or form, somewhere persistent
            document.body.appendChild(datalist);
        }

        inputElement.setAttribute('list', listId);
        inputElement.setAttribute('autocomplete', 'off'); // Turn off browser default
    }
    // --- End Basic Datalist Autocomplete ---

    async handleFormSubmit(event) {
        event.preventDefault();
        if (!this.elementsReady) return;

        this.submitButton.disabled = true;
        this.submitButton.textContent = 'Submitting...';

        const submitterName = this.submitterNameInput.value.trim();
        const requestDetails = this.requestDetailsInput.value.trim(); // Optional

        // Collect all supply items
        const supplyInputs = this.supplyItemsContainer.querySelectorAll('.supply-name-input');
        const items = [];
        let hasEmptyItem = false;
        supplyInputs.forEach(input => {
            const itemName = input.value.trim();
            if (itemName) {
                items.push({ name: itemName }); // Store as object
            } else {
                hasEmptyItem = true; // Flag if any item field is left empty
            }
        });

        // Validation
        if (!submitterName) {
            this.showStatus("Please enter your name.", true);
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Submit Request';
            this.submitterNameInput.focus();
            return;
        }
        if (items.length === 0) {
             this.showStatus("Please add at least one supply item.", true);
             this.submitButton.disabled = false;
             this.submitButton.textContent = 'Submit Request';
             const firstInput = this.supplyItemsContainer.querySelector('.supply-name-input');
             if (firstInput) firstInput.focus();
             return;
        }
         if (hasEmptyItem) {
             this.showStatus("Please fill in or remove empty supply item fields.", true);
             this.submitButton.disabled = false;
             this.submitButton.textContent = 'Submit Request';
             const firstEmpty = Array.from(supplyInputs).find(input => !input.value.trim());
             if (firstEmpty) firstEmpty.focus();
             return;
         }


        const requestData = {
            submitterName,
            items, // Array of {name: string}
            requestDetails, // Optional details
            status: "Submitted" // Initial status
        };

        this.showStatus("Submitting request...", false);

        try {
            await this.dataManager.saveSupplyRequest(requestData);
            this.showStatus("Supply request submitted successfully!", false);
            this.form.reset(); // Clear name and details
            // Clear dynamic items and add back one empty input
            this.supplyItemsContainer.innerHTML = '';
            this.itemCounter = 0;
            this.addSupplyItemInput();

            // Refresh the list
            this.recentSupplyRequestsListComponent.refresh();

            setTimeout(() => this.clearStatus(), 5000);

        } catch (error) {
            console.error("Error submitting supply request:", error);
            this.showStatus(`Submission failed: ${error.message || 'Please try again.'}`, true);
        } finally {
             this.submitButton.disabled = false;
             this.submitButton.textContent = 'Submit Request';
        }
    }

    showStatus(message, isError = false) {
        if (!this.formStatus) return;
        this.formStatus.textContent = message;
        this.formStatus.classList.remove('success', 'error');
        this.formStatus.classList.add(isError ? 'error' : 'success');
    }

    clearStatus() {
         if (!this.formStatus) return;
        this.formStatus.textContent = '';
        this.formStatus.classList.remove('success', 'error');
    }

    destroy() {
        this.form?.removeEventListener("submit", this.handleFormSubmit);
        this.addSupplyItemBtn?.removeEventListener("click", this.addSupplyItemInput);
        // Remove delegated listener if needed
        this.recentSupplyRequestsListComponent?.destroy();
        // Remove shared datalist if created by this instance (might be better to manage globally)
        // const datalist = document.getElementById('supplyItemsDatalist');
        // datalist?.remove();
        console.log("SupplyRequestHandler listeners removed and components destroyed.");
    }
}