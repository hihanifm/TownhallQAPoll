const PIN_STORAGE_KEY = 'townhall_feedback_pin_verified';
const PIN_VALUE_KEY = 'townhall_feedback_pin_value';

/**
 * Store verification status for feedback PIN
 * @param {string} pin - The PIN value (stored in localStorage)
 */
export function storeVerifiedPin(pin) {
  localStorage.setItem(PIN_STORAGE_KEY, 'true');
  if (pin) {
    localStorage.setItem(PIN_VALUE_KEY, pin);
  }
}

/**
 * Get the stored PIN for feedback (from localStorage)
 * Falls back to legacy sessionStorage key and migrates it.
 * @returns {string|null} - The PIN value or null if not stored
 */
export function getVerifiedPin() {
  const localPin = localStorage.getItem(PIN_VALUE_KEY);
  if (localPin) return localPin;

  // Legacy migration path from older versions.
  const sessionPin = sessionStorage.getItem(PIN_VALUE_KEY);
  if (sessionPin) {
    localStorage.setItem(PIN_VALUE_KEY, sessionPin);
    return sessionPin;
  }
  return null;
}

/**
 * Check if PIN is verified for feedback
 * @returns {boolean} - True if PIN is verified
 */
export function hasVerifiedPin() {
  const verified = localStorage.getItem(PIN_STORAGE_KEY) === 'true';
  if (!verified) return false;

  const pin = getVerifiedPin();
  if (!pin) {
    // Self-heal stale flags from older storage behavior.
    localStorage.removeItem(PIN_STORAGE_KEY);
    return false;
  }
  return true;
}

/**
 * Remove PIN verification status for feedback
 */
export function clearVerifiedPin() {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_VALUE_KEY);
  // Legacy cleanup from older versions.
  sessionStorage.removeItem(PIN_VALUE_KEY);
}
