import { DatabaseInterface } from '../database/databaseInterface.js';

export class DataManager {
    constructor(databaseAdapter) {
        if (!(databaseAdapter instanceof DatabaseInterface)) {
            throw new Error("databaseAdapter must be an instance of DatabaseInterface");
        }
        this.databaseAdapter = databaseAdapter;
        // Define available page types (less relevant now with page detection in scripts.js)
        // this.pageTypes = { ... };
        // this.pageType = ...; // Determining page type here might be less flexible

        // Define base paths - let adapter handle specifics if needed
        // Or determine path based on context when method is called
        this.scheduleBasePath = "schedule"; // Example base path
        this.maintenanceRequestPath = 'maintenanceRequests'; // Top-level path
        this.supplyRequestPath = 'supplyRequests'; // Top-level path for supply requests

        console.log("DataManager Initialized. Paths configured.");
    }

    // --- Schedule Methods ---
    // Determine full path here based on context (e.g., specific schedule like 'fesBike')
    // Or pass context (like 'fesBike') from UI component
    async saveScheduleData(scheduleType, time, day, value) {
        const path = `${scheduleType}/currentSchedule/${time}/${day}`;
        try {
            await this.databaseAdapter.saveData(path, value);
        } catch (error) {
            console.error("DataManager saveScheduleData error:", error);
            throw new Error("Failed to save schedule data.");
        }
    }

    async loadScheduleData(scheduleType) {
        const path = `${scheduleType}/currentSchedule`;
        try {
            const data = await this.databaseAdapter.loadData(path);
            return data;
        } catch (error) {
            console.error("DataManager loadScheduleData error:", error);
            throw new Error("Failed to load schedule data.");
        }
    }

    async logChange(scheduleType, time, dayIndex, oldValue, newValue) {
        const path = `${scheduleType}/changeLog`; // Path specific to the schedule type
        try {
            await this.databaseAdapter.logChange(path, time, dayIndex, oldValue, newValue);
        } catch (error) {
            console.error("DataManager logChange error:", error);
            throw new Error("Failed to log change.");
        }
    }

    async loadChangeLog(scheduleType = 'fesBike') { // Default or pass type
        const path = `${scheduleType}/changeLog`;
        try {
            // Pass the specific path to the adapter
            return await this.databaseAdapter.loadChangeLog(path);
        } catch (error) {
            console.error("DataManager loadChangeLog error:", error);
            throw new Error("Failed to load change log.");
        }
    }

    // --- Maintenance Request Methods ---
    async saveMaintenanceRequest(requestData) {
        try {
            const dataToSave = {
                clientTimestamp: Date.now(),
                ...requestData,
                status: requestData.status || "Submitted"
            };
            // Pass the predefined path
            return await this.databaseAdapter.saveMaintenanceRequest(this.maintenanceRequestPath, dataToSave);
        } catch (error) {
            console.error("DataManager saveMaintenanceRequest error:", error);
            throw new Error("Failed to save maintenance request.");
        }
    }

    async loadMaintenanceRequests(limit = 15) {
        try {
            // Pass the predefined path and limit
            return await this.databaseAdapter.loadMaintenanceRequests(this.maintenanceRequestPath, limit);
        } catch (error) {
            console.error("DataManager loadMaintenanceRequests error:", error);
            throw new Error("Failed to load maintenance requests.");
        }
    }

    // --- NEW: Supply Request Methods ---
    async saveSupplyRequest(requestData) {
        try {
            const dataToSave = {
                clientTimestamp: Date.now(),
                ...requestData, // includes submitterName, items array, details
                status: requestData.status || "Submitted"
            };
            // Pass the predefined path for supply requests
            return await this.databaseAdapter.saveSupplyRequest(this.supplyRequestPath, dataToSave);
        } catch (error) {
            console.error("DataManager saveSupplyRequest error:", error);
            throw new Error("Failed to save supply request.");
        }
    }

    async loadSupplyRequests(limit = 15) {
        try {
            // Pass the predefined path and limit
            return await this.databaseAdapter.loadSupplyRequests(this.supplyRequestPath, limit);
        } catch (error) {
            console.error("DataManager loadSupplyRequests error:", error);
            throw new Error("Failed to load supply requests.");
        }
    }
}