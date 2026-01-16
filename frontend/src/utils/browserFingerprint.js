/**
 * Browser Fingerprinting Utility
 * 
 * Generates an anonymous fingerprint hash from browser characteristics
 * to prevent duplicate voting via incognito mode while maintaining anonymity.
 * 
 * The fingerprint is based on:
 * - Screen resolution and color depth
 * - Timezone
 * - Language settings
 * - Canvas fingerprint
 * - WebGL fingerprint
 * - Installed fonts (limited)
 * - Platform information
 * 
 * This does NOT collect personal information and cannot identify individual users.
 */

/**
 * Generates a hash from a string
 * @param {string} str - String to hash
 * @returns {string} Hash value
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generates a canvas fingerprint
 * @returns {string} Canvas fingerprint hash
 */
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Browser fingerprint canvas test 🔒', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Browser fingerprint canvas test 🔒', 4, 17);
    
    return canvas.toDataURL();
  } catch (e) {
    return 'canvas-unsupported';
  }
}

/**
 * Generates a WebGL fingerprint
 * @returns {string} WebGL fingerprint
 */
function getWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return 'webgl-unsupported';
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return [
        gl.getParameter(gl.VENDOR),
        gl.getParameter(gl.RENDERER),
        gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      ].join('|');
    }
    
    return [
      gl.getParameter(gl.VENDOR),
      gl.getParameter(gl.RENDERER)
    ].join('|');
  } catch (e) {
    return 'webgl-error';
  }
}

/**
 * Detects installed fonts (limited detection for performance)
 * @returns {Promise<string>} Font detection string
 */
async function detectFonts() {
  const baseFonts = [
    'monospace', 'sans-serif', 'serif',
    'Arial', 'Courier New', 'Georgia', 'Times New Roman',
    'Helvetica', 'Verdana', 'Trebuchet MS'
  ];
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '72px monospace';
  const baselineText = ctx.measureText('mmmmmmmmmmlli');
  const baselineWidth = baselineText.width;
  
  const detectedFonts = [];
  
  for (const font of baseFonts) {
    ctx.font = `72px "${font}", monospace`;
    const width = ctx.measureText('mmmmmmmmmmlli').width;
    if (width !== baselineWidth) {
      detectedFonts.push(font);
    }
  }
  
  return detectedFonts.join(',');
}

/**
 * Generates browser fingerprint components
 * @returns {Promise<Object>} Fingerprint components
 */
async function getFingerprintComponents() {
  const components = {
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || navigator.userLanguage,
    platform: navigator.platform || '',
    userAgent: navigator.userAgent || '',
    canvas: getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: navigator.deviceMemory || 0,
    fonts: await detectFonts()
  };
  
  return components;
}

/**
 * Generates a stable browser fingerprint hash
 * This fingerprint remains consistent for the same browser/device
 * even across incognito sessions, helping prevent duplicate voting
 * 
 * @returns {Promise<string>} Browser fingerprint hash
 */
export async function generateFingerprint() {
  try {
    const components = await getFingerprintComponents();
    
    // Create a combined string from all components
    const fingerprintString = [
      components.screen,
      components.timezone,
      components.language,
      components.platform,
      components.canvas,
      components.webgl,
      components.hardwareConcurrency.toString(),
      components.deviceMemory.toString(),
      components.fonts
    ].join('|');
    
    // Generate hash
    const fingerprintHash = hashString(fingerprintString);
    
    // Add some entropy from user agent (but don't use it as primary identifier)
    const userAgentHash = hashString(components.userAgent);
    
    // Combine to create final fingerprint
    return `${fingerprintHash}-${userAgentHash.substring(0, 8)}`;
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    // Fallback: use a simple hash from available info
    const fallback = [
      screen.width,
      screen.height,
      navigator.language,
      navigator.platform
    ].join('|');
    return hashString(fallback);
  }
}

/**
 * Gets or generates and caches the browser fingerprint
 * Caches in sessionStorage to avoid regenerating on every call
 * but regenerates in incognito (which clears sessionStorage)
 * 
 * @returns {Promise<string>} Cached or newly generated fingerprint
 */
export async function getFingerprint() {
  const FINGERPRINT_KEY = 'browser_fingerprint';
  
  // Try to get from sessionStorage first
  try {
    const cached = sessionStorage.getItem(FINGERPRINT_KEY);
    if (cached) {
      return cached;
    }
  } catch (e) {
    // sessionStorage might not be available in some contexts
  }
  
  // Generate new fingerprint
  const fingerprint = await generateFingerprint();
  
  // Cache it for this session
  try {
    sessionStorage.setItem(FINGERPRINT_KEY, fingerprint);
  } catch (e) {
    // sessionStorage might not be available
  }
  
  return fingerprint;
}
