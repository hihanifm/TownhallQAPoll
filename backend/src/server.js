const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const campaignsRouter = require('./routes/campaigns');
const questionsRouter = require('./routes/questions');
const votesRouter = require('./routes/votes');

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

