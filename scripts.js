// Import the functions from firebaseScripts.js
import { saveToFirebase, loadFromFirebase, loadChangeLog, logChange } from './firebaseScripts.js';

document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.querySelector("#schedule-table tbody");

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

        tableBody.appendChild(row);
    });

    // Load data on page load
    await loadFromFirebase(); // Now recognized as it's imported

    // Modal elements
    const confirmModal = document.getElementById("confirmModal");
    const confirmBtn = document.getElementById("confirmBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const changelogModal = document.getElementById("changelogModal");
    const closeChangelogBtn = document.getElementById("closeChangelogBtn");
    const changelogList = document.getElementById("changelogList");
    let targetCell = null;

    // Ensure modals are hidden on page load
    confirmModal.style.display = "none";
    changelogModal.style.display = "none";

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
        const time = targetCell.dataset.time;
        const day = targetCell.dataset.day;
        const value = targetCell.textContent.trim();
        saveToFirebase(time, day, value); // Save to Firebase
        confirmModal.style.display = "none"; // Close modal
        targetCell.focus(); // Keep focus on the target cell
    });

    // Cancel button logic (close modal without editing)
    cancelBtn.addEventListener("click", () => {
        targetCell = null;
        confirmModal.style.display = "none"; // Close modal
        targetCell.focus(); // Keep focus on the target cell
    });

    // Open changelog modal (triggered somewhere in your app)
    document.getElementById("openChangelogBtn").addEventListener("click", () => {
        changelogModal.style.display = "block"; // Show changelog modal
        loadChangeLog(); // Load changelog data when modal opens
    });

    // Close changelog modal
    closeChangelogBtn.addEventListener("click", () => {
        changelogModal.style.display = "none"; // Close modal
    });

    // Close modal if clicked outside of it
    window.addEventListener("click", (event) => {
        if (event.target === confirmModal) {
            confirmModal.style.display = "none";
        }
        if (event.target === changelogModal) {
            changelogModal.style.display = "none";
        }
    });

    // Handle Enter key to exit the cell edit mode
    tableBody.addEventListener('keydown', (event) => {
        const cell = event.target;
        if (cell.contentEditable === "true" && event.key === "Enter") {
            event.preventDefault();  // Prevent the default Enter behavior (adding a new line)
            cell.blur();  // Trigger blur event to save the change and exit the edit mode
        }
    });

// Track the last known value to prevent duplicate logs
tableBody.addEventListener('blur', async (event) => {
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
}, true);

});
