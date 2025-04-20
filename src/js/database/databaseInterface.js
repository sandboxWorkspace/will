export class DatabaseInterface {
    constructor() {
        if (this.constructor === DatabaseInterface) {
            throw new Error("Cannot instantiate abstract class!");
        }
    }
    async initialize() {
        throw new Error("Method 'initialize()' must be implemented.");
    }
    // Schedule methods
    async saveData(path, value) {
        throw new Error("Method 'saveData()' must be implemented.");
    }
    async loadData(path) {
        throw new Error("Method 'loadData()' must be implemented.");
    }
    async logChange(path, time, dayIndex, oldValue, newValue) {
        throw new Error("Method 'logChange()' must be implemented.");
    }
    async loadChangeLog(path) {
        throw new Error("Method 'loadChangeLog()' must be implemented.");
    }

    // Maintenance Request methods
    // Path parameter might be optional if adapter determines it, but keep for consistency for now
    async saveMaintenanceRequest(path, requestData) {
        throw new Error("Method 'saveMaintenanceRequest()' must be implemented.");
    }
    async loadMaintenanceRequests(path, limit) { // Added limit
        throw new Error("Method 'loadMaintenanceRequests()' must be implemented.");
    }

    // --- NEW: Supply Request methods ---
    async saveSupplyRequest(path, requestData) {
        throw new Error("Method 'saveSupplyRequest()' must be implemented.");
    }
    async loadSupplyRequests(path, limit) {
        throw new Error("Method 'loadSupplyRequests()' must be implemented.");
    }
}
