import { BaseRequestHandler } from './requestBase.js';
import { RecentItemsList } from './ui/recentItemsList.js';
import { escapeHtml, debounce } from './utils/utils.js';

// ── Renderer ──────────────────────────────────────────────

function renderSupplyRequestItem(request) {
  const itemElement = document.createElement('div');
  itemElement.className = 'recent-item supply-request-item';

  const timestampSource = request.firebaseTimestamp || request.clientTimestamp;
  const timestamp = timestampSource
    ? new Date(timestampSource).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : 'No date';

  const submitter = escapeHtml(request.submitterName || 'Unknown');

  let itemsHtml = 'N/A';
  if (Array.isArray(request.items) && request.items.length > 0) {
    itemsHtml = request.items.map(item =>
      `${escapeHtml(item.name || 'Unnamed Item')}`
    ).join(', ');

    const maxLength = 100;
    if (itemsHtml.length > maxLength) {
      itemsHtml = itemsHtml.substring(0, maxLength - 3) + '...';
    }
  }

  const details = request.requestDetails || '';
  const detailsPreview = escapeHtml(details.substring(0, 100)) + (details.length > 100 ? '...' : '');

  itemElement.innerHTML = `
    <strong>${itemsHtml}</strong>
    ${details ? `<span class="item-details-preview" title="${escapeHtml(details)}">${detailsPreview}</span>` : ''}
    <div class="item-meta">
      <span>Status: ${escapeHtml(request.status || 'Unknown')}</span>
      <span>Submitted: ${timestamp} by ${submitter}</span>
    </div>
  `;
  return itemElement;
}

// ── Handler ───────────────────────────────────────────────

class SupplyRequestHandler extends BaseRequestHandler {
  constructor(dataManager) {
    super(dataManager);
    this.formType = 'supply';
    this.supplyItemData = [];
    this.itemCounter = 0;
    this.activeAutocompleteInput = null;
    this.activeSuggestionIndex = -1;

    // DOM set by getFormElements()
    this.supplyItemsContainer = null;
    this.addSupplyItemBtn = null;
    this.submitterNameInput = null;
    this.requestDetailsInput = null;

    // Autocomplete bindings
    this.handleItemInput = this.handleItemInput.bind(this);
    this.handleItemFocus = this.handleItemFocus.bind(this);
    this.handleItemKeydown = this.handleItemKeydown.bind(this);
    this.handleSuggestionClick = this.handleSuggestionClick.bind(this);
    this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
    this.addSupplyItemInput = this.addSupplyItemInput.bind(this);
    this.updateItemLabels = this.updateItemLabels.bind(this);
    this.debouncedHandleItemInput = debounce(this.handleItemInputLogic.bind(this), 300);
  }

  // ── BaseRequestHandler hooks ─────────────────────────────

  getFormElements() {
    this.form = document.getElementById('supplyRequestForm');
    this.submitterNameInput = document.getElementById('submitterName');
    this.supplyItemsContainer = document.getElementById('supplyItemsContainer');
    this.addSupplyItemBtn = document.getElementById('addSupplyItemBtn');
    this.requestDetailsInput = document.getElementById('requestDetails');
    this.formStatus = document.getElementById('formStatus');
    this.submitButton = this.form?.querySelector('button[type="submit"]');
  }

  getRecentListComponent() {
    const container = document.getElementById('recentSupplyRequestsList');
    if (!container || typeof this.dataManager?.getRecentSupplyRequests !== 'function') {
      console.warn('SupplyRequestHandler: RecentSupplyRequests list unavailable.');
      return null;
    }
    return new RecentItemsList(this.dataManager, {
      listElementId: 'recentSupplyRequestsList',
      loadDataFunction: this.dataManager.getRecentSupplyRequests.bind(this.dataManager),
      renderItemFunction: renderSupplyRequestItem,
      loadingMessage: 'Loading recent supply requests...',
      errorMessage: '<p>Could not load recent supply requests.</p>',
      noItemsMessage: '<p>No recent supply requests found.</p>',
    });
  }

  async initialize() {
    // Call base init (sets up form elements + recent list)
    super.initialize();
    if (!this.elementsReady) return;

    // --- Load autocomplete data ---
    console.log('SupplyRequestHandler: Loading autocomplete data...');
    try {
      const response = await fetch('./data/supplyItems.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching supply items.`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new TypeError('Non-JSON response for supply items.');
      }
      this.supplyItemData = await response.json();
      if (!Array.isArray(this.supplyItemData) || !this.supplyItemData.every(i => typeof i === 'string')) {
        console.warn('Supply item data not in expected format (array of strings).');
        this.supplyItemData = [];
      }
      console.log(`SupplyRequestHandler: ${this.supplyItemData.length} items loaded.`);
    } catch (error) {
      console.error('SupplyRequestHandler: Failed to load supply items:', error);
      this.showStatus(`Warning: Autocomplete unavailable. ${error.message}`, true);
      this.supplyItemData = [];
    }

    // --- Add first item input ---
    if (this.supplyItemsContainer) {
      this.addSupplyItemInput();
    }

    // --- Event listeners ---
    this.addSupplyItemBtn?.addEventListener('click', this.addSupplyItemInput);

    // Delegated listeners on container
    if (this.supplyItemsContainer) {
      this.supplyItemsContainer.addEventListener('click', (event) => {
        if (event.target.matches('.autocomplete-suggestion')) {
          this.handleSuggestionClick(event);
        } else if (event.target.matches('.remove-item-btn')) {
          const group = event.target.closest('.dynamic-item-group');
          if (group) {
            group.remove();
            this.updateItemLabels();
          }
        }
      });

      this.supplyItemsContainer.addEventListener('input', (event) => {
        if (event.target.matches('.supply-name-input')) {
          this.handleItemInput(event);
        }
      });

      this.supplyItemsContainer.addEventListener('focusin', (event) => {
        if (event.target.matches('.supply-name-input')) {
          this.handleItemFocus(event);
        }
      });

      this.supplyItemsContainer.addEventListener('keydown', (event) => {
        if (event.target.matches('.supply-name-input')) {
          this.handleItemKeydown(event);
        }
      });
    }

    document.addEventListener('click', this.boundHandleDocumentClick);
    console.log('SupplyRequestHandler: initialized.');
  }

  validateForm() {
    const submitterName = this.submitterNameInput.value.trim();
    const supplyInputs = this.supplyItemsContainer?.querySelectorAll('.supply-name-input') || [];
    const items = [];
    let firstEmptyInput = null;

    supplyInputs.forEach(input => {
      const val = input.value.trim();
      if (val) {
        items.push({ name: val });
      } else if (!firstEmptyInput) {
        firstEmptyInput = input;
      }
    });

    if (!submitterName) {
      return { valid: false, focusTarget: this.submitterNameInput, message: 'Please enter your name.' };
    }
    if (items.length === 0 && supplyInputs.length > 0) {
      return { valid: false, focusTarget: supplyInputs[0], message: 'Please enter at least one supply item.' };
    }
    if (items.length === 0) {
      return { valid: false, focusTarget: null, message: 'Please add and fill in at least one supply item.' };
    }
    if (firstEmptyInput) {
      return { valid: false, focusTarget: firstEmptyInput, message: 'Please fill in or remove empty supply item field(s).' };
    }

    return { valid: true, focusTarget: null, message: '' };
  }

  populateRequestData(requestData) {
    const supplyInputs = this.supplyItemsContainer?.querySelectorAll('.supply-name-input') || [];
    const items = [];
    supplyInputs.forEach(input => {
      const val = input.value.trim();
      if (val) items.push({ name: val });
    });

    requestData.submitterName = this.submitterNameInput.value.trim();
    requestData.items = items;
    requestData.requestDetails = this.requestDetailsInput.value.trim();
  }

  async saveRequest(requestData) {
    return this.dataManager.saveSupplyRequest(requestData);
  }

  buildFormSubmissionData() {
    const supplyInputs = this.supplyItemsContainer?.querySelectorAll('.supply-name-input') || [];
    const items = [];
    supplyInputs.forEach(input => {
      const val = input.value.trim();
      if (val) items.push(val);
    });

    return {
      submitterName: this.submitterNameInput.value.trim(),
      supplyList: items.join(', '),
      requestDetails: this.requestDetailsInput.value.trim(),
    };
  }

  onSuccess() {
    // Override default: reset dynamic items
    this.form.reset();
    if (this.supplyItemsContainer) {
      this.supplyItemsContainer.innerHTML = '';
    }
    this.itemCounter = 0;
    this.addSupplyItemInput();
    this.recentListComponent?.refresh();
  }

  destroy() {
    this.addSupplyItemBtn?.removeEventListener('click', this.addSupplyItemInput);
    document.removeEventListener('click', this.boundHandleDocumentClick);
    this.supplyItemData = [];
    this.activeAutocompleteInput = null;
    super.destroy();
  }

  // ── Autocomplete logic (identical to previous behaviour) ──

  addSupplyItemInput() {
    if (!this.supplyItemsContainer) return;

    this.itemCounter++;
    const baseId = `supplyName_${this.itemCounter}`;
    const inputId = `${baseId}_input`;
    const listboxId = `${baseId}_listbox`;

    const group = document.createElement('div');
    group.className = 'form-group dynamic-item-group';
    group.innerHTML = `
      <label for="${inputId}">Supply Item:</label>
      <div class="input-with-remove-button">
        <input type="text" id="${inputId}" name="supplyName[]" class="supply-name-input" required
          placeholder="Type or select supply item" autocomplete="off" role="combobox"
          aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false"
          aria-controls="${listboxId}" aria-label="Supply Item Name">
        <button type="button" class="button remove-item-btn" title="Remove This Item">&times;</button>
      </div>
      <div id="${listboxId}" class="autocomplete-suggestions-container" role="listbox"
           aria-label="Supply item suggestions"></div>
    `;

    this.supplyItemsContainer.appendChild(group);
    this.updateItemLabels();

    if (this.itemCounter > 1) {
      group.querySelector(`#${inputId}`)?.focus();
    }
  }

  updateItemLabels() {
    if (!this.supplyItemsContainer) return;
    const groups = this.supplyItemsContainer.querySelectorAll('.dynamic-item-group');
    groups.forEach((g, i) => {
      const label = g.querySelector('label');
      if (label) label.textContent = `Supply Item #${i + 1}:`;
    });

    const btns = this.supplyItemsContainer.querySelectorAll('.remove-item-btn');
    const disable = groups.length <= 1;
    btns.forEach(btn => { btn.disabled = disable; });
  }

  handleItemFocus(event) {
    const input = event.target;
    if (this.activeAutocompleteInput && this.activeAutocompleteInput !== input) {
      this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
    }
    this.activeAutocompleteInput = input;
    this.activeSuggestionIndex = -1;
    if (input.value.trim().length > 0) {
      this.showAutocompleteSuggestions(input);
    } else {
      this.hideAutocompleteSuggestions(input);
    }
  }

  handleItemInput(event) {
    this.activeAutocompleteInput = event.target;
    this.debouncedHandleItemInput(event.target);
  }

  handleItemInputLogic(inputElement) {
    if (inputElement !== this.activeAutocompleteInput) return;
    this.showAutocompleteSuggestions(inputElement);
  }

  showAutocompleteSuggestions(inputElement) {
    const value = inputElement.value.trim().toLowerCase();
    const containerId = inputElement.getAttribute('aria-controls');
    const container = containerId ? document.getElementById(containerId) : null;
    if (!container) return;

    container.innerHTML = '';
    this.activeSuggestionIndex = -1;
    inputElement.removeAttribute('aria-activedescendant');

    if (value.length < 1 || this.supplyItemData.length === 0) {
      this.hideAutocompleteSuggestions(inputElement);
      return;
    }

    const filtered = this.supplyItemData
      .filter(item => item.toLowerCase().includes(value))
      .slice(0, 10);

    if (filtered.length === 0) {
      this.hideAutocompleteSuggestions(inputElement);
      return;
    }

    filtered.forEach((item, index) => {
      const div = document.createElement('div');
      div.textContent = item;
      div.className = 'autocomplete-suggestion';
      div.dataset.value = item;
      div.id = `${containerId}_option_${index}`;
      div.setAttribute('role', 'option');
      div.setAttribute('aria-selected', 'false');
      container.appendChild(div);
    });

    container.style.display = 'block';
    inputElement.setAttribute('aria-expanded', 'true');
  }

  hideAutocompleteSuggestions(inputElement = null) {
    const target = inputElement || this.activeAutocompleteInput;

    if (!target && this.supplyItemsContainer) {
      this.supplyItemsContainer.querySelectorAll('.autocomplete-suggestions-container').forEach(c => {
        c.style.display = 'none';
        c.innerHTML = '';
        const inpId = c.id.replace('_listbox', '_input');
        const inp = document.getElementById(inpId);
        if (inp) {
          inp.setAttribute('aria-expanded', 'false');
          inp.removeAttribute('aria-activedescendant');
        }
      });
      return;
    }

    if (target) {
      const containerId = target.getAttribute('aria-controls');
      const container = containerId ? document.getElementById(containerId) : null;
      if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
      }
      target.setAttribute('aria-expanded', 'false');
      target.removeAttribute('aria-activedescendant');
    }
    this.activeSuggestionIndex = -1;
  }

  handleSuggestionClick(event) {
    const div = event.target;
    const value = div?.dataset.value;
    if (value && this.activeAutocompleteInput) {
      this.activeAutocompleteInput.value = value;
      this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
      this.activeAutocompleteInput.focus();
    }
  }

  handleItemKeydown(event) {
    if (!this.activeAutocompleteInput) return;

    const containerId = this.activeAutocompleteInput.getAttribute('aria-controls');
    const container = containerId ? document.getElementById(containerId) : null;
    const visible = container && container.style.display === 'block';
    const suggestions = container ? Array.from(container.querySelectorAll('.autocomplete-suggestion')) : [];

    if (!visible && !['ArrowDown','ArrowUp','Escape','Enter','Tab'].includes(event.key)) {
      this.activeSuggestionIndex = -1;
      return;
    }
    if (suggestions.length === 0 && visible && !['Escape','Tab','Enter'].includes(event.key)) {
      return;
    }

    let prevent = false;

    switch (event.key) {
      case 'ArrowDown':
        if (suggestions.length) {
          prevent = true;
          this.activeSuggestionIndex = this.activeSuggestionIndex < suggestions.length - 1
            ? this.activeSuggestionIndex + 1 : 0;
          this.updateSuggestionHighlight(suggestions);
        }
        break;

      case 'ArrowUp':
        if (suggestions.length) {
          prevent = true;
          this.activeSuggestionIndex = this.activeSuggestionIndex > 0
            ? this.activeSuggestionIndex - 1 : suggestions.length - 1;
          this.updateSuggestionHighlight(suggestions);
        }
        break;

      case 'Enter':
        if (this.activeSuggestionIndex >= 0 && this.activeSuggestionIndex < suggestions.length) {
          prevent = true;
          this.activeAutocompleteInput.value = suggestions[this.activeSuggestionIndex].dataset.value;
          this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
        } else {
          this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
        }
        break;

      case 'Escape':
        prevent = true;
        this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
        break;

      case 'Tab':
        this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
        break;

      default:
        this.activeSuggestionIndex = -1;
    }

    if (prevent) event.preventDefault();
  }

  updateSuggestionHighlight(suggestions) {
    suggestions.forEach((s, i) => {
      s.classList.remove('active');
      s.setAttribute('aria-selected', 'false');
      if (i === this.activeSuggestionIndex) {
        s.classList.add('active');
        s.setAttribute('aria-selected', 'true');
        this.activeAutocompleteInput.setAttribute('aria-activedescendant', s.id);
        s.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
    if (this.activeSuggestionIndex === -1) {
      this.activeAutocompleteInput.removeAttribute('aria-activedescendant');
    }
  }

  handleDocumentClick(event) {
    if (!this.activeAutocompleteInput) return;
    const group = this.activeAutocompleteInput.closest('.dynamic-item-group');
    if (group && !group.contains(event.target)) {
      this.hideAutocompleteSuggestions(this.activeAutocompleteInput);
    }
  }
}

export { SupplyRequestHandler };
