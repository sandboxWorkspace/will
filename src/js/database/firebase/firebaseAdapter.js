import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, serverTimestamp, query, orderByChild, limitToLast } from "firebase/database";
import { DatabaseInterface } from "../databaseInterface.js";

// Helper function to format timestamp (can be moved to a utility file)
function formatTimestamp() {
    const date = new Date();
    // Use Intl for better locale support if needed, otherwise keep simple
    return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

class FirebaseAdapter extends DatabaseInterface {
    constructor(firebaseConfig) {
        super();
        this.firebaseConfig = firebaseConfig;
        this.app = null;
        this.database = null;
    }

    async initialize() {
        try {
            this.app = initializeApp(this.firebaseConfig);
            this.database = getDatabase(this.app);
            console.log("Firebase Adapter Initialized");
        } catch (error) {
            console.error("Firebase Adapter Initialization failed:", error);
            throw error; // Re-throw error after logging
        }
    }

    async saveData(path, value) {
        if (!this.database) throw new Error("Firebase not initialized.");
        try {
            const dbRef = ref(this.database, path);
            await set(dbRef, value);
        } catch (error) {
            console.error(`Firebase saveData error at path ${path}:`, error);
            throw new Error("Failed to save data to Firebase.");
        }
    }

    async loadData(path) {
        if (!this.database) throw new Error("Firebase not initialized.");
        try {
            const dbRef = ref(this.database, path);
            const snapshot = await get(dbRef);
            return snapshot.val(); // Returns null if no data exists
        } catch (error) {
            console.error(`Firebase loadData error at path ${path}:`, error);
            throw new Error("Failed to load data from Firebase.");
        }
    }

    async logChange(path, time, dayIndex, oldValue, newValue) {
        if (!this.database) throw new Error("Firebase not initialized.");
        try {
            // Use serverTimestamp for more reliable timing
            const changeData = {
                timestamp: serverTimestamp(), // Use Firebase server time
                clientTime: formatTimestamp(), // Keep client time for readability if needed
                time, // Schedule time slot
                dayIndex,
                oldValue,
                newValue,
                // Generate message here or in DataManager/UI layer
            };
            const changeLogRef = ref(this.database, path);
            const newLogRef = push(changeLogRef); // Generate unique ID for log entry
            await set(newLogRef, changeData);
        } catch (error) {
            console.error(`Firebase logChange error at path ${path}:`, error);
            throw new Error("Failed to log change to Firebase.");
        }
    }

    async loadChangeLog(path) {
        if (!this.database) throw new Error("Firebase not initialized.");
        try {
            // Optionally, add querying/limiting here if the log gets large
            const changeLogRef = ref(this.database, path);
            // Example: Get the last 50 log entries ordered by timestamp
            // const logQuery = query(changeLogRef, orderByChild('timestamp'), limitToLast(50));
            // const snapshot = await get(logQuery);
            const snapshot = await get(changeLogRef);
            return snapshot.val();
        } catch (error) {
            console.error(`Firebase loadChangeLog error at path ${path}:`, error);
            throw new Error("Failed to load change log from Firebase.");
        }
    }

    // --- Maintenance Request Methods ---

    async saveMaintenanceRequest(path, requestData) {
        if (!this.database) throw new Error("Firebase not initialized.");
        try {
            const requestsRef = ref(this.database, path);
            const newRequestRef = push(requestsRef); // Generate unique ID
            // Add server timestamp for reliable ordering
            const dataToSave = {
                ...requestData,
                firebaseTimestamp: serverTimestamp() // Use server time
            };
            await set(newRequestRef, dataToSave);
            console.log("Maintenance request saved with ID:", newRequestRef.key);
            return newRequestRef.key; // Return the new request ID
        } catch (error) {
            console.error(`Firebase saveMaintenanceRequest error at path ${path}:`, error);
            throw new Error("Failed to save maintenance request to Firebase.");
        }
    }

    async loadMaintenanceRequests(path, limit = 15) { // Add limit parameter
        if (!this.database) throw new Error("Firebase not initialized.");
        try {
            const requestsRef = ref(this.database, path);
            // Query to get the latest requests ordered by server timestamp
            const requestsQuery = query(requestsRef, orderByChild('firebaseTimestamp'), limitToLast(limit));
            const snapshot = await get(requestsQuery);
            return snapshot.val(); // Returns null if no data
        } catch (error) {
            console.error(`Firebase loadMaintenanceRequests error at path ${path}:`, error);
            throw new Error("Failed to load maintenance requests from Firebase.");
        }
    }
}

export default FirebaseAdapter;