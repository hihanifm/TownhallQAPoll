const PIN_STORAGE_PREFIX = 'townhall_campaign_pin_';
const PIN_VALUE_PREFIX = 'townhall_campaign_pin_value_';

/**
 * Store verification status for a campaign PIN
 * @param {number|string} campaignId - The campaign ID
 * @param {string} pin - The PIN value (stored in localStorage)
 */
export function storeVerifiedPin(campaignId, pin) {
  if (!campaignId) return;
  const key = `${PIN_STORAGE_PREFIX}${campaignId}`;
  const pinKey = `${PIN_VALUE_PREFIX}${campaignId}`;
  localStorage.setItem(key, 'true');
  if (pin) localStorage.setItem(pinKey, pin);
}

/**
 * Get the stored PIN for a campaign (from localStorage)
 * Falls back to legacy sessionStorage key and migrates it.
 * @param {number|string} campaignId - The campaign ID
 * @returns {string|null} - The PIN value or null if not stored
 */
export function getVerifiedPin(campaignId) {
  if (!campaignId) return null;
  const pinKey = `${PIN_VALUE_PREFIX}${campaignId}`;
  const localPin = localStorage.getItem(pinKey);
  if (localPin) return localPin;

  // Legacy migration path from older versions.
  const sessionPin = sessionStorage.getItem(pinKey);
  if (sessionPin) {
    localStorage.setItem(pinKey, sessionPin);
    return sessionPin;
  }
  return null;
}

/**
 * Check if PIN is verified for a campaign
 * @param {number|string} campaignId - The campaign ID
 * @returns {boolean} - True if PIN is verified
 */
export function hasVerifiedPin(campaignId) {
  if (!campaignId) return false;
  const key = `${PIN_STORAGE_PREFIX}${campaignId}`;
  const verified = localStorage.getItem(key) === 'true';
  if (!verified) return false;

  const pin = getVerifiedPin(campaignId);
  if (!pin) {
    // Self-heal stale flags from older storage behavior.
    localStorage.removeItem(key);
    return false;
  }
  return true;
}

/**
 * Remove PIN verification status for a campaign
 * @param {number|string} campaignId - The campaign ID
 */
export function clearVerifiedPin(campaignId) {
  if (!campaignId) return;
  const key = `${PIN_STORAGE_PREFIX}${campaignId}`;
  const pinKey = `${PIN_VALUE_PREFIX}${campaignId}`;
  localStorage.removeItem(key);
  localStorage.removeItem(pinKey);
  // Legacy cleanup from older versions.
  sessionStorage.removeItem(pinKey);
}
