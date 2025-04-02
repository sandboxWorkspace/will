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

    await databaseAdapter.initialize();

    // Initialize Data Manager
    const dataManager = new DataManager(databaseAdapter);

    // Initialize UI components
    const scheduleTable = new ScheduleTable(dataManager);
    const changeLogModal = new ChangeLogModal(dataManager);
    const confirmationModal = new ConfirmationModal(dataManager, scheduleTable);
    const collapsibleSections = new CollapsibleSections();

    // Initialize UI
    await scheduleTable.initialize();
    changeLogModal.initialize();
    confirmationModal.initialize();
    collapsibleSections.initialize();
}

document.addEventListener("DOMContentLoaded", initializeApp);