const PIN_STORAGE_PREFIX = 'townhall_campaign_pin_';
const PIN_VALUE_PREFIX = 'townhall_campaign_pin_value_';

/**
 * Store verification status for a campaign PIN
 * @param {number|string} campaignId - The campaign ID
 * @param {string} pin - The PIN value (stored in sessionStorage only)
 */
export function storeVerifiedPin(campaignId, pin) {
  const key = `${PIN_STORAGE_PREFIX}${campaignId}`;
  localStorage.setItem(key, 'true');
  
  // Store PIN in sessionStorage temporarily for use in API requests
  // This is cleared when browser session ends
  if (pin) {
    const pinKey = `${PIN_VALUE_PREFIX}${campaignId}`;
    sessionStorage.setItem(pinKey, pin);
  }
}

/**
 * Get the stored PIN for a campaign (from sessionStorage)
 * @param {number|string} campaignId - The campaign ID
 * @returns {string|null} - The PIN value or null if not stored
 */
export function getVerifiedPin(campaignId) {
  if (!campaignId) return null;
  const pinKey = `${PIN_VALUE_PREFIX}${campaignId}`;
  return sessionStorage.getItem(pinKey);
}

/**
 * Check if PIN is verified for a campaign
 * @param {number|string} campaignId - The campaign ID
 * @returns {boolean} - True if PIN is verified
 */
export function hasVerifiedPin(campaignId) {
  if (!campaignId) return false;
  const key = `${PIN_STORAGE_PREFIX}${campaignId}`;
  return localStorage.getItem(key) === 'true';
}

/**
 * Remove PIN verification status for a campaign
 * @param {number|string} campaignId - The campaign ID
 */
export function clearVerifiedPin(campaignId) {
  const key = `${PIN_STORAGE_PREFIX}${campaignId}`;
  localStorage.removeItem(key);
  
  // Also clear PIN value from sessionStorage
  const pinKey = `${PIN_VALUE_PREFIX}${campaignId}`;
  sessionStorage.removeItem(pinKey);
}
