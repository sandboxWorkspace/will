import { BaseRequestHandler } from './requestBase.js';

export const IDEA_NAME_MAX = 80;
export const IDEA_TEXT_MAX = 1000;

/**
 * Validate the name + idea before submission.
 * Pure function so the rules are testable without a DOM.
 *
 * @returns {{ valid: boolean, field?: 'name'|'idea', message?: string, name?: string, idea?: string }}
 */
export function validateIdeaSubmission(name, idea) {
  const cleanName = String(name || '').trim();
  const cleanIdea = String(idea || '').trim();

  if (!cleanName) {
    return { valid: false, field: 'name', message: 'Please enter your name.' };
  }
  if (cleanName.length > IDEA_NAME_MAX) {
    return {
      valid: false,
      field: 'name',
      message: `Name must be ${IDEA_NAME_MAX} characters or less.`,
    };
  }
  if (!cleanIdea) {
    return { valid: false, field: 'idea', message: 'Please enter your idea.' };
  }
  if (cleanIdea.length > IDEA_TEXT_MAX) {
    return {
      valid: false,
      field: 'idea',
      message: 'Idea must be 1,000 characters or less.',
    };
  }

  return { valid: true, name: cleanName, idea: cleanIdea };
}

class ClinicalIdeaRequestHandler extends BaseRequestHandler {
  constructor(dataManager = null) {
    super(dataManager);
    this.formType = 'clinicalIdea';
    this.submitButtonText = 'Send Idea';
    this.submittingButtonText = 'Sending…';
    this.pendingMessage = 'Sending idea…';
    this.successMessage = 'Idea sent — thank you!';

    // DOM set by getFormElements()
    this.nameInput = null;
    this.ideaInput = null;
  }

  // ── BaseRequestHandler hooks ─────────────────────────────

  getFormElements() {
    this.form = document.getElementById('clinicalIdeaForm');
    this.nameInput = document.getElementById('ideaSubmitterName');
    this.ideaInput = document.getElementById('ideaText');
    this.formStatus = document.getElementById('ideaFormStatus');
    this.submitButton = this.form?.querySelector('button[type="submit"]');
  }

  validateForm() {
    const validation = validateIdeaSubmission(this.nameInput?.value, this.ideaInput?.value);
    if (!validation.valid) {
      return {
        valid: false,
        focusTarget: validation.field === 'name' ? this.nameInput : this.ideaInput,
        message: validation.message,
      };
    }
    return { valid: true, focusTarget: null, message: '' };
  }

  populateRequestData(requestData) {
    requestData.submitterName = this.nameInput.value.trim();
    requestData.idea = this.ideaInput.value.trim();
  }

  async saveRequest() {
    // No persistence yet. When Firebase support is needed, add a
    // DataManager.saveClinicalIdea() method and return it here.
  }

  buildFormSubmissionData() {
    return {
      submitterName: this.nameInput.value.trim(),
      idea: this.ideaInput.value.trim(),
    };
  }
}

export { ClinicalIdeaRequestHandler };
