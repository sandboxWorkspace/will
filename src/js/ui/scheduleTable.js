export class ScheduleTable {
    constructor(dataManager, confirmationModal) {
        this.dataManager = dataManager;
        this.confirmationModal = confirmationModal; // Store the modal instance
        this.tableBody = document.querySelector("#schedule-table tbody");
        this.timeSlots = ["8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p"];
        this.daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    }

    async initialize() {
        if (!this.tableBody) {
            console.log("Scheduling table <tbody> not found, skipping schedule initialization.");
            return;
        }
        if (!this.confirmationModal) {
            console.error("ConfirmationModal instance not provided to ScheduleTable. Cannot initialize.");
            return; // Need the modal to function correctly
        }

        console.log("Initializing schedule table...");
        // Clear the table body first
        this.tableBody.innerHTML = '';
        // Populate the table structure and load data concurrently
        await this.populateAndLoadTable();
        // Setup listeners after table is ready
        this.setupEventListeners();
        console.log("Schedule table initialized and listeners set up.");
    }

    async populateAndLoadTable() {
        const loadPromises = this.timeSlots.map(async (time) => {
            const row = document.createElement("tr");
            const timeCell = document.createElement("td");
            timeCell.textContent = time;
            row.appendChild(timeCell); // Add time cell first

            // Create promises for loading data for each day cell in this row
            const cellPromises = this.daysOfWeek.map(async (day, index) => {
                const cell = document.createElement("td");
                cell.contentEditable = "true";
                cell.dataset.time = time;
                cell.dataset.day = index; // Use index (0-4) for data consistency
                cell.dataset.valueBeforeEdit = ""; // Initialize dataset property

                // Construct path (ensure dataManager uses this format)
                const path = `${this.dataManager.currentPath}/${time}/${index}`;
                let value = ""; // Default to empty string

                try {
                    value = await this.dataManager.loadData(path) || "";
                } catch (error) {
                    console.error(`Error loading data for ${time}, Day ${index} (${day}) at path ${path}:`, error);
                    // Keep value as "" on error
                } finally {
                    cell.textContent = value;
                    cell.dataset.valueBeforeEdit = value; // Set initial state based on loaded data
                }
                return cell; // Return the created and populated cell
            });

            // Wait for all cells in this row to be created and data loaded
            const cells = await Promise.all(cellPromises);
            cells.forEach(cell => row.appendChild(cell)); // Append cells in correct order

            return row; // Return the fully populated row
        });

        // Wait for all row promises to complete
        const rows = await Promise.all(loadPromises);
        // Append rows to the table body
        rows.forEach(row => this.tableBody.appendChild(row));

        console.log("Schedule table populated and data loaded.");
    }


    setupEventListeners() {
        // --- Add 'focusin' listener to store value before editing ---
        this.tableBody.addEventListener('focusin', (event) => {
            // Use closest to handle clicks potentially on inner elements if cell formatting gets complex
            const cell = event.target.closest('td[contenteditable="true"]');
            if (cell) {
                // Store the value exactly as it is when focus is gained
                cell.dataset.valueBeforeEdit = cell.textContent.trim();
                // console.log(`Focus on [${cell.dataset.time}, Day ${cell.dataset.day}]. Stored value: "${cell.dataset.valueBeforeEdit}"`);
            }
        });

        // --- Modify 'focusout' (blur) listener to trigger modal on change ---
        this.tableBody.addEventListener('focusout', (event) => {
            const cell = event.target.closest('td[contenteditable="true"]');
            if (cell) {
                const valueBeforeEdit = cell.dataset.valueBeforeEdit || "";
                const currentValue = cell.textContent.trim();

                // console.log(`Blur on [${cell.dataset.time}, Day ${cell.dataset.day}]. Before: "${valueBeforeEdit}", After: "${currentValue}"`);

                // Only show modal if the value has actually changed
                if (currentValue !== valueBeforeEdit) {
                    // console.log("Change detected, showing confirmation modal.");
                    // Pass the cell and the value *before* the edit started
                    // The modal will disable editing while it's open
                    this.confirmationModal.showModal(cell, valueBeforeEdit);
                }
                // No 'else' needed here - if no change, nothing happens.
                // The cell remains editable unless the modal opens and disables it.
            }
        }, true); // Using capture phase for focusout can sometimes help catch blur events more reliably, but bubble (false/default) is usually fine.

        // --- Keep 'keydown' listener for Enter -> blur ---
        this.tableBody.addEventListener('keydown', (event) => {
            const cell = event.target.closest('td[contenteditable="true"]');
            // Check if the target is indeed a cell and the key is Enter
            if (cell && event.key === "Enter") {
                event.preventDefault(); // IMPORTANT: Prevent adding a newline in the cell
                cell.blur(); // Trigger the focusout event listener above
            }
        });
    }

    // Optional: Add a method to remove listeners if the table component can be destroyed/recreated
    destroy() {
        // A more robust way to remove listeners if needed:
        // Clone the node and replace it, which removes all listeners
        // const old_tbody = this.tableBody;
        // const new_tbody = old_tbody.cloneNode(false); // false = don't clone children/content
        // // You might need to repopulate new_tbody here if you need the content
        // old_tbody.parentNode.replaceChild(new_tbody, old_tbody);
        // this.tableBody = new_tbody; // Update reference if needed elsewhere
        // console.log("ScheduleTable listeners removed by node replacement.");

        // Or, if you store references to the bound listeners, you can remove them specifically.
        // For this setup, letting them be garbage collected if the table is removed from DOM is often sufficient.
        console.log("ScheduleTable listeners potentially active if element persists.");
    }
}
