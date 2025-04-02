import { toggleCollapse } from '../utils/utils.js';

export class CollapsibleSections {
    constructor() {
        this.toggleEquipmentButton = document.getElementById("toggleEquipmentButton");
        this.toggleRequestButton = document.getElementById("toggleRequestButton");
        this.toggleViewReqButton = document.getElementById("toggleViewReqButton");
        this.toggleSafetyLogsButton = document.getElementById("toggleSafetyLogsButton");
    }

    initialize() {
        if (this.toggleEquipmentButton) {
            this.toggleEquipmentButton.addEventListener("click", () => {
                toggleCollapse('equiptmentSignUp');
            });
        }
        if (this.toggleRequestButton) {
            this.toggleRequestButton.addEventListener("click", () => {
                toggleCollapse('requestForms');
            });
        }
        if (this.toggleViewReqButton) {
            this.toggleViewReqButton.addEventListener("click", () => {
                toggleCollapse('viewRequests');
            });
        }
        if (this.toggleSafetyLogsButton) {
            this.toggleSafetyLogsButton.addEventListener("click", () => {
                toggleCollapse('safetyLogs');
            });
        }
    }
}
