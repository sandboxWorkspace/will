import { DatabaseInterface } from '../database/databaseInterface.js';

export class DataManager {
    constructor(databaseAdapter) {
        // Ensure the adapter implements the expected interface
        if (!(databaseAdapter instanceof DatabaseInterface)) {
            // Or check for specific methods if DatabaseInterface is abstract/not used for instanceof
            console.error("Provided databaseAdapter:", databaseAdapter);
            throw new Error("databaseAdapter does not conform to the expected DatabaseInterface structure.");
        }
        this.databaseAdapter = databaseAdapter;

        // Define base paths for different data types
        this.scheduleBasePath = "schedule";
        this.maintenanceRequestPath = 'maintenanceRequests';
        this.supplyRequestPath = 'supplyRequests';

        console.log("DataManager Initialized. Paths configured.");
    }

    // --- Schedule Methods ---
    async saveScheduleData(scheduleType, time, day, value) {
        const path = `${scheduleType}/currentSchedule/${time}/${day}`;
        try {
            // Assuming adapter has a generic saveData method
            await this.databaseAdapter.saveData(path, value);
        } catch (error) {
            console.error(`DataManager saveScheduleData error for path ${path}:`, error);
            throw new Error(`Failed to save schedule data for ${scheduleType}.`);
        }
    }

    async loadScheduleData(scheduleType) {
        const path = `${scheduleType}/currentSchedule`;
        try {
            // Assuming adapter has a generic loadData method
            const data = await this.databaseAdapter.loadData(path);
            return data;
        } catch (error) {
            console.error(`DataManager loadScheduleData error for path ${path}:`, error);
            throw new Error(`Failed to load schedule data for ${scheduleType}.`);
        }
    }

    async logChange(scheduleType, time, dayIndex, oldValue, newValue) {
        const path = `${scheduleType}/changeLog`; // Path specific to the schedule type
        try {
            // Assuming adapter has a specific logChange method
            await this.databaseAdapter.logChange(path, time, dayIndex, oldValue, newValue);
        } catch (error) {
            console.error(`DataManager logChange error for path ${path}:`, error);
            throw new Error(`Failed to log change for ${scheduleType}.`);
        }
    }

    async loadChangeLog(scheduleType = 'fesBike') { // Default or pass type
        const path = `${scheduleType}/changeLog`;
        try {
            // Assuming adapter has a specific loadChangeLog method
            return await this.databaseAdapter.loadChangeLog(path);
        } catch (error)
        {
            console.error(`DataManager loadChangeLog error for path ${path}:`, error);
            throw new Error(`Failed to load change log for ${scheduleType}.`);
        }
    }

    // --- Maintenance Request Methods ---
    async saveMaintenanceRequest(requestData) {
        try {
            const dataToSave = {
                clientTimestamp: Date.now(), // Add client-side timestamp
                ...requestData,
                status: requestData.status || "Submitted" // Ensure status is set
            };
            // Assuming adapter has a method suitable for saving list items, potentially saveData or a specific one
            // If using a generic saveData, it might need the path and data.
            // If adapter has saveMaintenanceRequest, use that. Let's assume a generic 'saveListItem' for now.
             if (typeof this.databaseAdapter.saveListItem !== 'function') {
                 console.warn("Database adapter might be missing a 'saveListItem' method. Trying generic 'saveData'.");
                 // Fallback or specific implementation needed here based on adapter capabilities
                 // For Firebase, push() generates a unique ID, so saveData might not be ideal directly.
                 // Let's assume the adapter handles adding to a list correctly via a method.
                 // Reverting to the original assumption based on your code:
                 return await this.databaseAdapter.saveMaintenanceRequest(this.maintenanceRequestPath, dataToSave);
             }
             // If adapter had a generic method:
             // return await this.databaseAdapter.saveListItem(this.maintenanceRequestPath, dataToSave);
        } catch (error) {
            console.error("DataManager saveMaintenanceRequest error:", error);
            throw new Error("Failed to save maintenance request.");
        }
    }

    /**
     * Fetches the most recent maintenance requests.
     * Renamed from loadMaintenanceRequests for consistency.
     * @param {number} [limit=10] - The maximum number of requests to fetch.
     * @returns {Promise<Array<object>>} A promise that resolves with an array of maintenance request objects.
     */
    async getRecentMaintenanceRequests(limit = 10) { // Renamed and adjusted default limit
        try {
            // Assuming adapter has a method to get recent items, ordered by time
             if (typeof this.databaseAdapter.getRecentItems !== 'function') {
                 // Fallback to original method name if getRecentItems doesn't exist
                 if (typeof this.databaseAdapter.loadMaintenanceRequests === 'function') {
                     console.warn("Database adapter missing 'getRecentItems', using 'loadMaintenanceRequests'.");
                     return await this.databaseAdapter.loadMaintenanceRequests(this.maintenanceRequestPath, limit);
                 } else {
                    throw new Error("Database adapter is missing a method to fetch recent maintenance requests.");
                 }
             }
            return await this.databaseAdapter.getRecentItems(this.maintenanceRequestPath, limit);
        } catch (error) {
            console.error("DataManager getRecentMaintenanceRequests error:", error);
            throw new Error("Failed to load recent maintenance requests.");
        }
    }

    // --- Supply Request Methods ---
    async saveSupplyRequest(requestData) {
        try {
            const dataToSave = {
                clientTimestamp: Date.now(), // Add client-side timestamp
                ...requestData, // includes submitterName, items array, details
                status: requestData.status || "Submitted" // Ensure status is set
            };
            // Assuming adapter has a method suitable for saving list items
            // Reverting to the original assumption based on your code:
            if (typeof this.databaseAdapter.saveSupplyRequest !== 'function') {
                 throw new Error("Database adapter is missing the 'saveSupplyRequest' method.");
            }
            return await this.databaseAdapter.saveSupplyRequest(this.supplyRequestPath, dataToSave);
             // If adapter had a generic method:
             // return await this.databaseAdapter.saveListItem(this.supplyRequestPath, dataToSave);
        } catch (error) {
            console.error("DataManager saveSupplyRequest error:", error);
            throw new Error("Failed to save supply request.");
        }
    }

    /**
     * Fetches the most recent supply requests.
     * Renamed from loadSupplyRequests to match usage in supplyRequest.js.
     * @param {number} [limit=10] - The maximum number of requests to fetch.
     * @returns {Promise<Array<object>>} A promise that resolves with an array of supply request objects.
     */
    async getRecentSupplyRequests(limit = 10) { // Renamed and adjusted default limit
        try {
            // Assuming adapter has a method to get recent items, ordered by time
             if (typeof this.databaseAdapter.getRecentItems !== 'function') {
                 // Fallback to original method name if getRecentItems doesn't exist
                 if (typeof this.databaseAdapter.loadSupplyRequests === 'function') {
                     console.warn("Database adapter missing 'getRecentItems', using 'loadSupplyRequests'.");
                     return await this.databaseAdapter.loadSupplyRequests(this.supplyRequestPath, limit);
                 } else {
                    throw new Error("Database adapter is missing a method to fetch recent supply requests.");
                 }
             }
            // Prefer using a generic 'getRecentItems' if available
            return await this.databaseAdapter.getRecentItems(this.supplyRequestPath, limit);
        } catch (error) {
            console.error("DataManager getRecentSupplyRequests error:", error);
            throw new Error("Failed to load recent supply requests.");
        }
    }
}