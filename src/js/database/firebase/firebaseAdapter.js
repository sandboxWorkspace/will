import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, serverTimestamp, query, orderByChild, limitToLast } from "firebase/database";
import { DatabaseInterface } from "../databaseInterface.js";

// Helper function (keep or move to utils)
// function formatTimestamp() { /* ... */ } // Commented out if not used

class FirebaseAdapter extends DatabaseInterface {
    constructor(firebaseConfig) {
        super(); // Call the parent constructor
        if (!firebaseConfig) {
            throw new Error("Firebase configuration is required for FirebaseAdapter.");
        }
        this.firebaseConfig = firebaseConfig;
        this.app = null;
        this.database = null;
        console.log("FirebaseAdapter created.");
    }

    // --- ADD THIS METHOD ---
    async initialize() {
        try {
            console.log("Initializing Firebase app...");
            this.app = initializeApp(this.firebaseConfig);
            console.log("Firebase app initialized.");
            console.log("Getting Firebase database instance...");
            this.database = getDatabase(this.app);
            console.log("Firebase database instance obtained.");
            // Optional: You could perform a quick test read/write here if needed
            // await get(ref(this.database, '.info/connected')); // Example check
            console.log("FirebaseAdapter initialized successfully.");
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            // Re-throw the error to be caught by the caller (initializeApp in scripts.js)
            throw new Error(`Firebase initialization failed: ${error.message}`);
        }
    }
    // --- END OF ADDED METHOD ---


    async saveData(path, value) { // Example: Ensure database check
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

    async loadData(path) { // Example: Ensure database check
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

     async logChange(path, time, dayIndex, oldValue, newValue) { // Example: Ensure database check
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first.");
        try {
            const logRef = ref(this.database, path);
            const newLogEntryRef = push(logRef); // Creates a unique ID for the log entry
            await set(newLogEntryRef, {
                timestamp: serverTimestamp(), // Use Firebase server time
                time: time, // e.g., "9am"
                dayIndex: dayIndex, // e.g., 0 for Monday
                oldValue: oldValue,
                newValue: newValue
            });
            console.log(`Change logged successfully at path: ${path}`);
        } catch (error) {
            console.error(`Firebase logChange error at path ${path}:`, error);
            throw new Error("Failed to log change to Firebase.");
        }
    }


    async loadChangeLog(path) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first."); // Added check
        try {
            const changeLogRef = ref(this.database, path);
            const logQuery = query(changeLogRef, orderByChild('timestamp'), limitToLast(50));
            const snapshot = await get(logQuery);
            return snapshot.val();
        } catch (error) {
            console.error(`Firebase loadChangeLog error at path ${path}:`, error);
            throw new Error("Failed to load change log from Firebase.");
        }
    }

    // --- Maintenance Request Methods ---
    async saveMaintenanceRequest(path, requestData) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first."); // Added check
        try {
            const requestsRef = ref(this.database, path);
            const newRequestRef = push(requestsRef);
            const dataToSave = {
                ...requestData,
                firebaseTimestamp: serverTimestamp()
            };
            await set(newRequestRef, dataToSave);
            console.log("Maintenance request saved with ID:", newRequestRef.key);
            return newRequestRef.key;
        } catch (error) {
            console.error(`Firebase saveMaintenanceRequest error at path ${path}:`, error);
            throw new Error("Failed to save maintenance request to Firebase.");
        }
    }

    async loadMaintenanceRequests(path, limit = 15) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first."); // Added check
        try {
            const requestsRef = ref(this.database, path);
            const requestsQuery = query(requestsRef, orderByChild('firebaseTimestamp'), limitToLast(limit));
            const snapshot = await get(requestsQuery);
            return snapshot.val();
        } catch (error) {
            console.error(`Firebase loadMaintenanceRequests error at path ${path}:`, error);
            throw new Error("Failed to load maintenance requests from Firebase.");
        }
    }

    // --- NEW: Supply Request Methods ---
    async saveSupplyRequest(path, requestData) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first."); // Added check
        try {
            const requestsRef = ref(this.database, path);
            const newRequestRef = push(requestsRef);
            const dataToSave = {
                ...requestData,
                firebaseTimestamp: serverTimestamp()
            };
            await set(newRequestRef, dataToSave);
            console.log("Supply request saved with ID:", newRequestRef.key);
            return newRequestRef.key;
        } catch (error) {
            console.error(`Firebase saveSupplyRequest error at path ${path}:`, error);
            throw new Error("Failed to save supply request to Firebase.");
        }
    }

    async loadSupplyRequests(path, limit = 15) {
        if (!this.database) throw new Error("Firebase not initialized. Call initialize() first."); // Added check
        try {
            const requestsRef = ref(this.database, path);
            const requestsQuery = query(requestsRef, orderByChild('firebaseTimestamp'), limitToLast(limit));
            const snapshot = await get(requestsQuery);
            return snapshot.val();
        } catch (error) {
            console.error(`Firebase loadSupplyRequests error at path ${path}:`, error);
            throw new Error("Failed to load supply requests from Firebase.");
        }
    }
}

export default FirebaseAdapter;