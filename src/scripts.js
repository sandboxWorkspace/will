import firebaseConfig from './js/database/firebase/firebaseConfig.js';
import FirebaseAdapter from './js/database/firebase/firebaseAdapter.js';
import { DataManager } from './js/data/dataManager.js';
import { ScheduleTable } from './js/ui/scheduleTable.js';
import { ChangeLogModal } from './js/ui/changeLogModal.js';
import { ConfirmationModal } from './js/ui/confirmationModal.js';
import { CollapsibleSections } from './js/ui/collapsibleSections.js'; 
import { MaintenanceRequestHandler } from './js/requestMaintenance.js';
import { SupplyRequestHandler } from './js/requestSupply.js';
import { WishlistRequestHandler } from './js/requestWishlist.js';

/**
 * Determine the location context from the page URL.
 * Pages containing "moursund" use the Moursund config;
 * everything else defaults to Southeast.
 */
function detectLocation() {
    const path = window.location.pathname;
    if (path.includes('moursund')) return 'moursund';
    return 'southeast';
}

async function initializeApp() {
    console.log("Initializing application...");

    // --- Database Initialization ---
    const databaseAdapter = new FirebaseAdapter(firebaseConfig);

    try {
        await databaseAdapter.initialize();
        console.log("Database Adapter initialized.");

        // Anonymous auth — revisit when Firebase provider toggle is stable
        // try { await databaseAdapter.signInAnonymously(); } catch (e) {}

        const location = detectLocation();
        const dataManager = new DataManager(databaseAdapter, location);
        console.log(`Data Manager initialized for location: ${location}`);

        // --- Initialize Page-Specific Components ---
        const pagePath = window.location.pathname; // Get path for context if needed
        console.log("Current page path:", pagePath);

        // Schedule Page (fesBike.html)
        if (document.getElementById('schedule-table')) {
            console.log("Initializing Schedule components (e.g., FES Bike)...");
            const confirmationModal = new ConfirmationModal(dataManager);
            // Pass the specific schedule type (e.g., 'fesBike') if needed by ScheduleTable/DataManager
            const scheduleTable = new ScheduleTable(dataManager, confirmationModal, 'fesBike'); // Example: passing type
            const changeLogModal = new ChangeLogModal(dataManager); // Needs dataManager.loadChangeLog('fesBike')

            await scheduleTable.initialize();
            changeLogModal.initialize(); // Assumes it knows which log to load via dataManager
            confirmationModal.initialize();
            console.log("Schedule components initialized.");
        }
        // Maintenance Request Page
        else if (document.getElementById('maintenanceRequestForm')) {
            console.log("Initializing Maintenance Request Handler...");
            const maintenanceRequestHandler = new MaintenanceRequestHandler(dataManager);
            maintenanceRequestHandler.initialize();
            console.log("Maintenance Request Handler initialized.");
        }
        // *** ADDED: Supply Request Page ***
        else if (document.getElementById('supplyRequestForm')) {
            console.log("Initializing Supply Request Handler...");
            const supplyRequestHandler = new SupplyRequestHandler(dataManager);
            supplyRequestHandler.initialize();
            console.log("Supply Request Handler initialized.");
        }
        // Wishlist Request Page
        else if (document.getElementById('wishlistRequestForm')) { // Check for wishlist form
            console.log("Initializing Wishlist Request Handler...");
            const wishlistRequestHandler = new WishlistRequestHandler(dataManager);
            wishlistRequestHandler.initialize();
            console.log("Wishlist Request Handler initialized.");
        }
        
        // --- Initialize Common Components ---
        // Initialize Collapsible Sections if the container exists on the current page
        if (document.querySelector('.collapse-button-container')) {
            console.log("Initializing Collapsible Sections...");
            // Assuming CollapsibleSections finds buttons/targets itself
            const collapsibleSections = new CollapsibleSections();
            collapsibleSections.initialize();
            console.log("Collapsible Sections initialized.");
        } else {
             console.log("No collapsible sections found on this page.");
        }

        console.log("Application initialization complete.");

    } catch (error) {
        console.error("Application Initialization Failed:", error);
        // Display error message to user
        const body = document.querySelector('body');
        if (body) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Error initializing the application. Please check console or contact support.";
            errorMsg.style.color = 'red';
            errorMsg.style.fontWeight = 'bold';
            errorMsg.style.textAlign = 'center';
            errorMsg.style.padding = '20px';
            body.prepend(errorMsg);
        }
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);