/**
 * Detects if the current operating system is Windows
 * @returns {boolean} True if the OS is Windows (excluding mobile)
 */
export function isWindows() {
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  
  // Check for Windows desktop (Win32, Win64)
  if (platform.indexOf('Win') === 0 && platform.indexOf('WinCE') === -1) {
    return true;
  }
  
  // Check user agent for Windows (but exclude Windows Phone/CE)
  if (userAgent.indexOf('Windows') > -1 && 
      userAgent.indexOf('Windows Phone') === -1 &&
      userAgent.indexOf('Windows CE') === -1) {
    return true;
  }
  
  return false;
}

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
 * Detects if the current browser is Microsoft Edge on Windows
 * @returns {boolean} True if the browser is Edge and OS is Windows
 */
export function isWindowsEdge() {
  return isMicrosoftEdge() && isWindows();
}

/**
 * Gets the detected browser name
 * @returns {string} Browser name
 */
export function getBrowserName() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check Edge first (before Chrome) since Edge user agent also contains "Chrome"
  // Distinguish between Windows Edge and Edge on other platforms
  if (userAgent.indexOf('Edg/') > -1 || userAgent.indexOf('EdgA/') > -1 || userAgent.indexOf('EdgiOS/') > -1) {
    // Check if running on Windows
    if (isWindows()) {
      return 'Windows Edge';
    }
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
