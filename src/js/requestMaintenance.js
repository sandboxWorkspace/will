import { BaseRequestHandler } from './requestBase.js';
import { RecentItemsList, renderMaintenanceRequestItem } from './ui/recentItemsList.js';

class MaintenanceRequestHandler extends BaseRequestHandler {
  constructor(dataManager) {
    super(dataManager);
    this.formType = 'maintenance';
  }
  getFormElements() {
    this.form = document.getElementById('maintenanceRequestForm');
    this.submitterNameInput = document.getElementById('submitterName');
    this.requestTypeInput = document.getElementById('requestType');
    this.equipmentNameInput = document.getElementById('equipmentName');
    this.requestDetailsInput = document.getElementById('requestDetails');
    this.formStatus = document.getElementById('formStatus');
    this.submitButton = this.form?.querySelector('button[type="submit"]');
  }

  getRecentListComponent() {
    return new RecentItemsList(this.dataManager, {
      listElementId: 'recentRequestsList',
      loadDataFunction: this.dataManager.getRecentMaintenanceRequests.bind(this.dataManager),
      renderItemFunction: renderMaintenanceRequestItem,
      loadingMessage: '<p>Loading recent maintenance requests...</p>',
      noItemsMessage: '<p>No recent maintenance requests found.</p>',
      errorMessage: '<p>Could not load maintenance requests. Please try again later.</p>',
    });
  }

  validateForm() {
    const submitterName = this.submitterNameInput.value.trim();
    const requestType = this.requestTypeInput.value.trim();
    const equipmentName = this.equipmentNameInput.value.trim();
    const requestDetails = this.requestDetailsInput.value.trim();

    if (!submitterName || !requestType || !equipmentName || !requestDetails) {
      return { valid: false, focusTarget: this.submitterNameInput, message: 'Please fill out all fields.' };
    }

    const maxEquipmentLength = 38;
    if (equipmentName.length > maxEquipmentLength) {
      return {
        valid: false,
        focusTarget: this.equipmentNameInput,
        message: `Equipment Name must be ${maxEquipmentLength} characters or less.`,
      };
    }

    return { valid: true, focusTarget: null, message: '' };
  }

  populateRequestData(requestData) {
    requestData.submitterName = this.submitterNameInput.value.trim();
    requestData.requestType = this.requestTypeInput.value.trim();
    requestData.equipmentName = this.equipmentNameInput.value.trim();
    requestData.requestDetails = this.requestDetailsInput.value.trim();
  }

  async saveRequest(requestData) {
    return this.dataManager.saveMaintenanceRequest(requestData);
  }

  buildFormSubmissionData() {
    return {
      submitterName: this.submitterNameInput.value.trim(),
      requestType: this.requestTypeInput.value.trim(),
      equipmentName: this.equipmentNameInput.value.trim(),
      requestDetails: this.requestDetailsInput.value.trim(),
    };
  }
}

export { MaintenanceRequestHandler };
