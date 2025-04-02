import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push } from "firebase/database";
import { DatabaseInterface } from "../databaseInterface.js";

// Helper function to format timestamp
function formatTimestamp() {
    const date = new Date();
    return date.toLocaleString(); // Returns readable timestamp
}

class FirebaseAdapter extends DatabaseInterface {
    constructor(firebaseConfig) {
        super();
        this.firebaseConfig = firebaseConfig;
        this.app = null;
        this.database = null;
    }

    async initialize() {
        this.app = initializeApp(this.firebaseConfig);
        this.database = getDatabase(this.app);
    }

    async saveData(path, value) {
        try {
            const dbRef = ref(this.database, path);
            await set(dbRef, value);
        } catch (error) {
            console.error("Firebase saveData error:", error);
            throw new Error("Failed to save data to Firebase.");
        }
    }

    async loadData(path) {
        try {
            const dbRef = ref(this.database, path);
            const snapshot = await get(dbRef);
            return snapshot.val();
        } catch (error) {
            console.error("Firebase loadData error:", error);
            throw new Error("Failed to load data from Firebase.");
        }
    }

    async logChange(path, time, dayIndex, oldValue, newValue) {
        try {
            const timestamp = Date.now();
            const changeLogRef = ref(this.database, path);
            const newLogRef = push(changeLogRef);
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            const changeLogMessage = `[${formatTimestamp()}]: ${time} ${days[dayIndex]} "${oldValue}" → "${newValue}"`;

            await set(newLogRef, {
                timestamp,
                time,
                dayIndex,
                oldValue,
                newValue,
                message: changeLogMessage
            });
        } catch (error) {
            console.error("Firebase logChange error:", error);
            throw new Error("Failed to log change to Firebase.");
        }
    }

    async loadChangeLog(path) {
        try {
            const changeLogRef = ref(this.database, path);
            const snapshot = await get(changeLogRef);
            return snapshot.val();
        } catch (error) {
            console.error("Firebase loadChangeLog error:", error);
            throw new Error("Failed to load change log from Firebase.");
        }
    }
}

export default FirebaseAdapter;
