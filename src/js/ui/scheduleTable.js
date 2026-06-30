export class ScheduleTable {
    constructor(dataManager, confirmationModal, scheduleType = 'fesBike') {
        this.dataManager = dataManager;
        this.confirmationModal = confirmationModal;
        this.scheduleType = scheduleType;
        this.tableBody = document.querySelector("#schedule-table tbody");
        this.timeSlots = ["8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm"];
        this.daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        this.scheduleData = null;
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

        try {
            // --- Load the entire schedule data first ---
            console.log("Loading schedule data...");
            this.scheduleData = await this.dataManager.loadScheduleData(this.scheduleType);
            console.log("Schedule data loaded:", this.scheduleData);
            // Handle case where data might be null/empty from the database
            if (!this.scheduleData) {
                this.scheduleData = {}; // Ensure it's an object for safe access later
                console.log("No existing schedule data found, initialized as empty.");
            }

            // --- Populate the table using the loaded data ---
            this.populateTableFromData();

            // Setup listeners after table is ready
            this.setupEventListeners();
            console.log("Schedule table initialized and listeners set up.");

        } catch (error) {
            console.error("Failed to initialize schedule table:", error);
            // Optionally display an error message to the user in the table area
            this.tableBody.innerHTML = `<tr><td colspan="${this.daysOfWeek.length + 1}" style="color: red; text-align: center;">Error loading schedule data. Please try again later.</td></tr>`;
        }
    }

    // Renamed and simplified: Populates table from this.scheduleData
    populateTableFromData() {
        this.timeSlots.forEach(time => {
            const row = document.createElement("tr");
            const timeCell = document.createElement("td");
            timeCell.textContent = time;
            row.appendChild(timeCell); // Add time cell first

            this.daysOfWeek.forEach((day, index) => {
                const cell = document.createElement("td");
                cell.contentEditable = "true";
                cell.dataset.time = time;
                cell.dataset.day = index; // Use index (0-4) for data consistency

                // --- Get value from the pre-loaded scheduleData ---
                // Use optional chaining (?.) for safety in case time or index doesn't exist
                const value = this.scheduleData?.[time]?.[index] || "";

                cell.textContent = value;
                cell.dataset.valueBeforeEdit = value; // Set initial state

                row.appendChild(cell);
            });

            this.tableBody.appendChild(row); // Append the fully populated row
        });

        console.log("Schedule table populated from loaded data.");
    }

    // Remove the old populateAndLoadTable method entirely as it's replaced by populateTableFromData

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

    // Note to self: maybe add a method to remove listeners if the table component can be destroyed/recreated
    destroy() {
        console.log("ScheduleTable listeners potentially active if element persists.");
    }
}