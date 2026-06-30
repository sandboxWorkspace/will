import { BaseRequestHandler } from './requestBase.js';
import { RecentItemsList } from './ui/recentItemsList.js';
import { escapeHtml } from './utils/utils.js';

// ── Renderer ──────────────────────────────────────────────

export function renderWishlistRequestItem(request) {
  const itemElement = document.createElement('div');
  itemElement.className = 'recent-item wishlist-request-item';

  const timestampSource = request.firebaseTimestamp || request.clientTimestamp;
  const timestamp = timestampSource
    ? new Date(timestampSource).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : 'No date';

  const submitter = escapeHtml(request.submitterName || 'Unknown');
  const equipment = escapeHtml(request.requestEquipment || 'N/A');
  const discipline = escapeHtml(request.disciplineType || 'N/A');
  const equipmentURL = request.equipmentURL ? escapeHtml(request.equipmentURL) : '';
  const details = request.requestDetails || '';
  const detailsPreview = escapeHtml(details.substring(0, 100)) + (details.length > 100 ? '...' : '');
  const status = escapeHtml(request.status || 'Unknown');

  itemElement.innerHTML = `
    <strong>${equipment}</strong>
    ${detailsPreview ? `<span class="item-details-preview" title="${escapeHtml(details)}">${detailsPreview}</span>` : ''}
    <div class="item-meta">
      <span>Discipline: ${discipline}</span>
      ${equipmentURL ? `<span>URL: <a href="${equipmentURL}" target="_blank" rel="noopener noreferrer">${equipmentURL.length > 30 ? equipmentURL.substring(0, 27) + '...' : equipmentURL}</a></span>` : ''}
      <span>Status: ${status}</span>
      <span>Submitted: ${timestamp} by ${submitter}</span>
    </div>
  `;
  return itemElement;
}

// ── Handler ───────────────────────────────────────────────

class WishlistRequestHandler extends BaseRequestHandler {
  constructor(dataManager) {
    super(dataManager);
    this.formType = 'wishlist';
  }

  getFormElements() {
    this.form = document.getElementById('wishlistRequestForm');
    this.submitterNameInput = document.getElementById('submitterName');
    this.requestEquipmentInput = document.getElementById('requestEquipment');
    this.disciplineTypeInput = document.getElementById('disciplineType');
    this.equipmentURLInput = document.getElementById('equipmentURL');
    this.requestDetailsInput = document.getElementById('requestDetails');
    this.formStatus = document.getElementById('formStatus');
    this.submitButton = this.form?.querySelector('button[type="submit"]');
  }

  getRecentListComponent() {
    return new RecentItemsList(this.dataManager, {
      listElementId: 'recentRequestsList',
      loadDataFunction: this.dataManager.getRecentWishlistRequests.bind(this.dataManager),
      renderItemFunction: renderWishlistRequestItem,
      loadingMessage: '<p>Loading recent wishlist requests...</p>',
      noItemsMessage: '<p>No recent wishlist requests found.</p>',
      errorMessage: '<p>Could not load wishlist requests. Please try again later.</p>',
    });
  }

  validateForm() {
    const submitterName = this.submitterNameInput.value.trim();
    const requestEquipment = this.requestEquipmentInput.value.trim();
    const disciplineType = this.disciplineTypeInput.value.trim();
    const requestDetails = this.requestDetailsInput.value.trim();

    if (!submitterName || !requestEquipment || !disciplineType || !requestDetails) {
      return {
        valid: false,
        focusTarget: this.submitterNameInput,
        message: 'Please fill out all required fields (Your Name, Equipment, Discipline, Justification).',
      };
    }

    const equipmentURL = this.equipmentURLInput.value.trim();
    if (equipmentURL && equipmentURL.length > 1024) {
      return { valid: false, focusTarget: this.equipmentURLInput, message: 'The equipment URL is too long. Please shorten it.' };
    }
    if (equipmentURL && !equipmentURL.toLowerCase().startsWith('http') && equipmentURL.includes('.')) {
      return { valid: false, focusTarget: this.equipmentURLInput, message: 'Please enter a valid URL (e.g., http://example.com).' };
    }

    return { valid: true, focusTarget: null, message: '' };
  }

  populateRequestData(requestData) {
    requestData.submitterName = this.submitterNameInput.value.trim();
    requestData.requestEquipment = this.requestEquipmentInput.value.trim();
    requestData.disciplineType = this.disciplineTypeInput.value.trim();
    requestData.equipmentURL = this.equipmentURLInput.value.trim();
    requestData.requestDetails = this.requestDetailsInput.value.trim();
  }

  async saveRequest(requestData) {
    return this.dataManager.saveWishlistRequest(requestData);
  }

  buildFormSubmissionData() {
    return {
      submitterName: this.submitterNameInput.value.trim(),
      requestEquipment: this.requestEquipmentInput.value.trim(),
      disciplineType: this.disciplineTypeInput.value.trim(),
      equipmentURL: this.equipmentURLInput.value.trim(),
      requestDetails: this.requestDetailsInput.value.trim(),
    };
  }
}

export { WishlistRequestHandler };
