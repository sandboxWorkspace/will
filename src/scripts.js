import firebaseConfig from './js/database/firebase/firebaseConfig.js';
import FirebaseAdapter from './js/database/firebase/firebaseAdapter.js';
import { DataManager } from './js/data/dataManager.js';
import { ScheduleTable } from './js/ui/scheduleTable.js';
import { ChangeLogModal } from './js/ui/changeLogModal.js';
import { ConfirmationModal } from './js/ui/confirmationModal.js';
import { CollapsibleSections } from './js/ui/collapsibleSections.js';

// Import Postgres if you want to use it
// import postgresConfig from './database/postgres/postgresConfig.js';
// import PostgresAdapter from './database/postgres/postgresAdapter.js';

async function initializeApp() {
    // --- Database Selection ---
    // 1. To switch to a different database, change the following lines:
    //    - Import the correct config file (e.g., postgresConfig).
    //    - Import the correct adapter (e.g., PostgresAdapter).
    //    - Instantiate the correct adapter with its config.

    // For Firebase:
    const databaseAdapter = new FirebaseAdapter(firebaseConfig);

    // For Postgres (example):
    // const databaseAdapter = new PostgresAdapter(postgresConfig);
    // --- End of Database Selection ---

    // Initialize the database adapter first
    await databaseAdapter.initialize();

    // Initialize Data Manager (needs the adapter)
    const dataManager = new DataManager(databaseAdapter);

    // Initialize UI components
    // Create ConfirmationModal first (only needs dataManager)
    const confirmationModal = new ConfirmationModal(dataManager);
    // Create ScheduleTable (needs dataManager AND confirmationModal)
    const scheduleTable = new ScheduleTable(dataManager, confirmationModal);
    // Other components
    const changeLogModal = new ChangeLogModal(dataManager);
    const collapsibleSections = new CollapsibleSections();

    // Initialize UI after creating instances
    // ScheduleTable initialization might depend on dataManager being ready
    await scheduleTable.initialize();
    // Modals and other UI elements can usually be initialized after their instances are created
    changeLogModal.initialize();
    confirmationModal.initialize();
    collapsibleSections.initialize();

    console.log("Application initialized successfully."); // Added confirmation log
}

document.addEventListener("DOMContentLoaded", initializeApp);