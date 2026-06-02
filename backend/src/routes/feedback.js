const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery, formatDatetime } = require('../db/database');

// Feedback moderation PIN loaded from environment
const FEEDBACK_MASTER_PIN = process.env.FEEDBACK_MASTER_PIN;

function isFeedbackMasterPinConfigured() {
  return !!(FEEDBACK_MASTER_PIN && FEEDBACK_MASTER_PIN.trim());
}

// GET /api/feedback - Get top 50 feedback sorted by status (open first), then by sort parameter (votes or time)
// Query params: sort='votes' (default) or sort='time'
router.get('/feedback', async (req, res, next) => {
  try {
    const sortBy = req.query.sort || 'votes'; // Default to 'votes'
    
    // Build ORDER BY clause based on sort parameter
    let orderByClause;
    if (sortBy === 'time') {
      // Sort by time: newest first (DESC)
      orderByClause = `CASE WHEN f.status = 'open' THEN 0 ELSE 1 END,
                       f.created_at DESC`;
    } else {
      // Sort by votes: highest votes first (DESC), then oldest first (ASC) for tie-breaking
      orderByClause = `CASE WHEN f.status = 'open' THEN 0 ELSE 1 END,
                       vote_count DESC,
                       f.created_at ASC`;
    }
    
    const feedback = await allQuery(
      `SELECT f.*, 
       COUNT(fv.id) as vote_count,
       GROUP_CONCAT(fv.user_id) as voters
       FROM feedback f
       LEFT JOIN feedback_votes fv ON f.id = fv.feedback_id
       GROUP BY f.id
       ORDER BY ${orderByClause}
       LIMIT 50`
    );
    
    // Parse voters string to array for easier checking and format timestamps
    const feedbackWithVotes = feedback.map(f => ({
      ...f,
      created_at: formatDatetime(f.created_at),
      voters: f.voters ? f.voters.split(',') : [],
      vote_count: f.vote_count || 0,
      status: f.status || 'open' // Default to 'open' for backward compatibility
    }));
    
    res.json(feedbackWithVotes);
  } catch (error) {
    next(error);
  }
});

// POST /api/feedback - Create new feedback item
router.post('/feedback', async (req, res, next) => {
  try {
    const { feedback_text, creator_id } = req.body;
    
    if (!feedback_text || feedback_text.trim() === '') {
      return res.status(400).json({ error: 'Feedback text is required' });
    }
    
    if (!creator_id) {
      return res.status(400).json({ error: 'creator_id is required' });
    }
    
    const result = await runQuery(
      'INSERT INTO feedback (feedback_text, creator_id, status) VALUES (?, ?, ?)',
      [feedback_text.trim(), creator_id, 'open']
    );
    
    const feedback = await getQuery(
      `SELECT f.*, 
       COUNT(fv.id) as vote_count
       FROM feedback f
       LEFT JOIN feedback_votes fv ON f.id = fv.feedback_id
       WHERE f.id = ?
       GROUP BY f.id`,
      [result.lastID]
    );
    
    const newFeedback = {
      ...feedback,
      created_at: formatDatetime(feedback.created_at),
      vote_count: feedback.vote_count || 0,
      voters: []
    };
    
    res.status(201).json(newFeedback);
  } catch (error) {
    next(error);
  }
});

// POST /api/feedback/verify-pin - Verify PIN for feedback management
// IMPORTANT: This route must come before /feedback/:id routes to avoid route conflicts
router.post('/feedback/verify-pin', async (req, res, next) => {
  try {
    const { pin } = req.body;
    
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    if (!isFeedbackMasterPinConfigured()) {
      return res.status(503).json({ error: 'Feedback master PIN is not configured on server' });
    }
    
    if (pin !== FEEDBACK_MASTER_PIN) {
      return res.status(403).json({ error: 'Invalid PIN' });
    }
    
    res.json({ 
      success: true, 
      message: 'PIN verified successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/feedback/:id/upvote - Toggle upvote on feedback
router.post('/feedback/:id/upvote', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Check if feedback exists
    const feedback = await getQuery(
      'SELECT * FROM feedback WHERE id = ?',
      [id]
    );
    
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    // Check if feedback is closed - prevent voting on closed feedback
    if (feedback.status === 'closed') {
      return res.status(403).json({ error: 'Cannot vote on closed feedback' });
    }
    
    // Check if this user has already voted (userId is the sole identity)
    const existingVote = await getQuery(
      'SELECT * FROM feedback_votes WHERE feedback_id = ? AND user_id = ?',
      [id, user_id]
    );

    let hasVoted = false;

    if (existingVote) {
      // Toggle off — remove this user's vote
      await runQuery(
        'DELETE FROM feedback_votes WHERE feedback_id = ? AND user_id = ?',
        [id, user_id]
      );
      hasVoted = false;
    } else {
      // Toggle on — add vote (user_id is the sole identity)
      await runQuery(
        'INSERT INTO feedback_votes (feedback_id, user_id) VALUES (?, ?)',
        [id, user_id]
      );
      hasVoted = true;
    }

    // Get updated vote count
    const voteCount = await getQuery(
      'SELECT COUNT(*) as count FROM feedback_votes WHERE feedback_id = ?',
      [id]
    );

    res.json({
      success: true,
      vote_count: voteCount.count,
      hasVoted
    });
  } catch (error) {
    console.error('Error in feedback upvote endpoint:', error);
    next(error);
  }
});

// GET /api/feedback/:id/votes - Check if user has voted on feedback
router.get('/feedback/:id/votes', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const vote = await getQuery(
      'SELECT * FROM feedback_votes WHERE feedback_id = ? AND user_id = ?',
      [id, user_id]
    );

    res.json({ hasVoted: !!vote });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/feedback/:id - Update a feedback item (only by creator)
router.patch('/feedback/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback_text, creator_id } = req.body;
    
    if (!feedback_text || feedback_text.trim() === '') {
      return res.status(400).json({ error: 'Feedback text is required' });
    }
    
    if (!creator_id) {
      return res.status(400).json({ error: 'creator_id is required' });
    }
    
    // Get the feedback
    const feedback = await getQuery(
      'SELECT * FROM feedback WHERE id = ?',
      [id]
    );
    
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    // Check authorization: user must be the feedback creator
    if (feedback.creator_id !== creator_id) {
      return res.status(403).json({ error: 'Only the feedback creator can edit feedback' });
    }
    
    // Update the feedback
    await runQuery(
      'UPDATE feedback SET feedback_text = ? WHERE id = ?',
      [feedback_text.trim(), id]
    );
    
    // Get updated feedback with vote count
    const updatedFeedback = await getQuery(
      `SELECT f.*, 
       COUNT(fv.id) as vote_count,
       GROUP_CONCAT(fv.user_id) as voters
       FROM feedback f
       LEFT JOIN feedback_votes fv ON f.id = fv.feedback_id
       WHERE f.id = ?
       GROUP BY f.id`,
      [id]
    );
    
    const feedbackWithVotes = {
      ...updatedFeedback,
      created_at: formatDatetime(updatedFeedback.created_at),
      vote_count: updatedFeedback.vote_count || 0,
      voters: updatedFeedback.voters ? updatedFeedback.voters.split(',') : [],
      status: updatedFeedback.status || 'open'
    };
    
    res.json(feedbackWithVotes);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/feedback/:id/close - Close a feedback item
router.patch('/feedback/:id/close', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback_pin } = req.body;
    
    if (!feedback_pin) {
      return res.status(400).json({ error: 'feedback_pin is required' });
    }

    if (!isFeedbackMasterPinConfigured()) {
      return res.status(503).json({ error: 'Feedback master PIN is not configured on server' });
    }
    
    if (feedback_pin !== FEEDBACK_MASTER_PIN) {
      return res.status(403).json({ error: 'Invalid PIN' });
    }
    
    // Check if feedback exists
    const feedback = await getQuery(
      'SELECT * FROM feedback WHERE id = ?',
      [id]
    );
    
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    // Update feedback status to closed
    await runQuery(
      'UPDATE feedback SET status = ? WHERE id = ?',
      ['closed', id]
    );
    
    // Get updated feedback with vote count
    const updatedFeedback = await getQuery(
      `SELECT f.*, 
       COUNT(fv.id) as vote_count
       FROM feedback f
       LEFT JOIN feedback_votes fv ON f.id = fv.feedback_id
       WHERE f.id = ?
       GROUP BY f.id`,
      [id]
    );
    
    const feedbackWithVotes = {
      ...updatedFeedback,
      created_at: formatDatetime(updatedFeedback.created_at),
      vote_count: updatedFeedback.vote_count || 0,
      voters: [],
      status: updatedFeedback.status || 'closed'
    };
    
    res.json(feedbackWithVotes);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
