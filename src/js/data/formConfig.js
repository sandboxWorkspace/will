/**
 * Centralized configuration for Google Form endpoints per location.
 *
 * To add a new location, add a key here with the same form structure.
 * Entry IDs stay the same if the Google Form structure is identical;
 * only the form URL changes.
 */

export const FORM_URLS = {
  southeast: {
    maintenance: {
      url: 'https://docs.google.com/forms/d/e/1FAIpQLSdpFHLlkSwx0BckmGcwRcJ2tKDg1GyLmq3BHtyFfvVXdcEuMQ/formResponse',
      fields: {
        submitterName:  'entry.1873077433',
        requestType:    'entry.2025085608',
        equipmentName:  'entry.1368078064',
        requestDetails: 'entry.1582753521',
      },
    },
    supply: {
      url: 'https://docs.google.com/forms/d/e/1FAIpQLSfvS8kIubBTil6RBy1BLHfDlpT18FZ7S0LAb31WnNF7kMltDg/formResponse',
      fields: {
        submitterName:  'entry.1179758086',
        supplyList:     'entry.920261675',
        requestDetails: 'entry.1507415069',
      },
    },
    wishlist: {
      url: 'https://docs.google.com/forms/d/e/1FAIpQLSfaYeXWk9lnmo2qOYDxZ1cW2bYo8CHFrRUl19Kc-ApFtrKn3w/formResponse',
      fields: {
        submitterName:    'entry.1873077433',
        requestEquipment: 'entry.1368078064',
        disciplineType:   'entry.2025085608',
        equipmentURL:     'entry.174963547',
        requestDetails:   'entry.1582753521',
      },
    },
  },

  moursund: {
    maintenance: {
      url: 'https://docs.google.com/forms/d/e/1FAIpQLScz2_D4C770ws37n4dfx8aZBB2eSbF0auSURi5FRm5djh3mTg/formResponse',
      fields: {
        submitterName:  'entry.1873077433',
        requestType:    'entry.2025085608',
        equipmentName:  'entry.1368078064',
        requestDetails: 'entry.1582753521',
      },
    },
    supply: {
      url: 'https://docs.google.com/forms/d/e/1FAIpQLSeOG4QWQWVP44XcJ5QON-WuZr2WCRoI2L4mDcH5Z-fE9YNr_g/formResponse',
      fields: {
        submitterName:  'entry.1179758086',
        supplyList:     'entry.920261675',
        requestDetails: 'entry.1507415069',
      },
    },
    wishlist: {
      url: 'https://docs.google.com/forms/d/e/1FAIpQLSf7fwSdOyuwrmT22eOu1TlBmWcVQaE-WsGSo1E4NKQNPtiwsQ/formResponse',
      fields: {
        submitterName:    'entry.1873077433',
        requestEquipment: 'entry.1368078064',
        disciplineType:   'entry.2025085608',
        equipmentURL:     'entry.174963547',
        requestDetails:   'entry.1582753521',
      },
    },
  },
};

/**
 * Build a full Google Forms submission URL from a form config and data map.
 * @param {object} formConfig - One of the FORM_URLS entries (e.g. FORM_URLS.southeast.maintenance)
 * @param {object} data - Plain object mapping field keys to values
 * @returns {string} The full POST URL with encoded query params
 */
export function buildFormUrl(formConfig, data) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    const entryId = formConfig.fields[key];
    if (entryId && value != null && value !== '') {
      params.append(entryId, String(value));
    }
  }
  return `${formConfig.url}?${params.toString()}`;
}

/**
 * Submit data to a Google Form using no-cors fetch.
 * @param {object} formConfig - One of the FORM_URLS entries
 * @param {object} data - Data map matching the form's fields
 * @returns {Promise<boolean>} true if fetch succeeded (no-cors; response is opaque)
 */
export async function submitToGoogleForm(formConfig, data) {
  const url = buildFormUrl(formConfig, data);
  try {
    await fetch(url, {
      method: 'POST',
      body: new FormData(),
      mode: 'no-cors',
    });
    return true;
  } catch (error) {
    console.error('[formConfig] Google Forms submission failed:', error);
    return false;
  }
}
