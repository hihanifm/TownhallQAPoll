/**
 * Middleware to validate that requests come from the frontend application
 * This prevents direct access to the backend API
 */

// Allowed origins - requests must come from these origins
const getAllowedOrigins = () => {
  const allowedOrigins = [];
  
  // Add localhost origins (development)
  allowedOrigins.push('http://localhost:3000');
  allowedOrigins.push('http://127.0.0.1:3000');
  
  // Add environment variable for custom frontend URL (production)
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
    // Also add without trailing slash
    if (process.env.FRONTEND_URL.endsWith('/')) {
      allowedOrigins.push(process.env.FRONTEND_URL.slice(0, -1));
    } else {
      allowedOrigins.push(process.env.FRONTEND_URL + '/');
    }
  }
  
  // Allow multiple frontend URLs (comma-separated)
  if (process.env.FRONTEND_URLS) {
    process.env.FRONTEND_URLS.split(',').forEach(url => {
      const trimmed = url.trim();
      if (trimmed) {
        allowedOrigins.push(trimmed);
      }
    });
  }
  
  return allowedOrigins;
};

const allowedOrigins = getAllowedOrigins();

/**
 * Check if an origin is on the frontend port (3000)
 * This allows IP addresses to work without explicit configuration
 */
const isFrontendPort = (urlString) => {
  try {
    const url = new URL(urlString);
    // If no port is specified and it's HTTP, default port is 80, but we check explicitly
    // If port is specified, check if it's 3000
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    // Allow if port is 3000, or if no port specified and it's HTTP (could be port 3000)
    // But to be safe, we'll only allow explicit port 3000
    return port === '3000';
  } catch (e) {
    return false;
  }
};

/**
 * Check if the request origin/referer is allowed
 */
const isOriginAllowed = (req) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Check origin header
  if (origin) {
    // Remove trailing slash for comparison
    const originNormalized = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    
    // First, check against explicitly allowed origins
    if (allowedOrigins.some(allowed => {
      const allowedNormalized = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
      return originNormalized === allowedNormalized;
    })) {
      return true;
    }
    
    // If ALLOW_ANY_FRONTEND_PORT is set (default: true), allow any origin on port 3000
    // This makes IP addresses work automatically without configuration
    if (process.env.ALLOW_ANY_FRONTEND_PORT !== 'false' && isFrontendPort(origin)) {
      return true;
    }
  }
  
  // Check referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      const refererOriginNormalized = refererOrigin.endsWith('/') ? refererOrigin.slice(0, -1) : refererOrigin;
      
      // Check against explicitly allowed origins
      if (allowedOrigins.some(allowed => {
        const allowedNormalized = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
        return refererOriginNormalized === allowedNormalized;
      })) {
        return true;
      }
      
      // If ALLOW_ANY_FRONTEND_PORT is set (default: true), allow any referer on port 3000
      if (process.env.ALLOW_ANY_FRONTEND_PORT !== 'false' && isFrontendPort(refererOrigin)) {
        return true;
      }
    } catch (e) {
      // Invalid referer URL
    }
  }
  
  // If no origin and no referer, this is likely a direct API call (curl, Postman, etc.)
  if (!origin && !referer) {
    // Explicitly check for production mode - be very strict
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In production, ALWAYS block requests without origin/referer
    if (isProduction) {
      console.warn('🔒 Production: Blocking request without origin/referer (direct API call)');
      return false;
    }
    
    // In development mode, be more liberal - allow direct API calls for testing
    // Only allow if explicitly enabled OR if it's from localhost
    if (process.env.ALLOW_NO_ORIGIN === 'true') {
      console.warn('⚠️  ALLOW_NO_ORIGIN is enabled - this is less secure!');
      return true;
    }
    
    // In dev mode, allow requests from localhost without origin (for testing with curl, etc.)
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp?.startsWith('127.0.0.1')) {
      console.log('🔓 Dev mode: Allowing localhost request without origin/referer');
      return true;
    }
    
    // Block all other requests without origin/referer
    return false;
  }
  
  // If we got here, we had origin or referer but neither matched allowed origins
  // In production, be strict - block everything that doesn't match
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, only allow explicitly configured origins
    return false;
  }
  
  // In development, be more lenient - allow if it's from localhost
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const isLocalhost = originUrl.hostname === 'localhost' || 
                         originUrl.hostname === '127.0.0.1' ||
                         originUrl.hostname.startsWith('192.168.') ||
                         originUrl.hostname.startsWith('10.') ||
                         originUrl.hostname.startsWith('172.');
      
      if (isLocalhost) {
        console.log(`🔓 Dev mode: Allowing localhost origin: ${origin}`);
        return true;
      }
    } catch (e) {
      // Invalid origin URL
    }
  }
  
  return false;
};

/**
 * Middleware to validate request origin
 * Rejects requests that don't come from the allowed frontend origins
 */
const validateOrigin = (req, res, next) => {
  // Allow health check endpoint without validation
  if (req.path === '/api/health') {
    return next();
  }
  
  // Allow OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Check if origin is allowed
  if (!isOriginAllowed(req)) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      console.warn(`🔒 Production: Blocked request from unauthorized origin:`, {
        origin: req.headers.origin || '(none)',
        referer: req.headers.referer || '(none)',
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        nodeEnv: process.env.NODE_ENV || '(not set)'
      });
    } else {
      console.warn(`⚠️  Dev mode: Blocked request from unauthorized origin:`, {
        origin: req.headers.origin || '(none)',
        referer: req.headers.referer || '(none)',
        path: req.path,
        ip: req.ip || req.connection.remoteAddress
      });
    }
    
    return res.status(403).json({
      error: 'Forbidden: Direct API access is not allowed. Please use the frontend application.',
      message: 'This API can only be accessed through the authorized frontend application.'
    });
  }
  
  next();
};

module.exports = validateOrigin;
