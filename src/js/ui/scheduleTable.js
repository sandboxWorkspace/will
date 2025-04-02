export class ScheduleTable {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.tableBody = document.querySelector("#schedule-table tbody");
        this.timeSlots = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];
        this.daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    }

    async initialize() {
        if (this.tableBody) {
            console.log("Scheduling table confirmed, running scheduling script.");
            this.populateTable();
            await this.loadData();
            this.setupEventListeners();
        } else {
            console.log("Scheduling table not found, skipping schedule-related code.");
        }
    }

    populateTable() {
        this.timeSlots.forEach(time => {
            const row = document.createElement("tr");
            const timeCell = document.createElement("td");
            timeCell.textContent = time;
            row.appendChild(timeCell);

            for (let i = 0; i < 5; i++) {
                const cell = document.createElement("td");
                cell.contentEditable = "true";
                cell.dataset.day = i;
                cell.dataset.time = time;
                row.appendChild(cell);
            }

            this.tableBody.appendChild(row);
        });
    }

    async loadData() {
        this.tableBody.innerHTML = '';
        const rowPromises = this.timeSlots.map(async (time) => {
            const row = document.createElement("tr");
            const timeCell = document.createElement("td");
            timeCell.textContent = time;
            row.appendChild(timeCell);

            const dayPromises = this.daysOfWeek.map(async (day, index) => {
                const path = `${this.dataManager.currentPath}/${time}/${index}`;
                try {
                    const value = await this.dataManager.loadData(path) || "";
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    cell.contentEditable = "true";
                    cell.dataset.time = time;
                    cell.dataset.day = index;
                    row.appendChild(cell);
                } catch (error) {
                    console.error("Error loading data:", error);
                }
            });

            await Promise.all(dayPromises);
            return row;
        });

        const rows = await Promise.all(rowPromises);
        rows.forEach(row => this.tableBody.appendChild(row));
    }

    setupEventListeners() {
        this.tableBody.addEventListener('blur', async (event) => {
            const cell = event.target;
            if (cell.contentEditable === "true") {
                const time = cell.dataset.time;
                const day = cell.dataset.day;
                const oldValue = cell.dataset.oldValue || "";
                const newValue = cell.textContent.trim();

                if (oldValue !== newValue || (newValue === "" && oldValue !== "")) {
                    await this.dataManager.saveData(time, day, newValue);
                    await this.dataManager.logChange(time, day, oldValue, newValue);
                }

                cell.dataset.oldValue = newValue;
            }
        }, true);

        this.tableBody.addEventListener('keydown', (event) => {
            const cell = event.target;
            if (cell.contentEditable === "true" && event.key === "Enter") {
                event.preventDefault();
                cell.blur();
            }
        });
    }
}
