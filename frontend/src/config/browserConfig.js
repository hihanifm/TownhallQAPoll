/**
 * Browser Restriction Configuration
 * 
 * Set `enabled: false` to disable browser restrictions and allow all browsers
 * Set `allowedBrowsers` to specify which browsers are allowed (case-insensitive)
 * 
 * Available browser names:
 * - 'Microsoft Edge' (Chromium-based Edge)
 * - 'Microsoft Edge (Legacy)' (EdgeHTML-based Edge)
 * - 'Google Chrome'
 * - 'Mozilla Firefox'
 * - 'Safari'
 * - 'Opera'
 * - 'Unknown Browser'
 */

export const browserConfig = {
  // Enable or disable browser restrictions
  enabled: true,
  
  // List of allowed browsers (case-insensitive)
  // If empty array and enabled is true, only Microsoft Edge will be allowed
  allowedBrowsers: ['Microsoft Edge', 'Microsoft Edge (Legacy)'],
  
  // Custom message to show when browser is not allowed
  // Leave empty to use default message
  customMessage: '',
  
  // Show download link for Microsoft Edge
  showDownloadLink: true,
  
  // Allow users to override the browser restriction
  // If true, users will see a button to proceed anyway
  allowOverride: true,
};
