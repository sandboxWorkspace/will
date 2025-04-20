import { RecentItemsList } from './ui/recentItemsList.js';
import { escapeHtml } from './utils/utils.js';

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
        this.supplyItemData = []; // Initialize as empty, will be loaded from JSON
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
        // Check for form elements first
        if (!this.form || !this.submitterNameInput || !this.supplyItemsContainer || !this.addSupplyItemBtn || !this.requestDetailsInput || !this.formStatus || !this.submitButton) {
            console.error("Required DOM elements for Supply Request form not found.");
            if(this.formStatus) this.showStatus("Page initialization failed. Required form elements missing.", true);
            this.elementsReady = false;
            return; // Stop initialization if elements are missing
        }
        this.elementsReady = true;
        console.log("SupplyRequestHandler Form DOM elements found.");

        // --- Load Autocomplete Data from JSON ---
        let dataLoadedSuccessfully = false;
        try {
            // *** Use the corrected path ***
            const response = await fetch('./src/data/supplyItems.json');
            if (!response.ok) {
                 // Log the specific HTTP error status
                throw new Error(`Failed to fetch supply items: ${response.status} ${response.statusText}`);
            }
             // Ensure response is JSON before parsing
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new TypeError("Received non-JSON response for supply items");
            }

            this.supplyItemData = await response.json();
            console.log("Supply item data loaded from JSON:", this.supplyItemData);
            this.createOrUpdateDatalist(); // Create/update datalist *after* successful load
            dataLoadedSuccessfully = true;

        } catch (error) {
            console.error("Failed to load or process supply items from JSON:", error);
            this.showStatus(`Error: Could not load supply item list. ${error.message}`, true);
            this.supplyItemData = []; // Ensure it's an empty array on failure
            // Create an empty datalist to prevent errors later
            this.createOrUpdateDatalist();
        }

        // --- Initialize RecentItemsList for Supply Requests ---
        this.recentSupplyRequestsListComponent = new RecentItemsList(this.dataManager, {
            listElementId: "recentSupplyRequestsList",
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

        // --- Bind Methods ---
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.addSupplyItemInput = this.addSupplyItemInput.bind(this);
        this.setupAutocomplete = this.setupAutocomplete.bind(this);
        this.showStatus = this.showStatus.bind(this);
        this.clearStatus = this.clearStatus.bind(this);
        this.updateItemLabels = this.updateItemLabels.bind(this); // <-- Bind the new method

        // --- Add Initial Item Input ---
        // This runs after attempting to load data and create the datalist
        this.addSupplyItemInput(); // Start with one item input

        // --- Add Event Listeners ---
        this.addSupplyItemBtn.addEventListener("click", this.addSupplyItemInput);
        this.form.addEventListener("submit", this.handleFormSubmit);
        // Use event delegation for remove buttons
        this.supplyItemsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-item-btn')) {
                event.target.closest('.supply-item-group').remove();
                this.updateItemLabels(); // <-- Update labels after removing
            }
        });

        console.log("SupplyRequestHandler initialized successfully.");
         // Optionally show a different status if data loading failed but form is usable
        if (!dataLoadedSuccessfully && this.elementsReady) {
             console.warn("Supply item autocomplete suggestions may not be available.");
             // Optionally inform user via showStatus, but avoid error state if form is still functional
             // this.showStatus("Warning: Autocomplete list unavailable.", false); // Example
        }
    }

    addSupplyItemInput() {
        if (!this.elementsReady) return; // Don't add if elements aren't ready

        this.itemCounter++; // Still useful for unique IDs
        const newItemId = `supplyName_${this.itemCounter}`;
        const itemGroup = document.createElement('div');
        itemGroup.className = 'form-group supply-item-group'; // Group label, input, remove btn

        // Use a placeholder label text initially
        itemGroup.innerHTML = `
            <label for="${newItemId}">Supply Item:</label> <!-- Placeholder -->
            <div class="input-with-button">
                <input type="text" id="${newItemId}" name="supplyName[]" class="supply-name-input" required placeholder="Type or select supply item">
                <button type="button" class="button remove-item-btn" title="Remove Item">&times;</button>
            </div>
        `;

        this.supplyItemsContainer.appendChild(itemGroup);
        const newInput = itemGroup.querySelector(`#${newItemId}`);
        this.setupAutocomplete(newInput); // Setup autocomplete for the new input

        this.updateItemLabels(); // <-- Update all labels after adding
    }

    // --- New Method to Update Labels ---
    updateItemLabels() {
        if (!this.supplyItemsContainer) return;

        const itemGroups = this.supplyItemsContainer.querySelectorAll('.supply-item-group');
        itemGroups.forEach((group, index) => {
            const label = group.querySelector('label');
            if (label) {
                // Update the label text to be sequential
                label.textContent = `Supply Item #${index + 1}:`;
            }
        });
    }

    // --- Creates or Updates the Shared Datalist ---
    createOrUpdateDatalist() {
        const listId = "supplyItemsDatalist";
        let datalist = document.getElementById(listId);

        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = listId;
            document.body.appendChild(datalist); // Append only once
        }

        // Clear existing options before adding new ones (in case of updates)
        datalist.innerHTML = '';

        // Populate with current data
        this.supplyItemData.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            datalist.appendChild(option);
        });
        console.log(`Datalist #${listId} created/updated with ${this.supplyItemData.length} items.`);
    }

    // --- Applies the Datalist to a Specific Input ---
    setupAutocomplete(inputElement) {
        const listId = "supplyItemsDatalist";
        // Just associate the input with the existing/created datalist
        inputElement.setAttribute('list', listId);
        inputElement.setAttribute('autocomplete', 'off'); // Turn off browser default
    }
    // --- End Autocomplete ---

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
             // Try to focus the first input if it exists
             const firstInput = this.supplyItemsContainer.querySelector('.supply-name-input');
             if (firstInput) firstInput.focus();
             else this.addSupplyItemInput(); // Add one if none exist at all
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
            // Clear dynamic items
            this.supplyItemsContainer.innerHTML = '';
            // Reset counter for unique IDs if desired for next submission cycle
            this.itemCounter = 0;
            // Add back one empty input (which will call updateItemLabels)
            this.addSupplyItemInput();

            // Refresh the list
            this.recentSupplyRequestsListComponent?.refresh(); // Add safe navigation

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
        // Remove delegated listener
        this.supplyItemsContainer?.removeEventListener('click', (event) => {
             if (event.target.classList.contains('remove-item-btn')) {
                // No need to define the logic here again, just remove the listener
             }
        }); // Note: Removing delegated listeners precisely can be tricky, often okay to leave if element is removed

        this.recentSupplyRequestsListComponent?.destroy();

        // Remove the shared datalist if this component was responsible for it
        const datalist = document.getElementById('supplyItemsDatalist');
        datalist?.remove();

        console.log("SupplyRequestHandler listeners removed and components destroyed.");
    }
}
