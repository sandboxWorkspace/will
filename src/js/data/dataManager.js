import { DatabaseInterface } from '../database/databaseInterface.js';

export class DataManager {
    constructor(databaseAdapter) {
        if (!(databaseAdapter instanceof DatabaseInterface)) {
            throw new Error("databaseAdapter must be an instance of DatabaseInterface");
        }
        this.databaseAdapter = databaseAdapter;
        // Define available page types
        this.pageTypes = {
            fesBike: "fesBike",
            // xCite: "xCite",
            // tech: "tech",
        };

        // Determine the current page type (default to fesBike if not found)
        // This might need adjustment if maintenance page doesn't fit this pattern
        this.pageType = Object.values(this.pageTypes).find(type => window.location.pathname.includes(type)) || this.pageTypes.fesBike;

        // Define paths
        this.schedulePath = `${this.pageType}/currentSchedule`;
        this.changeLogPath = `${this.pageType}/changeLog`;
        this.maintenanceRequestPath = 'maintenanceRequests'; // Top-level path for all requests

        console.log("DataManager Initialized. Schedule Path:", this.schedulePath, "Maintenance Path:", this.maintenanceRequestPath);
    }

    // --- Schedule Methods ---
    async saveScheduleData(time, day, value) {
        const path = `${this.schedulePath}/${time}/${day}`;
        try {
            await this.databaseAdapter.saveData(path, value);
        } catch (error) {
            console.error("DataManager saveScheduleData error:", error);
            throw new Error("Failed to save schedule data."); // Re-throw specific error
        }
    }

    async loadScheduleData() {
        const path = this.schedulePath;
        try {
            const data = await this.databaseAdapter.loadData(path);
            return data;
        } catch (error) {
            console.error("DataManager loadScheduleData error:", error);
            throw new Error("Failed to load schedule data.");
        }
    }

    async logChange(time, dayIndex, oldValue, newValue) {
        try {
            await this.databaseAdapter.logChange(this.changeLogPath, time, dayIndex, oldValue, newValue);
        } catch (error) {
            console.error("DataManager logChange error:", error);
            throw new Error("Failed to log change.");
        }
    }

    async loadChangeLog() {
        try {
            return await this.databaseAdapter.loadChangeLog(this.changeLogPath);
        } catch (error) {
            console.error("DataManager loadChangeLog error:", error);
            throw new Error("Failed to load change log.");
        }
    }

    // --- Maintenance Request Methods ---
    async saveMaintenanceRequest(requestData) {
        try {
            // Add client timestamp if not already present (useful fallback)
            const dataToSave = {
                clientTimestamp: Date.now(),
                ...requestData,
                status: requestData.status || "Submitted" // Ensure default status
            };
            return await this.databaseAdapter.saveMaintenanceRequest(this.maintenanceRequestPath, dataToSave);
        } catch (error) {
            console.error("DataManager saveMaintenanceRequest error:", error);
            throw new Error("Failed to save maintenance request.");
        }
    }

    async loadMaintenanceRequests(limit = 15) { // Pass limit down
        try {
            return await this.databaseAdapter.loadMaintenanceRequests(this.maintenanceRequestPath, limit);
        } catch (error) {
            console.error("DataManager loadMaintenanceRequests error:", error);
            throw new Error("Failed to load maintenance requests.");
        }
    }
}