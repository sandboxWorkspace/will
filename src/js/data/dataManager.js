export class DataManager {
    /**
     * @param {object} databaseAdapter - FirebaseAdapter instance.
     * @param {string} [location='southeast'] - Location prefix ('southeast' or 'moursund').
     */
    constructor(databaseAdapter, location = 'southeast') {
        this.databaseAdapter = databaseAdapter;
        this.location = location;

        // Build Firebase Realtime DB paths scoped by location
        this.maintenanceRequestPath = `${location}Maintenance`;
        this.supplyRequestPath = `${location}Supply`;
        this.wishlistRequestPath = `${location}Wishlist`;

        console.log(`DataManager Initialized for location "${location}". Paths:`, {
            maintenance: this.maintenanceRequestPath,
            supply: this.supplyRequestPath,
            wishlist: this.wishlistRequestPath,
        });
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

    // --- Wishlist Request Methods ---
    async saveWishlistRequest(requestData) {
        try {
            const dataToSave = {
                clientTimestamp: Date.now(),
                ...requestData,
                status: requestData.status || "Submitted"
            };
            // Assuming adapter has a specific saveWishlistRequest method or a generic one
            if (typeof this.databaseAdapter.saveWishlistRequest !== 'function') {
                // Potentially fallback to a generic saveListItem if that's your adapter's pattern
                // For now, let's assume a specific method is preferred for clarity
                throw new Error("Database adapter is missing the 'saveWishlistRequest' method.");
            }
            return await this.databaseAdapter.saveWishlistRequest(this.wishlistRequestPath, dataToSave);
        } catch (error) {
            console.error("DataManager saveWishlistRequest error:", error);
            throw new Error("Failed to save wishlist request.");
        }
    }

    async getRecentWishlistRequests(limit = 10) {
        try {
            // Prefer using a generic 'getRecentItems' if available and implemented in adapter
            if (typeof this.databaseAdapter.getRecentItems !== 'function') {
                 // Fallback or error if generic method is not available
                 if (typeof this.databaseAdapter.loadWishlistRequests === 'function') { // Example specific fallback
                     console.warn("Database adapter missing 'getRecentItems', using 'loadWishlistRequests'.");
                     return await this.databaseAdapter.loadWishlistRequests(this.wishlistRequestPath, limit);
                 }
                throw new Error("Database adapter is missing a method to fetch recent wishlist requests.");
            }
            return await this.databaseAdapter.getRecentItems(this.wishlistRequestPath, limit);
        } catch (error) {
            console.error("DataManager getRecentWishlistRequests error:", error);
            throw new Error("Failed to load recent wishlist requests.");
        }
    }
}