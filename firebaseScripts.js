// Import necessary functions from Firebase SDK
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUU7d47ylh23s4dROjLlD4QV_LJn1kqUw",
  authDomain: "willqrsite.firebaseapp.com",
  databaseURL: "https://willqrsite-default-rtdb.firebaseio.com",
  projectId: "willqrsite",
  storageBucket: "willqrsite.firebasestorage.app",
  messagingSenderId: "1009488518183",
  appId: "1:1009488518183:web:a0b37e2622183d3e4a8202",
  measurementId: "G-6TTPNT3CYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Detect current page from URL (without query parameters)
const pageType = window.location.pathname.includes("xCite") ? "xCite" : "fesBike";

// Firebase paths based on the detected page
const currentPath = `${pageType}/currentSchedule`;
const changeLogPath = `${pageType}/changeLog`;

// Helper function to format timestamp
function formatTimestamp() {
    const date = new Date();
    return date.toLocaleString(); // Returns readable timestamp
}

// Log changes to Firebase
async function logChange(time, dayIndex, oldValue, newValue) {
    const timestamp = Date.now();
    const changeLogRef = ref(database, changeLogPath);
    const newLogRef = push(changeLogRef);

    const changeLogMessage = `[${formatTimestamp()}]: ${time} ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayIndex]} "${oldValue}" → "${newValue}"`;

    await set(newLogRef, {
        timestamp,
        time,
        dayIndex,
        oldValue,
        newValue,
        message: changeLogMessage
    });

    console.log(`Logged change: ${changeLogMessage}`);
}

// Save data to Firebase
async function saveToFirebase(time, dayIndex, value) {
    const dbRef = ref(database, `${currentPath}/${time}/${dayIndex}`);
    const snapshot = await get(dbRef);

    const existingValue = snapshot.val();
    if (existingValue === value) {
        console.log("No change detected, skipping log.");
        return;
    }

    console.log(`Saving: ${time} - Day ${dayIndex} = ${value}`);
    await set(dbRef, value);
}

// Load data from Firebase
async function loadFromFirebase() {
    const tableBody = document.querySelector("#schedule-table tbody");
    tableBody.innerHTML = '';

    const timeSlots = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const rowPromises = timeSlots.map(async (time) => {
        const row = document.createElement("tr");

        const timeCell = document.createElement("td");
        timeCell.textContent = time;
        row.appendChild(timeCell);

        const dayPromises = daysOfWeek.map(async (day, index) => {
            const dbRef = ref(database, `${currentPath}/${time}/${index}`);

            try {
                const snapshot = await get(dbRef);
                const value = snapshot.val() || "";

                const cell = document.createElement("td");
                cell.textContent = value;
                cell.contentEditable = "true";
                cell.dataset.time = time;
                cell.dataset.day = index;
                row.appendChild(cell);
            } catch (error) {
                console.error("Error loading data from Firebase:", error);
            }
        });

        await Promise.all(dayPromises);
        return row;
    });

    const rows = await Promise.all(rowPromises);
    rows.forEach(row => tableBody.appendChild(row));
}

// Load changelog from Firebase
async function loadChangeLog() {
    const changelogList = document.getElementById("changelogList");
    const changeLogRef = ref(database, changeLogPath);

    try {
        const snapshot = await get(changeLogRef);
        const changes = snapshot.val();

        if (changes) {
            const changeEntries = Object.values(changes).sort((a, b) => b.timestamp - a.timestamp);
            changelogList.innerHTML = '';

            changeEntries.forEach(change => {
                const changeItem = document.createElement("div");
                changeItem.classList.add("changelog-item");
                changeItem.innerHTML = `
                    <strong>${new Date(change.timestamp).toLocaleString()}</strong><br>
                    Time: ${change.time}, Day: ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][change.dayIndex]}<br>
                    From: "${change.oldValue}" To: "${change.newValue}"
                `;
                changelogList.appendChild(changeItem);
            });
        }
    } catch (error) {
        console.error('Error loading changelog:', error);
    }
}

export { saveToFirebase, loadFromFirebase, logChange, loadChangeLog };
