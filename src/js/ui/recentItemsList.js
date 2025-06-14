import { escapeHtml } from '../utils/utils.js';

export class RecentItemsList {
    /**
     * Creates an instance of RecentItemsList.
     * @param {object} dataManager - The data manager instance.
     * @param {object} options - Configuration options.
     * @param {string} options.listElementId - The ID of the HTML element to display the list in.
     * @param {function} options.loadDataFunction - An async function (e.g., dataManager.loadMaintenanceRequests) to fetch data. It should accept a limit argument.
     * @param {function} options.renderItemFunction - A function that takes a single data item and returns an HTML string or DOM element for that item.
     * @param {number} [options.itemLimit=15] - The maximum number of items to load.
     * @param {string} [options.loadingMessage='<p>Loading recent items...</p>'] - HTML string for loading state.
     * @param {string} [options.noItemsMessage='<p>No recent items found.</p>'] - HTML string when no data is found.
     * @param {string} [options.errorMessage='<p>Could not load items. Please try again later.</p>'] - HTML string on error.
     */
    constructor(dataManager, options) {
        if (!dataManager || !options || !options.listElementId || !options.loadDataFunction || !options.renderItemFunction) {
            throw new Error("RecentItemsList requires dataManager and options (listElementId, loadDataFunction, renderItemFunction)");
        }
        this.dataManager = dataManager;
        this.options = {
            itemLimit: 15,
            loadingMessage: '<p>Loading recent items...</p>',
            noItemsMessage: '<p>No recent items found.</p>',
            errorMessage: '<p>Could not load items. Please try again later.</p>',
            ...options // Override defaults with provided options
        };
        this.listElement = document.getElementById(this.options.listElementId);

        // Bind methods
        this.displayItems = this.displayItems.bind(this);
    }

    initialize() {
        if (!this.listElement) {
            console.error(`RecentItemsList: Element with ID "${this.options.listElementId}" not found.`);
            return false;
        }
        console.log(`RecentItemsList initialized for element #${this.options.listElementId}`);
        this.displayItems(); // Initial load
        return true;
    }

    async displayItems() {
        if (!this.listElement) return;

        this.listElement.innerHTML = this.options.loadingMessage;

        try {
            const itemsData = await this.options.loadDataFunction(this.options.itemLimit);

            if (itemsData && typeof itemsData === 'object' && Object.keys(itemsData).length > 0) {
                // Sort by timestamp descending (assuming firebaseTimestamp or clientTimestamp exists)
                const items = Object.values(itemsData)
                    .sort((a, b) => (b.firebaseTimestamp || b.clientTimestamp || 0) - (a.firebaseTimestamp || a.clientTimestamp || 0));

                this.listElement.innerHTML = ''; // Clear loading message

                items.forEach(item => {
                    const itemElement = this.options.renderItemFunction(item);
                    if (itemElement instanceof HTMLElement) {
                        this.listElement.appendChild(itemElement);
                    } else if (typeof itemElement === 'string') {
                        // Basic protection against appending raw script tags if render function returns unsafe string
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = itemElement;
                        // Append child nodes of the temporary div
                        while (tempDiv.firstChild) {
                             this.listElement.appendChild(tempDiv.firstChild);
                        }
                    }
                });

            } else {
                this.listElement.innerHTML = this.options.noItemsMessage;
            }
        } catch (error) {
            console.error(`Error loading items for list #${this.options.listElementId}:`, error);
            this.listElement.innerHTML = this.options.errorMessage;
            // Optionally re-throw or notify user differently
        }
    }

    // Optional: Method to manually refresh the list
    refresh() {
        this.displayItems();
    }

    // Optional: Cleanup if needed
    destroy() {
        // No listeners added directly by this class, but good practice
        if (this.listElement) {
            this.listElement.innerHTML = ''; // Clear content
        }
        console.log(`RecentItemsList for #${this.options.listElementId} destroyed.`);
    }
}

// --- Example Renderer Function (can be defined in the specific page's handler) ---
export function renderMaintenanceRequestItem(request) {
    const requestItem = document.createElement("div");
    // Use a more generic base class + specific class
    requestItem.className = "recent-item maintenance-request-item"; // Add specific class

    const timestampSource = request.firebaseTimestamp || request.clientTimestamp;
    const timestamp = timestampSource
        ? new Date(timestampSource).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : 'No date';

    const equipment = escapeHtml(request.equipmentName || 'N/A');
    const type = escapeHtml(request.requestType || 'N/A');
    const submitter = escapeHtml(request.submitterName || 'Unknown');
    const details = request.requestDetails || '';
    const status = escapeHtml(request.status || 'Unknown'); // Added status
    const detailsPreview = escapeHtml(details.substring(0, 100)) + (details.length > 100 ? '...' : '');

    requestItem.innerHTML = `
        <strong>${equipment}</strong>
        <span class="item-details-preview" title="${escapeHtml(details)}">${detailsPreview}</span>
        <div class="item-meta">
            <span>Type: ${type}</span>
            <span>Status: ${status}</span>
            <span>Submitted: ${timestamp} by ${submitter}</span>
        </div>
    `;
    return requestItem;
}