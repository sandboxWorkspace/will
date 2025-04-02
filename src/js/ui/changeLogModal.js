export class ChangeLogModal {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.changelogModal = document.getElementById("changelogModal");
        this.closeChangelogBtn = document.getElementById("closeChangelogBtn");
        this.changelogList = document.getElementById("changelogList");
    }

    initialize() {
        if (this.changelogModal && this.closeChangelogBtn && this.changelogList) {
            document.getElementById("openChangelogBtn")?.addEventListener("click", () => {
                this.changelogModal.style.display = "block";
                this.loadChangeLog();
            });

            this.closeChangelogBtn.addEventListener("click", () => {
                this.changelogModal.style.display = "none";
            });

            window.addEventListener("click", (event) => {
                if (event.target === this.changelogModal) {
                    this.changelogModal.style.display = "none";
                }
            });
        } else {
            console.error("Changelog elements not found in the DOM");
        }
    }

    async loadChangeLog() {
        const changes = await this.dataManager.loadChangeLog();

        if (changes) {
            const changeEntries = Object.values(changes).sort((a, b) => b.timestamp - a.timestamp);
            this.changelogList.innerHTML = '';

            changeEntries.forEach(change => {
                const changeItem = document.createElement("div");
                changeItem.classList.add("changelog-item");
                changeItem.innerHTML = `
                    <strong>${new Date(change.timestamp).toLocaleString()}</strong><br>
                    Time: ${change.time}, Day: ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][change.dayIndex]}<br>
                    "${change.oldValue}" >> "${change.newValue}"
                `;
                this.changelogList.appendChild(changeItem);
            });
        }
    }
}
