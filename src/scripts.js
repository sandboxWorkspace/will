/**
 * App entry — detects page type and loads only what's needed.
 * Landing pages (no data elements) skip JS entirely.
 */
function detectLocation() {
  const path = window.location.pathname;
  return path.includes('moursund') ? 'moursund' : 'southeast';
}

async function initializeApp() {
  const hasDb = document.getElementById('schedule-table') ||
                document.getElementById('maintenanceRequestForm') ||
                document.getElementById('supplyRequestForm') ||
                document.getElementById('wishlistRequestForm') ||
                document.getElementById('lobbyScreen');

  // Landing pages (index, moursund, v2index, tools) skip Firebase
  if (!hasDb) {
    // Still init collapsible sections if present
    if (document.querySelector('.collapse-button-container')) {
      const { default: initCollapse } = await import('./js/ui/collapsibleSections.js');
      initCollapse();
    }
    return;
  }

  // Load Firebase + DataManager
  const [{ default: firebaseConfig }, { default: FirebaseAdapter }, { DataManager }] = await Promise.all([
    import('./js/database/firebase/firebaseConfig.js'),
    import('./js/database/firebase/firebaseAdapter.js'),
    import('./js/data/dataManager.js')
  ]);

  const databaseAdapter = new FirebaseAdapter(firebaseConfig);
  await databaseAdapter.initialize();
  const location = detectLocation();
  const dataManager = new DataManager(databaseAdapter, location);

  // Init collapsible sections on every page that has them
  if (document.querySelector('.collapse-button-container')) {
    const { default: initCollapse } = await import('./js/ui/collapsibleSections.js');
    initCollapse();
  }

  // --- Page-specific modules ---

  // Schedule (fesBike)
  if (document.getElementById('schedule-table')) {
    const [{ ScheduleTable }, { ChangeLogModal }, { ConfirmationModal }] = await Promise.all([
      import('./js/ui/scheduleTable.js'),
      import('./js/ui/changeLogModal.js'),
      import('./js/ui/confirmationModal.js')
    ]);
    const confirmationModal = new ConfirmationModal(dataManager);
    const scheduleTable = new ScheduleTable(dataManager, confirmationModal, 'fesBike');
    const changeLogModal = new ChangeLogModal(dataManager);
    await scheduleTable.initialize();
    changeLogModal.initialize();
    confirmationModal.initialize();
    return;
  }

  // Maintenance Request
  if (document.getElementById('maintenanceRequestForm')) {
    const { MaintenanceRequestHandler } = await import('./js/requestMaintenance.js');
    const handler = new MaintenanceRequestHandler(dataManager);
    handler.initialize();
    return;
  }

  // Supply Request
  if (document.getElementById('supplyRequestForm')) {
    const { SupplyRequestHandler } = await import('./js/requestSupply.js');
    const handler = new SupplyRequestHandler(dataManager);
    handler.initialize();
    return;
  }

  // Wishlist Request
  if (document.getElementById('wishlistRequestForm')) {
    const { WishlistRequestHandler } = await import('./js/requestWishlist.js');
    const handler = new WishlistRequestHandler(dataManager);
    handler.initialize();
    return;
  }

  // Visual Scan Trainer
  if (document.getElementById('lobbyScreen')) {
    const { ScanMatchGame, ScanMatchUI } = await import('./js/scanMatchGame.js');
    const game = new ScanMatchGame(databaseAdapter.app);
    const ui = new ScanMatchUI(game);
    ui.initialize();
    return;
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
