export class ConfirmationModal {
    constructor(dataManager, scheduleTable) {
        this.dataManager = dataManager;
        this.scheduleTable = scheduleTable;
        this.confirmModal = document.getElementById("confirmModal");
        this.confirmBtn = document.getElementById("confirmBtn");
        this.cancelBtn = document.getElementById("cancelBtn");
        this.targetCell = null;
    }

    initialize() {
        if (this.confirmModal && this.confirmBtn && this.cancelBtn) {
            this.confirmModal.style.display = "none";

            this.scheduleTable.tableBody.addEventListener("click", (event) => {
                const cell = event.target;
                if (cell.contentEditable === "true" && cell.textContent.trim() !== "") {
                    this.targetCell = cell;
                    this.targetCell.contentEditable = "false";
                    this.confirmModal.style.display = "block";
                }
            });

            this.confirmBtn.addEventListener("click", () => {
                if (this.targetCell) {
                    const time = this.targetCell.dataset.time;
                    const day = this.targetCell.dataset.day;
                    const value = this.targetCell.textContent.trim();
                    this.dataManager.saveData(time, day, value);
                    this.confirmModal.style.display = "none";
                    this.targetCell.contentEditable = "true";
                    this.targetCell.focus();
                    this.targetCell = null;
                } else {
                    console.error("targetCell is not defined.");
                }
            });

            this.cancelBtn.addEventListener("click", () => {
                if (this.targetCell) {
                    this.targetCell.contentEditable = "true";
                }
                this.targetCell = null;
                this.confirmModal.style.display = "none";
            });

            window.addEventListener("click", (event) => {
                if (event.target === this.confirmModal) {
                    if (this.targetCell) {
                        this.targetCell.contentEditable = "true";
                    }
                    this.confirmModal.style.display = "none";
                }
            });
        }
    }
}
