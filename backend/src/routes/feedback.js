const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery, formatDatetime } = require('../db/database');

// Hardcoded PIN for feedback management
const FEEDBACK_PIN = 'townhall12#';

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
    
    if (pin !== FEEDBACK_PIN) {
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
    const { user_id, fingerprint_hash } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    if (!fingerprint_hash) {
      return res.status(400).json({ error: 'fingerprint_hash is required' });
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
    
    // Check if this fingerprint has already voted (primary check - prevents incognito abuse)
    const existingVoteByFingerprint = await getQuery(
      'SELECT * FROM feedback_votes WHERE feedback_id = ? AND fingerprint_hash = ?',
      [id, fingerprint_hash]
    );
    
    // Also check by user_id for backwards compatibility and toggle behavior
    const existingVoteByUserId = await getQuery(
      'SELECT * FROM feedback_votes WHERE feedback_id = ? AND user_id = ?',
      [id, user_id]
    );
    
    let hasVoted = false;
    
    // If vote exists by fingerprint OR user_id, remove it (toggle off)
    if (existingVoteByFingerprint || existingVoteByUserId) {
      // Remove vote (toggle off) - delete by fingerprint_hash to prevent incognito abuse
      console.log('Removing vote for feedback:', id, 'fingerprint:', fingerprint_hash.substring(0, 8) + '...');
      const deleteResult = await runQuery(
        'DELETE FROM feedback_votes WHERE feedback_id = ? AND fingerprint_hash = ?',
        [id, fingerprint_hash]
      );
      console.log('Delete result:', deleteResult);
      hasVoted = false;
    } else {
      // Create vote (toggle on)
      console.log('Adding vote for feedback:', id, 'fingerprint:', fingerprint_hash.substring(0, 8) + '...');
      try {
        const insertResult = await runQuery(
          'INSERT INTO feedback_votes (feedback_id, user_id, fingerprint_hash) VALUES (?, ?, ?)',
          [id, user_id, fingerprint_hash]
        );
        console.log('Insert result:', insertResult);
        hasVoted = true;
      } catch (insertError) {
        // If it's a constraint error (duplicate), the vote already exists
        if (insertError.code === 'SQLITE_CONSTRAINT') {
          console.log('Constraint error - vote already exists (fingerprint or user_id), setting hasVoted to true');
          hasVoted = true;
        } else {
          console.error('Error inserting vote:', insertError);
          throw insertError;
        }
      }
    }
    
    // Get updated vote count
    const voteCount = await getQuery(
      'SELECT COUNT(*) as count FROM feedback_votes WHERE feedback_id = ?',
      [id]
    );
    
    // Double-check the vote status after the operation (check by fingerprint)
    const finalVoteCheck = await getQuery(
      'SELECT * FROM feedback_votes WHERE feedback_id = ? AND fingerprint_hash = ?',
      [id, fingerprint_hash]
    );
    
    console.log('Final vote check:', { hasVoted, finalVoteCheck: !!finalVoteCheck, voteCount: voteCount.count });
    
    res.json({ 
      success: true, 
      vote_count: voteCount.count,
      hasVoted: !!finalVoteCheck
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
    const { user_id, fingerprint_hash } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // Check by fingerprint_hash first (prevents incognito abuse), fallback to user_id
    let vote = null;
    if (fingerprint_hash) {
      vote = await getQuery(
        'SELECT * FROM feedback_votes WHERE feedback_id = ? AND fingerprint_hash = ?',
        [id, fingerprint_hash]
      );
    }
    
    // If not found by fingerprint, check by user_id for backwards compatibility
    if (!vote) {
      vote = await getQuery(
        'SELECT * FROM feedback_votes WHERE feedback_id = ? AND user_id = ?',
        [id, user_id]
      );
    }
    
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
    
    if (feedback_pin !== FEEDBACK_PIN) {
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
