/**
 * BaseRequestHandler — shared logic for all request-type forms.
 *
 * Subclasses must set `this.formType` in their constructor
 * (one of 'maintenance', 'supply', 'wishlist') and override:
 *   - getFormElements()         → populate this.form, inputs, etc.
 *   - getRecentListComponent()  → return a RecentItemsList instance
 *   - validateForm()            → return { valid, focusTarget, message }
 *   - saveRequest(data)         → call the appropriate dataManager method
 *   - buildFormSubmissionData() → map form values → field map for Google Form
 *   - onSuccess()               → extra logic after submit succeeds
 */

import { FORM_URLS, submitToGoogleForm } from './data/formConfig.js';

export class BaseRequestHandler {
  constructor(dataManager) {
    if (!dataManager) {
      throw new Error('DataManager instance is required.');
    }
    this.dataManager = dataManager;
    this.elementsReady = false;
    this.recentListComponent = null;

    // Populated by getFormElements()
    this.form = null;
    this.formStatus = null;
    this.submitButton = null;

    // Subclass sets this (e.g., 'maintenance', 'supply', 'wishlist')
    this.formType = null;

    // Bound handlers
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.showStatus = this.showStatus.bind(this);
    this.clearStatus = this.clearStatus.bind(this);
  }

  /** Current location from the DataManager. */
  get location() {
    return this.dataManager?.location || 'southeast';
  }

  // ── Subclass hooks ──────────────────────────────────────

  /** Grab DOM element references. Called once during init. */
  getFormElements() {
    // Override in subclass
  }

  /** Return a RecentItemsList instance (or null if not needed). */
  getRecentListComponent() {
    return null;
  }

  /**
   * Validate the form before submission.
   * @returns {{ valid: boolean, focusTarget: HTMLElement|null, message: string }}
   */
  validateForm() {
    return { valid: true, focusTarget: null, message: '' };
  }

  /** Persist data via dataManager. */
  async saveRequest(requestData) {
    throw new Error('saveRequest() must be implemented by subclass.');
  }

  /**
   * Build the data map for Google Forms submission.
   * @returns {object|null}  key-value pairs, or null to skip
   */
  buildFormSubmissionData() {
    return null; // skip by default
  }

  /**
   * Resolve the Google Form config for the current location + form type.
   * Override only if you need custom logic.
   */
  getFormConfig() {
    if (!this.formType) return null;
    return FORM_URLS[this.location]?.[this.formType] || null;
  }

  /** Extra logic after a successful submit (e.g. resetting dynamic fields). */
  onSuccess() {
    if (this.form) this.form.reset();
    this.recentListComponent?.refresh();
  }

  // ── Shared API ──────────────────────────────────────────

  initialize() {
    this.getFormElements();

    if (!this.form || !this.formStatus || !this.submitButton) {
      console.error('BaseRequestHandler: Required form DOM elements missing.');
      if (this.formStatus) {
        this.showStatus('Page initialization failed. Required form elements missing.', true);
      }
      this.elementsReady = false;
      return;
    }
    this.elementsReady = true;

    // Initialize recent-items list
    this.recentListComponent = this.getRecentListComponent();
    if (this.recentListComponent) {
      try {
        const ok = this.recentListComponent.initialize();
        if (!ok) console.warn('RecentItemsList initialisation returned false.');
      } catch (err) {
        console.error('Failed to initialise RecentItemsList:', err);
      }
    }

    this.form.addEventListener('submit', this.handleFormSubmit);
  }

  // ── Form submission ─────────────────────────────────────

  async handleFormSubmit(event) {
    event.preventDefault();
    if (!this.elementsReady) return;

    this.submitButton.disabled = true;
    this.submitButton.textContent = 'Submitting...';
    this.clearStatus();

    // Validate
    const validation = this.validateForm();
    if (!validation.valid) {
      this.showStatus(validation.message, true);
      this.submitButton.disabled = false;
      this.submitButton.textContent = 'Submit Request';
      validation.focusTarget?.focus();
      return;
    }

    // Build data & save
    const requestData = {
      clientTimestamp: Date.now(),
      status: 'Submitted',
    };

    // Let the subclass fill in the rest
    this.populateRequestData(requestData);

    this.showStatus('Submitting request...', false);

    try {
      await this.saveRequest(requestData);
      this.showStatus('Request submitted successfully!', false);

      // Google Forms submission (fire-and-forget)
      const formConfig = this.getFormConfig();
      if (formConfig) {
        const formData = this.buildFormSubmissionData();
        if (formData) {
          // Don't await — non-blocking
          submitToGoogleForm(formConfig, formData).catch(() => {});
        }
      }

      this.onSuccess();
      setTimeout(() => this.clearStatus(), 5000);
    } catch (error) {
      console.error('Submission failed:', error);
      this.showStatus(`Submission failed: ${error.message || 'Please try again.'}`, true);
    } finally {
      this.submitButton.disabled = false;
      this.submitButton.textContent = 'Submit Request';
    }
  }

  /**
   * Hook for subclass to populate requestData with specific fields.
   * Override instead of duplicating the whole submit flow.
   */
  populateRequestData(requestData) {
    // Override in subclass
  }

  // ── Status helpers ──────────────────────────────────────

  showStatus(message, isError = false) {
    if (!this.formStatus) return;
    this.formStatus.textContent = message;
    this.formStatus.className = `form-status-message ${isError ? 'error' : 'success'}`;
    this.formStatus.setAttribute('aria-live', isError ? 'assertive' : 'polite');
  }

  clearStatus() {
    if (!this.formStatus) return;
    this.formStatus.textContent = '';
    this.formStatus.className = 'form-status-message';
    this.formStatus.removeAttribute('aria-live');
  }

  // ── Cleanup ─────────────────────────────────────────────

  destroy() {
    this.form?.removeEventListener('submit', this.handleFormSubmit);
    this.recentListComponent?.destroy();
    this.form = null;
    this.formStatus = null;
    this.submitButton = null;
    this.dataManager = null;
    this.recentListComponent = null;
  }
}
