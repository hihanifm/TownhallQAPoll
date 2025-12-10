const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const campaignsRouter = require('./routes/campaigns');
const questionsRouter = require('./routes/questions');
const votesRouter = require('./routes/votes');
const sseRouter = require('./routes/sse');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for remote access
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
});

