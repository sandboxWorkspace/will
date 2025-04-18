import firebaseConfig from './js/database/firebase/firebaseConfig.js';
import FirebaseAdapter from './js/database/firebase/firebaseAdapter.js';
import { DataManager } from './js/data/dataManager.js';
import { ScheduleTable } from './js/ui/scheduleTable.js';
import { ChangeLogModal } from './js/ui/changeLogModal.js';
import { ConfirmationModal } from './js/ui/confirmationModal.js';
import { CollapsibleSections } from './js/ui/collapsibleSections.js';
import {MaintenanceRequestHandler} from "./js/maintenanceRequest.js";

// Import Postgres if you want to use it
// import postgresConfig from './database/postgres/postgresConfig.js';
// import PostgresAdapter from './database/postgres/postgresAdapter.js';

async function initializeApp() {
    console.log("Initializing application...");
    // Log start

    // --- Database Selection ---
    // To switch to a different database, change the following lines:
    //    - Import the correct config file (e.g., postgresConfig).
    //    - Import the correct adapter (e.g., PostgresAdapter).
    //    - Instantiate the correct adapter with its config.

    const databaseAdapter = new FirebaseAdapter(firebaseConfig);
    // For Postgres (example):
    // const databaseAdapter = new PostgresAdapter(postgresConfig);

    try {
        // Initialize the database adapter first
        await databaseAdapter.initialize();
        console.log("Database Adapter initialized.");

        // Initialize Data Manager (needs the adapter)
        const dataManager = new DataManager(databaseAdapter);
        console.log("Data Manager initialized.");

        // --- Initialize Page-Specific Components ---

        // Check if we are on the main schedule page (adjust condition as needed)
        if (document.getElementById('schedule-table')) {
            console.log("Initializing Schedule components...");
            // Create ConfirmationModal first (only needs dataManager)
            const confirmationModal = new ConfirmationModal(dataManager);
            // Create ScheduleTable (needs dataManager AND confirmationModal)
            const scheduleTable = new ScheduleTable(dataManager,confirmationModal);
            // Other components for the schedule page
            const changeLogModal = new ChangeLogModal(dataManager);

            // Initialize UI after creating instances
            await scheduleTable.initialize();
            changeLogModal.initialize();
            confirmationModal.initialize();
            console.log("Schedule components initialized.");
        }

        // Check if we are on the maintenance request page
        if (document.getElementById('maintenanceRequestForm')) {
            console.log("Initializing Maintenance Request Handler...");
            // Instantiate the handler, passing the existing dataManager
            const maintenanceRequestHandler = new MaintenanceRequestHandler(dataManager);
            // Initialize the handler (which sets up listeners and loads data)
            maintenanceRequestHandler.initialize();
            console.log("Maintenance Request Handler initialized.");

            // Optional: Add cleanup if navigating away from the page in a SPA context
            // window.addEventListener('beforeunload', () => {
            //     maintenanceRequestHandler.destroy();
            // });
        }

        // Initialize components common to multiple pages (if any)
        // Example: Collapsible sections might be on the index page
        if (document.querySelector('.collapse-button-container')) {
            console.log("Initializing Collapsible Sections...");
            const collapsibleSections = new CollapsibleSections();
            collapsibleSections.initialize();
            console.log("Collapsible Sections initialized.");
        }

        console.log("Application initialization complete.");

    } catch (error) {
        console.error("Application Initialization Failed:", error);
        // Display a user-friendly error message on the page
        const body = document.querySelector('body');
        if (body) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Error initializing the application. Please review code.";
            errorMsg.style.color = 'red';
            errorMsg.style.fontWeight = 'bold';
            errorMsg.style.textAlign = 'center';
            errorMsg.style.marginTop = '20px';
            body.prepend(errorMsg);
            // Add message at the top
        }
    }
}

// Use DOMContentLoaded to ensure the DOM is ready before running initialization
document.addEventListener("DOMContentLoaded", initializeApp);