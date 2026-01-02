const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const validateOrigin = require('./middleware/validateOrigin');
const campaignsRouter = require('./routes/campaigns');
const questionsRouter = require('./routes/questions');
const votesRouter = require('./routes/votes');
const sseRouter = require('./routes/sse');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure allowed origins for CORS
const getAllowedOrigins = () => {
  const origins = [];
  
  // Development origins
  origins.push('http://localhost:3000');
  origins.push('http://127.0.0.1:3000');
  
  // Production frontend URL from environment
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // Multiple frontend URLs (comma-separated)
  if (process.env.FRONTEND_URLS) {
    process.env.FRONTEND_URLS.split(',').forEach(url => {
      const trimmed = url.trim();
      if (trimmed) {
        origins.push(trimmed);
      }
    });
  }
  
  return origins;
};

// Helper to check if origin is on frontend port (for dynamic IP address support)
const isFrontendPort = (origin) => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    // Only allow explicit port 3000
    return port === '3000';
  } catch (e) {
    return false;
  }
};

const allowedOrigins = getAllowedOrigins();

// CORS configuration - only allow requests from frontend
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: function (origin, callback) {
    // In development mode, be more liberal
    if (isDevelopment) {
      // Allow requests with no origin in dev (for curl, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // In dev, allow any localhost or private IP origin
      try {
        const originUrl = new URL(origin);
        const isLocalhost = originUrl.hostname === 'localhost' || 
                           originUrl.hostname === '127.0.0.1' ||
                           originUrl.hostname.startsWith('192.168.') ||
                           originUrl.hostname.startsWith('10.') ||
                           originUrl.hostname.startsWith('172.');
        
        if (isLocalhost) {
          return callback(null, true);
        }
      } catch (e) {
        // Invalid origin URL
      }
    }
    
    // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
    // But we'll validate these in the validateOrigin middleware
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in explicitly allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } 
    // If ALLOW_ANY_FRONTEND_PORT is not disabled, allow any origin on port 3000
    // This enables IP addresses to work automatically (e.g., http://192.168.1.100:3000)
    else if (process.env.ALLOW_ANY_FRONTEND_PORT !== 'false' && isFrontendPort(origin)) {
      callback(null, true);
    } 
    else {
      // For development, log the blocked origin
      if (isDevelopment) {
        console.warn(`CORS: Blocked origin: ${origin}`);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight requests for 24 hours (in seconds)
}));

// Trust proxy to get real client IP (important for accurate origin validation)
app.set('trust proxy', true);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate origin middleware - blocks direct API access
app.use(validateOrigin);

// Routes
app.use('/api/campaigns', campaignsRouter);
app.use('/api', questionsRouter); // Handles /api/campaigns/:id/questions and /api/questions/:id/votes
app.use('/api', votesRouter);
app.use('/api/sse', sseRouter); // SSE endpoint for real-time updates

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

// Start server
// By default, bind to localhost only for security (only accessible from same machine)
// Set HOST=0.0.0.0 in environment to allow remote access
const HOST = process.env.HOST || '127.0.0.1'; // Default to localhost only for security
const BIND_ALL = process.env.HOST === '0.0.0.0' || process.env.ALLOW_REMOTE === 'true';

if (BIND_ALL) {
  console.log('⚠️  WARNING: Backend is bound to 0.0.0.0 - accessible from network');
  console.log('   Make sure origin validation is properly configured!');
} else {
  console.log('✓ Backend bound to localhost only - not accessible from network');
  console.log('   Set HOST=0.0.0.0 to allow remote access (less secure)');
}

if (isDevelopment) {
  console.log('🔓 Development mode: Origin validation is more permissive');
  console.log('   - Allows localhost requests without origin (curl, Postman, etc.)');
  console.log('   - Allows any localhost/private IP origins');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || '(not set - defaulting to dev mode)'}`);
} else {
  console.log('🔒 Production mode: Strict origin validation enabled');
  console.log('   - Blocks all direct API calls (curl, Postman, etc.)');
  console.log('   - Only allows requests with valid origin/referer from frontend');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
}

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  if (BIND_ALL) {
    console.log(`Network access: http://<your-ip>:${PORT} (restricted by origin validation)`);
  }
  console.log(`Allowed frontend origins: ${allowedOrigins.join(', ') || 'none configured'}`);
});

