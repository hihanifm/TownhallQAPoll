const express = require('express');
const router = express.Router();
const { getQuery, runQuery } = require('../db/database');
const sseService = require('../services/sseService');

// POST /api/questions/:id/upvote - Toggle upvote on a question
router.post('/questions/:id/upvote', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, fingerprint_hash } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // Check if question exists
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if this user has already voted (userId is the sole identity)
    const existingVote = await getQuery(
      'SELECT * FROM votes WHERE question_id = ? AND user_id = ?',
      [id, user_id]
    );

    let hasVoted = false;

    if (existingVote) {
      // Toggle off — remove this user's vote
      await runQuery(
        'DELETE FROM votes WHERE question_id = ? AND user_id = ?',
        [id, user_id]
      );
      hasVoted = false;
    } else {
      // Toggle on — add vote (store fingerprint as metadata only)
      await runQuery(
        'INSERT INTO votes (question_id, user_id, fingerprint_hash) VALUES (?, ?, ?)',
        [id, user_id, fingerprint_hash || null]
      );
      hasVoted = true;
    }

    // Get updated vote count
    const voteCount = await getQuery(
      'SELECT COUNT(*) as count FROM votes WHERE question_id = ?',
      [id]
    );

    // Broadcast update to all clients watching this campaign
    sseService.broadcast(question.campaign_id.toString(), {
      type: 'vote_updated',
      question_id: parseInt(id),
      vote_count: voteCount.count
    });

    res.json({
      success: true,
      vote_count: voteCount.count,
      hasVoted
    });
  } catch (error) {
    console.error('Error in upvote endpoint:', error);
    next(error);
  }
});

module.exports = router;

