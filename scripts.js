export function toggleCollapse(id) {
    const content = document.getElementById(id);
    const currentDisplay = window.getComputedStyle(content).display;
    
    if (currentDisplay === "none") {
        content.style.display = "block";
    } else {
        content.style.display = "none";
    }
}

// Import the functions from firebaseScripts.js
import { saveToFirebase, loadFromFirebase, loadChangeLog, logChange } from './firebaseScripts.js';

document.addEventListener("DOMContentLoaded", async () => {
    let targetCell = null;  // Declare targetCell here to be used across the script

    // Check if the table exists
    const tableBody = document.querySelector("#schedule-table tbody");
    if (tableBody) {
        console.log("Table is present. Proceeding with schedule table operations.");
        
        // Define time slots (8 AM - 4 PM)
        const timeSlots = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];

        // Populate the table (only for new or empty cells)
        timeSlots.forEach(time => {
            const row = document.createElement("tr");

            // Time column
            const timeCell = document.createElement("td");
            timeCell.textContent = time;
            row.appendChild(timeCell);

            // Monday - Friday columns (editable)
            for (let i = 0; i < 5; i++) {
                const cell = document.createElement("td");
                cell.contentEditable = "true"; // Make cells editable
                cell.dataset.day = i; // Store day index for Firestore
                cell.dataset.time = time; // Store time slot
                row.appendChild(cell);
            }

            tableBody.appendChild(row);  // This will now work safely
        });

        // Load data from Firebase (if needed)
        await loadFromFirebase();
    } else {
        console.log("Table not found on this page. Skipping schedule-related code.");
    }

    // ---- Modals and Other Elements ----

    // Handle Confirmation Modal
    const confirmModal = document.getElementById("confirmModal");
    const confirmBtn = document.getElementById("confirmBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    if (confirmModal && confirmBtn && cancelBtn) {
        confirmModal.style.display = "none";  // Hide the modal on page load
        
        // Show confirmation modal when editing a populated cell
        document.querySelector("#schedule-table tbody").addEventListener("click", (event) => {
            const cell = event.target;
            if (cell.contentEditable === "true" && cell.textContent.trim() !== "") {
                targetCell = cell;
                confirmModal.style.display = "block"; // Show the confirmation modal
            }
        });

        // Confirm button logic (overwrite cell)
        confirmBtn.addEventListener("click", () => {
            if (targetCell) {
                const time = targetCell.dataset.time;
                const day = targetCell.dataset.day;
                const value = targetCell.textContent.trim();
                saveToFirebase(time, day, value); // Save to Firebase
                confirmModal.style.display = "none"; // Close modal
                targetCell.focus(); // Keep focus on the target cell
                targetCell = null; // Clear targetCell after saving
            } else {
                console.error("targetCell is not defined.");
            }
        });

        // Cancel button logic (close modal without editing)
        cancelBtn.addEventListener("click", () => {
            targetCell = null;
            confirmModal.style.display = "none"; // Close modal
            if (targetCell) targetCell.focus(); // Keep focus on the target cell
        });

        // Close modal if clicked outside of it
        window.addEventListener("click", (event) => {
            if (event.target === confirmModal) {
                confirmModal.style.display = "none";
            }
        });
    }

    // Handle Changelog Modal
    const changelogModal = document.getElementById("changelogModal");
    const closeChangelogBtn = document.getElementById("closeChangelogBtn");

    if (changelogModal && closeChangelogBtn) {
        const changelogList = document.getElementById("changelogList");
        if (changelogList) {
            // Proceed with populating changelog
        } else {
            console.error("changelogList not found in the DOM");
        }

        // Open changelog modal (triggered somewhere in your app)
        document.getElementById("openChangelogBtn")?.addEventListener("click", () => {
            changelogModal.style.display = "block"; // Show changelog modal
            loadChangeLog(); // Load changelog data when modal opens
        });

        // Close changelog modal
        closeChangelogBtn.addEventListener("click", () => {
            changelogModal.style.display = "none"; // Close modal
        });

        // Close modal if clicked outside of it
        window.addEventListener("click", (event) => {
            if (event.target === changelogModal) {
                changelogModal.style.display = "none";
            }
        });
    }

    // ---- Button Handling for Collapsibles ----

    // Collapse buttons (for equipment, request forms, etc.)
    const toggleEquipmentButton = document.getElementById("toggleEquipmentButton");
    const toggleRequestButton = document.getElementById("toggleRequestButton");
    const toggleViewReqButton = document.getElementById("toggleViewReqButton");
    const toggleSafetyLogsButton = document.getElementById("toggleSafetyLogsButton");

    if (toggleEquipmentButton) {
        toggleEquipmentButton.addEventListener("click", () => {
            toggleCollapse('equiptmentSignUp');
        });
    }
    if (toggleRequestButton) {
        toggleRequestButton.addEventListener("click", () => {
            toggleCollapse('requestForms');
        });
    }
    if (toggleViewReqButton) {
        toggleViewReqButton.addEventListener("click", () => {
            toggleCollapse('viewRequests');
        });
    }
    if (toggleSafetyLogsButton) {
        toggleSafetyLogsButton.addEventListener("click", () => {
            toggleCollapse('safetyLogs');
        });
    }

    // ---- Handle "Blur" Event on Table Cells (for saving to Firebase) ----
    const tableBodyBlurListener = tableBody ? tableBody.addEventListener('blur', async (event) => {
        const cell = event.target;
        if (cell.contentEditable === "true") {
            const time = cell.dataset.time;
            const day = cell.dataset.day;
            const oldValue = cell.dataset.oldValue || ""; // Track last known value
            const newValue = cell.textContent.trim();

            // Only save and log if the value actually changed
            if (oldValue !== newValue) {
                await saveToFirebase(time, day, newValue);
                await logChange(time, day, oldValue, newValue);  // Log only if changed
            }

            // Update the cell's stored value
            cell.dataset.oldValue = newValue;
        }
    }, true) : null; // If tableBody is null, it won't attempt to add the event listener

    // Handle Enter key to exit the cell edit mode (only if table exists)
    if (tableBody) {
        tableBody.addEventListener('keydown', (event) => {
            const cell = event.target;
            if (cell.contentEditable === "true" && event.key === "Enter") {
                event.preventDefault();  // Prevent the default Enter behavior (adding a new line)
                cell.blur();  // Trigger blur event to save the change and exit the edit mode
            }
        });
    }
});
