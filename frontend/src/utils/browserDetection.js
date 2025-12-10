/**
 * Detects if the current browser is Microsoft Edge
 * @returns {boolean} True if the browser is Microsoft Edge (Chromium-based or Legacy)
 */
export function isMicrosoftEdge() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check for Chromium-based Edge (new Edge)
  // Edge user agent contains "Edg/" (without the 'e' at the end)
  // Note: Edge also contains "Chrome" in its user agent, so we check for "Edg" first
  if (userAgent.indexOf('Edg/') > -1 || userAgent.indexOf('EdgA/') > -1 || userAgent.indexOf('EdgiOS/') > -1) {
    return true;
  }
  
  // Check for Legacy Edge (EdgeHTML) - old Edge before Chromium
  if (userAgent.indexOf('Edge/') > -1 && userAgent.indexOf('Edg/') === -1) {
    return true;
  }
  
  return false;
}

/**
 * Gets the detected browser name
 * @returns {string} Browser name
 */
export function getBrowserName() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check Edge first (before Chrome) since Edge user agent also contains "Chrome"
  if (userAgent.indexOf('Edg/') > -1 || userAgent.indexOf('EdgA/') > -1 || userAgent.indexOf('EdgiOS/') > -1) {
    return 'Microsoft Edge';
  }
  if (userAgent.indexOf('Edge/') > -1 && userAgent.indexOf('Edg/') === -1) {
    return 'Microsoft Edge (Legacy)';
  }
  if (userAgent.indexOf('Chrome/') > -1 && userAgent.indexOf('Edg') === -1 && userAgent.indexOf('OPR') === -1) {
    return 'Google Chrome';
  }
  if (userAgent.indexOf('Firefox/') > -1) {
    return 'Mozilla Firefox';
  }
  if (userAgent.indexOf('Safari/') > -1 && userAgent.indexOf('Chrome') === -1 && userAgent.indexOf('Edg') === -1) {
    return 'Safari';
  }
  if (userAgent.indexOf('Opera/') > -1 || userAgent.indexOf('OPR/') > -1) {
    return 'Opera';
  }
  
  return 'Unknown Browser';
}
