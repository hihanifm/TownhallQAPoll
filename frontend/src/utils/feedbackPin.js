const PIN_STORAGE_KEY = 'townhall_feedback_pin_verified';
const PIN_VALUE_KEY = 'townhall_feedback_pin_value';

/**
 * Store verification status for feedback PIN
 * @param {string} pin - The PIN value (stored in sessionStorage only)
 */
export function storeVerifiedPin(pin) {
  localStorage.setItem(PIN_STORAGE_KEY, 'true');
  
  // Store PIN in sessionStorage temporarily for use in API requests
  // This is cleared when browser session ends
  if (pin) {
    sessionStorage.setItem(PIN_VALUE_KEY, pin);
  }
}

/**
 * Get the stored PIN for feedback (from sessionStorage)
 * @returns {string|null} - The PIN value or null if not stored
 */
export function getVerifiedPin() {
  return sessionStorage.getItem(PIN_VALUE_KEY);
}

/**
 * Check if PIN is verified for feedback
 * @returns {boolean} - True if PIN is verified
 */
export function hasVerifiedPin() {
  return localStorage.getItem(PIN_STORAGE_KEY) === 'true';
}

/**
 * Remove PIN verification status for feedback
 */
export function clearVerifiedPin() {
  localStorage.removeItem(PIN_STORAGE_KEY);
  
  // Also clear PIN value from sessionStorage
  sessionStorage.removeItem(PIN_VALUE_KEY);
}
