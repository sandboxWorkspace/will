import { RecentItemsList } from './ui/recentItemsList.js';
import { escapeHtml, debounce } from './utils/utils.js';

// --- Renderer for Supply Request Items ---
function renderSupplyRequestItem(request) {
    const itemElement = document.createElement("div");
    itemElement.className = "recent-item supply-request-item"; // Specific class

    // Prioritize Firebase timestamp if available, fallback to client timestamp
    const timestampSource = request.firebaseTimestamp || request.clientTimestamp;
    const timestamp = timestampSource
        ? new Date(timestampSource).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : 'No date';

    const submitter = escapeHtml(request.submitterName || 'Unknown');

    // Display requested items (assuming request.items is an array of {name: string})
    let itemsHtml = 'N/A';
    if (Array.isArray(request.items) && request.items.length > 0) {
        // Map items to escaped HTML strings
        itemsHtml = request.items.map(item =>
            `${escapeHtml(item.name || 'Unnamed Item')}` // Ensure item.name exists
        ).join(', ');

        // Simple truncation logic for display
        const maxLength = 100;
        if (itemsHtml.length > maxLength) {
            itemsHtml = itemsHtml.substring(0, maxLength - 3) + '...';
        }
    }

    const details = request.requestDetails || '';
    // Truncate details preview and escape for safety
    const detailsPreview = escapeHtml(details.substring(0, 100)) + (details.length > 100 ? '...' : '');

    // Construct the inner HTML for the list item
    itemElement.innerHTML = `
        <strong>Requested Items: ${itemsHtml}</strong>
        ${details ? `<span class="item-details-preview" title="${escapeHtml(details)}">${detailsPreview}</span>` : ''}
        <div class="item-meta">
            <span>Status: ${escapeHtml(request.status || 'Unknown')}</span>
            <span>Submitted: ${timestamp} by ${submitter}</span>
        </div>
    `;
    return itemElement;
}
// --- --- --- --- --- --- --- --- --- --- ---

export class SupplyRequestHandler {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.supplyItemData = []; // Holds the autocomplete suggestions
        this.itemCounter = 0; // Used for generating unique IDs for dynamic items
        this.activeAutocompleteInput = null; // Track which input has focus for suggestions
        this.activeSuggestionIndex = -1; // Track highlighted suggestion index for keyboard nav
        this.elementsReady = false; // Flag to indicate if essential DOM elements were found
        this.recentSupplyRequestsListComponent = null; // Reference to the recent items list component

        // --- DOM Element References ---
        this.form = document.getElementById("supplyRequestForm");
        this.submitterNameInput = document.getElementById("submitterName");
        this.supplyItemsContainer = document.getElementById("supplyItemsContainer");
        this.addSupplyItemBtn = document.getElementById("addSupplyItemBtn");
        this.requestDetailsInput = document.getElementById("requestDetails");
        this.formStatus = document.getElementById("formStatus");
        this.submitButton = this.form ? this.form.querySelector('button[type="submit"]') : null;

        // --- Bind Methods ---
        // Ensure 'this' context is correct in event handlers and callbacks
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.addSupplyItemInput = this.addSupplyItemInput.bind(this);
        this.showStatus = this.showStatus.bind(this);
        this.clearStatus = this.clearStatus.bind(this);
        this.updateItemLabels = this.updateItemLabels.bind(this);
        // Autocomplete related methods
        this.handleItemInput = this.handleItemInput.bind(this);
        this.handleItemFocus = this.handleItemFocus.bind(this);
        this.handleItemKeydown = this.handleItemKeydown.bind(this);
        this.handleSuggestionClick = this.handleSuggestionClick.bind(this);
        this.boundHandleDocumentClick = this.handleDocumentClick.bind(this); // For closing suggestions on outside click
        // Debounced input handler to avoid excessive filtering on rapid typing
        this.debouncedHandleItemInput = debounce(this.handleItemInputLogic.bind(this), 300);
    }

    async initialize() {
        console.log("Initializing SupplyRequestHandler...");

        // --- Get DOM Elements & Basic Validation ---
        const recentListContainer = document.getElementById('recentSupplyRequestsList');
        if (!this.form || !this.submitterNameInput || !this.supplyItemsContainer || !this.addSupplyItemBtn || !this.requestDetailsInput || !this.formStatus || !this.submitButton) {
            console.error("Supply Request Error: One or more required form elements not found in the DOM.");
            this.elementsReady = false;
            if (this.formStatus) {
                this.showStatus("Error: Form could not be initialized correctly.", true);
            } else if (document.body) {
                 const errorMsg = document.createElement('p');
                 errorMsg.textContent = "Critical Error: Supply Request form elements missing.";
                 errorMsg.style.color = 'red'; errorMsg.style.fontWeight = 'bold';
                 document.body.prepend(errorMsg); // Add prominent error if status element is missing
            }
            return; // Stop initialization
        }
        this.elementsReady = true;
        console.log("SupplyRequestHandler: Form DOM elements found.");

        // --- Initialize RecentItemsList Component ---
        console.log('SupplyRequestHandler: Initializing RecentItemsList...');
        const hasLoadMethod = typeof this.dataManager?.getRecentSupplyRequests === 'function';
        if (recentListContainer && this.dataManager && hasLoadMethod) {
            try {
                this.recentSupplyRequestsListComponent = new RecentItemsList(
                    this.dataManager,
                    {
                        listElementId: 'recentSupplyRequestsList', // Use the ID of the container
                        loadDataFunction: this.dataManager.getRecentSupplyRequests.bind(this.dataManager),
                        renderItemFunction: renderSupplyRequestItem,
                        loadingMessage: "Loading recent supply requests...",
                        errorMessage: "<p>Could not load recent supply requests.</p>", // Added <p> for consistency
                        noItemsMessage: "<p>No recent supply requests found.</p>"     // Added <p> for consistency
                    }
                );
                await this.recentSupplyRequestsListComponent.initialize();
                console.log("SupplyRequestHandler: RecentItemsList initialized successfully.");
            } catch (error) {
                 console.error("SupplyRequestHandler: Error initializing RecentItemsList:", error);
                 if(recentListContainer) recentListContainer.textContent = "Error loading recent requests component.";
            }
       } else {
           console.warn("SupplyRequestHandler: Could not initialize RecentItemsList. Container, DataManager, or load method missing.", {
               hasContainer: !!recentListContainer,
               hasDataManager: !!this.dataManager,
               hasLoadMethod: hasLoadMethod
           });
           if(recentListContainer) {
                recentListContainer.textContent = "Failed to load recent requests component (config error).";
           }
       }

        // --- Load Autocomplete Data ---
        console.log("SupplyRequestHandler: Loading autocomplete data...");
        try {
            const response = await fetch('./data/supplyItems.json');
        if (!response.ok) {
            // Check if the response status indicates a "Not Found" error specifically
            if (response.status === 404) {
                throw new Error(`HTTP error! File not found at /will/data/supplyItems.json. Status: ${response.status}`);
            } else {
                throw new Error(`HTTP error fetching supply items! Status: ${response.status}`);
            }
        }
             const contentType = response.headers.get("content-type");
             if (!contentType || !contentType.includes("application/json")) {
                 // Log the actual content type for debugging
                 console.error("Received non-JSON response for supply items. Content-Type:", contentType);
                 throw new TypeError("Received non-JSON response for supply items");
             }
            this.supplyItemData = await response.json();

            // Validate data format (should be an array of strings)
            if (!Array.isArray(this.supplyItemData) || !this.supplyItemData.every(item => typeof item === 'string')) {
                 console.warn("Supply item data loaded but is not in the expected format (array of strings). Autocomplete might fail.", this.supplyItemData);
                 this.supplyItemData = []; // Reset to empty array to prevent errors later
                 throw new Error("Invalid format for supply item data.");
            }
            console.log(`SupplyRequestHandler: ${this.supplyItemData.length} supply items loaded for autocomplete.`);
        } catch (error) {
            console.error("SupplyRequestHandler: Failed to load or process supply items from JSON:", error);
            this.showStatus(`Warning: Could not load supply item list. Autocomplete disabled. ${error.message}`, true);
            this.supplyItemData = []; // Ensure it's an empty array on failure
        }

        // --- Add Initial Item Input ---
        // Only add if the container exists
        if (this.supplyItemsContainer) {
            this.addSupplyItemInput();
        }

        // --- Add Event Listeners ---
        // Only add listeners if elements are ready and exist
        if (this.elementsReady) {
            this.addSupplyItemBtn.addEventListener("click", this.addSupplyItemInput);
            this.form.addEventListener("submit", this.handleFormSubmit);

            // --- Event Delegation for Dynamic Items within the container ---

            // Handles clicks on suggestions AND remove buttons
            this.supplyItemsContainer.addEventListener('click', (event) => {
                if (event.target.matches('.autocomplete-suggestion')) {
                    this.handleSuggestionClick(event);
                } else if (event.target.matches('.remove-item-btn')) {
                    const itemGroup = event.target.closest('.dynamic-item-group');
                    if (itemGroup) {
                        itemGroup.remove(); // Remove the whole group
                        this.updateItemLabels(); // Renumber remaining items and update button states
                    }
                }
            });

            // Handles typing in the supply name fields
            this.supplyItemsContainer.addEventListener('input', (event) => {
                if (event.target.matches('.supply-name-input')) {
                    this.handleItemInput(event); // Triggers debounced logic
                }
            });

            // Handles when a supply name field gains focus
            this.supplyItemsContainer.addEventListener('focusin', (event) => {
                if (event.target.matches('.supply-name-input')) {
                    this.handleItemFocus(event); // Sets the active input
                }
            });

            // Handles keyboard navigation (arrows, enter, escape) within supply name fields
            this.supplyItemsContainer.addEventListener('keydown', (event) => {
                if (event.target.matches('.supply-name-input')) {
                    this.handleItemKeydown(event); // Handles autocomplete keyboard interaction
                }
            });

            // Global listener to close suggestions when clicking outside
            document.addEventListener('click', this.boundHandleDocumentClick);

            console.log("SupplyRequestHandler: Event listeners added.");
        } else {
            console.warn("SupplyRequestHandler: Skipping event listener setup due to missing form elements.");
        }

        console.log("SupplyRequestHandler: Initialization sequence complete.");
    }

    addSupplyItemInput() {
        // Prevent adding if container doesn't exist (checked during init, but good safety)
        if (!this.supplyItemsContainer) return;

        this.itemCounter++;
        const baseId = `supplyName_${this.itemCounter}`; // Unique base ID for this item group
        const inputId = `${baseId}_input`;
        const listboxId = `${baseId}_listbox`; // Corresponding ID for the suggestions listbox

        const itemGroup = document.createElement('div');
        itemGroup.className = 'form-group dynamic-item-group'; // Use CSS class for styling and positioning context

        // Use template literal for cleaner HTML structure
        itemGroup.innerHTML = `
            <label for="${inputId}">Supply Item:</label> <!-- Label updated by updateItemLabels -->
            <div class="input-with-remove-button">
                <input
                    type="text"
                    id="${inputId}"
                    name="supplyName[]"
                    class="supply-name-input"
                    required
                    placeholder="Type or select supply item"
                    autocomplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-controls="${listboxId}"
                    aria-label="Supply Item Name"
                >
                <button type="button" class="button remove-item-btn" title="Remove This Item">&times;</button>
            </div>
            <div
                id="${listboxId}"
                class="autocomplete-suggestions-container"
                role="listbox"
                aria-label="Supply item suggestions"
             ></div> <!-- Suggestions will be populated here -->
        `;

        this.supplyItemsContainer.appendChild(itemGroup);
        this.updateItemLabels(); // Update labels and button states after adding

        // Focus the newly added input for better UX, unless it's the very first one
        if (this.itemCounter > 1) {
             const newInput = itemGroup.querySelector(`#${inputId}`);
             newInput?.focus(); // Optional chaining just in case
        }
    }

    updateItemLabels() {
        if (!this.supplyItemsContainer) return;

        const itemGroups = this.supplyItemsContainer.querySelectorAll('.dynamic-item-group');
        itemGroups.forEach((group, index) => {
            const label = group.querySelector('label');
            // Update label text to reflect the item number
            if (label) {
                label.textContent = `Supply Item #${index + 1}:`;
                // Optional: Update label's 'for' if input ID could change (unlikely here)
                // const input = group.querySelector('.supply-name-input');
                // if (input) label.setAttribute('for', input.id);
            }
        });

        // Manage the enabled/disabled state of remove buttons
        const removeButtons = this.supplyItemsContainer.querySelectorAll('.remove-item-btn');
        const disableRemove = itemGroups.length <= 1; // Disable if only one item left
        removeButtons.forEach(btn => {
            btn.disabled = disableRemove;
            // Optionally add/remove a class for more specific disabled styling
            // btn.classList.toggle('disabled-state', disableRemove);
        });
    }

    // --- Autocomplete Logic ---

    handleItemFocus(event) {
        const focusedInput = event.target;
        // If focus shifts between different supply inputs, hide suggestions for the previous one
        if (this.activeAutocompleteInput && this.activeAutocompleteInput !== focusedInput) {
             this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
        }
        // Set the newly focused input as the active one
        this.activeAutocompleteInput = focusedInput;
        this.activeSuggestionIndex = -1; // Reset suggestion navigation index

        // Show suggestions immediately if the input already has text when focused
        if (this.activeAutocompleteInput.value.trim().length > 0) {
             // Use the debounced logic even on focus if there's text,
             // or call showAutocompleteSuggestions directly if no debounce needed here.
             // Calling show directly might be slightly more responsive on focus.
             this.showAutocompleteSuggestions(this.activeAutocompleteInput);
        } else {
             // Ensure suggestions are hidden if input is empty on focus
             this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
        }
    }

    // Entry point for the 'input' event listener
    handleItemInput(event) {
        // Update the active input reference immediately (in case focus changes rapidly)
        this.activeAutocompleteInput = event.target;
        // Call the debounced function to handle filtering/showing suggestions
        this.debouncedHandleItemInput(event.target);
    }

    // Core logic executed after debouncing 'input' events
    handleItemInputLogic(inputElement) {
        // Double-check that the input being processed is still the one with focus
        // (prevents race conditions if focus changes during debounce delay)
        if (inputElement !== this.activeAutocompleteInput) return;
        // Filter and show suggestions based on the current input value
        this.showAutocompleteSuggestions(inputElement);
    }

    showAutocompleteSuggestions(inputElement) {
        const value = inputElement.value.trim().toLowerCase();
        const suggestionsContainerId = inputElement.getAttribute('aria-controls');
        const suggestionsContainer = suggestionsContainerId ? document.getElementById(suggestionsContainerId) : null;

        if (!suggestionsContainer) {
             console.error("Autocomplete Error: Could not find suggestions container (ID: " + suggestionsContainerId + ") for input:", inputElement.id);
             return;
        }

        suggestionsContainer.innerHTML = ''; // Clear previous suggestions
        this.activeSuggestionIndex = -1; // Reset keyboard navigation index
        inputElement.removeAttribute('aria-activedescendant'); // Clear active descendant

        // Don't show suggestions if input is empty or data hasn't loaded
        if (value.length < 1 || this.supplyItemData.length === 0) {
             this.hideAutocompleteSuggestions(inputElement); // Ensure it's hidden
             return;
        }

        // Filter the data (case-insensitive) and limit the number of results
        const filteredItems = this.supplyItemData.filter(item =>
            item.toLowerCase().includes(value)
        ).slice(0, 10); // Show max 10 suggestions

        if (filteredItems.length === 0) {
            this.hideAutocompleteSuggestions(inputElement); // Hide if no matches
            return;
        }

        // Create and append suggestion elements
        filteredItems.forEach((item, index) => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.textContent = item;
            suggestionDiv.className = 'autocomplete-suggestion';
            suggestionDiv.dataset.value = item; // Store the full value for easy retrieval on click
            suggestionDiv.id = `${suggestionsContainerId}_option_${index}`; // Unique ID for ARIA
            suggestionDiv.setAttribute('role', 'option');
            suggestionDiv.setAttribute('aria-selected', 'false');
            // Add click listener directly here? No, use delegation on the container.
            suggestionsContainer.appendChild(suggestionDiv);
        });

        suggestionsContainer.style.display = 'block'; // Make the container visible
        inputElement.setAttribute('aria-expanded', 'true'); // Update ARIA state for screen readers
    }

     hideAutocompleteSuggestions(inputElement = null) {
        const targetInput = inputElement || this.activeAutocompleteInput;

        // If no specific input, try to hide all suggestion containers (e.g., on form submit)
        if (!targetInput && this.supplyItemsContainer) {
             this.supplyItemsContainer.querySelectorAll('.autocomplete-suggestions-container')
                 .forEach(container => {
                     container.style.display = 'none';
                     container.innerHTML = ''; // Clear content
                     // Try to find associated input to reset ARIA state
                     const inputId = container.id.replace('_listbox', '_input');
                     const input = document.getElementById(inputId);
                     if (input) {
                         input.setAttribute('aria-expanded', 'false');
                         input.removeAttribute('aria-activedescendant');
                     }
                 });
             return;
        }

        // If a specific input is targeted
        if (targetInput) {
            const suggestionsContainerId = targetInput.getAttribute('aria-controls');
            const suggestionsContainer = suggestionsContainerId ? document.getElementById(suggestionsContainerId) : null;

            if (suggestionsContainer) {
                suggestionsContainer.style.display = 'none';
                suggestionsContainer.innerHTML = ''; // Clear suggestions
            }
            targetInput.setAttribute('aria-expanded', 'false');
            targetInput.removeAttribute('aria-activedescendant'); // Clear active descendant
        }

        // Reset index regardless
        this.activeSuggestionIndex = -1;
    }

    handleSuggestionClick(event) {
        // Event delegation already ensures target is '.autocomplete-suggestion'
        const suggestionDiv = event.target;
        const value = suggestionDiv?.dataset.value; // Get value from data attribute

        // Ensure we have a value and know which input is active
        if (value && this.activeAutocompleteInput) {
            this.activeAutocompleteInput.value = value; // Set the input's value
            this.hideAutocompleteSuggestions(this.activeAutocompleteInput); // Hide the suggestions list
            this.activeAutocompleteInput.focus(); // Return focus to the input
            // Optional: Manually trigger an 'input' event if other parts of the app
            // rely on it after programmatic changes. Usually not needed for basic forms.
            // this.activeAutocompleteInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.warn("Suggestion click handled, but couldn't find value or active input.", { value, activeInput: this.activeAutocompleteInput });
        }
    }

    handleItemKeydown(event) {
        // Only handle keys if an input is active and suggestions might be visible
        if (!this.activeAutocompleteInput) return;

        const suggestionsContainerId = this.activeAutocompleteInput.getAttribute('aria-controls');
        const suggestionsContainer = suggestionsContainerId ? document.getElementById(suggestionsContainerId) : null;
        // Check if suggestions are currently visible (or could be)
        const suggestionsVisible = suggestionsContainer && suggestionsContainer.style.display === 'block';
        const suggestions = suggestionsContainer ? Array.from(suggestionsContainer.querySelectorAll('.autocomplete-suggestion')) : [];

        // Only intercept keys relevant to autocomplete if suggestions are visible or could be shown
        if (!suggestionsVisible && !['ArrowDown', 'ArrowUp', 'Escape', 'Enter', 'Tab'].includes(event.key)) {
             // If suggestions aren't visible and it's a normal typing key, let it pass through
             // but reset index in case suggestions appear on next input event.
             this.activeSuggestionIndex = -1;
             return;
        }
        if (suggestions.length === 0 && suggestionsVisible && !['Escape', 'Tab', 'Enter'].includes(event.key)) {
            // If visible but empty, only handle Escape/Tab/Enter
            return;
        }


        let preventDefault = false; // Flag to prevent default browser action (e.g., form submit on Enter)

        switch (event.key) {
            case 'ArrowDown':
                if (suggestions.length > 0) {
                    preventDefault = true;
                    this.activeSuggestionIndex = (this.activeSuggestionIndex < suggestions.length - 1) ? this.activeSuggestionIndex + 1 : 0; // Wrap to top
                    this.updateSuggestionHighlight(suggestions);
                }
                break;

            case 'ArrowUp':
                 if (suggestions.length > 0) {
                     preventDefault = true;
                     if (this.activeSuggestionIndex > 0) {
                         this.activeSuggestionIndex--;
                     } else {
                         this.activeSuggestionIndex = suggestions.length - 1; // Wrap to bottom
                     }
                     this.updateSuggestionHighlight(suggestions);
                 }
                 break;

            case 'Enter':
                // Check if a suggestion is actively highlighted
                if (this.activeSuggestionIndex >= 0 && this.activeSuggestionIndex < suggestions.length) {
                    preventDefault = true; // Prevent form submission
                    const selectedSuggestion = suggestions[this.activeSuggestionIndex];
                    this.activeAutocompleteInput.value = selectedSuggestion.dataset.value; // Set input value
                    this.hideAutocompleteSuggestions(this.activeAutocompleteInput); // Hide suggestions
                    // Optional: Trigger input event if needed
                    // this.activeAutocompleteInput.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    // If Enter is pressed but no suggestion is selected,
                    // allow default behavior (likely form submission if it's the last field).
                    // Hide any potentially visible (but unselected) suggestions.
                    this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
                }
                break;

            case 'Escape':
                // Always hide suggestions on Escape
                preventDefault = true;
                this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
                break;

            case 'Tab':
                // Hide suggestions when tabbing away (default browser behavior will handle focus change)
                 this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
                 // No preventDefault needed here, let the tab work naturally
                 break;

            default:
                // Any other key press (like typing letters) while suggestions are visible
                // should reset the selection index, as the list will likely refilter.
                this.activeSuggestionIndex = -1;
                // Don't preventDefault, allow the character to be typed into the input.
                break;
        }

        if (preventDefault) {
            event.preventDefault();
        }
    }

    updateSuggestionHighlight(suggestions) {
        // Remove highlight and ARIA state from all suggestions first
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.remove('active');
            suggestion.setAttribute('aria-selected', 'false');

            // Add highlight and ARIA state to the currently active one
            if (index === this.activeSuggestionIndex) {
                suggestion.classList.add('active'); // Apply CSS class for visual highlight
                suggestion.setAttribute('aria-selected', 'true');
                // Update input's active descendant for screen readers
                this.activeAutocompleteInput.setAttribute('aria-activedescendant', suggestion.id);
                // Ensure the highlighted item is scrolled into view within the suggestions container
                suggestion.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        });

        // If no suggestion is selected (index is -1), remove the active descendant attribute
        if (this.activeSuggestionIndex === -1) {
             this.activeAutocompleteInput.removeAttribute('aria-activedescendant');
        }
    }


    // Close suggestions if a click happens outside the currently active input group
    handleDocumentClick(event) {
        // Only act if there's an active input we are tracking
        if (!this.activeAutocompleteInput) return;

        // Find the closest parent group for the active input
        const inputGroup = this.activeAutocompleteInput.closest('.dynamic-item-group');

        // If the click target is outside this group, hide the suggestions
        if (inputGroup && !inputGroup.contains(event.target)) {
            this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
            // Don't nullify activeAutocompleteInput here; focusout/blur events
            // or focusing another input will handle that transition more naturally.
        }
    }


    async handleFormSubmit(event) {
        event.preventDefault(); // Prevent default HTML form submission
        if (!this.elementsReady) {
            console.error("Form submission blocked: Essential elements not ready.");
            this.showStatus("Cannot submit: Form initialization failed.", true);
            return;
        }

        this.hideAutocompleteSuggestions(); // Ensure all suggestions are hidden

        // --- Disable Submit Button ---
        this.submitButton.disabled = true;
        this.submitButton.textContent = 'Submitting...';
        this.clearStatus(); // Clear previous status messages

        // --- Gather Form Data ---
        const submitterName = this.submitterNameInput.value.trim();
        const requestDetails = this.requestDetailsInput.value.trim(); // Optional

        // Collect all non-empty supply item names
        const supplyInputs = this.supplyItemsContainer.querySelectorAll('.supply-name-input');
        const items = [];
        let hasEmptyItem = false;
        let firstEmptyInput = null; // To focus on the first empty field if validation fails

        supplyInputs.forEach(input => {
            const itemName = input.value.trim();
            if (itemName) {
                items.push({ name: itemName }); // Store as an object {name: 'Item Name'}
            } else {
                hasEmptyItem = true; // Mark that at least one field was left empty
                if (!firstEmptyInput) firstEmptyInput = input; // Remember the first empty one
            }
        });

        // --- Validation ---
        let validationError = false;
        let focusTarget = null; // Element to focus if validation fails

        if (!submitterName) {
            this.showStatus("Please enter your name.", true);
            validationError = true;
            focusTarget = this.submitterNameInput;
        } else if (items.length === 0 && supplyInputs.length > 0) {
            // Case: Inputs exist, but all are empty
             this.showStatus("Please enter at least one supply item.", true);
             validationError = true;
             focusTarget = supplyInputs[0]; // Focus the first input
        } else if (items.length === 0 && supplyInputs.length === 0) {
             // Case: No inputs exist at all (shouldn't happen if addSupplyItemInput runs on init)
             this.showStatus("Please add and fill in at least one supply item.", true);
             validationError = true;
             this.addSupplyItemInput(); // Add an item input
             focusTarget = this.supplyItemsContainer.querySelector('.supply-name-input');
        } else if (hasEmptyItem) {
             // Case: Some items filled, but others left blank
             this.showStatus("Please fill in or remove the empty supply item field(s).", true);
             validationError = true;
             focusTarget = firstEmptyInput; // Focus the first empty input found
         }

        // If validation failed, re-enable button, focus the problematic field, and stop
        if (validationError) {
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Submit Request';
            focusTarget?.focus(); // Focus the relevant input for correction
            return;
        }
        // --- End Validation ---

        // --- Prepare Data for Submission ---
        const requestData = {
            submitterName,
            items, // Array of {name: string} objects
            requestDetails, // Keep this for Firebase
            status: "Submitted", // Set initial status
            clientTimestamp: new Date().toISOString() // Add timestamp from client browser
            // The backend (Firebase function via dataManager) should add serverTimestamp
        };

        this.showStatus("Submitting request...", false); // Indicate processing

        // --- Submit Data via DataManager ---
        try {
            await this.dataManager.saveSupplyRequest(requestData);
            this.showStatus("Supply request submitted successfully!", false);

            // --- Google Forms Submission (NEW) ---
            try {
                // Join supply items with commas for Google Forms
                const supplyList = items.map(item => item.name).join(', ');

                const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfvS8kIubBTil6RBy1BLHfDlpT18FZ7S0LAb31WnNF7kMltDg/formResponse?&submit=Submit?usp=pp_url' +
                    `&entry.1179758086=${encodeURIComponent(submitterName)}` +
                    `&entry.920261675=${encodeURIComponent(supplyList)}` +
                    `&entry.1507415069=${encodeURIComponent(requestDetails)}`;

                // Log the constructed URL to the console for debugging
                console.log("Google Forms URL for Supply Request:", formUrl);

                const googleFormsResponse = await fetch(formUrl, {
                    method: 'POST',
                    // Include an empty FormData object in the body.
                    body: new FormData(),
                    mode: 'no-cors', // Use no-cors to prevent CORS issues
                });

                // Note: With 'no-cors', we cannot check the response status.
                // We assume success if no error is thrown.
                console.log('Supply Request Data successfully submitted to Google Forms (no-cors).');

            } catch (googleFormsError) {
                console.error('Error submitting Supply Request Data to Google Forms:', googleFormsError);
                // Consider whether a Google Forms failure should be considered
                // a critical error. You might want to inform the user or retry.
                // For now, we'll just log the error.
            }
            // --- End Google Forms Submission ---

            // --- Reset Form on Success ---
            this.form.reset(); // Clears standard inputs like name, details

            // Clear dynamic items and add back one empty slot
            this.supplyItemsContainer.innerHTML = '';
            this.itemCounter = 0; // Reset counter
            this.addSupplyItemInput(); // Adds one item back and calls updateItemLabels

            // Refresh the recent items list to show the new submission
            this.recentSupplyRequestsListComponent?.refresh();

            // Clear the success message after a few seconds
            setTimeout(() => this.clearStatus(), 5000);

        } catch (error) {
            console.error("Error submitting supply request via DataManager:", error);
            // Provide a user-friendly error message
            this.showStatus(`Submission failed: ${error.message || 'An unknown error occurred. Please try again.'}`, true);
        } finally {
             // --- Re-enable Submit Button ---
             // Crucial to do this in 'finally' to ensure it happens even if submission fails
             this.submitButton.disabled = false;
             this.submitButton.textContent = 'Submit Request';
        }
    }

    // --- Status Message Handling ---
    showStatus(message, isError = false) {
        if (!this.formStatus) return; // Do nothing if status element doesn't exist
        this.formStatus.textContent = message;
        // Use classes for styling success/error states (defined in CSS)
        this.formStatus.className = `form-status-message ${isError ? 'error' : 'success'}`;
        // Set ARIA live region attribute for screen reader announcements
        this.formStatus.setAttribute('aria-live', isError ? 'assertive' : 'polite');
    }

    clearStatus() {
         if (!this.formStatus) return;
        this.formStatus.textContent = '';
        this.formStatus.className = 'form-status-message'; // Reset classes
        this.formStatus.removeAttribute('aria-live'); // Remove live region attribute
    }

    // --- Cleanup ---
    destroy() {
        console.log("Destroying SupplyRequestHandler and removing listeners...");
        // Remove direct event listeners
        this.form?.removeEventListener("submit", this.handleFormSubmit);
        this.addSupplyItemBtn?.removeEventListener("click", this.addSupplyItemInput);
        document.removeEventListener('click', this.boundHandleDocumentClick);

        // It's generally good practice to remove delegated listeners too,
        // although if the container itself is removed from the DOM, they become inactive.
        // If the container might persist, uncommenting these is safer:
        // this.supplyItemsContainer?.removeEventListener('click', ...); // Need the exact handler function reference
        // this.supplyItemsContainer?.removeEventListener('input', ...);
        // this.supplyItemsContainer?.removeEventListener('focusin', ...);
        // this.supplyItemsContainer?.removeEventListener('keydown', ...);
        // Note: Removing delegated listeners requires storing the handler function reference,
        // which is currently done inline. You might need to refactor slightly if explicit removal is needed.

        // Destroy child components
        this.recentSupplyRequestsListComponent?.destroy();

        // Clear DOM references and data
        this.form = null;
        this.submitterNameInput = null;
        this.supplyItemsContainer = null;
        this.addSupplyItemBtn = null;
        this.requestDetailsInput = null;
        this.formStatus = null;
        this.submitButton = null;
        this.supplyItemData = [];
        this.activeAutocompleteInput = null;
        this.recentSupplyRequestsListComponent = null;
        this.dataManager = null; // Release reference

        console.log("SupplyRequestHandler destroyed.");
    }
}