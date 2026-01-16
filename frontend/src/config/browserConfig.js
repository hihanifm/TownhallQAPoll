/**
 * Browser Restriction Configuration
 * 
 * Note: Restrictions only apply in production mode when VITE_ENABLE_BROWSER_RESTRICTION=true
 * In development mode, all browsers are allowed regardless of this configuration.
 * 
 * Available browser names:
 * - 'Windows Edge' (Edge on Windows - required in production when restrictions enabled)
 * - 'Microsoft Edge' (Edge on non-Windows platforms)
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
  // When restrictions are enabled in production, only Windows Edge is allowed
  allowedBrowsers: ['Windows Edge'],
  
  // Custom message to show when browser is not allowed
  // Leave empty to use default message
  customMessage: '',
  
  // Show download link for Microsoft Edge
  showDownloadLink: true,
  
  // Allow users to override the browser restriction
  // Set to false - users cannot bypass restriction when enabled
  allowOverride: false,
};
