export class ConfirmationModal {
    // Removed scheduleTable dependency from constructor as it's passed by scheduleTable now
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.confirmModal = document.getElementById("confirmModal");
        this.confirmBtn = document.getElementById("confirmBtn");
        this.cancelBtn = document.getElementById("cancelBtn");
        this.deleteBtn = document.createElement("button");
        // Keep creating delete button
        this.targetCell = null;
        this.valueBeforeEdit = "";
        // Store the value before edit started

        // Bind methods to ensure 'this' context is correct inside handlers
        this.handleConfirm = this.handleConfirm.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.handleWindowClick = this.handleWindowClick.bind(this);
    }

    initialize() {
        if (!this.confirmModal || !this.confirmBtn || !this.cancelBtn) {
            console.error("Confirmation modal essential elements not found in the DOM.");
            return;
        }

        // Configure and add delete button
        this.deleteBtn.id = "deleteBtn";
        this.deleteBtn.textContent = "Delete";
        this.deleteBtn.classList.add("delete-button");
        // Use class for styling from modal.css
        const modalButtons = this.confirmModal.querySelector(".modal-buttons");
        if (modalButtons) {
            modalButtons.appendChild(this.deleteBtn);
        } else {
            console.error(".modal-buttons container not found for delete button.");
        }

        // Add event listeners for modal actions
        this.confirmBtn.addEventListener("click", this.handleConfirm);
        this.cancelBtn.addEventListener("click", this.handleCancel);
        this.deleteBtn.addEventListener("click", this.handleDelete);
        // Listener to close modal if clicking outside the content area
        window.addEventListener("click", this.handleWindowClick);
        console.log("ConfirmationModal initialized and listeners set up.");
    }

    // Updated showModal to accept the cell and its value before editing
    showModal(cell, valueBeforeEdit) {
        this.targetCell = cell;
        this.valueBeforeEdit = valueBeforeEdit;
        // Store the passed value
        // console.log(`Modal shown for [${cell.dataset.time}, Day ${cell.dataset.day}]. Value before edit: "${valueBeforeEdit}"`);

        // IMPORTANT: Disable editing *while* the modal is open
        if (this.targetCell) {
            this.targetCell.contentEditable = "false";
        }
        this.confirmModal.classList.add('is-visible');
        // Show modal using CSS class
    }

    hideModal() {
        this.confirmModal.classList.remove('is-visible');
        // Hide modal using CSS class
        // DO NOT re-enable editing here - it's handled in confirm/cancel/delete handlers
        // Clear state after hiding
        this.targetCell = null;
        this.valueBeforeEdit = "";
    }

    async handleConfirm() {
        if (!this.targetCell) {
            console.error("Target cell is missing in handleConfirm.");
            this.hideModal();
            return;
        }

        const cellToUpdate = this.targetCell;
        // Keep reference before hideModal clears it
        const time = cellToUpdate.dataset.time;
        const day = cellToUpdate.dataset.day;
        const oldValue = this.valueBeforeEdit;
        // Use the stored value from before edit
        const newValue = cellToUpdate.textContent.trim();
        // Get the currently displayed value

        // console.log(`Confirming change for [${time}, Day ${day}]: "${oldValue}" -> "${newValue}"`);

        try {
            // Only save/log if there's an actual change (final check)
            if (newValue !== oldValue) {
                // --- FIX: Use saveScheduleData ---
                await this.dataManager.saveScheduleData(time, day, newValue);
                await this.dataManager.logChange(time, day, oldValue, newValue);
                // Update the cell's internal "before edit" state for the *next* edit cycle
                cellToUpdate.dataset.valueBeforeEdit = newValue;
            } else {
                // console.log("No change detected on confirm, skipping save/log.");
                // Ensure the dataset value matches the text content even if no save occurred
                cellToUpdate.dataset.valueBeforeEdit = newValue;
            }
        } catch (error) {
            // --- FIX: Update error log message if desired ---
            console.error(`Error saving schedule data for [${time}, Day ${day}]:`, error);
            // Optional: Display an error message to the user in the UI
            // Decide on UX: Revert text on error?
            // cellToUpdate.textContent = oldValue; // Option: Revert visual change on save error
            // cellToUpdate.dataset.valueBeforeEdit = oldValue; // Also revert internal state if reverting text
        } finally {
            // Hide the modal regardless of success or failure
            this.hideModal();
            // IMPORTANT: Re-enable editing AFTER hiding and potential async ops
            cellToUpdate.contentEditable = "true";
            // Optional: focus the cell again after confirming
            // cellToUpdate.focus();
        }
    }

    handleCancel() {
        if (!this.targetCell) {
            console.warn("Target cell is missing in handleCancel.");
            this.hideModal();
            return;
        }

        const cellToRevert = this.targetCell;
        // Keep reference
        // console.log(`Cancelling edit for [${cellToRevert.dataset.time}, Day ${cellToRevert.dataset.day}]. Reverting to: "${this.valueBeforeEdit}"`);

        // Revert cell content to the value from before the edit started
        cellToRevert.textContent = this.valueBeforeEdit;
        // Ensure the internal state matches the reverted value for the next focusin
        cellToRevert.dataset.valueBeforeEdit = this.valueBeforeEdit;

        this.hideModal();
        // Re-enable editing AFTER hiding
        cellToRevert.contentEditable = "true";
        // Optional: focus after cancel
        // cellToRevert.focus();
    }

    async handleDelete() {
        if (!this.targetCell) {
            console.error("Target cell is missing in handleDelete.");
            this.hideModal();
            return;
        }

        const cellToDelete = this.targetCell;
        // Keep reference
        const time = cellToDelete.dataset.time;
        const day = cellToDelete.dataset.day;
        const oldValue = this.valueBeforeEdit;
        // Value being deleted
        const newValue = "";
        // Deleting means saving an empty string

        // console.log(`Deleting value for [${time}, Day ${day}]. Old value was: "${oldValue}"`);

        try {
            // --- FIX: Use saveScheduleData ---
            await this.dataManager.saveScheduleData(time, day, newValue);
            // Save empty string
            await this.dataManager.logChange(time, day, oldValue, newValue);
            // Log the deletion
            cellToDelete.textContent = "";
            // Clear the cell visually
            // Update the cell's internal "before edit" state to empty
            cellToDelete.dataset.valueBeforeEdit = "";
        } catch (error) {
             // --- FIX: Update error log message if desired ---
            console.error(`Error deleting schedule data for [${time}, Day ${day}]:`, error);
            // Optional: Display an error message
            // Decide on UX: Should the text be reverted if delete fails?
            // cellToDelete.textContent = oldValue; // Option: Revert visual change on delete error
            // cellToDelete.dataset.valueBeforeEdit = oldValue; // Revert internal state too
        } finally {
            // Hide the modal regardless of success or failure
            this.hideModal();
            // Re-enable editing AFTER hiding and potential async ops
            cellToDelete.contentEditable = "true";
            // Optional: focus after delete
            // cellToDelete.focus();
        }
    }

    handleWindowClick(event) {
        // Close modal if click is on the modal backdrop (the .modal element itself)
        if (event.target === this.confirmModal) {
            this.handleCancel();
            // Treat clicking outside as a cancel action
        }
    }

    // Method to clean up listeners if the modal instance is no longer needed
    destroy() {
        this.confirmBtn?.removeEventListener("click", this.handleConfirm);
        this.cancelBtn?.removeEventListener("click", this.handleCancel);
        this.deleteBtn?.removeEventListener("click", this.handleDelete);
        window.removeEventListener("click", this.handleWindowClick);
        this.deleteBtn?.remove();
        // Clean up the dynamically added button
        console.log("ConfirmationModal listeners removed.");
    }
}