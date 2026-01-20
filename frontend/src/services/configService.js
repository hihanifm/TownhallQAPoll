/**
 * Application Configuration Service
 * 
 * Loads runtime configuration from appConfig.json.
 * Provides default values if config fails to load.
 */

// Default configuration values (fallback)
const defaultConfig = {
  title: 'Townhall Q&A Poll',
  subtitle: 'Ask. Vote. Be heard.',
  welcome: 'Welcome to Townhall Q&A Poll\n\nAsk questions, vote on what matters most, and have your voice heard. Questions with the most votes get priority attention.'
};

// Cache for loaded config
let cachedConfig = null;
let configLoadPromise = null;

/**
 * Load configuration from appConfig.json
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfig() {
  // Return cached config if already loaded
  if (cachedConfig) {
    return cachedConfig;
  }

  // Return existing promise if load is in progress
  if (configLoadPromise) {
    return configLoadPromise;
  }

  // Start loading config
  configLoadPromise = fetch('/appConfig.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
      }
      return response.json();
    })
    .then(config => {
      // Merge with defaults to ensure all required fields exist
      const mergedConfig = {
        title: config.title || defaultConfig.title,
        subtitle: config.subtitle || defaultConfig.subtitle,
        welcome: config.welcome || defaultConfig.welcome
      };
      
      cachedConfig = mergedConfig;
      return mergedConfig;
    })
    .catch(error => {
      console.warn('Failed to load appConfig.json, using defaults:', error);
      cachedConfig = defaultConfig;
      return defaultConfig;
    });

  return configLoadPromise;
}

/**
 * Get configuration (loads if not already cached)
 * @returns {Promise<Object>} Configuration object
 */
export async function getConfig() {
  return loadConfig();
}

/**
 * Get cached configuration synchronously (may be null if not loaded yet)
 * @returns {Object|null} Configuration object or null
 */
export function getCachedConfig() {
  return cachedConfig;
}

/**
 * Reset cached configuration (useful for testing or reloading)
 */
export function resetConfig() {
  cachedConfig = null;
  configLoadPromise = null;
}
