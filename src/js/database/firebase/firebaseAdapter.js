import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, serverTimestamp, query, orderByChild, limitToLast } from "firebase/database";
import { DatabaseInterface } from "../databaseInterface.js";

class FirebaseAdapter extends DatabaseInterface {
    constructor(firebaseConfig) {
        super(); // Call the parent constructor
        if (!firebaseConfig) {
            throw new Error("Firebase configuration is required for FirebaseAdapter.");
        }
        this.firebaseConfig = firebaseConfig;
        this.app = null;
        this.database = null; // Renamed from 'db' for consistency
        console.log("FirebaseAdapter created.");
    }

    /**
     * Initializes the Firebase application and database connection.
     * Must be called before other database operations.
     */
    async initialize() {
        try {
            console.log("Initializing Firebase app...");
            this.app = initializeApp(this.firebaseConfig);
            console.log("Firebase app initialized.");
            console.log("Getting Firebase database instance...");
            this.database = getDatabase(this.app);
            console.log("Firebase database instance obtained.");
            // Optional: Test connection
            // await get(ref(this.database, '.info/connected'));
            console.log("FirebaseAdapter initialized successfully.");
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            throw new Error(`Firebase initialization failed: ${error.message}`);
        }
    }

    /**
     * Saves data to a specified path in Firebase.
     * @param {string} path - The database path.
     * @param {*} value - The data to save.
     */
    async saveData(path, value) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first.");
        try {
            const dataRef = ref(this.database, path);
            await set(dataRef, value);
            console.log(`Data saved successfully at path: ${path}`);
        } catch (error) {
            console.error(`Firebase saveData error at path ${path}:`, error);
            throw new Error("Failed to save data to Firebase.");
        }
    }

    /**
     * Loads data from a specified path in Firebase.
     * @param {string} path - The database path.
     * @returns {Promise<*>} A promise resolving to the data, or null if not found.
     */
    async loadData(path) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first.");
        try {
            const dataRef = ref(this.database, path);
            const snapshot = await get(dataRef);
            return snapshot.val(); // Returns null if path doesn't exist
        } catch (error) {
            console.error(`Firebase loadData error at path ${path}:`, error);
            throw new Error("Failed to load data from Firebase.");
        }
    }

    /**
     * Logs a change event to a specified path in Firebase.
     * @param {string} path - The base path for the change log.
     * @param {string} time - The time identifier associated with the change.
     * @param {number} dayIndex - The day index associated with the change.
     * @param {*} oldValue - The value before the change.
     * @param {*} newValue - The value after the change.
     */
     async logChange(path, time, dayIndex, oldValue, newValue) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first.");
        try {
            const logRef = ref(this.database, path);
            const newLogEntryRef = push(logRef); // Creates a unique ID for the log entry
            await set(newLogEntryRef, {
                timestamp: serverTimestamp(), // Use Firebase server time
                time: time,
                dayIndex: dayIndex,
                oldValue: oldValue,
                newValue: newValue
            });
            console.log(`Change logged successfully at path: ${path}`);
        } catch (error) {
            console.error(`Firebase logChange error at path ${path}:`, error);
            throw new Error("Failed to log change to Firebase.");
        }
    }

    /**
     * Loads the change log from a specified path, ordered by timestamp.
     * @param {string} path - The database path for the change log.
     * @returns {Promise<object|null>} A promise resolving to the change log data, or null.
     */
    async loadChangeLog(path) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first.");
        try {
            const changeLogRef = ref(this.database, path);
            // Fetch the last 50 log entries, ordered by timestamp
            const logQuery = query(changeLogRef, orderByChild('timestamp'), limitToLast(50));
            const snapshot = await get(logQuery);
            return snapshot.val(); // Returns an object of log entries or null
        } catch (error) {
            console.error(`Firebase loadChangeLog error at path ${path}:`, error);
            throw new Error("Failed to load change log from Firebase.");
        }
    }

    /**
     * Fetches the most recent items from a specified path, ordered by timestamp.
     * @param {string} path - The database path (e.g., 'supplyRequests', 'maintenanceRequests').
     * @param {number} limit - The maximum number of items to fetch.
     * @returns {Promise<Array<object>>} A promise resolving to an array of items, newest first.
     */
    async getRecentItems(path, limit) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first.");
        try {
            const dbRef = ref(this.database, path);
            // Order by 'firebaseTimestamp' (as used in save methods) and get the last 'limit' items
            const dataQuery = query(dbRef, orderByChild('firebaseTimestamp'), limitToLast(limit));
            const snapshot = await get(dataQuery);

            if (snapshot.exists()) {
                const data = snapshot.val();
                // Firebase returns an object; convert to an array and reverse sort (newest first)
                const itemsArray = Object.keys(data).map(key => ({
                    id: key, // Include the Firebase key as id
                    ...data[key]
                })).sort((a, b) => (b.firebaseTimestamp || 0) - (a.firebaseTimestamp || 0)); // Sort descending
                return itemsArray;
            } else {
                return []; // No items found
            }
        } catch (error) {
            console.error(`FirebaseAdapter: Error fetching recent items from ${path}:`, error);
            throw error; // Re-throw the error to be caught by DataManager
        }
    }


    // --- Specific Save Methods (Kept for potential distinct logic or clarity) ---

    /**
     * Saves a maintenance request to the specified path.
     * @param {string} path - The base path for maintenance requests.
     * @param {object} requestData - The request data object.
     * @returns {Promise<string>} A promise resolving to the unique key of the saved request.
     */
    async saveMaintenanceRequest(path, requestData) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first.");
        try {
            const requestsRef = ref(this.database, path);
            const newRequestRef = push(requestsRef); // Generate unique ID
            const dataToSave = {
                ...requestData,
                firebaseTimestamp: serverTimestamp() // Add server-side timestamp
            };
            await set(newRequestRef, dataToSave);
            console.log("Maintenance request saved with ID:", newRequestRef.key);
            return newRequestRef.key;
        } catch (error) {
            console.error(`Firebase saveMaintenanceRequest error at path ${path}:`, error);
            throw new Error("Failed to save maintenance request to Firebase.");
        }
    }

    /**
     * Saves a supply request to the specified path.
     * @param {string} path - The base path for supply requests.
     * @param {object} requestData - The request data object.
     * @returns {Promise<string>} A promise resolving to the unique key of the saved request.
     */
    async saveSupplyRequest(path, requestData) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first.");
        try {
            const requestsRef = ref(this.database, path);
            const newRequestRef = push(requestsRef); // Generate unique ID
            const dataToSave = {
                ...requestData,
                firebaseTimestamp: serverTimestamp() // Add server-side timestamp
            };
            await set(newRequestRef, dataToSave);
            console.log("Supply request saved with ID:", newRequestRef.key);
            return newRequestRef.key;
        } catch (error) {
            console.error(`Firebase saveSupplyRequest error at path ${path}:`, error);
            throw new Error("Failed to save supply request to Firebase.");
        }
    }

    /**
     * Saves a wishlist request to the specified path.
     * @param {string} path - The base path for wishlist requests.
     * @param {object} requestData - The request data object.
     * @returns {Promise<string>} A promise resolving to the unique key of the saved request.
     */
    async saveWishlistRequest(path, requestData) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first.");
        try {
            const requestsRef = ref(this.database, path);
            const newRequestRef = push(requestsRef); // Generate unique ID
            const dataToSave = {
                ...requestData,
                firebaseTimestamp: serverTimestamp() // Add server-side timestamp
            };
            await set(newRequestRef, dataToSave);
            console.log("Wishlist request saved with ID:", newRequestRef.key);
            return newRequestRef.key;
        } catch (error) {
            console.error(`Firebase saveWishlistRequest error at path ${path}:`, error);
            throw new Error("Failed to save wishlist request to Firebase.");
        }
    }
}

export default FirebaseAdapter;