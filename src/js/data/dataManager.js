import { DatabaseInterface } from '../database/databaseInterface.js'; // Corrected import path

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
        this.pageType = Object.values(this.pageTypes).find(type => window.location.pathname.includes(type)) || this.pageTypes.fesBike;

        this.currentPath = `${this.pageType}/currentSchedule`;
        this.changeLogPath = `${this.pageType}/changeLog`;
    }

    async saveData(time, day, value) {
        const path = `${this.currentPath}/${time}/${day}`;
        try {
            await this.databaseAdapter.saveData(path, value);
        } catch (error) {
            console.error("DataManager saveData error:", error);
            throw new Error("Failed to save data.");
        }
    }

    async loadData(path) {
        // console.log("DataManager: Attempting to load data from path:", path);
        try {
            const data = await this.databaseAdapter.loadData(path);
            // console.log("DataManager: Data loaded from path", path, ":", data);
            return data;
        } catch (error) {
            console.error("DataManager loadData error:", error);
            throw new Error("Failed to load data.");
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
}
